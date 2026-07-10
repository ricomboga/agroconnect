import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { marketApi } from '../../api/market';
import type { SupplierProduct } from '../../api/market';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { EmptyState } from '../../components/Common/EmptyState';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { SupplierProductCard } from '../../components/Market/SupplierProductCard';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'SupplierProducts'>;

export function SupplierProductsScreen({ route, navigation }: Props) {
  const { productName } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['market', 'products', 'all'],
    queryFn: () => marketApi.products.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  const needle = productName.toLowerCase();
  const filtered = (data?.data ?? []).filter((p: SupplierProduct) =>
    p.name.toLowerCase().includes(needle) ||
    (p.description?.toLowerCase().includes(needle) ?? false),
  );

  return (
    <SafeAreaView style={s.safe}>
      {!isOnline && <OfflineBanner />}
      <View style={s.header}>
        <Text style={s.title} numberOfLines={1}>
          {t('diagnose.result.buyMedicine')}: {productName}
        </Text>
      </View>
      {filtered.length === 0 ? (
        <EmptyState
          title={t('market.product.empty.title')}
          body={t('market.product.empty.body')}
          ctaLabel={t('common.retry')}
          onCta={() => void refetch()}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SupplierProductCard
              product={item}
              onPress={() => navigation.navigate('SupplierProductDetail', { productId: item.id })}
            />
          )}
          contentContainerStyle={s.list}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title:  { fontSize: 16, fontWeight: '700', color: '#1B1B1B' },
  list:   { paddingBottom: 40, paddingTop: 4 },
});
