import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useRecordAnimalProduct, type AnimalProductRecord } from '../../../hooks/useInventory';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { useUiStore } from '../../../store/ui.store';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnimalGroup {
  id: string;
  farmId: string;
  name: string;
  count: number;
  productType: 'eggs' | 'milk';
  pricePerUnit: number;
  yesterdayQty?: number | null;
  weekAvg?: number | null;
  consecutiveDays?: number;
}

interface Props {
  productType: 'eggs' | 'milk';
  animalGroup: AnimalGroup;
  existingRecord?: AnimalProductRecord;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export function RecordProductModal({
  productType,
  animalGroup,
  existingRecord,
  onClose,
  onSuccess,
}: Props) {
  const { t }                   = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const mutation                 = useRecordAnimalProduct();
  const qc                       = useQueryClient();
  const showToast                = useUiStore((s) => s.showToast);

  const unit = productType === 'eggs' ? t('inventory.recordProduct.unitEggs') : t('inventory.recordProduct.unitMilk');

  // ── State ──────────────────────────────────────────────────────────────────

  const initialQty = existingRecord?.quantity ?? 0;
  const [qtyText, setQtyText] = useState<string>(initialQty > 0 ? String(initialQty) : '');
  const [qty, setQty]         = useState<number>(initialQty);
  const [collectionDate, setCollectionDate] = useState<Date>(new Date());
  const [notes, setNotes]     = useState<string>('');
  const [dateDupRecord, setDateDupRecord]   = useState<AnimalProductRecord | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Slide-up animation on mount ────────────────────────────────────────────

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  function dismissSheet(cb?: () => void) {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      cb?.();
      onClose();
    });
  }

  // ── Qty helpers ────────────────────────────────────────────────────────────

  function handleQtyText(text: string) {
    setQtyText(text);
    const n = parseFloat(text);
    if (!isNaN(n) && n >= 0) setQty(n);
  }

  function applyFraction(frac: number) {
    const base  = isNaN(parseFloat(qtyText)) ? 0 : Math.floor(parseFloat(qtyText));
    const next  = Math.round((base + frac) * 4) / 4;
    setQty(next);
    setQtyText(String(next));
  }

  // ── Date navigation ────────────────────────────────────────────────────────

  const today    = new Date();
  const isToday  = collectionDate.toDateString() === today.toDateString();

  function stepDate(delta: number) {
    const next = new Date(collectionDate);
    next.setDate(next.getDate() + delta);
    if (next <= today) {
      setCollectionDate(next);
      // Clear dup warning — caller must pass records if needed; simplified check here
      setDateDupRecord(null);
      if (
        existingRecord &&
        existingRecord.date === next.toISOString().split('T')[0]
      ) {
        setDateDupRecord(existingRecord);
      }
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const isUpdate    = !!existingRecord && isToday;
  const canSave     = qty > 0;
  const hasStreak   = typeof animalGroup.consecutiveDays === 'number' && animalGroup.consecutiveDays >= 2;
  const hasHistory  = animalGroup.yesterdayQty != null || animalGroup.weekAvg != null;

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!canSave) return;

    const dateStr = collectionDate.toISOString().split('T')[0] as string;

    const payload = {
      productType,
      quantity: qty,
      date: dateStr,
      farmId: animalGroup.farmId,
      animalGroupId: animalGroup.id,
      pricePerUnit: animalGroup.pricePerUnit,
      ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
    };

    if (!isOnline) {
      await queueWrite({
        operation: 'CREATE',
        entity: 'animal-products',
        endpoint: '/inventory/animal-products',
        payload: JSON.stringify(payload),
      });
      showToast(t('inventory.recordProduct.savedOfflineToast'), 'info');
      dismissSheet(onSuccess);
      return;
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['inventory', 'animal-products'] });
        qc.invalidateQueries({ queryKey: ['inventory'] });
        const formattedDate = formatDate(collectionDate);
        showToast(
          t('inventory.recordProduct.successToast', { qty, unit, date: formattedDate }),
          'success',
        );
        dismissSheet(onSuccess);
      },
    });
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      transparent
      animationType="none"
      visible
      onRequestClose={() => dismissSheet()}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => dismissSheet()}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kvWrapper}
        >
          <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
            <View style={s.handle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Header ────────────────────────────────────────────── */}
              <Text style={s.headerTitle}>
                {productType === 'eggs'
                  ? t('inventory.recordProduct.titleEggs')
                  : t('inventory.recordProduct.titleMilk')}
              </Text>

              <Text style={s.headerSub}>
                {t('inventory.recordProduct.forGroup', {
                  name: animalGroup.name,
                  count: animalGroup.count,
                })}
              </Text>

              {existingRecord && isToday && (
                <View style={s.amberAlert}>
                  <Text style={s.amberAlertText}>
                    {t('inventory.recordProduct.todayRecord', {
                      qty: existingRecord.quantity,
                      unit,
                    })}
                  </Text>
                  <Text style={s.amberAlertBody}>
                    {t('inventory.recordProduct.updatingAlert')}
                  </Text>
                </View>
              )}

              {/* ── 1. Quantity ───────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.recordProduct.qtyLabel')}</Text>

              <View style={s.qtyBlock}>
                <TextInput
                  style={s.qtyBigInput}
                  value={qtyText}
                  onChangeText={handleQtyText}
                  keyboardType="numeric"
                  selectTextOnFocus
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel={t('inventory.recordProduct.qtyLabel')}
                />

                <Text style={s.unitBigLabel}>{unit}</Text>

                {productType === 'eggs' && (
                  <View style={s.fractionRow}>
                    {([0.5, 0.25, 0.75] as const).map((frac) => (
                      <Pressable
                        key={frac}
                        style={s.fracBtn}
                        onPress={() => applyFraction(frac)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        accessibilityRole="button"
                        accessibilityLabel={t('inventory.recordProduct.fractionBtn', { frac: String(frac) })}
                      >
                        <Text style={s.fracBtnText}>
                          {frac === 0.5 ? '½' : frac === 0.25 ? '¼' : '¾'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {hasHistory && (
                  <Text style={s.aiHint}>
                    {t('inventory.recordProduct.aiHint', {
                      yesterday: animalGroup.yesterdayQty ?? '—',
                      weekAvg: typeof animalGroup.weekAvg === 'number'
                        ? animalGroup.weekAvg.toFixed(1)
                        : '—',
                    })}
                  </Text>
                )}
              </View>

              {/* ── 2. Collection Date ────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.recordProduct.dateLabel')}</Text>
              <View style={s.dateRow}>
                <Pressable
                  onPress={() => stepDate(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={s.dateArrowBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.prevDay')}
                >
                  <Text style={s.dateArrow}>‹</Text>
                </Pressable>

                <Text style={s.dateText}>{formatDate(collectionDate)}</Text>

                <Pressable
                  onPress={() => stepDate(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isToday}
                  style={s.dateArrowBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.nextDay')}
                >
                  <Text style={[s.dateArrow, isToday && s.dateArrowDisabled]}>›</Text>
                </Pressable>
              </View>

              {dateDupRecord != null && (
                <View style={s.amberAlert}>
                  <Text style={s.amberAlertText}>
                    {t('inventory.recordProduct.dupDateAlert', {
                      qty: dateDupRecord.quantity,
                      unit,
                    })}
                  </Text>
                </View>
              )}

              {/* ── 3. Notes ──────────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.recordProduct.notesLabel')}</Text>
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('inventory.recordProduct.notesPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('inventory.recordProduct.notesLabel')}
              />

              {/* ── 4. Streak hook ────────────────────────────────────── */}
              {hasStreak && (
                <View style={s.streakStrip}>
                  <Text style={s.streakText}>
                    {t('inventory.recordProduct.streakMsg', {
                      days: animalGroup.consecutiveDays,
                      emoji: productType === 'eggs' ? '🥚' : '🥛',
                    })}
                  </Text>
                </View>
              )}

              {/* ── Save button ───────────────────────────────────────── */}
              <Pressable
                style={[s.saveBtn, (!canSave || mutation.isPending) && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave || mutation.isPending}
                accessibilityRole="button"
              >
                <Text style={s.saveBtnLabel}>
                  {mutation.isPending
                    ? t('inventory.recordProduct.saving')
                    : isUpdate
                    ? t('inventory.recordProduct.updateBtn')
                    : t('inventory.recordProduct.saveBtn')}
                </Text>
              </Pressable>

              <Pressable
                style={s.cancelBtn}
                onPress={() => dismissSheet()}
                accessibilityRole="button"
              >
                <Text style={s.cancelLabel}>{t('common.cancel')}</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  kvWrapper: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },

  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },

  // Header
  headerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },

  // Amber alert box
  amberAlert: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderColor: '#D97706',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 10,
    marginTop: 4,
  },
  amberAlertText: {
    fontSize: 9,
    color: '#78350F',
    fontWeight: '600',
    lineHeight: 14,
  },
  amberAlertBody: {
    fontSize: 9,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 14,
  },

  // Field label (section header)
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },

  // Large quantity block
  qtyBlock: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  qtyBigInput: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A6B3C',
    textAlign: 'center',
    minWidth: 120,
    minHeight: 48,
    borderBottomWidth: 2,
    borderColor: '#1A6B3C',
    paddingHorizontal: 8,
  },
  unitBigLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  // Fraction buttons
  fractionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  fracBtn: {
    backgroundColor: '#EAF4EE',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fracBtnText: {
    fontSize: 10,
    color: '#1A6B3C',
    fontWeight: '600',
  },

  // AI hint
  aiHint: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },

  // Date stepper (shared style with RecordInputUseModal)
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    backgroundColor: '#F9FAFB',
    paddingVertical: 7,
    paddingHorizontal: 9,
    gap: 8,
  },
  dateArrowBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrow: {
    fontSize: 20,
    color: '#374151',
    lineHeight: 24,
  },
  dateArrowDisabled: {
    color: '#D1D5DB',
  },
  dateText: {
    flex: 1,
    fontSize: 12,
    color: '#111827',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Notes
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 72,
  },

  // Streak strip
  streakStrip: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  streakText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#92400E',
  },

  // Save button
  saveBtn: {
    minHeight: 48,
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#1A6B3C',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },

  // Cancel button
  cancelBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  cancelLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
});
