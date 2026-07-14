import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertBox } from '../../components/ui/AlertBox';
import { DatePickerField } from '../../components/ui/DatePickerField';
import {
  useInventoryItems,
  useAnimalProducts,
  useHarvestStore,
  useCustomerCollections,
  useInventorySummary,
  useMarkCollectionPaid,
  fetchInventoryReport,
} from '../../hooks/useInventory';
import type {
  InputCategory,
  InventoryItem,
  AnimalProductRecord,
  AnimalProductToday,
  HarvestStore,
  CustomerCollection,
  InventoryReport,
} from '../../hooks/useInventory';
import {
  getStockBadgeVariant,
  getStockBarColor,
  getStockBadgeLabel,
  CATEGORY_CONFIG,
  formatQty,
} from '../../utils/inventoryHelpers';
import { useUiStore } from '../../store/ui.store';
import type { StockStackParamList } from '../../navigation/types';
import {
  ANIMAL_PRODUCT_TYPES,
  getProductConfig,
  productLabel,
} from '../../constants/animalProducts';

type Props = NativeStackScreenProps<StockStackParamList, 'InventoryHome'>;
type ActiveTab = 'inputs' | 'products' | 'harvest' | 'collections';
type CategoryFilter = 'all' | InputCategory;
type CollectionFilter = 'all' | 'unpaid' | 'paid';

// ── Module-level helpers ──────────────────────────────────────────────────────

function formatKES(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toLocaleString();
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatDate(isoDate: string, fmt?: string): string {
  const d = new Date(isoDate);
  if (fmt === 'MMM D, YYYY') {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getDaysOwing(takenDate: string): number {
  return Math.floor((Date.now() - new Date(takenDate).getTime()) / (1000 * 60 * 60 * 24));
}

function isWithin7Days(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const diff = new Date(isoDate).getTime() - Date.now();
  return diff <= 7 * 24 * 60 * 60 * 1000;
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildInventoryReportCsv(report: InventoryReport): string {
  const lines: string[] = [`Inventory report as at ${report.asOfDate}`, ''];

  lines.push('Inputs');
  lines.push(['Name', 'Category', 'Unit', 'Purchased', 'Used', 'Remaining', 'Cost/Unit (KES)', 'Supplier'].join(','));
  for (const r of report.inputs) {
    lines.push(
      [r.name, r.category, r.unit, r.purchasedQty, r.usedQty, r.remainingQty, r.costPerUnit, r.supplier]
        .map(csvEscape)
        .join(','),
    );
  }
  lines.push('');

  lines.push('Collections');
  lines.push(['Customer', 'Product', 'Quantity', 'Unit', 'Total (KES)', 'Taken Date', 'Paid'].join(','));
  for (const r of report.collections) {
    lines.push(
      [r.customerName, r.productType, r.quantity, r.unit, r.totalAmount, r.takenDate, r.isPaid ? 'Yes' : 'No']
        .map(csvEscape)
        .join(','),
    );
  }
  lines.push('');

  lines.push('Harvest Store');
  lines.push(['Crop', 'Variety', 'Harvested (kg)', 'Sold (kg)', 'Remaining (kg)', 'Harvest Date', 'Storage'].join(','));
  for (const r of report.harvest) {
    lines.push(
      [r.crop, r.variety, r.quantityKg, r.soldQuantityKg, r.remainingKg, r.harvestDate, r.storageLocation]
        .map(csvEscape)
        .join(','),
    );
  }
  lines.push('');

  lines.push('Totals');
  lines.push(`Inputs remaining value (KES),${report.totals.inputsRemainingValueKes}`);
  lines.push(`Collections pending (KES),${report.totals.collectionsPendingKes}`);
  lines.push(`Harvest remaining (kg),${report.totals.harvestRemainingKg}`);

  return lines.join('\n');
}

function getCropEmoji(cropName: string): string {
  const MAP: Record<string, string> = {
    Maize: '🌽', Beans: '🫘', Wheat: '🌾', Cabbage: '🥬',
    Tomatoes: '🍅', Potatoes: '🥔', Onions: '🧅',
  };
  return MAP[cropName] ?? '🌿';
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekDays(): Date[] {
  const monday = getMonday(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(isoDate: string, d: Date): boolean {
  const a = new Date(isoDate);
  return (
    a.getFullYear() === d.getFullYear() &&
    a.getMonth() === d.getMonth() &&
    a.getDate() === d.getDate()
  );
}

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const BADGE_COLORS = {
  green: { bg: '#EAF4EE', text: '#0D4A28' },
  amber: { bg: '#FEF3C7', text: '#92400E' },
  red:   { bg: '#FEE2E2', text: '#991B1B' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────

export function InventoryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showToast = useUiStore((st) => st.showToast);

  const [activeTab, setActiveTab]             = useState<ActiveTab>('inputs');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('unpaid');
  const [showCustomProductInput, setShowCustomProductInput] = useState(false);
  const [customProductName, setCustomProductName] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Queries ──────────────────────────────────────────────────────────────

  const summaryQ    = useInventorySummary();
  const inputsQ     = useInventoryItems();
  const productsQ   = useAnimalProducts();
  const harvestQ    = useHarvestStore();
  const collectionsQ = useCustomerCollections();

  // ── Mutations ─────────────────────────────────────────────────────────────

  const markPaidMutation = useMarkCollectionPaid();

  const handleMarkPaid = (id: string, amount: number) => {
    markPaidMutation.mutate(id, {
      onSuccess: () => {
        showToast(
          t('inventory.collections.paidToast', { amount: formatNumber(amount) }),
          'success',
        );
      },
    });
  };

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportDate, setReportDate] = useState(new Date());
  const [reportGenerating, setReportGenerating] = useState(false);

  const handleDownloadReport = async () => {
    setReportGenerating(true);
    try {
      const asOfDate = reportDate.toISOString().split('T')[0] as string;
      const report = await fetchInventoryReport(asOfDate);
      const csv = buildInventoryReportCsv(report);

      const fileName = `inventory-report-${asOfDate}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: fileName });
      }
      setReportModalOpen(false);
    } catch {
      showToast(t('inventory.report.error'), 'error');
    } finally {
      setReportGenerating(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const summary = {
    totalItemsLow: 0,
    totalItemsEmpty: 0,
    totalPendingCollectionsKes: 0,
    totalHarvestInStoreKes: 0,
    ...summaryQ.data,
    // Defend against a stale cached response (from before this field existed)
    // that has the other summary fields but not this one.
    animalProductsToday: (summaryQ.data?.animalProductsToday ?? []) as AnimalProductToday[],
  };

  const allItems: InventoryItem[] = inputsQ.data ?? [];

  const sortedItems = [...allItems].sort((a, b) => {
    const pctA = a.purchasedQty > 0 ? (a.remainingQty / a.purchasedQty) * 100 : 0;
    const pctB = b.purchasedQty > 0 ? (b.remainingQty / b.purchasedQty) * 100 : 0;
    return pctA - pctB;
  });

  const filteredItems =
    selectedCategory === 'all'
      ? sortedItems
      : sortedItems.filter((i) => i.category === selectedCategory);

  const urgentItems = allItems.filter(
    (i) => i.remainingQty <= 0 && isWithin7Days(i.scheduledUseDate),
  );

  const allProducts: AnimalProductRecord[] = productsQ.data ?? [];
  const today    = new Date();
  const weekDays = getWeekDays();

  // Group records by product type — this drives one card + one weekly grid per
  // product the farmer actually tracks (eggs, cow milk, fish, honey, or any
  // custom-typed product), instead of two hardcoded egg/milk sections.
  const productTypesPresent = Array.from(new Set(allProducts.map((r) => r.productType)));

  const productGroups = productTypesPresent.map((productType) => {
    const records = allProducts.filter((r) => r.productType === productType);
    const todayRecord = records.find((r) => isSameDay(r.date, today));
    const weekValues = weekDays.map((d) => records.find((r) => isSameDay(r.date, d))?.quantity ?? null);
    const maxValue = Math.max(...weekValues.filter((v): v is number => v !== null), 1);
    return { productType, records, todayRecord, weekValues, maxValue };
  });

  const trackedProductTypes = new Set(productTypesPresent);
  const untrackedProductTypes = ANIMAL_PRODUCT_TYPES.filter((p) => !trackedProductTypes.has(p.key));

  const allHarvest: HarvestStore[]        = harvestQ.data ?? [];
  const totalHarvestValue = allHarvest.reduce((s, h) => s + h.estimatedValueKes, 0);
  const totalHarvestKg    = allHarvest.reduce((s, h) => s + h.remainingKg, 0);

  const allCollections: CustomerCollection[] = collectionsQ.data ?? [];
  const filteredCollections = allCollections.filter((c) => {
    if (collectionFilter === 'unpaid') return !c.isPaid;
    if (collectionFilter === 'paid')   return c.isPaid;
    return true;
  });
  const unpaidCollections = allCollections.filter((c) => !c.isPaid);
  const totalPending      = unpaidCollections.reduce((s, c) => s + c.totalAmount, 0);

  // ── Tab definitions ───────────────────────────────────────────────────────

  const TABS: Array<{ key: ActiveTab; label: string }> = [
    { key: 'inputs',   label: t('inventory.tab.inputs') },
    { key: 'products', label: t('inventory.tab.animalProducts') },
    { key: 'harvest',  label: t('inventory.tab.harvest') },
    { key: 'collections', label: t('inventory.tab.collections') },
  ];

  const CATEGORY_CHIPS: Array<{ key: CategoryFilter; label: string }> = [
    { key: 'all',            label: t('inventory.inputs.category.all') },
    { key: 'fertiliser',     label: t('inventory.inputs.category.fertiliser') },
    { key: 'pesticide',      label: t('inventory.inputs.category.pesticide') },
    { key: 'seed',           label: t('inventory.inputs.category.seed') },
    { key: 'animal_feed',    label: t('inventory.inputs.category.animalFeed') },
    { key: 'vaccine',        label: t('inventory.inputs.category.vaccine') },
    { key: 'tool_equipment', label: t('inventory.inputs.category.tool') },
  ];

  const COLLECTION_FILTERS: Array<{ key: CollectionFilter; label: string }> = [
    { key: 'all',    label: t('inventory.collections.filterAll') },
    { key: 'unpaid', label: t('inventory.collections.filterUnpaid') },
    { key: 'paid',   label: t('inventory.collections.filterPaid') },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />

      {/* TopBar */}
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Text style={s.topBarTitle}>{t('inventory.title')}</Text>
          <View style={s.topBarActions}>
            <Pressable
              style={s.topBarBtn}
              onPress={() => setReportModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('inventory.report.downloadCta')}
            >
              <Text style={s.topBarIcon}>⬇️</Text>
            </Pressable>
            <Pressable
              style={s.topBarBtn}
              onPress={() => navigation.navigate('AddStockScreen')}
              accessibilityRole="button"
              accessibilityLabel={t('inventory.inputs.addCta')}
            >
              <Text style={s.topBarIcon}>+</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <Modal visible={reportModalOpen} transparent animationType="slide" onRequestClose={() => setReportModalOpen(false)}>
        <Pressable style={s.reportOverlay} onPress={() => setReportModalOpen(false)} />
        <View style={s.reportSheet}>
          <Text style={s.reportTitle}>{t('inventory.report.modalTitle')}</Text>
          <Text style={s.fieldLabel}>{t('inventory.report.asOfDateLabel')}</Text>
          <DatePickerField value={reportDate} onChange={setReportDate} maximumDate={new Date()} />
          <Pressable
            style={[s.primaryBtn, s.mt6, reportGenerating && s.reportBtnDisabled]}
            onPress={() => void handleDownloadReport()}
            disabled={reportGenerating}
            accessibilityRole="button"
          >
            {reportGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.reportBtnLabel}>{t('inventory.report.download')}</Text>
            )}
          </Pressable>
        </View>
      </Modal>

      {/* Summary Strip */}
      <View style={s.summaryStrip}>
        <View style={[s.summaryItem, s.summaryBorder]}>
          <Text style={[s.summaryValue, { color: '#DC2626' }]}>
            {summary.totalItemsEmpty + summary.totalItemsLow}
          </Text>
          <Text style={s.summaryLabel}>{t('inventory.summary.lowEmpty')}</Text>
        </View>
        <View style={[s.summaryItem, s.summaryBorder]}>
          <Text style={[s.summaryValue, { color: '#D97706' }]}>
            {formatKES(summary.totalPendingCollectionsKes)}
          </Text>
          <Text style={s.summaryLabel}>{t('inventory.summary.pendingKes')}</Text>
        </View>
        <View style={[s.summaryItem, s.summaryBorder]}>
          <Text style={[s.summaryValue, { color: '#1A6B3C' }]}>
            {formatKES(summary.totalHarvestInStoreKes)}
          </Text>
          <Text style={s.summaryLabel}>{t('inventory.summary.inStore')}</Text>
        </View>
        <View style={s.summaryItem}>
          <Text style={[s.summaryValue, { color: '#1A6B3C' }]}>
            {summary.animalProductsToday.length > 0
              ? summary.animalProductsToday
                  .map((p: AnimalProductToday) => `${p.quantity} ${t(`inventory.units.${getProductConfig(p.productType).unit}`, { defaultValue: getProductConfig(p.productType).unit })}`)
                  .join(' · ')
              : '—'}
          </Text>
          <Text style={s.summaryLabel}>{t('inventory.summary.todayProducts')}</Text>
        </View>
      </View>

      {/* SubTab Bar */}
      <View style={s.subTabs}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
          >
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── INPUTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'inputs' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {inputsQ.isLoading && (
            <>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={s.skeletonCard} />
              ))}
            </>
          )}

          {!inputsQ.isLoading && allItems.length === 0 && (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>{t('inventory.inputs.empty.title')}</Text>
              <Text style={s.emptyBody}>{t('inventory.inputs.empty.body2')}</Text>
              <Pressable
                style={s.emptyCtaBtn}
                onPress={() => navigation.navigate('AddStockScreen')}
                accessibilityRole="button"
              >
                <Text style={s.emptyCtaLabel}>{t('inventory.inputs.empty.ctaFirst')}</Text>
              </Pressable>
            </View>
          )}

          {!inputsQ.isLoading && allItems.length > 0 && (
            <>
              {urgentItems.length > 0 && (
                <View style={s.mb8}>
                  <AlertBox
                    variant="red"
                    message={t('inventory.inputs.urgentBanner', {
                      count: urgentItems.length,
                      plural: urgentItems.length > 1 ? 's' : '',
                      activity: urgentItems[0]?.name ?? '',
                      when: urgentItems[0]?.scheduledUseDate
                        ? formatDate(urgentItems[0].scheduledUseDate)
                        : 'soon',
                    })}
                  />
                </View>
              )}

              {/* Category filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.chipScroll}
                contentContainerStyle={s.chipRow}
              >
                {CATEGORY_CHIPS.map((chip) => (
                  <Pressable
                    key={chip.key}
                    style={[
                      s.chip,
                      selectedCategory === chip.key ? s.chipActive : s.chipInactive,
                    ]}
                    onPress={() => setSelectedCategory(chip.key)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        s.chipText,
                        selectedCategory === chip.key
                          ? s.chipTextActive
                          : s.chipTextInactive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {filteredItems.map((item) => {
                const pct = item.purchasedQty > 0
                  ? (item.remainingQty / item.purchasedQty) * 100
                  : 0;
                const isEmpty  = item.remainingQty <= 0;
                const variant  = getStockBadgeVariant(pct);
                const bc       = BADGE_COLORS[variant];
                const showScheduledWarn =
                  isWithin7Days(item.scheduledUseDate) && !isEmpty && item.reorderAlert;

                return (
                  <View
                    key={item.id}
                    style={[
                      s.inputCard,
                      {
                        borderWidth:  isEmpty ? 1.5 : 1,
                        borderColor:  isEmpty ? '#DC2626' : '#E5E7EB',
                      },
                    ]}
                  >
                    {/* Row 1: name + badge */}
                    <View style={s.row1}>
                      <Text style={s.inputName}>
                        {item.emoji} {item.name}
                      </Text>
                      <View style={[s.badge, { backgroundColor: bc.bg }]}>
                        <Text style={[s.badgeText, { color: bc.text }]}>
                          {getStockBadgeLabel(item)}
                        </Text>
                      </View>
                    </View>

                    {/* Row 1b: purchased */}
                    <Text style={s.inputPurchased}>
                      {t('inventory.inputs.purchased', {
                        qty: formatQty(item.purchasedQty, item.unit),
                      })}
                    </Text>

                    {/* Progress bar */}
                    <View style={s.progressTrack}>
                      <View
                        style={[
                          s.progressFill,
                          {
                            width: `${Math.max(1, Math.min(pct, 100))}%` as `${number}%`,
                            backgroundColor: getStockBarColor(pct),
                          },
                        ]}
                      />
                    </View>

                    {/* Used / Left */}
                    <View style={s.statsRow}>
                      <Text style={s.statText}>
                        {t('inventory.inputs.used', {
                          qty: formatQty(item.usedQty, item.unit),
                        })}
                      </Text>
                      <Text style={s.statText}>
                        {t('inventory.inputs.left', {
                          qty: formatQty(item.remainingQty, item.unit),
                        })}
                      </Text>
                    </View>

                    {/* Scheduled use warning */}
                    {showScheduledWarn && item.scheduledUseDate && (
                      <View style={s.mb6}>
                        <AlertBox
                          variant="amber"
                          message={t('inventory.inputs.scheduledUse', {
                            date: formatDate(item.scheduledUseDate),
                          })}
                        />
                      </View>
                    )}

                    {/* Out of stock alert + Buy Now */}
                    {isEmpty && (
                      <>
                        <View style={s.mb6}>
                          <AlertBox
                            variant="red"
                            message={t('inventory.inputs.outOfStock')}
                          />
                        </View>
                        <Pressable
                          style={s.buyNowBtn}
                          onPress={() => navigation.navigate('RestockScreen', {
                            itemId:       item.id,
                            itemName:     item.name,
                            unit:         item.unit,
                            remainingQty: item.remainingQty,
                            supplier:     item.supplier,
                            costPerUnit:  item.costPerUnit,
                          })}
                          accessibilityRole="button"
                        >
                          <Text style={s.buyNowLabel}>
                            {t('inventory.inputs.buyNowFull', {
                              price: item.costPerUnit.toLocaleString(),
                              unit: item.unit,
                            })}
                          </Text>
                        </Pressable>
                      </>
                    )}

                    {/* Record Use / Restock */}
                    {!isEmpty && (
                      <View style={s.actionRow}>
                        <Pressable
                          style={s.outlineBtn}
                          onPress={() => navigation.navigate('RecordUseScreen', {
                            itemId:       item.id,
                            itemName:     item.name,
                            unit:         item.unit,
                            remainingQty: item.remainingQty,
                            supplier:     item.supplier,
                            costPerUnit:  item.costPerUnit,
                          })}
                          accessibilityRole="button"
                        >
                          <Text style={s.outlineBtnLabel}>
                            {t('inventory.inputs.recordUse')}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={s.primaryBtn}
                          onPress={() => navigation.navigate('RestockScreen', {
                            itemId:       item.id,
                            itemName:     item.name,
                            unit:         item.unit,
                            remainingQty: item.remainingQty,
                            supplier:     item.supplier,
                            costPerUnit:  item.costPerUnit,
                          })}
                          accessibilityRole="button"
                        >
                          <Text style={s.primaryBtnLabel}>
                            {t('inventory.inputs.restock')}
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Cost summary */}
                    <Text style={s.costSummary}>
                      {t('inventory.inputs.supplier', {
                        supplier: item.supplier,
                        cost: item.costPerUnit.toLocaleString(),
                        unit: item.unit,
                      })}
                    </Text>
                  </View>
                );
              })}

              {/* Add input dashed card */}
              <Pressable
                style={s.dashedCard}
                onPress={() => navigation.navigate('AddStockScreen')}
                accessibilityRole="button"
              >
                <Text style={s.dashedCardLabel}>
                  {t('inventory.inputs.addInputCard')}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      {/* ── ANIMAL PRODUCTS TAB ───────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {productsQ.isLoading && (
            <ActivityIndicator size="large" color="#1A6B3C" style={s.loader} />
          )}

          {!productsQ.isLoading && productGroups.length === 0 && (
            <View style={s.emptyBox}>
              <Text style={s.emptyTitle}>{t('inventory.products.cropOnlyMsg')}</Text>
            </View>
          )}

          {!productsQ.isLoading && productGroups.length > 0 && (
            <>
              {/* Today's Collection */}
              <Text style={s.sectionHeader}>{t('inventory.products.sectionTitle')}</Text>
              <View style={s.productGrid}>
                {productGroups.map(({ productType, records, todayRecord }) => {
                  const config = getProductConfig(productType);
                  const unit = t(`inventory.units.${config.unit}`, { defaultValue: config.unit });
                  return (
                    <View key={productType} style={[s.productCard, { borderColor: config.color }]}>
                      <Text style={s.productEmoji}>{config.emoji}</Text>
                      <Text style={[s.productValue, { color: config.color }]}>
                        {todayRecord?.quantity ?? '—'}
                      </Text>
                      <Text style={s.productUnit}>{unit}</Text>
                      <Text style={s.productDate}>
                        {productLabel(productType, t)} · {today.toLocaleDateString('en-GB', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      {todayRecord ? (
                        <>
                          <Text style={[s.recordedLabel, { color: config.color }]}>
                            {t('inventory.products.recorded')}
                          </Text>
                          <Pressable
                            style={[s.productActionBtn, { backgroundColor: config.color }]}
                            onPress={() => navigation.navigate('RecordAnimalProductScreen', {
                              productType,
                              existingId:   todayRecord.id,
                              existingQty:  todayRecord.quantity,
                              farmId:       todayRecord.farmId,
                              animalGroupId: todayRecord.animalGroupId,
                              pricePerUnit: todayRecord.pricePerUnit,
                            })}
                            accessibilityRole="button"
                          >
                            <Text style={s.productActionLabel}>
                              {t('inventory.products.update')}
                            </Text>
                          </Pressable>
                        </>
                      ) : (
                        <>
                          <View style={s.mb4}>
                            <AlertBox
                              variant="amber"
                              message={t('inventory.products.recordAlert')}
                            />
                          </View>
                          <Pressable
                            style={[s.productActionBtn, { backgroundColor: config.color }]}
                            onPress={() => navigation.navigate('RecordAnimalProductScreen', {
                              productType,
                              farmId:        records[0]?.farmId ?? 'farm-1',
                              animalGroupId: records[0]?.animalGroupId ?? `ag-${productType}`,
                              pricePerUnit:  records[0]?.pricePerUnit ?? 0,
                            })}
                            accessibilityRole="button"
                          >
                            <Text style={s.productActionLabel}>
                              {t('inventory.products.recordNow')}
                            </Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* 7-day grids, one per tracked product */}
              {productGroups.map(({ productType, weekValues, maxValue }) => (
                <React.Fragment key={productType}>
                  <Text style={s.sectionHeader}>
                    {t('inventory.products.weekTitleGeneric', { product: productLabel(productType, t) })}
                  </Text>
                  <WeeklyGrid
                    weekDays={weekDays}
                    values={weekValues}
                    maxValue={maxValue}
                    today={today}
                    footerText={t('inventory.products.weekSummaryGeneric', {
                      total: weekValues.reduce<number>((a, v) => a + (v ?? 0), 0),
                      unit: t(`inventory.units.${getProductConfig(productType).unit}`, {
                        defaultValue: getProductConfig(productType).unit,
                      }),
                      avg: (
                        weekValues.reduce<number>((a, v) => a + (v ?? 0), 0) /
                        Math.max(weekValues.filter((v) => v !== null).length, 1)
                      ).toFixed(1),
                    })}
                    dayKeys={DAY_KEYS.map((k) => t(`inventory.products.days.${k}`))}
                  />
                </React.Fragment>
              ))}

              {/* Quick Sell */}
              <Text style={s.sectionHeader}>{t('inventory.products.sellTitle')}</Text>
              <View style={s.actionRow}>
                {productGroups.map(({ productType }) => {
                  const config = getProductConfig(productType);
                  return (
                    <Pressable
                      key={productType}
                      style={[s.primaryBtn, { backgroundColor: config.color }]}
                      onPress={() => navigation.navigate('AddCollectionScreen', { productType })}
                      accessibilityRole="button"
                    >
                      <Text style={s.primaryBtnLabel}>
                        {t('inventory.products.sellGeneric', { product: productLabel(productType, t) })} {config.emoji}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Start tracking a new product type */}
          {!productsQ.isLoading && untrackedProductTypes.length > 0 && (
            <>
              <Text style={s.sectionHeader}>{t('inventory.products.addProductTitle')}</Text>
              <View style={[s.chipRow, s.chipRowWrap]}>
                {untrackedProductTypes.map((p) => (
                  <Pressable
                    key={p.key}
                    style={[s.chip, s.chipInactive]}
                    onPress={() => navigation.navigate('RecordAnimalProductScreen', {
                      productType: p.key,
                      farmId: allProducts[0]?.farmId ?? 'farm-1',
                      animalGroupId: `ag-${p.key}`,
                      pricePerUnit: 0,
                    })}
                    accessibilityRole="button"
                  >
                    <Text style={s.chipTextInactive}>
                      {p.emoji} {t(p.labelKey)}
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  style={[s.chip, s.chipInactive]}
                  onPress={() => setShowCustomProductInput(true)}
                  accessibilityRole="button"
                >
                  <Text style={s.chipTextInactive}>
                    ➕ {t('inventory.products.otherProduct')}
                  </Text>
                </Pressable>
              </View>

              {showCustomProductInput && (
                <View style={s.customProductRow}>
                  <TextInput
                    style={s.textInputFlex}
                    value={customProductName}
                    onChangeText={setCustomProductName}
                    placeholder={t('inventory.products.otherProductPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                  />
                  <Pressable
                    style={[s.primaryBtn, !customProductName.trim() && s.btnDisabled]}
                    disabled={!customProductName.trim()}
                    onPress={() => {
                      const productType = customProductName.trim();
                      setShowCustomProductInput(false);
                      setCustomProductName('');
                      navigation.navigate('RecordAnimalProductScreen', {
                        productType,
                        farmId: allProducts[0]?.farmId ?? 'farm-1',
                        animalGroupId: `ag-${productType}`,
                        pricePerUnit: 0,
                      });
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={s.primaryBtnLabel}>{t('inventory.products.startTracking')}</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── HARVEST STORE TAB ─────────────────────────────────────────────── */}
      {activeTab === 'harvest' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {harvestQ.isLoading && (
            <ActivityIndicator size="large" color="#1A6B3C" style={s.loader} />
          )}

          {!harvestQ.isLoading && (
            <>
              <Text style={s.sectionHeader}>{t('inventory.harvest.section')}</Text>

              {allHarvest.length === 0 ? (
                <View style={s.emptyBox}>
                  <Text style={s.emptyBody}>{t('inventory.harvest.empty')}</Text>
                  <Pressable
                    style={s.dashedCard}
                    onPress={() => navigation.navigate('AddHarvestScreen')}
                    accessibilityRole="button"
                  >
                    <Text style={s.dashedCardLabel}>
                      {t('inventory.harvest.addNew')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Total value banner */}
                  {totalHarvestValue > 0 && (
                    <View style={s.harvestBanner}>
                      <View style={s.harvestBannerRow}>
                        <Text style={s.harvestBannerTitle}>
                          {t('inventory.harvest.totalTitle')}
                        </Text>
                        <Text style={s.harvestBannerValue}>
                          KES {formatNumber(totalHarvestValue)}
                        </Text>
                      </View>
                      <Text style={s.harvestBannerSub}>
                        {t('inventory.harvest.totalSub', {
                          count: allHarvest.filter((h) => h.remainingKg > 0).length,
                          totalKg: totalHarvestKg.toLocaleString(),
                        })}
                      </Text>
                    </View>
                  )}

                  {allHarvest.map((item) => {
                    const soldPct =
                      item.quantityKg > 0
                        ? (item.soldKg / item.quantityKg) * 100
                        : 100;

                    return (
                      <View
                        key={item.id}
                        style={[
                          s.harvestCard,
                          {
                            borderColor: item.remainingKg > 0 ? '#1A6B3C' : '#E5E7EB',
                          },
                        ]}
                      >
                        <View style={s.row1}>
                          <Text style={s.inputName}>
                            {getCropEmoji(item.cropName)} {item.cropName} ({item.variety})
                          </Text>
                          <View
                            style={[
                              s.badge,
                              { backgroundColor: item.remainingKg > 0 ? '#EAF4EE' : '#EAF4EE' },
                            ]}
                          >
                            <Text style={[s.badgeText, { color: '#0D4A28' }]}>
                              {item.remainingKg > 0
                                ? `${item.remainingKg}kg`
                                : t('inventory.harvest.soldOut')}
                            </Text>
                          </View>
                        </View>

                        <Text style={s.inputPurchased}>
                          {t('inventory.harvest.harvested', {
                            date: formatDate(item.harvestDate),
                            grade: item.gradeLabel,
                          })}
                        </Text>

                        {/* Sold progress */}
                        <View style={s.statsRow}>
                          <Text style={s.statText}>
                            {t('inventory.harvest.sold', { kg: item.soldKg })}
                          </Text>
                          <Text style={s.statText}>
                            {t('inventory.harvest.remaining', { kg: item.remainingKg })}
                          </Text>
                        </View>
                        <View style={s.progressTrack}>
                          <View
                            style={[
                              s.progressFill,
                              {
                                width: `${Math.min(soldPct, 100)}%` as `${number}%`,
                                backgroundColor: '#1A6B3C',
                              },
                            ]}
                          />
                        </View>

                        {/* Estimated value */}
                        <View style={s.harvestValueBox}>
                          <Text style={s.harvestValueText}>
                            {t('inventory.harvest.estimatedValue', {
                              value: formatNumber(item.estimatedValueKes),
                            })}
                          </Text>
                          <Text style={s.harvestValueNote}>
                            {t('inventory.harvest.marketPriceNote', {
                              kg: item.remainingKg,
                              price: item.quantityKg > 0
                                ? Math.round(item.estimatedValueKes / Math.max(item.remainingKg, 1))
                                : 0,
                            })}
                          </Text>
                        </View>

                        <Text style={s.costSummary}>
                          {t('inventory.harvest.storage', {
                            location: item.storageLocation,
                          })}
                        </Text>

                        <View style={[s.actionRow, s.mt6]}>
                          <Pressable
                            style={s.primaryBtn}
                            onPress={() => navigation.navigate('RecordHarvestSaleScreen', {
                              harvestId:           item.id,
                              cropName:            item.cropName,
                              remainingKg:         item.remainingKg,
                              estimatedPricePerKg: item.quantityKg > 0
                                ? Math.round(item.estimatedValueKes / Math.max(item.remainingKg, 1))
                                : 0,
                            })}
                            accessibilityRole="button"
                          >
                            <Text style={s.primaryBtnLabel}>
                              {t('inventory.harvest.recordSale')}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={s.outlineBtn}
                            onPress={() => navigation.navigate('UpdateHarvestStockScreen', {
                              harvestId:   item.id,
                              cropName:    item.cropName,
                              remainingKg: item.remainingKg,
                            })}
                            accessibilityRole="button"
                          >
                            <Text style={s.outlineBtnLabel}>
                              {t('inventory.harvest.updateStock')}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}

                  {/* Add harvest card */}
                  <Pressable
                    style={s.dashedCard}
                    onPress={() => navigation.navigate('AddHarvestScreen')}
                    accessibilityRole="button"
                  >
                    <Text style={s.dashedCardLabel}>
                      {t('inventory.harvest.addNew')}
                    </Text>
                  </Pressable>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── COLLECTIONS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'collections' && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {collectionsQ.isLoading && (
            <ActivityIndicator size="large" color="#1A6B3C" style={s.loader} />
          )}

          {!collectionsQ.isLoading && (
            <>
              {/* Total pending banner */}
              <View style={s.mb8}>
                {totalPending > 0 ? (
                  <AlertBox
                    variant="green"
                    message={t('inventory.collections.pendingBannerFull', {
                      total: formatNumber(totalPending),
                      count: unpaidCollections.length,
                      plural: unpaidCollections.length !== 1 ? 's' : '',
                    })}
                  />
                ) : (
                  <AlertBox
                    variant="green"
                    message={t('inventory.collections.allPaid')}
                  />
                )}
              </View>

              {/* Filter chips */}
              <View style={s.filterRow}>
                {COLLECTION_FILTERS.map((f) => (
                  <Pressable
                    key={f.key}
                    style={[
                      s.chip,
                      collectionFilter === f.key ? s.chipActive : s.chipInactive,
                    ]}
                    onPress={() => setCollectionFilter(f.key)}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        s.chipText,
                        collectionFilter === f.key
                          ? s.chipTextActive
                          : s.chipTextInactive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Collection cards */}
              {filteredCollections
                .slice()
                .sort((a, b) => {
                  if (!a.isPaid && !b.isPaid) {
                    return new Date(a.takenDate).getTime() - new Date(b.takenDate).getTime();
                  }
                  return 0;
                })
                .map((item) => {
                  const daysOwing = getDaysOwing(item.takenDate);
                  return (
                    <View
                      key={item.id}
                      style={[
                        s.collectionCard,
                        {
                          borderColor: item.isPaid ? '#E5E7EB' : '#D97706',
                          opacity:     item.isPaid ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View style={s.collectionRow1}>
                        <Text style={s.collectionName}>{item.customerName}</Text>
                        <Text
                          style={[
                            s.collectionAmount,
                            { color: item.isPaid ? '#1A6B3C' : '#D97706' },
                          ]}
                        >
                          KES {item.totalAmount.toLocaleString()}
                        </Text>
                      </View>
                      <Text style={s.collectionDesc}>
                        {t('inventory.collections.productTaken', {
                          product: item.productType,
                          qty:     item.quantity,
                          unit:    item.unit,
                        })}
                      </Text>
                      <Text style={s.collectionSince}>
                        {t('inventory.collections.since', {
                          date: formatDate(item.takenDate, 'MMM D, YYYY'),
                        })}
                      </Text>

                      {item.isPaid && item.paidDate ? (
                        <Text style={s.paidOnLabel}>
                          {t('inventory.collections.paidOn', {
                            date: formatDate(item.paidDate),
                          })}
                        </Text>
                      ) : (
                        <>
                          <Text style={s.daysOwingLabel}>
                            {t('inventory.collections.daysOwing', {
                              count: daysOwing,
                              plural: daysOwing !== 1 ? 's' : '',
                            })}
                          </Text>
                          <View style={[s.actionRow, s.mt5]}>
                            <Pressable
                              style={[
                                s.primaryBtn,
                                markPaidMutation.isPending && s.btnDisabled,
                              ]}
                              onPress={() => handleMarkPaid(item.id, item.totalAmount)}
                              disabled={markPaidMutation.isPending}
                              accessibilityRole="button"
                            >
                              <Text style={s.primaryBtnLabel}>
                                {t('inventory.collections.markPaid')}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={s.outlineBtn}
                              onPress={() =>
                                void Linking.openURL(`tel:${item.customerPhone}`)
                              }
                              accessibilityRole="button"
                            >
                              <Text style={s.outlineBtnLabel}>
                                {t('inventory.collections.callBtn')}
                              </Text>
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}

              {/* Add collection card */}
              <Pressable
                style={s.dashedCard}
                onPress={() => navigation.navigate('AddCollectionScreen', {})}
                accessibilityRole="button"
              >
                <Text style={s.dashedCardLabel}>
                  {t('inventory.collections.addNew')}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        style={s.fab}
        onPress={() => navigation.navigate('AddStockScreen')}
        accessibilityRole="button"
        accessibilityLabel={t('inventory.inputs.addCta')}
      >
        <Text style={s.fabIcon}>+</Text>
      </Pressable>
    </View>
  );
}

// ── WeeklyGrid sub-component ─────────────────────────────────────────────────

interface WeeklyGridProps {
  weekDays: Date[];
  values: Array<number | null>;
  maxValue: number;
  today: Date;
  footerText: string;
  dayKeys: string[];
}

function WeeklyGrid({
  weekDays,
  values,
  maxValue,
  today,
  footerText,
  dayKeys,
}: WeeklyGridProps) {
  return (
    <View style={s.weekCard}>
      <View style={s.weekGrid}>
        {weekDays.map((day, i) => {
          const isToday  = isSameDay(day.toISOString(), today);
          const isPast   = day < today && !isToday;
          const isFuture = day > today && !isToday;
          const val      = values[i];

          return (
            <View key={i} style={s.weekDayCol}>
              <Text style={s.weekDayLabel}>{dayKeys[i]}</Text>
              <View style={[s.weekDayBox, isToday && s.weekDayBoxToday]}>
                <Text
                  style={[
                    s.weekDayNum,
                    isToday && s.weekDayNumToday,
                    isFuture && s.weekDayFuture,
                    isPast && val === null && s.weekDayNoData,
                  ]}
                >
                  {isFuture ? '·' : val !== null ? String(val) : '—'}
                </Text>
                {isPast && val !== null && (
                  <View
                    style={[
                      s.weekBar,
                      { width: `${(val / maxValue) * 80}%` as `${number}%` },
                    ]}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      <Text style={s.weekSummary}>{footerText}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  topArea: { backgroundColor: '#1A6B3C' },
  topBar:  {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12,
  },
  topBarTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  topBarActions: { flexDirection: 'row', alignItems: 'center' },
  topBarBtn:   { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  topBarIcon:  { fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 26 },

  reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  reportSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 32,
  },
  reportTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  reportBtnDisabled: { opacity: 0.6 },
  reportBtnLabel: { fontSize: 15, color: '#fff', fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },

  // ── Summary strip ──────────────────────────────────────────────────────────
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryBorder: { borderRightWidth: 1, borderColor: '#E5E7EB' },
  summaryValue:  { fontSize: 12, fontWeight: '800' },
  summaryLabel:  { fontSize: 8, color: '#6B7280', marginTop: 2 },

  // ── Sub-tabs ───────────────────────────────────────────────────────────────
  subTabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: '#E5E7EB',
  },
  tabItem: {
    flex: 1, paddingVertical: 9, alignItems: 'center',
    borderBottomWidth: 2, borderColor: 'transparent',
  },
  tabItemActive:  { borderColor: '#1A6B3C' },
  tabLabel:       { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  tabLabelActive: { color: '#1A6B3C', fontWeight: '600' },

  scroll:        { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 11, paddingBottom: 90 },

  loader: { marginTop: 32 },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipScroll:    { marginBottom: 10 },
  chipRow:       { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  chipRowWrap:   { flexWrap: 'wrap' },
  customProductRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' },
  textInputFlex: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9, fontSize: 10, color: '#111827',
    backgroundColor: '#F9FAFB', minHeight: 40,
  },
  filterRow:     { flexDirection: 'row', gap: 6, marginBottom: 10 },
  chip:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipActive:    { backgroundColor: '#1A6B3C' },
  chipInactive:  { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1A6B3C' },
  chipText:      { fontSize: 9, fontWeight: '600' },
  chipTextActive:   { color: '#fff' },
  chipTextInactive: { color: '#1A6B3C' },

  sectionHeader: {
    fontSize: 9, fontWeight: '700', color: '#1A6B3C',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 10, marginBottom: 5,
  },

  // ── Skeleton ──────────────────────────────────────────────────────────────
  skeletonCard: {
    height: 90, backgroundColor: '#F3F4F6', borderRadius: 8, marginBottom: 8,
  },

  // ── Input cards ──────────────────────────────────────────────────────────
  inputCard: {
    backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  row1: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 3,
  },
  inputName:      { fontSize: 11, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  badge:          { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText:      { fontSize: 8, fontWeight: '600' },
  inputPurchased: { fontSize: 9, color: '#6B7280', marginBottom: 4 },
  progressTrack:  {
    height: 7, backgroundColor: '#E5E7EB', borderRadius: 3,
    overflow: 'hidden', marginBottom: 3,
  },
  progressFill:   { height: 7, borderRadius: 3 },
  statsRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  statText:       { fontSize: 8, color: '#6B7280' },
  costSummary:    { fontSize: 8, color: '#9CA3AF', marginTop: 4 },

  // ── Buttons ───────────────────────────────────────────────────────────────
  actionRow:      { flexDirection: 'row', gap: 5 },
  outlineBtn:     {
    flex: 1, minHeight: 44, borderWidth: 1.5, borderColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  outlineBtnLabel:{ fontSize: 8, color: '#1A6B3C', fontWeight: '600' },
  primaryBtn:     {
    flex: 1, minHeight: 44, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnLabel:{ fontSize: 8, color: '#fff', fontWeight: '600' },
  buyNowBtn:      {
    minHeight: 44, backgroundColor: '#DC2626',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
  buyNowLabel:    { fontSize: 8, color: '#fff', fontWeight: '600' },
  btnDisabled:    { opacity: 0.6 },

  // ── Empty states ──────────────────────────────────────────────────────────
  emptyCard: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed',
    borderRadius: 8, padding: 20, alignItems: 'center', marginBottom: 8,
  },
  emptyBox:   { paddingVertical: 20, alignItems: 'center' },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, textAlign: 'center' },
  emptyBody:  { fontSize: 11, color: '#6B7280', textAlign: 'center', marginBottom: 12 },
  emptyCtaBtn:   {
    minHeight: 48, backgroundColor: '#1A6B3C', borderRadius: 6,
    paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  emptyCtaLabel: { fontSize: 10, color: '#fff', fontWeight: '600' },
  dashedCard:    {
    borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed',
    borderRadius: 8, backgroundColor: '#F9FAFB', padding: 12,
    alignItems: 'center', marginTop: 4, minHeight: 48, justifyContent: 'center',
  },
  dashedCardLabel: { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },

  // ── Animal Products ───────────────────────────────────────────────────────
  productGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  productCard:      {
    flexBasis: '47%', flexGrow: 1, borderWidth: 1.5, borderRadius: 8, padding: 10,
    alignItems: 'center', backgroundColor: '#fff',
  },
  productEmoji:     { fontSize: 22, marginBottom: 2 },
  productValue:     { fontSize: 16, fontWeight: '800', marginBottom: 1 },
  productUnit:      { fontSize: 9, color: '#6B7280' },
  productDate:      { fontSize: 9, color: '#6B7280', textAlign: 'center', marginBottom: 5 },
  recordedLabel:    { fontSize: 8, color: '#1A6B3C', marginBottom: 3 },
  productActionBtn: {
    minHeight: 44, borderRadius: 6, paddingHorizontal: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 5,
  },
  productActionLabel: { fontSize: 8, color: '#fff', fontWeight: '600' },

  // ── Weekly grid ───────────────────────────────────────────────────────────
  weekCard:     {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 8, padding: 8, marginBottom: 8,
  },
  weekGrid:     { flexDirection: 'row', marginBottom: 6 },
  weekDayCol:   { flex: 1, alignItems: 'center', paddingVertical: 3 },
  weekDayLabel: { fontSize: 7, color: '#6B7280', marginBottom: 3, textAlign: 'center' },
  weekDayBox:   {
    paddingVertical: 3, paddingHorizontal: 2,
    borderRadius: 3, minWidth: 28, alignItems: 'center',
  },
  weekDayBoxToday:  { backgroundColor: '#EAF4EE' },
  weekDayNum:       { fontSize: 9, fontWeight: '600', color: '#111827' },
  weekDayNumToday:  { color: '#1A6B3C', fontWeight: '700' },
  weekDayFuture:    { color: '#E5E7EB' },
  weekDayNoData:    { color: '#9CA3AF' },
  weekBar: {
    height: 3, backgroundColor: '#1A6B3C', borderRadius: 1.5, marginTop: 2,
  },
  weekSummary: { fontSize: 8, color: '#6B7280', textAlign: 'center', marginTop: 6 },

  // ── Harvest store ─────────────────────────────────────────────────────────
  harvestBanner: {
    backgroundColor: '#EAF4EE', borderWidth: 1, borderColor: '#1A6B3C',
    borderRadius: 8, padding: 10, marginBottom: 8,
  },
  harvestBannerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  harvestBannerTitle:{ fontSize: 10, fontWeight: '700', color: '#0D4A28' },
  harvestBannerValue:{ fontSize: 13, fontWeight: '800', color: '#1A6B3C' },
  harvestBannerSub:  { fontSize: 9, color: '#1A6B3C', marginTop: 2 },
  harvestCard: {
    backgroundColor: '#fff', borderWidth: 1, borderRadius: 8,
    padding: 10, marginBottom: 8,
  },
  harvestValueBox: {
    backgroundColor: '#F9FAFB', borderRadius: 5,
    paddingVertical: 6, paddingHorizontal: 8, marginTop: 5,
  },
  harvestValueText: { fontSize: 9, fontWeight: '600', color: '#1A6B3C' },
  harvestValueNote: { fontSize: 8, color: '#6B7280' },

  // ── Collections ───────────────────────────────────────────────────────────
  collectionCard: {
    backgroundColor: '#fff', borderWidth: 1, borderRadius: 8,
    padding: 10, marginBottom: 8,
  },
  collectionRow1: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 3,
  },
  collectionName:   { fontSize: 11, fontWeight: '600', color: '#111827' },
  collectionAmount: { fontSize: 12, fontWeight: '700' },
  collectionDesc:   { fontSize: 9, color: '#6B7280', marginBottom: 2 },
  collectionSince:  { fontSize: 8, color: '#9CA3AF' },
  paidOnLabel:      { fontSize: 9, color: '#1A6B3C', marginTop: 4 },
  daysOwingLabel:   { fontSize: 8, color: '#DC2626', marginTop: 3 },

  // ── Utility ───────────────────────────────────────────────────────────────
  mb4: { marginBottom: 4 },
  mb6: { marginBottom: 6 },
  mb8: { marginBottom: 8 },
  mt5: { marginTop: 5 },
  mt6: { marginTop: 6 },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 72, right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#1A6B3C', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1A6B3C', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  fabIcon: { fontSize: 24, color: '#fff', lineHeight: 28 },
});
