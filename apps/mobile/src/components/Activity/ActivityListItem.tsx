import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Activity } from '../../api/activity';
import { ActivityStatusChip } from './ActivityStatusChip';

interface ActivityListItemProps {
  activity: Activity;
  onPress?: () => void;
}

export function ActivityListItem({ activity, onPress }: ActivityListItemProps) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.type}>{t(`activity.type.${activity.type}`)}</Text>
        <ActivityStatusChip status={activity.status} />
      </View>
      {activity.description ? (
        <Text style={styles.description} numberOfLines={2}>{activity.description}</Text>
      ) : null}
      <Text style={styles.date}>{activity.plannedDate}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: 48,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  type: { fontSize: 15, fontWeight: '600', color: '#1B1B1B' },
  description: { fontSize: 14, color: '#555555', marginBottom: 4 },
  date: { fontSize: 12, color: '#9E9E9E' },
});
