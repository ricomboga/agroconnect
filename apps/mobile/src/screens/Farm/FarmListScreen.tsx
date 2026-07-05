import React, { useEffect, useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useFarms } from '../../hooks/useFarms';
import type { Farm } from '../../api/farm';
import { useFarmStore } from '../../store/farm.store';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineBanner } from '../../components/Common/OfflineBanner';

type Props = NativeStackScreenProps<FarmStackParamList, 'FarmList'>;

function farmEmoji(farm: Farm): string {
  if (farm.farmType === 'animal') return '🐄';
  if (farm.farmType === 'both') return '🌾🐄';
  const first = (farm.plots?.[0]?.currentCrop ?? '').toLowerCase();
  if (first.includes('maize') || first.includes('corn')) return '🌽';
  if (first.includes('tomato')) return '🍅';
  if (first.includes('bean')) return '🫘';
  if (first.includes('cabbage')) return '🥬';
  return '🌾';
}

function farmTypeLabel(farm: Farm, t: (k: string) => string): string {
  if (farm.farmType === 'animal') return t('farm.add.animalsOnly');
  if (farm.farmType === 'both') return t('farm.add.both');
  return t('farm.add.cropsOnly');
}

function cropSummary(farm: Farm): string {
  const crops = (farm.plots ?? [])
    .map((p) => p.currentCrop)
    .filter((c): c is string => Boolean(c))
    .filter((v, i, a) => a.indexOf(v) === i);
  return crops.length > 0 ? crops.join(', ') : '—';
}

export function FarmListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const setActiveFarmId = useFarmStore((s) => s.setActiveFarmId);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { data, isLoading, isError, refetch } = useFarms(1, 50);
  const farms = (data?.data ?? []) as Farm[];

  // If only one farm, select it automatically
  useEffect(() => {
    if (!isLoading && farms.length === 1 && farms[0]) {
      setActiveFarmId(farms[0].id);
      navigation.replace('FarmProfile', { farmId: farms[0].id });
    }
  }, [isLoading, farms, navigation, setActiveFarmId]);

  const selectFarm = (farm: Farm) => {
    setActiveFarmId(farm.id);
    navigation.navigate('FarmProfile', { farmId: farm.id });
  };

  const renderCard = ({ item: farm, index }: { item: Farm; index: number }) => {
    const overdue = farm.overdueCount ?? 0;
    const health = farm.healthScore ?? 0;
    const crops = cropSummary(farm);
    const workerCount = farm.workerCount ?? 0;
    const plotCount = (farm.plots ?? []).filter((p) => p.currentCrop).length;

    return (
      <Pressable
        style={[s.card, index === 0 && s.cardFirst]}
        onPress={() => selectFarm(farm)}
        accessibilityRole="button"
        android_ripple={{ color: '#EAF4EE' }}
      >
        {/* Header row */}
        <View style={s.cardHeader}>
          <Text style={s.cardEmoji}>{farmEmoji(farm)}</Text>
          <View style={s.cardHeaderText}>
            <Text style={s.cardName} numberOfLines={1}>{farm.name}</Text>
            <Text style={s.cardMeta} numberOfLines={1}>
              {farm.county}{farm.subCounty ? `, ${farm.subCounty}` : ''} · {farm.areaAcres} {t('farm.card.area')}
            </Text>
          </View>
          {overdue > 0 ? (
            <View style={s.badgeRed}>
              <Text style={s.badgeRedText}>{overdue} {t('farm.care.late')}</Text>
            </View>
          ) : (
            <View style={s.badgeGreen}>
              <Text style={s.badgeGreenText}>✓ {t('farm.care.onTrack')}</Text>
            </View>
          )}
        </View>

        {/* Type + crops row */}
        <View style={s.typeRow}>
          <View style={s.typeChip}>
            <Text style={s.typeChipText}>{farmTypeLabel(farm, t)}</Text>
          </View>
          {crops !== '—' && (
            <Text style={s.cropsText} numberOfLines={1}>{crops}</Text>
          )}
        </View>

        {/* Stats pills */}
        <View style={s.pillsRow}>
          <View style={[s.pill, s.pillHealth]}>
            <Text style={[s.pillVal, { color: health >= 70 ? '#1A6B3C' : health >= 40 ? '#D97706' : '#DC2626' }]}>
              {health}%
            </Text>
            <Text style={s.pillLabel}>{t('farm.profile.stat.health')}</Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillVal, s.pillValDark]}>{plotCount}</Text>
            <Text style={s.pillLabel}>{t('farm.stat.crops')}</Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillVal, s.pillValDark]}>{farm.activitiesThisMonth ?? 0}</Text>
            <Text style={s.pillLabel}>{t('farm.profile.tab.activities')}</Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillVal, s.pillValDark]}>{workerCount}</Text>
            <Text style={s.pillLabel}>{t('farm.stat.workers')}</Text>
          </View>
        </View>

        {/* Select caret */}
        <View style={s.cardFooter}>
          <Text style={s.cardFooterText}>{t('farm.list.selectFarm')} →</Text>
        </View>
      </Pressable>
    );
  };

  const isMultiple = farms.length > 1;

  return (
    <View style={s.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      <View style={s.topBar}>
        <Text style={s.topBarTitle}>
          {isMultiple ? t('farm.list.selectFarm') : t('farm.list.title')}
        </Text>
        <Pressable
          onPress={() => void Linking.openURL('https://agroconnect.co.ke/farms/new')}
          accessibilityRole="link"
        >
          <Text style={s.topBarLink}>{t('farm.list.empty.cta')} →</Text>
        </Pressable>
      </View>

      {!isOnline && <OfflineBanner />}

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1A6B3C" />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable style={s.retryBtn} onPress={() => void refetch()} accessibilityRole="button">
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : farms.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyEmoji}>🌾</Text>
          <Text style={s.emptyTitle}>{t('farm.list.empty.webTitle')}</Text>
          <Text style={s.emptyBody}>{t('farm.list.empty.webBody')}</Text>
          <Pressable
            style={s.emptyBtn}
            onPress={() => void Linking.openURL('https://agroconnect.co.ke/farms/new')}
            accessibilityRole="link"
          >
            <Text style={s.emptyBtnText}>{t('farm.list.empty.openWebsite')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {isMultiple && (
            <View style={s.promptBar}>
              <Text style={s.promptText}>
                {t('farm.list.selectPrompt', { count: farms.length })}
              </Text>
            </View>
          )}
          <FlatList
            style={s.list}
            contentContainerStyle={s.listContent}
            data={farms}
            keyExtractor={(f) => f.id}
            renderItem={renderCard}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  topBar: {
    backgroundColor: '#1A6B3C',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  topBarLink:  { color: 'rgba(255,255,255,0.65)', fontSize: 10 },

  promptBar: {
    backgroundColor: '#EAF4EE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  promptText: { fontSize: 11, color: '#0D4A28', fontWeight: '500' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  list:        { flex: 1 },
  listContent: { padding: 12, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  cardFirst: { marginTop: 0 },

  cardHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardEmoji:      { fontSize: 28, marginRight: 10 },
  cardHeaderText: { flex: 1, marginRight: 8 },
  cardName:       { fontSize: 13, fontWeight: '700', color: '#111827' },
  cardMeta:       { fontSize: 9, color: '#6B7280', marginTop: 2 },

  badgeGreen:     { backgroundColor: '#EAF4EE', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  badgeGreenText: { fontSize: 8, fontWeight: '600', color: '#0D4A28' },
  badgeRed:       { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  badgeRedText:   { fontSize: 8, fontWeight: '600', color: '#991B1B' },

  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  typeChip:     { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeChipText: { fontSize: 9, fontWeight: '600', color: '#374151' },
  cropsText:    { fontSize: 9, color: '#6B7280', flex: 1 },

  pillsRow: { flexDirection: 'row', gap: 4, marginBottom: 10 },
  pill:     { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 5, paddingVertical: 5, alignItems: 'center' },
  pillHealth: { backgroundColor: '#EAF4EE' },
  pillVal:    { fontSize: 12, fontWeight: '700' },
  pillValDark: { color: '#111827' },
  pillLabel:  { fontSize: 8, color: '#6B7280', marginTop: 1 },

  cardFooter:     { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 8, alignItems: 'flex-end' },
  cardFooterText: { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },

  errorText: { fontSize: 12, color: '#374151', marginBottom: 12, textAlign: 'center' },
  retryBtn:  { backgroundColor: '#1A6B3C', borderRadius: 6, paddingVertical: 9, paddingHorizontal: 20 },
  retryText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  emptyBody:  { fontSize: 11, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 16 },
  emptyBtn:   { backgroundColor: '#1A6B3C', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 20 },
  emptyBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
