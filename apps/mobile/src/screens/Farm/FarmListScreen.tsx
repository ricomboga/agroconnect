import React, { useLayoutEffect } from 'react';
import {
  FlatList,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { farmApi, type Farm } from '../../api/farm';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../stores/authStore';
import { OfflineBanner } from '../../components/Common/OfflineBanner';

type Props = NativeStackScreenProps<FarmStackParamList, 'FarmList'>;

interface FarmWithStats extends Farm {
  overdueCount?: number;
  healthScore?: number;
  workerCount?: number;
  crops?: Array<{ name: string }>;
  activitiesThisMonth?: number;
}

const farmEmoji = (farm: FarmWithStats): string => {
  if (farm.farmType === 'animal') return '🐄';
  if (farm.farmType === 'both') return '🌾🐄';
  const firstCrop =
    (farm.crops?.[0]?.name ?? farm.plots?.[0]?.currentCrop ?? '').toLowerCase();
  if (firstCrop.includes('maize')) return '🌽';
  if (firstCrop.includes('tomato')) return '🍅';
  if (firstCrop.includes('bean')) return '🫘';
  if (firstCrop.includes('cabbage')) return '🥬';
  return '🌾';
};

export function FarmListScreen({ navigation }: Props) {
  const { isOnline } = useOfflineSync();
  const user = useAuthStore((s) => s.user);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { data, isLoading } = useQuery({
    queryKey: ['farms', user?.id],
    queryFn: () => farmApi.list({ pageSize: 50 }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const farms = (data?.data ?? []) as FarmWithStats[];

  const worstFarm = farms.reduce<FarmWithStats | undefined>((acc, f) => {
    const count = f.overdueCount ?? 0;
    if (count > 0 && (acc === undefined || count > (acc.overdueCount ?? 0))) return f;
    return acc;
  }, undefined);

  const renderFarmCard = ({ item: farm }: { item: FarmWithStats }) => {
    const overdueCount = farm.overdueCount ?? 0;
    const healthScore = farm.healthScore ?? 0;
    const cropList =
      (farm.plots ?? [])
        .map((p) => p.currentCrop)
        .filter((c): c is string => c !== null)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(' · ') || '—';

    const cardInner = (
      <View
        style={[
          s.card,
          overdueCount > 0
            ? { borderWidth: 1.5, borderColor: '#1A6B3C' }
            : { borderWidth: 1, borderColor: '#E5E7EB' },
        ]}
      >
        {/* Row 1 */}
        <View style={s.cardRow1}>
          <View style={s.cardRowLeft}>
            <Text style={s.farmName} numberOfLines={1}>
              {farmEmoji(farm)} {farm.name}
            </Text>
            <Text style={s.farmMeta} numberOfLines={1}>
              {farm.areaAcres} acres · {farm.county} · {cropList}
            </Text>
          </View>
          {overdueCount > 0 ? (
            <View style={s.badgeRed}>
              <Text style={s.badgeRedText}>{overdueCount} Late</Text>
            </View>
          ) : (
            <View style={s.badgeGreen}>
              <Text style={s.badgeGreenText}>Healthy</Text>
            </View>
          )}
        </View>

        {/* Row 2 — 4 stat pills */}
        <View style={s.pillsRow}>
          <View style={[s.pill, s.pillHealth]}>
            <Text
              style={[
                s.pillValue,
                {
                  color:
                    healthScore >= 70
                      ? '#1A6B3C'
                      : healthScore >= 40
                        ? '#D97706'
                        : '#DC2626',
                },
              ]}
            >
              {healthScore}%
            </Text>
            <Text style={s.pillLabel}>Health</Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillValue, s.pillValueDark]}>
              {farm.crops?.length ?? 0}
            </Text>
            <Text style={s.pillLabel}>
              {farm.farmType === 'animal' ? 'Animals' : 'Crops'}
            </Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillValue, s.pillValueDark]}>
              {farm.activitiesThisMonth ?? 0}
            </Text>
            <Text style={s.pillLabel}>Tasks</Text>
          </View>
          <View style={s.pill}>
            <Text style={[s.pillValue, s.pillValueDark]}>
              {farm.workerCount ?? 0}
            </Text>
            <Text style={s.pillLabel}>Workers</Text>
          </View>
        </View>

        {/* Row 3 — action buttons only for farms with overdue tasks */}
        {overdueCount > 0 && (
          <View style={s.btnRow}>
            <TouchableOpacity
              style={s.btnOutline}
              onPress={() => navigation.navigate('FarmProfile', { farmId: farm.id })}
            >
              <Text style={s.btnOutlineText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnSolid}
              onPress={() => navigation.navigate('ActivityForm', { farmId: farm.id })}
            >
              <Text style={s.btnSolidText}>Log Activity</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );

    // Healthy farms (no overdue): whole card is tappable for navigation
    if (overdueCount === 0) {
      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('FarmProfile', { farmId: farm.id })}
        >
          {cardInner}
        </TouchableOpacity>
      );
    }

    return cardInner;
  };

  const listFooter = (
    <View style={s.dashedCard}>
      <Text style={s.dashedEmoji}>🌐</Text>
      <Text style={s.dashedTitle}>Add farm at agroconnect.co.ke</Text>
      <Text style={s.dashedSub}>Farm setup happens on web</Text>
    </View>
  );

  return (
    <View style={s.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      <View style={s.topBar}>
        <Text style={s.topBarTitle}>My Farms</Text>
        <TouchableOpacity
          onPress={() => void Linking.openURL('https://agroconnect.co.ke/farms/new')}
        >
          <Text style={s.topBarLink}>Create on web →</Text>
        </TouchableOpacity>
      </View>

      {!isOnline && <OfflineBanner />}

      {worstFarm !== undefined && (
        <View style={s.alertBar}>
          <Text style={s.alertBarText}>
            ⚠️ {worstFarm.name}: {worstFarm.overdueCount} activities overdue
          </Text>
        </View>
      )}

      {isLoading ? (
        <ScrollView style={s.scrollBg} contentContainerStyle={s.content}>
          <View style={s.skelCard} />
          <View style={s.skelCard} />
        </ScrollView>
      ) : farms.length === 0 ? (
        <ScrollView style={s.scrollBg} contentContainerStyle={s.content}>
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🌐</Text>
            <Text style={s.emptyTitle}>Create farms on web</Text>
            <Text style={s.emptyBody}>
              Visit agroconnect.co.ke on a browser to set up your farms and crops.
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => void Linking.openURL('https://agroconnect.co.ke/farms/new')}
            >
              <Text style={s.emptyBtnText}>Open Website</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          style={s.scrollBg}
          contentContainerStyle={s.content}
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={renderFarmCard}
          ListFooterComponent={listFooter}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    backgroundColor: '#1A6B3C',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  topBarLink: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },

  alertBar: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  alertBarText: { fontSize: 9, color: '#78350F' },

  scrollBg: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 11, paddingBottom: 96 },

  skelCard: { height: 100, backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 8 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4 },
  emptyBody: { fontSize: 10, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  emptyBtn: { backgroundColor: '#1A6B3C', borderRadius: 6, paddingVertical: 9, paddingHorizontal: 16 },
  emptyBtnText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    elevation: 1,
  },
  cardRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardRowLeft: { flex: 1, marginRight: 8 },
  farmName: { fontSize: 11, fontWeight: '600', color: '#111827' },
  farmMeta: { fontSize: 9, color: '#6B7280', marginTop: 1 },

  badgeGreen: { backgroundColor: '#EAF4EE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGreenText: { fontSize: 8, fontWeight: '600', color: '#0D4A28' },
  badgeRed: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeRedText: { fontSize: 8, fontWeight: '600', color: '#991B1B' },

  pillsRow: { flexDirection: 'row', gap: 3, marginVertical: 5 },
  pill: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 3, paddingVertical: 4, alignItems: 'center' },
  pillHealth: { backgroundColor: '#EAF4EE' },
  pillValue: { fontSize: 10, fontWeight: '700' },
  pillValueDark: { color: '#111827' },
  pillLabel: { fontSize: 8, color: '#6B7280' },

  btnRow: { flexDirection: 'row', gap: 5, marginTop: 4 },
  btnOutline: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 7,
  },
  btnOutlineText: { color: '#1A6B3C', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  btnSolid: { flex: 1, backgroundColor: '#1A6B3C', borderRadius: 6, paddingVertical: 7 },
  btnSolidText: { color: '#fff', fontSize: 10, fontWeight: '600', textAlign: 'center' },

  dashedCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },
  dashedEmoji: { fontSize: 18, marginBottom: 3 },
  dashedTitle: { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },
  dashedSub: { fontSize: 8, color: '#6B7280', marginTop: 2 },
});
