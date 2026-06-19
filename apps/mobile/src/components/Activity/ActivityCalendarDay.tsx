import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Activity, ActivityStatus } from '../../api/activity';

const DOT_COLORS: Record<ActivityStatus, string> = {
  pending:   '#F59E0B',
  completed: '#2E7D32',
  skipped:   '#9E9E9E',
};

interface ActivityCalendarDayProps {
  day: number | null;
  activities: Activity[];
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
}

export function ActivityCalendarDay({ day, activities, isToday, isSelected, onPress }: ActivityCalendarDayProps) {
  if (day === null) {
    return <View style={styles.cell} />;
  }

  const dots = activities.slice(0, 3);

  return (
    <Pressable
      style={[styles.cell, isSelected && styles.cellSelected, isToday && styles.cellToday]}
      onPress={onPress}
    >
      <Text style={[styles.dayNum, isSelected && styles.dayNumSelected]}>{day}</Text>
      <View style={styles.dots}>
        {dots.map((a, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: DOT_COLORS[a.status] }]} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '14.2857%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 2,
  },
  cellSelected: { backgroundColor: '#E8F5E9' },
  cellToday: { borderWidth: 1.5, borderColor: '#2E7D32' },
  dayNum: { fontSize: 14, color: '#1B1B1B' },
  dayNumSelected: { color: '#2E7D32', fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
