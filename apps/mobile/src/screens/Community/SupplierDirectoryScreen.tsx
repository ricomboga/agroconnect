import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../stores/authStore';
import { marketApi } from '../../api/market';
import type { SupplierProfile } from '../../api/market';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'SupplierDirectory'>;

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

export function SupplierDirectoryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const myCounty = useAuthStore((s) => s.user?.county) ?? undefined;
  const [county, setCounty] = useState<string | undefined>(myCounty);

  const suppliersQuery = useQuery({
    queryKey: ['supplierProfiles', county],
    queryFn: () => marketApi.supplierProfiles.list({ county }),
    staleTime: isOnline ? 10 * 60 * 1000 : Infinity,
  });

  const suppliers = suppliersQuery.data?.data ?? [];

  const renderSupplier = ({ item }: { item: SupplierProfile }) => (
    <Pressable
      style={s.card}
      onPress={() => navigation.navigate('SupplierDirectoryProfile', { supplierId: item.id })}
      accessibilityRole="button"
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{getInitials(item.businessName)}</Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.name} numberOfLines={1}>{item.businessName}</Text>
        <Text style={s.county} numberOfLines={1}>
          {item.county}{item.subCounty ? `, ${item.subCounty}` : ''}
        </Text>
        {item.categories.length > 0 && (
          <Text style={s.categories} numberOfLines={1}>{item.categories.join(', ')}</Text>
        )}
      </View>
      <Text style={s.chevron}>›</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('community.suppliers.title')}</Text>
        <View style={s.backBtn} />
      </View>

      {myCounty && (
        <View style={s.filterRow}>
          <Pressable
            style={[s.filterChip, county === myCounty && s.filterChipActive]}
            onPress={() => setCounty(myCounty)}
            accessibilityRole="button"
          >
            <Text style={[s.filterText, county === myCounty && s.filterTextActive]}>
              {t('community.suppliers.myCounty', { county: myCounty })}
            </Text>
          </Pressable>
          <Pressable
            style={[s.filterChip, !county && s.filterChipActive]}
            onPress={() => setCounty(undefined)}
            accessibilityRole="button"
          >
            <Text style={[s.filterText, !county && s.filterTextActive]}>
              {t('community.suppliers.allCounties')}
            </Text>
          </Pressable>
        </View>
      )}

      {suppliersQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      ) : suppliersQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => suppliersQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={suppliers}
          keyExtractor={(item) => item.id}
          renderItem={renderSupplier}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyTitle}>{t('community.suppliers.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('community.suppliers.empty.body')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#fff' },
  topBar:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     paddingHorizontal: 12, height: 44, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  backBtn:         { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:       { fontSize: 12, color: '#1A6B3C', fontWeight: '600' },
  topTitle:        { fontSize: 13, fontWeight: '600', color: '#111827' },

  filterRow:       { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  filterChip:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                     borderWidth: 1, borderColor: '#1A6B3C' },
  filterChipActive:{ backgroundColor: '#1A6B3C' },
  filterText:      { fontSize: 9, color: '#1A6B3C', fontWeight: '500' },
  filterTextActive:{ color: '#fff', fontWeight: '600' },

  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:       { fontSize: 12, color: '#DC2626', marginBottom: 10, textAlign: 'center' },
  retryBtn:        { minHeight: 40, paddingHorizontal: 16, justifyContent: 'center',
                     backgroundColor: '#EAF4EE', borderRadius: 6 },
  retryLabel:      { fontSize: 10, color: '#1A6B3C', fontWeight: '600' },
  emptyTitle:      { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyBody:       { fontSize: 11, color: '#6B7280', textAlign: 'center' },

  list:            { padding: 12, paddingBottom: 80, gap: 8 },

  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                     borderRadius: 10, padding: 12, gap: 10, borderWidth: 1, borderColor: '#EEEEEE',
                     shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar:          { width: 44, height: 44, borderRadius: 22, justifyContent: 'center',
                     alignItems: 'center', backgroundColor: '#1A6B3C' },
  avatarText:      { fontSize: 16, fontWeight: '800', color: '#fff' },
  cardBody:        { flex: 1, gap: 3 },
  name:            { fontSize: 12, fontWeight: '700', color: '#111827' },
  county:          { fontSize: 10, color: '#6B7280' },
  categories:      { fontSize: 9, color: '#9CA3AF' },
  chevron:         { fontSize: 20, color: '#9CA3AF' },
});
