import React from 'react';
import {
  View,
  Text,
  ScrollView,
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
import type { CreditBand, LoanCategory } from '../../api/finance';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'LoanProductDetail'>;

const BAND_RANK: Record<CreditBand, number> = { A: 4, B: 3, C: 2, D: 1, ineligible: 0 };

const BAND_COLOR: Record<CreditBand, string> = {
  A: '#1B5E20', B: '#2E8B57', C: '#E65100', D: '#B71C1C', ineligible: '#616161',
};

const CATEGORY_COLOR: Record<LoanCategory, string> = {
  back_to_school: '#6A1B9A',
  farm_input:     '#92400E',
  asset_finance:  '#00695C',
  emergency:      '#B71C1C',
  general:        '#424242',
};

export function LoanProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const productQuery = useQuery({
    queryKey: ['loanProduct', productId],
    queryFn: () => financeApi.products.get(productId),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const scoreQuery = useQuery({
    queryKey: ['creditScore'],
    queryFn: () => financeApi.creditScore.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  if (productQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('finance.loan.productDetail.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1A6B3C" />
        </View>
      </SafeAreaView>
    );
  }

  if (productQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('finance.loan.productDetail.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => { void productQuery.refetch(); }} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const product = productQuery.data?.data;
  if (!product) return null;

  const farmerBand: CreditBand = scoreQuery.data?.data.band ?? 'D';
  const eligible = BAND_RANK[farmerBand] >= BAND_RANK[product.eligibilityBand];
  const bandColor = BAND_COLOR[product.eligibilityBand];
  const categoryColor = CATEGORY_COLOR[product.category];
  const maxLoanKes = scoreQuery.data?.data.maxLoanKes ?? 0;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle} numberOfLines={1}>{product.name}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={s.headerCard}>
          <View style={s.headerTop}>
            <View style={[s.categoryChip, { backgroundColor: categoryColor + '1A' }]}>
              <Text style={[s.categoryText, { color: categoryColor }]}>
                {t(`finance.loan.productDetail.category.${product.category}`)}
              </Text>
            </View>
            <View style={[s.eligBadge, { backgroundColor: eligible ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={[s.eligText, { color: eligible ? '#1B5E20' : '#B71C1C' }]}>
                {eligible
                  ? t('finance.loan.productDetail.eligibleBadge')
                  : t('finance.loan.productDetail.notEligibleBadge')}
              </Text>
            </View>
          </View>

          <Text style={s.productName}>{product.name}</Text>
          <Text style={s.partnerName}>{product.partnerName}</Text>

          {product.description && (
            <Text style={s.description}>{product.description}</Text>
          )}
        </View>

        {/* Details grid */}
        <View style={s.detailGrid}>
          <View style={s.detailRow}>
            <View style={s.detailItem}>
              <Text style={s.detailLabel}>{t('finance.loan.productDetail.interestRate')}</Text>
              <Text style={[s.detailValue, { color: bandColor }]}>
                {product.interestRate}% p.a.
              </Text>
            </View>
            <View style={[s.detailItem, s.detailItemRight]}>
              <Text style={s.detailLabel}>{t('finance.loan.productDetail.repaymentTerm')}</Text>
              <Text style={s.detailValue}>
                {t('finance.loan.productDetail.months', { n: product.repaymentMonths })}
              </Text>
            </View>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <View style={s.detailItem}>
              <Text style={s.detailLabel}>{t('finance.loan.productDetail.minAmount')}</Text>
              <Text style={s.detailValue}>
                KES {product.minAmountKes.toLocaleString()}
              </Text>
            </View>
            <View style={[s.detailItem, s.detailItemRight]}>
              <Text style={s.detailLabel}>{t('finance.loan.productDetail.maxAmount')}</Text>
              <Text style={s.detailValue}>
                KES {product.maxAmountKes.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={s.detailDivider} />

          <View style={s.detailRow}>
            <View style={s.detailItem}>
              <Text style={s.detailLabel}>{t('finance.loan.productDetail.minCreditBand')}</Text>
              <View style={[s.bandBadge, { backgroundColor: bandColor }]}>
                <Text style={s.bandText}>
                  {t('finance.score.band', { band: product.eligibilityBand })}
                </Text>
              </View>
            </View>
            {maxLoanKes > 0 && (
              <View style={[s.detailItem, s.detailItemRight]}>
                <Text style={s.detailLabel}>{t('finance.loan.productDetail.yourLimit')}</Text>
                <Text style={[s.detailValue, { color: eligible ? '#1B5E20' : '#B71C1C' }]}>
                  KES {Math.min(maxLoanKes, product.maxAmountKes).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Eligibility note */}
        {!eligible && (
          <View style={s.ineligibleBox}>
            <Text style={s.ineligibleText}>
              {t('finance.loan.productDetail.ineligibleNote', { band: product.eligibilityBand })}
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={[s.applyBtn, !eligible && s.applyBtnDisabled]}
          disabled={!eligible}
          onPress={() => navigation.navigate('LoanApplication', { productId: product.id })}
          accessibilityRole="button"
        >
          <Text style={[s.applyLabel, !eligible && s.applyLabelDisabled]}>
            {eligible
              ? t('finance.loan.productDetail.applyBtn')
              : t('finance.loan.products.notEligible')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:  { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#EAF4EE', borderRadius: 8 },
  retryLabel: { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },

  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:   { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel: { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },
  topTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1, textAlign: 'center' },

  scroll: { padding: 16, paddingBottom: 48 },

  headerCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 12 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  categoryChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  categoryText: { fontSize: 11, fontWeight: '700' },

  eligBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  eligText:  { fontSize: 11, fontWeight: '700' },

  productName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  partnerName: { fontSize: 14, color: '#757575', marginBottom: 10 },
  description: { fontSize: 14, color: '#374151', lineHeight: 20 },

  detailGrid:      { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 12 },
  detailRow:       { flexDirection: 'row', padding: 14 },
  detailItem:      { flex: 1, gap: 4 },
  detailItemRight: { alignItems: 'flex-end' },
  detailLabel:     { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:     { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  detailDivider:   { borderTopWidth: 1, borderColor: '#F3F4F6', marginHorizontal: 14 },

  bandBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  bandText:  { color: '#FFF', fontSize: 12, fontWeight: '700' },

  ineligibleBox:  { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 12 },
  ineligibleText: { fontSize: 13, color: '#E65100', lineHeight: 18 },

  applyBtn:         { minHeight: 52, backgroundColor: '#1A6B3C', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  applyBtnDisabled: { backgroundColor: '#E0E0E0' },
  applyLabel:       { color: '#FFF', fontSize: 16, fontWeight: '700' },
  applyLabelDisabled: { color: '#9E9E9E' },
});
