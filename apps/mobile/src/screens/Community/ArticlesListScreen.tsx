import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { communityApi } from '../../api/community';
import type { Article, ArticleType, ThreadCategory } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'ArticlesList'>;

const TYPE_FILTERS: Array<{ value: ArticleType | ''; labelKey: string }> = [
  { value: '',        labelKey: 'community.articles.typeAll' },
  { value: 'news',    labelKey: 'community.articles.type.news' },
  { value: 'event',   labelKey: 'community.articles.type.event' },
  { value: 'webinar', labelKey: 'community.articles.type.webinar' },
];

const CATEGORY_FILTERS: Array<{ value: ThreadCategory | ''; labelKey: string }> = [
  { value: '',           labelKey: 'community.home.categoryAll' },
  { value: 'crops',      labelKey: 'community.home.category.crops' },
  { value: 'livestock',  labelKey: 'community.home.category.livestock' },
  { value: 'market',     labelKey: 'community.home.category.market' },
  { value: 'finance',    labelKey: 'community.home.category.finance' },
  { value: 'government', labelKey: 'community.home.category.government' },
  { value: 'success',    labelKey: 'community.home.category.success' },
  { value: 'tools',      labelKey: 'community.home.category.tools' },
];

const API_TO_MOBILE: Record<string, ThreadCategory> = {
  crop_advice:        'crops',
  livestock_health:   'livestock',
  market_talk:        'market',
  weather_climate:    'weather',
  finance_business:   'finance',
  government_programs:'government',
  success_stories:    'success',
  equipment_tools:    'tools',
};

function categoryLabelKey(apiCategory: string): string {
  const mobile = API_TO_MOBILE[apiCategory] ?? apiCategory;
  return `community.home.category.${mobile}`;
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function fmtEventDate(iso: string): string {
  return new Date(iso).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ArticlesListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [category, setCategory] = useState<ThreadCategory | ''>('');
  const [type, setType] = useState<ArticleType | ''>('');

  const articlesQuery = useQuery({
    queryKey: ['articles', category, type],
    queryFn: () =>
      communityApi.articles.list({
        ...(category ? { category } : {}),
        ...(type ? { type } : {}),
      }),
    staleTime: isOnline ? 15 * 60 * 1000 : Infinity,
  });

  const articles = articlesQuery.data?.data ?? [];

  const renderArticle = ({ item }: { item: Article }) => (
    <Pressable
      style={s.card}
      onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
      accessibilityRole="button"
    >
      <View style={s.badgeRow}>
        <View style={s.categoryBadge}>
          <Text style={s.categoryText}>{t(categoryLabelKey(item.category))}</Text>
        </View>
        {item.type !== 'news' && (
          <View style={[s.typeBadge, item.type === 'webinar' ? s.webinarBadge : s.eventBadge]}>
            <Text style={s.typeBadgeText}>{t(`community.articles.type.${item.type}`)}</Text>
          </View>
        )}
      </View>
      <Text style={s.articleTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={s.summary} numberOfLines={3}>{item.summary}</Text>
      {item.type !== 'news' && item.startsAt && (
        <Text style={s.eventDate}>{fmtEventDate(item.startsAt)}</Text>
      )}
      <View style={s.meta}>
        <Text style={s.author}>{item.authorName}</Text>
        <Text style={s.date}>{timeAgo(item.publishedAt)}</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <Text style={s.headerTitle}>{t('community.articles.title')}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {TYPE_FILTERS.map(({ value, labelKey }) => {
          const isActive = type === value;
          return (
            <Pressable
              key={value || 'all-types'}
              style={[s.filterChip, isActive && s.filterChipActive]}
              onPress={() => setType(value)}
              accessibilityRole="button"
            >
              <Text style={[s.filterText, isActive && s.filterTextActive]}>{t(labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {CATEGORY_FILTERS.map(({ value, labelKey }) => {
          const isActive = category === value;
          return (
            <Pressable
              key={value || 'all'}
              style={[s.filterChip, isActive && s.filterChipActive]}
              onPress={() => setCategory(value)}
              accessibilityRole="button"
            >
              <Text style={[s.filterText, isActive && s.filterTextActive]}>{t(labelKey)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {articlesQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      ) : articlesQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => articlesQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(a) => a.id}
          renderItem={renderArticle}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyTitle}>{t('community.articles.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('community.articles.empty.body')}</Text>
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

  filterRow:       { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row',
                     alignItems: 'center' },
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

  list:            { padding: 12, paddingBottom: 80, gap: 10 },

  card:            { backgroundColor: '#fff', borderRadius: 10, padding: 14, gap: 6,
                     borderWidth: 1, borderColor: '#EEEEEE',
                     shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  badgeRow:        { flexDirection: 'row', gap: 6 },
  categoryBadge:   { alignSelf: 'flex-start', backgroundColor: '#EAF4EE', borderRadius: 8,
                     paddingHorizontal: 8, paddingVertical: 3 },
  categoryText:    { fontSize: 8, color: '#1A6B3C', fontWeight: '700', textTransform: 'uppercase' },
  typeBadge:       { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  eventBadge:      { backgroundColor: '#FEF3C7' },
  webinarBadge:    { backgroundColor: '#DBEAFE' },
  typeBadgeText:   { fontSize: 8, color: '#374151', fontWeight: '700', textTransform: 'uppercase' },
  articleTitle:    { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  summary:         { fontSize: 10, color: '#6B7280', lineHeight: 15 },
  eventDate:       { fontSize: 10, color: '#1A6B3C', fontWeight: '600' },
  meta:            { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  author:          { fontSize: 9, color: '#374151', fontWeight: '600' },
  date:            { fontSize: 9, color: '#9CA3AF' },
});
