import React, { useLayoutEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertBox } from '../../components/ui/AlertBox';
import { useRecordHarvestSale } from '../../hooks/useInventory';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { StockStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StockStackParamList, 'RecordHarvestSaleScreen'>;

export function RecordHarvestSaleScreen({ navigation, route }: Props) {
  const { harvestId, cropName, remainingKg, estimatedPricePerKg } = route.params;
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((st) => st.showToast);
  const mutation  = useRecordHarvestSale();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [kgText, setKgText]       = useState('');
  const [priceText, setPriceText] = useState(String(estimatedPricePerKg));
  const [buyer, setBuyer]         = useState('');
  const [saleDate, setSaleDate]   = useState(new Date());

  const kg       = parseFloat(kgText) || 0;
  const price    = parseFloat(priceText) || 0;
  const total    = kg * price;
  const exceeds  = kg > remainingKg;
  const isValid  = kg > 0 && price > 0 && !exceeds;

  async function handleSave() {
    if (!isValid) return;
    const payload = {
      harvestId,
      soldKg:     kg,
      pricePerKg: price,
      buyerName:  buyer.trim() || undefined,
      saleDate:   saleDate.toISOString().split('T')[0] ?? saleDate.toISOString(),
    };

    if (!isOnline) {
      void queueWrite({
        operation: 'CREATE',
        entity:    'harvest_sale',
        endpoint:  `/inventory/harvest-store/${harvestId}/sell`,
        payload:   JSON.stringify(payload),
        status:    'pending',
      });
      showToast(t('common.savedOffline'), 'info');
      navigation.goBack();
      return;
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        showToast(
          t('inventory.recordHarvestSale.successToast', { amount: total.toLocaleString() }),
          'success',
        );
        navigation.goBack();
      },
    });
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('inventory.recordHarvestSale.title', { crop: cropName })}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.mb8}>
          <AlertBox
            variant="blue"
            message={t('inventory.recordHarvestSale.availableNote', { kg: remainingKg.toLocaleString() })}
          />
        </View>

        {/* Quantity sold */}
        <Text style={s.fieldLabel}>{t('inventory.recordHarvestSale.kgLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={kgText}
          onChangeText={setKgText}
          keyboardType="decimal-pad"
          placeholder={t('inventory.recordHarvestSale.kgPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {exceeds && (
          <View style={s.mb8}>
            <AlertBox
              variant="red"
              message={t('inventory.recordHarvestSale.exceeds', { kg: remainingKg.toLocaleString() })}
            />
          </View>
        )}

        {/* Price per kg */}
        <Text style={s.fieldLabel}>{t('inventory.recordHarvestSale.priceLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="decimal-pad"
          placeholder={t('inventory.recordHarvestSale.pricePlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {kg > 0 && price > 0 && !exceeds && (
          <View style={s.totalBox}>
            <Text style={s.totalText}>
              {t('inventory.recordHarvestSale.totalPreview', { total: total.toLocaleString() })}
            </Text>
          </View>
        )}

        {/* Buyer */}
        <Text style={s.fieldLabel}>{t('inventory.recordHarvestSale.buyerLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={buyer}
          onChangeText={setBuyer}
          placeholder={t('inventory.recordHarvestSale.buyerPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {/* Sale date */}
        <Text style={s.fieldLabel}>{t('inventory.recordHarvestSale.dateLabel')}</Text>
        <DatePickerField value={saleDate} onChange={setSaleDate} maximumDate={new Date()} />

        <Pressable
          style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {mutation.isPending
              ? t('inventory.recordHarvestSale.saving')
              : t('inventory.recordHarvestSale.saveBtn')}
          </Text>
        </Pressable>

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  topArea: { backgroundColor: '#1A6B3C' },
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
  scrollContent: { padding: 12, paddingBottom: 32 },
  mb8: { marginBottom: 8 },
  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12,
  },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 36,
  },
  totalBox: {
    backgroundColor: '#EAF4EE', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 10, marginTop: 6,
  },
  totalText: { fontSize: 11, fontWeight: '700', color: '#1A6B3C' },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
});
