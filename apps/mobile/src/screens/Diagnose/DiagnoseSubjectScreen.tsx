import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { diagnoseApi } from '../../api/diagnose';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import { OfflineBanner } from '../../components/Common/OfflineBanner';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnoseSubject'>;

type SubjectType = 'plant' | 'animal';
type Duration = 'today' | '1_3_days' | '1_week' | 'over_1_week';

const PLANT_SUGGESTIONS = ['Mahindi', 'Nyanya', 'Maharagwe', 'Viazi', 'Chai', 'Kahawa'];
const ANIMAL_SUGGESTIONS = ["Ng'ombe wa maziwa", 'Kuku', 'Mbuzi', 'Kondoo', 'Nguruwe'];
const DURATIONS: Duration[] = ['today', '1_3_days', '1_week', 'over_1_week'];
const DURATION_DAYS: Record<Duration, number> = {
  today: 0,
  '1_3_days': 2,
  '1_week': 7,
  over_1_week: 14,
};

export function DiagnoseSubjectScreen({ navigation, route }: Props) {
  const { farmId, photoUris } = route.params;
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((s) => s.showToast);

  const [subjectType, setSubjectType] = useState<SubjectType>('plant');
  const [subjectName, setSubjectName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [duration, setDuration] = useState<Duration | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const suggestions = subjectType === 'plant' ? PLANT_SUGGESTIONS : ANIMAL_SUGGESTIONS;
  const canSubmit = subjectName.trim().length > 0 && duration !== null;

  const handleTypeChange = (type: SubjectType) => {
    setSubjectType(type);
    setSubjectName('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isOnline) {
        const formData = new FormData();
        photoUris.forEach((uri, i) => {
          formData.append('images', {
            uri,
            type: 'image/jpeg',
            name: `photo_${i}.jpg`,
          } as unknown as Blob);
        });
        formData.append('farm_id', farmId);
        formData.append('subject_type', subjectType);
        formData.append('subject_name', subjectName.trim());
        if (symptoms.trim()) formData.append('symptoms', symptoms.trim());
        if (duration) formData.append('duration_days', String(DURATION_DAYS[duration]));

        const { id } = await diagnoseApi.submit(formData);
        navigation.navigate('DiagnoseLoading', { diagnosisId: id, farmId });
      } else {
        // Store as base64 so the sync queue can reconstruct the multipart on upload
        const images = await Promise.all(
          photoUris.map((uri) =>
            FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
          ),
        );
        await queueWrite({
          operation: 'CREATE',
          entity: 'diagnose',
          endpoint: '/diagnose',
          payload: JSON.stringify({
            images,
            farm_id: farmId,
            subject_type: subjectType,
            subject_name: subjectName.trim(),
            symptoms: symptoms.trim() || undefined,
            duration_days: duration ? DURATION_DAYS[duration] : undefined,
          }),
        });
        showToast(t('diagnose.savedOffline'), 'info');
        navigation.popToTop();
      }
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
      {!isOnline && <OfflineBanner />}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>{t('diagnose.subject.typeLabel')}</Text>
        <View style={styles.typeRow}>
          {(['plant', 'animal'] as SubjectType[]).map((type) => (
            <Pressable
              key={type}
              style={[styles.typeCard, subjectType === type && styles.typeCardSelected]}
              onPress={() => handleTypeChange(type)}
            >
              <Text style={styles.typeIcon}>{type === 'plant' ? '🌱' : '🐄'}</Text>
              <Text style={[styles.typeLabel, subjectType === type && styles.typeLabelSelected]}>
                {t(`diagnose.subject.${type}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('diagnose.subject.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          value={subjectName}
          onChangeText={setSubjectName}
          placeholder={t('diagnose.subject.namePlaceholder')}
          autoCapitalize="sentences"
        />
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <Pressable key={s} style={styles.suggestionChip} onPress={() => setSubjectName(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('diagnose.subject.symptomsLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={symptoms}
          onChangeText={setSymptoms}
          placeholder={t('diagnose.subject.symptomsPlaceholder')}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>{t('diagnose.subject.durationLabel')}</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d}
              style={[styles.durationChip, duration === d && styles.durationChipSelected]}
              onPress={() => setDuration(d)}
            >
              <Text style={[styles.durationText, duration === d && styles.durationTextSelected]}>
                {t(`diagnose.subject.duration.${d}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit || submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? '...' : t('diagnose.subject.submit')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 20, paddingBottom: 40 },

  label: { fontSize: 14, fontWeight: '600', color: '#555555', marginBottom: 10, marginTop: 16 },

  typeRow: { flexDirection: 'row', gap: 12 },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  typeCardSelected: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  typeIcon: { fontSize: 32, marginBottom: 8 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#555555' },
  typeLabelSelected: { color: '#2E7D32' },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: { minHeight: 100, paddingTop: 12 },

  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    backgroundColor: '#E8F5E9',
  },
  suggestionText: { fontSize: 13, color: '#2E7D32', fontWeight: '500' },

  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  durationChipSelected: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  durationText: { fontSize: 14, color: '#555555' },
  durationTextSelected: { color: '#2E7D32', fontWeight: '600' },

  submitBtn: {
    marginTop: 28,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
