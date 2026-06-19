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
import type { CreditBand, LoanStatus } from '../../api/finance';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'FinanceHome'>;

const BAND_COLOR: Record<CreditBand, string> = {
  A: '#1B5E20', B: '#1565C0', C: '#E65100', D: '#B71C1C',
};
const BAND_BG: Record<CreditBand, string> = {
  A: '#E8F5E9', B: '#E3F2FD', C: '#FFF3E0', D: '#FFEBEE',
};
const STATUS_COLOR: Record<LoanStatus, string> = {
  draft: '#424242', submitted: '#1565C0', under_review: '#E65100',
  approved: '#1B5E20', rejected: '#B71C1C', disbursed: '#00695C', cancelled: '#616161',
};
const STATUS_BG: Record<LoanStatus, string> = {
  draft: '#F5F5F5', submitted: '#E3F2FD', under_review: '#FFF3E0',
  approved: '#E8F5E9', rejected: '#FFEBEE', disbursed: '#E0F2F1', cancelled: '#EEEEEE',
};

export function FinanceHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const scoreQuery = useQuery({
    queryKey: ['creditScore'],
    queryFn: () => financeApi.creditScore.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const loansQuery = useQuery({
    queryKey: ['loans'],
    queryFn: () => financeApi.loans.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  if (scoreQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1565C0" /></View>
      </SafeAreaView>
    );
  }

  if (scoreQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => scoreQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const score = scoreQuery.data?.data;
  const loans = loansQuery.data?.data ?? [];
  const band: CreditBand = score?.band ?? 'D';
  const bandColor = BAND_COLOR[band];
  const bandBg = BAND_BG[band];

  const COMPS = score?.components
    ? [
        { key: 'yield', label: t('finance.score.component.yield'), val: score.components.yield.score },
        { key: 'inputs', label: t('finance.score.component.inputs'), val: score.components.inputs.score },
        { key: 'activities', label: t('finance.score.component.activities'), val: score.components.activities.score },
        { key: 'platform', label: t('finance.score.component.platform'), val: score.components.platform.score },
      ]
    : [];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.header}>{t('finance.home.title')}</Text>

        {score && (
          <Pressable
            style={[s.scoreCard, { backgroundColor: bandBg, borderColor: bandColor }]}
            onPress={() => navigation.navigate('CreditScoreDetail')}
            accessibilityRole="button"
          >
            <View style={s.scoreTop}>
              <View style={s.scoreLeft}>
                <Text style={s.scoreTitleLabel}>{t('finance.score.title')}</Text>
                <Text style={[s.scoreNum, { color: bandColor }]}>{score.score}</Text>
                <Text style={s.scoreOutOf}>{t('finance.score.outOf')}</Text>
              </View>
              <View style={[s.bandBadge, { backgroundColor: bandColor }]}>
                <Text style={s.bandText}>{t('finance.score.band', { band })}</Text>
              </View>
            </View>

            <Text style={[s.maxLoan, { color: bandColor }]}>
              {t('finance.score.maxLoan', { amount: score.maxLoanKes.toLocaleString() })}
            </Text>

            <View style={s.bars}>
              {COMPS.map((c) => (
                <View key={c.key} style={s.barRow}>
                  <Text style={s.barLabel}>{c.label}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${c.val}%`, backgroundColor: bandColor }]} />
                  </View>
                  <Text style={[s.barVal, { color: bandColor }]}>{c.val}</Text>
                </View>
              ))}
            </View>

            <Text style={s.tapHint}>{t('finance.score.tapDetail')}</Text>
          </Pressable>
        )}

        <Pressable
          style={[s.ctaBtn, { backgroundColor: bandColor }]}
          onPress={() => navigation.navigate('LoanProducts')}
          accessibilityRole="button"
        >
          <Text style={s.ctaLabel}>{t('finance.home.applyBtn')}</Text>
        </Pressable>

        <Text style={s.sectionTitle}>{t('finance.home.loanHistory')}</Text>

        {loansQuery.isLoading && (
          <ActivityIndicator size="small" color="#1565C0" style={{ marginTop: 12 }} />
        )}

        {!loansQuery.isLoading && loans.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('finance.home.loans.empty.title')}</Text>
            <Text style={s.emptyBody}>{t('finance.home.loans.empty.body')}</Text>
          </View>
        )}

        {loans.map((loan) => (
          <Pressable
            key={loan.id}
            style={s.loanRow}
            onPress={() => navigation.navigate('LoanStatus', { loanId: loan.id })}
            accessibilityRole="button"
          >
            <View style={s.loanInfo}>
              <Text style={s.loanName}>{loan.productName}</Text>
              <Text style={s.loanPartner}>{loan.partnerName}</Text>
              <Text style={s.loanAmt}>
                {t('finance.loan.amount', { amount: loan.amountRequestedKes.toLocaleString() })}
              </Text>
            </View>
            <View style={[s.statusPill, { backgroundColor: STATUS_BG[loan.status] }]}>
              <Text style={[s.statusText, { color: STATUS_COLOR[loan.status] }]}>
                {t(`finance.loan.status.${loan.status}`)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  scroll:         { padding: 16, paddingBottom: 32 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:      { fontSize: 15, color: '#B71C1C', textAlign: 'center', marginBottom: 12 },
  retryBtn:       { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#E3F2FD', borderRadius: 8 },
  retryLabel:     { fontSize: 15, color: '#1565C0', fontWeight: '600' },
  header:         { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },

  scoreCard:      { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  scoreTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  scoreLeft:      { gap: 2 },
  scoreTitleLabel:{ fontSize: 12, color: '#555', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.8 },
  scoreNum:       { fontSize: 56, fontWeight: '800', lineHeight: 64 },
  scoreOutOf:     { fontSize: 13, color: '#757575' },
  bandBadge:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  bandText:       { color: '#FFF', fontSize: 16, fontWeight: '700' },
  maxLoan:        { fontSize: 14, fontWeight: '600', marginBottom: 14 },
  bars:           { gap: 8, marginBottom: 12 },
  barRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:       { fontSize: 12, color: '#555', width: 76 },
  barTrack:       { flex: 1, height: 8, backgroundColor: '#E0E0E0', borderRadius: 4, overflow: 'hidden' },
  barFill:        { height: 8, borderRadius: 4 },
  barVal:         { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'right' },
  tapHint:        { fontSize: 12, color: '#888', textAlign: 'right' },

  ctaBtn:         { minHeight: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  ctaLabel:       { color: '#FFF', fontSize: 16, fontWeight: '700' },

  sectionTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  emptyBox:       { paddingVertical: 24, alignItems: 'center' },
  emptyTitle:     { fontSize: 15, fontWeight: '600', color: '#424242', marginBottom: 4 },
  emptyBody:      { fontSize: 13, color: '#757575', textAlign: 'center' },

  loanRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, minHeight: 72, borderWidth: 1, borderColor: '#EEEEEE' },
  loanInfo:       { flex: 1, gap: 2 },
  loanName:       { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  loanPartner:    { fontSize: 12, color: '#757575' },
  loanAmt:        { fontSize: 13, fontWeight: '700', color: '#333' },
  statusPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText:     { fontSize: 11, fontWeight: '700' },
});
