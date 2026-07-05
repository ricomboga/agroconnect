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
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertBox } from '../../components/ui/AlertBox';
import { useUpdateHarvestStock } from '../../hooks/useInventory';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { StockStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StockStackParamList, 'UpdateHarvestStockScreen'>;

export function UpdateHarvestStockScreen({ navigation, route }: Props) {
  const { harvestId, cropName, remainingKg } = route.params;
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((st) => st.showToast);
  const mutation  = useUpdateHarvestStock();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [newKgText, setNewKgText] = useState(String(remainingKg));
  const [reason, setReason]       = useState('');

  const newKg      = parseFloat(newKgText) || 0;
  const isValid    = newKgText.length > 0 && newKg >= 0;
  const diff       = newKg - remainingKg;
  const hasDiff    = diff !== 0;

  async function handleSave() {
    if (!isValid) return;
    const payload = { harvestId, newRemainingKg: newKg, notes: reason.trim() || undefined };

    if (!isOnline) {
      void queueWrite({
        operation: 'UPDATE',
        entity:    'harvest_stock',
        endpoint:  `/inventory/harvest-store/${harvestId}/stock`,
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
          t('inventory.updateHarvestStock.successToast', { kg: newKg.toLocaleString() }),
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
          <Text style={s.topBarTitle}>{t('inventory.updateHarvestStock.title', { crop: cropName })}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.mb8}>
          <AlertBox
            variant="blue"
            message={t('inventory.updateHarvestStock.currentNote', { kg: remainingKg.toLocaleString() })}
          />
        </View>

        {/* New remaining kg */}
        <Text style={s.fieldLabel}>{t('inventory.updateHarvestStock.newQtyLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={newKgText}
          onChangeText={setNewKgText}
          keyboardType="decimal-pad"
          placeholder={t('inventory.updateHarvestStock.newQtyPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {hasDiff && (
          <View style={[s.diffBox, { backgroundColor: diff > 0 ? '#EAF4EE' : '#FEF3C7' }]}>
            <Text style={[s.diffText, { color: diff > 0 ? '#1A6B3C' : '#92400E' }]}>
              {diff > 0
                ? `+${diff.toLocaleString()}kg (increase)`
                : `${diff.toLocaleString()}kg (decrease)`}
            </Text>
          </View>
        )}

        {/* Reason */}
        <Text style={s.fieldLabel}>{t('inventory.updateHarvestStock.reasonLabel')}</Text>
        <TextInput
          style={[s.textInput, s.notesInput]}
          value={reason}
          onChangeText={setReason}
          placeholder={t('inventory.updateHarvestStock.reasonPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        <Pressable
          style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {mutation.isPending
              ? t('inventory.updateHarvestStock.saving')
              : t('inventory.updateHarvestStock.saveBtn')}
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
  notesInput: { height: 56, textAlignVertical: 'top' },
  diffBox: {
    borderRadius: 5, paddingVertical: 6, paddingHorizontal: 10, marginTop: 6,
  },
  diffText: { fontSize: 10, fontWeight: '600' },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
});
