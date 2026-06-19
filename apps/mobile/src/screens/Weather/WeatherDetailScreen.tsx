import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { weatherApi } from '../../api/weather';
import type { WeatherCondition, WeatherAlert } from '../../api/weather';
import { useOfflineSync } from '../../hooks/useOfflineSync';

type NavParams = {
  lat?: number | null;
  lng?: number | null;
  county?: string | null;
};

interface Props {
  navigation: { goBack: () => void };
  route: { params: NavParams };
}

const COUNTY_COORDS: Record<string, [number, number]> = {
  'Nakuru': [-0.303, 36.080], 'Nairobi': [-1.286, 36.817], 'Kisumu': [-0.092, 34.768],
  'Mombasa': [-4.043, 39.668], 'Kiambu': [-1.031, 36.939], 'Kakamega': [0.283, 34.752],
  'Uasin Gishu': [0.521, 35.269], 'Meru': [0.046, 37.649], 'Nyeri': [-0.417, 36.950],
  'Machakos': [-1.516, 37.270], 'Kericho': [-0.369, 35.284], 'Kirinyaga': [-0.659, 37.380],
};
const NAIROBI: [number, number] = [-1.286, 36.817];

function resolveCoords(params: NavParams): [number, number] {
  if (params.lat != null && params.lng != null) return [params.lat, params.lng];
  if (params.county) return COUNTY_COORDS[params.county] ?? NAIROBI;
  return NAIROBI;
}

const CONDITION_ICON: Record<WeatherCondition, string> = {
  clear: '☀️', partly_cloudy: '⛅', cloudy: '☁️', rainy: '🌧️', stormy: '⛈️',
};

const SEVERITY_COLOR: Record<WeatherAlert['severity'], string> = {
  info: '#1565C0',
  warning: '#E65100',
  danger: '#B71C1C',
};
const SEVERITY_BG: Record<WeatherAlert['severity'], string> = {
  info: '#E3F2FD',
  warning: '#FFF3E0',
  danger: '#FFEBEE',
};

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function WeatherDetailScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [lat, lng] = resolveCoords(route.params ?? {});

  const forecastQuery = useQuery({
    queryKey: ['weatherForecast', lat, lng],
    queryFn: () => weatherApi.forecast(lat, lng),
    staleTime: isOnline ? 30 * 60 * 1000 : Infinity,
  });

  const alertsQuery = useQuery({
    queryKey: ['weatherAlerts'],
    queryFn: () => weatherApi.alerts(),
    staleTime: isOnline ? 10 * 60 * 1000 : Infinity,
  });

  const seasonalQuery = useQuery({
    queryKey: ['weatherSeasonal'],
    queryFn: () => weatherApi.seasonal(),
    staleTime: isOnline ? 60 * 60 * 1000 : Infinity,
  });

  const days = forecastQuery.data?.data ?? [];
  const alerts = alertsQuery.data?.data ?? [];
  const seasonal = seasonalQuery.data?.data;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('weather.detail.title')}</Text>
        <View style={s.backBtn} />
      </View>

      {forecastQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#00838F" /></View>
      ) : forecastQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => forecastQuery.refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {/* Active alerts */}
          {alerts.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('weather.detail.alert.title')}</Text>
              {alerts.map((alert) => (
                <View
                  key={alert.id}
                  style={[s.alertCard, { backgroundColor: SEVERITY_BG[alert.severity], borderColor: SEVERITY_COLOR[alert.severity] }]}
                >
                  <View style={s.alertHeader}>
                    <View style={[s.severityBadge, { backgroundColor: SEVERITY_COLOR[alert.severity] }]}>
                      <Text style={s.severityBadgeText}>
                        {t(`weather.detail.alert.severity.${alert.severity}`)}
                      </Text>
                    </View>
                    <Text style={[s.alertTitle, { color: SEVERITY_COLOR[alert.severity] }]}>
                      {alert.title}
                    </Text>
                  </View>
                  <Text style={s.alertDesc}>{alert.description}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 7-day forecast */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('weather.detail.forecast')}</Text>
            <View style={s.forecastCard}>
              {days.map((day, idx) => {
                const date = new Date(day.date);
                const dayName = idx === 0 ? t('weather.widget.today') : SHORT_DAY[date.getDay()];
                return (
                  <View key={day.date} style={[s.forecastRow, idx < days.length - 1 && s.forecastRowBorder]}>
                    <Text style={s.forecastDay}>{dayName}</Text>
                    <Text style={s.forecastIcon}>{CONDITION_ICON[day.condition]}</Text>
                    <Text style={s.forecastCondition}>{t(`weather.condition.${day.condition}`)}</Text>
                    <View style={s.forecastRight}>
                      <Text style={s.forecastTemp}>{day.tempHighC}° / {day.tempLowC}°</Text>
                      <View style={s.rainBar}>
                        <View style={[s.rainBarFill, { width: `${day.rainChancePct}%` as unknown as number }]} />
                      </View>
                      <Text style={s.rainPct}>💧 {day.rainChancePct}%</Text>
                      <Text style={s.humidityText}>
                        {t('weather.detail.humidity', { pct: day.humidityPct })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Seasonal outlook */}
          {seasonal && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t('weather.detail.seasonal.title')}</Text>
              <View style={s.seasonCard}>
                <Text style={s.seasonName}>{seasonal.season} · {seasonal.county}</Text>
                <View style={s.seasonRow}>
                  <Text style={s.seasonLabel}>{t('weather.detail.seasonal.rainfall')}</Text>
                  <Text style={s.seasonValue}>{seasonal.rainfallOutlook}</Text>
                </View>
                <View style={s.seasonRow}>
                  <Text style={s.seasonLabel}>{t('weather.detail.seasonal.temperature')}</Text>
                  <Text style={s.seasonValue}>{seasonal.temperatureOutlook}</Text>
                </View>
                <View style={s.advisoryBox}>
                  <Text style={s.advisoryLabel}>{t('weather.detail.seasonal.advisory')}</Text>
                  <Text style={s.advisoryText}>{seasonal.farmingAdvisory}</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#FAFAFA' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:          { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:        { fontSize: 15, color: '#00838F', fontWeight: '600' },
  topTitle:         { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  errorText:        { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:         { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#E0F7FA', borderRadius: 8 },
  retryLabel:       { fontSize: 15, color: '#00838F', fontWeight: '600' },

  scroll:           { padding: 16, paddingBottom: 48, gap: 4 },
  section:          { marginBottom: 16 },
  sectionTitle:     { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  alertCard:        { borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  alertHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  severityBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  severityBadgeText:{ fontSize: 11, fontWeight: '700', color: '#FFF' },
  alertTitle:       { fontSize: 14, fontWeight: '700', flex: 1 },
  alertDesc:        { fontSize: 13, color: '#424242', lineHeight: 18 },

  forecastCard:     { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEEEEE', overflow: 'hidden' },
  forecastRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  forecastRowBorder:{ borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  forecastDay:      { width: 50, fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  forecastIcon:     { fontSize: 22 },
  forecastCondition:{ flex: 1, fontSize: 12, color: '#555' },
  forecastRight:    { alignItems: 'flex-end', gap: 2 },
  forecastTemp:     { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  rainBar:          { width: 60, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  rainBarFill:      { height: 4, backgroundColor: '#29B6F6', borderRadius: 2 },
  rainPct:          { fontSize: 11, color: '#0288D1' },
  humidityText:     { fontSize: 11, color: '#9E9E9E' },

  seasonCard:       { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEEEEE', padding: 16 },
  seasonName:       { fontSize: 14, fontWeight: '700', color: '#00838F', marginBottom: 12 },
  seasonRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  seasonLabel:      { fontSize: 13, color: '#555', fontWeight: '600' },
  seasonValue:      { fontSize: 13, color: '#1A1A1A', flex: 1, textAlign: 'right' },
  advisoryBox:      { backgroundColor: '#E0F7FA', borderRadius: 10, padding: 10, marginTop: 8 },
  advisoryLabel:    { fontSize: 12, fontWeight: '700', color: '#006064', marginBottom: 4 },
  advisoryText:     { fontSize: 13, color: '#004D40', lineHeight: 18 },
});
