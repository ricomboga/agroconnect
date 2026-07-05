import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { financeApi } from '../../api/finance';
import type {
  CreditBand,
  LoanStatus,
  LoanApplication,
  Transaction,
  FarmerFinancialReport,
  CropHarvestTotal,
  AnimalProductTotal,
} from '../../api/finance';
import { productLabel } from '../../constants/animalProducts';
import { exportReportAsCsv, exportReportAsPdf } from '../../utils/reportExport';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'FinanceHome'>;
type ActiveTab = 'cashflow' | 'loans' | 'reports';

const CHART_H = 52;

function formatTxDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

// ── Loan-tab colour maps ──────────────────────────────────────────────────────

const BAND_COLOR: Record<CreditBand, string> = {
  A: '#1B5E20', B: '#2E8B57', C: '#E65100', D: '#B71C1C', ineligible: '#616161',
};
const BAND_BG: Record<CreditBand, string> = {
  A: '#E8F5E9', B: '#EAF4EE', C: '#FFF3E0', D: '#FFEBEE', ineligible: '#EEEEEE',
};
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

// ─────────────────────────────────────────────────────────────────────────────

export function FinanceHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashflow');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

  const txQuery = useQuery({
    queryKey: ['finance/transactions'],
    queryFn: () => financeApi.transactions.list(),
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
  });

  const allTxs: Transaction[] = txQuery.data?.data ?? [];

  const { incomeTotal, expensesTotal, net, currentMonthLabel, vsLastMonthPct } = React.useMemo(() => {
    const now = new Date();
    const cm = now.getMonth();
    const cy = now.getFullYear();
    const pm = cm === 0 ? 11 : cm - 1;
    const py = cm === 0 ? cy - 1 : cy;
    let incomeTotal = 0, expensesTotal = 0, prevIncome = 0, prevExpenses = 0;
    for (const tx of allTxs) {
      const parts = tx.date.split('-').map(Number);
      const mo = (parts[1] ?? 1) - 1;
      const y = parts[0] ?? 0;
      if (mo === cm && y === cy) {
        if (tx.type === 'income') incomeTotal += tx.amountKes;
        else expensesTotal += tx.amountKes;
      } else if (mo === pm && y === py) {
        if (tx.type === 'income') prevIncome += tx.amountKes;
        else prevExpenses += tx.amountKes;
      }
    }
    const net = incomeTotal - expensesTotal;
    const prevNet = prevIncome - prevExpenses;
    let vsLastMonthPct: string | null = null;
    if (prevNet !== 0) {
      const pct = Math.round(((net - prevNet) / Math.abs(prevNet)) * 100);
      vsLastMonthPct = pct > 0 ? `+${pct}` : String(pct);
    }
    const label = now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
    return { incomeTotal, expensesTotal, net, currentMonthLabel: label, vsLastMonthPct };
  }, [allTxs]);

  const weeksData = React.useMemo(() => {
    const now = new Date();
    const weeks = [
      { label: 'W1', income: 0, expenses: 0 },
      { label: 'W2', income: 0, expenses: 0 },
      { label: 'W3', income: 0, expenses: 0 },
      { label: 'W4', income: 0, expenses: 0 },
    ];
    for (const tx of allTxs) {
      const parts = tx.date.split('-').map(Number);
      const txDate = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
      const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / 86400000);
      if (daysAgo >= 0 && daysAgo < 28) {
        const weekIdx = 3 - Math.floor(daysAgo / 7);
        if (tx.type === 'income') weeks[weekIdx].income += tx.amountKes;
        else weeks[weekIdx].expenses += tx.amountKes;
      }
    }
    return weeks;
  }, [allTxs]);

  const maxCombined = Math.max(1, ...weeksData.map((w) => w.income + w.expenses));
  const recentTxs = allTxs.slice(0, 8);

  const score = scoreQuery.data?.data;
  const loans = loansQuery.data?.data ?? [];
  const band: CreditBand = score?.band ?? 'D';
  const bandColor = BAND_COLOR[band];
  const bandBg = BAND_BG[band];

  const COMPS = score?.components
    ? [
        { key: 'yield',      label: t('finance.score.component.yield'),      val: score.components.yield.score },
        { key: 'inputs',     label: t('finance.score.component.inputs'),     val: score.components.inputs.score },
        { key: 'activities', label: t('finance.score.component.activities'), val: score.components.activities.score },
        { key: 'platform',   label: t('finance.score.component.platform'),   val: score.components.platform.score },
      ]
    : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />

      {/* TopBar */}
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Text style={s.topBarTitle}>{t('finance.home.title')}</Text>
          <Pressable
            style={s.topBarBtn}
            onPress={() => navigation.navigate('AddTransaction')}
            accessibilityRole="button"
            accessibilityLabel={t('finance.home.addTransaction')}
          >
            <Text style={s.topBarIcon}>+</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* SubTabs */}
      <View style={s.subTabs}>
        {(['cashflow', 'loans', 'reports'] as ActiveTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
          >
            <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
              {t(`finance.home.tabs.${tab}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Cash Flow tab ───────────────────────────────────────────────────── */}
      {activeTab === 'cashflow' && (
        <>
          {txQuery.isLoading && (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#1A6B3C" />
            </View>
          )}

          {txQuery.isError && (
            <View style={s.center}>
              <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
              <Pressable onPress={() => txQuery.refetch()} style={s.retryBtn}>
                <Text style={s.retryLabel}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}

          {!txQuery.isLoading && !txQuery.isError && (
            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Net Position Banner */}
              <View style={s.netBanner}>
                <Text style={s.netBannerPeriod}>
                  {t('finance.home.netBanner.period', { month: currentMonthLabel })}
                </Text>

                <View style={s.netBannerRow}>
                  <View>
                    <Text style={s.netBannerLabel}>{t('finance.home.netBanner.income')}</Text>
                    <Text style={s.netBannerAmount}>KES {incomeTotal.toLocaleString()}</Text>
                  </View>
                  <View style={s.netBannerRightCol}>
                    <Text style={[s.netBannerLabel, s.alignRight]}>{t('finance.home.netBanner.expenses')}</Text>
                    <Text style={[s.netBannerAmount, s.alignRight]}>KES {expensesTotal.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={s.netDivider} />

                <Text style={s.netBannerLabel}>{t('finance.home.netBanner.netProfit')}</Text>
                <Text style={s.netBannerNet}>KES {net.toLocaleString()}</Text>
                {vsLastMonthPct !== null && (
                  <View style={s.vsPill}>
                    <Text style={s.vsPillText}>
                      {t('finance.home.netBanner.vsLastMonth', { pct: vsLastMonthPct })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Chart */}
              <Text style={s.sectionHeader}>{t('finance.home.chart.title')}</Text>
              <View style={s.chartCard}>
                <View style={s.barsRow}>
                  {weeksData.map((w) => {
                    const incomeH = Math.round((w.income / maxCombined) * CHART_H);
                    const expenseH = Math.round((w.expenses / maxCombined) * CHART_H);
                    return (
                      <View key={w.label} style={s.barCol}>
                        <View style={[s.barIncome, { height: incomeH }]} />
                        <View style={[s.barExpense, { height: expenseH }]} />
                      </View>
                    );
                  })}
                </View>

                <View style={s.weekLabelsRow}>
                  {weeksData.map((w) => (
                    <Text key={w.label} style={s.weekLabel}>{w.label}</Text>
                  ))}
                </View>

                <View style={s.legend}>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: '#34D399' }]} />
                    <Text style={s.legendText}>{t('finance.home.chart.income')}</Text>
                  </View>
                  <View style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: '#F87171' }]} />
                    <Text style={s.legendText}>{t('finance.home.chart.expenses')}</Text>
                  </View>
                </View>
              </View>

              {/* Recent Transactions */}
              <Text style={s.sectionHeader}>{t('finance.home.transactions.title')}</Text>

              {recentTxs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyTitle}>{t('finance.home.transactions.empty.title')}</Text>
                  <Text style={s.emptyBody}>{t('finance.home.transactions.empty.body')}</Text>
                </View>
              ) : (
                recentTxs.map((tx, idx) => (
                  <View
                    key={tx.id}
                    style={[s.txRow, idx === recentTxs.length - 1 && s.txRowLast]}
                  >
                    <View
                      style={[
                        s.txAvatar,
                        { backgroundColor: tx.type === 'income' ? '#EAF4EE' : '#FEE2E2' },
                      ]}
                    >
                      <Text style={s.txAvatarIcon}>
                        {tx.type === 'income' ? '📈' : '📉'}
                      </Text>
                    </View>

                    <View style={s.txInfo}>
                      <Text style={s.txTitle} numberOfLines={1}>
                        {t(`finance.transaction.category.${tx.category}`)}
                        {tx.buyerSupplier
                          ? ` — ${tx.buyerSupplier}`
                          : tx.notes
                          ? ` — ${tx.notes}`
                          : ''}
                      </Text>
                      <Text style={s.txSub}>
                        {formatTxDate(tx.date)} · {t(`finance.home.transactions.${tx.type}`)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        s.txAmount,
                        { color: tx.type === 'income' ? '#1A6B3C' : '#DC2626' },
                      ]}
                    >
                      {tx.type === 'income' ? '+' : '-'}KES {tx.amountKes.toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ── Loans tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'loans' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {scoreQuery.isLoading && (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#1A6B3C" />
            </View>
          )}

          {scoreQuery.isError && (
            <View style={s.center}>
              <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
              <Pressable onPress={() => scoreQuery.refetch()} style={s.retryBtn}>
                <Text style={s.retryLabel}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}

          {score && !scoreQuery.isLoading && (
            <>
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

              <Pressable
                style={[s.ctaBtn, { backgroundColor: bandColor }]}
                onPress={() => navigation.navigate('LoanProducts')}
                accessibilityRole="button"
              >
                <Text style={s.ctaLabel}>{t('finance.home.applyBtn')}</Text>
              </Pressable>
            </>
          )}

          {loans.length > 0 && score && (
            <LoanOverviewCard loans={loans} maxLoanKes={score.maxLoanKes} t={t} />
          )}

          <Text style={s.loansSectionTitle}>{t('finance.home.loanHistory')}</Text>

          {loansQuery.isLoading && (
            <ActivityIndicator size="small" color="#1A6B3C" style={{ marginTop: 12 }} />
          )}

          {!loansQuery.isLoading && loans.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>{t('finance.home.loans.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('finance.home.loans.empty.body')}</Text>
            </View>
          )}

          {loans.map((loan: LoanApplication) => (
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
      )}

      {/* ── Reports tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <ReportsTab t={t} allTxs={allTxs} isOnline={isOnline} />
      )}

      {/* FAB */}
      <Pressable
        style={s.fab}
        onPress={() => navigation.navigate('AddTransaction')}
        accessibilityRole="button"
        accessibilityLabel={t('finance.home.addTransaction')}
      >
        <Text style={s.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

// ── Loan Overview Card ────────────────────────────────────────────────────────

interface LoanOverviewCardProps {
  loans: LoanApplication[];
  maxLoanKes: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function computeNextPayment(loans: LoanApplication[]): string | null {
  const disbursed = loans.filter((l) => l.status === 'disbursed' && l.approvedAmountKes && l.interestRate !== null && l.disbursedAt);
  if (disbursed.length === 0) return null;
  let earliest: Date | null = null;
  for (const loan of disbursed) {
    const start = new Date(loan.disbursedAt!);
    const now = new Date();
    for (let i = 1; i <= loan.repaymentMonths; i++) {
      const due = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
      if (due >= now) {
        if (!earliest || due < earliest) earliest = due;
        break;
      }
    }
  }
  if (!earliest) return null;
  return earliest.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function LoanOverviewCard({ loans, maxLoanKes, t }: LoanOverviewCardProps) {
  const activeLoans   = loans.filter((l) => l.status === 'disbursed').length;
  const defaulted     = loans.filter((l) => l.status === 'defaulted').length;
  const nextPayment   = computeNextPayment(loans);

  return (
    <View style={ov.card}>
      <Text style={ov.title}>{t('finance.home.loanOverview.title')}</Text>
      <View style={ov.grid}>
        <View style={ov.cell}>
          <Text style={ov.cellLabel}>{t('finance.home.loanOverview.creditLimit')}</Text>
          <Text style={ov.cellValue}>KES {maxLoanKes.toLocaleString()}</Text>
        </View>
        <View style={[ov.cell, ov.cellRight]}>
          <Text style={ov.cellLabel}>{t('finance.home.loanOverview.activeLoans')}</Text>
          <Text style={[ov.cellValue, { color: activeLoans > 0 ? '#00695C' : '#424242' }]}>
            {activeLoans}
          </Text>
        </View>
      </View>
      <View style={ov.divider} />
      <View style={ov.grid}>
        <View style={ov.cell}>
          <Text style={ov.cellLabel}>{t('finance.home.loanOverview.nextPayment')}</Text>
          <Text style={[ov.cellValue, { fontSize: 13 }]}>
            {nextPayment ?? '—'}
          </Text>
        </View>
        <View style={[ov.cell, ov.cellRight]}>
          <Text style={ov.cellLabel}>{t('finance.home.loanOverview.nonPerforming')}</Text>
          <Text style={[ov.cellValue, { color: defaulted > 0 ? '#7B1FA2' : '#424242' }]}>
            {defaulted}
          </Text>
        </View>
      </View>
    </View>
  );
}

const ov = StyleSheet.create({
  card:      { backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', padding: 12, marginBottom: 12 },
  title:     { fontSize: 12, fontWeight: '700', color: '#1A6B3C', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  grid:      { flexDirection: 'row' },
  cell:      { flex: 1, gap: 2 },
  cellRight: { alignItems: 'flex-end' },
  cellLabel: { fontSize: 10, color: '#6B7280' },
  cellValue: { fontSize: 15, fontWeight: '800', color: '#111827' },
  divider:   { borderTopWidth: 1, borderColor: '#BBF7D0', marginVertical: 8 },
});

// ── Reports tab ───────────────────────────────────────────────────────────────

type ReportPeriod = 'month' | 'quarter' | 'year';

interface CategoryRow {
  category: string;
  amount: number;
  pct: number;
}

function periodStart(period: ReportPeriod, now: Date): Date {
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'quarter') return new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(now.getFullYear(), 0, 1);
}

function periodLabel(period: ReportPeriod, start: Date, now: Date): string {
  if (period === 'month') {
    return now.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
  }
  const startLabel = start.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
  const endLabel = now.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildShareText(
  t: (key: string, opts?: Record<string, unknown>) => string,
  label: string,
  income: number,
  expenses: number,
  net: number,
  report: FarmerFinancialReport | undefined,
): string {
  const lines = [
    `${t('finance.home.title')} — ${t('finance.home.tabs.reports')}`,
    label,
    '',
    `${t('finance.home.reports.income')}: KES ${income.toLocaleString()}`,
    `${t('finance.home.reports.expenses')}: KES ${expenses.toLocaleString()}`,
    `${t('finance.home.reports.netProfit')}: KES ${net.toLocaleString()}`,
  ];

  if (report) {
    const { cropHarvests, animalProducts, collections } = report.production;
    if (cropHarvests.byCrop.length > 0) {
      lines.push('', t('finance.home.reports.production.crops') + ':');
      for (const c of cropHarvests.byCrop) {
        lines.push(`  ${c.cropName}: ${c.harvestedKg}kg (${c.soldKg}kg sold) — KES ${c.revenueKes.toLocaleString()}`);
      }
    }
    if (animalProducts.byType.length > 0) {
      lines.push('', t('finance.home.reports.production.animalProducts') + ':');
      for (const p of animalProducts.byType) {
        lines.push(`  ${productLabel(p.productType, t)}: ${p.totalQty} ${p.unit} — KES ${p.revenueKes.toLocaleString()}`);
      }
    }
    if (collections.totalSalesKes > 0) {
      lines.push(
        '',
        `${t('finance.home.reports.production.collections')}: KES ${collections.totalSalesKes.toLocaleString()}` +
          ` (${t('finance.home.reports.production.paid')} ${collections.paidKes.toLocaleString()}, ` +
          `${t('finance.home.reports.production.pending')} ${collections.pendingKes.toLocaleString()})`,
      );
    }
    if (report.creditScore) {
      lines.push('', `${t('finance.score.title')}: ${report.creditScore.score} (${report.creditScore.band})`);
    }
  }

  return lines.join('\n');
}

function ReportsTab({
  t,
  allTxs,
  isOnline,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  allTxs: Transaction[];
  isOnline: boolean;
}) {
  const [period, setPeriod] = React.useState<ReportPeriod>('month');
  const [categoryTab, setCategoryTab] = React.useState<'income' | 'expense'>('income');
  const [exporting, setExporting] = React.useState(false);

  const runExport = async (fn: () => Promise<void>) => {
    setExporting(true);
    try {
      await fn();
    } catch (err) {
      Alert.alert(t('common.error.loadFailed'), err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  const { fromDate, toDate } = React.useMemo(() => {
    const now = new Date();
    const start = periodStart(period, now);
    return { fromDate: toDateStr(start), toDate: toDateStr(now) };
  }, [period]);

  const reportQuery = useQuery({
    queryKey: ['finance/report', fromDate, toDate],
    queryFn: () => financeApi.reports.me({ fromDate, toDate }),
    enabled: isOnline,
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
  });
  const report = reportQuery.data?.data;

  const { income, expenses, label, incomeByCategory, expenseByCategory } = React.useMemo(() => {
    const now = new Date();
    const start = periodStart(period, now);
    let income = 0;
    let expenses = 0;
    const incomeByCategory = new Map<string, number>();
    const expenseByCategory = new Map<string, number>();

    for (const tx of allTxs) {
      const parts = tx.date.split('-').map(Number);
      const txDate = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1);
      if (txDate < start || txDate > now) continue;
      if (tx.type === 'income') {
        income += tx.amountKes;
        incomeByCategory.set(tx.category, (incomeByCategory.get(tx.category) ?? 0) + tx.amountKes);
      } else {
        expenses += tx.amountKes;
        expenseByCategory.set(tx.category, (expenseByCategory.get(tx.category) ?? 0) + tx.amountKes);
      }
    }

    return { income, expenses, label: periodLabel(period, start, now), incomeByCategory, expenseByCategory };
  }, [allTxs, period]);

  const net = income - expenses;
  const netPct = income > 0 ? Math.round((net / income) * 100) : 0;

  const breakdown: CategoryRow[] = React.useMemo(() => {
    const map = categoryTab === 'income' ? incomeByCategory : expenseByCategory;
    const total = Array.from(map.values()).reduce((sum, v) => sum + v, 0);
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [incomeByCategory, expenseByCategory, categoryTab]);

  const PERIODS: Array<{ key: ReportPeriod; label: string }> = [
    { key: 'month',   label: t('finance.home.reports.periodMonth') },
    { key: 'quarter', label: t('finance.home.reports.periodQuarter') },
    { key: 'year',    label: t('finance.home.reports.periodYear') },
  ];

  return (
    <ScrollView style={rs.scroll} contentContainerStyle={rs.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Period selector */}
      <View style={rs.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[rs.periodBtn, period === p.key && rs.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
            accessibilityRole="button"
          >
            <Text style={[rs.periodLabel, period === p.key && rs.periodLabelActive]}>{p.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* P&L summary card */}
      <View style={rs.plCard}>
        <Text style={rs.plPeriod}>{label}</Text>
        <View style={rs.plRow}>
          <View style={rs.plCol}>
            <Text style={rs.plColLabel}>{t('finance.home.reports.income')}</Text>
            <Text style={[rs.plColAmount, { color: '#1A6B3C' }]}>
              KES {income.toLocaleString()}
            </Text>
          </View>
          <View style={[rs.plCol, rs.plColRight]}>
            <Text style={[rs.plColLabel, { textAlign: 'right' }]}>{t('finance.home.reports.expenses')}</Text>
            <Text style={[rs.plColAmount, { color: '#DC2626', textAlign: 'right' }]}>
              KES {expenses.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={rs.plDivider} />
        <View style={rs.plNetRow}>
          <Text style={rs.plNetLabel}>{t('finance.home.reports.netProfit')}</Text>
          <View style={rs.plNetRight}>
            <Text style={[rs.plNetAmount, { color: net >= 0 ? '#1A6B3C' : '#DC2626' }]}>
              KES {net.toLocaleString()}
            </Text>
            <View style={[rs.marginPill, { backgroundColor: net >= 0 ? '#EAF4EE' : '#FEE2E2' }]}>
              <Text style={[rs.marginPillText, { color: net >= 0 ? '#1A6B3C' : '#DC2626' }]}>
                {netPct}% {t('finance.home.reports.margin')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Income / Expense bar */}
      <View style={rs.incExpBar}>
        <View style={[rs.incBar, { flex: income || 1 }]} />
        <View style={[rs.expBar, { flex: expenses || 1 }]} />
      </View>
      <View style={rs.incExpLegend}>
        <View style={rs.legendItem}>
          <View style={[rs.legendDot, { backgroundColor: '#1A6B3C' }]} />
          <Text style={rs.legendText}>{t('finance.home.reports.income')}</Text>
        </View>
        <View style={rs.legendItem}>
          <View style={[rs.legendDot, { backgroundColor: '#DC2626' }]} />
          <Text style={rs.legendText}>{t('finance.home.reports.expenses')}</Text>
        </View>
      </View>

      {/* Category breakdown */}
      <Text style={rs.sectionHeader}>{t('finance.home.reports.breakdown')}</Text>
      <View style={rs.catToggle}>
        {(['income', 'expense'] as const).map((ct) => (
          <Pressable
            key={ct}
            style={[rs.catBtn, categoryTab === ct && rs.catBtnActive]}
            onPress={() => setCategoryTab(ct)}
            accessibilityRole="button"
          >
            <Text style={[rs.catBtnLabel, categoryTab === ct && rs.catBtnLabelActive]}>
              {ct === 'income' ? t('finance.home.reports.income') : t('finance.home.reports.expenses')}
            </Text>
          </Pressable>
        ))}
      </View>

      {breakdown.length === 0 && (
        <View style={rs.emptyBox}>
          <Text style={rs.emptyBody}>{t('finance.home.reports.noData')}</Text>
        </View>
      )}

      {breakdown.map((row) => (
        <View key={row.category} style={rs.breakdownRow}>
          <View style={rs.breakdownLeft}>
            <Text style={rs.breakdownLabel}>{t(`finance.transaction.category.${row.category}`)}</Text>
            <View style={rs.breakdownTrack}>
              <View
                style={[
                  rs.breakdownFill,
                  {
                    width: `${row.pct}%` as `${number}%`,
                    backgroundColor: categoryTab === 'income' ? '#1A6B3C' : '#DC2626',
                  },
                ]}
              />
            </View>
          </View>
          <View style={rs.breakdownRight}>
            <Text style={rs.breakdownAmount}>KES {row.amount.toLocaleString()}</Text>
            <Text style={rs.breakdownPct}>{row.pct}%</Text>
          </View>
        </View>
      ))}

      {/* Farm production (harvests, eggs/milk/honey, collections) */}
      <Text style={rs.sectionHeader}>{t('finance.home.reports.production.title')}</Text>
      <Text style={rs.productionSubtitle}>{t('finance.home.reports.production.subtitle')}</Text>

      {!isOnline && (
        <View style={rs.emptyBox}>
          <Text style={rs.emptyBody}>{t('finance.home.reports.production.offline')}</Text>
        </View>
      )}

      {isOnline && reportQuery.isLoading && (
        <ActivityIndicator size="small" color="#1A6B3C" style={{ marginVertical: 12 }} />
      )}

      {isOnline && reportQuery.isError && (
        <View style={rs.emptyBox}>
          <Text style={rs.emptyBody}>{t('finance.home.reports.production.loadFailed')}</Text>
          <Pressable onPress={() => reportQuery.refetch()} style={rs.retryBtn} accessibilityRole="button">
            <Text style={rs.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      )}

      {isOnline && report && (
        <>
          {report.production.cropHarvests.byCrop.length === 0 &&
            report.production.animalProducts.byType.length === 0 &&
            report.production.collections.byProductType.length === 0 && (
              <View style={rs.emptyBox}>
                <Text style={rs.emptyBody}>{t('finance.home.reports.production.empty')}</Text>
              </View>
            )}

          {report.production.cropHarvests.byCrop.length > 0 && (
            <View style={rs.prodCard}>
              <Text style={rs.prodCardTitle}>{t('finance.home.reports.production.crops')}</Text>
              {report.production.cropHarvests.byCrop.map((c: CropHarvestTotal) => (
                <View key={c.cropName} style={rs.prodRow}>
                  <Text style={rs.prodRowLabel} numberOfLines={1}>{c.cropName}</Text>
                  <Text style={rs.prodRowSub}>
                    {t('finance.home.reports.production.harvested')} {c.harvestedKg}kg ·{' '}
                    {t('finance.home.reports.production.sold')} {c.soldKg}kg
                  </Text>
                  <Text style={rs.prodRowAmount}>KES {c.revenueKes.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          {report.production.animalProducts.byType.length > 0 && (
            <View style={rs.prodCard}>
              <Text style={rs.prodCardTitle}>{t('finance.home.reports.production.animalProducts')}</Text>
              {report.production.animalProducts.byType.map((p: AnimalProductTotal) => (
                <View key={p.productType} style={rs.prodRow}>
                  <Text style={rs.prodRowLabel} numberOfLines={1}>{productLabel(p.productType, t)}</Text>
                  <Text style={rs.prodRowSub}>{p.totalQty} {p.unit}</Text>
                  <Text style={rs.prodRowAmount}>KES {p.revenueKes.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          {report.production.collections.totalSalesKes > 0 && (
            <View style={rs.prodCard}>
              <Text style={rs.prodCardTitle}>{t('finance.home.reports.production.collections')}</Text>
              <View style={rs.prodRow}>
                <Text style={rs.prodRowLabel}>{t('finance.home.reports.production.totalSales')}</Text>
                <Text style={rs.prodRowAmount}>KES {report.production.collections.totalSalesKes.toLocaleString()}</Text>
              </View>
              <View style={rs.prodRow}>
                <Text style={rs.prodRowLabel}>{t('finance.home.reports.production.paid')}</Text>
                <Text style={[rs.prodRowAmount, { color: '#1A6B3C' }]}>KES {report.production.collections.paidKes.toLocaleString()}</Text>
              </View>
              <View style={rs.prodRow}>
                <Text style={rs.prodRowLabel}>{t('finance.home.reports.production.pending')}</Text>
                <Text style={[rs.prodRowAmount, { color: '#DC2626' }]}>KES {report.production.collections.pendingKes.toLocaleString()}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* Export button */}
      <Pressable
        style={rs.exportBtn}
        accessibilityRole="button"
        disabled={exporting}
        onPress={() => {
          if (!report) {
            // Offline / not yet loaded — fall back to a plain-text share of what we have locally.
            void Share.share({ message: buildShareText(t, label, income, expenses, net, report) });
            return;
          }
          Alert.alert(
            t('finance.home.reports.export'),
            t('finance.home.reports.exportFormatPrompt'),
            [
              {
                text: t('finance.home.reports.exportCsv'),
                onPress: () => void runExport(() => exportReportAsCsv(report, t, label)),
              },
              {
                text: t('finance.home.reports.exportPdf'),
                onPress: () => void runExport(() => exportReportAsPdf(report, t, label)),
              },
              { text: t('common.cancel'), style: 'cancel' },
            ],
          );
        }}
      >
        {exporting ? (
          <ActivityIndicator size="small" color="#1A6B3C" />
        ) : (
          <Text style={rs.exportLabel}>{t('finance.home.reports.export')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const rs = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 11, paddingBottom: 90 },

  periodRow:    { flexDirection: 'row', gap: 6, marginBottom: 12 },
  periodBtn:    {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  periodBtnActive:   { backgroundColor: '#1A6B3C', borderColor: '#1A6B3C' },
  periodLabel:       { fontSize: 9, fontWeight: '600', color: '#6B7280' },
  periodLabelActive: { color: '#fff' },

  plCard: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  plPeriod:    { fontSize: 9, color: '#9CA3AF', marginBottom: 8 },
  plRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  plCol:       { gap: 2 },
  plColRight:  { alignItems: 'flex-end' },
  plColLabel:  { fontSize: 9, color: '#6B7280' },
  plColAmount: { fontSize: 14, fontWeight: '800' },
  plDivider:   { borderTopWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  plNetRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plNetLabel:  { fontSize: 10, fontWeight: '700', color: '#111827' },
  plNetRight:  { alignItems: 'flex-end', gap: 3 },
  plNetAmount: { fontSize: 16, fontWeight: '800' },
  marginPill:  { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  marginPillText: { fontSize: 8, fontWeight: '600' },

  incExpBar: { height: 10, flexDirection: 'row', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
  incBar:    { backgroundColor: '#1A6B3C' },
  expBar:    { backgroundColor: '#DC2626' },
  incExpLegend: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendText:   { fontSize: 9, color: '#6B7280' },

  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#1A6B3C',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 8,
  },

  emptyBox:  { paddingVertical: 20, alignItems: 'center' },
  emptyBody: { fontSize: 11, color: '#6B7280', textAlign: 'center' },

  catToggle:    { flexDirection: 'row', gap: 6, marginBottom: 10 },
  catBtn:       {
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
  },
  catBtnActive:      { backgroundColor: '#1A6B3C', borderColor: '#1A6B3C' },
  catBtnLabel:       { fontSize: 9, fontWeight: '600', color: '#6B7280' },
  catBtnLabelActive: { color: '#fff' },

  breakdownRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 9,
  },
  breakdownLeft:   { flex: 1, marginRight: 10, gap: 3 },
  breakdownLabel:  { fontSize: 10, color: '#374151' },
  breakdownTrack:  { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  breakdownFill:   { height: 5, borderRadius: 3 },
  breakdownRight:  { alignItems: 'flex-end', minWidth: 70 },
  breakdownAmount: { fontSize: 10, fontWeight: '700', color: '#111827' },
  breakdownPct:    { fontSize: 8, color: '#9CA3AF' },

  exportBtn: {
    minHeight: 48, borderWidth: 1.5, borderColor: '#1A6B3C', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  exportLabel: { fontSize: 12, fontWeight: '700', color: '#1A6B3C' },

  productionSubtitle: { fontSize: 9, color: '#9CA3AF', marginTop: -4, marginBottom: 10 },
  retryBtn:  { minHeight: 44, justifyContent: 'center', alignSelf: 'center',
               paddingHorizontal: 20, backgroundColor: '#EAF4EE', borderRadius: 8, marginTop: 8 },
  retryLabel:{ fontSize: 12, color: '#1A6B3C', fontWeight: '600' },

  prodCard:      { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
                   borderRadius: 10, padding: 12, marginBottom: 10 },
  prodCardTitle: { fontSize: 11, fontWeight: '700', color: '#111827', marginBottom: 8 },
  prodRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingVertical: 5, gap: 8 },
  prodRowLabel:  { fontSize: 10, color: '#374151', flex: 1 },
  prodRowSub:    { fontSize: 9, color: '#6B7280' },
  prodRowAmount: { fontSize: 10, fontWeight: '700', color: '#111827' },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#fff' },
  topArea:          { backgroundColor: '#1A6B3C' },
  topBar:           { height: 44, flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between', paddingHorizontal: 12 },
  topBarTitle:      { fontSize: 15, fontWeight: '600', color: '#fff' },
  topBarBtn:        { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  topBarIcon:       { fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 26 },

  subTabs:          { flexDirection: 'row', backgroundColor: '#fff',
                      borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tabItem:          { flex: 1, paddingVertical: 10, alignItems: 'center',
                      borderBottomWidth: 2, borderColor: 'transparent' },
  tabItemActive:    { borderColor: '#1A6B3C' },
  tabLabel:         { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  tabLabelActive:   { color: '#1A6B3C', fontWeight: '600' },

  scroll:           { flex: 1 },
  scrollContent:    { padding: 11, paddingBottom: 90 },

  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:        { fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  retryBtn:         { minHeight: 48, justifyContent: 'center', paddingHorizontal: 20,
                      backgroundColor: '#EAF4EE', borderRadius: 8 },
  retryLabel:       { fontSize: 13, color: '#1A6B3C', fontWeight: '600' },

  // ── Net Banner ────────────────────────────────────────────────────────────
  netBanner:        { backgroundColor: '#1A6B3C', borderRadius: 8, padding: 10, marginBottom: 8 },
  netBannerPeriod:  { fontSize: 9, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  netBannerRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  netBannerRightCol:{ alignItems: 'flex-end' },
  netBannerLabel:   { fontSize: 9, color: '#fff', opacity: 0.8 },
  netBannerAmount:  { fontSize: 16, fontWeight: '800', color: '#fff' },
  alignRight:       { textAlign: 'right' },
  netDivider:       { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginVertical: 6 },
  netBannerNet:     { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  vsPill:           { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
                      borderRadius: 10, paddingVertical: 3, paddingHorizontal: 7 },
  vsPillText:       { fontSize: 9, color: '#fff' },

  // ── Chart ─────────────────────────────────────────────────────────────────
  sectionHeader:    { fontSize: 12, fontWeight: '700', color: '#1A6B3C',
                      textTransform: 'uppercase', letterSpacing: 0.8,
                      marginTop: 10, marginBottom: 5 },
  chartCard:        { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
                      borderRadius: 8, padding: 8, marginBottom: 8 },
  barsRow:          { flexDirection: 'row', alignItems: 'flex-end', gap: 4,
                      height: CHART_H, marginBottom: 5 },
  barCol:           { flex: 1, flexDirection: 'column', gap: 1, justifyContent: 'flex-end' },
  barIncome:        { backgroundColor: '#34D399', borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barExpense:       { backgroundColor: '#F87171', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  weekLabelsRow:    { flexDirection: 'row', gap: 4, marginBottom: 6 },
  weekLabel:        { flex: 1, fontSize: 8, color: '#6B7280', textAlign: 'center' },
  legend:           { flexDirection: 'row', gap: 8 },
  legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:        { width: 7, height: 7, borderRadius: 3.5 },
  legendText:       { fontSize: 8, color: '#6B7280' },

  // ── Transactions ──────────────────────────────────────────────────────────
  txRow:            { flexDirection: 'row', alignItems: 'center', gap: 9,
                      paddingVertical: 8, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  txRowLast:        { borderBottomWidth: 0 },
  txAvatar:         { width: 30, height: 30, borderRadius: 15,
                      alignItems: 'center', justifyContent: 'center' },
  txAvatarIcon:     { fontSize: 13 },
  txInfo:           { flex: 1 },
  txTitle:          { fontSize: 10, fontWeight: '600', color: '#111827' },
  txSub:            { fontSize: 8, color: '#6B7280', marginTop: 1 },
  txAmount:         { fontSize: 10, fontWeight: '700' },

  // ── Loans tab ─────────────────────────────────────────────────────────────
  scoreCard:        { borderRadius: 12, borderWidth: 1.5, padding: 10, marginBottom: 12 },
  scoreTop:         { flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 6 },
  scoreLeft:        { gap: 1 },
  scoreTitleLabel:  { fontSize: 9, color: '#555', fontWeight: '500',
                      textTransform: 'uppercase', letterSpacing: 0.8 },
  scoreNum:         { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  scoreOutOf:       { fontSize: 10, color: '#757575' },
  bandBadge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  bandText:         { color: '#FFF', fontSize: 12, fontWeight: '700' },
  maxLoan:          { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  bars:             { gap: 4, marginBottom: 6 },
  barRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel:         { fontSize: 9, color: '#555', width: 64 },
  barTrack:         { flex: 1, height: 5, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  barFill:          { height: 5, borderRadius: 3 },
  barVal:           { fontSize: 9, fontWeight: '700', width: 20, textAlign: 'right' },
  tapHint:          { fontSize: 9, color: '#888', textAlign: 'right' },
  ctaBtn:           { minHeight: 48, borderRadius: 8, justifyContent: 'center',
                      alignItems: 'center', marginBottom: 20 },
  ctaLabel:         { color: '#FFF', fontSize: 13, fontWeight: '700' },
  loansSectionTitle:{ fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 10 },
  emptyBox:         { paddingVertical: 20, alignItems: 'center' },
  emptyTitle:       { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyBody:        { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  loanRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8,
                      minHeight: 64, borderWidth: 1, borderColor: '#E5E7EB' },
  loanInfo:         { flex: 1, gap: 2 },
  loanName:         { fontSize: 12, fontWeight: '600', color: '#111827' },
  loanPartner:      { fontSize: 10, color: '#6B7280' },
  loanAmt:          { fontSize: 11, fontWeight: '700', color: '#374151' },
  statusPill:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  statusText:       { fontSize: 9, fontWeight: '700' },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab:              { position: 'absolute', bottom: 72, right: 16,
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: '#1A6B3C', alignItems: 'center', justifyContent: 'center',
                      shadowColor: '#1A6B3C', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  fabIcon:          { fontSize: 24, color: '#fff', lineHeight: 28 },
});
