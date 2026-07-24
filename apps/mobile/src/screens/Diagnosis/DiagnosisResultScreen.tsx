import React, { useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { diagnoseApi } from '../../api/diagnose';
import type { DiagnosisPrescription } from '../../api/diagnose';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnosisResult'>;

function stepBg(idx: number) {
  return idx >= 3 ? '#C9A84C' : '#1A6B3C';
}

function confidenceBarColor(tier: 'high' | 'medium' | 'low' | undefined) {
  if (tier === 'high') return '#1A6B3C';
  if (tier === 'medium') return '#2E8B57';
  return '#D97706';
}

export function DiagnosisResultScreen({ route, navigation }: Props) {
  const { diagnosisId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['diagnosis', diagnosisId],
    queryFn: () => diagnoseApi.getResult(diagnosisId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
    staleTime: 0,
  });

  const isProcessing = !data || data.status === 'pending' || data.status === 'processing';
  const diagnosis    = data?.diagnosis;
  const prescriptions: DiagnosisPrescription[] = data?.prescriptions ?? [];
  const confidence   = diagnosis ? Math.round(diagnosis.confidence * 100) : 0;
  const subjectName  = data?.subject?.name ?? '';
  const firstProduct = prescriptions.find((p) => p.product_name)?.product_name ?? '';

  // Wire up the "Save" right button in the header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        !isProcessing ? (
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
            accessibilityRole="button"
          >
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
              {t('diagnose.result.save')}
            </Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, isProcessing, t]);

  const TopBar = ({ children }: { children?: React.ReactNode }) => (
    <View style={s.topBar}>
      <Pressable
        onPress={() => navigation.goBack()}
        style={s.backBtn}
        accessibilityRole="button"
      >
        <Text style={s.backText}>← {t('common.back')}</Text>
      </Pressable>
      <Text style={s.topBarTitle}>{t('diagnose.result.title')}</Text>
      <View style={{ minWidth: 60, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );

  if (isLoading || isProcessing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
        <TopBar />
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1A6B3C" />
          <Text style={s.loadingTitle}>{t('diagnose.result.loading.title')}</Text>
          <Text style={s.loadingSubtitle}>{t('diagnose.result.loading.subtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError || data.status === 'failed') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
        <TopBar />
        <View style={s.center}>
          <Text style={s.errorTitle}>{t('diagnose.result.error.title')}</Text>
          <Text style={s.errorBody}>{t('diagnose.result.error.body')}</Text>
          <Pressable onPress={() => refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      <TopBar>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ minHeight: 44, justifyContent: 'center' }}
          accessibilityRole="button"
        >
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>
            {t('diagnose.result.save')}
          </Text>
        </Pressable>
      </TopBar>

      <ScrollView contentContainerStyle={{ padding: 11 }}>

        {/* Confidence card */}
        <View style={s.confCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.aiThinks}>{t('diagnose.result.aiThinks')}</Text>
              <Text style={s.diseaseName}>{diagnosis?.disease_name ?? '—'}</Text>
              <Text style={s.techName}>
                ({diagnosis?.disease_code} — {subjectName})
              </Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${confidence}%` as `${number}%`, backgroundColor: confidenceBarColor(diagnosis?.confidence_tier) },
              ]}
            />
          </View>
          <Text style={s.confPct}>{t('diagnose.result.confidence', { pct: confidence })}</Text>
          {diagnosis?.confidence_tier && (
            <Text style={[s.confTier, diagnosis.confidence_tier === 'low' && s.confTierLow]}>
              {t(`diagnose.result.confidence_${diagnosis.confidence_tier}`)}
            </Text>
          )}
        </View>

        {/* Explanation card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {t('diagnose.result.whatHappening', { subject: subjectName })}
          </Text>
          <Text style={s.paragraph}>{diagnosis?.description ?? ''}</Text>
        </View>

        {/* Steps card */}
        {prescriptions.length > 0 && (
          <View style={[s.card, { borderColor: '#1A6B3C', borderWidth: 1.5 }]}>
            <Text style={s.stepsTitle}>
              {t('diagnose.result.stepsTitle', { n: prescriptions.length })}
            </Text>
            {prescriptions.map((step, idx) => (
              <View key={step.step} style={s.stepRow}>
                <View style={[s.stepCircle, { backgroundColor: stepBg(idx) }]}>
                  <Text style={s.stepNumber}>{step.step}</Text>
                </View>
                <Text style={s.stepText}>{step.action}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recovery alert */}
        <View style={s.recoveryAlert}>
          <Text style={s.recoveryText}>{t('diagnose.result.recovery')}</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actionCol}>
          {firstProduct !== '' && (
            <Pressable
              style={[s.actionBtn, s.actionGold]}
              onPress={() => navigation.navigate('SupplierProducts', { productName: firstProduct })}
              accessibilityRole="button"
            >
              <Text style={s.actionBtnText}>
                {t('diagnose.result.buyProduct', { product: firstProduct })}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[s.actionBtn, s.actionOutline]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={[s.actionBtnText, { color: '#1A6B3C' }]}>
              {t('diagnose.result.saveRecord')}
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar: {
    backgroundColor: '#1A6B3C',
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  backBtn:     { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backText:    { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  loadingTitle:    { fontSize: 11, color: '#1A6B3C', fontWeight: '600' },
  loadingSubtitle: { fontSize: 9, color: '#6B7280', textAlign: 'center' },
  errorTitle:      { fontSize: 11, color: '#111827', fontWeight: '600' },
  errorBody:       { fontSize: 9, color: '#6B7280' },
  retryBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  confCard: {
    backgroundColor: '#EAF4EE',
    borderWidth: 1.5,
    borderColor: '#1A6B3C',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  aiThinks:   { fontSize: 10, color: '#1A6B3C', fontWeight: '600', marginBottom: 2 },
  diseaseName: { fontSize: 13, fontWeight: '800', color: '#0D4A28' },
  techName:   { fontSize: 9, color: '#1A6B3C', marginTop: 1 },
  progressTrack: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  confPct: { fontSize: 8, color: '#1A6B3C', fontWeight: '600' },
  confTier: { fontSize: 9, color: '#1A6B3C', fontWeight: '600', marginTop: 3 },
  confTierLow: { color: '#B45309' },

  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 10, fontWeight: '700', color: '#111827', marginBottom: 5 },
  paragraph: { fontSize: 10, color: '#374151', lineHeight: 16 },

  stepsTitle: { fontSize: 10, color: '#1A6B3C', fontWeight: '700', marginBottom: 8 },
  stepRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  stepCircle: {
    width: 20,
    height: 20,
    minWidth: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontSize: 9, fontWeight: '700', color: '#fff' },
  stepText:   { flex: 1, fontSize: 10, color: '#111827', lineHeight: 15 },

  recoveryAlert: {
    backgroundColor: '#EAF4EE',
    borderLeftWidth: 3,
    borderColor: '#1A6B3C',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  recoveryText: { fontSize: 10, color: '#0D4A28', lineHeight: 15 },

  actionCol:    { gap: 8, marginBottom: 12 },
  actionBtn:    { borderRadius: 6, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
  actionGold:   { backgroundColor: '#C9A84C' },
  actionOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#1A6B3C' },
  actionBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
