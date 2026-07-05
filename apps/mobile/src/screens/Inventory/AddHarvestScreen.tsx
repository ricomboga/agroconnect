import React, { useEffect, useLayoutEffect, useState } from 'react';
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
import { useRecordHarvestStore } from '../../hooks/useInventory';
import { useFarms } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { Farm } from '../../api/farm';
import type { StockStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StockStackParamList, 'AddHarvestScreen'>;

type Grade = 'A' | 'B' | 'C';
const GRADES: Grade[] = ['A', 'B', 'C'];

export function AddHarvestScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast   = useUiStore((st) => st.showToast);
  const mutation    = useRecordHarvestStore();
  const farmsQuery  = useFarms();
  const farms: Farm[] = farmsQuery.data?.data ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [crop, setCrop]               = useState('');
  const [variety, setVariety]         = useState('');
  const [harvestDate, setHarvestDate] = useState(new Date());
  const [qtyText, setQtyText]         = useState('');
  const [grade, setGrade]             = useState<Grade>('A');
  const [storage, setStorage]         = useState('');
  const [priceText, setPriceText]     = useState('');
  const [farmId, setFarmId]           = useState('');
  const [farmName, setFarmName]       = useState('');
  const [showFarmPicker, setShowFarmPicker] = useState(false);

  useEffect(() => {
    const first = farms[0];
    if (farms.length === 1 && !farmId && first) {
      setFarmId(first.id);
      setFarmName(first.name);
    }
  }, [farms, farmId]);

  const qty      = parseFloat(qtyText) || 0;
  const price    = parseFloat(priceText) || 0;
  const total    = qty * price;
  const isValid  = crop.trim().length > 0 && qty > 0 && storage.trim().length > 0 && farmId.length > 0;

  async function handleSave() {
    if (!isValid) return;
    const payload = {
      farmId,
      cropName:     crop.trim(),
      variety:      variety.trim() || '—',
      harvestDate:  harvestDate.toISOString().split('T')[0] ?? harvestDate.toISOString(),
      quantityKg:   qty,
      gradeLabel:   grade,
      storageLocation: storage.trim(),
    };

    if (!isOnline) {
      void queueWrite({
        operation: 'CREATE',
        entity:    'harvest_store',
        endpoint:  '/inventory/harvest-store',
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
          t('inventory.addHarvest.successToast', { qty: qty.toLocaleString(), crop: crop.trim() }),
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
          <Text style={s.topBarTitle}>{t('inventory.addHarvest.title')}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Crop */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.cropLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={crop}
          onChangeText={setCrop}
          placeholder={t('inventory.addHarvest.cropPlaceholder')}
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
        />

        {/* Variety */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.varietyLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={variety}
          onChangeText={setVariety}
          placeholder={t('inventory.addHarvest.varietyPlaceholder')}
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
        />

        {/* Harvest date */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.harvestDateLabel')}</Text>
        <DatePickerField value={harvestDate} onChange={setHarvestDate} maximumDate={new Date()} />

        {/* Quantity */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.qtyLabel')}</Text>
        <View style={s.twoColRow}>
          <TextInput
            style={[s.textInput, s.twoColCell]}
            value={qtyText}
            onChangeText={setQtyText}
            keyboardType="decimal-pad"
            placeholder={t('inventory.addHarvest.qtyPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />
          <View style={[s.unitBadge, s.twoColCell]}>
            <Text style={s.unitBadgeLabel}>kg</Text>
          </View>
        </View>

        {/* Grade */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.gradeLabel')}</Text>
        <View style={s.gradeRow}>
          {GRADES.map((g) => (
            <Pressable
              key={g}
              style={[s.gradeChip, grade === g && s.gradeChipActive]}
              onPress={() => setGrade(g)}
              accessibilityRole="radio"
              accessibilityState={{ checked: grade === g }}
            >
              <Text style={[s.gradeChipLabel, grade === g && s.gradeChipLabelActive]}>
                {t(`inventory.addHarvest.grade${g}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Storage location */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.storageLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={storage}
          onChangeText={setStorage}
          placeholder={t('inventory.addHarvest.storagePlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {/* Estimated price */}
        <Text style={s.fieldLabel}>{t('inventory.addHarvest.priceLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="decimal-pad"
          placeholder={t('inventory.addHarvest.pricePlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        {qty > 0 && price > 0 && (
          <View style={s.totalBox}>
            <Text style={s.totalText}>
              {t('inventory.addHarvest.totalPreview', { total: total.toLocaleString() })}
            </Text>
          </View>
        )}

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
              ? t('inventory.addHarvest.saving')
              : t('inventory.addHarvest.saveBtn')}
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
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeChip: {
    flex: 1, minHeight: 40, borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  gradeChipActive:      { borderColor: '#1A6B3C', backgroundColor: '#EAF4EE' },
  gradeChipLabel:       { fontSize: 10, fontWeight: '600', color: '#374151' },
  gradeChipLabelActive: { color: '#1A6B3C' },
  totalBox: {
    backgroundColor: '#EAF4EE', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 10, marginTop: 6,
  },
  totalText: { fontSize: 10, fontWeight: '700', color: '#1A6B3C' },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 8, paddingHorizontal: 9, backgroundColor: '#F9FAFB', minHeight: 36,
  },
  pickerBtnValue:       { fontSize: 10, color: '#111827', flex: 1 },
  pickerBtnPlaceholder: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  pickerChevron:        { fontSize: 16, color: '#9CA3AF', marginLeft: 8 },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
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
