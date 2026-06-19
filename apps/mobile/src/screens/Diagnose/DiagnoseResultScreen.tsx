import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Pressable, SafeAreaView, ScrollView, Share,
  StyleSheet, Text, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { diagnoseApi } from '../../api/diagnose';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnoseResult'>;

type Severity = 'mild' | 'moderate' | 'severe' | 'critical';

const SEVERITY_COLORS: Record<Severity, string> = {
  mild: '#2E7D32',
  moderate: '#F59E0B',
  severe: '#E65100',
  critical: '#B00020',
};

const SEVERITY_BG: Record<Severity, string> = {
  mild: '#E8F5E9',
  moderate: '#FFF8E1',
  severe: '#FBE9E7',
  critical: '#FCE4EC',
};

function confidenceColor(value: number): string {
  if (value >= 0.85) return '#2E7D32';
  if (value >= 0.65) return '#F59E0B';
  return '#B00020';
}

export function DiagnoseResultScreen({ navigation, route }: Props) {
  const { diagnosisId } = route.params;
  const { t } = useTranslation();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const barAnim = useRef(new Animated.Value(0)).current;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['diagnosis', diagnosisId],
    queryFn: () => diagnoseApi.getResult(diagnosisId),
  });

  const { diagnosis, prescriptions = [] } = data ?? {};
  const confidencePct = diagnosis ? Math.round(diagnosis.confidence * 100) : 0;
  const barColor = diagnosis ? confidenceColor(diagnosis.confidence) : '#2E7D32';
  const severity = (diagnosis?.severity ?? 'mild') as Severity;
  const severityColor = SEVERITY_COLORS[severity];
  const severityBg = SEVERITY_BG[severity];
  const hasBuyTarget = prescriptions.some((p) => p.product_name);
  const buyProductName = prescriptions.find((p) => p.product_name)?.product_name ?? '';
  const doneCount = checkedSteps.size;

  useEffect(() => {
    if (!diagnosis) return;
    Animated.timing(barAnim, {
      toValue: confidencePct,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [diagnosis, confidencePct, barAnim]);

  const toggleStep = useCallback((step: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(step) ? next.delete(step) : next.add(step);
      return next;
    });
  }, []);

  const shareReport = useCallback(async () => {
    if (!diagnosis) return;
    const lines = [
      `AgroConnect — Ripoti ya Uchunguzi`,
      ``,
      `Ugonjwa: ${diagnosis.disease_name} (${diagnosis.disease_code})`,
      `Ukali: ${t(`diagnose.result.severity_${severity}`)}`,
      `Uhakika: ${confidencePct}%`,
      ``,
      diagnosis.description,
      ``,
      prescriptions.length > 0 ? `Jinsi ya kutibu:` : '',
      ...prescriptions.map((p) =>
        `${p.step}. ${p.action}${p.product_name ? ` — ${p.product_name}` : ''}`,
      ),
    ].filter(Boolean).join('\n');
    await Share.share({ message: lines, title: diagnosis.disease_name });
  }, [diagnosis, severity, confidencePct, prescriptions, t]);

  if (isLoading) return <LoadingScreen />;
  if (isError || !diagnosis) return <ErrorScreen onRetry={refetch} />;

  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Disease header card */}
        <View style={styles.card}>
          <View style={styles.diseaseTopRow}>
            <View style={styles.diseaseTitles}>
              <Text style={styles.diseaseName}>{diagnosis.disease_name}</Text>
              <Text style={styles.diseaseCode}>{diagnosis.disease_code}</Text>
            </View>
            <Pressable style={styles.shareBtn} onPress={shareReport} hitSlop={8}>
              <Text style={styles.shareBtnText}>↗</Text>
            </Pressable>
          </View>

          {/* Severity badge */}
          <View style={[styles.severityBadge, { backgroundColor: severityBg, borderColor: severityColor }]}>
            <View style={[styles.severityDot, { backgroundColor: severityColor }]} />
            <Text style={[styles.severityText, { color: severityColor }]}>
              {t(`diagnose.result.severity_${severity}`)}
            </Text>
          </View>

          {/* Animated confidence bar */}
          <View style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>{t('diagnose.result.confidence')}</Text>
            <Text style={[styles.confidencePct, { color: barColor }]}>{confidencePct}%</Text>
          </View>
          <View style={styles.barBg}>
            <Animated.View
              style={[styles.barFill, { width: barWidth, backgroundColor: barColor }]}
            />
          </View>
          <Text style={styles.barHint}>
            {confidencePct >= 85
              ? t('diagnose.result.confidence_high')
              : confidencePct >= 65
              ? t('diagnose.result.confidence_medium')
              : t('diagnose.result.confidence_low')}
          </Text>

          {data?.processing_time_ms && (
            <Text style={styles.processingTime}>
              ⚡ {t('diagnose.result.processed_in', { ms: data.processing_time_ms })}
            </Text>
          )}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>{t('diagnose.result.description')}</Text>
          <Text style={styles.bodyText}>{diagnosis.description}</Text>
        </View>

        {/* Prescription checklist */}
        {prescriptions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.prescHeaderRow}>
              <Text style={styles.sectionHeader}>{t('diagnose.result.prescriptions')}</Text>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>
                  {doneCount}/{prescriptions.length}
                </Text>
              </View>
            </View>

            {/* Progress bar across steps */}
            <View style={styles.stepBarBg}>
              <View
                style={[
                  styles.stepBarFill,
                  { width: `${(doneCount / prescriptions.length) * 100}%` },
                ]}
              />
            </View>

            {prescriptions.map((p) => {
              const isChecked = checkedSteps.has(p.step);
              const isExpanded = expandedStep === p.step;
              const hasDetail = Boolean(p.product_name || p.dosage || p.frequency);
              return (
                <Pressable
                  key={p.step}
                  style={[styles.prescRow, isChecked && styles.prescRowDone]}
                  onPress={() => {
                    toggleStep(p.step);
                    if (hasDetail && !isChecked) setExpandedStep(isExpanded ? null : p.step);
                  }}
                  onLongPress={() => hasDetail && setExpandedStep(isExpanded ? null : p.step)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.prescBody}>
                    <Text style={[styles.prescAction, isChecked && styles.prescActionDone]}>
                      {p.action}
                    </Text>
                    {(isExpanded || isChecked) && hasDetail && (
                      <View style={styles.prescDetail}>
                        {p.product_name && (
                          <View style={styles.detailPill}>
                            <Text style={styles.detailPillText}>🧴 {p.product_name}</Text>
                          </View>
                        )}
                        {p.dosage && <Text style={styles.detailLine}>💊 {p.dosage}</Text>}
                        {p.frequency && <Text style={styles.detailLine}>📅 {p.frequency}</Text>}
                      </View>
                    )}
                  </View>
                  {hasDetail && !isChecked && (
                    <Text style={styles.accordionIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {hasBuyTarget && (
            <Pressable
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => navigation.navigate('SupplierProducts', { productName: buyProductName })}
            >
              <Text style={styles.actionBtnOutlineText}>🛒 {t('diagnose.result.buyMedicine')}</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, !hasBuyTarget && styles.actionBtnFull]}
            onPress={() => navigation.navigate('DiagnoseFeedback', { diagnosisId })}
          >
            <Text style={styles.actionBtnText}>{t('diagnose.result.saveFarm')}</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  scroll: { padding: 16, paddingBottom: 48 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  diseaseTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  diseaseTitles: { flex: 1 },
  diseaseName: { fontSize: 20, fontWeight: '800', color: '#1B1B1B', marginBottom: 3 },
  diseaseCode: { fontSize: 12, color: '#9E9E9E', fontFamily: 'monospace' },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  shareBtnText: { fontSize: 20, color: '#2E7D32' },

  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 6,
  },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityText: { fontSize: 13, fontWeight: '700' },

  confidenceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confidenceLabel: { fontSize: 13, color: '#555555', fontWeight: '600' },
  confidencePct: { fontSize: 18, fontWeight: '800' },
  barBg: { height: 10, backgroundColor: '#EEEEEE', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: 10, borderRadius: 5 },
  barHint: { fontSize: 11, color: '#9E9E9E', marginBottom: 4 },
  processingTime: { fontSize: 11, color: '#BDBDBD', marginTop: 4 },

  sectionHeader: { fontSize: 15, fontWeight: '700', color: '#1B1B1B', marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#555555', lineHeight: 22 },

  prescHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressBadge: {
    marginLeft: 'auto',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  progressBadgeText: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
  stepBarBg: { height: 4, backgroundColor: '#EEEEEE', borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  stepBarFill: { height: 4, backgroundColor: '#2E7D32', borderRadius: 2 },

  prescRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    gap: 12,
  },
  prescRowDone: { opacity: 0.6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  checkmark: { fontSize: 14, color: '#FFFFFF', fontWeight: '800' },
  prescBody: { flex: 1 },
  prescAction: { fontSize: 14, color: '#1B1B1B', lineHeight: 20 },
  prescActionDone: { textDecorationLine: 'line-through', color: '#9E9E9E' },
  prescDetail: { marginTop: 8, gap: 6 },
  detailPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailPillText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  detailLine: { fontSize: 13, color: '#555555' },
  accordionIcon: { fontSize: 12, color: '#BBBBBB', marginTop: 4 },

  actionsRow: { gap: 10 },
  actionBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnFull: { width: '100%' },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  actionBtnOutline: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#2E7D32' },
  actionBtnOutlineText: { color: '#2E7D32', fontSize: 16, fontWeight: '700' },
});
