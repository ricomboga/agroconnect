import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useFarms } from '../../hooks/useFarms';
import type { Farm } from '../../api/farm';
import { useFarmStore } from '../../store/farm.store';
import { useAuthStore } from '../../stores/authStore';

function farmTypeLabel(farm: Farm, t: (k: string) => string): string {
  if (farm.farmType === 'animal') return t('farm.add.animalsOnly');
  if (farm.farmType === 'both') return t('farm.add.both');
  return t('farm.add.cropsOnly');
}

export function FarmSelectionScreen() {
  const { t } = useTranslation();
  const setActiveFarmId = useFarmStore((s) => s.setActiveFarmId);
  const completeFarmSelection = useAuthStore((s) => s.completeFarmSelection);

  const { data, isLoading, isError, refetch } = useFarms(1, 50);
  const farms = (data?.data ?? []) as Farm[];

  // Zero or one farm — nothing for the user to choose, so resolve automatically.
  useEffect(() => {
    if (isLoading) return;
    if (farms.length <= 1) {
      if (farms[0]) setActiveFarmId(farms[0].id);
      completeFarmSelection();
    }
  }, [isLoading, farms, setActiveFarmId, completeFarmSelection]);

  const selectFarm = (farm: Farm) => {
    setActiveFarmId(farm.id);
    completeFarmSelection();
  };

  if (isLoading || farms.length <= 1) {
    return (
      <View style={s.center}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#1A6B3C" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar style="light" />

      <View style={s.topBar}>
        <Text style={s.topBarTitle}>{t('farm.list.selectFarm')}</Text>
      </View>

      <View style={s.promptBar}>
        <Text style={s.promptText}>
          {t('farm.list.selectPrompt', { count: farms.length })}
        </Text>
      </View>

      {isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable style={s.retryBtn} onPress={() => void refetch()} accessibilityRole="button">
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={s.list}
          contentContainerStyle={s.listContent}
          data={farms}
          keyExtractor={(f) => f.id}
          renderItem={({ item: farm }) => (
            <Pressable
              style={s.card}
              onPress={() => selectFarm(farm)}
              accessibilityRole="button"
              android_ripple={{ color: '#EAF4EE' }}
            >
              <View style={s.cardText}>
                <Text style={s.cardName} numberOfLines={1}>{farm.name}</Text>
                <Text style={s.cardMeta} numberOfLines={1}>
                  {farm.county}{farm.subCounty ? `, ${farm.subCounty}` : ''} · {farmTypeLabel(farm, t)}
                </Text>
              </View>
              <Text style={s.arrow}>→</Text>
            </Pressable>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },

  topBar: {
    backgroundColor: '#1A6B3C',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  promptBar: {
    backgroundColor: '#EAF4EE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  promptText: { fontSize: 11, color: '#0D4A28', fontWeight: '500' },

  list:        { flex: 1 },
  listContent: { padding: 12, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardText: { flex: 1, marginRight: 8 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cardMeta: { fontSize: 9, color: '#6B7280', marginTop: 2 },
  arrow:    { color: '#1A6B3C', fontSize: 16 },

  errorText: { fontSize: 12, color: '#374151', marginBottom: 12, textAlign: 'center' },
  retryBtn:  { backgroundColor: '#1A6B3C', borderRadius: 6, paddingVertical: 9, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});
