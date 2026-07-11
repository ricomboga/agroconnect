import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useLocation } from '../../hooks/useLocation';
import { financeApi } from '../../api/finance';
import type { LoanDocumentType, LoanProduct } from '../../api/finance';
import { uploadMedia } from '../../api/media';
import { farmApi } from '../../api/farm';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'LoanApplication'>;

const REPAYMENT_OPTIONS = [6, 12, 18, 24];

const DOCUMENT_TYPES: Array<{ key: LoanDocumentType; icon: string; i18nKey: string }> = [
  { key: 'national_id',    icon: '🪪', i18nKey: 'finance.loan.application.documents.national_id' },
  { key: 'land_title',     icon: '📜', i18nKey: 'finance.loan.application.documents.land_title' },
  { key: 'bank_statement', icon: '🏦', i18nKey: 'finance.loan.application.documents.bank_statement' },
  { key: 'farm_photo',     icon: '🌾', i18nKey: 'finance.loan.application.documents.farm_photo' },
];

interface PickedDocument {
  documentType: LoanDocumentType;
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export function LoanApplicationScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const { coords, loading: gpsLoading, permissionDenied, requestLocation } = useLocation();

  const [purpose, setPurpose] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(0);
  const [documents, setDocuments] = useState<PickedDocument[]>([]);
  const [uploadError, setUploadError] = useState('');

  const productsQuery = useQuery({
    queryKey: ['loanProducts'],
    queryFn: () => financeApi.products.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const farmsQuery = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmApi.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await financeApi.loans.create({
        productId,
        amountRequestedKes: amount,
        purpose,
        repaymentMonths: selectedMonths,
        ...(coords ? { farmGpsLat: coords.latitude, farmGpsLng: coords.longitude } : {}),
      });

      for (const doc of documents) {
        const uploaded = await uploadMedia(
          { uri: doc.uri, name: doc.name, mimeType: doc.mimeType },
          'govt-documents',
          res.data.id,
        );
        await financeApi.loans.addDocument(res.data.id, {
          name: doc.name,
          documentType: doc.documentType,
          storageKey: uploaded.key,
          mimeType: uploaded.mime_type,
          sizeBytes: uploaded.size_bytes,
        });
      }

      return res;
    },
    onSuccess: (res) => {
      navigation.replace('LoanStatus', { loanId: res.data.id });
    },
  });

  const isLoading = productsQuery.isLoading;
  const isError = productsQuery.isError;

  const product = productsQuery.data?.data.find((p: LoanProduct) => p.id === productId);
  const firstFarm = farmsQuery.data?.data?.[0];

  const amount = parseFloat(amountStr) || 0;
  const availableMonths = product
    ? REPAYMENT_OPTIONS.filter((m) => m <= product.repaymentMonths)
    : [];

  const monthlyEst = useMemo(() => {
    if (amount <= 0 || selectedMonths <= 0 || !product) return 0;
    const totalRepayable = amount * (1 + product.interestRate / 100);
    return Math.round(totalRepayable / selectedMonths);
  }, [amount, selectedMonths, product]);

  const canSubmit =
    amount > 0 &&
    purpose.trim().length > 0 &&
    selectedMonths > 0 &&
    !submitMutation.isPending;

  const pickDocument = async (documentType: LoanDocumentType) => {
    setUploadError('');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0]!;
    setDocuments((prev) => [
      ...prev.filter((d) => d.documentType !== documentType),
      {
        documentType,
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        sizeBytes: asset.size ?? 0,
      },
    ]);
  };

  const removeDocument = (documentType: LoanDocumentType) => {
    setDocuments((prev) => prev.filter((d) => d.documentType !== documentType));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable
            onPress={() => { void productsQuery.refetch(); }}
            style={s.retryBtn}
          >
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('finance.loan.application.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Product header */}
          <View style={s.productHeader}>
            <Text style={s.productName}>{product.name}</Text>
            <Text style={s.partnerName}>{product.partnerName}</Text>
          </View>

          {/* Read-only farm info */}
          <Text style={s.sectionLabel}>{t('finance.loan.application.farmSection')}</Text>
          <View style={s.readOnlyCard}>
            <View style={[s.readOnlyRow, s.noBorder]}>
              <Text style={s.readOnlyLabel}>{t('finance.loan.application.farmName')}</Text>
              <Text style={s.readOnlyValue}>{firstFarm?.name ?? '—'}</Text>
            </View>
          </View>

          {/* GPS capture */}
          <Text style={s.sectionLabel}>{t('finance.loan.application.gpsSection')}</Text>
          <View style={s.gpsCard}>
            {coords ? (
              <>
                <Text style={s.gpsCoords}>
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </Text>
                <Pressable onPress={() => void requestLocation()} accessibilityRole="button">
                  <Text style={s.gpsRetake}>{t('finance.loan.application.gpsRetake')}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={s.gpsBtn}
                onPress={() => void requestLocation()}
                disabled={gpsLoading}
                accessibilityRole="button"
              >
                {gpsLoading ? (
                  <ActivityIndicator size="small" color="#1A6B3C" />
                ) : (
                  <Text style={s.gpsBtnLabel}>📍 {t('finance.loan.application.gpsCapture')}</Text>
                )}
              </Pressable>
            )}
            {permissionDenied && (
              <Text style={s.gpsError}>{t('finance.loan.application.gpsDenied')}</Text>
            )}
          </View>

          {/* Document upload */}
          <Text style={s.sectionLabel}>{t('finance.loan.application.documentsSection')}</Text>
          <View style={s.docList}>
            {DOCUMENT_TYPES.map((docType) => {
              const picked = documents.find((d) => d.documentType === docType.key);
              return (
                <View key={docType.key} style={s.docRow}>
                  <Text style={s.docIcon}>{docType.icon}</Text>
                  <View style={s.docInfo}>
                    <Text style={s.docLabel}>{t(docType.i18nKey)}</Text>
                    {picked && (
                      <Text style={s.docFileName} numberOfLines={1}>{picked.name}</Text>
                    )}
                  </View>
                  {picked ? (
                    <Pressable onPress={() => removeDocument(docType.key)} accessibilityRole="button">
                      <Text style={s.docRemove}>{t('common.remove')}</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => void pickDocument(docType.key)} accessibilityRole="button">
                      <Text style={s.docUpload}>{t('finance.loan.application.upload')}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
          {uploadError.length > 0 && (
            <Text style={s.submitError}>{uploadError}</Text>
          )}

          {/* Editable loan details */}
          <Text style={s.sectionLabel}>{t('finance.loan.application.loanSection')}</Text>

          {/* Purpose */}
          <Text style={s.inputLabel}>{t('finance.loan.application.purpose')}</Text>
          <TextInput
            style={s.textInput}
            value={purpose}
            onChangeText={setPurpose}
            placeholder={t('finance.loan.application.purposePlaceholder')}
            placeholderTextColor="#BDBDBD"
            multiline
            numberOfLines={2}
          />

          {/* Amount */}
          <Text style={s.inputLabel}>{t('finance.loan.application.amount')}</Text>
          <TextInput
            style={s.textInput}
            value={amountStr}
            onChangeText={(v) => setAmountStr(v.replace(/[^0-9.]/g, ''))}
            placeholder="30000"
            placeholderTextColor="#BDBDBD"
            keyboardType="numeric"
          />
          <Text style={s.limitHint}>
            {t('finance.loan.application.amountRange', {
              min: product.minAmountKes.toLocaleString(),
              max: product.maxAmountKes.toLocaleString(),
            })}
          </Text>

          {/* Repayment period chips */}
          <Text style={s.inputLabel}>{t('finance.loan.application.repaymentMonths')}</Text>
          <View style={s.monthChips}>
            {availableMonths.map((m) => (
              <Pressable
                key={m}
                style={[s.monthChip, selectedMonths === m && s.monthChipActive]}
                onPress={() => setSelectedMonths(m)}
                accessibilityRole="button"
              >
                <Text style={[s.monthChipText, selectedMonths === m && s.monthChipTextActive]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Monthly estimate */}
          {monthlyEst > 0 && (
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>{t('finance.loan.application.monthlySummary')}</Text>
              <Text style={s.summaryValue}>
                {t('finance.loan.application.estimatedMonthly', { amount: monthlyEst.toLocaleString() })}
              </Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            style={[s.submitBtn, !canSubmit && s.submitDisabled]}
            onPress={() => submitMutation.mutate()}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {submitMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={s.submitLabel}>{t('finance.loan.application.submit')}</Text>
            )}
          </Pressable>

          {submitMutation.isError && (
            <Text style={s.submitError}>{t('common.error.loadFailed')}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#FAFAFA' },
  flex:               { flex: 1 },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:          { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:           { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#EAF4EE', borderRadius: 8 },
  retryLabel:         { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },

  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:            { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:          { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },
  topTitle:           { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:             { padding: 16, paddingBottom: 48 },

  productHeader:      { backgroundColor: '#EAF4EE', borderRadius: 12, padding: 14, marginBottom: 20 },
  productName:        { fontSize: 15, fontWeight: '700', color: '#1A6B3C', marginBottom: 2 },
  partnerName:        { fontSize: 13, color: '#555' },

  sectionLabel:       { fontSize: 14, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },

  readOnlyCard:       { backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 20 },
  readOnlyRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  noBorder:           { borderBottomWidth: 0 },
  readOnlyLabel:      { fontSize: 13, color: '#757575' },
  readOnlyValue:      { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  gpsCard:            { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginBottom: 20, gap: 6 },
  gpsBtn:             { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  gpsBtnLabel:        { fontSize: 14, fontWeight: '700', color: '#1A6B3C' },
  gpsCoords:          { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  gpsRetake:          { fontSize: 12, color: '#1A6B3C', fontWeight: '600', marginTop: 4 },
  gpsError:           { fontSize: 12, color: '#B71C1C', marginTop: 4 },

  docList:            { backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 20 },
  docRow:             { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  docIcon:            { fontSize: 18 },
  docInfo:            { flex: 1 },
  docLabel:           { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  docFileName:        { fontSize: 11, color: '#757575', marginTop: 2 },
  docUpload:          { fontSize: 12, color: '#1A6B3C', fontWeight: '700' },
  docRemove:          { fontSize: 12, color: '#B71C1C', fontWeight: '700' },

  inputLabel:         { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  textInput:          { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', minHeight: 48 },
  limitHint:          { fontSize: 12, color: '#757575', marginTop: 4 },

  monthChips:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  monthChip:          { minWidth: 56, minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  monthChipActive:    { backgroundColor: '#1A6B3C', borderColor: '#1A6B3C' },
  monthChipText:      { fontSize: 15, fontWeight: '600', color: '#555' },
  monthChipTextActive:{ color: '#FFF' },

  summaryCard:        { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:       { fontSize: 13, color: '#388E3C', fontWeight: '600' },
  summaryValue:       { fontSize: 18, fontWeight: '800', color: '#1B5E20' },

  submitBtn:          { minHeight: 52, backgroundColor: '#1A6B3C', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  submitDisabled:     { backgroundColor: '#A7D7B9' },
  submitLabel:        { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submitError:        { fontSize: 13, color: '#B71C1C', textAlign: 'center', marginTop: 8 },
});
