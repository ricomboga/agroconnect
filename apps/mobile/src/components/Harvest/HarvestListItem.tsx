import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Harvest } from '../../api/harvest';

interface HarvestListItemProps {
  harvest: Harvest;
}

export function HarvestListItem({ harvest }: HarvestListItemProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <Text style={styles.crop}>{harvest.crop}</Text>
        {harvest.qualityGrade && (
          <View style={styles.grade}>
            <Text style={styles.gradeText}>{t(`harvest.form.grade.${harvest.qualityGrade}`)}</Text>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <Text style={styles.meta}>{harvest.quantityKg} kg</Text>
        {harvest.totalRevenueKes !== null && (
          <Text style={styles.revenue}>KES {harvest.totalRevenueKes.toLocaleString()}</Text>
        )}
      </View>
      <Text style={styles.date}>{harvest.harvestDate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 48,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  crop: { fontSize: 16, fontWeight: '700', color: '#1B1B1B' },
  grade: { backgroundColor: '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  gradeText: { fontSize: 12, color: '#1565C0', fontWeight: '700' },
  meta: { fontSize: 14, color: '#555555' },
  revenue: { fontSize: 15, fontWeight: '700', color: '#1B5E20' },
  date: { fontSize: 12, color: '#9E9E9E' },
});
