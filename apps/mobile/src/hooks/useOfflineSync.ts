import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import { SyncQueueModel } from '../database/models/SyncQueue';
import api from '../lib/api';

export interface QueuedOp {
  id?: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  endpoint: string;
  payload: string;
  created_at?: string;
  status?: 'pending' | 'failed';
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const database = useDatabase();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const subscription = database
      .get<SyncQueueModel>('sync_queue')
      .query(Q.where('status', 'pending'))
      .observeCount()
      .subscribe(setPendingCount);
    return () => subscription.unsubscribe();
  }, [database]);

  const queueWrite = useCallback(
    async (op: QueuedOp) => {
      await database.write(async () => {
        await database.get<SyncQueueModel>('sync_queue').create((record) => {
          record.operation = op.operation;
          record.entity = op.entity;
          record.endpoint = op.endpoint;
          record.payload = op.payload;
          record.status = 'pending';
        });
      });
    },
    [database],
  );

  const syncNow = useCallback(async () => {
    if (!isOnline) return;
    const pending = await database
      .get<SyncQueueModel>('sync_queue')
      .query(Q.where('status', 'pending'))
      .fetch();

    for (const item of pending) {
      try {
        await api({
          method:
            item.operation === 'CREATE' ? 'POST' :
            item.operation === 'UPDATE' ? 'PATCH' : 'DELETE',
          url: item.endpoint,
          data: JSON.parse(item.payload) as unknown,
        });
        await database.write(async () => {
          await item.destroyPermanently();
        });
      } catch (err) {
        const lastError = err instanceof Error ? err.message : 'Unknown error';
        await database.write(async () => {
          await item.update((r) => {
            r.status = 'failed';
            r.lastError = lastError;
          });
        });
      }
    }
  }, [isOnline, database]);

  useEffect(() => {
    if (isOnline) {
      void syncNow();
    }
  }, [isOnline, syncNow]);

  return { isOnline, queueWrite, pendingCount, syncNow };
}
