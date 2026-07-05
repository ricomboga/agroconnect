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
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../stores/authStore';
import { useCommunitySocket } from '../../hooks/useCommunitySocket';
import { communityApi } from '../../api/community';
import type { Reply, Thread } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'ThreadDetail'>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

export function ThreadDetailScreen({ navigation, route }: Props) {
  const { threadId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const [extraReplies, setExtraReplies] = useState<Reply[]>([]);
  const [upvotedThread, setUpvotedThread] = useState(false);
  const [upvotedReplies, setUpvotedReplies] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList<Reply>>(null);

  const threadQuery = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => communityApi.threads.get(threadId),
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const onNewReply = useCallback((reply: Reply) => {
    setExtraReplies((prev) => {
      if (prev.some((r) => r.id === reply.id)) return prev;
      return [...prev, reply];
    });
    scrollToBottom();
  }, [scrollToBottom]);

  useCommunitySocket(threadId, onNewReply);

  const authorName = currentUser?.fullName ?? currentUser?.phone ?? 'Farmer';

  const replyMutation = useMutation({
    mutationFn: () =>
      communityApi.threads.reply(threadId, { body: replyText, authorName }),
    onSuccess: (res) => {
      setExtraReplies((prev) => {
        if (prev.some((r) => r.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setReplyText('');
      scrollToBottom();
      void queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });

  const upvoteThreadMutation = useMutation({
    mutationFn: () => communityApi.threads.upvote(threadId),
    onSuccess: () => setUpvotedThread(true),
    onError: (err: { status?: number }) => {
      if (err?.status === 409) setUpvotedThread(true);
    },
  });

  const upvoteReplyMutation = useMutation({
    mutationFn: (replyId: string) => communityApi.replies.upvote(replyId),
    onSuccess: (_data, replyId) => {
      setUpvotedReplies((prev) => new Set(prev).add(replyId));
      void queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    },
    onError: (_err, replyId: string) => {
      setUpvotedReplies((prev) => new Set(prev).add(replyId));
    },
  });

  const reportReplyMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      communityApi.replies.report(id, reason),
    onSuccess: () => {
      Alert.alert(t('community.thread.reportSuccess'), t('community.thread.reportSuccessBody'));
    },
  });

  const handleReportReply = (replyId: string) => {
    Alert.alert(
      t('community.thread.reportTitle'),
      t('community.thread.reportBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('community.thread.report'),
          style: 'destructive',
          onPress: () => reportReplyMutation.mutate({ id: replyId, reason: 'user_report' }),
        },
      ],
    );
  };

  if (threadQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>← {t('common.back')}</Text>
          </Pressable>
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
      </SafeAreaView>
    );
  }

  if (threadQuery.isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
            <Text style={s.backLabel}>← {t('common.back')}</Text>
          </Pressable>
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => threadQuery.refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const thread = threadQuery.data?.data.thread as Thread | undefined;
  const baseReplies = threadQuery.data?.data.replies ?? [];
  const allReplies = [...baseReplies, ...extraReplies].filter(
    (r, i, arr) => arr.findIndex((x) => x.id === r.id) === i,
  );
  if (!thread) return null;

  const threadPhotos = thread.photos ?? [];
  const currentUpvotes = (thread.upvoteCount ?? thread.upvotes ?? 0) + (upvotedThread ? 1 : 0);

  const OriginalPost = () => (
    <View style={s.originalCard}>
      <View style={s.postHeader}>
        <View style={s.authorAvatar}>
          <Text style={s.authorAvatarText}>{getInitials(thread.authorName)}</Text>
        </View>
        <View style={s.authorInfo}>
          <Text style={s.postAuthorName}>{thread.authorName}</Text>
          <Text style={s.postMeta}>
            {[thread.authorCounty, timeAgo(thread.createdAt)].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <Text style={s.postTitle}>{thread.title}</Text>
      <Text style={s.postBody}>{thread.body}</Text>

      {threadPhotos.length > 0 && (
        <View style={s.photosRow}>
          {threadPhotos.slice(0, 3).map((uri: string, idx: number) => (
            <View key={idx} style={s.photoBox}>
              <Image source={{ uri }} style={s.photoImg} resizeMode="cover" />
              {idx === 2 && threadPhotos.length > 3 && (
                <View style={s.photoOverlay}>
                  <Text style={s.photoOverlayText}>+{threadPhotos.length - 3}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={s.postFooter}>
        <Pressable
          style={[s.footerAction, upvotedThread && s.footerActionActive]}
          onPress={() => { if (!upvotedThread) upvoteThreadMutation.mutate(); }}
          accessibilityRole="button"
        >
          <Text style={[s.footerActionText, upvotedThread && s.footerActionTextActive]}>
            👍 {currentUpvotes}
          </Text>
        </Pressable>
        <Text style={s.footerMeta}>
          💬 {t('community.home.thread.replies_other', { count: allReplies.length })}
        </Text>
      </View>
    </View>
  );

  const RepliesHeader = () => (
    <View style={s.repliesHeaderRow}>
      <View style={s.repliesDivider} />
      <Text style={s.repliesHeader}>
        {t('community.thread.repliesHeader', { count: allReplies.length })}
      </Text>
      <View style={s.repliesDivider} />
    </View>
  );

  const renderReply = ({ item }: { item: Reply }) => {
    const isOwn = item.authorId === currentUser?.id;
    const isExpert = !isOwn && (item.isExpert || item.isVerified || item.isExpertVerified);
    const initials = getInitials(item.authorName);
    const alreadyUpvoted = upvotedReplies.has(item.id);
    const replyUpvotes = (item.upvoteCount ?? item.upvotes ?? 0) + (alreadyUpvoted ? 1 : 0);

    if (isOwn) {
      return (
        <View style={s.ownRow}>
          <View style={s.ownBubble}>
            <Text style={s.ownBody}>{item.body}</Text>
            <Text style={s.ownMeta}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      );
    }

    const actions = (
      <View style={s.replyActions}>
        <Pressable
          style={[s.actionBtn, alreadyUpvoted && s.actionBtnActive]}
          onPress={() => { if (!alreadyUpvoted) upvoteReplyMutation.mutate(item.id); }}
          accessibilityRole="button"
        >
          <Text style={[s.actionBtnText, alreadyUpvoted && s.actionBtnTextActive]}>
            👍 {replyUpvotes}
          </Text>
        </Pressable>
        <Pressable
          style={s.actionBtn}
          onPress={() => handleReportReply(item.id)}
          accessibilityRole="button"
        >
          <Text style={s.actionBtnText}>{t('community.thread.report')}</Text>
        </Pressable>
      </View>
    );

    if (isExpert) {
      return (
        <View style={s.otherRow}>
          <View style={s.expertAvatar}>
            <Text style={s.expertAvatarText}>{initials}</Text>
          </View>
          <View style={s.expertBubble}>
            <View style={s.nameRow}>
              <Text style={s.replyAuthorName}>{item.authorName}</Text>
              <View style={s.expertBadge}>
                <Text style={s.expertBadgeText}>
                  ✓ {item.authorRole ?? t('community.thread.expert')}
                </Text>
              </View>
            </View>
            <Text style={s.otherMeta}>{timeAgo(item.createdAt)}</Text>
            <Text style={s.otherBody}>{item.body}</Text>
            {actions}
          </View>
        </View>
      );
    }

    return (
      <View style={s.otherRow}>
        <View style={s.regularAvatar}>
          <Text style={s.regularAvatarText}>{initials}</Text>
        </View>
        <View style={s.regularBubble}>
          <Text style={s.replyAuthorName}>{item.authorName}</Text>
          <Text style={s.otherMeta}>{timeAgo(item.createdAt)}</Text>
          <Text style={s.otherBody}>{item.body}</Text>
          {actions}
        </View>
      </View>
    );
  };

  const userInitials = getInitials(authorName);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle} numberOfLines={1}>{thread.title}</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={allReplies}
          keyExtractor={(item) => item.id}
          renderItem={renderReply}
          ListHeaderComponent={
            <>
              <OriginalPost />
              <RepliesHeader />
            </>
          }
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyReplies}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.emptyTitle}>{t('community.thread.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('community.thread.empty.body')}</Text>
            </View>
          }
        />

        <View style={s.inputBar}>
          <View style={s.userAvatar}>
            <Text style={s.userAvatarText}>{userInitials}</Text>
          </View>
          <TextInput
            style={s.input}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={t('community.thread.replyPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
          <Pressable
            style={[s.sendBtn, (!replyText.trim() || replyMutation.isPending) && s.sendBtnDisabled]}
            onPress={() => replyMutation.mutate()}
            disabled={!replyText.trim() || replyMutation.isPending}
            accessibilityRole="button"
          >
            {replyMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.sendBtnText}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: '#F3F4F6' },
  flex:               { flex: 1 },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:          { fontSize: 12, color: '#DC2626', marginBottom: 12, textAlign: 'center' },
  retryBtn:           { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center',
                        backgroundColor: '#EAF4EE', borderRadius: 6 },
  retryLabel:         { fontSize: 10, color: '#1A6B3C', fontWeight: '600' },

  topBar:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: '#1A6B3C', height: 44, paddingHorizontal: 12 },
  backBtn:            { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:          { fontSize: 12, color: '#fff', fontWeight: '600' },
  topTitle:           { flex: 1, fontSize: 13, fontWeight: '600', color: '#fff',
                        textAlign: 'center', marginHorizontal: 4 },

  listContent:        { paddingHorizontal: 12, paddingBottom: 8 },

  // Original post card
  originalCard:       { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 10,
                        marginBottom: 4, shadowColor: '#000', shadowOpacity: 0.04,
                        shadowRadius: 4, elevation: 1 },
  postHeader:         { flexDirection: 'row', gap: 8, marginBottom: 8 },
  authorAvatar:       { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A6B3C',
                        alignItems: 'center', justifyContent: 'center' },
  authorAvatarText:   { fontWeight: '700', fontSize: 10, color: '#fff' },
  authorInfo:         { flex: 1, justifyContent: 'center' },
  nameRow:            { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap',
                        marginBottom: 2 },
  postAuthorName:     { fontWeight: '700', fontSize: 11, color: '#111827' },
  postMeta:           { fontSize: 9, color: '#6B7280' },
  postTitle:          { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 5 },
  postBody:           { fontSize: 11, color: '#374151', lineHeight: 16, marginBottom: 8 },
  photosRow:          { flexDirection: 'row', gap: 4, marginBottom: 8 },
  photoBox:           { width: 80, height: 80, borderRadius: 6, backgroundColor: '#EAF4EE',
                        overflow: 'hidden' },
  photoImg:           { width: 80, height: 80 },
  photoOverlay:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center',
                        justifyContent: 'center' },
  photoOverlayText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  postFooter:         { flexDirection: 'row', gap: 8, alignItems: 'center' },
  footerAction:       { minHeight: 28, justifyContent: 'center', paddingHorizontal: 6,
                        borderRadius: 4 },
  footerActionActive: { backgroundColor: '#EAF4EE' },
  footerActionText:   { fontSize: 9, color: '#6B7280' },
  footerActionTextActive: { color: '#1A6B3C', fontWeight: '700' },
  footerMeta:         { fontSize: 9, color: '#6B7280' },

  // Replies section header
  repliesHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  repliesDivider:     { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  repliesHeader:      { fontSize: 9, fontWeight: '700', color: '#9CA3AF',
                        textTransform: 'uppercase', letterSpacing: 0.5 },

  // Own message (right-aligned green bubble)
  ownRow:             { alignItems: 'flex-end', marginBottom: 8 },
  ownBubble:          { backgroundColor: '#1A6B3C', borderRadius: 14, borderBottomRightRadius: 3,
                        paddingHorizontal: 12, paddingVertical: 8, maxWidth: '78%' },
  ownBody:            { fontSize: 11, color: '#fff', lineHeight: 16 },
  ownMeta:            { fontSize: 8, color: 'rgba(255,255,255,0.65)', marginTop: 4,
                        textAlign: 'right' },

  // Others' messages (left-aligned)
  otherRow:           { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  regularAvatar:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#6B7280',
                        alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  regularAvatarText:  { fontWeight: '700', fontSize: 9, color: '#fff' },
  regularBubble:      { flex: 1, backgroundColor: '#fff', borderRadius: 14,
                        borderBottomLeftRadius: 3, paddingHorizontal: 10, paddingVertical: 8,
                        maxWidth: '82%' },
  expertAvatar:       { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1D4ED8',
                        alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  expertAvatarText:   { fontWeight: '700', fontSize: 9, color: '#fff' },
  expertBubble:       { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 14,
                        borderBottomLeftRadius: 3, borderLeftWidth: 3, borderLeftColor: '#1D4ED8',
                        paddingHorizontal: 10, paddingVertical: 8, maxWidth: '82%' },
  expertBadge:        { backgroundColor: '#CFFAFE', borderRadius: 8, paddingHorizontal: 5,
                        paddingVertical: 1 },
  expertBadgeText:    { fontSize: 8, fontWeight: '600', color: '#0E7490' },
  replyAuthorName:    { fontWeight: '700', fontSize: 10, color: '#111827' },
  otherMeta:          { fontSize: 8, color: '#9CA3AF', marginTop: 1, marginBottom: 4 },
  otherBody:          { fontSize: 11, color: '#374151', lineHeight: 16 },

  // Reply action buttons
  replyActions:       { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn:          { minHeight: 26, justifyContent: 'center', paddingHorizontal: 4,
                        borderRadius: 4 },
  actionBtnActive:    { backgroundColor: '#EAF4EE' },
  actionBtnText:      { fontSize: 8, color: '#9CA3AF' },
  actionBtnTextActive: { color: '#1A6B3C', fontWeight: '700' },

  // Empty state
  emptyReplies:       { paddingVertical: 32, alignItems: 'center', gap: 6 },
  emptyIcon:          { fontSize: 32 },
  emptyTitle:         { fontSize: 13, fontWeight: '600', color: '#374151' },
  emptyBody:          { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },

  // Input bar
  inputBar:           { flexDirection: 'row', alignItems: 'flex-end', gap: 8,
                        backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E7EB',
                        paddingVertical: 8, paddingHorizontal: 12 },
  userAvatar:         { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A6B3C',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  userAvatarText:     { fontWeight: '700', fontSize: 9, color: '#fff' },
  input:              { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
                        paddingVertical: 8, paddingHorizontal: 14, color: '#111827',
                        backgroundColor: '#F9FAFB', minHeight: 36, maxHeight: 100, fontSize: 11 },
  sendBtn:            { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A6B3C',
                        alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendBtnDisabled:    { backgroundColor: '#D1D5DB' },
  sendBtnText:        { color: '#fff', fontSize: 15, fontWeight: '700' },
});
