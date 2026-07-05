import React, { useLayoutEffect, useState } from 'react';
import {
  Alert,
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
import { useRecordInputUsage } from '../../hooks/useInventory';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { StockStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StockStackParamList, 'RecordUseScreen'>;

export function RecordUseScreen({ navigation, route }: Props) {
  const { itemId, itemName, unit, remainingQty } = route.params;
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((st) => st.showToast);
  const mutation = useRecordInputUsage();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [qtyText, setQtyText] = useState('');
  const [useDate, setUseDate]   = useState(new Date());
  const [notes, setNotes]       = useState('');

  const qty       = parseFloat(qtyText) || 0;
  const exceeds   = qty > remainingQty;
  const afterQty  = Math.max(0, remainingQty - qty);
  const isValid   = qty > 0 && !exceeds;

  function stepQty(delta: number) {
    const next = Math.max(0, qty + delta);
    setQtyText(String(next));
  }

  async function handleSave() {
    if (!isValid) return;
    const payload = {
      itemId,
      qtyUsed:    qty,
      usedDate:   useDate.toISOString().split('T')[0] ?? useDate.toISOString(),
      notes:      notes.trim(),
    };

    if (!isOnline) {
      void queueWrite({
        operation: 'CREATE',
        entity:    'inventory_input_usage',
        endpoint:  `/inventory/inputs/${itemId}/use`,
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
          t('inventory.recordUse.saveBtn', { qty }),
          'success',
        );
        if (afterQty === 0) {
          Alert.alert(
            t('inventory.recordUse.outOfStock.title'),
            t('inventory.recordUse.outOfStock.message'),
            [
              { text: t('inventory.recordUse.outOfStock.notNow'), style: 'cancel', onPress: () => navigation.goBack() },
              { text: t('inventory.recordUse.outOfStock.findSupplier'), onPress: () => navigation.goBack() },
            ],
          );
        } else {
          navigation.goBack();
        }
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
          <Text style={s.topBarTitle}>{t('inventory.recordUse.title', { name: itemName })}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.mb8}>
          <AlertBox
            variant="blue"
            message={t('inventory.recordUse.remaining', { qty: `${remainingQty} ${unit}` })}
          />
        </View>

        {/* Quantity stepper */}
        <Text style={s.fieldLabel}>{t('inventory.recordUse.qtyUsed')}</Text>
        <View style={s.stepperRow}>
          <Pressable
            style={s.stepperBtn}
            onPress={() => stepQty(-1)}
            accessibilityRole="button"
            accessibilityLabel={t('inventory.recordUse.decrease')}
          >
            <Text style={s.stepperBtnLabel}>−</Text>
          </Pressable>
          <TextInput
            style={s.stepperInput}
            value={qtyText}
            onChangeText={setQtyText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={t('inventory.recordUse.qtyUsed')}
          />
          <Text style={s.stepperUnit}>{unit}</Text>
          <Pressable
            style={s.stepperBtn}
            onPress={() => stepQty(1)}
            accessibilityRole="button"
            accessibilityLabel={t('inventory.recordUse.increase')}
          >
            <Text style={s.stepperBtnLabel}>+</Text>
          </Pressable>
        </View>

        {exceeds && (
          <View style={s.mb8}>
            <AlertBox
              variant="red"
              message={t('inventory.recordUse.exceeds', { remaining: `${remainingQty} ${unit}` })}
            />
          </View>
        )}

        {qty > 0 && !exceeds && (
          <View style={s.previewBox}>
            <Text style={s.previewText}>
              {t('inventory.recordUse.afterRecord', { qty: `${afterQty} ${unit}` })}
            </Text>
          </View>
        )}

        {/* Date */}
        <Text style={s.fieldLabel}>{t('inventory.recordUse.dateLabel')}</Text>
        <DatePickerField value={useDate} onChange={setUseDate} maximumDate={new Date()} />

        {/* Notes */}
        <Text style={s.fieldLabel}>{t('inventory.recordUse.notesLabel')}</Text>
        <TextInput
          style={[s.textInput, s.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('inventory.recordUse.notesPlaceholder')}
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
              ? t('inventory.recordUse.saving')
              : t('inventory.recordUse.saveBtn', { qty: `${qty} ${unit}` })}
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
  stepperRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stepperBtn: {
    width: 40, height: 40, borderRadius: 6, borderWidth: 1.5, borderColor: '#1A6B3C',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  stepperBtnLabel: { fontSize: 20, color: '#1A6B3C', lineHeight: 24 },
  stepperInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9, fontSize: 16, fontWeight: '700',
    color: '#111827', backgroundColor: '#F9FAFB', textAlign: 'center', minHeight: 40,
  },
  stepperUnit: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  previewBox: {
    backgroundColor: '#EAF4EE', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 10, marginBottom: 8,
  },
  previewText: { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
});
