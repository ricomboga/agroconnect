import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { financeApi } from '../../api/finance';
import type { CreditBand, LoanProduct } from '../../api/finance';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'LoanProducts'>;

const BAND_RANK: Record<CreditBand, number> = { A: 4, B: 3, C: 2, D: 1 };
const BAND_COLOR: Record<CreditBand, string> = {
  A: '#1B5E20', B: '#1565C0', C: '#E65100', D: '#B71C1C',
};

export function LoanProductsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

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

  const isLoading = scoreQuery.isLoading || productsQuery.isLoading;
  const isError = scoreQuery.isError || productsQuery.isError;

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('finance.loan.products.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#1565C0" /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('finance.loan.products.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => { void productsQuery.refetch(); void scoreQuery.refetch(); }} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const farmerBand: CreditBand = scoreQuery.data?.data.band ?? 'D';
  const products = productsQuery.data?.data ?? [];

  const renderProduct = ({ item }: { item: LoanProduct }) => {
    const eligible = BAND_RANK[farmerBand] >= BAND_RANK[item.eligibilityBand];
    const eligColor = BAND_COLOR[item.eligibilityBand];
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.productName}>{item.name}</Text>
          <View style={[s.eligBadge, { backgroundColor: eligible ? '#E8F5E9' : '#FFEBEE' }]}>
            <Text style={[s.eligText, { color: eligible ? '#1B5E20' : '#B71C1C' }]}>
              {t('finance.loan.products.eligibility', { band: item.eligibilityBand })}
            </Text>
          </View>
        </View>

        <Text style={s.partnerName}>{item.partnerName}</Text>

        <View style={s.detailsRow}>
          <View style={s.detailItem}>
            <Text style={[s.detailValue, { color: eligColor }]}>
              {t('finance.loan.products.interestRate', { rate: item.interestRate })}
            </Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailValue}>
              {t('finance.loan.products.maxAmount', { amount: item.maxAmountKes.toLocaleString() })}
            </Text>
          </View>
          <View style={s.detailItem}>
            <Text style={s.detailValue}>
              {t('finance.loan.products.repaymentMonths', { months: item.repaymentMonths })}
            </Text>
          </View>
        </View>

        {item.description && (
          <Text style={s.description} numberOfLines={2}>{item.description}</Text>
        )}

        <Pressable
          style={[s.applyBtn, !eligible && s.applyBtnDisabled]}
          disabled={!eligible}
          onPress={() => navigation.navigate('LoanApplication', { productId: item.id })}
          accessibilityRole="button"
        >
          <Text style={[s.applyLabel, !eligible && s.applyLabelDisabled]}>
            {eligible
              ? t('finance.loan.products.applyBtn')
              : t('finance.loan.products.notEligible')}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('finance.loan.products.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('finance.loan.products.empty.title')}</Text>
            <Text style={s.emptyBody}>{t('finance.loan.products.empty.body')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#FAFAFA' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:          { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:           { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#E3F2FD', borderRadius: 8 },
  retryLabel:         { fontSize: 15, color: '#1565C0', fontWeight: '600' },

  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:            { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:          { fontSize: 15, color: '#1565C0', fontWeight: '600' },
  topTitle:           { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  list:               { padding: 16, paddingBottom: 40, gap: 14 },

  card:               { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  productName:        { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 8 },
  eligBadge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  eligText:           { fontSize: 11, fontWeight: '700' },
  partnerName:        { fontSize: 13, color: '#757575', marginBottom: 12 },

  detailsRow:         { gap: 4, marginBottom: 10 },
  detailItem:         {},
  detailValue:        { fontSize: 13, color: '#333' },

  description:        { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 12 },

  applyBtn:           { minHeight: 48, backgroundColor: '#1565C0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  applyBtnDisabled:   { backgroundColor: '#E0E0E0' },
  applyLabel:         { color: '#FFF', fontSize: 15, fontWeight: '700' },
  applyLabelDisabled: { color: '#9E9E9E' },

  emptyBox:           { paddingVertical: 40, alignItems: 'center' },
  emptyTitle:         { fontSize: 16, fontWeight: '600', color: '#424242', marginBottom: 6 },
  emptyBody:          { fontSize: 14, color: '#757575', textAlign: 'center' },
});
