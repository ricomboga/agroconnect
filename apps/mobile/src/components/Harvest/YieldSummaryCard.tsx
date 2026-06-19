import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface YieldSummaryCardProps {
  totalYieldKg: number;
  totalRevenueKes: number;
}

export function YieldSummaryCard({ totalYieldKg, totalRevenueKes }: YieldSummaryCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <View style={styles.col}>
        <Text style={styles.label}>{t('harvest.log.totalYield')}</Text>
        <Text style={styles.value}>{totalYieldKg.toLocaleString()} kg</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.col}>
        <Text style={styles.label}>{t('harvest.log.totalRevenue')}</Text>
        <Text style={styles.value}>KES {totalRevenueKes.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1B5E20',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  col: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: '#388E3C', marginHorizontal: 12 },
  label: { fontSize: 12, color: '#A5D6A7', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
});
