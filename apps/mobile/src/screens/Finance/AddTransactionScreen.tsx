import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { financeApi } from '../../api/finance';
import { farmApi } from '../../api/farm';
import type { FinanceStackParamList } from '../../navigation/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<FinanceStackParamList, 'AddTransaction'>;
type TxType = 'income' | 'expense';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amountKes: z.number().positive(),
  category: z.string().min(1),
  linkedTo: z.string().optional(),
  buyerSupplier: z.string().optional(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface LinkedToOption {
  label: string;
  value: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: Array<{ key: string; icon: string; i18nKey: string }> = [
  { key: 'crop_sale',          icon: '🌽', i18nKey: 'finance.transaction.category.crop_sale' },
  { key: 'animal_products',    icon: '🥚', i18nKey: 'finance.transaction.category.animal_products' },
  { key: 'fertiliser',         icon: '🌾', i18nKey: 'finance.transaction.category.fertiliser' },
  { key: 'pesticide_drugs',    icon: '💊', i18nKey: 'finance.transaction.category.pesticide_drugs' },
  { key: 'tools_equipment',    icon: '🔧', i18nKey: 'finance.transaction.category.tools_equipment' },
  { key: 'labour',             icon: '👷', i18nKey: 'finance.transaction.category.labour' },
  { key: 'water_irrigation',   icon: '💧', i18nKey: 'finance.transaction.category.water_irrigation' },
  { key: 'other_input',        icon: '📦', i18nKey: 'finance.transaction.category.other_input' },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-KE', { month: 'long' });
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function AddTransactionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isOnline, queueWrite } = useOfflineSync();
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [txType, setTxType]               = useState<TxType>('income');
  const [amountText, setAmountText]       = useState('');
  const [category, setCategory]           = useState('');
  const [linkedTo, setLinkedTo]           = useState('');
  const [linkedToLabel, setLinkedToLabel] = useState('');
  const [buyerSupplier, setBuyerSupplier] = useState('');
  const [date, setDate]                   = useState(new Date());
  const [notes, setNotes]                 = useState('');
  const [errorMsg, setErrorMsg]           = useState('');

  // ── Picker visibility ───────────────────────────────────────────────────────
  const [showLinkedModal, setShowLinkedModal] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // ── Data ────────────────────────────────────────────────────────────────────
  const farmsQuery = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmApi.list(),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
  });

  const linkedToOptions: LinkedToOption[] = React.useMemo(() => {
    const farms = farmsQuery.data?.data ?? [];
    const opts: LinkedToOption[] = [];
    for (const farm of farms) {
      opts.push({ label: farm.name, value: farm.id });
      for (const plot of (farm.plots ?? [])) {
        if (plot.cropType) {
          opts.push({ label: `${farm.name} — ${plot.cropType}`, value: plot.id });
        }
      }
    }
    return opts;
  }, [farmsQuery.data]);

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (dto: TransactionFormData) =>
      financeApi.transactions.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance/report'] });
      navigation.goBack();
    },
    onError: () => {
      setErrorMsg(t('finance.transaction.errorSave'));
    },
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const amountNum = parseFloat(amountText.replace(/,/g, ''));
  const isValid = !isNaN(amountNum) && amountNum > 0 && category.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const onDateChange = (selected: Date) => {
    setDate(selected);
  };

  const handleSave = async () => {
    setErrorMsg('');
    const parsed = transactionSchema.safeParse({
      type: txType,
      amountKes: amountNum,
      category,
      linkedTo: linkedTo || undefined,
      buyerSupplier: buyerSupplier || undefined,
      date: formatDate(date),
      notes: notes || undefined,
    });

    if (!parsed.success) {
      setErrorMsg(t('finance.transaction.errorSave'));
      return;
    }

    if (!isOnline) {
      queueWrite({
        id: String(Date.now()),
        operation: 'CREATE',
        entity: 'transactions',
        endpoint: '/finance/transactions',
        payload: JSON.stringify(parsed.data),
        created_at: new Date().toISOString(),
        status: 'pending',
      });
      navigation.goBack();
      return;
    }

    mutation.mutate(parsed.data);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
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
          <Text style={s.topBarTitle}>{t('finance.transaction.topBarTitle')}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Income / Expense Toggle ─────────────────────────────────────── */}
        <View style={s.toggleRow}>
          <Pressable
            style={[
              s.toggleTile,
              txType === 'income' && s.toggleTileIncomeActive,
            ]}
            onPress={() => setTxType('income')}
            accessibilityRole="radio"
            accessibilityState={{ checked: txType === 'income' }}
          >
            <Text style={s.toggleIcon}>📈</Text>
            <Text
              style={[
                s.toggleLabel,
                txType === 'income' && s.toggleLabelActive,
              ]}
            >
              {t('finance.transaction.incomeToggle')}
            </Text>
            <Text style={s.toggleSub}>{t('finance.transaction.incomeSubtitle')}</Text>
          </Pressable>

          <Pressable
            style={[
              s.toggleTile,
              txType === 'expense' && s.toggleTileExpenseActive,
            ]}
            onPress={() => setTxType('expense')}
            accessibilityRole="radio"
            accessibilityState={{ checked: txType === 'expense' }}
          >
            <Text style={s.toggleIcon}>📉</Text>
            <Text
              style={[
                s.toggleLabel,
                txType === 'expense' ? s.toggleLabelExpenseActive : s.toggleLabelInactive,
              ]}
            >
              {t('finance.transaction.expenseToggle')}
            </Text>
            <Text style={s.toggleSub}>{t('finance.transaction.expenseSubtitle')}</Text>
          </Pressable>
        </View>

        {/* ── Amount ──────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('finance.transaction.amountLabel')}</Text>
        <View style={s.amountRow}>
          <Text style={s.amountPrefix}>{t('finance.transaction.amountPrefix')}</Text>
          <TextInput
            style={s.amountInput}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={t('finance.transaction.amountLabel')}
          />
        </View>

        {/* ── Category ────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('finance.transaction.categoryLabel')}</Text>
        <View style={s.chipsWrap}>
          {CATEGORIES.map((cat) => {
            const selected = category === cat.key;
            return (
              <Pressable
                key={cat.key}
                style={[s.chip, selected && s.chipSelected]}
                onPress={() => setCategory(cat.key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[s.chipText, selected && s.chipTextSelected]}>
                  {t(cat.i18nKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Linked To ───────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('finance.transaction.linkedToLabel')}</Text>
        <Pressable
          style={s.pickerBtn}
          onPress={() => setShowLinkedModal(true)}
          accessibilityRole="button"
        >
          <Text
            style={linkedTo ? s.pickerBtnValue : s.pickerBtnPlaceholder}
            numberOfLines={1}
          >
            {linkedToLabel || t('finance.transaction.linkedToPlaceholder')}
          </Text>
          <Text style={s.pickerChevron}>›</Text>
        </Pressable>

        {/* ── Buyer / Supplier ────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('finance.transaction.buyerLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={buyerSupplier}
          onChangeText={setBuyerSupplier}
          placeholder={t('finance.transaction.buyerPlaceholder')}
          placeholderTextColor="#9CA3AF"
          returnKeyType="next"
        />

        {/* ── Date ────────────────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('finance.transaction.dateLabel')}</Text>
        <DatePickerField
          value={date}
          onChange={onDateChange}
          maximumDate={new Date()}
        />

        {/* ── Receipt / Notes ─────────────────────────────────────────────── */}
        <Text style={s.fieldLabel}>{t('finance.transaction.notesLabel')}</Text>
        <TextInput
          style={s.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('finance.transaction.notesPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        {/* ── Info Alert ──────────────────────────────────────────────────── */}
        <View style={s.infoAlert}>
          <Text style={s.infoAlertText}>
            {t('finance.transaction.infoAlert', { month: formatMonthLabel(date) })}
          </Text>
        </View>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {errorMsg.length > 0 && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* ── Save Button ─────────────────────────────────────────────────── */}
        <Pressable
          style={[s.saveBtn, !isValid && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || mutation.isPending }}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.saveBtnLabel}>
              {isValid
                ? t('finance.transaction.saveBtn')
                : t('finance.transaction.saveBtn')}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* ── Linked To Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={showLinkedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLinkedModal(false)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setShowLinkedModal(false)}
        />
        <View style={s.linkedModalSheet}>
          <View style={s.dateModalHeader}>
            <Text style={s.dateModalTitle}>{t('finance.transaction.linkedToModal.title')}</Text>
            <Pressable
              style={s.dateModalDoneBtn}
              onPress={() => setShowLinkedModal(false)}
              accessibilityRole="button"
            >
              <Text style={s.dateModalDoneLabel}>
                {t('finance.transaction.linkedToModal.close')}
              </Text>
            </Pressable>
          </View>

          {farmsQuery.isLoading && (
            <ActivityIndicator
              size="large"
              color="#1A6B3C"
              style={{ marginTop: 24 }}
            />
          )}

          {!farmsQuery.isLoading && linkedToOptions.length === 0 && (
            <View style={s.linkedEmpty}>
              <Text style={s.linkedEmptyText}>{t('farm.list.empty.title')}</Text>
            </View>
          )}

          <FlatList
            data={linkedToOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  s.linkedOption,
                  linkedTo === item.value && s.linkedOptionSelected,
                ]}
                onPress={() => {
                  setLinkedTo(item.value);
                  setLinkedToLabel(item.label);
                  setShowLinkedModal(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: linkedTo === item.value }}
              >
                <Text
                  style={[
                    s.linkedOptionLabel,
                    linkedTo === item.value && s.linkedOptionLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {linkedTo === item.value && (
                  <Text style={s.linkedOptionCheck}>✓</Text>
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={s.linkedSeparator} />}
          />
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:               { flex: 1, backgroundColor: '#fff' },
  topArea:            { backgroundColor: '#1A6B3C' },
  topBar:             { height: 44, flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 12 },
  backBtn:            { flexDirection: 'row', alignItems: 'center', gap: 4,
                        minHeight: 44, minWidth: 44, justifyContent: 'center' },
  backArrow:          { fontSize: 18, color: '#fff' },
  backLabel:          { fontSize: 14, color: '#fff' },
  topBarTitle:        { flex: 1, textAlign: 'center', fontSize: 15,
                        fontWeight: '600', color: '#fff' },
  topBarSpacer:       { minWidth: 44 },

  scroll:             { flex: 1 },
  scrollContent:      { padding: 16, paddingBottom: 40 },

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggleRow:            { flexDirection: 'row', gap: 6, marginBottom: 12 },
  toggleTile:           { flex: 1, padding: 10, alignItems: 'center',
                          borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB',
                          backgroundColor: '#fff', minHeight: 48 },
  toggleTileIncomeActive:  { backgroundColor: '#EAF4EE', borderWidth: 2, borderColor: '#1A6B3C' },
  toggleTileExpenseActive: { backgroundColor: '#FEE2E2', borderWidth: 2, borderColor: '#DC2626' },
  toggleIcon:           { fontSize: 18, marginBottom: 2 },
  toggleLabel:          { fontSize: 10, fontWeight: '700', color: '#1A6B3C' },
  toggleLabelActive:    { color: '#1A6B3C' },
  toggleLabelInactive:  { color: '#6B7280' },
  toggleLabelExpenseActive: { color: '#DC2626' },
  toggleSub:            { fontSize: 8, color: '#6B7280', marginTop: 1 },

  // ── Fields ────────────────────────────────────────────────────────────────
  fieldLabel:           { fontSize: 9, fontWeight: '700', color: '#1A6B3C',
                          textTransform: 'uppercase', letterSpacing: 0.8,
                          marginTop: 12, marginBottom: 5 },

  // ── Amount ────────────────────────────────────────────────────────────────
  amountRow:            { flexDirection: 'row', alignItems: 'center',
                          borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
                          backgroundColor: '#F9FAFB' },
  amountPrefix:         { paddingHorizontal: 9, fontSize: 14, fontWeight: '700',
                          color: '#9CA3AF' },
  amountInput:          { flex: 1, paddingVertical: 9, paddingRight: 9,
                          fontSize: 14, fontWeight: '700', color: '#111827' },

  // ── Category Chips ────────────────────────────────────────────────────────
  chipsWrap:            { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip:                 { borderWidth: 1, borderColor: '#1A6B3C', borderRadius: 20,
                          paddingHorizontal: 8, paddingVertical: 6,
                          backgroundColor: '#fff', minHeight: 32, justifyContent: 'center' },
  chipSelected:         { backgroundColor: '#1A6B3C', borderColor: '#1A6B3C' },
  chipText:             { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },
  chipTextSelected:     { color: '#fff' },

  // ── Picker Button ─────────────────────────────────────────────────────────
  pickerBtn:            { flexDirection: 'row', alignItems: 'center',
                          borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
                          backgroundColor: '#F9FAFB', paddingVertical: 9,
                          paddingHorizontal: 9, minHeight: 48 },
  pickerBtnPlaceholder: { flex: 1, fontSize: 10, color: '#9CA3AF' },
  pickerBtnValue:       { flex: 1, fontSize: 10, color: '#111827' },
  pickerChevron:        { fontSize: 16, color: '#6B7280' },

  // ── Text Input ────────────────────────────────────────────────────────────
  textInput:            { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
                          paddingVertical: 7, paddingHorizontal: 9,
                          fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB',
                          minHeight: 48 },

  // ── Date ──────────────────────────────────────────────────────────────────
  datePressable:        { flexDirection: 'row', alignItems: 'center', gap: 6,
                          borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
                          backgroundColor: '#F9FAFB', paddingVertical: 9,
                          paddingHorizontal: 9, minHeight: 48 },
  datePrefixIcon:       { fontSize: 16 },
  dateValue:            { fontSize: 10, color: '#111827', fontWeight: '600' },

  // ── Notes ─────────────────────────────────────────────────────────────────
  notesInput:           { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
                          paddingVertical: 7, paddingHorizontal: 9,
                          fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB',
                          height: 56 },

  // ── Info Alert ────────────────────────────────────────────────────────────
  infoAlert:            { backgroundColor: '#EAF4EE', borderLeftWidth: 3,
                          borderColor: '#1A6B3C', borderRadius: 8,
                          paddingVertical: 8, paddingHorizontal: 10,
                          marginTop: 16 },
  infoAlertText:        { fontSize: 10, color: '#0D4A28', lineHeight: 16 },

  // ── Error ─────────────────────────────────────────────────────────────────
  errorBox:             { backgroundColor: '#FEE2E2', borderLeftWidth: 3,
                          borderColor: '#DC2626', borderRadius: 8,
                          paddingVertical: 8, paddingHorizontal: 10,
                          marginTop: 8 },
  errorText:            { fontSize: 10, color: '#991B1B' },

  // ── Save Button ───────────────────────────────────────────────────────────
  saveBtn:              { minHeight: 48, backgroundColor: '#1A6B3C', borderRadius: 6,
                          justifyContent: 'center', alignItems: 'center',
                          marginTop: 16 },
  saveBtnDisabled:      { backgroundColor: '#9CA3AF' },
  saveBtnLabel:         { fontSize: 12, fontWeight: '700', color: '#fff' },

  // ── Date Modal (iOS) ──────────────────────────────────────────────────────
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dateModalSheet:       { backgroundColor: '#fff', borderTopLeftRadius: 16,
                          borderTopRightRadius: 16, paddingBottom: 24 },
  dateModalHeader:      { flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingHorizontal: 16, paddingVertical: 12,
                          borderBottomWidth: 1, borderColor: '#E5E7EB' },
  dateModalTitle:       { fontSize: 13, fontWeight: '600', color: '#111827' },
  dateModalDoneBtn:     { minHeight: 44, minWidth: 44, justifyContent: 'center',
                          alignItems: 'flex-end' },
  dateModalDoneLabel:   { fontSize: 13, fontWeight: '600', color: '#1A6B3C' },
  iosDatePicker:        { height: 200 },

  // ── Linked To Modal ───────────────────────────────────────────────────────
  linkedModalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 16,
                          borderTopRightRadius: 16, maxHeight: '60%' },
  linkedOption:         { flexDirection: 'row', alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12, paddingHorizontal: 16, minHeight: 48 },
  linkedOptionSelected: { backgroundColor: '#EAF4EE' },
  linkedOptionLabel:    { fontSize: 12, color: '#111827' },
  linkedOptionLabelSelected: { color: '#1A6B3C', fontWeight: '600' },
  linkedOptionCheck:    { fontSize: 14, color: '#1A6B3C', fontWeight: '700' },
  linkedSeparator:      { height: 1, backgroundColor: '#E5E7EB' },
  linkedEmpty:          { padding: 24, alignItems: 'center' },
  linkedEmptyText:      { fontSize: 12, color: '#6B7280' },
});
