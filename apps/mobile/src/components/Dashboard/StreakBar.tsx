import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface StreakBarProps {
  current: number;
  best: number;
}

export function StreakBar({ current, best }: StreakBarProps) {
  const { t } = useTranslation();

  if (current === 0) return null;

  return (
    <View style={s.container}>
      <View style={s.left}>
        <Text style={s.fire}>🔥</Text>
        <View>
          <Text style={s.count}>{current}</Text>
          <Text style={s.label}>{t('dashboard.streak.label')}</Text>
        </View>
      </View>
      <Text style={s.best}>
        {t('dashboard.streak.best', { days: best })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 11,
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fire: { fontSize: 20 },
  count: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    lineHeight: 16,
  },
  label: {
    fontSize: 9,
    color: '#B45309',
    lineHeight: 12,
  },
  best: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C9A84C',
  },
});
