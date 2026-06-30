import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface PriceAlertBannerProps {
  crop: string;
  currentPrice: number;
  changePercent: number;
  direction: 'up' | 'down';
  onPress: () => void;
}

export function PriceAlertBanner({
  crop,
  currentPrice,
  changePercent,
  direction,
  onPress,
}: PriceAlertBannerProps) {
  const { t } = useTranslation();
  const arrow = direction === 'up' ? '↑' : '↓';
  const pillStyle = direction === 'up' ? s.pillUp : s.pillDown;
  const pillTextStyle = direction === 'up' ? s.pillTextUp : s.pillTextDown;

  return (
    <Pressable
      style={s.container}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={s.left}>
        <Text style={s.trendIcon}>{direction === 'up' ? '📈' : '📉'}</Text>
        <Text style={s.cropText}>
          {t('dashboard.priceAlert.label', {
            crop,
            price: currentPrice,
          })}
        </Text>
      </View>
      <View style={[s.pill, pillStyle]}>
        <Text style={[s.pillText, pillTextStyle]}>
          {arrow}{changePercent}% {t('dashboard.priceAlert.thisWeek')}
        </Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 11,
    marginBottom: 8,
    minHeight: 44,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  trendIcon: { fontSize: 16 },
  cropText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  pill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pillUp: { backgroundColor: '#EAF4EE' },
  pillDown: { backgroundColor: '#FEE2E2' },
  pillText: { fontSize: 8, fontWeight: '600' },
  pillTextUp: { color: '#0D4A28' },
  pillTextDown: { color: '#991B1B' },
});
