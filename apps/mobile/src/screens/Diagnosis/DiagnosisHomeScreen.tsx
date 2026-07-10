import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useFarmStore } from '../../store/farm.store';
import { diagnoseApi, type DiagnosisResult } from '../../api/diagnose';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnosisHome'>;

function subjectEmoji(subjectType: string): string {
  return subjectType === 'animal' ? '🐄' : '🌱';
}

export function DiagnosisHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const activeFarmId = useFarmStore((s) => s.activeFarmId);

  const historyQuery = useQuery({
    queryKey: ['diagnose', 'history', activeFarmId],
    queryFn: () => diagnoseApi.listByFarm(activeFarmId as string),
    enabled: !!activeFarmId,
  });
  const history: DiagnosisResult[] = historyQuery.data?.data ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      {/* TopBar */}
      <View style={s.topBar}>
        <Text style={s.topBarTitle}>{t('diagnose.home.title')}</Text>
      </View>

      {!isOnline && (
        <View style={s.offlineBanner}>
          <Text style={s.offlineText}>{t('ussd.banner.text')}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 11 }}>

        {/* Info alert — blue */}
        <View style={s.infoAlert}>
          <Text style={s.infoAlertText}>{t('diagnose.home.infoAlert')}</Text>
        </View>

        <Text style={s.sectionHeader}>{t('diagnose.home.sectionAsk')}</Text>

        {/* Mode 1 — Type a Question (active/selected style) */}
        <Pressable
          style={[s.modeCard, s.modeActive]}
          onPress={() => navigation.navigate('DiagnosisInput', { mode: 'text' })}
          accessibilityRole="button"
        >
          <Text style={s.modeIcon}>💬</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.modeTitleGreen}>{t('diagnose.home.mode.text')}</Text>
            <Text style={s.modeSub}>{t('diagnose.home.mode.textSub')}</Text>
          </View>
          <Text style={s.arrowGreen}>→</Text>
        </Pressable>

        {/* Mode 2 — Upload Photos (default style) */}
        <Pressable
          style={[s.modeCard, s.modeDefault]}
          onPress={() => navigation.navigate('DiagnosisInput', { mode: 'photo' })}
          accessibilityRole="button"
        >
          <Text style={s.modeIcon}>📷</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.modeTitleInk}>{t('diagnose.home.mode.photo')}</Text>
            <Text style={s.modeSub}>{t('diagnose.home.mode.photoSub')}</Text>
          </View>
          <Text style={s.arrowMuted}>→</Text>
        </Pressable>

        {/* Mode 3 — Question + Photos (RECOMMENDED, gold style) */}
        <Pressable
          style={[s.modeCard, s.modeGold]}
          onPress={() => navigation.navigate('DiagnosisInput', { mode: 'both' })}
          accessibilityRole="button"
        >
          <Text style={[s.modeIcon, { fontSize: 20 }]}>💬📷</Text>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.modeTitleGold}>{t('diagnose.home.mode.both')}</Text>
              <View style={s.recommendedBadge}>
                <Text style={s.recommendedText}>{t('diagnose.home.mode.recommended')}</Text>
              </View>
            </View>
            <Text style={s.modeSubGold}>{t('diagnose.home.mode.bothSub')}</Text>
          </View>
          <Text style={s.arrowGold}>→</Text>
        </Pressable>

        <Text style={s.sectionHeader}>{t('diagnose.home.sectionHistory')}</Text>

        {history.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>{t('diagnose.home.history.empty.title')}</Text>
            <Text style={s.emptyBody}>{t('diagnose.home.history.empty.body')}</Text>
          </View>
        ) : (
          history.map((item) => {
            const resolved = item.status === 'completed';
            const diseaseName = item.diagnosis?.disease_name ?? t('diagnose.home.historyItem.processing');
            const date = new Date(item.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });
            return (
              <View key={item.id} style={s.historyRow}>
                <Text style={{ fontSize: 20 }}>{subjectEmoji(item.subject.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.historyTitle}>{item.subject.name} — {diseaseName}</Text>
                  <Text style={s.historyMeta}>
                    {date} · {resolved
                      ? t('diagnose.home.historyItem.resolved')
                      : t('diagnose.home.historyItem.pending')}
                  </Text>
                </View>
                {item.diagnosis && (
                  <View style={[
                    s.confBadge,
                    { backgroundColor: item.diagnosis.confidence >= 80 ? '#EAF4EE' : '#FEF3C7' },
                  ]}>
                    <Text style={[
                      s.confText,
                      { color: item.diagnosis.confidence >= 80 ? '#0D4A28' : '#92400E' },
                    ]}>
                      {t('diagnose.home.historyItem.confidence', { pct: item.diagnosis.confidence })}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar: {
    backgroundColor: '#1A6B3C',
    height: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderColor: '#C9A84C',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  offlineText: { fontSize: 9, color: '#92400E', textAlign: 'center' },
  infoAlert: {
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 3,
    borderColor: '#1D4ED8',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  infoAlertText: { fontSize: 10, color: '#1D4ED8', lineHeight: 16 },
  sectionHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 5,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    minHeight: 64,
  },
  modeActive:  { backgroundColor: '#EAF4EE', borderWidth: 2, borderColor: '#1A6B3C' },
  modeDefault: { backgroundColor: '#fff',    borderWidth: 1, borderColor: '#E5E7EB' },
  modeGold:    { backgroundColor: '#FFF8E7', borderWidth: 1.5, borderColor: '#C9A84C' },
  modeIcon:    { fontSize: 24, marginRight: 10 },
  modeTitleGreen: { fontSize: 11, fontWeight: '600', color: '#1A6B3C' },
  modeTitleInk:   { fontSize: 11, fontWeight: '600', color: '#111827' },
  modeTitleGold:  { fontSize: 11, fontWeight: '600', color: '#92400E' },
  modeSub:        { fontSize: 9, color: '#6B7280' },
  modeSubGold:    { fontSize: 9, color: '#92400E' },
  arrowGreen: { color: '#1A6B3C', fontSize: 16, marginLeft: 8 },
  arrowMuted:  { color: '#6B7280', fontSize: 16, marginLeft: 8 },
  arrowGold:   { color: '#C9A84C', fontSize: 16, marginLeft: 8 },
  recommendedBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  recommendedText: { fontSize: 7, fontWeight: '700', color: '#fff' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyTitle: { fontSize: 10, fontWeight: '600', color: '#111827' },
  historyMeta:  { fontSize: 8, color: '#6B7280', marginTop: 1 },
  confBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  confText:  { fontSize: 8, fontWeight: '600' },
  emptyWrap:  { alignItems: 'center', paddingVertical: 20 },
  emptyTitle: { fontSize: 11, fontWeight: '600', color: '#111827', marginBottom: 4 },
  emptyBody:  { fontSize: 9, color: '#6B7280', textAlign: 'center' },
});
