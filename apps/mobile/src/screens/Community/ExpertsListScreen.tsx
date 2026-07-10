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
import { useFarms } from '../../hooks/useFarms';
import { useAuthStore } from '../../stores/authStore';
import { communityApi } from '../../api/community';
import type { Expert, ExpertType } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'ExpertsList'>;

const TYPE_FILTERS: Array<{ value: ExpertType | ''; labelKey: string }> = [
  { value: '',                 labelKey: 'community.experts.filterAll' },
  { value: 'agronomist',       labelKey: 'community.expert.type.agronomist' },
  { value: 'vet',              labelKey: 'community.expert.type.vet' },
  { value: 'extension_officer',labelKey: 'community.expert.type.extension_officer' },
  { value: 'soil_lab',         labelKey: 'community.expert.type.soil_lab' },
];

const TYPE_COLORS: Record<ExpertType, string> = {
  agronomist:        '#2E7D32',
  vet:               '#6D4C41',
  extension_officer: '#1565C0',
  soil_lab:          '#B45309',
};
const TYPE_BG: Record<ExpertType, string> = {
  agronomist:        '#E8F5E9',
  vet:               '#EFEBE9',
  extension_officer: '#E3F2FD',
  soil_lab:          '#FEF3C7',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

export function ExpertsListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [filter, setFilter] = useState<ExpertType | ''>('');

  const myCounty = useAuthStore((s) => s.user?.county) ?? undefined;
  const { data: farmsData } = useFarms(1, 1);
  const primaryFarm = farmsData?.data?.[0];
  const county = primaryFarm?.county ?? myCounty;
  const subCounty = primaryFarm?.subCounty ?? undefined;

  const expertsQuery = useQuery({
    queryKey: ['experts', filter, county, subCounty],
    queryFn: () =>
      communityApi.experts.list({
        providerType: filter || undefined,
        county,
        subCounty,
      }),
    staleTime: isOnline ? 10 * 60 * 1000 : Infinity,
  });

  const experts = expertsQuery.data?.data ?? [];
  const matchedOn = expertsQuery.data?.meta.matched_on;

  const renderExpert = ({ item }: { item: Expert }) => {
    const color = TYPE_COLORS[item.providerType];
    const bg = TYPE_BG[item.providerType];
    return (
      <Pressable
        style={s.card}
        onPress={() => navigation.navigate('ExpertProfile', { expertId: item.id })}
        accessibilityRole="button"
      >
        <View style={[s.avatar, { backgroundColor: color }]}>
          <Text style={s.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={s.cardBody}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>{item.name}</Text>
            <Text style={s.verified}>✓</Text>
          </View>
          <View style={[s.typeBadge, { backgroundColor: bg }]}>
            <Text style={[s.typeText, { color }]}>
              {t(`community.expert.type.${item.providerType}`)}
            </Text>
          </View>
          <Text style={s.stars}>{renderStars(item.rating)}</Text>
          <Text style={s.counties} numberOfLines={1}>
            {item.countiesServed.slice(0, 3).join(', ')}
            {item.countiesServed.length > 3 ? ` +${item.countiesServed.length - 3}` : ''}
          </Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <Text style={s.headerTitle}>{t('community.experts.title')}</Text>
      </View>

      {/* Type filter */}
      <View style={s.filterRow}>
        {TYPE_FILTERS.map(({ value, labelKey }) => {
          const isActive = filter === value;
          return (
            <Pressable
              key={value || 'all'}
              style={[s.filterChip, isActive && s.filterChipActive]}
              onPress={() => setFilter(value)}
              accessibilityRole="button"
            >
              <Text style={[s.filterText, isActive && s.filterTextActive]}>
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {matchedOn && matchedOn !== 'subCounty' && county && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            {t(`community.experts.matchedOn.${matchedOn}`, { county })}
          </Text>
        </View>
      )}

      {expertsQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      ) : expertsQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => expertsQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={experts}
          keyExtractor={(e) => e.id}
          renderItem={renderExpert}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyTitle}>{t('community.experts.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('community.experts.empty.body')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#fff' },
  header:          { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
                     borderColor: '#EEEEEE' },
  headerTitle:     { fontSize: 16, fontWeight: '700', color: '#111827' },

  filterRow:       { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
                     flexWrap: 'wrap' },
  filterChip:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                     borderWidth: 1, borderColor: '#1A6B3C' },
  banner:          { marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 6,
                     backgroundColor: '#FEF3C7', borderRadius: 8 },
  bannerText:      { fontSize: 10, color: '#92400E' },
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
                     alignItems: 'center' },
  avatarText:      { fontSize: 16, fontWeight: '800', color: '#fff' },
  cardBody:        { flex: 1, gap: 3 },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name:            { fontSize: 12, fontWeight: '700', color: '#111827', flex: 1 },
  verified:        { fontSize: 12, color: '#16A34A', fontWeight: '800' },
  typeBadge:       { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2,
                     borderRadius: 8 },
  typeText:        { fontSize: 8, fontWeight: '700' },
  stars:           { fontSize: 10, color: '#F59E0B' },
  counties:        { fontSize: 8, color: '#6B7280' },
  chevron:         { fontSize: 20, color: '#9CA3AF' },
});
