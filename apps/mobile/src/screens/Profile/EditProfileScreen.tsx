import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { profileApi } from '../../api/profile';
import { changeLanguage } from '../../i18n';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>;

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu',
  'Garissa', 'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho',
  'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale',
  'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru',
  'Migori', 'Mombasa', "Murang'a", 'Nairobi', 'Nakuru', 'Nandi', 'Narok',
  'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta',
  'Tana River', 'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
];

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function EditProfileScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineSync();
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  const [countyPickerOpen, setCountyPickerOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  useEffect(() => {
    if (profileQuery.data?.user) {
      setName(profileQuery.data.user.full_name);
      setCounty(profileQuery.data.user.county ?? '');
    }
  }, [profileQuery.data]);

  const updateMutation = useMutation({
    mutationFn: () => profileApi.update({ full_name: name.trim(), county: county.trim() || undefined }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.setQueryData(['profile'], res);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
  });

  const canSave = name.trim().length >= 2 && !updateMutation.isPending;
  const currentLang = i18n.language as 'sw' | 'en';
  const initials = getInitials(name || '?');

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('profile.edit.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('profile.edit.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarInitials}>{initials}</Text>
          </View>
          <Text style={s.avatarHint}>{t('profile.edit.avatar')}</Text>
        </View>

        {/* Name */}
        <Text style={s.fieldLabel}>{t('profile.edit.name')}</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder={t('profile.edit.name')}
          placeholderTextColor="#BDBDBD"
          autoCapitalize="words"
        />

        {/* County */}
        <Text style={s.fieldLabel}>{t('profile.edit.county')}</Text>
        <Pressable
          style={s.pickerBtn}
          onPress={() => setCountyPickerOpen(true)}
          accessibilityRole="button"
        >
          <Text style={county ? s.pickerValue : s.pickerPlaceholder}>
            {county || t('profile.edit.countyPickerTitle')}
          </Text>
          <Text style={s.pickerChevron}>▾</Text>
        </Pressable>

        {/* Language toggle */}
        <Text style={s.fieldLabel}>{t('profile.edit.language')}</Text>
        <View style={s.langRow}>
          <Pressable
            style={[s.langBtn, currentLang === 'sw' && s.langBtnActive]}
            onPress={() => void changeLanguage('sw')}
            accessibilityRole="button"
          >
            <Text style={[s.langBtnText, currentLang === 'sw' && s.langBtnTextActive]}>
              {t('profile.language.sw')}
            </Text>
          </Pressable>
          <Pressable
            style={[s.langBtn, currentLang === 'en' && s.langBtnActive]}
            onPress={() => void changeLanguage('en')}
            accessibilityRole="button"
          >
            <Text style={[s.langBtnText, currentLang === 'en' && s.langBtnTextActive]}>
              {t('profile.language.en')}
            </Text>
          </Pressable>
        </View>

        {success && (
          <View style={s.successBox}>
            <Text style={s.successText}>{t('profile.edit.success')}</Text>
          </View>
        )}

        {updateMutation.isError && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          </View>
        )}

        <Pressable
          style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
          onPress={() => updateMutation.mutate()}
          disabled={!canSave}
          accessibilityRole="button"
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.saveBtnLabel}>
              {t('profile.edit.save')}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* County picker modal */}
      <Modal
        visible={countyPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCountyPickerOpen(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('profile.edit.countyPickerTitle')}</Text>
              <Pressable onPress={() => setCountyPickerOpen(false)} style={s.modalClose} accessibilityRole="button">
                <Text style={s.modalCloseText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <FlatList
              data={KENYA_COUNTIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.countyRow, county === item && s.countyRowSelected]}
                  onPress={() => { setCounty(item); setCountyPickerOpen(false); }}
                  accessibilityRole="button"
                >
                  <Text style={[s.countyName, county === item && s.countyNameSelected]}>
                    {item}
                  </Text>
                  {county === item && <Text style={s.countyCheck}>✓</Text>}
                </Pressable>
              )}
              style={s.countyList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#FAFAFA' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:            { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:          { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:           { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:             { padding: 16, paddingBottom: 48 },
  avatarSection:      { alignItems: 'center', marginBottom: 24, marginTop: 8 },
  avatar:             { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarInitials:     { fontSize: 28, fontWeight: '800', color: '#FFF' },
  avatarHint:         { fontSize: 13, color: '#888' },

  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  input:              { backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', minHeight: 52 },

  pickerBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', paddingHorizontal: 14, paddingVertical: 12, minHeight: 52 },
  pickerValue:        { fontSize: 15, color: '#1A1A1A', flex: 1 },
  pickerPlaceholder:  { fontSize: 15, color: '#BDBDBD', flex: 1 },
  pickerChevron:      { fontSize: 14, color: '#888' },

  langRow:            { flexDirection: 'row', gap: 10, marginTop: 2 },
  langBtn:            { flex: 1, minHeight: 52, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  langBtnActive:      { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  langBtnText:        { fontSize: 15, fontWeight: '500', color: '#555' },
  langBtnTextActive:  { color: '#2E7D32', fontWeight: '700' },

  successBox:         { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 16 },
  successText:        { fontSize: 14, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },
  errorBox:           { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginTop: 16 },
  errorText:          { fontSize: 14, color: '#B71C1C', textAlign: 'center' },

  saveBtn:            { minHeight: 52, backgroundColor: '#2E7D32', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled:    { backgroundColor: '#A5D6A7' },
  saveBtnLabel:       { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:         { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  modalTitle:         { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  modalClose:         { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  modalCloseText:     { fontSize: 15, color: '#B71C1C', fontWeight: '600' },
  countyList:         { maxHeight: 400 },
  countyRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  countyRowSelected:  { backgroundColor: '#E8F5E9' },
  countyName:         { fontSize: 15, color: '#1A1A1A' },
  countyNameSelected: { color: '#2E7D32', fontWeight: '600' },
  countyCheck:        { fontSize: 16, color: '#2E7D32', fontWeight: '700' },
});
