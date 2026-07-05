import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

// ── Donut chart (pure View, no SVG) ─────────────────────────────────────────
// Uses the half-disc rotation technique:
// - A right-side clipper (overflow:hidden) holds a H×S rectangle rotating around the pie center
// - A left-side clipper does the same for the 50–100% range
// - A white "hole" View creates the donut ring effect
// The fill fraction is linearly proportional to rotation angle (proved by circular sector geometry).

interface DonutChartProps {
  pct: number;       // 0..1
  size?: number;
  strokeWidth?: number;
  fillColor?: string;
  trackColor?: string;
  label?: string;
  subLabel?: string;
}

function DonutChart({
  pct,
  size = 72,
  strokeWidth = 11,
  fillColor = '#1A6B3C',
  trackColor = '#E5E7EB',
  label,
  subLabel,
}: DonutChartProps) {
  const S = size;
  const H = S / 2;
  const p = Math.max(0, Math.min(1, pct));

  // Right wedge: spans 0–50% fill. Angle goes from –180 (empty) to 0 (half-full).
  const rightAngle = p <= 0.5 ? p * 360 - 180 : 0;
  // Left wedge: spans 50–100% fill. Angle goes from –180 (half-full) to 0 (full).
  const leftAngle = p > 0.5 ? (p - 0.5) * 360 - 180 : -180;
  const holeSize = S - strokeWidth * 2;
  const holeBorderRadius = holeSize / 2;

  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track circle */}
      <View style={{
        position: 'absolute', width: S, height: S,
        borderRadius: H, backgroundColor: trackColor,
        overflow: 'hidden',
      }}>
        {/* Right fill wedge */}
        <View style={{
          position: 'absolute', right: 0, top: 0,
          width: H, height: S, overflow: 'hidden',
        }}>
          <View style={{
            position: 'absolute', right: 0, top: 0,
            width: H, height: S,
            backgroundColor: fillColor,
            transform: [
              { translateX: -H / 2 },
              { rotate: `${rightAngle}deg` },
              { translateX: H / 2 },
            ],
          }} />
        </View>

        {/* Left fill wedge (only rendered when > 50%) */}
        {p > 0.5 && (
          <View style={{
            position: 'absolute', left: 0, top: 0,
            width: H, height: S, overflow: 'hidden',
          }}>
            <View style={{
              position: 'absolute', left: 0, top: 0,
              width: H, height: S,
              backgroundColor: fillColor,
              transform: [
                { translateX: H / 2 },
                { rotate: `${leftAngle}deg` },
                { translateX: -H / 2 },
              ],
            }} />
          </View>
        )}
      </View>

      {/* Donut hole + label */}
      <View style={{
        width: holeSize, height: holeSize,
        borderRadius: holeBorderRadius,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {label != null && (
          <Text style={donut.labelText} numberOfLines={1}>{label}</Text>
        )}
        {subLabel != null && (
          <Text style={donut.subText} numberOfLines={1}>{subLabel}</Text>
        )}
      </View>
    </View>
  );
}

const donut = StyleSheet.create({
  labelText: { fontSize: 10, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subText: { fontSize: 7, color: '#6B7280', textAlign: 'center' },
});

// ── Horizontal bar for the bar chart ────────────────────────────────────────

function HBar({
  fill,
  color,
  value,
  labelKey,
}: {
  fill: number;
  color: string;
  value: string;
  labelKey: string;
}) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, fill * 100));
  return (
    <View style={bar.row}>
      <Text style={bar.label}>{t(labelKey)}</Text>
      <View style={bar.trackOuter}>
        <View style={[bar.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[bar.value, { color }]}>{value}</Text>
    </View>
  );
}

const bar = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  label: { fontSize: 8, color: '#6B7280', width: 52 },
  trackOuter: {
    flex: 1, height: 8, backgroundColor: '#F3F4F6',
    borderRadius: 4, overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4 },
  value: { fontSize: 9, fontWeight: '700', width: 52, textAlign: 'right' },
});

// ── Grouped bar chart (multi-month) ─────────────────────────────────────────

interface MonthBar {
  month: string;   // e.g. "Jan"
  income: number;
  expense: number;
}

function MonthGroupBar({ bar: b, maxVal }: { bar: MonthBar; maxVal: number }) {
  const incomeH = maxVal > 0 ? Math.max(4, (b.income / maxVal) * 56) : 4;
  const expenseH = maxVal > 0 ? Math.max(4, (b.expense / maxVal) * 56) : 4;
  return (
    <View style={mg.col}>
      <View style={mg.barsRow}>
        <View style={[mg.barIncome, { height: incomeH }]} />
        <View style={[mg.barExpense, { height: expenseH }]} />
      </View>
      <Text style={mg.monthLabel}>{b.month}</Text>
    </View>
  );
}

const mg = StyleSheet.create({
  col: { alignItems: 'center', flex: 1 },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    height: 60,
  },
  barIncome: { width: 8, borderRadius: 3, backgroundColor: '#1A6B3C' },
  barExpense: { width: 8, borderRadius: 3, backgroundColor: '#EF4444' },
  monthLabel: { fontSize: 7, color: '#9CA3AF', marginTop: 2 },
});

// ── Main card ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

interface FinanceSnapshotCardProps {
  income: number;
  expenses: number;
  net: number;
  monthBars?: MonthBar[];
  onPress: () => void;
}

export type { MonthBar };

export function FinanceSnapshotCard({
  income,
  expenses,
  net,
  monthBars = [],
  onPress,
}: FinanceSnapshotCardProps) {
  const { t } = useTranslation();
  const max = Math.max(income, expenses, 1);
  const incomeFill = income / max;
  const expenseFill = expenses / max;
  const netPositive = net >= 0;
  const netColor = netPositive ? '#1A6B3C' : '#EF4444';

  // Donut shows income as share of (income + expenses)
  const total = income + expenses;
  const incomePct = total > 0 ? income / total : 0;

  // Bar chart: use monthBars if provided, else current snapshot
  const maxBar = monthBars.length
    ? Math.max(...monthBars.map((b) => Math.max(b.income, b.expense)), 1)
    : 1;

  return (
    <Pressable style={s.card} onPress={onPress} accessibilityRole="button">
      {/* Section header */}
      <View style={s.header}>
        <Text style={s.title}>{t('dashboard.finance.title')}</Text>
        <Text style={s.period}>{t('dashboard.analytics.periodLabel')}</Text>
      </View>

      <View style={s.body}>
        {/* Left: bar chart + net */}
        <View style={s.left}>
          <HBar
            fill={incomeFill}
            color="#1A6B3C"
            value={`KES ${fmt(income)}`}
            labelKey="dashboard.analytics.income"
          />
          <HBar
            fill={expenseFill}
            color="#EF4444"
            value={`KES ${fmt(expenses)}`}
            labelKey="dashboard.analytics.expenses"
          />

          <View style={[s.netRow, { backgroundColor: netPositive ? '#F0FDF4' : '#FEF2F2' }]}>
            <Text style={s.netLabel}>{t('dashboard.analytics.net')}</Text>
            <Text style={[s.netValue, { color: netColor }]}>
              {netPositive ? '+' : '-'}KES {fmt(Math.abs(net))}
            </Text>
          </View>
        </View>

        {/* Right: donut chart */}
        <View style={s.right}>
          <DonutChart
            pct={incomePct}
            size={72}
            strokeWidth={11}
            fillColor="#1A6B3C"
            trackColor="#FEE2E2"
            label={`${Math.round(incomePct * 100)}%`}
            subLabel={t('dashboard.finance.income')}
          />
        </View>
      </View>

      {/* Monthly grouped bar chart (if data provided) */}
      {monthBars.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.chartHeader}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#1A6B3C' }]} />
              <Text style={s.legendText}>{t('dashboard.analytics.income')}</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={s.legendText}>{t('dashboard.analytics.expenses')}</Text>
            </View>
          </View>
          <View style={s.barsContainer}>
            {monthBars.map((b) => (
              <MonthGroupBar key={b.month} bar={b} maxVal={maxBar} />
            ))}
          </View>
        </>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 10, fontWeight: '700', color: '#111827' },
  period: { fontSize: 8, color: '#9CA3AF' },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  left: { flex: 1 },
  right: { alignItems: 'center' },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 4,
  },
  netLabel: { fontSize: 8, color: '#374151', fontWeight: '600' },
  netValue: { fontSize: 10, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  chartHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 8, color: '#6B7280' },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
});
