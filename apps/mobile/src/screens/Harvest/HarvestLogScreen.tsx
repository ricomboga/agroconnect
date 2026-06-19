import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useHarvests } from '../../hooks/useHarvests';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { EmptyState } from '../../components/Common/EmptyState';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { FAB } from '../../components/Common/FAB';
import { HarvestListItem } from '../../components/Harvest/HarvestListItem';
import { YieldSummaryCard } from '../../components/Harvest/YieldSummaryCard';

type Props = NativeStackScreenProps<FarmStackParamList, 'HarvestLog'>;

export function HarvestLogScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const { data, isLoading, isError, refetch } = useHarvests(farmId);

  const harvests = data?.data ?? [];
  const { totalYieldKg, totalRevenueKes } = useMemo(() => ({
    totalYieldKg: harvests.reduce((sum, h) => sum + h.quantityKg, 0),
    totalRevenueKes: harvests.reduce((sum, h) => sum + (h.totalRevenueKes ?? 0), 0),
  }), [harvests]);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  return (
    <View style={styles.flex}>
      {!isOnline && <OfflineBanner />}
      {harvests.length > 0 && (
        <YieldSummaryCard totalYieldKg={totalYieldKg} totalRevenueKes={totalRevenueKes} />
      )}
      {harvests.length === 0 ? (
        <EmptyState
          title={t('harvest.log.empty.title')}
          body={t('harvest.log.empty.body')}
          ctaLabel={t('harvest.log.empty.cta')}
          onCta={() => navigation.navigate('HarvestForm', { farmId })}
        />
      ) : (
        <FlatList
          data={harvests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HarvestListItem harvest={item} />}
          contentContainerStyle={styles.list}
        />
      )}
      <FAB onPress={() => navigation.navigate('HarvestForm', { farmId })} label="+" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  list: { paddingBottom: 80 },
});
