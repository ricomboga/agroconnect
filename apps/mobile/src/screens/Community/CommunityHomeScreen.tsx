import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { communityApi } from '../../api/community';
import type { Thread, ThreadCategory } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'CommunityHome'>;
type Tab = 'discussions' | 'experts' | 'articles';
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

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommunityHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [activeTab, setActiveTab] = useState<Tab>('discussions');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  const threadsQuery = useQuery({
    queryKey: ['threads', activeCategory],
    queryFn: () =>
      communityApi.threads.list(
        activeCategory ? { category: activeCategory as ThreadCategory } : undefined,
      ),
    staleTime: isOnline ? 3 * 60 * 1000 : Infinity,
    enabled: activeTab === 'discussions',
  });

  const upvoteMutation = useMutation({
    mutationFn: (id: string) => communityApi.threads.upvote(id),
    onSuccess: (_data, id) => setUpvotedIds((prev) => new Set(prev).add(id)),
    onError: (_err, id) => setUpvotedIds((prev) => new Set(prev).add(id)),
  });

  const threads = threadsQuery.data?.data ?? [];
  const activeCategoryLabel = activeCategory ? t(`community.home.category.${activeCategory}`) : '';

  const renderThread = ({ item }: { item: Thread }) => {
    const initials = getInitials(item.authorName);
    const photos = item.photos ?? [];
    const visiblePhotos = photos.slice(0, 3);
    const extraCount = photos.length - 3;
    const alreadyUpvoted = upvotedIds.has(item.id);
    const upvotes = (item.upvoteCount ?? item.upvotes ?? 0) + (alreadyUpvoted ? 1 : 0);

    return (
      <Pressable
        style={s.card}
        onPress={() => navigation.navigate('ThreadDetail', { threadId: item.id })}
        accessibilityRole="button"
      >
        <View style={s.cardHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.authorCol}>
            <Text style={s.authorName} numberOfLines={1}>{item.authorName}</Text>
            <Text style={s.metaText}>
              {[item.authorCounty, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={s.catBadge}>
            <Text style={s.catBadgeText}>{t(`community.home.category.${item.category}`)}</Text>
          </View>
        </View>

        <Text style={s.threadTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={s.postBody} numberOfLines={2}>{item.body}</Text>

        {visiblePhotos.length > 0 && (
          <View style={s.photosRow}>
            {visiblePhotos.map((uri, idx) => (
              <View key={idx} style={s.photoBox}>
                <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
                {idx === 2 && extraCount > 0 && (
                  <View style={s.photoOverlay}>
                    <Text style={s.photoOverlayText}>+{extraCount}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={s.cardFooter}>
          <Pressable
            style={[s.footerBtn, alreadyUpvoted && s.footerBtnActive]}
            onPress={(e) => {
              e.stopPropagation();
              if (!alreadyUpvoted) upvoteMutation.mutate(item.id);
            }}
            accessibilityRole="button"
          >
            <Text style={[s.footerText, alreadyUpvoted && s.footerTextActive]}>
              👍 {upvotes}
            </Text>
          </Pressable>
          <Text style={s.footerText}>
            💬 {t('community.home.thread.replies_other', { count: item.replyCount ?? 0 })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const TABS: Array<{ key: Tab; label: string; emoji: string; onPress?: () => void }> = [
    { key: 'discussions', label: t('community.home.tabs.discussions'), emoji: '💬' },
    { key: 'experts',     label: t('community.home.tabs.experts'),     emoji: '👨‍🔬',
      onPress: () => navigation.navigate('ExpertsList') },
    { key: 'articles',    label: t('community.home.tabs.articles'),    emoji: '📖',
      onPress: () => navigation.navigate('ArticlesList') },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />

      <View style={s.topBar}>
        <Text style={s.topTitle}>{t('community.home.title')}</Text>
        {activeTab === 'discussions' && (
          <Pressable
            style={s.topAction}
            onPress={() => navigation.navigate('NewThread')}
            accessibilityRole="button"
            accessibilityLabel={t('community.home.newThread')}
          >
            <Text style={s.topActionIcon}>✏️</Text>
          </Pressable>
        )}
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map(({ key, label, emoji, onPress }) => {
          const isActive = activeTab === key;
          return (
            <Pressable
              key={key}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => { if (onPress) { onPress(); } else { setActiveTab(key); } }}
              accessibilityRole="tab"
            >
              <Text style={s.tabEmoji}>{emoji}</Text>
              <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{label}</Text>
              {isActive && <View style={s.tabUnderline} />}
            </Pressable>
          );
        })}
      </View>

      {/* Discussions tab */}
      {activeTab === 'discussions' && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chipRow}
            style={s.chipScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.value;
              return (
                <Pressable
                  key={cat.value || 'all'}
                  style={[s.chip, isActive && s.chipActive]}
                  onPress={() => setActiveCategory(cat.value)}
                  accessibilityRole="button"
                >
                  <Text style={[s.chipText, isActive && s.chipTextActive]}>
                    {t(cat.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {threadsQuery.isLoading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#1A6B3C" />
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
              contentContainerStyle={s.listContent}
              ListEmptyComponent={
                <View style={s.emptyBox}>
                  <Text style={s.emptyText}>
                    {activeCategory
                      ? t('community.home.empty.categoryBody', { category: activeCategoryLabel })
                      : t('community.home.empty.body')}
                  </Text>
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

          <Pressable
            style={s.fab}
            onPress={() => navigation.navigate('NewThread')}
            accessibilityRole="button"
            accessibilityLabel={t('community.home.newThread')}
          >
            <Text style={s.fabIcon}>✏️</Text>
          </Pressable>
        </>
      )}

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#fff' },

  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: '#1A6B3C', height: 44, paddingHorizontal: 12 },
  topTitle:         { fontSize: 15, fontWeight: '600', color: '#fff' },
  topAction:        { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  topActionIcon:    { fontSize: 22, color: 'rgba(255,255,255,0.85)' },

  tabBar:           { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1,
                      borderColor: '#E5E7EB' },
  tab:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      paddingVertical: 10, gap: 4, position: 'relative' },
  tabActive:        { },
  tabEmoji:         { fontSize: 14 },
  tabLabel:         { fontSize: 9, fontWeight: '500', color: '#6B7280' },
  tabLabelActive:   { color: '#1A6B3C', fontWeight: '700' },
  tabUnderline:     { position: 'absolute', bottom: 0, left: 8, right: 8, height: 2,
                      backgroundColor: '#1A6B3C', borderRadius: 1 },

  chipScroll:       { maxHeight: 42 },
  chipRow:          { paddingHorizontal: 11, paddingTop: 6, paddingBottom: 4, gap: 6,
                      flexDirection: 'row', alignItems: 'center' },
  chip:             { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                      borderWidth: 1, borderColor: '#1A6B3C', backgroundColor: '#fff',
                      minHeight: 28, justifyContent: 'center' },
  chipActive:       { backgroundColor: '#1A6B3C' },
  chipText:         { fontSize: 9, fontWeight: '500', color: '#1A6B3C' },
  chipTextActive:   { color: '#fff', fontWeight: '600' },

  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:        { fontSize: 12, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  retryBtn:         { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20,
                      backgroundColor: '#EAF4EE', borderRadius: 6 },
  retryLabel:       { fontSize: 10, color: '#1A6B3C', fontWeight: '600' },

  listContent:      { padding: 10, paddingBottom: 100 },

  card:             { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
                      borderRadius: 8, padding: 10, marginBottom: 8,
                      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },

  cardHeader:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  avatar:           { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A6B3C',
                      alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontWeight: '700', fontSize: 10, color: '#fff' },
  authorCol:        { flex: 1 },
  authorName:       { fontWeight: '700', fontSize: 10, color: '#111827' },
  metaText:         { fontSize: 8, color: '#6B7280' },
  catBadge:         { backgroundColor: '#EAF4EE', borderRadius: 8, paddingHorizontal: 6,
                      paddingVertical: 2 },
  catBadgeText:     { fontSize: 7, fontWeight: '600', color: '#0D4A28' },

  threadTitle:      { fontSize: 11, fontWeight: '700', color: '#111827', marginBottom: 2 },
  postBody:         { fontSize: 9, color: '#374151', lineHeight: 14, marginBottom: 5 },

  photosRow:        { flexDirection: 'row', gap: 4, marginBottom: 5 },
  photoBox:         { width: 56, height: 56, borderRadius: 4, backgroundColor: '#EAF4EE',
                      overflow: 'hidden' },
  photoImg:         { width: 56, height: 56 },
  photoOverlay:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center',
                      justifyContent: 'center' },
  photoOverlayText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  cardFooter:       { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  footerBtn:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
                      paddingVertical: 3, borderRadius: 4, minHeight: 28 },
  footerBtnActive:  { backgroundColor: '#EAF4EE' },
  footerText:       { fontSize: 9, color: '#6B7280' },
  footerTextActive: { color: '#1A6B3C', fontWeight: '700' },

  emptyBox:         { marginTop: 32, marginHorizontal: 11, borderWidth: 1.5, borderColor: '#E5E7EB',
                      borderStyle: 'dashed', borderRadius: 8, padding: 24, alignItems: 'center', gap: 8 },
  emptyText:        { fontSize: 10, color: '#6B7280', textAlign: 'center', lineHeight: 15 },
  emptyCta:         { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20,
                      backgroundColor: '#1A6B3C', borderRadius: 6 },
  emptyCtaText:     { fontSize: 10, color: '#fff', fontWeight: '600' },

  fab:              { position: 'absolute', bottom: 72, right: 16, width: 48, height: 48,
                      borderRadius: 24, backgroundColor: '#1A6B3C', alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#1A6B3C', shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
  fabIcon:          { fontSize: 20 },

});
