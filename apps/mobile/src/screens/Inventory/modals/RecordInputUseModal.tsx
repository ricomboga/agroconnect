import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { InventoryItem } from '../../../hooks/useInventory';
import { useRecordInputUsage } from '../../../hooks/useInventory';
import { useOfflineSync } from '../../../hooks/useOfflineSync';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatQty(qty: number, unit: string): string {
  return `${Math.round(qty * 10) / 10} ${unit}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function barColor(pct: number): string {
  if (pct <= 10) return '#DC2626';
  if (pct < 50)  return '#D97706';
  return '#1A6B3C';
}

// ── Linked activity options (matched by item category) ────────────────────────

interface ActivityOption {
  id: string;
  label: string;
  matchesCategory: (cat: string) => boolean;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'act-spray-maize',
    label: 'Spray Maize (June 8)',
    matchesCategory: (cat) => cat === 'pesticide' || cat === 'herbicide',
  },
  {
    id: 'act-fertilise-maize',
    label: 'Apply 2nd CAN Fertiliser (June 10)',
    matchesCategory: (cat) => cat === 'fertiliser',
  },
  {
    id: 'act-weed-beans',
    label: 'Weed Bean crop (July 13)',
    matchesCategory: (cat) => cat === 'herbicide',
  },
  {
    id: 'act-newcastle',
    label: 'Newcastle Vaccine — 50 chickens (overdue)',
    matchesCategory: (cat) => cat === 'vaccine' || cat === 'animal_medicine',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
  onFindSupplier?: () => void;
}

export function RecordInputUseModal({ item, onClose, onSuccess, onFindSupplier }: Props) {
  const { t }                   = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const mutation                 = useRecordInputUsage();

  // ── State ──────────────────────────────────────────────────────────────────

  const [qtyUsed, setQtyUsed]           = useState<number>(1);
  const [qtyText, setQtyText]           = useState<string>('1');
  const [usedDate, setUsedDate]         = useState<Date>(new Date());
  const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
  const [notes, setNotes]               = useState<string>('');

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

  // ── Derived values ─────────────────────────────────────────────────────────

  const exceeds       = qtyUsed > item.remainingQty;
  const safeQty       = Math.min(qtyUsed, item.remainingQty);
  const newRemaining  = Math.max(0, item.remainingQty - safeQty);
  const totalQty      = item.totalPurchasedQty > 0 ? item.totalPurchasedQty : item.purchasedQty;
  const newPct        = totalQty > 0 ? (newRemaining / totalQty) * 100 : 0;
  const relevantActivities = ACTIVITY_OPTIONS.filter((a) => a.matchesCategory(item.category));
  const isToday = usedDate.toDateString() === new Date().toDateString();

  // ── Qty stepper ────────────────────────────────────────────────────────────

  function stepQty(delta: number) {
    const next = Math.max(0.1, Math.round((qtyUsed + delta) * 10) / 10);
    setQtyUsed(next);
    setQtyText(String(next));
  }

  function handleQtyText(text: string) {
    setQtyText(text);
    const n = parseFloat(text);
    if (!isNaN(n) && n > 0) setQtyUsed(n);
  }

  // ── Date stepper ───────────────────────────────────────────────────────────

  function stepDate(delta: number) {
    const next = new Date(usedDate);
    next.setDate(next.getDate() + delta);
    if (next <= new Date()) setUsedDate(next);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (exceeds) return;

    const payload = {
      itemId: item.id,
      qtyUsed: safeQty,
      usedDate: usedDate.toISOString().split('T')[0] as string,
      ...(linkedActivityId !== null ? { activityId: linkedActivityId } : {}),
      ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
    };

    if (!isOnline) {
      await queueWrite({
        operation: 'CREATE',
        entity: 'inventory-usage',
        endpoint: `/inventory/inputs/${item.id}/use`,
        payload: JSON.stringify(payload),
      });
      onSuccess();
      dismissSheet();
      return;
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        if (newRemaining <= 0) {
          Alert.alert(
            t('inventory.recordUse.outOfStock.title'),
            t('inventory.recordUse.outOfStock.message'),
            [
              {
                text: t('inventory.recordUse.outOfStock.findSupplier'),
                onPress: () => dismissSheet(() => { onSuccess(); onFindSupplier?.(); }),
              },
              {
                text: t('inventory.recordUse.outOfStock.notNow'),
                style: 'cancel',
                onPress: () => dismissSheet(onSuccess),
              },
            ],
          );
        } else {
          dismissSheet(onSuccess);
        }
      },
    });
  }

  // ── Translate ──────────────────────────────────────────────────────────────

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
        {/* Scrim — closes on tap outside sheet */}
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
            {/* Handle bar */}
            <View style={s.handle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Header ──────────────────────────────────────────────── */}
              <Text style={s.headerTitle}>
                {item.emoji} {t('inventory.recordUse.title', { name: item.name })}
              </Text>
              <Text style={s.headerSub}>
                {t('inventory.recordUse.remaining', {
                  qty: formatQty(item.remainingQty, item.unit),
                })}
              </Text>

              {/* ── 1. Quantity Used ─────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.recordUse.qtyUsed')}</Text>
              <View style={s.qtyRow}>
                <Pressable
                  style={s.qtyBtn}
                  onPress={() => stepQty(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.decrease')}
                >
                  <Text style={s.qtyBtnText}>−</Text>
                </Pressable>

                <TextInput
                  style={s.qtyInput}
                  value={qtyText}
                  onChangeText={handleQtyText}
                  keyboardType="numeric"
                  selectTextOnFocus
                  accessibilityLabel={t('inventory.recordUse.qtyUsed')}
                />

                <Pressable
                  style={s.qtyBtn}
                  onPress={() => stepQty(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.increase')}
                >
                  <Text style={s.qtyBtnText}>+</Text>
                </Pressable>

                <Text style={s.unitLabel}>{item.unit}</Text>
              </View>

              {exceeds && (
                <Text style={s.exceedsText}>
                  {t('inventory.recordUse.exceeds', {
                    remaining: formatQty(item.remainingQty, item.unit),
                  })}
                </Text>
              )}

              {/* ── 2. Date of Use ────────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.recordUse.dateLabel')}</Text>
              <View style={s.dateRow}>
                <Pressable
                  onPress={() => stepDate(-1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.prevDay')}
                  style={s.dateArrowBtn}
                >
                  <Text style={s.dateArrow}>‹</Text>
                </Pressable>

                <Text style={s.dateText}>{formatDate(usedDate)}</Text>

                <Pressable
                  onPress={() => stepDate(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isToday}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.nextDay')}
                  style={s.dateArrowBtn}
                >
                  <Text style={[s.dateArrow, isToday && s.dateArrowDisabled]}>›</Text>
                </Pressable>
              </View>

              {/* ── 3. Linked Activity ───────────────────────────────────── */}
              {relevantActivities.length > 0 && (
                <>
                  <Text style={s.fieldLabel}>{t('inventory.recordUse.activityLabel')}</Text>

                  <Pressable
                    style={[s.activityRow, linkedActivityId === null && s.activityRowActive]}
                    onPress={() => setLinkedActivityId(null)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: linkedActivityId === null }}
                  >
                    <View style={[s.radio, linkedActivityId === null && s.radioActive]} />
                    <Text style={s.activityText}>{t('inventory.recordUse.noActivity')}</Text>
                  </Pressable>

                  {relevantActivities.map((act) => {
                    const selected = linkedActivityId === act.id;
                    return (
                      <Pressable
                        key={act.id}
                        style={[s.activityRow, selected && s.activityRowActive]}
                        onPress={() => setLinkedActivityId(act.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                      >
                        <View style={[s.radio, selected && s.radioActive]} />
                        <Text style={s.activityText}>{act.label}</Text>
                      </Pressable>
                    );
                  })}
                </>
              )}

              {/* ── 4. Notes ─────────────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.recordUse.notesLabel')}</Text>
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('inventory.recordUse.notesPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('inventory.recordUse.notesLabel')}
              />

              {/* ── Stock level preview ───────────────────────────────────── */}
              <View style={s.previewCard}>
                <Text style={s.previewText}>
                  {t('inventory.recordUse.afterRecord', {
                    qty: formatQty(newRemaining, item.unit),
                  })}
                </Text>
                <View style={s.previewTrack}>
                  <View
                    style={[
                      s.previewFill,
                      {
                        width: `${Math.max(1, Math.min(newPct, 100))}%` as `${number}%`,
                        backgroundColor: barColor(newPct),
                      },
                    ]}
                  />
                </View>
              </View>

              {/* ── Buttons ──────────────────────────────────────────────── */}
              <Pressable
                style={[s.saveBtn, (exceeds || mutation.isPending) && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={exceeds || mutation.isPending}
                accessibilityRole="button"
              >
                <Text style={s.saveBtnLabel}>
                  {mutation.isPending
                    ? t('inventory.recordUse.saving')
                    : t('inventory.recordUse.saveBtn', {
                        qty: formatQty(safeQty, item.unit),
                      })}
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

  // Handle
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
    marginBottom: 16,
  },

  // Field label
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },

  // Qty stepper
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyBtnText: {
    fontSize: 18,
    color: '#374151',
    lineHeight: 22,
  },
  qtyInput: {
    width: 80,
    height: 44,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    backgroundColor: '#F9FAFB',
  },
  unitLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  exceedsText: {
    fontSize: 9,
    color: '#DC2626',
    marginTop: 4,
  },

  // Date stepper
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

  // Activity picker
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 4,
    minHeight: 44,
    backgroundColor: '#fff',
  },
  activityRowActive: {
    borderColor: '#1A6B3C',
    backgroundColor: '#EAF4EE',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    backgroundColor: '#fff',
  },
  radioActive: {
    borderColor: '#1A6B3C',
    backgroundColor: '#1A6B3C',
  },
  activityText: {
    fontSize: 10,
    color: '#374151',
    flex: 1,
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

  // Stock preview card
  previewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 6,
  },
  previewTrack: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewFill: {
    height: 5,
    borderRadius: 3,
  },

  // Save button
  saveBtn: {
    minHeight: 48,
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
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
