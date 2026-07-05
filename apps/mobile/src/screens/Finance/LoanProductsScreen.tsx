import React from 'react';
import {
  View,
  Text,
  SectionList,
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
import type { CreditBand, LoanCategory, LoanProduct, PartnerType } from '../../api/finance';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'LoanProducts'>;

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
const PARTNER_TYPE_COLOR: Record<PartnerType, string> = {
  bank:         '#92400E',
  microfinance: '#00695C',
  sacco:        '#6A1B9A',
};

interface Section {
  partnerId: string;
  partnerName: string;
  partnerType: PartnerType;
  data: LoanProduct[];
}

function groupByPartner(products: LoanProduct[]): Section[] {
  const map = new Map<string, Section>();
  for (const p of products) {
    if (!map.has(p.partnerId)) {
      map.set(p.partnerId, {
        partnerId:   p.partnerId,
        partnerName: p.partnerName,
        partnerType: p.partnerType,
        data:        [],
      });
    }
    map.get(p.partnerId)!.data.push(p);
  }
  return Array.from(map.values());
}

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

  const isLoading = productsQuery.isLoading || (scoreQuery.isLoading && !scoreQuery.isError);
  const isError = productsQuery.isError;

  const topBar = (
    <View style={s.topBar}>
      <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
        <Text style={s.backLabel}>{t('common.back')}</Text>
      </Pressable>
      <Text style={s.topTitle}>{t('finance.loan.products.title')}</Text>
      <View style={s.backBtn} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        {topBar}
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe}>
        {topBar}
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
  const sections = groupByPartner(products);

  return (
    <SafeAreaView style={s.safe}>
      {topBar}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => {
          const typeColor = PARTNER_TYPE_COLOR[section.partnerType];
          return (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.partnerName}</Text>
              <View style={[s.typeBadge, { backgroundColor: typeColor + '1A' }]}>
                <Text style={[s.typeText, { color: typeColor }]}>
                  {t(`finance.loan.products.partnerType.${section.partnerType}`)}
                </Text>
              </View>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const eligible = BAND_RANK[farmerBand] >= BAND_RANK[item.eligibilityBand];
          const catColor = CATEGORY_COLOR[item.category];
          const bandColor = BAND_COLOR[item.eligibilityBand];
          return (
            <Pressable
              style={s.card}
              onPress={() => navigation.navigate('LoanProductDetail', { productId: item.id })}
              accessibilityRole="button"
            >
              <View style={s.cardTop}>
                <View style={s.cardTopLeft}>
                  <View style={[s.categoryChip, { backgroundColor: catColor + '1A' }]}>
                    <Text style={[s.categoryText, { color: catColor }]}>
                      {t(`finance.loan.productDetail.category.${item.category}`)}
                    </Text>
                  </View>
                  <Text style={s.productName}>{item.name}</Text>
                </View>
                <View style={[s.eligBadge, { backgroundColor: eligible ? '#E8F5E9' : '#FFEBEE' }]}>
                  <Text style={[s.eligText, { color: eligible ? '#1B5E20' : '#B71C1C' }]}>
                    {eligible
                      ? t('finance.loan.productDetail.eligibleBadge')
                      : t('finance.loan.products.notEligible')}
                  </Text>
                </View>
              </View>

              <View style={s.detailsRow}>
                <Text style={[s.detailChip, { color: bandColor }]}>
                  {item.interestRate}% p.a.
                </Text>
                <Text style={s.detailChipDivider}>·</Text>
                <Text style={s.detailChip}>
                  KES {item.maxAmountKes.toLocaleString()} max
                </Text>
                <Text style={s.detailChipDivider}>·</Text>
                <Text style={s.detailChip}>
                  {item.repaymentMonths} {t('finance.loan.productDetail.months', { n: item.repaymentMonths })}
                </Text>
              </View>

              {item.description && (
                <Text style={s.description} numberOfLines={2}>{item.description}</Text>
              )}

              <Text style={s.viewDetails}>{t('finance.loan.products.viewDetails')} →</Text>
            </Pressable>
          );
        }}
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
  safe:   { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:  { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:   { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#EAF4EE', borderRadius: 8 },
  retryLabel: { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },

  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:   { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel: { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },
  topTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  list: { padding: 16, paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 8 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  typeBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeText:      { fontSize: 10, fontWeight: '700' },

  card:       { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTopLeft:{ flex: 1, gap: 4, marginRight: 8 },

  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  categoryText: { fontSize: 10, fontWeight: '700' },

  productName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },

  eligBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  eligText:  { fontSize: 10, fontWeight: '700' },

  detailsRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  detailChip:      { fontSize: 12, color: '#374151', fontWeight: '600' },
  detailChipDivider: { fontSize: 12, color: '#9CA3AF' },

  description:  { fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 8 },
  viewDetails:  { fontSize: 12, color: '#1A6B3C', fontWeight: '600', textAlign: 'right' },

  emptyBox:   { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#424242', marginBottom: 6 },
  emptyBody:  { fontSize: 14, color: '#757575', textAlign: 'center' },
});
