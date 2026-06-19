import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuthStore } from '../../stores/authStore';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { profileApi } from '../../api/profile';
import { farmApi } from '../../api/farm';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

const ROLE_COLOR: Record<string, string> = {
  farmer:           '#2E7D32',
  admin:            '#1565C0',
  extension_officer:'#6A1B9A',
  vet:              '#6D4C41',
};
const ROLE_BG: Record<string, string> = {
  farmer:           '#E8F5E9',
  admin:            '#E3F2FD',
  extension_officer:'#F3E5F5',
  vet:              '#EFEBE9',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function ProfileHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline, pendingCount } = useOfflineSync();
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const farmsQuery = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmApi.list({ pageSize: 1 }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const diagnosesQuery = useQuery({
    queryKey: ['diagnosesCount'],
    queryFn: () => profileApi.diagnosesCount(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const listingsQuery = useQuery({
    queryKey: ['listingsCount'],
    queryFn: () => profileApi.listingsCount(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  const profile = profileQuery.data?.user;
  const displayName = profile?.full_name ?? authUser?.full_name ?? '—';
  const displayPhone = profile?.phone ?? authUser?.phone ?? '—';
  const role = profile?.role ?? authUser?.role ?? 'farmer';
  const roleColor = ROLE_COLOR[role] ?? '#2E7D32';
  const roleBg = ROLE_BG[role] ?? '#E8F5E9';
  const farmsCount = farmsQuery.data?.meta.total ?? 0;
  const diagnosesCount = diagnosesQuery.data?.meta.total ?? 0;
  const listingsCount = listingsQuery.data?.meta.total ?? 0;

  const MENU_ROWS = [
    {
      key: 'editProfile',
      label: t('profile.menu.editProfile'),
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      key: 'notifications',
      label: t('profile.menu.notifications'),
      onPress: () => navigation.navigate('NotificationSettings'),
    },
    {
      key: 'farmExport',
      label: t('profile.menu.farmExport'),
      onPress: () => navigation.navigate('FarmSummaryExport'),
    },
    {
      key: 'offlineStatus',
      label: t('profile.menu.offlineStatus'),
      onPress: () => navigation.navigate('OfflineStatus'),
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.pageTitle}>{t('profile.title')}</Text>

        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={[s.avatar, { backgroundColor: roleColor }]}>
            <Text style={s.avatarInitials}>{getInitials(displayName)}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.phone}>{displayPhone}</Text>
            {profile?.county && (
              <Text style={s.county}>{profile.county}</Text>
            )}
            <View style={[s.roleBadge, { backgroundColor: roleBg }]}>
              <Text style={[s.roleText, { color: roleColor }]}>
                {t(`profile.role.${role}`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{farmsCount}</Text>
            <Text style={s.statLabel}>{t('profile.stats.farms')}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statNum}>{diagnosesCount}</Text>
            <Text style={s.statLabel}>{t('profile.stats.diagnoses')}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statNum}>{listingsCount}</Text>
            <Text style={s.statLabel}>{t('profile.stats.listings')}</Text>
          </View>
        </View>

        {/* Edit profile CTA */}
        <Pressable
          style={s.editBtn}
          onPress={() => navigation.navigate('EditProfile')}
          accessibilityRole="button"
        >
          <Text style={s.editBtnLabel}>{t('profile.menu.editProfile')}</Text>
        </Pressable>

        {/* Menu rows */}
        <View style={s.menuCard}>
          {MENU_ROWS.map((row, idx) => (
            <Pressable
              key={row.key}
              style={[s.menuRow, idx < MENU_ROWS.length - 1 && s.menuRowBorder]}
              onPress={row.onPress}
              accessibilityRole="button"
            >
              <Text style={s.menuLabel}>{row.label}</Text>
              <View style={s.menuRight}>
                {row.badge !== undefined && (
                  <View style={s.menuBadge}>
                    <Text style={s.menuBadgeText}>{row.badge}</Text>
                  </View>
                )}
                <Text style={s.menuChevron}>›</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          style={s.logoutBtn}
          onPress={() => void logout()}
          accessibilityRole="button"
        >
          <Text style={s.logoutLabel}>{t('profile.logout')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  scroll:         { padding: 16, paddingBottom: 48 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle:      { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },

  heroCard:       { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEEEEE', gap: 14, alignItems: 'center' },
  avatar:         { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  heroRight:      { flex: 1, gap: 4 },
  name:           { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  phone:          { fontSize: 14, color: '#757575' },
  county:         { fontSize: 14, color: '#555' },
  roleBadge:      { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  roleText:       { fontSize: 12, fontWeight: '700' },

  statsRow:       { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 16, overflow: 'hidden' },
  statBox:        { flex: 1, paddingVertical: 16, alignItems: 'center' },
  statNum:        { fontSize: 24, fontWeight: '800', color: '#2E7D32' },
  statLabel:      { fontSize: 12, color: '#757575', marginTop: 2, textAlign: 'center' },
  statDivider:    { width: 1, backgroundColor: '#EEEEEE', marginVertical: 12 },

  editBtn:        { minHeight: 52, backgroundColor: '#2E7D32', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  editBtnLabel:   { color: '#FFF', fontSize: 16, fontWeight: '700' },

  menuCard:       { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE', marginBottom: 16, overflow: 'hidden' },
  menuRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 56 },
  menuRowBorder:  { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  menuLabel:      { fontSize: 15, color: '#1A1A1A' },
  menuRight:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge:      { backgroundColor: '#E65100', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  menuBadgeText:  { fontSize: 11, fontWeight: '700', color: '#FFF' },
  menuChevron:    { fontSize: 18, color: '#BDBDBD' },

  logoutBtn:      { minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#B71C1C', justifyContent: 'center', alignItems: 'center' },
  logoutLabel:    { color: '#B71C1C', fontSize: 16, fontWeight: '700' },
});
