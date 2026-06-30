import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface MiniAnalyticsProps {
  income: number;
  expenses: number;
  net: number;
  periodKey: string;
  onPressFinance: () => void;
  activitiesTotal: number;
  activitiesDone: number;
  activitiesPending: number;
  activitiesLate: number;
  onPressActivities: () => void;
}

function Bar({ fill, color }: { fill: number; color: string }) {
  const pct = Math.max(0, Math.min(100, fill * 100));
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const bar = StyleSheet.create({
  track: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
  },
  fill: { height: 5, borderRadius: 3 },
});

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function MiniAnalytics({
  income,
  expenses,
  net,
  periodKey,
  onPressFinance,
  activitiesTotal,
  activitiesDone,
  activitiesPending,
  activitiesLate,
  onPressActivities,
}: MiniAnalyticsProps) {
  const { t } = useTranslation();
  const max = Math.max(income, expenses, 1);
  const incomeFill = income / max;
  const expenseFill = expenses / max;
  const netPositive = net >= 0;
  const doneFill = activitiesTotal > 0 ? activitiesDone / activitiesTotal : 0;

  return (
    <View style={s.row}>
      {/* Card 1: Cash flow */}
      <Pressable style={s.card} onPress={onPressFinance} accessibilityRole="button">
        <Text style={s.cardSubLabel}>{t('dashboard.analytics.income')}</Text>
        <Bar fill={incomeFill} color="#1A6B3C" />
        <Text style={s.barValue}>KES {fmt(income)}</Text>

        <Text style={[s.cardSubLabel, { marginTop: 6 }]}>{t('dashboard.analytics.expenses')}</Text>
        <Bar fill={expenseFill} color="#DC2626" />
        <Text style={s.barValue}>KES {fmt(expenses)}</Text>

        <Text style={[s.netLabel, { color: netPositive ? '#1A6B3C' : '#DC2626' }]}>
          {fmt(Math.abs(net))} net {t(periodKey)}
          {netPositive ? ' ↑' : ' ↓'}
        </Text>
      </Pressable>

      {/* Card 2: Activities this month */}
      <Pressable style={s.card} onPress={onPressActivities} accessibilityRole="button">
        <Text style={s.cardSubLabel}>{t('dashboard.analytics.activities')}</Text>

        <Text style={s.activitiesTotal}>{activitiesTotal}</Text>

        <Text style={s.activityBreakdown}>
          {activitiesDone} {t('dashboard.analytics.done')} ·{' '}
          {activitiesPending} {t('dashboard.analytics.pending')} ·{' '}
          {activitiesLate} {t('dashboard.analytics.late')}
        </Text>

        <Bar fill={doneFill} color="#1A6B3C" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
  },
  cardSubLabel: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 3,
  },
  barValue: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  netLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 8,
  },
  activitiesTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A6B3C',
    marginTop: 2,
    marginBottom: 2,
  },
  activityBreakdown: {
    fontSize: 8,
    color: '#6B7280',
    marginBottom: 4,
  },
});
