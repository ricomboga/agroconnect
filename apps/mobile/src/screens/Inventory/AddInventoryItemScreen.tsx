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
import { AlertBox } from '../../components/ui/AlertBox';
import { useAddInventoryItem, type InputCategory } from '../../hooks/useInventory';
import { useFarms } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import { CATEGORY_CONFIG } from '../../utils/inventoryHelpers';
import type { Farm } from '../../api/farm';
import type { StockStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<StockStackParamList, 'AddStockScreen'>;

type UnitType = 'kg' | 'bags' | 'litres' | 'vials' | 'pieces' | 'metres' | 'other';

const CATEGORY_ROWS: InputCategory[][] = [
  ['fertiliser',    'pesticide',      'herbicide'],
  ['seed',          'animal_feed',    'animal_medicine'],
  ['vaccine',       'tool_equipment', 'other'],
];

const UNITS: UnitType[] = ['kg', 'bags', 'litres', 'vials', 'pieces', 'metres', 'other'];

const CATEGORY_DEFAULT_UNIT: Record<InputCategory, UnitType> = {
  fertiliser:      'bags',
  pesticide:       'kg',
  herbicide:       'litres',
  seed:            'kg',
  animal_feed:     'bags',
  animal_medicine: 'vials',
  vaccine:         'vials',
  tool_equipment:  'pieces',
  other:           'pieces',
};

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AddInventoryItemScreen({ navigation }: Props) {
  const { t }                           = useTranslation();
  const { isOnline, queueWrite }        = useOfflineSync();
  const showToast                       = useUiStore((st) => st.showToast);
  const addItemMutation                 = useAddInventoryItem();
  const farmsQuery                      = useFarms();
  const farms: Farm[]                   = farmsQuery.data?.data ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [category, setCategory]               = useState<InputCategory | null>(null);
  const [name, setName]                       = useState('');
  const [unit, setUnit]                       = useState<UnitType>('kg');
  const [qtyText, setQtyText]                 = useState('');
  const [costText, setCostText]               = useState('');
  const [supplier, setSupplier]               = useState('');
  const [purchaseDate, setPurchaseDate]       = useState(new Date());
  const [selectedFarmId, setSelectedFarmId]   = useState('');
  const [selectedFarmName, setSelectedFarmName] = useState('');
  const [showFarmPicker, setShowFarmPicker]   = useState(false);
  const [reorderText, setReorderText]         = useState('20');
  const [notes, setNotes]                     = useState('');

  // Auto-select the only farm if farmer has exactly one
  useEffect(() => {
    const first = farms[0];
    if (farms.length === 1 && !selectedFarmId && first) {
      setSelectedFarmId(first.id);
      setSelectedFarmName(first.name);
    }
  }, [farms, selectedFarmId]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const qty        = parseFloat(qtyText) || 0;
  const costPer    = parseFloat(costText) || 0;
  const total      = qty * costPer;
  const reorderPct = Math.max(0, Math.min(100, parseInt(reorderText, 10) || 0));
  const reorderQty = qty > 0 ? Math.floor(qty * reorderPct / 100) : 0;

  const isFormValid =
    category !== null &&
    name.trim().length > 0 &&
    qty > 0 &&
    costPer > 0 &&
    selectedFarmId.length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleCategorySelect(cat: InputCategory) {
    setCategory(cat);
    setUnit(CATEGORY_DEFAULT_UNIT[cat]);
  }

  function handleDateChange(selected: Date) {
    setPurchaseDate(selected);
  }

  async function handleSave() {
    if (!isFormValid || !category) return;
    const cfg = CATEGORY_CONFIG[category];
    const payload = {
      farmId:            selectedFarmId,
      name:              name.trim(),
      category,
      emoji:             cfg.emoji,
      unit,
      purchasedQty:      qty,
      totalPurchasedQty: qty,
      costPerUnit:       costPer,
      supplier:          supplier.trim(),
      lastUsedDate:      null as string | null,
      reorderAlert:      reorderPct > 0,
      scheduledUseDate:  null as string | null,
      notes:             notes.trim(),
    };

    if (!isOnline) {
      void queueWrite({
        operation: 'CREATE',
        entity:    'inventory_inputs',
        endpoint:  '/inventory/inputs',
        payload:   JSON.stringify(payload),
        status:    'pending',
      });
      showToast(t('common.savedOffline'), 'info');
      navigation.goBack();
      return;
    }

    addItemMutation.mutate(payload, {
      onSuccess: () => {
        showToast(
          t('inventory.addItem.successToast', { name: name.trim(), qty, unit }),
          'success',
        );
        navigation.goBack();
      },
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />

      {/* TopBar */}
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable
            style={s.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('inventory.addItem.topBarTitle')}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info alert */}
        <View style={s.mb8}>
          <AlertBox variant="blue" message={t('inventory.addItem.infoAlert')} />
        </View>

        {/* ── Category 3×3 grid ─────────────────────────────────────────────── */}
        <Text style={s.sectionHeader}>{t('inventory.addItem.categoryTitle')}</Text>
        <View style={s.categoryGrid}>
          {CATEGORY_ROWS.map((row, rowIdx) => (
            <View key={rowIdx} style={s.categoryRow}>
              {row.map((cat) => {
                const cfg      = CATEGORY_CONFIG[cat];
                const selected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[s.categoryCell, selected && s.categoryCellSelected]}
                    onPress={() => handleCategorySelect(cat)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={s.categoryEmoji}>{cfg.emoji}</Text>
                    <Text
                      style={[s.categoryLabel, selected && s.categoryLabelSelected]}
                      numberOfLines={2}
                    >
                      {t(`inventory.addItem.category.${cat}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Item name ─────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.nameLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={name}
          onChangeText={setName}
          placeholder={
            category
              ? t(`inventory.addItem.namePlaceholder.${category}`)
              : t('inventory.addItem.namePlaceholderDefault')
          }
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
          accessibilityLabel={t('inventory.addItem.nameLabel')}
        />

        {/* ── Unit chips ────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.unitLabel')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipScroll}
          contentContainerStyle={s.chipRow}
        >
          {UNITS.map((u) => (
            <Pressable
              key={u}
              style={[s.chip, unit === u && s.chipActive]}
              onPress={() => setUnit(u)}
              accessibilityRole="radio"
              accessibilityState={{ checked: unit === u }}
            >
              <Text style={[s.chipText, unit === u && s.chipTextActive]}>
                {t(`inventory.addItem.unit.${u}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Qty + Cost (two-column) ───────────────────────────────────────── */}
        <View style={s.twoColRow}>
          <View style={s.twoColCell}>
            <Text style={s.fieldLabel}>{t('inventory.addItem.qtyLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={qtyText}
              onChangeText={setQtyText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              accessibilityLabel={t('inventory.addItem.qtyLabel')}
            />
          </View>
          <View style={s.twoColCell}>
            <Text style={s.fieldLabel}>{t('inventory.addItem.costLabel', { unit })}</Text>
            <TextInput
              style={s.textInput}
              value={costText}
              onChangeText={setCostText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              accessibilityLabel={t('inventory.addItem.costLabel', { unit })}
            />
          </View>
        </View>

        {qty > 0 && costPer > 0 && (
          <View style={s.totalBox}>
            <Text style={s.totalText}>
              {t('inventory.addItem.totalCost', { total: total.toLocaleString() })}
            </Text>
          </View>
        )}

        {/* ── Supplier ──────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.supplierLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={supplier}
          onChangeText={setSupplier}
          placeholder={t('inventory.addItem.supplierPlaceholder')}
          placeholderTextColor="#9CA3AF"
          accessibilityLabel={t('inventory.addItem.supplierLabel')}
        />

        {/* ── Purchase date ─────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.dateLabel')}</Text>
        <DatePickerField
          value={purchaseDate}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />

        {/* ── Linked farm ───────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.farmLabel')}</Text>
        <Pressable
          style={s.pickerBtn}
          onPress={() => setShowFarmPicker(true)}
          accessibilityRole="button"
        >
          <Text style={selectedFarmId ? s.pickerBtnValue : s.pickerBtnPlaceholder}>
            {selectedFarmName || t('inventory.addItem.farmPlaceholder')}
          </Text>
          <Text style={s.pickerChevron}>›</Text>
        </Pressable>

        {/* ── Reorder alert threshold ───────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.reorderLabel')}</Text>
        <View style={s.reorderRow}>
          <TextInput
            style={[s.textInput, s.reorderInput]}
            value={reorderText}
            onChangeText={setReorderText}
            keyboardType="number-pad"
            placeholder="20"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={t('inventory.addItem.reorderLabel')}
          />
          <Text style={s.reorderPctLabel}>%</Text>
        </View>
        {qty > 0 && reorderPct > 0 && (
          <Text style={s.reorderPreview}>
            {t('inventory.addItem.reorderPreview', { qty: reorderQty, unit })}
          </Text>
        )}

        {/* ── Notes ─────────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('inventory.addItem.notesLabel')}</Text>
        <TextInput
          style={[s.textInput, s.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('inventory.addItem.notesPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          accessibilityLabel={t('inventory.addItem.notesLabel')}
        />

        {/* ── Save button ───────────────────────────────────────────────────── */}
        <Pressable
          style={[
            s.saveBtn,
            (!isFormValid || addItemMutation.isPending) && s.saveBtnDisabled,
          ]}
          onPress={() => { void handleSave(); }}
          disabled={!isFormValid || addItemMutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {addItemMutation.isPending
              ? t('inventory.addItem.saving')
              : t('inventory.addItem.saveBtn')}
          </Text>
        </Pressable>

        {/* ── AI cross-links info ───────────────────────────────────────────── */}
        {category !== null && (
          <View style={s.aiBox}>
            <Text style={s.aiTitle}>{t('inventory.addItem.aiTitle')}</Text>
            <View style={s.aiRow}>
              <Text style={s.aiDot}>·</Text>
              <Text style={s.aiText}>
                {t('inventory.addItem.aiExpense', {
                  amount: total > 0 ? total.toLocaleString() : '—',
                })}
              </Text>
            </View>
            {category === 'vaccine' && (
              <View style={s.aiRow}>
                <Text style={s.aiDot}>·</Text>
                <Text style={s.aiText}>{t('inventory.addItem.aiVaccine')}</Text>
              </View>
            )}
            {category === 'fertiliser' && (
              <View style={s.aiRow}>
                <Text style={s.aiDot}>·</Text>
                <Text style={s.aiText}>{t('inventory.addItem.aiFertiliser')}</Text>
              </View>
            )}
          </View>
        )}

        <View style={s.bottomPad} />
      </ScrollView>

      {/* ── Farm picker modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showFarmPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFarmPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('inventory.addItem.farmPickerTitle')}</Text>
              <Pressable
                style={s.modalCloseBtn}
                onPress={() => setShowFarmPicker(false)}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Text style={s.modalCloseLabel}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={farms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    s.farmOption,
                    selectedFarmId === item.id && s.farmOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedFarmId(item.id);
                    setSelectedFarmName(item.name);
                    setShowFarmPicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedFarmId === item.id }}
                >
                  <View style={s.farmOptionInfo}>
                    <Text style={s.farmOptionName}>{item.name}</Text>
                    <Text style={s.farmOptionSub}>
                      {t('inventory.addItem.farmOptionSub', {
                        county: item.county,
                        area:   item.areaAcres,
                      })}
                    </Text>
                  </View>
                  {selectedFarmId === item.id && (
                    <Text style={s.farmOptionCheck}>✓</Text>
                  )}
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={s.farmEmpty}>
                  <Text style={s.farmEmptyText}>
                    {t('inventory.addItem.farmPickerEmpty')}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#fff' },
  topArea:      { backgroundColor: '#1A6B3C' },
  topBar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    minHeight: 44, minWidth: 44,
  },
  backArrow:    { fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  backLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  topBarTitle:  { fontSize: 15, fontWeight: '600', color: '#fff' },
  topBarSpacer: { minWidth: 64 },

  scroll:        { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 11, paddingBottom: 32 },

  mb8: { marginBottom: 8 },

  sectionHeader: {
    fontSize: 9, fontWeight: '700', color: '#1A6B3C',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 10, marginBottom: 8,
  },

  // ── Category grid ─────────────────────────────────────────────────────────
  categoryGrid: { gap: 6, marginBottom: 14 },
  categoryRow:  { flexDirection: 'row', gap: 6 },
  categoryCell: {
    flex: 1, minHeight: 68,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
  },
  categoryCellSelected: {
    borderWidth: 2, borderColor: '#1A6B3C', backgroundColor: '#EAF4EE',
  },
  categoryEmoji: { fontSize: 20, marginBottom: 4 },
  categoryLabel: {
    fontSize: 8, fontWeight: '500', color: '#374151', textAlign: 'center',
  },
  categoryLabelSelected: { color: '#1A6B3C', fontWeight: '600' },

  // ── Form fields ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: '#374151',
    marginBottom: 4, marginTop: 10,
  },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 36,
  },

  // ── Unit chips ────────────────────────────────────────────────────────────
  chipScroll: { marginBottom: 2 },
  chipRow:    { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chip: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1A6B3C', backgroundColor: '#fff',
    minHeight: 30, justifyContent: 'center',
  },
  chipActive:     { backgroundColor: '#1A6B3C' },
  chipText:       { fontSize: 9, fontWeight: '600', color: '#1A6B3C' },
  chipTextActive: { color: '#fff' },

  // ── Two-column row ────────────────────────────────────────────────────────
  twoColRow:  { flexDirection: 'row', gap: 8 },
  twoColCell: { flex: 1 },

  // ── Total cost ────────────────────────────────────────────────────────────
  totalBox: {
    backgroundColor: '#EAF4EE', borderRadius: 5,
    paddingVertical: 5, paddingHorizontal: 9, marginTop: 5,
  },
  totalText: { fontSize: 10, fontWeight: '700', color: '#1A6B3C' },

  // ── Date / Farm picker triggers ───────────────────────────────────────────
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 8, paddingHorizontal: 9, backgroundColor: '#F9FAFB', minHeight: 36,
  },
  pickerBtnValue:       { fontSize: 10, color: '#111827', flex: 1 },
  pickerBtnPlaceholder: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  pickerChevron:        { fontSize: 16, color: '#9CA3AF', marginLeft: 8 },

  dateConfirmBtn: {
    alignSelf: 'flex-end', marginTop: 4, minHeight: 36,
    paddingHorizontal: 16, justifyContent: 'center',
    backgroundColor: '#1A6B3C', borderRadius: 6,
  },
  dateConfirmLabel: { fontSize: 10, color: '#fff', fontWeight: '600' },

  // ── Reorder alert ─────────────────────────────────────────────────────────
  reorderRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reorderInput:   { flex: 1, minHeight: 36 },
  reorderPctLabel:{ fontSize: 11, fontWeight: '600', color: '#374151' },
  reorderPreview: { fontSize: 8, color: '#6B7280', marginTop: 4 },

  // ── Notes ─────────────────────────────────────────────────────────────────
  notesInput: { height: 56, textAlignVertical: 'top' },

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── AI cross-links info ───────────────────────────────────────────────────
  aiBox: {
    marginTop: 10, backgroundColor: '#EAF4EE',
    borderWidth: 1, borderColor: '#2E8B57', borderRadius: 8, padding: 10,
  },
  aiTitle: { fontSize: 9, fontWeight: '700', color: '#0D4A28', marginBottom: 5 },
  aiRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 2 },
  aiDot:   { fontSize: 9, color: '#1A6B3C', lineHeight: 14 },
  aiText:  { fontSize: 9, color: '#0D4A28', flex: 1, lineHeight: 14 },

  bottomPad: { height: 20 },

  // ── Farm picker modal ─────────────────────────────────────────────────────
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
