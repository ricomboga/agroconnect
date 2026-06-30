import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { farmApi } from '../../api/farm';
import type { Farm } from '../../api/farm';
import { useAuthStore } from '../../stores/authStore';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'FarmSummaryExport'>;

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1';

const CURRENT_YEAR = new Date().getFullYear();
const SEASONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR];

export function FarmSummaryExportScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const token = useAuthStore.getState().token;
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [downloading, setDownloading] = useState(false);

  const farmsQuery = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmApi.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const farms = farmsQuery.data?.data ?? [];
  const activeFarmId = selectedFarmId ?? farms[0]?.id ?? null;
  const activeFarm = farms.find((f: Farm) => f.id === activeFarmId);

  const summaryQuery = useQuery({
    queryKey: ['farmSummary', activeFarmId, selectedYear],
    queryFn: () =>
      farmApi.summary(activeFarmId!, {
        fromDate: `${selectedYear}-01-01`,
        toDate: `${selectedYear}-12-31`,
      }),
    enabled: !!activeFarmId,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const handleDownload = async () => {
    if (!activeFarmId) return;
    setDownloading(true);
    try {
      const url = `${BASE_URL}/farms/${activeFarmId}/report?season=${selectedYear}&token=${token ?? ''}`;
      await Linking.openURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (farmsQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('profile.export.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  if (farmsQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('profile.export.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => farmsQuery.refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (farms.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('profile.export.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.emptyTitle}>{t('profile.export.empty.title')}</Text>
          <Text style={s.emptyBody}>{t('profile.export.empty.body')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summary = summaryQuery.data?.data;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('profile.export.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Farm selector */}
        <Text style={s.fieldLabel}>{t('profile.export.selectFarm')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {farms.map((farm: Farm) => {
            const active = farm.id === activeFarmId;
            return (
              <Pressable
                key={farm.id}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setSelectedFarmId(farm.id)}
                accessibilityRole="button"
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{farm.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Season selector */}
        <Text style={s.fieldLabel}>{t('profile.export.selectSeason')}</Text>
        <View style={s.seasonRow}>
          {SEASONS.map((year) => {
            const active = year === selectedYear;
            return (
              <Pressable
                key={year}
                style={[s.seasonBtn, active && s.seasonBtnActive]}
                onPress={() => setSelectedYear(year)}
                accessibilityRole="button"
              >
                <Text style={[s.seasonBtnText, active && s.seasonBtnTextActive]}>
                  {year}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Preview card */}
        {summaryQuery.isLoading && (
          <View style={s.previewCard}>
            <ActivityIndicator size="small" color="#2E7D32" />
          </View>
        )}

        {summary && activeFarm && (
          <View style={s.previewCard}>
            <Text style={s.previewTitle}>
              {t('profile.export.previewTitle', { name: activeFarm.name })}
            </Text>
            <Text style={s.previewSeason}>
              {t('profile.export.previewSeason', { year: selectedYear })}
            </Text>

            <View style={s.divider} />

            <View style={s.statRow}>
              <Text style={s.statLabel}>{t('profile.export.yield')}</Text>
              <Text style={s.statValue}>{summary.totalYieldKg.toLocaleString()} kg</Text>
            </View>
            <View style={s.statRow}>
              <Text style={s.statLabel}>{t('profile.export.revenue')}</Text>
              <Text style={[s.statValue, { color: '#2E7D32' }]}>
                KES {summary.totalRevenueKes.toLocaleString()}
              </Text>
            </View>
            <View style={s.statRow}>
              <Text style={s.statLabel}>{t('profile.export.costs')}</Text>
              <Text style={[s.statValue, { color: '#E65100' }]}>
                KES {summary.totalCostsKes.toLocaleString()}
              </Text>
            </View>
            <View style={[s.statRow, { marginBottom: 0 }]}>
              <Text style={[s.statLabel, { fontWeight: '700' }]}>{t('profile.export.profit')}</Text>
              <Text style={[s.statValue, { fontWeight: '800', color: summary.profitEstimateKes >= 0 ? '#1B5E20' : '#B71C1C' }]}>
                KES {summary.profitEstimateKes.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {!summaryQuery.isLoading && !summary && activeFarmId && (
          <View style={s.previewCard}>
            <Text style={s.emptyTitle}>{t('common.error.loadFailed')}</Text>
          </View>
        )}

        <Pressable
          style={[s.downloadBtn, (!activeFarmId || downloading) && s.downloadBtnDisabled]}
          onPress={() => void handleDownload()}
          disabled={!activeFarmId || downloading}
          accessibilityRole="button"
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.downloadBtnLabel}>{t('profile.export.download')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#FAFAFA' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:            { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:          { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:           { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:             { padding: 16, paddingBottom: 48 },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },

  chipRow:            { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip:               { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#DDDDDD', backgroundColor: '#FFF', minHeight: 44, justifyContent: 'center' },
  chipActive:         { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText:           { fontSize: 14, color: '#555', fontWeight: '500' },
  chipTextActive:     { color: '#FFF', fontWeight: '700' },

  seasonRow:          { flexDirection: 'row', gap: 10 },
  seasonBtn:          { flex: 1, minHeight: 52, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  seasonBtnActive:    { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  seasonBtnText:      { fontSize: 16, fontWeight: '600', color: '#555' },
  seasonBtnTextActive:{ color: '#2E7D32', fontWeight: '800' },

  previewCard:        { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE', padding: 16, marginTop: 16, marginBottom: 8, minHeight: 80, justifyContent: 'center', alignItems: 'center' },
  previewTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2, alignSelf: 'flex-start' },
  previewSeason:      { fontSize: 13, color: '#757575', marginBottom: 12, alignSelf: 'flex-start' },
  divider:            { width: '100%', height: 1, backgroundColor: '#EEEEEE', marginBottom: 12 },
  statRow:            { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  statLabel:          { fontSize: 14, color: '#555' },
  statValue:          { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  emptyTitle:         { fontSize: 15, fontWeight: '600', color: '#424242', marginBottom: 4 },
  emptyBody:          { fontSize: 13, color: '#757575', textAlign: 'center' },

  errorText:          { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:           { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel:         { fontSize: 15, color: '#2E7D32', fontWeight: '600' },

  downloadBtn:        { minHeight: 52, backgroundColor: '#2E7D32', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  downloadBtnDisabled:{ backgroundColor: '#A5D6A7' },
  downloadBtnLabel:   { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
