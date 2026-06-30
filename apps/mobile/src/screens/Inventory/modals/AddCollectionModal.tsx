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
import {
  useAddCustomerCollection,
  useCustomerCollections,
} from '../../../hooks/useInventory';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { useUiStore } from '../../../store/ui.store';

// ── Product config ────────────────────────────────────────────────────────────

type ProductKey = 'eggs' | 'milk' | 'maize' | 'cabbage' | 'beans' | 'other';

interface ProductConfig {
  key: ProductKey;
  emoji: string;
  labelKey: string;
  unit: string;
  defaultPrice: number;
}

const PRODUCTS: ProductConfig[] = [
  { key: 'eggs',    emoji: '🥚', labelKey: 'inventory.addCollection.productEggs',    unit: 'trays',  defaultPrice: 150 },
  { key: 'milk',    emoji: '🥛', labelKey: 'inventory.addCollection.productMilk',    unit: 'litres', defaultPrice: 60  },
  { key: 'maize',   emoji: '🌽', labelKey: 'inventory.addCollection.productMaize',   unit: 'kg',     defaultPrice: 48  },
  { key: 'cabbage', emoji: '🥬', labelKey: 'inventory.addCollection.productCabbage', unit: 'kg',     defaultPrice: 35  },
  { key: 'beans',   emoji: '🫘', labelKey: 'inventory.addCollection.productBeans',   unit: 'kg',     defaultPrice: 110 },
  { key: 'other',   emoji: '📦', labelKey: 'inventory.addCollection.productOther',   unit: 'units',  defaultPrice: 0   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  farmId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddCollectionModal({ farmId, onClose, onSuccess }: Props) {
  const { t }                    = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast                = useUiStore((s) => s.showToast);
  const qc                       = useQueryClient();
  const mutation                 = useAddCustomerCollection();

  const { data: existingCollections = [] } = useCustomerCollections(farmId);

  // ── State ──────────────────────────────────────────────────────────────────

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone]               = useState('');
  const [product, setProduct]           = useState<ProductConfig | null>(null);
  const [qtyText, setQtyText]           = useState('');
  const [qty, setQty]                   = useState<number>(0);
  const [priceText, setPriceText]       = useState('');
  const [price, setPrice]               = useState<number>(0);
  const [takenDate, setTakenDate]       = useState<Date>(new Date());
  const [notes, setNotes]               = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Slide-up animation ─────────────────────────────────────────────────────

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

  // ── Derived — recent unique customers (last 5) ─────────────────────────────

  const recentCustomers = React.useMemo(() => {
    const seen = new Set<string>();
    const result: { name: string; phone: string }[] = [];
    for (const c of existingCollections) {
      if (!seen.has(c.customerName)) {
        seen.add(c.customerName);
        result.push({ name: c.customerName, phone: c.customerPhone });
        if (result.length === 5) break;
      }
    }
    return result;
  }, [existingCollections]);

  // ── Product selection ──────────────────────────────────────────────────────

  function selectProduct(p: ProductConfig) {
    setProduct(p);
    setPrice(p.defaultPrice);
    setPriceText(p.defaultPrice > 0 ? String(p.defaultPrice) : '');
  }

  // ── Qty input ──────────────────────────────────────────────────────────────

  function handleQtyText(text: string) {
    setQtyText(text);
    const n = parseFloat(text);
    setQty(!isNaN(n) && n > 0 ? n : 0);
  }

  // ── Price input ────────────────────────────────────────────────────────────

  function handlePriceText(text: string) {
    setPriceText(text);
    const n = parseFloat(text);
    setPrice(!isNaN(n) && n >= 0 ? n : 0);
  }

  // ── Date stepper ───────────────────────────────────────────────────────────

  const today   = new Date();
  const isToday = takenDate.toDateString() === today.toDateString();

  function stepDate(delta: number) {
    const next = new Date(takenDate);
    next.setDate(next.getDate() + delta);
    if (next <= today) setTakenDate(next);
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const total    = Math.round(qty * price * 100) / 100;
  const unit     = product?.unit ?? '';
  const canSave  = customerName.trim().length > 0 && product !== null && qty > 0 && price > 0;

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!canSave || !product) return;

    const payload = {
      customerName: customerName.trim(),
      customerPhone: phone.trim(),
      productType: product.key,
      quantity: qty,
      unit,
      pricePerUnit: price,
      totalAmount: total,
      takenDate: takenDate.toISOString().split('T')[0] as string,
      farmId,
      notes: notes.trim(),
    };

    if (!isOnline) {
      await queueWrite({
        operation: 'CREATE',
        entity: 'customer-collections',
        endpoint: '/inventory/collections',
        payload: JSON.stringify(payload),
      });
      showToast(t('common.savedOffline'), 'info');
      dismissSheet(onSuccess);
      return;
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['inventory', 'collections'] });
        showToast(
          t('inventory.addCollection.successToast', {
            name: customerName.trim(),
            total: total.toLocaleString(),
          }),
          'success',
        );
        dismissSheet(onSuccess);
      },
    });
  }

  // ── Animation ──────────────────────────────────────────────────────────────

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [700, 0],
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
                {t('inventory.addCollection.title')}
              </Text>
              <Text style={s.headerSub}>
                {t('inventory.addCollection.subtitle')}
              </Text>

              {/* ── 1. Customer Name ──────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.addCollection.nameLabel')}
              </Text>
              <TextInput
                style={s.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder={t('inventory.addCollection.namePlaceholder')}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
                accessibilityLabel={t('inventory.addCollection.nameLabel')}
              />

              {recentCustomers.length > 0 && (
                <View style={s.recentRow}>
                  <Text style={s.recentLabel}>
                    {t('inventory.addCollection.recent')}
                  </Text>
                  <View style={s.chipsWrap}>
                    {recentCustomers.map((c) => (
                      <Pressable
                        key={c.name}
                        style={[
                          s.chip,
                          customerName === c.name && s.chipActive,
                        ]}
                        onPress={() => {
                          setCustomerName(c.name);
                          setPhone(c.phone);
                        }}
                        hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel={c.name}
                      >
                        <Text
                          style={[
                            s.chipText,
                            customerName === c.name && s.chipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* ── 2. Phone ──────────────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.addCollection.phoneLabel')}
              </Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder={t('inventory.addCollection.phonePlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                accessibilityLabel={t('inventory.addCollection.phoneLabel')}
              />

              {/* ── 3. Product tiles ──────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.addCollection.productLabel')}
              </Text>
              <View style={s.productGrid}>
                {PRODUCTS.map((p) => {
                  const selected = product?.key === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      style={[s.productTile, selected && s.productTileActive]}
                      onPress={() => selectProduct(p)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                    >
                      <Text style={s.productEmoji}>{p.emoji}</Text>
                      <Text
                        style={[
                          s.productLabel,
                          selected && s.productLabelActive,
                        ]}
                      >
                        {t(p.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── 4. Qty + Unit row ─────────────────────────────────── */}
              <View style={s.twoColRow}>
                <View style={s.twoColLeft}>
                  <Text style={s.fieldLabel}>
                    {t('inventory.addCollection.qtyLabel')}
                  </Text>
                  <TextInput
                    style={s.input}
                    value={qtyText}
                    onChangeText={handleQtyText}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    selectTextOnFocus
                    accessibilityLabel={t('inventory.addCollection.qtyLabel')}
                  />
                </View>

                <View style={s.twoColRight}>
                  <Text style={s.fieldLabel}>
                    {t('inventory.addCollection.unitLabel')}
                  </Text>
                  <View style={s.unitDisplay}>
                    <Text style={s.unitDisplayText}>
                      {product ? unit : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── 5. Price + total preview ──────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.addCollection.priceLabel', {
                  unit: unit || '—',
                })}
              </Text>
              <TextInput
                style={s.input}
                value={priceText}
                onChangeText={handlePriceText}
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                selectTextOnFocus
                accessibilityLabel={t('inventory.addCollection.priceLabel', {
                  unit: unit || '—',
                })}
              />

              {qty > 0 && price > 0 && (
                <Text style={s.totalPreview}>
                  {t('inventory.addCollection.totalPreview', {
                    total: total.toLocaleString(),
                  })}
                </Text>
              )}

              {/* ── 6. Date Taken ─────────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.addCollection.dateLabel')}
              </Text>
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

                <Text style={s.dateText}>{formatDate(takenDate)}</Text>

                <Pressable
                  onPress={() => stepDate(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isToday}
                  style={s.dateArrowBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('inventory.recordUse.nextDay')}
                >
                  <Text style={[s.dateArrow, isToday && s.dateArrowDisabled]}>
                    ›
                  </Text>
                </Pressable>
              </View>

              {/* ── 7. Notes ──────────────────────────────────────────── */}
              <Text style={s.fieldLabel}>
                {t('inventory.addCollection.notesLabel')}
              </Text>
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('inventory.addCollection.notesPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                accessibilityLabel={t('inventory.addCollection.notesLabel')}
              />

              {/* ── Save button ───────────────────────────────────────── */}
              <Pressable
                style={[
                  s.saveBtn,
                  (!canSave || mutation.isPending) && s.saveBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={!canSave || mutation.isPending}
                accessibilityRole="button"
              >
                <Text style={s.saveBtnLabel}>
                  {mutation.isPending
                    ? t('inventory.addCollection.saving')
                    : canSave
                    ? t('inventory.addCollection.saveBtn', {
                        total: total.toLocaleString(),
                      })
                    : t('inventory.addCollection.saveBtnEmpty')}
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
    maxHeight: '92%',
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
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 15,
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

  // Standard text input
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 44,
  },

  // Recent customers row
  recentRow: {
    marginTop: 6,
  },
  recentLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    minHeight: 30,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#EAF4EE',
    borderColor: '#1A6B3C',
  },
  chipText: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#1A6B3C',
    fontWeight: '600',
  },

  // Product grid (2 × 3)
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  productTile: {
    width: '30.5%',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 60,
    justifyContent: 'center',
    gap: 3,
  },
  productTileActive: {
    backgroundColor: '#EAF4EE',
    borderColor: '#1A6B3C',
    borderWidth: 1.5,
  },
  productEmoji: {
    fontSize: 18,
  },
  productLabel: {
    fontSize: 9,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  productLabelActive: {
    color: '#1A6B3C',
    fontWeight: '600',
  },

  // Two-column row
  twoColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  twoColLeft: {
    flex: 2,
  },
  twoColRight: {
    flex: 1,
  },
  unitDisplay: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    backgroundColor: '#F3F4F6',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 9,
    marginTop: 6,
  },
  unitDisplayText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Total preview
  totalPreview: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6B3C',
    marginTop: 6,
    marginBottom: 2,
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
