import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { financeApi } from '../../api/finance';
import type { CreditBand } from '../../api/finance';
import type { FinanceStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FinanceStackParamList, 'CreditScoreDetail'>;

const BAND_COLOR: Record<CreditBand, string> = {
  A: '#1B5E20', B: '#2E8B57', C: '#E65100', D: '#B71C1C', ineligible: '#616161',
};
const BAND_BG: Record<CreditBand, string> = {
  A: '#E8F5E9', B: '#EAF4EE', C: '#FFF3E0', D: '#FFEBEE', ineligible: '#EEEEEE',
};

type CompKey = 'yield' | 'inputs' | 'activities' | 'platform';
const COMP_KEYS: CompKey[] = ['yield', 'inputs', 'activities', 'platform'];

export function CreditScoreDetailScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();
  const [recomputeMsg, setRecomputeMsg] = useState('');

  const scoreQuery = useQuery({
    queryKey: ['creditScore'],
    queryFn: () => financeApi.creditScore.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const recomputeMutation = useMutation({
    mutationFn: () => financeApi.creditScore.compute(),
    onSuccess: (res) => {
      queryClient.setQueryData(['creditScore'], res);
      setRecomputeMsg(t('finance.score.detail.recomputing'));
    },
  });

  if (scoreQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      </SafeAreaView>
    );
  }

  if (scoreQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => scoreQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const score = scoreQuery.data?.data;
  if (!score) return null;

  const band = score.band;
  const bandColor = BAND_COLOR[band as CreditBand];
  const bandBg = BAND_BG[band as CreditBand];

  const comps: Record<CompKey, { score: number; weight: number }> = score.components;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('finance.score.detail.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Score summary */}
        <View style={[s.summaryCard, { backgroundColor: bandBg, borderColor: bandColor }]}>
          <View style={s.summaryRow}>
            <View>
              <Text style={[s.bigScore, { color: bandColor }]}>{score.score}</Text>
              <Text style={s.outOf}>{t('finance.score.outOf')}</Text>
            </View>
            <View style={[s.bandBadge, { backgroundColor: bandColor }]}>
              <Text style={s.bandText}>{t('finance.score.band', { band })}</Text>
            </View>
          </View>
          <Text style={s.lastComputed}>
            {t('finance.score.detail.lastComputed', { date: score.lastComputedAt })}
          </Text>
        </View>

        {/* Component breakdown */}
        {COMP_KEYS.map((key) => {
          const comp = comps[key];
          if (!comp) return null;
          return (
            <View key={key} style={s.compCard}>
              <View style={s.compHeader}>
                <Text style={s.compTitle}>
                  {t(`finance.score.component.${key}`)}
                </Text>
                <Text style={[s.compScore, { color: bandColor }]}>
                  {comp.score}/100
                </Text>
              </View>
              <View style={s.barTrack}>
                <View
                  style={[s.barFill, { width: `${comp.score}%`, backgroundColor: bandColor }]}
                />
              </View>
              <Text style={s.improveTip}>
                {t(`finance.score.detail.howToImprove`)}
              </Text>
              <Text style={s.tipText}>{t(`finance.score.detail.tip.${key}`)}</Text>
            </View>
          );
        })}

        {recomputeMsg !== '' && (
          <View style={[s.msgBox, { backgroundColor: bandBg }]}>
            <Text style={[s.msgText, { color: bandColor }]}>{recomputeMsg}</Text>
          </View>
        )}

        <Pressable
          style={[s.recomputeBtn, { borderColor: bandColor }, recomputeMutation.isPending && s.btnDisabled]}
          onPress={() => recomputeMutation.mutate()}
          disabled={recomputeMutation.isPending}
          accessibilityRole="button"
        >
          {recomputeMutation.isPending ? (
            <ActivityIndicator size="small" color={bandColor} />
          ) : (
            <Text style={[s.recomputeLabel, { color: bandColor }]}>
              {t('finance.score.detail.recompute')}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText:      { fontSize: 15, color: '#B71C1C', marginBottom: 12 },
  retryBtn:       { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#EAF4EE', borderRadius: 8 },
  retryLabel:     { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },

  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:        { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:      { fontSize: 15, color: '#1A6B3C', fontWeight: '600' },
  topTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:         { padding: 16, paddingBottom: 40 },

  summaryCard:    { borderRadius: 16, borderWidth: 1.5, padding: 12, marginBottom: 16 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  bigScore:       { fontSize: 36, fontWeight: '800' },
  outOf:          { fontSize: 13, color: '#757575' },
  bandBadge:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  bandText:       { color: '#FFF', fontSize: 16, fontWeight: '700' },
  lastComputed:   { fontSize: 12, color: '#888' },

  compCard:       { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  compHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  compTitle:      { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  compScore:      { fontSize: 15, fontWeight: '700' },
  barTrack:       { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  barFill:        { height: 10, borderRadius: 5 },
  improveTip:     { fontSize: 14, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tipText:        { fontSize: 13, color: '#555', lineHeight: 18 },

  msgBox:         { borderRadius: 10, padding: 12, marginBottom: 12 },
  msgText:        { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  recomputeBtn:   { minHeight: 52, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  recomputeLabel: { fontSize: 16, fontWeight: '700' },
  btnDisabled:    { opacity: 0.5 },
});
