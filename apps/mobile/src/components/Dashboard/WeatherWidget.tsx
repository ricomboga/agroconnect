import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { weatherApi } from '../../api/weather';
import type { WeatherCondition, WeatherDay } from '../../api/weather';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface WeatherWidgetProps {
  lat: number;
  lng: number;
  county: string;
  onPress: () => void;
}

const CONDITION_ICON: Record<WeatherCondition, string> = {
  clear: '☀️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
};

const CONDITION_BG: Record<WeatherCondition, string> = {
  clear: '#FEF9C3',
  partly_cloudy: '#EFF6FF',
  cloudy: '#F3F4F6',
  rainy: '#EFF6FF',
  stormy: '#FEF2F2',
};

const CONDITION_ACCENT: Record<WeatherCondition, string> = {
  clear: '#D97706',
  partly_cloudy: '#3B82F6',
  cloudy: '#6B7280',
  rainy: '#2563EB',
  stormy: '#7C3AED',
};

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DayPill({ day, isToday }: { day: WeatherDay; isToday: boolean }) {
  const date = new Date(day.date);
  const label = isToday ? 'Today' : SHORT_DAY[date.getDay()] ?? '';
  const accent = CONDITION_ACCENT[day.condition];

  return (
    <View style={[pill.container, isToday && { borderColor: accent, borderWidth: 1.5 }]}>
      <Text style={pill.dayLabel}>{label}</Text>
      <Text style={pill.icon}>{CONDITION_ICON[day.condition]}</Text>
      <Text style={[pill.temp, isToday && { color: accent }]}>{day.tempHighC}°</Text>
      <Text style={pill.low}>{day.tempLowC}°</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 52,
    marginRight: 6,
  },
  dayLabel: { fontSize: 8, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  icon: { fontSize: 16, marginBottom: 2 },
  temp: { fontSize: 10, fontWeight: '700', color: '#111827' },
  low: { fontSize: 8, color: '#9CA3AF' },
});

export function WeatherWidget({ lat, lng, county, onPress }: WeatherWidgetProps) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weatherForecast', lat, lng],
    queryFn: () => weatherApi.forecast(lat, lng),
    staleTime: isOnline ? 30 * 60 * 1000 : Infinity,
    enabled: isOnline && !!lat && !!lng,
    retry: false,
  });

  const days: WeatherDay[] = data?.data ?? [];
  const today = days[0];
  const todayBg = today ? CONDITION_BG[today.condition] : '#F9FAFB';
  const todayAccent = today ? CONDITION_ACCENT[today.condition] : '#1A6B3C';

  return (
    <Pressable style={[s.card, { backgroundColor: todayBg }]} onPress={onPress} accessibilityRole="button">
      {/* Header */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.sectionLabel}>{t('dashboard.weather.title')}</Text>
          <Text style={[s.county, { color: todayAccent }]}>{county}</Text>
        </View>
        <Text style={[s.viewMore, { color: todayAccent }]}>{t('dashboard.weather.viewFull')} →</Text>
      </View>

      {isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color={todayAccent} />
          <Text style={s.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : isError ? (
        <View style={s.errorRow}>
          <Text style={s.errorIcon}>⚡</Text>
          <Text style={s.errorText}>{t('dashboard.weather.serviceDown')}</Text>
        </View>
      ) : today ? (
        <>
          {/* Today row: icon + stats */}
          <View style={s.todayRow}>
            <Text style={s.bigIcon}>{CONDITION_ICON[today.condition]}</Text>
            <View style={s.todayStats}>
              <Text style={[s.todayTemp, { color: todayAccent }]}>
                {today.tempHighC}° / {today.tempLowC}°C
              </Text>
              <View style={s.metaRow}>
                <Text style={s.metaItem}>💧 {today.humidityPct}%</Text>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaItem}>🌧 {today.rainChancePct}% {t('dashboard.weather.rain')}</Text>
              </View>
            </View>
          </View>

          {/* 5-day forecast pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.pillsRow}
          >
            {days.slice(0, 6).map((d, i) => (
              <DayPill key={d.date} day={d} isToday={i === 0} />
            ))}
          </ScrollView>
        </>
      ) : (
        <Text style={s.noData}>{t('dashboard.weather.unavailable')}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#111827' },
  county: { fontSize: 9, fontWeight: '500' },
  viewMore: { fontSize: 9, fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  loadingText: { fontSize: 9, color: '#6B7280' },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  bigIcon: { fontSize: 32 },
  todayStats: { flex: 1 },
  todayTemp: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaItem: { fontSize: 9, color: '#374151' },
  metaDot: { fontSize: 9, color: '#9CA3AF' },
  pillsRow: { paddingBottom: 2 },
  noData: { fontSize: 9, color: '#9CA3AF', paddingVertical: 6 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  errorIcon: { fontSize: 14 },
  errorText: { fontSize: 9, color: '#EF4444', flex: 1 },
});
