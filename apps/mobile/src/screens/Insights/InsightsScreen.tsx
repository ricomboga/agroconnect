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
import { predictApi } from '../../api/predict';
import type { MarketSignal, YieldEstimate } from '../../api/predict';

type MarketSignalType = MarketSignal['signal'];
import type { InsightsStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<InsightsStackParamList, 'Insights'>;

const SIGNAL_COLOR: Record<MarketSignalType, string> = {
  sell_now: '#1B5E20',
  hold:     '#E65100',
  buy_now:  '#1565C0',
};
const SIGNAL_BG: Record<MarketSignalType, string> = {
  sell_now: '#E8F5E9',
  hold:     '#FFF3E0',
  buy_now:  '#E3F2FD',
};

export function InsightsScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();

  const signalsQuery = useQuery({
    queryKey: ['predict', 'marketSignals'],
    queryFn: () => predictApi.marketSignals(),
  });

  const yieldQuery = useQuery({
    queryKey: ['predict', 'yield'],
    queryFn: () => predictApi.yield(),
  });

  const pricesQuery = useQuery({
    queryKey: ['predict', 'prices', 'maize', 30],
    queryFn: () => predictApi.prices('maize', 30),
  });

  const signals = signalsQuery.data?.data ?? [];
  const yields = yieldQuery.data?.data ?? [];
  const priceData = pricesQuery.data?.data?.[0];

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
        {signals.map((sig: MarketSignal, idx: number) => (
          <View key={`${sig.crop}-${idx}`} style={s.signalCard}>
            <View style={s.signalTop}>
              <Text style={s.signalCrop}>{sig.crop}</Text>
              <View style={[s.badge, { backgroundColor: SIGNAL_BG[sig.signal] }]}>
                <Text style={[s.badgeText, { color: SIGNAL_COLOR[sig.signal] }]}>
                  {t(`insights.signal.${sig.signal}`)}
                </Text>
              </View>
            </View>
            {sig.rationale ? (
              <Text style={s.rationale}>{sig.rationale}</Text>
            ) : null}
          </View>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 16 }]}>{t('insights.yield')}</Text>
        {yieldQuery.isLoading && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginBottom: 12 }} />
        )}
        {!yieldQuery.isLoading && yields.length === 0 && (
          <View style={s.emptyBox}><Text style={s.emptyText}>{t('insights.empty')}</Text></View>
        )}
        {yields.map((est: YieldEstimate, idx: number) => (
          <View key={`${est.crop}-${idx}`} style={s.yieldCard}>
            <Text style={s.yieldCrop}>{est.crop}</Text>
            <View style={s.yieldStats}>
              <View style={s.yieldStat}>
                <Text style={s.yieldStatVal}>{est.estimatedYieldKg} kg</Text>
                <Text style={s.yieldStatLabel}>Yield</Text>
              </View>
              <View style={s.yieldStat}>
                <Text style={s.yieldStatVal}>KES {est.estimatedRevenueKes?.toLocaleString()}</Text>
                <Text style={s.yieldStatLabel}>Revenue</Text>
              </View>
            </View>
            {est.harvestWindowEnd ? (
              <Text style={s.harvestWindow}>{est.harvestWindowStart} – {est.harvestWindowEnd}</Text>
            ) : null}
          </View>
        ))}

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
            <Text style={s.priceSummary}>{priceData.trend} · {priceData.changePercent > 0 ? '+' : ''}{priceData.changePercent}%</Text>
            {priceData.currentPriceKes !== undefined && (
              <Text style={s.priceValue}>KES {priceData.currentPriceKes.toLocaleString()} / kg</Text>
            )}
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
  signalCrop:  { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  rationale:   { fontSize: 13, color: '#555' },

  yieldCard:      { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', padding: 14, marginBottom: 10, gap: 8 },
  yieldCrop:      { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  yieldStats:     { flexDirection: 'row', gap: 16 },
  yieldStat:      { gap: 2 },
  yieldStatVal:   { fontSize: 14, fontWeight: '700', color: '#1B5E20' },
  yieldStatLabel: { fontSize: 11, color: '#757575' },
  harvestWindow:  { fontSize: 12, color: '#555' },

  priceCard:    { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', padding: 14, gap: 6 },
  priceCrop:    { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  priceSummary: { fontSize: 13, color: '#555' },
  priceValue:   { fontSize: 15, fontWeight: '700', color: '#1565C0' },
});
