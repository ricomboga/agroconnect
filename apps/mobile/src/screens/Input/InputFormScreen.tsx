import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { inputApi, type InputType, type CreateInputDto } from '../../api/input';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { useUiStore } from '../../store/ui.store';

type Props = NativeStackScreenProps<FarmStackParamList, 'InputForm'>;

const INPUT_TYPES: InputType[] = [
  'seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other',
];

export function InputFormScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((s) => s.showToast);

  const [type, setType] = useState<InputType>('seed');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [appliedDate, setAppliedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = Number(quantity);
    const uc = Number(unitCost);
    if (q > 0 && uc > 0) {
      setTotalCost(String(Math.round(q * uc)));
    }
  }, [quantity, unitCost]);

  const submit = async () => {
    setSubmitting(true);
    const dto: CreateInputDto = {
      type,
      productName: productName.trim(),
      quantity: Number(quantity),
      unit: unit.trim(),
      unitCostKes: Number(unitCost),
      totalCostKes: Number(totalCost),
      appliedDate,
      notes: notes || undefined,
    };
    try {
      if (isOnline) {
        await inputApi.create(farmId, dto);
        await queryClient.invalidateQueries({ queryKey: ['inputs', farmId] });
      } else {
        queueWrite({
          id: `input-${Date.now()}`,
          operation: 'CREATE',
          entity: 'inputs',
          endpoint: `/farms/${farmId}/inputs`,
          payload: JSON.stringify(dto),
          created_at: new Date().toISOString(),
          status: 'pending',
        });
        showToast(t('common.savedOffline'), 'info');
      }
      navigation.goBack();
    } catch {
      showToast(t('common.error.loadFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = productName.trim() && quantity && unit && unitCost && appliedDate;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!isOnline && <OfflineBanner />}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>{t('input.form.type')}</Text>
        <View style={styles.chips}>
          {INPUT_TYPES.map((it) => (
            <Pressable
              key={it}
              style={[styles.chip, type === it && styles.chipSelected]}
              onPress={() => setType(it)}
            >
              <Text style={type === it ? styles.chipTextSelected : styles.chipText}>
                {t(`input.type.${it}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('input.form.productName')}</Text>
        <TextInput style={styles.input} value={productName} onChangeText={setProductName} />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('input.form.quantity')}</Text>
            <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.flex, styles.rowGap]}>
            <Text style={styles.label}>{t('input.form.unit')}</Text>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="kg" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('input.form.unitCost')}</Text>
            <TextInput style={styles.input} value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.flex, styles.rowGap]}>
            <Text style={styles.label}>{t('input.form.totalCost')}</Text>
            <TextInput style={styles.input} value={totalCost} onChangeText={setTotalCost} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={styles.label}>{t('input.form.appliedDate')}</Text>
        <TextInput style={styles.input} value={appliedDate} onChangeText={setAppliedDate} placeholder="YYYY-MM-DD" />

        <Text style={styles.label}>{t('input.form.notes')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable style={[styles.saveBtn, (!canSubmit || submitting) && styles.saveBtnDisabled]} onPress={submit} disabled={!canSubmit || submitting}>
          <Text style={styles.saveBtnText}>{t('input.form.save')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 16 },
  row: { flexDirection: 'row', gap: 8 },
  rowGap: { marginLeft: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#555555', marginBottom: 6, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#555555' },
  chipTextSelected: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  multiline: { minHeight: 80, paddingTop: 12 },
  saveBtn: {
    minHeight: 48,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
