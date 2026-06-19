import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useFarms } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { FarmCard } from '../../components/Farm/FarmCard';
import { FAB } from '../../components/Common/FAB';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { EmptyState } from '../../components/Common/EmptyState';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import type { Farm } from '../../api/farm';

type Props = NativeStackScreenProps<FarmStackParamList, 'FarmList'>;

interface StatCardProps { value: string | number; label: string; accent: string }

function StatCard({ value, label, accent }: StatCardProps) {
  return (
    <View style={[styles.statCard, { borderTopColor: accent }]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface DashboardHeaderProps { farms: Farm[] }

function DashboardHeader({ farms }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const stats = useMemo(() => ({
    total: farms.length,
    active: farms.filter((f) => f.status === 'active').length,
    plots: farms.reduce((s, f) => s + (f.plots ?? []).length, 0),
    area: farms.reduce((s, f) => s + (Number(f.areaAcres) || 0), 0).toFixed(1),
  }), [farms]);

  return (
    <View style={styles.dashHeader}>
      <Text style={styles.dashTitle}>{t('farm.dashboard.title')}</Text>
      <View style={styles.statsRow}>
        <StatCard value={stats.total} label={t('farm.dashboard.farms')} accent="#2E7D32" />
        <StatCard value={stats.active} label={t('farm.dashboard.active')} accent="#1565C0" />
        <StatCard value={stats.plots} label={t('farm.dashboard.plots')} accent="#F59E0B" />
        <StatCard value={`${stats.area} ac`} label={t('farm.dashboard.area')} accent="#6A1B9A" />
      </View>
    </View>
  );
}

export function FarmListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, isError, refetch } = useFarms(page);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const goToFarm = useCallback(
    (farmId: string) => navigation.navigate('FarmProfile', { farmId }),
    [navigation],
  );

  const goToWizard = useCallback(() => navigation.navigate('FarmSetupWizard'), [navigation]);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  const farms: Farm[] = data?.data ?? [];

  if (farms.length === 0) {
    return (
      <View style={styles.flex}>
        {!isOnline && <OfflineBanner />}
        <EmptyState
          title={t('farm.list.empty.title')}
          body={t('farm.list.empty.body')}
          ctaLabel={t('farm.list.empty.cta')}
          onCta={goToWizard}
        />
        <FAB onPress={goToWizard} label="+" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {!isOnline && <OfflineBanner />}
      <FlatList
        data={farms}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<DashboardHeader farms={farms} />}
        renderItem={({ item }) => <FarmCard farm={item} onPress={() => goToFarm(item.id)} />}
        contentContainerStyle={styles.list}
        onEndReached={() => setPage((p) => p + 1)}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
      />
      <FAB onPress={goToWizard} label="+" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  list: { paddingBottom: 96 },

  dashHeader: {
    backgroundColor: '#1B5E20',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  dashTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 12,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});
