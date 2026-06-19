import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { harvestApi, type QualityGrade, type CreateHarvestDto } from '../../api/harvest';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { useUiStore } from '../../store/ui.store';

type Props = NativeStackScreenProps<FarmStackParamList, 'HarvestForm'>;

const GRADES: QualityGrade[] = ['A', 'B', 'C'];

export function HarvestFormScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((s) => s.showToast);

  const [crop, setCrop] = useState('');
  const [variety, setVariety] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [grade, setGrade] = useState<QualityGrade | ''>('');
  const [harvestDate, setHarvestDate] = useState('');
  const [storage, setStorage] = useState('');
  const [soldQty, setSoldQty] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [totalRevenue, setTotalRevenue] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = Number(soldQty);
    const p = Number(avgPrice);
    if (q > 0 && p > 0) {
      setTotalRevenue(String(Math.round(q * p)));
    }
  }, [soldQty, avgPrice]);

  const canSubmit = crop.trim() && quantityKg && harvestDate;

  const submit = async () => {
    setSubmitting(true);
    const dto: CreateHarvestDto = {
      crop: crop.trim(),
      variety: variety || undefined,
      quantityKg: Number(quantityKg),
      qualityGrade: (grade || undefined) as QualityGrade | undefined,
      harvestDate,
      storageLocation: storage || undefined,
      soldQuantityKg: soldQty ? Number(soldQty) : undefined,
      avgPriceKes: avgPrice ? Number(avgPrice) : undefined,
      totalRevenueKes: totalRevenue ? Number(totalRevenue) : undefined,
      notes: notes || undefined,
    };
    try {
      if (isOnline) {
        await harvestApi.create(farmId, dto);
        await queryClient.invalidateQueries({ queryKey: ['harvests', farmId] });
      } else {
        queueWrite({
          id: `harvest-${Date.now()}`,
          operation: 'CREATE',
          entity: 'harvests',
          endpoint: `/farms/${farmId}/harvests`,
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

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!isOnline && <OfflineBanner />}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>{t('harvest.form.crop')}</Text>
        <TextInput style={styles.input} value={crop} onChangeText={setCrop} />

        <Text style={styles.label}>{t('harvest.form.variety')}</Text>
        <TextInput style={styles.input} value={variety} onChangeText={setVariety} />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('harvest.form.quantity')}</Text>
            <TextInput style={styles.input} value={quantityKg} onChangeText={setQuantityKg} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.flex, styles.rowGap]}>
            <Text style={styles.label}>{t('harvest.form.harvestDate')}</Text>
            <TextInput style={styles.input} value={harvestDate} onChangeText={setHarvestDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <Text style={styles.label}>{t('harvest.form.grade.label')}</Text>
        <View style={styles.chips}>
          {GRADES.map((g) => (
            <Pressable
              key={g}
              style={[styles.chip, grade === g && styles.chipSelected]}
              onPress={() => setGrade(g)}
            >
              <Text style={grade === g ? styles.chipTextSelected : styles.chipText}>
                {t(`harvest.form.grade.${g}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t('harvest.form.storage')}</Text>
        <TextInput style={styles.input} value={storage} onChangeText={setStorage} />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('harvest.form.soldQty')}</Text>
            <TextInput style={styles.input} value={soldQty} onChangeText={setSoldQty} keyboardType="decimal-pad" />
          </View>
          <View style={[styles.flex, styles.rowGap]}>
            <Text style={styles.label}>{t('harvest.form.avgPrice')}</Text>
            <TextInput style={styles.input} value={avgPrice} onChangeText={setAvgPrice} keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={styles.label}>{t('harvest.form.totalRevenue')}</Text>
        <TextInput style={styles.input} value={totalRevenue} onChangeText={setTotalRevenue} keyboardType="decimal-pad" />

        <Text style={styles.label}>{t('harvest.form.notes')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable
          style={[styles.saveBtn, (!canSubmit || submitting) && styles.saveBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit || submitting}
        >
          <Text style={styles.saveBtnText}>{t('harvest.form.save')}</Text>
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
  chips: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: {
    minHeight: 48,
    minWidth: 56,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  chipText: { fontSize: 16, color: '#555555', fontWeight: '600' },
  chipTextSelected: { fontSize: 16, color: '#2E7D32', fontWeight: '700' },
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
