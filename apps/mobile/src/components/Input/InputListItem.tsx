import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Input } from '../../api/input';

interface InputListItemProps {
  input: Input;
}

export function InputListItem({ input }: InputListItemProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.item}>
      <View style={styles.row}>
        <Text style={styles.name}>{input.productName}</Text>
        <Text style={styles.cost}>KES {input.totalCostKes.toLocaleString()}</Text>
      </View>
      <Text style={styles.meta}>
        {t(`input.type.${input.type}`)} · {input.quantity} {input.unit}
      </Text>
      <Text style={styles.date}>{input.appliedDate}</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '600', color: '#1B1B1B', flex: 1 },
  cost: { fontSize: 15, fontWeight: '700', color: '#1B5E20' },
  meta: { fontSize: 13, color: '#757575', marginBottom: 2 },
  date: { fontSize: 12, color: '#9E9E9E' },
});
