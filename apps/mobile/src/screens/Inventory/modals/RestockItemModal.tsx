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
import type { InventoryItem } from '../../../hooks/useInventory';
import { useRestockItem } from '../../../hooks/useInventory';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { useUiStore } from '../../../store/ui.store';

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

function suggestReorderQty(item: InventoryItem): number {
  // Default reorder = 2× last purchase qty, rounded to a whole number
  const lastQty = item.purchasedQty > 0 ? item.purchasedQty : 1;
  return Math.max(1, Math.round(lastQty * 2));
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  item: InventoryItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockItemModal({ item, onClose, onSuccess }: Props) {
  const { t }                    = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast                = useUiStore((s) => s.showToast);
  const qc                       = useQueryClient();
  const mutation                 = useRestockItem();

  // ── State ──────────────────────────────────────────────────────────────────

  const defaultQty = suggestReorderQty(item);

  const [qty, setQty]             = useState<number>(defaultQty);
  const [qtyText, setQtyText]     = useState<string>(String(defaultQty));
  const [pricePerUnit, setPricePerUnit] = useState<number>(item.costPerUnit);
  const [priceText, setPriceText] = useState<string>(String(item.costPerUnit));
  const [supplier, setSupplier]   = useState<string>(item.supplier);
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [receiptNo, setReceiptNo] = useState<string>('');

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

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalCost      = qty * pricePerUnit;
  const newTotalQty    = item.remainingQty + qty;
  const isValid        = qty > 0 && pricePerUnit >= 0 && supplier.trim() !== '';
  const isToday        = purchaseDate.toDateString() === new Date().toDateString();

  // ── Qty stepper ────────────────────────────────────────────────────────────

  function stepQty(delta: number) {
    const next = Math.max(1, Math.round((qty + delta) * 10) / 10);
    setQty(next);
    setQtyText(String(next));
  }

  function handleQtyText(text: string) {
    setQtyText(text);
    const n = parseFloat(text);
    if (!isNaN(n) && n > 0) setQty(n);
  }

  function handlePriceText(text: string) {
    setPriceText(text);
    const n = parseFloat(text);
    if (!isNaN(n) && n >= 0) setPricePerUnit(n);
  }

  // ── Date stepper ───────────────────────────────────────────────────────────

  function stepDate(delta: number) {
    const next = new Date(purchaseDate);
    next.setDate(next.getDate() + delta);
    if (next <= new Date()) setPurchaseDate(next);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!isValid) return;

    const payload = {
      itemId: item.id,
      qtyAdded: qty,
      costPerUnit: pricePerUnit,
      purchaseDate: purchaseDate.toISOString().split('T')[0] as string,
      supplier: supplier.trim(),
      ...(receiptNo.trim() !== '' ? { receiptNo: receiptNo.trim() } : {}),
    };

    if (!isOnline) {
      await queueWrite({
        operation: 'CREATE',
        entity: 'inventory-restock',
        endpoint: `/inventory/inputs/${item.id}/restock`,
        payload: JSON.stringify(payload),
      });
      showToast(
        t('inventory.restock.savedOfflineToast', {
          cost: Math.round(totalCost).toLocaleString(),
        }),
        'info',
      );
      onSuccess();
      dismissSheet();
      return;
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        // The server-side restock handler creates the expense transaction in Finance.
        // Invalidate both slices so UI refreshes without a manual pull.
        qc.invalidateQueries({ queryKey: ['inventory', 'inputs'] });
        qc.invalidateQueries({ queryKey: ['finance'] });

        showToast(
          t('inventory.restock.successToast', {
            cost: Math.round(totalCost).toLocaleString(),
          }),
          'success',
        );
        onSuccess();
        dismissSheet();
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
        {/* Scrim */}
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
                {t('inventory.restock.title', { name: item.name })}
              </Text>
              <Text style={s.headerSub}>
                {t('inventory.restock.currentStock', {
                  qty: formatQty(item.remainingQty, item.unit),
                })}
              </Text>

              {/* ── 1. Quantity Purchased ────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.restock.qtyPurchased')}
              </Text>
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
                  accessibilityLabel={t('inventory.restock.qtyPurchased')}
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

              {/* ── 2. Cost per unit ─────────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.restock.costPerUnit', { unit: item.unit })}
              </Text>
              <TextInput
                style={s.textInput}
                value={priceText}
                onChangeText={handlePriceText}
                keyboardType="numeric"
                selectTextOnFocus
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                accessibilityLabel={t('inventory.restock.costPerUnit', { unit: item.unit })}
              />
              <Text style={s.totalCostHint}>
                {t('inventory.restock.totalCost', {
                  total: Math.round(totalCost).toLocaleString(),
                })}
              </Text>

              {/* ── 3. Supplier ──────────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.restock.supplierLabel')}</Text>
              <TextInput
                style={s.textInput}
                value={supplier}
                onChangeText={setSupplier}
                placeholder={t('inventory.restock.supplierPlaceholder')}
                placeholderTextColor="#9CA3AF"
                accessibilityLabel={t('inventory.restock.supplierLabel')}
              />

              {/* ── 4. Purchase Date ─────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.restock.dateLabel')}</Text>
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

                <Text style={s.dateText}>{formatDate(purchaseDate)}</Text>

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

              {/* ── 5. Receipt Number ────────────────────────────────────── */}
              <Text style={s.fieldLabel}>{t('inventory.restock.receiptLabel')}</Text>
              <TextInput
                style={s.textInput}
                value={receiptNo}
                onChangeText={setReceiptNo}
                placeholder={t('inventory.restock.receiptPlaceholder')}
                placeholderTextColor="#9CA3AF"
                accessibilityLabel={t('inventory.restock.receiptLabel')}
              />

              {/* ── Cost impact preview ───────────────────────────────────── */}
              <View style={s.previewCard}>
                <Text style={s.previewTitle}>{t('inventory.restock.previewTitle')}</Text>
                <Text style={s.previewLine}>
                  {t('inventory.restock.previewNewQty', {
                    qty: formatQty(newTotalQty, item.unit),
                  })}
                </Text>
                <Text style={s.previewLine}>
                  {t('inventory.restock.previewTotalSpent', {
                    total: Math.round(totalCost).toLocaleString(),
                  })}
                </Text>
                <Text style={s.previewNote}>{t('inventory.restock.previewNote')}</Text>
              </View>

              {/* ── Buttons ──────────────────────────────────────────────── */}
              <Pressable
                style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!isValid || mutation.isPending}
                accessibilityRole="button"
              >
                <Text style={s.saveBtnLabel}>
                  {mutation.isPending
                    ? t('inventory.restock.saving')
                    : t('inventory.restock.saveBtn')}
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

  // Text input (price, supplier, receipt)
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 44,
  },
  totalCostHint: {
    fontSize: 10,
    color: '#6B7280',
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

  // Cost impact preview
  previewCard: {
    backgroundColor: '#EAF4EE',
    borderRadius: 6,
    padding: 8,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#1A6B3C',
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D4A28',
    marginBottom: 4,
  },
  previewLine: {
    fontSize: 10,
    color: '#0D4A28',
    marginBottom: 2,
  },
  previewNote: {
    fontSize: 9,
    color: '#2E8B57',
    marginTop: 4,
    fontStyle: 'italic',
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
