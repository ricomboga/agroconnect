import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { financeApi } from '../../api/finance';
import type { LoanStatus, LoanTimeline, LoanApplication } from '../../api/finance';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'LoanStatus'>;

type MilestoneKey = 'submitted' | 'under_review' | 'approved' | 'disbursed';
const MILESTONES: MilestoneKey[] = ['submitted', 'under_review', 'approved', 'disbursed'];

const STATUS_ORDER: Record<LoanStatus, number> = {
  draft: 0,
  submitted: 1,
  under_review: 2,
  approved: 3,
  rejected: 3,
  disbursed: 4,
  cancelled: 2,
  repaid: 5,
  defaulted: 4,
};

function computeRepaymentSchedule(loan: LoanApplication) {
  if (!loan.approvedAmountKes || loan.interestRate === null || !loan.disbursedAt) return [];
  const totalRepayable = loan.approvedAmountKes * (1 + loan.interestRate / 100);
  const monthlyPayment = Math.round(totalRepayable / loan.repaymentMonths);
  const startDate = new Date(loan.disbursedAt);
  return Array.from({ length: loan.repaymentMonths }, (_, i) => {
    const due = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, startDate.getDate());
    return {
      month: i + 1,
      dueDate: due.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }),
      total: monthlyPayment,
    };
  });
}

function getMilestoneState(
  milestone: MilestoneKey,
  status: LoanStatus,
): 'done' | 'active' | 'rejected' | 'cancelled' | 'pending' {
  const milestoneOrder: Record<MilestoneKey, number> = {
    submitted: 1, under_review: 2, approved: 3, disbursed: 4,
  };
  const rank = STATUS_ORDER[status];
  const mRank = milestoneOrder[milestone];

  if (status === 'rejected' && milestone === 'approved') return 'rejected';
  if (status === 'cancelled' && milestone === 'under_review') return 'cancelled';

  if (mRank < rank) return 'done';
  if (mRank === rank) {
    if (status === 'disbursed') return 'done';
    return 'active';
  }
  return 'pending';
}

function findTimestamp(timeline: LoanTimeline[], status: LoanStatus): string | null {
  return timeline.find((t) => t.status === status)?.timestamp ?? null;
}

function formatTs(ts: string | null): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('sw-KE', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return ts.slice(0, 10);
  }
}

export function LoanStatusScreen({ navigation, route }: Props) {
  const { loanId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const loanQuery = useQuery({
    queryKey: ['loan', loanId],
    queryFn: () => financeApi.loans.get(loanId),
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
  });

  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: () => financeApi.loans.cancel(loanId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['loan', loanId] });
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });

  if (loanQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      </SafeAreaView>
    );
  }

  if (loanQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => loanQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const loan = loanQuery.data?.data;
  if (!loan) return null;

  const STATUS_COLOR: Record<LoanStatus, string> = {
    draft: '#424242', submitted: '#2E8B57', under_review: '#E65100',
    approved: '#1B5E20', rejected: '#B71C1C', disbursed: '#00695C', cancelled: '#616161',
    repaid: '#1B5E20', defaulted: '#7B1FA2',
  };
  const STATUS_BG: Record<LoanStatus, string> = {
    draft: '#F5F5F5', submitted: '#EAF4EE', under_review: '#FFF3E0',
    approved: '#E8F5E9', rejected: '#FFEBEE', disbursed: '#E0F2F1', cancelled: '#EEEEEE',
    repaid: '#E8F5E9', defaulted: '#F3E5F5',
  };

  const MILESTONE_STATUS_MAP: Record<MilestoneKey, LoanStatus> = {
    submitted: 'submitted',
    under_review: 'under_review',
    approved: loan.status === 'rejected' ? 'rejected' : 'approved',
    disbursed: loan.status === 'cancelled' ? 'cancelled' : 'disbursed',
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('finance.loan.statusScreen.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header card */}
        <View style={s.headerCard}>
          <Text style={s.productName}>{loan.productName}</Text>
          <Text style={s.partnerName}>{loan.partnerName}</Text>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>
              {t('finance.loan.amount', { amount: loan.amountRequestedKes.toLocaleString() })}
            </Text>
            <View style={[s.statusPill, { backgroundColor: STATUS_BG[loan.status as LoanStatus] }]}>
              <Text style={[s.statusText, { color: STATUS_COLOR[loan.status as LoanStatus] }]}>
                {t(`finance.loan.status.${loan.status}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={s.timeline}>
          {MILESTONES.map((milestone, idx) => {
            const milestoneStatusKey = MILESTONE_STATUS_MAP[milestone];
            const state = getMilestoneState(milestone, loan.status);
            const ts = findTimestamp(loan.timeline, MILESTONE_STATUS_MAP[milestone]);
            const isLast = idx === MILESTONES.length - 1;
            const isDone = state === 'done';
            const isActive = state === 'active';
            const isRejected = state === 'rejected';
            const isCancelled = state === 'cancelled';
            const isFinal = isDone || isActive || isRejected || isCancelled;

            const dotColor = isRejected || isCancelled
              ? '#B71C1C'
              : isDone ? '#1B5E20'
              : isActive ? '#2E8B57'
              : '#BDBDBD';

            return (
              <View key={milestone} style={s.timelineRow}>
                <View style={s.dotCol}>
                  <View style={[s.dot, { backgroundColor: dotColor, borderColor: dotColor }]}>
                    {isDone && <Text style={s.checkMark}>✓</Text>}
                    {(isRejected || isCancelled) && <Text style={s.checkMark}>✕</Text>}
                  </View>
                  {!isLast && (
                    <View style={[s.connector, { backgroundColor: isDone ? '#1B5E20' : '#E0E0E0' }]} />
                  )}
                </View>
                <View style={s.milestoneInfo}>
                  <Text style={[
                    s.milestoneLabel,
                    isFinal && { color: dotColor, fontWeight: '700' },
                  ]}>
                    {t(`finance.loan.statusScreen.milestones.${milestoneStatusKey}`)}
                  </Text>
                  {ts && <Text style={s.milestoneTs}>{formatTs(ts)}</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Cancel button — draft / submitted / under_review */}
        {(loan.status === 'draft' || loan.status === 'submitted' || loan.status === 'under_review') && (
          <Pressable
            style={s.cancelBtn}
            onPress={() =>
              Alert.alert(
                t('finance.loan.statusScreen.cancelConfirmTitle'),
                t('finance.loan.statusScreen.cancelConfirmMsg'),
                [
                  { text: t('finance.loan.statusScreen.cancelNo'), style: 'cancel' },
                  {
                    text: t('finance.loan.statusScreen.cancelYes'),
                    style: 'destructive',
                    onPress: () => cancelMutation.mutate(),
                  },
                ],
              )
            }
            disabled={cancelMutation.isPending}
            accessibilityRole="button"
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator size="small" color="#B71C1C" />
            ) : (
              <Text style={s.cancelLabel}>{t('finance.loan.statusScreen.cancelBtn')}</Text>
            )}
          </Pressable>
        )}

        {/* Approved / disbursed info */}
        {(loan.status === 'approved' || loan.status === 'disbursed') && loan.approvedAmountKes && (
          <View style={s.approvalCard}>
            <Text style={s.approvalTitle}>{t('finance.loan.statusScreen.approvedSection')}</Text>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>{t('finance.loan.statusScreen.approvedAmount')}</Text>
              <Text style={s.infoValue}>
                {t('finance.loan.amount', { amount: loan.approvedAmountKes.toLocaleString() })}
              </Text>
            </View>
            {loan.interestRate !== null && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('finance.loan.statusScreen.interestRate')}</Text>
                <Text style={s.infoValue}>
                  {t('finance.loan.statusScreen.rateFormat', { rate: loan.interestRate })}
                </Text>
              </View>
            )}
            {loan.disbursedAt && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('finance.loan.statusScreen.disbursedAt')}</Text>
                <Text style={s.infoValue}>{formatTs(loan.disbursedAt)}</Text>
              </View>
            )}
            {loan.mpesaRef && (
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>{t('finance.loan.statusScreen.mpesaRef')}</Text>
                <Text style={[s.infoValue, s.mpesaRef]}>{loan.mpesaRef}</Text>
              </View>
            )}
          </View>
        )}

        {/* Repayment schedule — approved / disbursed */}
        {(loan.status === 'approved' || loan.status === 'disbursed') &&
          loan.approvedAmountKes &&
          loan.interestRate !== null &&
          loan.disbursedAt && (
            <View style={s.repayCard}>
              <Text style={s.repayTitle}>{t('finance.loan.statusScreen.repaymentSchedule')}</Text>
              {computeRepaymentSchedule(loan).map((item) => (
                <View key={item.month} style={s.repayRow}>
                  <View style={s.repayLeft}>
                    <Text style={s.repayMonth}>
                      {t('finance.loan.statusScreen.repaymentMonth', { n: item.month })}
                    </Text>
                    <Text style={s.repayDue}>{item.dueDate}</Text>
                  </View>
                  <Text style={s.repayAmount}>KES {item.total.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

        {loan.status === 'rejected' && (
          <View style={s.rejectedNote}>
            <Text style={s.rejectedText}>{t('finance.loan.statusScreen.rejectedNote')}</Text>
          </View>
        )}

        {loan.status === 'cancelled' && (
          <View style={s.cancelledNote}>
            <Text style={s.cancelledText}>{t('finance.loan.statusScreen.cancelledNote')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:      { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:       { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#EAF4EE', borderRadius: 8 },
  retryLabel:     { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },

  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:        { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:      { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },
  topTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:         { padding: 16, paddingBottom: 48 },

  headerCard:     { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EEEEEE' },
  productName:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  partnerName:    { fontSize: 13, color: '#757575', marginBottom: 10 },
  amountRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel:    { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  statusPill:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusText:     { fontSize: 12, fontWeight: '700' },

  timeline:       { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEEEEE' },
  timelineRow:    { flexDirection: 'row', minHeight: 60 },
  dotCol:         { alignItems: 'center', width: 32, marginRight: 12 },
  dot:            { width: 28, height: 28, borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  checkMark:      { color: '#FFF', fontSize: 13, fontWeight: '800' },
  connector:      { flex: 1, width: 2, marginVertical: 2 },
  milestoneInfo:  { flex: 1, paddingTop: 4, paddingBottom: 16 },
  milestoneLabel: { fontSize: 14, color: '#757575' },
  milestoneTs:    { fontSize: 12, color: '#BDBDBD', marginTop: 2 },

  approvalCard:   { backgroundColor: '#E8F5E9', borderRadius: 14, padding: 16, marginBottom: 12 },
  approvalTitle:  { fontSize: 15, fontWeight: '700', color: '#388E3C', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
  infoLabel:      { fontSize: 13, color: '#555' },
  infoValue:      { fontSize: 14, fontWeight: '700', color: '#1B5E20' },
  mpesaRef:       { fontFamily: 'monospace' },

  rejectedNote:   { backgroundColor: '#FFEBEE', borderRadius: 12, padding: 14 },
  rejectedText:   { fontSize: 14, color: '#B71C1C', lineHeight: 20 },
  cancelledNote:  { backgroundColor: '#EEEEEE', borderRadius: 12, padding: 14 },
  cancelledText:  { fontSize: 14, color: '#616161', lineHeight: 20 },

  cancelBtn: {
    minHeight: 48, borderRadius: 10, borderWidth: 1.5, borderColor: '#B71C1C',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  cancelLabel: { fontSize: 14, fontWeight: '700', color: '#B71C1C' },

  repayCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EEEEEE',
  },
  repayTitle: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  repayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  repayLeft:   { gap: 2 },
  repayMonth:  { fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  repayDue:    { fontSize: 11, color: '#757575' },
  repayAmount: { fontSize: 13, fontWeight: '700', color: '#1A6B3C' },
});
