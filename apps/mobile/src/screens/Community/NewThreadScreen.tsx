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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { communityApi } from '../../api/community';
import type { ThreadCategory } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'NewThread'>;

const CATEGORIES: ThreadCategory[] = [
  'crops', 'livestock', 'market', 'weather', 'finance', 'government', 'success', 'tools',
];
const CATEGORY_COLOR: Record<ThreadCategory, string> = {
  crops: '#2E7D32', livestock: '#6D4C41', market: '#1565C0',
  weather: '#00838F', finance: '#E65100', government: '#4527A0',
  success: '#F57F17', tools: '#37474F',
};

const MAX_TITLE = 120;
const MAX_BODY  = 1000;

export function NewThreadScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ThreadCategory | null>(null);
  const [cropTag, setCropTag] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [success, setSuccess] = useState(false);

  const createMutation = useMutation({
    mutationFn: () =>
      communityApi.threads.create({
        category: category!,
        cropTag: cropTag.trim() || undefined,
        title: title.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      setSuccess(true);
      void queryClient.invalidateQueries({ queryKey: ['threads'] });
      setTimeout(() => navigation.goBack(), 1200);
    },
  });

  const canSubmit =
    category !== null &&
    title.trim().length >= 10 &&
    body.trim().length >= 20 &&
    !createMutation.isPending;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('community.newThread.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Category chips */}
          <Text style={s.fieldLabel}>{t('community.newThread.category')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catRow}
          >
            {CATEGORIES.map((cat) => {
              const isActive = category === cat;
              const color = CATEGORY_COLOR[cat];
              return (
                <Pressable
                  key={cat}
                  style={[s.catChip, isActive && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setCategory(cat)}
                  accessibilityRole="button"
                >
                  <Text style={[s.catChipText, isActive && s.catChipTextActive]}>
                    {t(`community.home.category.${cat}`)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Crop tag */}
          <Text style={s.fieldLabel}>{t('community.newThread.cropTag')}</Text>
          <TextInput
            style={s.input}
            value={cropTag}
            onChangeText={setCropTag}
            placeholder={t('community.newThread.cropTagPlaceholder')}
            placeholderTextColor="#BDBDBD"
          />

          {/* Title */}
          <View style={s.labelRow}>
            <Text style={s.fieldLabel}>{t('community.newThread.threadTitle')}</Text>
            <Text style={[s.charCount, title.length > MAX_TITLE * 0.9 && s.charCountWarn]}>
              {t('community.newThread.charCount', { count: title.length })} / {MAX_TITLE}
            </Text>
          </View>
          <TextInput
            style={s.input}
            value={title}
            onChangeText={(v) => setTitle(v.slice(0, MAX_TITLE))}
            placeholder={t('community.newThread.titlePlaceholder')}
            placeholderTextColor="#BDBDBD"
            multiline
          />

          {/* Body */}
          <View style={s.labelRow}>
            <Text style={s.fieldLabel}>{t('community.newThread.body')}</Text>
            <Text style={[s.charCount, body.length > MAX_BODY * 0.9 && s.charCountWarn]}>
              {t('community.newThread.charCount', { count: body.length })} / {MAX_BODY}
            </Text>
          </View>
          <TextInput
            style={[s.input, s.bodyInput]}
            value={body}
            onChangeText={(v) => setBody(v.slice(0, MAX_BODY))}
            placeholder={t('community.newThread.bodyPlaceholder')}
            placeholderTextColor="#BDBDBD"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          {success && (
            <View style={s.successBox}>
              <Text style={s.successText}>{t('community.newThread.success')}</Text>
            </View>
          )}

          <Pressable
            style={[s.submitBtn, !canSubmit && s.submitDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={s.submitLabel}>
                {t('community.newThread.submit')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  flex:           { flex: 1 },
  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:        { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:      { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:         { padding: 16, paddingBottom: 48 },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  labelRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  charCount:      { fontSize: 12, color: '#9E9E9E' },
  charCountWarn:  { color: '#E65100', fontWeight: '600' },

  catRow:         { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#DDDDDD', backgroundColor: '#FFF', minHeight: 36, justifyContent: 'center' },
  catChipText:    { fontSize: 13, color: '#555', fontWeight: '500' },
  catChipTextActive: { color: '#FFF', fontWeight: '700' },

  input:          { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A1A', minHeight: 48 },
  bodyInput:      { minHeight: 120, textAlignVertical: 'top' },

  successBox:     { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 16 },
  successText:    { fontSize: 14, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },

  submitBtn:      { minHeight: 52, backgroundColor: '#2E7D32', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  submitDisabled: { backgroundColor: '#A5D6A7' },
  submitLabel:    { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
