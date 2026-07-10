import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { predictApi, type MarketSignal, type PriceTrend } from '../../api/predict';
import { useFarmStore } from '../../store/farm.store';
import type { InsightsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InsightsStackParamList, 'Insights'>;

const DEFAULT_PRICE_CROP = 'maize';

const TREND_COLOR: Record<PriceTrend, string> = {
  rising:  '#1B5E20',
  falling: '#B71C1C',
  stable:  '#616161',
};
const TREND_BG: Record<PriceTrend, string> = {
  rising:  '#E8F5E9',
  falling: '#FFEBEE',
  stable:  '#F5F5F5',
};

export function InsightsScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();
  const activeFarmId = useFarmStore((s) => s.activeFarmId);

  const signalsQuery = useQuery({
    queryKey: ['predict', 'marketSignals'],
    queryFn: () => predictApi.marketSignals(),
  });

  const yieldQuery = useQuery({
    queryKey: ['predict', 'yield', activeFarmId],
    queryFn: () => predictApi.yieldEstimate(activeFarmId as string),
    enabled: !!activeFarmId,
    retry: false,
  });

  const pricesQuery = useQuery({
    queryKey: ['predict', 'prices', DEFAULT_PRICE_CROP],
    queryFn: () => predictApi.priceForecast(DEFAULT_PRICE_CROP, 30),
    retry: false,
  });

  const signals: MarketSignal[] = signalsQuery.data?.signals ?? [];
  const yieldEst = yieldQuery.data;
  const priceData = pricesQuery.data;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.header}>{t('insights.title')}</Text>

        <Text style={s.sectionTitle}>{t('insights.signals')}</Text>
        {signalsQuery.isLoading && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginBottom: 12 }} />
        )}
        {!signalsQuery.isLoading && signals.length === 0 && (
          <View style={s.emptyBox}><Text style={s.emptyText}>{t('insights.empty')}</Text></View>
        )}
        {signals.map((sig) => (
          <View key={sig.crop} style={s.signalCard}>
            <View style={s.signalTop}>
              <Text style={s.signalCrop}>{sig.crop}</Text>
              <View style={[s.badge, { backgroundColor: TREND_BG[sig.signal] }]}>
                <Text style={[s.badgeText, { color: TREND_COLOR[sig.signal] }]}>
                  {t(`insights.trend.${sig.signal}`)}
                </Text>
              </View>
            </View>
            <Text style={s.rationale}>
              {sig.change_pct > 0 ? '+' : ''}{sig.change_pct}% {t('insights.vsLastMonth')}
            </Text>
          </View>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 16 }]}>{t('insights.yield')}</Text>
        {!activeFarmId && (
          <View style={s.emptyBox}><Text style={s.emptyText}>{t('insights.noFarm')}</Text></View>
        )}
        {activeFarmId && yieldQuery.isLoading && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginBottom: 12 }} />
        )}
        {activeFarmId && !yieldQuery.isLoading && !yieldEst && (
          <View style={s.emptyBox}><Text style={s.emptyText}>{t('insights.empty')}</Text></View>
        )}
        {yieldEst && (
          <View style={s.yieldCard}>
            <Text style={s.yieldCrop}>{yieldEst.crop}</Text>
            <View style={s.yieldStats}>
              <View style={s.yieldStat}>
                <Text style={s.yieldStatVal}>{yieldEst.estimated_yield_kg.toLocaleString()} kg</Text>
                <Text style={s.yieldStatLabel}>{t('insights.yieldLabel')}</Text>
              </View>
              <View style={s.yieldStat}>
                <Text style={s.yieldStatVal}>{yieldEst.farm_area_acres}</Text>
                <Text style={s.yieldStatLabel}>{t('insights.acresLabel')}</Text>
              </View>
            </View>
            <Text style={s.harvestWindow}>
              {t('insights.basedOnSeasons', { count: yieldEst.based_on_seasons })}
            </Text>
          </View>
        )}

        <Text style={[s.sectionTitle, { marginTop: 16 }]}>{t('insights.prices')}</Text>
        {pricesQuery.isLoading && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginBottom: 12 }} />
        )}
        {!pricesQuery.isLoading && !priceData && (
          <View style={s.emptyBox}><Text style={s.emptyText}>{t('insights.empty')}</Text></View>
        )}
        {priceData && (
          <View style={s.priceCard}>
            <Text style={s.priceCrop}>{priceData.crop}</Text>
            <Text style={s.priceSummary}>
              {t(`insights.trend.${priceData.trend}`)} · {t('insights.forecastIn', { days: priceData.days_ahead })}
            </Text>
            <Text style={s.priceValue}>KES {priceData.current_price_kes.toLocaleString()} / kg</Text>
            <Text style={s.priceForecast}>
              {t('insights.forecastValue', { price: priceData.predicted_price_kes.toLocaleString() })}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#FAFAFA' },
  scroll:       { padding: 16, paddingBottom: 32 },
  header:       { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  emptyBox:  { paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#757575' },

  signalCard:  { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', padding: 14, marginBottom: 10, gap: 6 },
  signalTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  signalCrop:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize' },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  rationale:   { fontSize: 13, color: '#555' },

  yieldCard:      { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', padding: 14, marginBottom: 10, gap: 8 },
  yieldCrop:      { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize' },
  yieldStats:     { flexDirection: 'row', gap: 16 },
  yieldStat:      { gap: 2 },
  yieldStatVal:   { fontSize: 14, fontWeight: '700', color: '#1B5E20' },
  yieldStatLabel: { fontSize: 11, color: '#757575' },
  harvestWindow:  { fontSize: 12, color: '#555' },

  priceCard:     { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', padding: 14, gap: 6 },
  priceCrop:     { fontSize: 15, fontWeight: '700', color: '#1A1A1A', textTransform: 'capitalize' },
  priceSummary:  { fontSize: 13, color: '#555' },
  priceValue:    { fontSize: 15, fontWeight: '700', color: '#1565C0' },
  priceForecast: { fontSize: 12, color: '#757575' },
});
