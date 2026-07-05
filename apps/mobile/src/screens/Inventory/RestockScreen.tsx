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
import { useRestockItem } from '../../hooks/useInventory';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { StockStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StockStackParamList, 'RestockScreen'>;

export function RestockScreen({ navigation, route }: Props) {
  const { itemId, itemName, unit, remainingQty, supplier: defaultSupplier, costPerUnit: defaultCost } = route.params;
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((st) => st.showToast);
  const mutation  = useRestockItem();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [qtyText, setQtyText]       = useState('');
  const [costText, setCostText]     = useState(String(defaultCost));
  const [supplier, setSupplier]     = useState(defaultSupplier);
  const [receipt, setReceipt]       = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date());

  const qty      = parseFloat(qtyText) || 0;
  const cost     = parseFloat(costText) || 0;
  const total    = qty * cost;
  const newTotal = remainingQty + qty;
  const isValid  = qty > 0 && cost > 0 && supplier.trim().length > 0;

  async function handleSave() {
    if (!isValid) return;
    const payload = {
      itemId,
      qtyAdded:     qty,
      costPerUnit:  cost,
      purchaseDate: purchaseDate.toISOString().split('T')[0] ?? purchaseDate.toISOString(),
      supplier:     supplier.trim(),
    };

    if (!isOnline) {
      void queueWrite({
        operation: 'CREATE',
        entity:    'inventory_restock',
        endpoint:  `/inventory/inputs/${itemId}/restock`,
        payload:   JSON.stringify(payload),
        status:    'pending',
      });
      showToast(t('inventory.restock.savedOfflineToast', { cost: total.toLocaleString() }), 'info');
      navigation.goBack();
      return;
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        showToast(
          t('inventory.restock.successToast', { cost: total.toLocaleString() }),
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
          <Text style={s.topBarTitle}>{t('inventory.restock.title', { name: itemName })}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.mb8}>
          <AlertBox
            variant="blue"
            message={t('inventory.restock.currentStock', { qty: `${remainingQty} ${unit}` })}
          />
        </View>

        {/* Qty purchased */}
        <Text style={s.fieldLabel}>{t('inventory.restock.qtyPurchased')}</Text>
        <View style={s.twoColRow}>
          <TextInput
            style={[s.textInput, s.twoColCell]}
            value={qtyText}
            onChangeText={setQtyText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
          />
          <View style={[s.unitBadge, s.twoColCell]}>
            <Text style={s.unitBadgeLabel}>{unit}</Text>
          </View>
        </View>

        {/* Cost per unit */}
        <Text style={s.fieldLabel}>{t('inventory.restock.costPerUnit', { unit })}</Text>
        <TextInput
          style={s.textInput}
          value={costText}
          onChangeText={setCostText}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor="#9CA3AF"
        />

        {qty > 0 && cost > 0 && (
          <View style={s.previewBox}>
            <Text style={s.previewTitle}>{t('inventory.restock.previewTitle')}</Text>
            <Text style={s.previewLine}>{t('inventory.restock.previewNewQty', { qty: `${newTotal} ${unit}` })}</Text>
            <Text style={s.previewLine}>{t('inventory.restock.totalCost', { total: total.toLocaleString() })}</Text>
            <Text style={s.previewNote}>{t('inventory.restock.previewNote')}</Text>
          </View>
        )}

        {/* Supplier */}
        <Text style={s.fieldLabel}>{t('inventory.restock.supplierLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={supplier}
          onChangeText={setSupplier}
          placeholder={t('inventory.restock.supplierPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {/* Purchase date */}
        <Text style={s.fieldLabel}>{t('inventory.restock.dateLabel')}</Text>
        <DatePickerField value={purchaseDate} onChange={setPurchaseDate} maximumDate={new Date()} />

        {/* Receipt */}
        <Text style={s.fieldLabel}>{t('inventory.restock.receiptLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={receipt}
          onChangeText={setReceipt}
          placeholder={t('inventory.restock.receiptPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        <Pressable
          style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {mutation.isPending
              ? t('inventory.restock.saving')
              : t('inventory.restock.saveBtn')}
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
  twoColRow:  { flexDirection: 'row', gap: 8 },
  twoColCell: { flex: 1 },
  unitBadge: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', minHeight: 36,
  },
  unitBadgeLabel: { fontSize: 10, fontWeight: '600', color: '#374151' },
  previewBox: {
    backgroundColor: '#EAF4EE', borderRadius: 6, padding: 10, marginTop: 8, marginBottom: 4,
  },
  previewTitle: { fontSize: 9, fontWeight: '700', color: '#0D4A28', marginBottom: 4 },
  previewLine:  { fontSize: 10, fontWeight: '600', color: '#1A6B3C', marginBottom: 2 },
  previewNote:  { fontSize: 8, color: '#065F46', marginTop: 4 },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
});
