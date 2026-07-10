import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { marketApi, type ProduceListing, type QualityGrade, type ListingStatus } from '../../api/market';
import { predictApi } from '../../api/predict';
import { useAuthStore } from '../../stores/authStore';
import type { MarketStackParamList } from '../../navigation/types';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';

type Props = NativeStackScreenProps<MarketStackParamList, 'ProduceListingDetail'>;

const GRADE_COLORS: Record<QualityGrade, { bg: string; text: string }> = {
  A: { bg: '#E8F5E9', text: '#1B5E20' },
  B: { bg: '#FFF9C4', text: '#F57F17' },
  C: { bg: '#FBE9E7', text: '#BF360C' },
  reject: { bg: '#FFEBEE', text: '#C62828' },
};

const STATUS_COLORS: Record<ListingStatus, { bg: string; text: string }> = {
  active:    { bg: '#E8F5E9', text: '#1B5E20' },
  sold:      { bg: '#E3F2FD', text: '#1565C0' },
  expired:   { bg: '#F5F5F5', text: '#757575' },
  withdrawn: { bg: '#F5F5F5', text: '#757575' },
};

export function ProduceListingDetailScreen({ navigation, route }: Props) {
  const { listingId } = route.params;
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  const listingQuery = useQuery({
    queryKey: ['market', 'listings', listingId],
    queryFn: () => marketApi.listings.get(listingId),
    select: (res): ProduceListing => res.data,
  });
  const listing: ProduceListing | undefined = listingQuery.data;
  const isOwner = !!listing && listing.farmerId === userId;

  const forecastQuery = useQuery({
    queryKey: ['predict', 'prices', listing?.crop],
    queryFn: () => predictApi.priceForecast(listing!.crop.toLowerCase(), 30),
    enabled: !!listing?.crop,
    retry: false,
  });
  const forecast = forecastQuery.data;

  const withdrawMutation = useMutation({
    mutationFn: () => marketApi.listings.delete(listingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['market', 'listings'] });
      void queryClient.invalidateQueries({ queryKey: ['market', 'listings', listingId] });
      navigation.goBack();
    },
  });

  function confirmWithdraw() {
    Alert.alert(
      t('market.listing.detail.withdrawConfirmTitle'),
      t('market.listing.detail.withdrawConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('market.listing.detail.withdrawBtn'), style: 'destructive', onPress: () => withdrawMutation.mutate() },
      ],
    );
  }

  if (listingQuery.isLoading) return <LoadingScreen />;
  if (listingQuery.isError || !listing) {
    return <ErrorScreen onRetry={() => void listingQuery.refetch()} />;
  }

  const gradeColor = GRADE_COLORS[listing.qualityGrade];
  const statusColor = STATUS_COLORS[listing.status];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle} numberOfLines={1}>{listing.crop}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={s.headerRow}>
          <Text style={s.crop}>
            {listing.crop}{listing.variety ? ` · ${listing.variety}` : ''}
          </Text>
          <View style={[s.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[s.badgeText, { color: statusColor.text }]}>
              {t(`market.listing.status.${listing.status}`)}
            </Text>
          </View>
        </View>

        <Text style={s.price}>
          {t('market.listing.card.pricePerKg', { price: listing.askingPriceKes.toLocaleString() })}
        </Text>

        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: gradeColor.bg }]}>
            <Text style={[s.badgeText, { color: gradeColor.text }]}>
              {t('market.listing.card.grade', { grade: listing.qualityGrade })}
            </Text>
          </View>
          <Text style={s.qty}>
            {t('market.listing.card.quantityKg', { quantity: listing.quantityKg.toLocaleString() })}
          </Text>
        </View>

        <Text style={s.sectionLabel}>{t('market.listing.detail.locationLabel')}</Text>
        <Text style={s.description}>{listing.locationCounty}</Text>
        {listing.locationDescription && (
          <Text style={s.description}>{listing.locationDescription}</Text>
        )}

        <Text style={s.sectionLabel}>{t('market.listing.detail.availabilityLabel')}</Text>
        <Text style={s.description}>
          {t('market.listing.detail.availabilityRange', {
            from: listing.availableFrom,
            until: listing.availableUntil,
          })}
        </Text>

        <Text style={s.sectionLabel}>{t('market.listing.detail.viewsLabel')}</Text>
        <Text style={s.description}>{listing.views.toLocaleString()}</Text>

        {forecast && (
          <>
            <Text style={s.sectionLabel}>{t('market.listing.detail.forecastLabel')}</Text>
            <View style={s.forecastCard}>
              <Text style={s.forecastTrend}>
                {t(`insights.trend.${forecast.trend}`)} · {t('insights.forecastIn', { days: forecast.days_ahead })}
              </Text>
              <Text style={s.forecastValue}>
                {t('insights.forecastValue', { price: forecast.predicted_price_kes.toLocaleString() })}
              </Text>
            </View>
          </>
        )}

        {isOwner && listing.status !== 'withdrawn' && (
          <Pressable
            style={[s.withdrawBtn, withdrawMutation.isPending && s.withdrawBtnDisabled]}
            onPress={confirmWithdraw}
            disabled={withdrawMutation.isPending}
            accessibilityRole="button"
          >
            <Text style={s.withdrawBtnLabel}>
              {withdrawMutation.isPending
                ? t('market.listing.detail.withdrawing')
                : t('market.listing.detail.withdrawBtn')}
            </Text>
          </Pressable>
        )}

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  topArea: { backgroundColor: '#2E7D32' },
  topBar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44 },
  backArrow:    { fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  backLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  topBarTitle:  { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center' },
  topBarSpacer: { minWidth: 64 },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  crop:      { fontSize: 18, fontWeight: '700', color: '#1B1B1B', flex: 1, marginRight: 8 },
  price:     { fontSize: 17, fontWeight: '700', color: '#2E7D32', marginTop: 8 },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  badge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:{ fontSize: 11, fontWeight: '700' },
  qty:      { fontSize: 13, color: '#555555' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#2E7D32',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 6,
  },
  description: { fontSize: 13, color: '#333333', lineHeight: 19 },

  forecastCard: {
    backgroundColor: '#F5F8FF', borderRadius: 8, borderWidth: 1, borderColor: '#DCE8FF',
    padding: 12,
  },
  forecastTrend: { fontSize: 12, color: '#374151', fontWeight: '600' },
  forecastValue: { fontSize: 13, color: '#1565C0', fontWeight: '700', marginTop: 4 },

  withdrawBtn: {
    minHeight: 48, backgroundColor: '#C62828', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  withdrawBtnDisabled: { opacity: 0.5 },
  withdrawBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  bottomPad: { height: 20 },
});
