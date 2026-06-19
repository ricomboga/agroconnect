import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { profileApi, DEFAULT_PREFS } from '../../api/profile';
import type { NotificationPreferences } from '../../api/profile';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'NotificationSettings'>;

type PrefKey = keyof NotificationPreferences;

const PREF_KEYS: PrefKey[] = [
  'activityReminders',
  'diagnosisResults',
  'priceAlerts',
  'loanUpdates',
  'weatherAlerts',
  'communityReplies',
];

export function NotificationSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline } = useOfflineSync();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [success, setSuccess] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  useEffect(() => {
    if (profileQuery.data?.user.notificationPreferences) {
      setPrefs(profileQuery.data.user.notificationPreferences);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => profileApi.updateNotifications(prefs),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
  });

  const toggle = (key: PrefKey) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('profile.notifications.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  if (profileQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('profile.notifications.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => profileQuery.refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('profile.notifications.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.toggleCard}>
          {PREF_KEYS.map((key, idx) => (
            <View
              key={key}
              style={[s.toggleRow, idx < PREF_KEYS.length - 1 && s.toggleRowBorder]}
            >
              <Text style={s.toggleLabel}>{t(`profile.notifications.${key}`)}</Text>
              <Switch
                value={prefs[key]}
                onValueChange={() => toggle(key)}
                trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
                thumbColor={prefs[key] ? '#2E7D32' : '#BDBDBD'}
              />
            </View>
          ))}
        </View>

        {success && (
          <View style={s.successBox}>
            <Text style={s.successText}>{t('profile.notifications.success')}</Text>
          </View>
        )}

        {saveMutation.isError && (
          <View style={s.errorBox}>
            <Text style={s.errorBoxText}>{t('common.error.loadFailed')}</Text>
          </View>
        )}

        <Pressable
          style={[s.saveBtn, saveMutation.isPending && s.saveBtnDisabled]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          accessibilityRole="button"
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.saveBtnLabel}>{t('profile.notifications.save')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#FAFAFA' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:          { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:        { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:         { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:           { padding: 16, paddingBottom: 48 },

  toggleCard:       { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE', overflow: 'hidden', marginBottom: 16 },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, minHeight: 60 },
  toggleRowBorder:  { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  toggleLabel:      { fontSize: 15, color: '#1A1A1A', flex: 1, paddingRight: 12 },

  successBox:       { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 16 },
  successText:      { fontSize: 14, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },
  errorBox:         { backgroundColor: '#FFEBEE', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorBoxText:     { fontSize: 14, color: '#B71C1C', textAlign: 'center' },

  errorText:        { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:         { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel:       { fontSize: 15, color: '#2E7D32', fontWeight: '600' },

  saveBtn:          { minHeight: 52, backgroundColor: '#2E7D32', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnDisabled:  { backgroundColor: '#A5D6A7' },
  saveBtnLabel:     { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
