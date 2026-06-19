import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ActivityStatus } from '../../api/activity';

interface ActivityStatusChipProps {
  status: ActivityStatus;
}

const CHIP_COLORS: Record<ActivityStatus, { bg: string; text: string }> = {
  pending:   { bg: '#FFF8E1', text: '#F59E0B' },
  completed: { bg: '#E8F5E9', text: '#2E7D32' },
  skipped:   { bg: '#F5F5F5', text: '#757575' },
};

export function ActivityStatusChip({ status }: ActivityStatusChipProps) {
  const { t } = useTranslation();
  const colors = CHIP_COLORS[status];
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{t(`activity.status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
