import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../stores/authStore';
import { communityApi } from '../../api/community';
import { WeatherWidget } from '../../components/Weather/WeatherWidget';
import type { Thread, ThreadCategory } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CommunityHome'>;

type CategoryFilter = ThreadCategory | '';

const CATEGORIES: Array<{ value: CategoryFilter; labelKey: string }> = [
  { value: '',           labelKey: 'community.home.categoryAll' },
  { value: 'crops',      labelKey: 'community.home.category.crops' },
  { value: 'livestock',  labelKey: 'community.home.category.livestock' },
  { value: 'market',     labelKey: 'community.home.category.market' },
  { value: 'weather',    labelKey: 'community.home.category.weather' },
  { value: 'finance',    labelKey: 'community.home.category.finance' },
  { value: 'government', labelKey: 'community.home.category.government' },
  { value: 'success',    labelKey: 'community.home.category.success' },
  { value: 'tools',      labelKey: 'community.home.category.tools' },
];

const CATEGORY_COLOR: Record<ThreadCategory, string> = {
  crops: '#2E7D32', livestock: '#6D4C41', market: '#1565C0',
  weather: '#00838F', finance: '#E65100', government: '#4527A0',
  success: '#F57F17', tools: '#37474F',
};
const CATEGORY_BG: Record<ThreadCategory, string> = {
  crops: '#E8F5E9', livestock: '#EFEBE9', market: '#E3F2FD',
  weather: '#E0F7FA', finance: '#FFF3E0', government: '#EDE7F6',
  success: '#FFFDE7', tools: '#ECEFF1',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}saa`;
  return `${Math.floor(hrs / 24)}siku`;
}

export function CommunityHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const userCounty = useAuthStore((s) => s.user?.county);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('');

  const threadsQuery = useQuery({
    queryKey: ['threads', activeCategory],
    queryFn: () =>
      communityApi.threads.list(
        activeCategory ? { category: activeCategory as ThreadCategory } : undefined
      ),
    staleTime: isOnline ? 3 * 60 * 1000 : Infinity,
  });

  const threads = threadsQuery.data?.data ?? [];

  const renderThread = ({ item }: { item: Thread }) => {
    const catColor = CATEGORY_COLOR[item.category];
    const catBg = CATEGORY_BG[item.category];
    return (
      <Pressable
        style={s.threadCard}
        onPress={() => navigation.navigate('ThreadDetail', { threadId: item.id })}
        accessibilityRole="button"
      >
        <View style={[s.catTag, { backgroundColor: catBg }]}>
          <Text style={[s.catTagText, { color: catColor }]}>
            {t(`community.home.category.${item.category}`)}
          </Text>
        </View>
        <Text style={s.threadTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={s.threadBody} numberOfLines={2}>{item.body}</Text>
        <View style={s.threadMeta}>
          <View style={s.authorRow}>
            <Text style={s.authorName}>{item.authorName}</Text>
            {item.isExpert && (
              <View style={s.expertBadge}>
                <Text style={s.expertBadgeText}>{t('community.thread.expert')}</Text>
              </View>
            )}
          </View>
          <View style={s.stats}>
            <Text style={s.statText}>
              💬 {t('community.home.thread.replies_other', { count: item.replyCount })}
            </Text>
            <Text style={s.statText}>⬆ {item.upvoteCount}</Text>
            <Text style={s.statTime}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>{t('community.home.title')}</Text>
      </View>

      {/* Weather widget */}
      <WeatherWidget
        county={userCounty}
        onPress={() => navigation.navigate('WeatherDetail', { county: userCounty })}
      />

      {/* Category filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={s.filterScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <Pressable
              key={cat.value || 'all'}
              style={[s.pill, isActive && s.pillActive]}
              onPress={() => setActiveCategory(cat.value)}
              accessibilityRole="button"
            >
              <Text style={[s.pillText, isActive && s.pillTextActive]}>
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {threadsQuery.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      ) : threadsQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => threadsQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={renderThread}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>{t('community.home.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('community.home.empty.body')}</Text>
              <Pressable
                style={s.emptyCta}
                onPress={() => navigation.navigate('NewThread')}
                accessibilityRole="button"
              >
                <Text style={s.emptyCtaText}>{t('community.home.empty.cta')}</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Pressable
        style={s.fab}
        onPress={() => navigation.navigate('NewThread')}
        accessibilityRole="button"
        accessibilityLabel={t('community.home.newThread')}
      >
        <Text style={s.fabText}>+ {t('community.home.newThread')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  header:         { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title:          { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  filterScroll:   { maxHeight: 52 },
  filterRow:      { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  pill:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F0F0', minHeight: 34, justifyContent: 'center' },
  pillActive:     { backgroundColor: '#1B5E20' },
  pillText:       { fontSize: 13, fontWeight: '500', color: '#555' },
  pillTextActive: { color: '#FFF', fontWeight: '700' },

  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:      { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:       { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel:     { fontSize: 15, color: '#2E7D32', fontWeight: '600' },

  list:           { padding: 12, paddingBottom: 100, gap: 10 },
  threadCard:     { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEEEEE', minHeight: 48 },
  catTag:         { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
  catTagText:     { fontSize: 11, fontWeight: '700' },
  threadTitle:    { fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4, lineHeight: 20 },
  threadBody:     { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 8 },
  threadMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authorRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorName:     { fontSize: 12, color: '#757575', fontWeight: '500' },
  expertBadge:    { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  expertBadgeText:{ fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  stats:          { flexDirection: 'row', gap: 8, alignItems: 'center' },
  statText:       { fontSize: 12, color: '#9E9E9E' },
  statTime:       { fontSize: 12, color: '#BDBDBD' },

  emptyBox:       { paddingVertical: 48, alignItems: 'center', gap: 6 },
  emptyTitle:     { fontSize: 16, fontWeight: '600', color: '#424242' },
  emptyBody:      { fontSize: 14, color: '#757575', textAlign: 'center' },
  emptyCta:       { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: '#E8F5E9', borderRadius: 10, marginTop: 4 },
  emptyCtaText:   { fontSize: 14, fontWeight: '700', color: '#2E7D32' },

  fab:            { position: 'absolute', bottom: 24, right: 16, backgroundColor: '#2E7D32', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, elevation: 4 },
  fabText:        { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
