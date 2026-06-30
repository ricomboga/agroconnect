import React, { useState, useMemo } from 'react';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { financeApi } from '../../api/finance';
import type { LoanProduct } from '../../api/finance';
import { farmApi } from '../../api/farm';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'LoanApplication'>;

const REPAYMENT_OPTIONS = [6, 12, 18, 24];

export function LoanApplicationScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const [purpose, setPurpose] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(0);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const scoreQuery = useQuery({
    queryKey: ['creditScore'],
    queryFn: () => financeApi.creditScore.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

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
    mutationFn: () =>
      financeApi.loans.create({
        productId,
        amountRequestedKes: amount,
        purpose,
        repaymentMonths: selectedMonths,
      }),
    onSuccess: (res) => {
      setSubmitSuccess(true);
      navigation.replace('LoanStatus', { loanId: res.data.id });
    },
  });

  const isLoading = scoreQuery.isLoading || productsQuery.isLoading;
  const isError = scoreQuery.isError || productsQuery.isError;

  const product = productsQuery.data?.data.find((p: LoanProduct) => p.id === productId);
  const maxLoanKes = scoreQuery.data?.data.maxLoanKes ?? 0;
  const firstFarm = farmsQuery.data?.data?.[0];

  const amount = parseFloat(amountStr) || 0;
  const exceedsMax = amount > maxLoanKes;
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
    !exceedsMax &&
    purpose.trim().length > 0 &&
    selectedMonths > 0 &&
    !submitMutation.isPending;

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1565C0" /></View>
      </SafeAreaView>
    );
  }

  if (isError || !product) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable
            onPress={() => { void scoreQuery.refetch(); void productsQuery.refetch(); }}
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
            <View style={s.readOnlyRow}>
              <Text style={s.readOnlyLabel}>{t('finance.loan.application.farmName')}</Text>
              <Text style={s.readOnlyValue}>{firstFarm?.name ?? '—'}</Text>
            </View>
            <View style={[s.readOnlyRow, s.noBorder]}>
              <Text style={s.readOnlyLabel}>{t('finance.loan.application.lastHarvestKes')}</Text>
              <Text style={s.readOnlyValue}>—</Text>
            </View>
          </View>

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
            style={[s.textInput, exceedsMax && s.inputError]}
            value={amountStr}
            onChangeText={(v) => setAmountStr(v.replace(/[^0-9.]/g, ''))}
            placeholder="30000"
            placeholderTextColor="#BDBDBD"
            keyboardType="numeric"
          />
          <Text style={exceedsMax ? s.limitError : s.limitHint}>
            {exceedsMax
              ? t('finance.loan.application.amountExceedsLimit', { max: maxLoanKes.toLocaleString() })
              : t('finance.loan.application.amountMax', { max: maxLoanKes.toLocaleString() })}
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
              <Text style={s.submitLabel}>
                {t(submitSuccess
                  ? 'finance.loan.application.success'
                  : 'finance.loan.application.submit')}
              </Text>
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
  retryBtn:           { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#E3F2FD', borderRadius: 8 },
  retryLabel:         { fontSize: 15, color: '#1565C0', fontWeight: '600' },

  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:            { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:          { fontSize: 15, color: '#1565C0', fontWeight: '600' },
  topTitle:           { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:             { padding: 16, paddingBottom: 48 },

  productHeader:      { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 14, marginBottom: 20 },
  productName:        { fontSize: 15, fontWeight: '700', color: '#1565C0', marginBottom: 2 },
  partnerName:        { fontSize: 13, color: '#555' },

  sectionLabel:       { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 4 },

  readOnlyCard:       { backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 20 },
  readOnlyRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  noBorder:           { borderBottomWidth: 0 },
  readOnlyLabel:      { fontSize: 13, color: '#757575' },
  readOnlyValue:      { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  inputLabel:         { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  textInput:          { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', minHeight: 48 },
  inputError:         { borderColor: '#B71C1C' },
  limitHint:          { fontSize: 12, color: '#757575', marginTop: 4 },
  limitError:         { fontSize: 12, color: '#B71C1C', fontWeight: '600', marginTop: 4 },

  monthChips:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  monthChip:          { minWidth: 56, minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  monthChipActive:    { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  monthChipText:      { fontSize: 15, fontWeight: '600', color: '#555' },
  monthChipTextActive:{ color: '#FFF' },

  summaryCard:        { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:       { fontSize: 13, color: '#388E3C', fontWeight: '600' },
  summaryValue:       { fontSize: 18, fontWeight: '800', color: '#1B5E20' },

  submitBtn:          { minHeight: 52, backgroundColor: '#1565C0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  submitDisabled:     { backgroundColor: '#90CAF9' },
  submitLabel:        { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submitError:        { fontSize: 13, color: '#B71C1C', textAlign: 'center', marginTop: 8 },
});
