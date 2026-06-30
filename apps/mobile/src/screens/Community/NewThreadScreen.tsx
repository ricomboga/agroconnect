import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { communityApi } from '../../api/community';
import type { ThreadCategory } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'NewThread'>;

const POST_CATEGORIES: Array<{ value: ThreadCategory; emoji: string }> = [
  { value: 'crops',      emoji: '🌿' },
  { value: 'livestock',  emoji: '🐄' },
  { value: 'market',     emoji: '📈' },
  { value: 'weather',    emoji: '🌦' },
  { value: 'finance',    emoji: '💰' },
  { value: 'government', emoji: '🏛' },
  { value: 'success',    emoji: '🏆' },
  { value: 'tools',      emoji: '🔧' },
];

const CATEGORY_LABEL_KEYS: Record<ThreadCategory, string> = {
  crops:      'community.home.category.crops',
  livestock:  'community.home.category.livestock',
  market:     'community.home.category.market',
  weather:    'community.home.category.weather',
  finance:    'community.home.category.finance',
  government: 'community.home.category.government',
  success:    'community.home.category.success',
  tools:      'community.home.category.tools',
};

const MAX_TITLE = 120;
const MAX_BODY  = 1000;

export function NewThreadScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [category, setCategory] = useState<ThreadCategory | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cropAnimal, setCropAnimal] = useState('');

  const authorName = currentUser?.fullName ?? currentUser?.phone ?? 'Farmer';
  const authorCounty = currentUser?.county ?? undefined;

  const createMutation = useMutation({
    mutationFn: () =>
      communityApi.threads.create({
        category: category!,
        cropTag: cropAnimal.trim() || undefined,
        title: title.trim(),
        body: body.trim(),
        authorName,
        authorCounty,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['threads'] });
      setTimeout(() => navigation.goBack(), 400);
    },
  });

  const canSubmit =
    category !== null &&
    title.trim().length >= 5 &&
    body.trim().length >= 10 &&
    !createMutation.isPending;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />

      <View style={s.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          accessibilityRole="button"
        >
          <Text style={s.backLabel}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('community.newThread.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={s.fieldLabel}>{t('community.newThread.questionLabel')}</Text>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={(v) => setTitle(v.slice(0, MAX_TITLE))}
            placeholder={t('community.newThread.questionPlaceholder')}
            placeholderTextColor="#9CA3AF"
            returnKeyType="next"
          />
          <Text style={s.charCount}>{title.length}/{MAX_TITLE}</Text>

          {/* Details */}
          <Text style={s.fieldLabel}>{t('community.newThread.detailsLabel')}</Text>
          <TextInput
            style={[s.input, s.detailsInput]}
            value={body}
            onChangeText={(v) => setBody(v.slice(0, MAX_BODY))}
            placeholder={t('community.newThread.detailsPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{body.length}/{MAX_BODY}</Text>

          {/* Category */}
          <Text style={s.fieldLabel}>{t('community.newThread.categoryLabel')}</Text>
          <View style={s.catGrid}>
            {POST_CATEGORIES.map(({ value: cat, emoji }) => {
              const isActive = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[s.catChip, isActive && s.catChipActive]}
                  onPress={() => setCategory(cat)}
                  accessibilityRole="button"
                >
                  <Text style={s.catEmoji}>{emoji}</Text>
                  <Text style={[s.catChipText, isActive && s.catChipTextActive]}>
                    {t(CATEGORY_LABEL_KEYS[cat]).replace(/^[^ ]+ /, '')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Crop / Animal */}
          <Text style={s.fieldLabel}>{t('community.newThread.cropAnimalLabel')}</Text>
          <TextInput
            style={s.input}
            value={cropAnimal}
            onChangeText={setCropAnimal}
            placeholder={t('community.newThread.cropAnimalPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />

          {/* Photos — coming soon */}
          <Text style={s.fieldLabel}>{t('community.newThread.photosLabel')}</Text>
          <Pressable
            style={s.photoComingSoon}
            onPress={() => Alert.alert(t('common.comingSoon'), t('community.newThread.photosComingSoon'))}
            accessibilityRole="button"
          >
            <Text style={s.photoComingSoonIcon}>📷</Text>
            <Text style={s.photoComingSoonText}>{t('community.newThread.photosComingSoon')}</Text>
          </Pressable>

          {createMutation.isError && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
            </View>
          )}

          <Pressable
            style={[s.submitBtn, !canSubmit && s.submitDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.submitLabel}>{t('community.newThread.submit')}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#fff' },
  flex:             { flex: 1 },

  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: '#1A6B3C', height: 44, paddingHorizontal: 12 },
  backBtn:          { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:        { fontSize: 12, color: '#fff', fontWeight: '600' },
  topTitle:         { fontSize: 13, fontWeight: '600', color: '#fff' },

  scroll:           { padding: 11, paddingBottom: 48 },

  fieldLabel:       { fontSize: 9, fontWeight: '700', color: '#1A6B3C', textTransform: 'uppercase',
                      letterSpacing: 0.8, marginTop: 12, marginBottom: 5 },
  charCount:        { fontSize: 8, color: '#9CA3AF', textAlign: 'right', marginTop: 2 },

  input:            { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
                      paddingVertical: 7, paddingHorizontal: 9, fontSize: 10,
                      color: '#111827', backgroundColor: '#F9FAFB', minHeight: 44 },
  detailsInput:     { height: 90, textAlignVertical: 'top' },

  catGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  catChip:          { flexDirection: 'row', alignItems: 'center', gap: 4,
                      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
                      borderWidth: 1, borderColor: '#1A6B3C', backgroundColor: '#fff',
                      minHeight: 32 },
  catChipActive:    { backgroundColor: '#1A6B3C' },
  catEmoji:         { fontSize: 12 },
  catChipText:      { fontSize: 9, fontWeight: '500', color: '#1A6B3C' },
  catChipTextActive:{ color: '#fff', fontWeight: '600' },

  photoComingSoon:  { flexDirection: 'row', alignItems: 'center', gap: 8,
                      borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#D1D5DB',
                      borderRadius: 8, padding: 12, backgroundColor: '#F9FAFB' },
  photoComingSoonIcon: { fontSize: 20 },
  photoComingSoonText: { fontSize: 9, color: '#9CA3AF', flex: 1 },

  errorBox:         { backgroundColor: '#FEE2E2', borderRadius: 6, padding: 8, marginTop: 8 },
  errorText:        { fontSize: 10, color: '#DC2626', textAlign: 'center' },

  submitBtn:        { minHeight: 44, backgroundColor: '#1A6B3C', borderRadius: 6,
                      justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitDisabled:   { backgroundColor: '#9CA3AF' },
  submitLabel:      { color: '#fff', fontSize: 11, fontWeight: '700' },
});
