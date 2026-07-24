import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { useUiStore } from '../../store/ui.store';
import { diagnoseApi, type FeedbackOutcome } from '../../api/diagnose';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnosisFeedback'>;

const OUTCOMES: FeedbackOutcome[] = ['resolved', 'improved', 'no_change', 'worsened'];
const STARS = [1, 2, 3, 4, 5];

export function DiagnosisFeedbackScreen({ route, navigation }: Props) {
  const { diagnosisId } = route.params;
  const { t } = useTranslation();
  const showToast = useUiStore((st) => st.showToast);

  const [rating, setRating] = useState(0);
  const [outcome, setOutcome] = useState<FeedbackOutcome | null>(null);
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => diagnoseApi.submitFeedback(diagnosisId, {
      rating,
      outcome: outcome!,
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => {
      showToast(t('diagnose.feedback.success'), 'success');
      navigation.goBack();
    },
    onError: () => {
      showToast(t('diagnose.result.error.title'), 'error');
    },
  });

  const canSubmit = rating > 0 && outcome !== null && !mutation.isPending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topBarTitle}>{t('diagnose.feedback.title')}</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={s.label}>{t('diagnose.feedback.accuracyLabel')}</Text>
        <View style={s.starRow}>
          {STARS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              accessibilityRole="button"
              style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 26 }}>{n <= rating ? '⭐' : '☆'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>{t('diagnose.feedback.outcomeLabel')}</Text>
        <View style={s.outcomeCol}>
          {OUTCOMES.map((key) => (
            <Pressable
              key={key}
              onPress={() => setOutcome(key)}
              style={[s.outcomeOption, outcome === key && s.outcomeOptionSelected]}
              accessibilityRole="button"
            >
              <Text style={[s.outcomeText, outcome === key && s.outcomeTextSelected]}>
                {t(`diagnose.feedback.outcome.${key}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.label}>{t('diagnose.feedback.notesLabel')}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={s.notesInput}
          textAlignVertical="top"
        />

        <Pressable
          onPress={() => mutation.mutate()}
          disabled={!canSubmit}
          style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          accessibilityRole="button"
        >
          <Text style={s.submitBtnText}>{t('diagnose.feedback.submit')}</Text>
        </Pressable>
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

  label: { fontSize: 10, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  starRow: { flexDirection: 'row', gap: 4 },

  outcomeCol: { gap: 8 },
  outcomeOption: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  outcomeOptionSelected: { borderColor: '#1A6B3C', backgroundColor: '#EAF4EE' },
  outcomeText: { fontSize: 11, color: '#374151' },
  outcomeTextSelected: { color: '#0D4A28', fontWeight: '600' },

  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 10,
    color: '#111827',
    minHeight: 80,
  },

  submitBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    marginTop: 20,
    marginBottom: 12,
  },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
