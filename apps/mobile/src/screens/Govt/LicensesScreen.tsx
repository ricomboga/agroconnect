import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { govtApi } from '../../api/govt';
import type { LicenseStatus } from '../../api/govt';
import type { GovtStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GovtStackParamList, 'Licenses'>;

const STATUS_COLOR: Record<LicenseStatus, string> = {
  pending:  '#E65100',
  issued:   '#1B5E20',
  rejected: '#B71C1C',
  expired:  '#616161',
};
const STATUS_BG: Record<LicenseStatus, string> = {
  pending:  '#FFF3E0',
  issued:   '#E8F5E9',
  rejected: '#FFEBEE',
  expired:  '#EEEEEE',
};

export function LicensesScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ['govt', 'licenses'],
    queryFn: () => govtApi.licenses.list(),
  });

  function handleCreate() {
    Alert.alert(t('govt.licenses.new'), t('common.comingSoon'));
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

  const licenses = query.data?.data ?? [];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.headerRow}>
          <Text style={s.header}>{t('govt.licenses.title')}</Text>
          <Pressable style={s.newBtn} onPress={handleCreate} accessibilityRole="button">
            <Text style={s.newBtnLabel}>{t('govt.licenses.new')}</Text>
          </Pressable>
        </View>

        {licenses.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('govt.licenses.empty')}</Text>
          </View>
        )}

        {licenses.map((lic) => (
          <View key={lic.id} style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowName}>{lic.licenseType}</Text>
              <Text style={s.rowSub}>{lic.licenseNumber ?? lic.id}</Text>
              {lic.expiresAt ? (
                <Text style={s.rowExpiry}>{lic.expiresAt}</Text>
              ) : null}
            </View>
            <View style={[s.pill, { backgroundColor: STATUS_BG[lic.status] }]}>
              <Text style={[s.pillText, { color: STATUS_COLOR[lic.status] }]}>
                {t(`govt.licenses.status.${lic.status}`)}
              </Text>
            </View>
          </View>
        ))}
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

  emptyBox:   { paddingVertical: 24, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#424242' },

  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  rowInfo:   { flex: 1, gap: 2 },
  rowName:   { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  rowSub:    { fontSize: 12, color: '#757575' },
  rowExpiry: { fontSize: 11, color: '#9E9E9E' },
  pill:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  pillText:  { fontSize: 11, fontWeight: '700' },
});
