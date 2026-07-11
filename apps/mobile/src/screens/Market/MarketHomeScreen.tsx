import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MarketStackParamList } from '../../navigation/types';
import { marketApi, type ProductCategory, type QualityGrade } from '../../api/market';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuthStore } from '../../stores/authStore';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { EmptyState } from '../../components/Common/EmptyState';
import { FAB } from '../../components/Common/FAB';
import { ProduceListingCard } from '../../components/Market/ProduceListingCard';
import { SupplierProductCard } from '../../components/Market/SupplierProductCard';

type Props = NativeStackScreenProps<MarketStackParamList, 'MarketHome'>;
type ActiveTab = 'sell' | 'buy';

// ── Filter constants ─────────────────────────────────────────────────────────
const CROP_CHIPS = [
  { value: '', key: 'market.listing.filter.allCrops' },
  { value: 'Mahindi',    key: 'market.listing.crops.maize' },
  { value: 'Nyanya',     key: 'market.listing.crops.tomato' },
  { value: 'Maharagwe',  key: 'market.listing.crops.beans' },
  { value: 'Parachichi', key: 'market.listing.crops.avocado' },
  { value: 'Chai',       key: 'market.listing.crops.tea' },
  { value: 'Kahawa',     key: 'market.listing.crops.coffee' },
] as const;

const GRADE_CHIPS = [
  { value: '' as const,  key: 'market.listing.filter.allGrades' },
  { value: 'A' as const, key: 'market.listing.card.grade' },
  { value: 'B' as const, key: 'market.listing.card.grade' },
  { value: 'C' as const, key: 'market.listing.card.grade' },
] satisfies Array<{ value: '' | QualityGrade; key: string }>;

const CATEGORY_CHIPS = [
  { value: '' as const,           key: 'market.product.filter.all' },
  { value: 'seed' as const,       key: 'market.product.filter.seed' },
  { value: 'fertiliser' as const, key: 'market.product.filter.fertiliser' },
  { value: 'pesticide' as const,  key: 'market.product.filter.pesticide' },
  { value: 'herbicide' as const,  key: 'market.product.filter.herbicide' },
  { value: 'equipment' as const,  key: 'market.product.filter.equipment' },
  { value: 'veterinary' as const, key: 'market.product.filter.veterinary' },
  { value: 'other' as const,      key: 'market.product.filter.other' },
] satisfies Array<{ value: '' | ProductCategory; key: string }>;

// ── Filter chip row ───────────────────────────────────────────────────────────
function FilterChips<V extends string>({
  chips,
  selected,
  onSelect,
  gradeLabel,
}: {
  chips: ReadonlyArray<{ value: V; key: string }>;
  selected: V;
  onSelect: (v: V) => void;
  gradeLabel?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <FlatList
      horizontal
      data={chips as Array<{ value: V; key: string }>}
      keyExtractor={(c) => c.value || '__all__'}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      renderItem={({ item }) => {
        const label = gradeLabel && item.value
          ? t(item.key, { grade: item.value })
          : t(item.key);
        return (
          <Pressable
            style={[styles.chip, selected === item.value && styles.chipSelected]}
            onPress={() => onSelect(item.value)}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, selected === item.value && styles.chipTextSelected]}>
              {label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function MarketHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const userId = useAuthStore((s) => s.user?.id);

  const [activeTab, setActiveTab] = useState<ActiveTab>('sell');
  const [showMineOnly, setShowMineOnly] = useState(false);

  // Sell-tab filters
  const [cropFilter, setCropFilter]   = useState('');
  const [gradeFilter, setGradeFilter] = useState<'' | QualityGrade>('');

  // Buy-tab filters
  const [categoryFilter, setCategoryFilter] = useState<'' | ProductCategory>('');

  const listingsQuery = useQuery({
    queryKey: ['market', 'listings', cropFilter, gradeFilter, showMineOnly, userId],
    queryFn: () =>
      marketApi.listings.list({
        crop:     cropFilter || undefined,
        grade:    (gradeFilter || undefined) as QualityGrade | undefined,
        farmerId: showMineOnly ? userId : undefined,
      }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    enabled: activeTab === 'sell' && (!showMineOnly || !!userId),
  });

  const productsQuery = useQuery({
    queryKey: ['market', 'products', categoryFilter],
    queryFn: () =>
      marketApi.products.list({
        category: (categoryFilter || undefined) as ProductCategory | undefined,
      }),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    enabled: activeTab === 'buy',
  });

  return (
    <View style={styles.flex}>
      {!isOnline && <OfflineBanner />}

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(['sell', 'buy'] as ActiveTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {t(`market.home.tab.${tab}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Sell tab ───────────────────────────────────────────────────── */}
      {activeTab === 'sell' && (
        <View style={styles.flex}>
          <View style={styles.mineToggleRow}>
            <Pressable
              style={[styles.mineToggle, !showMineOnly && styles.mineToggleActive]}
              onPress={() => setShowMineOnly(false)}
              accessibilityRole="tab"
            >
              <Text style={[styles.mineToggleText, !showMineOnly && styles.mineToggleTextActive]}>
                {t('market.listing.browseAll')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.mineToggle, showMineOnly && styles.mineToggleActive]}
              onPress={() => setShowMineOnly(true)}
              accessibilityRole="tab"
            >
              <Text style={[styles.mineToggleText, showMineOnly && styles.mineToggleTextActive]}>
                {t('market.listing.myListings')}
              </Text>
            </Pressable>
          </View>

          {!showMineOnly && (
            <>
              <FilterChips
                chips={CROP_CHIPS}
                selected={cropFilter}
                onSelect={setCropFilter}
              />
              <FilterChips
                chips={GRADE_CHIPS}
                selected={gradeFilter}
                onSelect={setGradeFilter}
                gradeLabel
              />
            </>
          )}

          {listingsQuery.isLoading && <LoadingScreen />}
          {listingsQuery.isError && (
            <ErrorScreen onRetry={() => void listingsQuery.refetch()} />
          )}
          {!listingsQuery.isLoading && !listingsQuery.isError && (
            (listingsQuery.data?.data ?? []).length === 0 ? (
              <EmptyState
                title={t('market.listing.empty.title')}
                body={t('market.listing.empty.body')}
                ctaLabel={t('market.listing.empty.cta')}
                onCta={() => navigation.navigate('CreateListing')}
              />
            ) : (
              <FlatList
                data={listingsQuery.data?.data ?? []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ProduceListingCard
                    listing={item}
                    onPress={() =>
                      navigation.navigate('ProduceListingDetail', { listingId: item.id })
                    }
                  />
                )}
                contentContainerStyle={styles.list}
              />
            )
          )}

          <FAB
            onPress={() => navigation.navigate('CreateListing')}
            label="+"
            accessibilityLabel={t('market.listing.createBtn')}
          />
        </View>
      )}

      {/* ── Buy tab ────────────────────────────────────────────────────── */}
      {activeTab === 'buy' && (
        <View style={styles.flex}>
          <FilterChips
            chips={CATEGORY_CHIPS}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
          />

          {productsQuery.isLoading && <LoadingScreen />}
          {productsQuery.isError && (
            <ErrorScreen onRetry={() => void productsQuery.refetch()} />
          )}
          {!productsQuery.isLoading && !productsQuery.isError && (
            (productsQuery.data?.data ?? []).length === 0 ? (
              <EmptyState
                title={t('market.product.empty.title')}
                body={t('market.product.empty.body')}
                ctaLabel={t('market.product.empty.cta')}
                onCta={() => void productsQuery.refetch()}
              />
            ) : (
              <FlatList
                data={productsQuery.data?.data ?? []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SupplierProductCard
                    product={item}
                    onPress={() =>
                      navigation.navigate('SupplierProductDetail', { productId: item.id })
                    }
                  />
                )}
                contentContainerStyle={styles.list}
              />
            )
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabBtn: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: '#2E7D32' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#757575' },
  tabTextActive: { color: '#2E7D32' },

  chipRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#555555', fontWeight: '500' },
  chipTextSelected: { color: '#2E7D32', fontWeight: '700' },

  list: { paddingBottom: 80, paddingTop: 4 },

  mineToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  mineToggle: {
    flex: 1,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mineToggleActive: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  mineToggleText: { fontSize: 13, color: '#555555', fontWeight: '500' },
  mineToggleTextActive: { color: '#2E7D32', fontWeight: '700' },
});
