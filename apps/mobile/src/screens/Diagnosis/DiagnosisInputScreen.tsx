import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { diagnoseApi } from '../../api/diagnose';
import { useFarmStore } from '../../store/farm.store';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnosisInput'>;
type SubjectType = 'crop' | 'animal';

const CROPS  = ['Maize', 'Cabbage', 'Beans', 'Tomato', 'Potato', 'Wheat', 'Other'];
const ANIMALS = ['Layers (Chicken)', 'Dairy Cattle', 'Beef Cattle', 'Goats', 'Sheep', 'Other'];

export function DiagnosisInputScreen({ route, navigation }: Props) {
  const { mode } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const activeFarmId = useFarmStore((s) => s.activeFarmId);

  const [question,    setQuestion]    = useState('');
  const [photos,      setPhotos]      = useState<string[]>([]);
  const [subjectType, setSubjectType] = useState<SubjectType>('crop');
  const [subjectName, setSubjectName] = useState('Maize');
  const [submitting,  setSubmitting]  = useState(false);
  const [cameraOpen,  setCameraOpen]  = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const hasQuestion = question.trim().length > 0;
  const hasPhotos   = photos.length > 0;
  const canSubmit   =
    mode === 'text'  ? hasQuestion :
    mode === 'photo' ? hasPhotos :
    hasQuestion || hasPhotos;

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setCameraOpen(true);
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || photos.length >= 3) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setPhotos((prev) => [...prev, photo.uri]);
    }
    setCameraOpen(false);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (activeFarmId) formData.append('farm_id', activeFarmId);
      formData.append('subject_type', subjectType === 'crop' ? 'plant' : 'animal');
      formData.append('subject_name', subjectName);
      if (hasQuestion) formData.append('symptoms', question.trim());
      photos.forEach((uri, i) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `photo_${i}.jpg`,
        } as unknown as Blob);
      });
      const { id } = await diagnoseApi.submit(formData);
      navigation.navigate('DiagnosisResult', { diagnosisId: id });
    } catch {
      Alert.alert('', t('diagnose.input.errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const subjectOptions = subjectType === 'crop' ? CROPS : ANIMALS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      {/* TopBar */}
      <View style={s.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityRole="button"
        >
          <Text style={s.backText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topBarTitle}>{t('diagnose.input.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Fullscreen camera modal */}
      <Modal visible={cameraOpen} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#111' }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <SafeAreaView
              style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 24 }}
              edges={['bottom']}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable
                  onPress={() => setCameraOpen(false)}
                  style={s.camCancel}
                  accessibilityRole="button"
                >
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                    {t('common.cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleTakePhoto}
                  style={s.shutterBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('diagnose.input.cameraPrompt')}
                />
              </View>
            </SafeAreaView>
          </CameraView>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 11 }}>

        {/* Question input (hidden when mode === 'photo') */}
        {mode !== 'photo' && (
          <View style={s.section}>
            <Text style={s.fieldLabel}>{t('diagnose.input.questionLabel')}</Text>
            <TextInput
              style={[s.textInput, { height: 64 }]}
              multiline
              placeholder={t('diagnose.input.questionPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={question}
              onChangeText={setQuestion}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={s.charCount}>
              {t('diagnose.input.charCount', { count: question.length })}
            </Text>
          </View>
        )}

        {/* Camera section (hidden when mode === 'text') */}
        {mode !== 'text' && (
          <View style={s.section}>
            <Text style={s.fieldLabel}>{t('diagnose.input.photosLabel')}</Text>

            {/* Camera viewfinder box */}
            <Pressable
              style={s.cameraBox}
              onPress={handleOpenCamera}
              accessibilityRole="button"
            >
              <View style={s.cameraRing} />
              <Text style={s.cameraPromptText}>{t('diagnose.input.cameraPrompt')}</Text>
            </Pressable>

            {/* Thumbnails */}
            {(hasPhotos || mode === 'photo' || mode === 'both') && (
              <View style={s.thumbRow}>
                {photos.map((uri, idx) => (
                  <View key={idx} style={s.thumbFilled}>
                    <Image source={{ uri }} style={s.thumbImage} />
                    <Pressable
                      style={s.removeBtn}
                      onPress={() => handleRemovePhoto(idx)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
                    >
                      <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
                {Array.from({ length: 3 - photos.length }).map((_, idx) => (
                  <View key={`e${idx}`} style={s.thumbEmpty}>
                    <Text style={{ fontSize: 16, color: '#9CA3AF' }}>📷</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Type selector chips */}
        <View style={s.typeRow}>
          <Pressable
            style={[s.chip, subjectType === 'crop' && s.chipActive]}
            onPress={() => { setSubjectType('crop'); setSubjectName('Maize'); }}
            accessibilityRole="button"
          >
            <Text style={[s.chipText, subjectType === 'crop' && s.chipTextActive]}>
              {t('diagnose.input.cropChip')}
            </Text>
          </Pressable>
          <Pressable
            style={[s.chip, subjectType === 'animal' && s.chipActive]}
            onPress={() => { setSubjectType('animal'); setSubjectName('Dairy Cattle'); }}
            accessibilityRole="button"
          >
            <Text style={[s.chipText, subjectType === 'animal' && s.chipTextActive]}>
              {t('diagnose.input.animalChip')}
            </Text>
          </Pressable>
        </View>

        {/* Subject selector */}
        <View style={s.section}>
          <Text style={s.fieldLabel}>{t('diagnose.input.subjectLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {subjectOptions.map((opt) => (
              <Pressable
                key={opt}
                style={[s.subjectPill, subjectName === opt && s.subjectPillActive]}
                onPress={() => setSubjectName(opt)}
                accessibilityRole="button"
              >
                <Text style={[s.subjectPillText, subjectName === opt && s.subjectPillTextActive]}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit */}
        <Pressable
          style={[s.submitBtn, (!canSubmit || submitting) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={s.submitText}>{t('diagnose.input.submitting')}</Text>
            </View>
          ) : (
            <Text style={s.submitText}>{t('diagnose.input.submitBtn')}</Text>
          )}
        </Pressable>
        <Text style={s.submitNote}>{t('diagnose.input.submitNote')}</Text>

        {!isOnline && (
          <View style={s.ussdBanner}>
            <Text style={s.ussdText}>
              {t('diagnose.input.ussdFallback', { code: '*384*123#' })}
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  backBtn:     { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backText:    { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  section:   { marginBottom: 12 },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  charCount: { fontSize: 8, color: '#9CA3AF', textAlign: 'right', marginTop: 3 },

  cameraBox: {
    backgroundColor: '#111',
    height: 110,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cameraRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  cameraPromptText: { fontSize: 8, color: 'rgba(255,255,255,0.7)' },

  thumbRow:    { flexDirection: 'row', gap: 6, marginTop: 4 },
  thumbFilled: {
    width: 50,
    height: 50,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#1A6B3C',
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage:  { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmpty: {
    width: 50,
    height: 50,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  chipActive:     { backgroundColor: '#EAF4EE', borderColor: '#1A6B3C' },
  chipText:       { fontSize: 10, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#1A6B3C' },

  subjectPill: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    minHeight: 32,
    justifyContent: 'center',
  },
  subjectPillActive:     { backgroundColor: '#EAF4EE', borderColor: '#1A6B3C' },
  subjectPillText:       { fontSize: 10, color: '#6B7280' },
  subjectPillTextActive: { color: '#1A6B3C', fontWeight: '600' },

  submitBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 8,
  },
  submitBtnDisabled: { backgroundColor: '#9CA3AF' },
  submitText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  submitNote: { fontSize: 8, color: '#6B7280', textAlign: 'center', marginBottom: 12 },

  ussdBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  ussdText: { fontSize: 9, color: '#92400E', textAlign: 'center' },

  camCancel: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  shutterBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
