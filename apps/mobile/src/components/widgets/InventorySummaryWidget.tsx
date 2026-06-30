import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useInventorySummary } from '../../hooks/useInventory';
import { farmApi, type Farm } from '../../api/farm';
import type { AppTabParamList } from '../../navigation/types';

type WidgetNav = BottomTabNavigationProp<AppTabParamList, 'Home'>;

function formatKES(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toLocaleString();
}

export function InventorySummaryWidget() {
  const { t } = useTranslation();
  const navigation = useNavigation<WidgetNav>();

  const { data: summary } = useInventorySummary();

  // Reuse the farms cache (same queryKey as useDashboardData) for navigation
  const { data: farmsData } = useQuery<{ data: Farm[] }>({
    queryKey: ['farms'],
    queryFn: () => farmApi.list({ pageSize: 10 }),
    staleTime: 5 * 60 * 1000,
  });
  const primaryFarmId =
    farmsData?.data?.find((f: Farm) => f.status === 'active')?.id ??
    farmsData?.data?.[0]?.id;

  const goToInventory = () => {
    if (primaryFarmId) {
      navigation.navigate('Farm', {
        screen: 'InputLog',
        params: { farmId: primaryFarmId },
      } as never);
    }
  };

  if (!summary) return null;

  const totalAlert = summary.totalItemsEmpty + summary.totalItemsLow;
  const alertColor = summary.totalItemsEmpty > 0 ? '#DC2626' : '#D97706';

  return (
    <View style={s.card}>
      <Text style={s.title}>{t('dashboard.inventory.title')}</Text>

      {/* Row 1 — Low / Empty */}
      <View style={s.row}>
        <Text style={s.label}>{t('dashboard.inventory.lowEmpty')}</Text>
        <Text style={[s.value, { color: alertColor }]}>{totalAlert}</Text>
      </View>

      {/* Row 2 — Customer collections */}
      <View style={s.row}>
        <Text style={s.label}>{t('dashboard.inventory.collections')}</Text>
        <Text style={[s.value, { color: '#D97706' }]}>
          KES {formatKES(summary.totalPendingCollectionsKes)}
        </Text>
      </View>

      {/* Row 3 — Produce in store */}
      <View style={s.row}>
        <Text style={s.label}>{t('dashboard.inventory.inStore')}</Text>
        <Text style={[s.value, { color: '#1A6B3C' }]}>
          KES {formatKES(summary.totalHarvestInStoreKes)}
        </Text>
      </View>

      {/* Row 4 — Eggs today (conditional) */}
      {summary.eggsCollectedToday != null && (
        <View style={s.row}>
          <Text style={s.label}>{t('dashboard.inventory.eggsToday')}</Text>
          <Text style={[s.value, { color: '#1A6B3C' }]}>
            {t('dashboard.inventory.eggsTrays', { count: summary.eggsCollectedToday })}
          </Text>
        </View>
      )}

      <View style={s.divider} />

      <Pressable
        onPress={goToInventory}
        style={s.linkWrapper}
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.inventory.viewAll')}
      >
        <Text style={s.link}>{t('dashboard.inventory.viewAll')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  label: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
  },
  value: {
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  linkWrapper: {
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1A6B3C',
    textAlign: 'right',
  },
});
