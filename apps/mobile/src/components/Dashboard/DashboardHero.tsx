import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { weatherApi } from '../../api/weather';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface DashboardHeroProps {
  farmerName: string;
  county: string;
  farmLat?: number | null;
  farmLng?: number | null;
  netCashFlow: number;
  creditScore: number;
  farmCount: number;
  onWeatherPress: () => void;
}

const COUNTY_COORDS: Record<string, [number, number]> = {
  Nakuru: [-0.3031, 36.08],
  Nairobi: [-1.286, 36.817],
  Meru: [0.046, 37.649],
  'Uasin Gishu': [0.521, 35.269],
};
const DEFAULT_COORDS: [number, number] = [-1.286, 36.817];

function resolveCoords(
  lat?: number | null,
  lng?: number | null,
  county?: string,
): [number, number] {
  if (lat != null && lng != null) return [lat, lng];
  return COUNTY_COORDS[county ?? ''] ?? DEFAULT_COORDS;
}

const CONDITION_ICON: Record<string, string> = {
  clear: '☀️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
};

function fmtCash(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${prefix}KES ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}KES ${(abs / 1_000).toFixed(1)}K`;
  return `${prefix}KES ${abs}`;
}

export function DashboardHero({
  farmerName,
  county,
  farmLat,
  farmLng,
  netCashFlow,
  creditScore,
  farmCount,
  onWeatherPress,
}: DashboardHeroProps) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [lat, lng] = resolveCoords(farmLat, farmLng, county);

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weatherForecast', lat, lng],
    queryFn: () => weatherApi.forecast(lat, lng),
    staleTime: isOnline ? 30 * 60 * 1000 : Infinity,
    retry: 1,
  });

  const today = weatherData?.data?.[0];
  const weatherIcon = today ? (CONDITION_ICON[today.condition] ?? '🌤️') : '🌤️';

  return (
    <LinearGradient
      colors={['#0D4A28', '#1A6B3C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.container}
    >
      {/* Row 1: greeting + weather */}
      <View style={s.topRow}>
        <View style={s.greetingBlock}>
          <Text style={s.greetingLabel}>{t('dashboard.greetingTime')}</Text>
          <Text style={s.greetingName}>{farmerName} 👋</Text>
        </View>

        <Pressable
          onPress={onWeatherPress}
          style={s.weatherPill}
          accessibilityRole="button"
        >
          {weatherLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : today ? (
            <>
              <Text style={s.weatherIcon}>{weatherIcon}</Text>
              <Text style={s.weatherText}>
                {today.tempHighC}°C · {county}
              </Text>
            </>
          ) : (
            <Text style={s.weatherText}>— · {county}</Text>
          )}
        </Pressable>
      </View>

      {/* Row 2: 3 stat pills */}
      <View style={s.pillsRow}>
        <View style={s.pill}>
          <Text style={s.pillValue}>{fmtCash(netCashFlow)}</Text>
          <Text style={s.pillLabel}>{t('dashboard.stat.netThisMonth')}</Text>
        </View>

        <View style={s.pill}>
          <Text style={s.pillValue}>{creditScore}</Text>
          <Text style={s.pillLabel}>{t('dashboard.stat.creditScore')}</Text>
        </View>

        <View style={s.pill}>
          <Text style={s.pillValue}>{farmCount}</Text>
          <Text style={s.pillLabel}>{t('dashboard.stat.activeFarms')}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  greetingBlock: { flex: 1 },
  greetingLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  greetingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14,116,144,0.55)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  weatherIcon: { fontSize: 19 },
  weatherText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  pill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  pillValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  pillLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 1,
  },
});
