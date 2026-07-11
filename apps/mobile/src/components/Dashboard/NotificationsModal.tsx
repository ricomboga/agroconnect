import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { AppNotification } from '../../api/notifications';
import { useNotifications } from '../../hooks/useNotifications';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
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

export function NotificationsModal({ visible, onClose }: NotificationsModalProps) {
  const { t } = useTranslation();
  const { notifications, isLoading, isError, markRead } = useNotifications();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.topBar}>
          <Text style={s.topTitle}>{t('dashboard.notifications.title')}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text style={s.closeBtn}>{t('common.back')}</Text>
          </Pressable>
        </View>

        {isLoading && (
          <View style={s.center}><ActivityIndicator size="large" color="#1A6B3C" /></View>
        )}

        {isError && (
          <View style={s.center}>
            <Text style={s.emptyText}>{t('common.error.loadFailed')}</Text>
          </View>
        )}

        {!isLoading && !isError && (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.list}
            ListEmptyComponent={
              <View style={s.center}>
                <Text style={s.emptyText}>{t('dashboard.notifications.empty')}</Text>
              </View>
            }
            renderItem={({ item }: { item: AppNotification }) => (
              <Pressable
                style={[s.row, !item.read && s.rowUnread]}
                onPress={() => { if (!item.read) markRead(item.id); }}
                accessibilityRole="button"
              >
                {!item.read && <View style={s.dot} />}
                <View style={s.rowBody}>
                  <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.rowText} numberOfLines={2}>{item.body}</Text>
                  <Text style={s.rowTime}>{timeAgo(item.createdAt)}</Text>
                </View>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={s.separator} />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#fff' },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEEEEE' },
  topTitle:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  closeBtn:  { fontSize: 14, color: '#1A6B3C', fontWeight: '600' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 13, color: '#757575', textAlign: 'center' },
  list:      { flexGrow: 1, padding: 16 },
  row:       { flexDirection: 'row', gap: 8, paddingVertical: 10 },
  rowUnread: { backgroundColor: '#F0FDF4', marginHorizontal: -12, paddingHorizontal: 12, borderRadius: 8 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1A6B3C', marginTop: 6 },
  rowBody:   { flex: 1, gap: 2 },
  rowTitle:  { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  rowText:   { fontSize: 12, color: '#555' },
  rowTime:   { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#F1F1F1' },
});
