import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CostSummaryCardProps {
  totalCostKes: number;
}

export function CostSummaryCard({ totalCostKes }: CostSummaryCardProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('input.log.totalCost')}</Text>
      <Text style={styles.value}>KES {totalCostKes.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1B5E20',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  label: { fontSize: 14, color: '#A5D6A7', fontWeight: '600' },
  value: { fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
});
