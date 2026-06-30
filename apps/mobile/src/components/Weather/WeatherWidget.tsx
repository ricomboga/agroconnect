import React from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { weatherApi } from '../../api/weather';
import type { WeatherCondition, WeatherDay } from '../../api/weather';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const COUNTY_COORDS: Record<string, [number, number]> = {
  'Baringo': [-0.638, 36.155], 'Bomet': [-0.787, 35.340], 'Bungoma': [0.565, 34.566],
  'Busia': [0.461, 34.111], 'Elgeyo-Marakwet': [0.882, 35.486], 'Embu': [-0.530, 37.457],
  'Garissa': [-0.454, 39.645], 'Homa Bay': [-0.517, 34.433], 'Isiolo': [0.354, 37.582],
  'Kajiado': [-2.099, 36.776], 'Kakamega': [0.283, 34.752], 'Kericho': [-0.369, 35.284],
  'Kiambu': [-1.031, 36.939], 'Kilifi': [-3.510, 39.908], 'Kirinyaga': [-0.659, 37.380],
  'Kisii': [-0.685, 34.769], 'Kisumu': [-0.092, 34.768], 'Kitui': [-1.366, 38.010],
  'Kwale': [-4.174, 39.452], 'Laikipia': [0.362, 36.781], 'Lamu': [-2.269, 40.902],
  'Machakos': [-1.516, 37.270], 'Makueni': [-1.803, 37.626], 'Mandera': [3.937, 41.855],
  'Marsabit': [2.335, 37.991], 'Meru': [0.046, 37.649], 'Migori': [-1.063, 34.473],
  'Mombasa': [-4.043, 39.668], "Murang'a": [-0.719, 37.152], 'Nairobi': [-1.286, 36.817],
  'Nakuru': [-0.303, 36.080], 'Nandi': [0.183, 35.122], 'Narok': [-1.082, 35.872],
  'Nyamira': [-0.567, 34.932], 'Nyandarua': [-0.183, 36.516], 'Nyeri': [-0.417, 36.950],
  'Samburu': [1.197, 36.711], 'Siaya': [-0.062, 34.288], 'Taita Taveta': [-3.316, 38.475],
  'Tana River': [-1.440, 40.050], 'Tharaka-Nithi': [-0.294, 37.940],
  'Trans Nzoia': [1.003, 35.006], 'Turkana': [3.125, 35.596], 'Uasin Gishu': [0.521, 35.269],
  'Vihiga': [0.013, 34.724], 'Wajir': [1.742, 40.058], 'West Pokot': [1.620, 35.119],
};

const NAIROBI: [number, number] = [-1.286, 36.817];

function resolveCoords(
  lat?: number | null,
  lng?: number | null,
  county?: string | null,
): [number, number] {
  if (lat != null && lng != null) return [lat, lng];
  if (county) return COUNTY_COORDS[county] ?? NAIROBI;
  return NAIROBI;
}

const CONDITION_ICON: Record<WeatherCondition, string> = {
  clear: '☀️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
};

const DAY_LABEL_KEYS = [
  'weather.widget.today',
  'weather.widget.tomorrow',
  'weather.widget.dayAfter',
];

interface WeatherWidgetProps {
  lat?: number | null;
  lng?: number | null;
  county?: string | null;
  onPress: () => void;
}

export function WeatherWidget({ lat, lng, county, onPress }: WeatherWidgetProps) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [resolvedLat, resolvedLng] = resolveCoords(lat, lng, county);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['weatherForecast', resolvedLat, resolvedLng],
    queryFn: () => weatherApi.forecast(resolvedLat, resolvedLng),
    staleTime: isOnline ? 30 * 60 * 1000 : Infinity,
    retry: 1,
  });

  const days = data?.data?.slice(0, 3) ?? [];

  return (
    <Pressable style={s.container} onPress={onPress} accessibilityRole="button">
      <View style={s.header}>
        <Text style={s.title}>{t('weather.widget.title')}</Text>
        <Text style={s.seeMore}>{t('weather.widget.tapDetail')} ›</Text>
      </View>

      {isLoading ? (
        <View style={s.loadingRow}>
          <ActivityIndicator size="small" color="#00838F" />
          <Text style={s.loadingText}>{t('weather.widget.loading')}</Text>
        </View>
      ) : isError || days.length === 0 ? (
        <Text style={s.errorText}>{t('weather.widget.error')}</Text>
      ) : (
        <View style={s.daysRow}>
          {days.map((day: WeatherDay, idx: number) => (
            <View key={day.date} style={[s.dayCard, idx < days.length - 1 && s.dayCardBorder]}>
              <Text style={s.dayLabel}>{t(DAY_LABEL_KEYS[idx] ?? 'weather.widget.today')}</Text>
              <Text style={s.conditionIcon}>{CONDITION_ICON[day.condition]}</Text>
              <Text style={s.tempRange}>
                {t('weather.widget.tempRange', { high: day.tempHighC, low: day.tempLowC })}
              </Text>
              <Text style={s.rainChance}>
                {t('weather.widget.rain', { pct: day.rainChancePct })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#E0F7FA',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#B2EBF2',
  },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title:        { fontSize: 13, fontWeight: '700', color: '#00838F' },
  seeMore:      { fontSize: 12, color: '#00838F' },
  loadingRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  loadingText:  { fontSize: 13, color: '#00838F' },
  errorText:    { fontSize: 13, color: '#B71C1C', paddingVertical: 4 },
  daysRow:      { flexDirection: 'row' },
  dayCard:      { flex: 1, alignItems: 'center', gap: 3 },
  dayCardBorder:{ borderRightWidth: 1, borderRightColor: '#B2EBF2' },
  dayLabel:     { fontSize: 11, fontWeight: '600', color: '#006064', textTransform: 'uppercase' },
  conditionIcon:{ fontSize: 24 },
  tempRange:    { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  rainChance:   { fontSize: 11, color: '#00838F' },
});
