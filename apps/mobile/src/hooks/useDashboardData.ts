import { useQuery } from '@tanstack/react-query';
import { farmApi, type Farm } from '../api/farm';
import { activityApi, type Activity } from '../api/activity';
import { financeApi, type LoanApplication, type Transaction } from '../api/finance';
import { predictApi, type MarketSignal } from '../api/predict';
import { useOfflineSync } from './useOfflineSync';
import type { MonthBar } from '../components/Dashboard/FinanceSnapshotCard';

export interface TopPriceAlert {
  crop: string;
  priceKes: number;
  changePct: number;
  direction: 'up' | 'down';
}

export interface DashboardData {
  hasData: boolean;
  farmCount: number;
  primaryFarm: Farm | undefined;
  overdueTasks: Activity[];
  upcomingTasks: Activity[];
  streak: number;
  bestStreak: number;
  activitiesTotal: number;
  activitiesDone: number;
  activitiesPending: number;
  activitiesLate: number;
  cashFlowIncome: number;
  cashFlowExpenses: number;
  cashFlowNet: number;
  monthBars: MonthBar[];
  creditScore: number;
  creditBand: string;
  maxLoanKes: number;
  loanBalance: number;
  loanNextDue: string | null;
  topPriceAlert: TopPriceAlert | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function computeStreak(activities: Activity[]): { current: number; best: number } {
  const doneDays = new Set(
    activities
      .filter((a) => a.status === 'completed' && a.completedDate != null)
      .map((a) => a.completedDate!.slice(0, 10)),
  );

  const sorted = [...doneDays].sort();
  let current = 0;
  let best = 0;
  let run = 0;

  const today = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const prev = i === 0 ? null : sorted[i - 1];
    if (prev === null) {
      run = 1;
    } else {
      const gap =
        (new Date(sorted[i]!).getTime() - new Date(prev).getTime()) /
        (1000 * 60 * 60 * 24);
      run = gap === 1 ? run + 1 : 1;
    }
    if (run > best) best = run;
  }

  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  current = doneDays.has(todayStr) || doneDays.has(yesterdayStr) ? run : 0;

  return { current, best };
}

export function useDashboardData(): DashboardData {
  const { isOnline } = useOfflineSync();
  const staleMs = isOnline ? 5 * 60 * 1000 : Infinity;

  const farmsQ = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmApi.list({ pageSize: 10 }),
    staleTime: staleMs,
  });

  const farms: Farm[] = farmsQ.data?.data ?? [];
  const primaryFarm = farms.find((f: Farm) => f.status === 'active') ?? farms[0];
  const hasData = farms.length > 0;
  const farmId = primaryFarm?.id;

  const overdueQ = useQuery({
    queryKey: ['activities', farmId, 'overdue'],
    queryFn: () => activityApi.list(farmId!, { status: 'pending', pageSize: 10 }),
    enabled: !!farmId,
    staleTime: staleMs,
  });

  const upcomingQ = useQuery({
    queryKey: ['activities', farmId, 'upcoming'],
    queryFn: () => activityApi.list(farmId!, { pageSize: 5 }),
    enabled: !!farmId,
    staleTime: staleMs,
  });

  const allActivitiesQ = useQuery({
    queryKey: ['activities', farmId, 'streak'],
    queryFn: () => activityApi.list(farmId!, { pageSize: 100 }),
    enabled: !!farmId,
    staleTime: staleMs,
  });

  const creditQ = useQuery({
    queryKey: ['creditScore'],
    queryFn: () => financeApi.creditScore.get(),
    enabled: hasData,
    staleTime: staleMs,
  });

  const loansQ = useQuery({
    queryKey: ['loans'],
    queryFn: () => financeApi.loans.list(),
    enabled: hasData,
    staleTime: staleMs,
  });

  const marketSignalsQ = useQuery({
    queryKey: ['predict', 'marketSignals'],
    queryFn: () => predictApi.marketSignals(),
    enabled: hasData,
    staleTime: staleMs,
  });

  const topSignal = (marketSignalsQ.data?.signals ?? [])
    .filter((sig: MarketSignal) => sig.signal !== 'stable')
    .sort((a: MarketSignal, b: MarketSignal) => Math.abs(b.change_pct) - Math.abs(a.change_pct))[0];

  const topSignalPriceQ = useQuery({
    queryKey: ['predict', 'prices', topSignal?.crop],
    queryFn: () => predictApi.priceForecast(topSignal!.crop, 30),
    enabled: !!topSignal,
    staleTime: staleMs,
    retry: false,
  });

  const transactionsQ = useQuery({
    queryKey: ['transactions'],
    queryFn: () => financeApi.transactions.list(),
    enabled: hasData,
    staleTime: staleMs,
  });

  const allActivities = allActivitiesQ.data?.data ?? [];
  const { current: streak, best: bestStreak } = computeStreak(allActivities);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const monthActivities = allActivities.filter((a: Activity) => a.scheduledDate?.startsWith(thisMonth));
  const activitiesDone = monthActivities.filter((a: Activity) => a.status === 'completed').length;
  const activitiesLate = monthActivities.filter((a: Activity) => a.status === 'pending' && a.scheduledDate != null && a.scheduledDate < today).length;
  const activitiesPending = monthActivities.filter((a: Activity) => a.status === 'pending' && a.scheduledDate != null && a.scheduledDate >= today).length;
  const activitiesTotal = monthActivities.length;

  const overdueTasks: Activity[] = (overdueQ.data?.data ?? []).filter(
    (a: Activity) => a.scheduledDate != null && a.scheduledDate < today && a.status === 'pending',
  );
  const upcomingTasks: Activity[] = (upcomingQ.data?.data ?? []).filter(
    (a: Activity) => a.scheduledDate != null && a.scheduledDate >= today,
  );

  const credit = creditQ.data?.data;
  const activeLoan: LoanApplication | undefined = (loansQ.data?.data ?? []).find(
    (l: LoanApplication) => l.status === 'disbursed',
  );

  const loanBalance =
    activeLoan
      ? activeLoan.approvedAmountKes ?? activeLoan.amountRequestedKes
      : 0;
  const loanNextDue: string | null = activeLoan?.disbursedAt
    ? (() => {
        const d = new Date(activeLoan.disbursedAt);
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })()
    : null;

  const topPriceAlert: TopPriceAlert | null =
    topSignal && topSignalPriceQ.data
      ? {
          crop: topSignal.crop,
          priceKes: topSignalPriceQ.data.current_price_kes,
          changePct: Math.round(topSignal.change_pct),
          direction: topSignal.signal === 'rising' ? 'up' : 'down',
        }
      : null;

  const isLoading =
    farmsQ.isLoading ||
    (hasData && (overdueQ.isLoading || upcomingQ.isLoading));

  const isError = farmsQ.isError;

  const refetch = () => {
    void farmsQ.refetch();
    if (farmId) {
      void overdueQ.refetch();
      void upcomingQ.refetch();
      void allActivitiesQ.refetch();
    }
    if (hasData) {
      void creditQ.refetch();
      void loansQ.refetch();
      void marketSignalsQ.refetch();
      void transactionsQ.refetch();
    }
  };

  // Compute cashflow from transactions
  const transactions: Transaction[] = transactionsQ.data?.data ?? [];
  const thisMonthStr = today.slice(0, 7);
  const monthTxs = transactions.filter((tx: Transaction) => tx.date.startsWith(thisMonthStr));
  const cashFlowIncome = monthTxs
    .filter((tx: Transaction) => tx.type === 'income')
    .reduce((sum: number, tx: Transaction) => sum + tx.amountKes, 0);
  const cashFlowExpenses = monthTxs
    .filter((tx: Transaction) => tx.type === 'expense')
    .reduce((sum: number, tx: Transaction) => sum + tx.amountKes, 0);
  const cashFlowNet = cashFlowIncome - cashFlowExpenses;

  // Last 6 months for the bar chart
  const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthBars: MonthBar[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const key = d.toISOString().slice(0, 7);
    const monthName = SHORT_MONTHS[d.getMonth()] ?? '';
    const mTxs = transactions.filter((tx: Transaction) => tx.date.startsWith(key));
    const income = mTxs.filter((tx: Transaction) => tx.type === 'income').reduce((s: number, tx: Transaction) => s + tx.amountKes, 0);
    const expense = mTxs.filter((tx: Transaction) => tx.type === 'expense').reduce((s: number, tx: Transaction) => s + tx.amountKes, 0);
    return { month: monthName, income, expense };
  });

  return {
    hasData,
    farmCount: farms.length,
    primaryFarm,
    overdueTasks,
    upcomingTasks,
    streak,
    bestStreak,
    activitiesTotal,
    activitiesDone,
    activitiesPending,
    activitiesLate,
    cashFlowIncome,
    cashFlowExpenses,
    cashFlowNet,
    monthBars,
    creditScore: credit?.score ?? 0,
    creditBand: credit?.band ?? '—',
    maxLoanKes: credit?.maxLoanKes ?? 0,
    loanBalance,
    loanNextDue,
    topPriceAlert,
    isLoading,
    isError,
    refetch,
  };
}
