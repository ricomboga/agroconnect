import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
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
import { useAddCustomerCollection, useCustomerCollections } from '../../hooks/useInventory';
import { useFarms } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { Farm } from '../../api/farm';
import type { StockStackParamList } from '../../navigation/types';
import { ANIMAL_PRODUCT_TYPES, getProductConfig } from '../../constants/animalProducts';

type Props = NativeStackScreenProps<StockStackParamList, 'AddCollectionScreen'>;

type ProductOption = { key: string; label: string; unit: string };

const CROP_UNITS: Record<string, string> = {
  maize:   'kg',
  cabbage: 'kg',
  beans:   'kg',
};

const CUSTOM_KEY = 'other';

export function AddCollectionScreen({ navigation, route }: Props) {
  const presetProduct = route.params?.productType ?? '';
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast      = useUiStore((st) => st.showToast);
  const mutation       = useAddCustomerCollection();
  const collectionsQ   = useCustomerCollections();
  const farmsQuery     = useFarms();
  const farms: Farm[]  = farmsQuery.data?.data ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const PRODUCTS: ProductOption[] = [
    ...ANIMAL_PRODUCT_TYPES.map((p) => ({ key: p.key, label: t(p.labelKey), unit: p.unit })),
    { key: 'maize',   label: t('inventory.addCollection.productMaize'),   unit: 'kg' },
    { key: 'cabbage', label: t('inventory.addCollection.productCabbage'), unit: 'kg' },
    { key: 'beans',   label: t('inventory.addCollection.productBeans'),   unit: 'kg' },
    { key: CUSTOM_KEY, label: t('inventory.addCollection.productOther'),  unit: 'kg' },
  ];

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone]               = useState('');
  const [product, setProduct]           = useState(presetProduct || 'eggs');
  const [customProductName, setCustomProductName] = useState('');
  const [qtyText, setQtyText]           = useState('');
  const [priceText, setPriceText]       = useState('');
  const [takenDate, setTakenDate]       = useState(new Date());
  const [notes, setNotes]               = useState('');
  const [farmId, setFarmId]             = useState('');
  const [farmName, setFarmName]         = useState('');
  const [showFarmPicker, setShowFarmPicker] = useState(false);

  useEffect(() => {
    const first = farms[0];
    if (farms.length === 1 && !farmId && first) {
      setFarmId(first.id);
      setFarmName(first.name);
    }
  }, [farms, farmId]);

  const isCustom = product === CUSTOM_KEY;
  const unit    = CROP_UNITS[product] ?? getProductConfig(product).unit;
  const qty     = parseFloat(qtyText) || 0;
  const price   = parseFloat(priceText) || 0;
  const total   = qty * price;
  const isValid =
    customerName.trim().length > 0 &&
    qty > 0 &&
    price > 0 &&
    farmId.length > 0 &&
    (!isCustom || customProductName.trim().length > 0);

  // Recent customer names for quick-fill
  const recentNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const c of collectionsQ.data ?? []) {
      if (!seen.has(c.customerName)) {
        seen.add(c.customerName);
        names.push(c.customerName);
        if (names.length >= 3) break;
      }
    }
    return names;
  }, [collectionsQ.data]);

  async function handleSave() {
    if (!isValid) return;
    const payload = {
      customerName: customerName.trim(),
      customerPhone: phone.trim(),
      productType:  isCustom ? customProductName.trim() : product,
      quantity:     qty,
      unit,
      pricePerUnit: price,
      totalAmount:  total,
      takenDate:    takenDate.toISOString().split('T')[0] ?? takenDate.toISOString(),
      farmId,
      notes:        notes.trim(),
    };

    if (!isOnline) {
      void queueWrite({
        operation: 'CREATE',
        entity:    'customer_collection',
        endpoint:  '/inventory/collections',
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
          t('inventory.addCollection.successToast', {
            name:  customerName.trim(),
            total: total.toLocaleString(),
          }),
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
          <Text style={s.topBarTitle}>{t('inventory.addCollection.title')}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={s.subtitle}>{t('inventory.addCollection.subtitle')}</Text>

        {/* Customer name */}
        <Text style={s.fieldLabel}>{t('inventory.addCollection.nameLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder={t('inventory.addCollection.namePlaceholder')}
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
        />

        {/* Recent customer quick-fill */}
        {recentNames.length > 0 && (
          <View style={s.recentRow}>
            <Text style={s.recentLabel}>{t('inventory.addCollection.recent')}</Text>
            {recentNames.map((name) => (
              <Pressable
                key={name}
                style={s.recentChip}
                onPress={() => setCustomerName(name)}
                accessibilityRole="button"
              >
                <Text style={s.recentChipLabel}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Phone */}
        <Text style={s.fieldLabel}>{t('inventory.addCollection.phoneLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('inventory.addCollection.phonePlaceholder')}
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />

        {/* Product type chips */}
        <Text style={s.fieldLabel}>{t('inventory.addCollection.productLabel')}</Text>
        <View style={s.productGrid}>
          {PRODUCTS.map((p) => (
            <Pressable
              key={p.key}
              style={[s.productChip, product === p.key && s.productChipActive]}
              onPress={() => setProduct(p.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: product === p.key }}
            >
              <Text style={[s.productChipLabel, product === p.key && s.productChipLabelActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isCustom && (
          <TextInput
            style={s.textInput}
            value={customProductName}
            onChangeText={setCustomProductName}
            placeholder={t('inventory.addCollection.customProductPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />
        )}

        {/* Qty + Price */}
        <View style={s.twoColRow}>
          <View style={s.twoColCell}>
            <Text style={s.fieldLabel}>{t('inventory.addCollection.qtyLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={qtyText}
              onChangeText={setQtyText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={s.twoColCell}>
            <Text style={s.fieldLabel}>{t('inventory.addCollection.priceLabel', { unit })}</Text>
            <TextInput
              style={s.textInput}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {qty > 0 && price > 0 && (
          <View style={s.totalBox}>
            <Text style={s.totalText}>
              {t('inventory.addCollection.totalPreview', { total: total.toLocaleString() })}
            </Text>
          </View>
        )}

        {/* Date taken */}
        <Text style={s.fieldLabel}>{t('inventory.addCollection.dateLabel')}</Text>
        <DatePickerField value={takenDate} onChange={setTakenDate} maximumDate={new Date()} />

        {/* Notes */}
        <Text style={s.fieldLabel}>{t('inventory.addCollection.notesLabel')}</Text>
        <TextInput
          style={[s.textInput, s.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('inventory.addCollection.notesPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        {/* Farm picker */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.farmLabel')}</Text>
        <Pressable
          style={s.pickerBtn}
          onPress={() => setShowFarmPicker(true)}
          accessibilityRole="button"
        >
          <Text style={farmId ? s.pickerBtnValue : s.pickerBtnPlaceholder}>
            {farmName || t('inventory.addHarvest.farmPlaceholder')}
          </Text>
          <Text style={s.pickerChevron}>›</Text>
        </Pressable>

        <Pressable
          style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {mutation.isPending
              ? t('inventory.addCollection.saving')
              : isValid
                ? t('inventory.addCollection.saveBtn', { total: total.toLocaleString() })
                : t('inventory.addCollection.saveBtnEmpty')}
          </Text>
        </Pressable>

        <View style={s.bottomPad} />
      </ScrollView>

      {/* Farm picker modal */}
      <Modal
        visible={showFarmPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFarmPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('inventory.addHarvest.farmPickerTitle')}</Text>
              <Pressable
                style={s.modalCloseBtn}
                onPress={() => setShowFarmPicker(false)}
                accessibilityRole="button"
              >
                <Text style={s.modalCloseLabel}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={farms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.farmOption, farmId === item.id && s.farmOptionSelected]}
                  onPress={() => {
                    setFarmId(item.id);
                    setFarmName(item.name);
                    setShowFarmPicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: farmId === item.id }}
                >
                  <View style={s.farmOptionInfo}>
                    <Text style={s.farmOptionName}>{item.name}</Text>
                    <Text style={s.farmOptionSub}>
                      {t('inventory.addHarvest.farmOptionSub', { county: item.county, area: item.areaAcres })}
                    </Text>
                  </View>
                  {farmId === item.id && <Text style={s.farmOptionCheck}>✓</Text>}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={s.farmEmpty}>
                  <Text style={s.farmEmptyText}>{t('inventory.addHarvest.farmPickerEmpty')}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
  subtitle: { fontSize: 10, color: '#6B7280', marginBottom: 8 },
  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12,
  },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 36,
  },
  notesInput: { height: 56, textAlignVertical: 'top' },
  recentRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  recentLabel: { fontSize: 8, color: '#9CA3AF' },
  recentChip: {
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  recentChipLabel: { fontSize: 8, color: '#374151' },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  productChip: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1A6B3C', backgroundColor: '#fff',
  },
  productChipActive:      { backgroundColor: '#1A6B3C' },
  productChipLabel:       { fontSize: 9, fontWeight: '600', color: '#1A6B3C' },
  productChipLabelActive: { color: '#fff' },
  twoColRow:  { flexDirection: 'row', gap: 8 },
  twoColCell: { flex: 1 },
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
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 8, paddingHorizontal: 9, backgroundColor: '#F9FAFB', minHeight: 36,
  },
  pickerBtnValue:       { fontSize: 10, color: '#111827', flex: 1 },
  pickerBtnPlaceholder: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  pickerChevron:        { fontSize: 16, color: '#9CA3AF', marginLeft: 8 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '60%', paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB',
  },
  modalTitle:      { fontSize: 12, fontWeight: '700', color: '#111827' },
  modalCloseBtn:   { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  modalCloseLabel: { fontSize: 16, color: '#6B7280' },
  farmOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB', minHeight: 52,
  },
  farmOptionSelected: { backgroundColor: '#EAF4EE' },
  farmOptionInfo:     { flex: 1 },
  farmOptionName:     { fontSize: 11, fontWeight: '600', color: '#111827' },
  farmOptionSub:      { fontSize: 9, color: '#6B7280', marginTop: 2 },
  farmOptionCheck:    { fontSize: 14, color: '#1A6B3C', fontWeight: '700', marginLeft: 8 },
  farmEmpty:          { padding: 20, alignItems: 'center' },
  farmEmptyText:      { fontSize: 11, color: '#6B7280' },
});
