import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { SyncQueueModel } from '../../database/models/SyncQueue';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'OfflineStatus'>;

const LAST_SYNC_KEY = 'agroconnect_last_synced_at';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dakika zilizopita`;
  const h = Math.floor(m / 60);
  if (h < 24) return `saa ${h} zilizopita`;
  return `siku ${Math.floor(h / 24)} zilizopita`;
}

export function OfflineStatusScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline, pendingCount, syncNow } = useOfflineSync();
  const database = useDatabase();
  const [pendingOps, setPendingOps] = useState<SyncQueueModel[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(LAST_SYNC_KEY).then(setLastSyncedAt);
  }, []);

  useEffect(() => {
    const subscription = database
      .get<SyncQueueModel>('sync_queue')
      .query(Q.where('status', 'pending'))
      .observe()
      .subscribe(setPendingOps);
    return () => subscription.unsubscribe();
  }, [database]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SYNC_KEY, now);
      setLastSyncedAt(now);
    } finally {
      setSyncing(false);
    }
  };

  const OP_LABEL: Record<string, string> = {
    CREATE: t('profile.offline.opLabel.CREATE'),
    UPDATE: t('profile.offline.opLabel.UPDATE'),
    DELETE: t('profile.offline.opLabel.DELETE'),
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('profile.offline.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Network status */}
        <View style={s.statusCard}>
          <Text style={s.statusCardLabel}>{t('profile.offline.networkLabel')}</Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: isOnline ? '#2E7D32' : '#B71C1C' }]} />
            <Text style={[s.statusText, { color: isOnline ? '#2E7D32' : '#B71C1C' }]}>
              {isOnline ? t('profile.offline.online') : t('profile.offline.offline')}
            </Text>
          </View>
        </View>

        {/* Pending count */}
        <View style={s.pendingCard}>
          {pendingCount > 0 ? (
            <>
              <Text style={s.pendingTitle}>
                {t('profile.offline.pendingCount', { count: pendingCount })}
              </Text>
              {pendingOps.map((op) => (
                <View key={op.id} style={s.opRow}>
                  <View style={s.opDot} />
                  <View style={s.opInfo}>
                    <Text style={s.opLabel}>{OP_LABEL[op.operation] ?? op.operation} · {op.entity}</Text>
                    <Text style={s.opTime}>{timeAgo(op.createdAt.toISOString())}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={s.emptyPending}>
              <Text style={s.emptyPendingIcon}>✓</Text>
              <Text style={s.emptyPendingText}>{t('profile.offline.noPending')}</Text>
            </View>
          )}
        </View>

        {/* Last synced */}
        <Text style={s.lastSynced}>
          {lastSyncedAt
            ? t('profile.offline.lastSynced', { time: new Date(lastSyncedAt).toLocaleTimeString() })
            : t('profile.offline.neverSynced')}
        </Text>

        {/* Sync button */}
        <Pressable
          style={[s.syncBtn, (!isOnline || syncing) && s.syncBtnDisabled]}
          onPress={() => void handleSync()}
          disabled={!isOnline || syncing}
          accessibilityRole="button"
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={s.syncBtnLabel}>{t('profile.offline.syncBtn')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#FAFAFA' },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:          { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:        { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:         { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:           { padding: 16, paddingBottom: 48 },

  statusCard:       { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE', padding: 16, marginBottom: 12 },
  statusCardLabel:  { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statusRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot:        { width: 12, height: 12, borderRadius: 6 },
  statusText:       { fontSize: 16, fontWeight: '700' },

  pendingCard:      { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#EEEEEE', padding: 16, marginBottom: 12 },
  pendingTitle:     { fontSize: 15, fontWeight: '700', color: '#E65100', marginBottom: 12 },
  opRow:            { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  opDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E65100', marginTop: 5 },
  opInfo:           { flex: 1, gap: 2 },
  opLabel:          { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  opTime:           { fontSize: 12, color: '#888' },
  emptyPending:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyPendingIcon: { fontSize: 20, color: '#2E7D32' },
  emptyPendingText: { fontSize: 15, color: '#2E7D32', fontWeight: '600' },

  lastSynced:       { fontSize: 13, color: '#9E9E9E', textAlign: 'center', marginBottom: 16 },

  syncBtn:          { minHeight: 52, backgroundColor: '#2E7D32', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  syncBtnDisabled:  { backgroundColor: '#A5D6A7' },
  syncBtnLabel:     { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
