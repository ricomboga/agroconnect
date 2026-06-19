import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Platform, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Database } from '@nozbe/watermelondb';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import Constants from 'expo-constants';

import { schema } from './src/database/schema';
import { FarmModel } from './src/database/models/Farm';
import { ActivityModel } from './src/database/models/Activity';
import { InputModel } from './src/database/models/Input';
import { HarvestModel } from './src/database/models/Harvest';
import { SyncQueueModel } from './src/database/models/SyncQueue';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useUiStore } from './src/store/ui.store';
import { initI18n } from './src/i18n';
import { useAuthStore } from './src/stores/authStore';

// ── WatermelonDB ────────────────────────────────────────────────────────────
function buildDatabase(): { db: Database | null; error: string | null } {
  try {
    const isExpoGo = Constants.appOwnership === 'expo';
    let adapter;

    if (Platform.OS === 'web' || isExpoGo) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
      adapter = new LokiJSAdapter({ schema, useWebWorker: false, useIncrementalIndexedDB: false });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default;
      adapter = new SQLiteAdapter({
        schema,
        jsi: Platform.OS === 'ios',
        onSetUpError: (e: Error) => console.error('WatermelonDB setup error', e),
      });
    }

    const db = new Database({
      adapter,
      modelClasses: [FarmModel, ActivityModel, InputModel, HarvestModel, SyncQueueModel],
    });
    return { db, error: null };
  } catch (e) {
    return { db: null, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

const { db: database, error: dbError } = buildDatabase();

// ── React Query ────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } },
});

// ── Dev navigation ref ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const navRef = createNavigationContainerRef<any>();
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__nav__ = navRef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__queryClient__ = queryClient;
}

// ── Toast overlay ──────────────────────────────────────────────────────────
function ToastOverlay() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 3000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  const bg =
    toast.severity === 'error'   ? '#B00020' :
    toast.severity === 'success' ? '#2E7D32' :
    toast.severity === 'warning' ? '#F59E0B' : '#1565C0';

  return (
    <View style={[toastStyles.container, { backgroundColor: bg }]}>
      <Text style={toastStyles.text}>{toast.message}</Text>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 32, left: 24, right: 24,
    borderRadius: 8, padding: 14, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, zIndex: 9999,
  },
  text: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});

// ── Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const { t } = useTranslation();
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      initI18n(),
      useAuthStore.getState().restoreSession(),
    ]).then(() => {
      setI18nReady(true);
      void SplashScreen.hideAsync();
    });
  }, []);

  // Show DB errors visibly instead of black screen
  if (dbError || !database) {
    return (
      <View style={errStyles.container}>
        <ScrollView contentContainerStyle={errStyles.content}>
          <Text style={errStyles.title}>{i18nReady ? t('common.error.dbInit') : 'Database Error'}</Text>
          <Text style={errStyles.body}>{dbError ?? 'database is null'}</Text>
          <Text style={errStyles.hint}>
            Platform: {Platform.OS}{'\n'}
            appOwnership: {String(Constants.appOwnership)}
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (!i18nReady) {
    return (
      <View style={errStyles.container}>
        <Text style={{ color: '#fff' }}>{'...'}</Text>
      </View>
    );
  }

  return (
    <DatabaseProvider database={database}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer ref={navRef}>
            <RootNavigator />
          </NavigationContainer>
          <ToastOverlay />
        </SafeAreaProvider>
      </QueryClientProvider>
    </DatabaseProvider>
  );
}

const errStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center' },
  content: { padding: 24 },
  title: { color: '#ff6b6b', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  body: { color: '#fff', fontSize: 13, fontFamily: 'monospace', marginBottom: 16 },
  hint: { color: '#aaa', fontSize: 12 },
});
