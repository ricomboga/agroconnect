import React, { useLayoutEffect, useMemo, useState } from 'react';
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
import {
  useAnimalProducts,
  useRecordAnimalProduct,
  useUpdateAnimalProduct,
} from '../../hooks/useInventory';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import type { StockStackParamList } from '../../navigation/types';
import { getProductConfig, productLabel } from '../../constants/animalProducts';

type Props = NativeStackScreenProps<StockStackParamList, 'RecordAnimalProductScreen'>;

const FRACTIONS = [0.5, 1, 2, 5];
const STREAK_EMOJIS = ['🌱', '🌿', '🌾', '🏆'];

function streakEmoji(days: number): string {
  if (days >= 30) return STREAK_EMOJIS[3] ?? '🏆';
  if (days >= 14) return STREAK_EMOJIS[2] ?? '🌾';
  if (days >= 7)  return STREAK_EMOJIS[1] ?? '🌿';
  return STREAK_EMOJIS[0] ?? '🌱';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function isSameDay(iso: string, d: Date): boolean {
  const a = new Date(iso);
  return (
    a.getFullYear() === d.getFullYear() &&
    a.getMonth() === d.getMonth() &&
    a.getDate() === d.getDate()
  );
}

export function RecordAnimalProductScreen({ navigation, route }: Props) {
  const { productType, existingId, existingQty, farmId, animalGroupId, pricePerUnit } = route.params;
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast    = useUiStore((st) => st.showToast);
  const recordMut    = useRecordAnimalProduct();
  const updateMut    = useUpdateAnimalProduct();
  const productsQ    = useAnimalProducts();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const isUpdating = !!existingId;
  const [qtyText, setQtyText]     = useState(existingQty != null ? String(existingQty) : '');
  const [collectDate, setDate]    = useState(new Date());
  const [notes, setNotes]         = useState('');

  const productConfig = getProductConfig(productType);
  const productDisplayName = productLabel(productType, t);

  const qty      = parseFloat(qtyText) || 0;
  const isValid  = qty > 0;
  const unit     = t(`inventory.units.${productConfig.unit}`, { defaultValue: productConfig.unit });

  // Compute yesterday's value and week average from all records
  const records = useMemo(() => {
    return (productsQ.data ?? []).filter((r) => r.productType === productType);
  }, [productsQ.data, productType]);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return records.find((r) => isSameDay(r.date, d))?.quantity ?? null;
  }, [records]);

  const weekAvg = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const week = records.filter((r) => new Date(r.date) >= cutoff);
    if (week.length === 0) return null;
    return (week.reduce((s, r) => s + r.quantity, 0) / week.length).toFixed(1);
  }, [records]);

  // Consecutive recording streak
  const streak = useMemo(() => {
    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let count = 0;
    let prev  = new Date();
    for (const r of sorted) {
      const d = new Date(r.date);
      const diff = Math.round((prev.getTime() - d.getTime()) / 86400000);
      if (diff <= 1) { count++; prev = d; } else break;
    }
    return count;
  }, [records]);

  const alreadyRecordedToday = useMemo(
    () => records.some((r) => isSameDay(r.date, collectDate)),
    [records, collectDate],
  );

  async function handleSave() {
    if (!isValid) return;
    const dateStr = collectDate.toISOString().split('T')[0] ?? collectDate.toISOString();
    const displayDate = formatDate(collectDate);

    if (isUpdating && existingId) {
      const payload = { id: existingId, quantity: qty, notes: notes.trim() };
      if (!isOnline) {
        void queueWrite({ operation: 'UPDATE', entity: 'animal_products', endpoint: `/inventory/animal-products/${existingId}`, payload: JSON.stringify(payload), status: 'pending' });
        showToast(t('common.savedOffline'), 'info');
        navigation.goBack();
        return;
      }
      updateMut.mutate(payload, {
        onSuccess: () => {
          showToast(t('inventory.recordProduct.successToast', { qty, unit, date: displayDate }), 'success');
          navigation.goBack();
        },
      });
    } else {
      const payload = { productType, quantity: qty, date: dateStr, farmId, animalGroupId, pricePerUnit, unit: productConfig.unit };
      if (!isOnline) {
        void queueWrite({ operation: 'CREATE', entity: 'animal_products', endpoint: '/inventory/animal-products', payload: JSON.stringify(payload), status: 'pending' });
        showToast(t('inventory.recordProduct.savedOfflineToast'), 'info');
        navigation.goBack();
        return;
      }
      recordMut.mutate(payload, {
        onSuccess: () => {
          showToast(t('inventory.recordProduct.successToast', { qty, unit, date: displayDate }), 'success');
          navigation.goBack();
        },
      });
    }
  }

  const isPending = recordMut.isPending || updateMut.isPending;
  const title = t('inventory.recordProduct.titleGeneric', {
    emoji: productConfig.emoji,
    product: productDisplayName,
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{title}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {isUpdating && (
          <View style={s.mb8}>
            <AlertBox variant="amber" message={t('inventory.recordProduct.updatingAlert')} />
          </View>
        )}

        {!isUpdating && alreadyRecordedToday && (
          <View style={s.mb8}>
            <AlertBox
              variant="amber"
              message={t('inventory.recordProduct.dupDateAlert', { qty: existingQty ?? 0, unit })}
            />
          </View>
        )}

        {/* AI hint */}
        {(yesterday != null || weekAvg != null) && (
          <View style={s.aiHint}>
            <Text style={s.aiHintText}>
              {t('inventory.recordProduct.aiHint', {
                yesterday: yesterday != null ? `${yesterday} ${unit}` : '—',
                weekAvg:   weekAvg != null ? `${weekAvg} ${unit}` : '—',
              })}
            </Text>
          </View>
        )}

        {/* Quantity */}
        <Text style={s.fieldLabel}>{t('inventory.recordProduct.qtyLabel')}</Text>
        <View style={s.qtyRow}>
          <TextInput
            style={s.qtyInput}
            value={qtyText}
            onChangeText={setQtyText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
          />
          <Text style={s.qtyUnit}>{unit}</Text>
        </View>
        <View style={s.fractionRow}>
          {FRACTIONS.map((frac) => (
            <Pressable
              key={frac}
              style={s.fracBtn}
              onPress={() => setQtyText(String(qty + frac))}
              accessibilityRole="button"
            >
              <Text style={s.fracBtnLabel}>{t('inventory.recordProduct.fractionBtn', { frac })}</Text>
            </Pressable>
          ))}
        </View>

        {/* Date */}
        <Text style={s.fieldLabel}>{t('inventory.recordProduct.dateLabel')}</Text>
        <DatePickerField value={collectDate} onChange={setDate} maximumDate={new Date()} />

        {/* Notes */}
        <Text style={s.fieldLabel}>{t('inventory.recordProduct.notesLabel')}</Text>
        <TextInput
          style={[s.textInput, s.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('inventory.recordProduct.notesPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        {/* Streak */}
        {streak >= 3 && (
          <View style={s.streakBox}>
            <Text style={s.streakText}>
              {t('inventory.recordProduct.streakMsg', { emoji: streakEmoji(streak), days: streak })}
            </Text>
          </View>
        )}

        <Pressable
          style={[s.saveBtn, (!isValid || isPending) && s.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={!isValid || isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {isPending
              ? t('inventory.recordProduct.saving')
              : isUpdating
                ? t('inventory.recordProduct.updateBtn')
                : t('inventory.recordProduct.saveBtn')}
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
  notesInput:  { height: 56, textAlignVertical: 'top' },
  aiHint: {
    backgroundColor: '#EAF4EE', borderRadius: 6, padding: 8, marginBottom: 8,
  },
  aiHintText: { fontSize: 9, color: '#0D4A28' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    fontSize: 22, fontWeight: '800', color: '#111827', backgroundColor: '#F9FAFB',
    textAlign: 'center', minHeight: 48,
  },
  qtyUnit:    { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  fractionRow:{ flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: 4 },
  fracBtn: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#1A6B3C', backgroundColor: '#fff',
  },
  fracBtnLabel: { fontSize: 9, fontWeight: '600', color: '#1A6B3C' },
  streakBox: {
    backgroundColor: '#FEF9C3', borderRadius: 6, padding: 8,
    marginTop: 8, alignItems: 'center',
  },
  streakText: { fontSize: 10, fontWeight: '600', color: '#854D0E' },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
});
