import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { govtApi } from '../../api/govt';
import type { RegistrationStatus, FarmRegistration } from '../../api/govt';
import type { GovtStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GovtStackParamList, 'Registrations'>;

const STATUS_COLOR: Record<RegistrationStatus, string> = {
  pending:      '#E65100',
  under_review: '#1565C0',
  approved:     '#1B5E20',
  rejected:     '#B71C1C',
};
const STATUS_BG: Record<RegistrationStatus, string> = {
  pending:      '#FFF3E0',
  under_review: '#E3F2FD',
  approved:     '#E8F5E9',
  rejected:     '#FFEBEE',
};

const ACTIVE_STATUSES: RegistrationStatus[] = ['pending', 'under_review'];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function RegistrationsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: ['govt', 'registrations'],
    queryFn: () => govtApi.registrations.list(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }, [query]);

  function handleCreate() {
    navigation.navigate('NewRegistration');
  }

  if (query.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#1B5E20" /></View>
      </SafeAreaView>
    );
  }

  if (query.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => query.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const registrations = [...(query.data?.data ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
  const active = registrations.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const history = registrations.filter((r) => !ACTIVE_STATUSES.includes(r.status));

  function renderRow(reg: FarmRegistration) {
    return (
      <View key={reg.id} style={s.row}>
        <View style={s.rowInfo}>
          <Text style={s.rowName}>{reg.farmName}</Text>
          <Text style={s.rowSub}>{reg.registrationNumber ?? reg.id}</Text>
          <Text style={s.rowDate}>{t('govt.registrations.submittedOn', { date: formatDate(reg.submittedAt) })}</Text>
        </View>
        <View style={[s.pill, { backgroundColor: STATUS_BG[reg.status] }]}>
          <Text style={[s.pillText, { color: STATUS_COLOR[reg.status] }]}>
            {t(`govt.registrations.status.${reg.status}`)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1B5E20']} tintColor="#1B5E20" />
        }
      >
        <View style={s.headerRow}>
          <Text style={s.header}>{t('govt.registrations.title')}</Text>
          <Pressable style={s.newBtn} onPress={handleCreate} accessibilityRole="button">
            <Text style={s.newBtnLabel}>{t('govt.registrations.new')}</Text>
          </Pressable>
        </View>

        {registrations.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('govt.registrations.empty')}</Text>
          </View>
        )}

        {active.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t('govt.registrations.active')}</Text>
            {active.map(renderRow)}
          </>
        )}

        {history.length > 0 && (
          <>
            <Text style={[s.sectionTitle, active.length > 0 && s.sectionTitleSpaced]}>
              {t('govt.registrations.history')}
            </Text>
            {history.map(renderRow)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#FAFAFA' },
  scroll:     { padding: 16, paddingBottom: 32 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:  { fontSize: 15, color: '#B71C1C', textAlign: 'center', marginBottom: 12 },
  retryBtn:   { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel: { fontSize: 15, color: '#1B5E20', fontWeight: '600' },

  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  header:      { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  newBtn:      { backgroundColor: '#1B5E20', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnLabel: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  emptyBox:  { paddingVertical: 24, alignItems: 'center' },
  emptyTitle:{ fontSize: 15, fontWeight: '600', color: '#424242' },

  sectionTitle:        { fontSize: 12, fontWeight: '700', color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  sectionTitleSpaced:  { marginTop: 16 },

  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  rowInfo:   { flex: 1, gap: 2 },
  rowName:   { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  rowSub:    { fontSize: 12, color: '#757575' },
  rowDate:   { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  pill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  pillText:  { fontSize: 11, fontWeight: '700' },
});
