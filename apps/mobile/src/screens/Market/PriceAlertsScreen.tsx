import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { priceAlertsApi } from '../../api/marketPriceAlerts';
import type { PriceAlert, PriceTrend } from '../../api/marketPriceAlerts';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import type { MarketStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MarketStackParamList, 'PriceAlerts'>;

const TREND_ICON: Record<PriceTrend, string> = {
  up: '↑',
  down: '↓',
  stable: '→',
};
const TREND_COLOR: Record<PriceTrend, string> = {
  up: '#2E7D32',
  down: '#B71C1C',
  stable: '#757575',
};

const CROP_OPTIONS = [
  'maize', 'tomato', 'beans', 'potato', 'avocado', 'tea', 'coffee',
  'wheat', 'rice', 'sorghum', 'millet', 'onion', 'cabbage', 'other',
];

export function PriceAlertsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);

  const alertsQuery = useQuery({
    queryKey: ['priceAlerts'],
    queryFn: () => priceAlertsApi.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      priceAlertsApi.create({
        crop: selectedCrop,
        targetPriceKes: Number(targetPrice),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['priceAlerts'] });
      setSelectedCrop('');
      setTargetPrice('');
      setShowAdd(false);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      priceAlertsApi.toggle(id, enabled),
    onSuccess: (res) => {
      queryClient.setQueryData<{ data: PriceAlert[] }>(['priceAlerts'], (old) => {
        if (!old) return old;
        return {
          data: old.data.map((a) => (a.id === res.data.id ? res.data : a)),
        };
      });
    },
  });

  const canAdd =
    selectedCrop.trim().length > 0 &&
    Number(targetPrice) > 0 &&
    !createMutation.isPending;

  const alerts = alertsQuery.data?.data ?? [];

  const renderAlert = ({ item }: { item: PriceAlert }) => (
    <View style={s.alertCard}>
      <View style={s.alertTop}>
        <View style={s.cropInfo}>
          <Text style={s.cropName}>{item.crop}</Text>
          {item.currentPriceKes != null && (
            <View style={s.priceRow}>
              <Text style={s.currentPrice}>KES {item.currentPriceKes}/kg</Text>
              <Text style={[s.trendIcon, { color: TREND_COLOR[item.trend] }]}>
                {TREND_ICON[item.trend]}
              </Text>
            </View>
          )}
        </View>
        <Switch
          value={item.enabled}
          onValueChange={(val) => toggleMutation.mutate({ id: item.id, enabled: val })}
          trackColor={{ false: '#E0E0E0', true: '#A5D6A7' }}
          thumbColor={item.enabled ? '#2E7D32' : '#BDBDBD'}
        />
      </View>
      <View style={s.targetRow}>
        <Text style={s.targetLabel}>{t('market.priceAlerts.targetPrice')}</Text>
        <Text style={s.targetValue}>KES {item.targetPriceKes}/kg</Text>
      </View>
      {!item.enabled && (
        <Text style={s.disabledNote}>{t('market.priceAlerts.disabled')}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('market.priceAlerts.title')}</Text>
        <Pressable
          onPress={() => setShowAdd((v) => !v)}
          style={s.addBtn}
          accessibilityRole="button"
        >
          <Text style={s.addBtnText}>{showAdd ? '✕' : '+'}</Text>
        </Pressable>
      </View>

      {addSuccess && (
        <View style={s.successBanner}>
          <Text style={s.successText}>{t('market.priceAlerts.success')}</Text>
        </View>
      )}

      {showAdd && (
        <View style={s.addForm}>
          <Text style={s.fieldLabel}>{t('market.priceAlerts.crop')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cropRow}>
            {CROP_OPTIONS.map((crop) => (
              <Pressable
                key={crop}
                style={[s.cropChip, selectedCrop === crop && s.cropChipActive]}
                onPress={() => setSelectedCrop(crop)}
                accessibilityRole="button"
              >
                <Text style={[s.cropChipText, selectedCrop === crop && s.cropChipTextActive]}>
                  {t(`market.listing.crops.${crop}`, { defaultValue: crop })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={s.fieldLabel}>{t('market.priceAlerts.targetPrice')}</Text>
          <TextInput
            style={s.input}
            value={targetPrice}
            onChangeText={setTargetPrice}
            placeholder="e.g. 45"
            placeholderTextColor="#BDBDBD"
            keyboardType="numeric"
          />

          <Pressable
            style={[s.saveBtn, !canAdd && s.saveBtnDisabled]}
            onPress={() => createMutation.mutate()}
            disabled={!canAdd}
            accessibilityRole="button"
          >
            {createMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={s.saveBtnLabel}>{t('market.priceAlerts.save')}</Text>
            )}
          </Pressable>
        </View>
      )}

      {alertsQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      ) : alertsQuery.isError ? (
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => alertsQuery.refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : alerts.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>{t('market.priceAlerts.empty.title')}</Text>
          <Text style={s.emptyBody}>{t('market.priceAlerts.empty.body')}</Text>
          <Pressable
            style={s.emptyBtn}
            onPress={() => setShowAdd(true)}
            accessibilityRole="button"
          >
            <Text style={s.emptyBtnText}>{t('market.priceAlerts.addAlert')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          contentContainerStyle={s.list}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: '#FAFAFA' },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:          { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:        { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:         { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  addBtn:           { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  addBtnText:       { fontSize: 22, color: '#2E7D32', fontWeight: '700' },

  successBanner:    { backgroundColor: '#E8F5E9', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#C8E6C9' },
  successText:      { fontSize: 14, color: '#2E7D32', fontWeight: '600' },

  addForm:          { backgroundColor: '#FFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  fieldLabel:       { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12 },
  cropRow:          { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  cropChip:         { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: '#DDDDDD', backgroundColor: '#FFF', minHeight: 36, justifyContent: 'center' },
  cropChipActive:   { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  cropChipText:     { fontSize: 13, color: '#555', fontWeight: '500' },
  cropChipTextActive:{ color: '#FFF', fontWeight: '700' },
  input:            { backgroundColor: '#FAFAFA', borderRadius: 10, borderWidth: 1.5, borderColor: '#DDDDDD', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A', minHeight: 48, marginBottom: 4 },
  saveBtn:          { minHeight: 48, backgroundColor: '#2E7D32', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  saveBtnDisabled:  { backgroundColor: '#A5D6A7' },
  saveBtnLabel:     { color: '#FFF', fontSize: 15, fontWeight: '700' },

  list:             { padding: 16, gap: 10, paddingBottom: 48 },
  alertCard:        { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EEEEEE' },
  alertTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cropInfo:         { flex: 1 },
  cropName:         { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  priceRow:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  currentPrice:     { fontSize: 14, color: '#555', fontWeight: '500' },
  trendIcon:        { fontSize: 16, fontWeight: '700' },
  targetRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  targetLabel:      { fontSize: 13, color: '#888' },
  targetValue:      { fontSize: 13, fontWeight: '600', color: '#1A1A1A' },
  disabledNote:     { fontSize: 12, color: '#BDBDBD', marginTop: 4, fontStyle: 'italic' },

  errorText:        { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:         { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel:       { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  emptyTitle:       { fontSize: 16, fontWeight: '600', color: '#424242', marginBottom: 4, textAlign: 'center' },
  emptyBody:        { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 16 },
  emptyBtn:         { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#2E7D32', borderRadius: 10 },
  emptyBtnText:     { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
