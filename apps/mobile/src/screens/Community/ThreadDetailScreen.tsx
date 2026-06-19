import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useCommunitySocket } from '../../hooks/useCommunitySocket';
import { communityApi } from '../../api/community';
import type { Reply, ThreadCategory } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'ThreadDetail'>;

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

export function ThreadDetailScreen({ navigation, route }: Props) {
  const { threadId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const [extraReplies, setExtraReplies] = useState<Reply[]>([]);
  const listRef = useRef<FlatList<Reply>>(null);

  const threadQuery = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => communityApi.threads.get(threadId),
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
  });

  const onNewReply = useCallback((reply: Reply) => {
    setExtraReplies((prev) => [...prev, reply]);
    // scroll to bottom on next tick
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useCommunitySocket(threadId, onNewReply);

  const replyMutation = useMutation({
    mutationFn: () => communityApi.threads.reply(threadId, replyText),
    onSuccess: (res) => {
      setExtraReplies((prev) => [...prev, res.data]);
      setReplyText('');
      void queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });

  if (threadQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  if (threadQuery.isError) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => threadQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const thread = threadQuery.data?.data.thread;
  const baseReplies = threadQuery.data?.data.replies ?? [];
  const allReplies = [...baseReplies, ...extraReplies];
  if (!thread) return null;

  const catColor = CATEGORY_COLOR[thread.category];
  const catBg = CATEGORY_BG[thread.category];

  const ThreadHeader = () => (
    <View style={s.threadHeader}>
      <View style={[s.catTag, { backgroundColor: catBg }]}>
        <Text style={[s.catTagText, { color: catColor }]}>
          {t(`community.home.category.${thread.category}`)}
        </Text>
      </View>
      <Text style={s.threadTitle}>{thread.title}</Text>
      <Text style={s.threadBody}>{thread.body}</Text>
      <View style={s.authorRow}>
        <View style={s.authorLeft}>
          <Text style={s.authorName}>{thread.authorName}</Text>
          {thread.isExpert && (
            <View style={s.expertBadge}>
              <Text style={s.expertBadgeText}>{t('community.thread.expert')}</Text>
            </View>
          )}
        </View>
        <Text style={s.timeAgo}>{timeAgo(thread.createdAt)}</Text>
      </View>
      <Pressable style={s.upvoteRow} accessibilityRole="button">
        <Text style={s.upvoteText}>⬆ {thread.upvoteCount} {t('community.thread.upvote')}</Text>
      </Pressable>
      <View style={s.divider} />
    </View>
  );

  const renderReply = ({ item }: { item: Reply }) => (
    <View style={[s.replyCard, item.isVerified && s.replyVerified]}>
      <View style={s.replyHeader}>
        <View style={s.authorLeft}>
          <Text style={s.authorName}>{item.authorName}</Text>
          {item.isExpert && (
            <Pressable
              onPress={() => navigation.navigate('ExpertProfile', { expertId: item.authorId })}
              accessibilityRole="button"
            >
              <View style={s.expertBadge}>
                <Text style={s.expertBadgeText}>{t('community.thread.expert')}</Text>
              </View>
            </Pressable>
          )}
        </View>
        <Text style={s.timeAgo}>{timeAgo(item.createdAt)}</Text>
      </View>
      {item.isVerified && (
        <View style={s.verifiedBar}>
          <Text style={s.verifiedText}>✓ {t('community.thread.verified')}</Text>
        </View>
      )}
      <Text style={s.replyBody}>{item.body}</Text>
      <Pressable style={s.replyUpvote} accessibilityRole="button">
        <Text style={s.replyUpvoteText}>⬆ {item.upvoteCount}</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle} numberOfLines={1}>{t('community.thread.title')}</Text>
          <View style={s.backBtn} />
        </View>

        <FlatList
          ref={listRef}
          data={allReplies}
          keyExtractor={(item) => item.id}
          renderItem={renderReply}
          ListHeaderComponent={<ThreadHeader />}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyReplies}>
              <Text style={s.emptyTitle}>{t('community.thread.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('community.thread.empty.body')}</Text>
            </View>
          }
        />

        {/* Pinned reply input */}
        <View style={s.replyInputRow}>
          <TextInput
            style={s.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={t('community.thread.replyPlaceholder')}
            placeholderTextColor="#BDBDBD"
            multiline
            maxLength={500}
          />
          <Pressable
            style={[s.sendBtn, (!replyText.trim() || replyMutation.isPending) && s.sendBtnDisabled]}
            onPress={() => replyMutation.mutate()}
            disabled={!replyText.trim() || replyMutation.isPending}
            accessibilityRole="button"
          >
            {replyMutation.isPending
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={s.sendBtnText}>{t('community.thread.send')}</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  flex:           { flex: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:      { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:       { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel:     { fontSize: 15, color: '#2E7D32', fontWeight: '600' },

  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:        { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:      { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1, textAlign: 'center' },

  list:           { paddingHorizontal: 14, paddingBottom: 16 },

  threadHeader:   { paddingTop: 16, paddingBottom: 12 },
  catTag:         { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 8 },
  catTagText:     { fontSize: 11, fontWeight: '700' },
  threadTitle:    { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 8, lineHeight: 24 },
  threadBody:     { fontSize: 14, color: '#333', lineHeight: 22, marginBottom: 12 },
  authorRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  authorLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName:     { fontSize: 13, color: '#555', fontWeight: '600' },
  timeAgo:        { fontSize: 12, color: '#BDBDBD' },
  expertBadge:    { backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  expertBadgeText:{ fontSize: 10, fontWeight: '700', color: '#2E7D32' },
  upvoteRow:      { minHeight: 36, justifyContent: 'center' },
  upvoteText:     { fontSize: 13, color: '#757575', fontWeight: '600' },
  divider:        { height: 1, backgroundColor: '#EEEEEE', marginTop: 12 },

  replyCard:      { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  replyVerified:  { borderColor: '#A5D6A7', borderWidth: 1.5 },
  replyHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  verifiedBar:    { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8, alignSelf: 'flex-start' },
  verifiedText:   { fontSize: 11, color: '#2E7D32', fontWeight: '700' },
  replyBody:      { fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 8 },
  replyUpvote:    { minHeight: 32, justifyContent: 'center' },
  replyUpvoteText:{ fontSize: 12, color: '#9E9E9E', fontWeight: '600' },

  emptyReplies:   { paddingVertical: 24, alignItems: 'center', gap: 4 },
  emptyTitle:     { fontSize: 15, fontWeight: '600', color: '#424242' },
  emptyBody:      { fontSize: 13, color: '#757575' },

  replyInputRow:  { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEEEEE', gap: 8 },
  replyInput:     { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1A1A1A', maxHeight: 100, minHeight: 44 },
  sendBtn:        { minWidth: 64, minHeight: 44, backgroundColor: '#2E7D32', borderRadius: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  sendBtnDisabled:{ backgroundColor: '#A5D6A7' },
  sendBtnText:    { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
