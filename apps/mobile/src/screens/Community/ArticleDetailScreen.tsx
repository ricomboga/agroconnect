import React from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { communityApi } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

const API_TO_MOBILE: Record<string, string> = {
  crop_advice:         'crops',
  livestock_health:    'livestock',
  market_talk:         'market',
  weather_climate:     'weather',
  finance_business:    'finance',
  government_programs: 'government',
  success_stories:     'success',
  equipment_tools:     'tools',
};

function categoryLabelKey(apiCategory: string): string {
  const mobile = API_TO_MOBILE[apiCategory] ?? apiCategory;
  return `community.home.category.${mobile}`;
}

type Props = NativeStackScreenProps<CommunityStackParamList, 'ArticleDetail'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function ArticleDetailScreen({ navigation, route }: Props) {
  const { slug } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const articleQuery = useQuery({
    queryKey: ['article', slug],
    queryFn: () => communityApi.articles.get(slug),
    staleTime: isOnline ? 30 * 60 * 1000 : Infinity,
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('community.articles.title')}</Text>
        <View style={s.backBtn} />
      </View>

      {articleQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      ) : articleQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => articleQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {articleQuery.data?.data && (
            <>
              <View style={s.categoryBadge}>
                <Text style={s.categoryText}>{t(categoryLabelKey(articleQuery.data.data.category))}</Text>
              </View>
              <Text style={s.title}>{articleQuery.data.data.title}</Text>
              <View style={s.meta}>
                <Text style={s.author}>{articleQuery.data.data.authorName}</Text>
                <Text style={s.date}>{formatDate(articleQuery.data.data.publishedAt)}</Text>
              </View>
              <View style={s.divider} />
              <Text style={s.summary}>{articleQuery.data.data.summary}</Text>
              <View style={s.divider} />
              <Text style={s.body}>{articleQuery.data.data.body}</Text>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#fff' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:     { fontSize: 12, color: '#DC2626', marginBottom: 10, textAlign: 'center' },
  retryBtn:      { minHeight: 40, paddingHorizontal: 16, justifyContent: 'center',
                   backgroundColor: '#EAF4EE', borderRadius: 6 },
  retryLabel:    { fontSize: 10, color: '#1A6B3C', fontWeight: '600' },

  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 12, height: 44, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  backBtn:       { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:     { fontSize: 12, color: '#1A6B3C', fontWeight: '600' },
  topTitle:      { fontSize: 13, fontWeight: '600', color: '#111827' },

  scroll:        { padding: 16, paddingBottom: 48 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#EAF4EE', borderRadius: 8,
                   paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  categoryText:  { fontSize: 9, color: '#1A6B3C', fontWeight: '700', textTransform: 'uppercase' },
  title:         { fontSize: 18, fontWeight: '800', color: '#111827', lineHeight: 24, marginBottom: 8 },
  meta:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  author:        { fontSize: 11, color: '#374151', fontWeight: '600' },
  date:          { fontSize: 11, color: '#9CA3AF' },
  divider:       { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  summary:       { fontSize: 13, color: '#374151', lineHeight: 20, fontStyle: 'italic', marginBottom: 4 },
  body:          { fontSize: 12, color: '#374151', lineHeight: 20 },
});
