import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { diagnoseApi } from '../../api/diagnose';
import { useUiStore } from '../../store/ui.store';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnoseFeedback'>;
type Outcome = 'resolved' | 'better' | 'same' | 'worse';

const OUTCOMES: Outcome[] = ['resolved', 'better', 'same', 'worse'];

export function DiagnoseFeedbackScreen({ navigation, route }: Props) {
  const { diagnosisId } = route.params;
  const { t } = useTranslation();
  const showToast = useUiStore((s) => s.showToast);

  const [rating, setRating] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = rating > 0 && outcome !== null;

  const submit = async () => {
    if (!canSubmit || !outcome) return;
    setSubmitting(true);
    try {
      await diagnoseApi.submitFeedback(diagnosisId, {
        rating,
        outcome,
        notes: notes.trim() || undefined,
      });
      showToast(t('diagnose.feedback.success'), 'success');
      navigation.popToTop();
    } catch {
      showToast(t('common.error.loadFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('diagnose.feedback.title')}</Text>

        {/* Star rating */}
        <Text style={styles.label}>{t('diagnose.feedback.accuracyLabel')}</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} style={styles.starBtn}>
              <Text style={[styles.starText, star <= rating && styles.starActive]}>★</Text>
            </Pressable>
          ))}
        </View>

        {/* Outcome picker */}
        <Text style={styles.label}>{t('diagnose.feedback.outcomeLabel')}</Text>
        <View style={styles.outcomeRow}>
          {OUTCOMES.map((o) => (
            <Pressable
              key={o}
              style={[styles.outcomeChip, outcome === o && styles.outcomeChipSelected]}
              onPress={() => setOutcome(o)}
            >
              <Text style={[styles.outcomeText, outcome === o && styles.outcomeTextSelected]}>
                {t(`diagnose.feedback.outcome.${o}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Optional notes */}
        <Text style={styles.label}>{t('diagnose.feedback.notesLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit || submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? '...' : t('diagnose.feedback.submit')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: '700', color: '#1B1B1B', marginBottom: 24 },

  label: { fontSize: 14, fontWeight: '600', color: '#555555', marginBottom: 10, marginTop: 16 },

  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  starText: { fontSize: 36, color: '#E0E0E0' },
  starActive: { color: '#F59E0B' },

  outcomeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  outcomeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  outcomeChipSelected: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  outcomeText: { fontSize: 14, color: '#555555' },
  outcomeTextSelected: { color: '#2E7D32', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 90, paddingTop: 12 },

  submitBtn: {
    marginTop: 32,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
