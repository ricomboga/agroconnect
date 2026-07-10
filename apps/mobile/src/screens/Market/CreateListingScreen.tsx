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
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';
import { DatePickerField } from '../../components/ui/DatePickerField';
import { useFarms } from '../../hooks/useFarms';
import { marketApi, type QualityGrade } from '../../api/market';
import { useUiStore } from '../../store/ui.store';
import type { Farm } from '../../api/farm';
import type { MarketStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MarketStackParamList, 'CreateListing'>;

const GRADES: QualityGrade[] = ['A', 'B', 'C', 'reject'];

export function CreateListingScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const showToast = useUiStore((st) => st.showToast);
  const queryClient = useQueryClient();
  const farmsQuery = useFarms();
  const farms: Farm[] = farmsQuery.data?.data ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [farmId, setFarmId]     = useState('');
  const [farmName, setFarmName] = useState('');
  const [showFarmPicker, setShowFarmPicker] = useState(false);

  const [crop, setCrop]           = useState('');
  const [variety, setVariety]     = useState('');
  const [qtyText, setQtyText]     = useState('');
  const [priceText, setPriceText] = useState('');
  const [grade, setGrade]         = useState<QualityGrade>('A');
  const [availableFrom, setAvailableFrom] = useState(new Date());
  const [availableUntil, setAvailableUntil] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  );
  const [county, setCounty]       = useState('');
  const [showCountyPicker, setShowCountyPicker] = useState(false);
  const [locationDescription, setLocationDescription] = useState('');

  useEffect(() => {
    const first = farms[0];
    if (farms.length === 1 && !farmId && first) {
      setFarmId(first.id);
      setFarmName(first.name);
      setCounty(first.county);
    }
  }, [farms, farmId]);

  const qty   = parseFloat(qtyText) || 0;
  const price = parseFloat(priceText) || 0;
  const isValid =
    farmId.length > 0 &&
    crop.trim().length > 0 &&
    qty > 0 &&
    price > 0 &&
    county.length > 0 &&
    availableUntil >= availableFrom;

  const mutation = useMutation({
    mutationFn: () =>
      marketApi.listings.create({
        farmId,
        crop: crop.trim(),
        variety: variety.trim() || undefined,
        quantityKg: qty,
        askingPriceKes: price,
        qualityGrade: grade,
        availableFrom: availableFrom.toISOString().split('T')[0] as string,
        availableUntil: availableUntil.toISOString().split('T')[0] as string,
        locationCounty: county,
        locationDescription: locationDescription.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['market', 'listings'] });
      showToast(t('market.listing.create.successToast'), 'success');
      navigation.goBack();
    },
  });

  function selectFarm(farm: Farm) {
    setFarmId(farm.id);
    setFarmName(farm.name);
    setCounty(farm.county);
    setShowFarmPicker(false);
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('market.listing.create.title')}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={s.fieldLabel}>{t('market.listing.create.farmLabel')}</Text>
        <Pressable style={s.pickerBtn} onPress={() => setShowFarmPicker(true)} accessibilityRole="button">
          <Text style={farmId ? s.pickerBtnValue : s.pickerBtnPlaceholder}>
            {farmName || t('market.listing.create.farmPlaceholder')}
          </Text>
          <Text style={s.pickerChevron}>›</Text>
        </Pressable>

        <Text style={s.fieldLabel}>{t('market.listing.create.cropLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={crop}
          onChangeText={setCrop}
          placeholder={t('market.listing.create.cropPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={s.fieldLabel}>{t('market.listing.create.varietyLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={variety}
          onChangeText={setVariety}
          placeholder={t('market.listing.create.varietyPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        <View style={s.twoColRow}>
          <View style={s.twoColCell}>
            <Text style={s.fieldLabel}>{t('market.listing.create.qtyLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={qtyText}
              onChangeText={setQtyText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={s.twoColCell}>
            <Text style={s.fieldLabel}>{t('market.listing.create.priceLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <Text style={s.fieldLabel}>{t('market.listing.create.gradeLabel')}</Text>
        <View style={s.chipGrid}>
          {GRADES.map((g) => (
            <Pressable
              key={g}
              style={[s.chip, grade === g && s.chipActive]}
              onPress={() => setGrade(g)}
              accessibilityRole="radio"
              accessibilityState={{ checked: grade === g }}
            >
              <Text style={[s.chipLabel, grade === g && s.chipLabelActive]}>
                {t('market.listing.card.grade', { grade: g })}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.fieldLabel}>{t('market.listing.create.availableFromLabel')}</Text>
        <DatePickerField
          value={availableFrom}
          onChange={setAvailableFrom}
          maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
        />

        <Text style={s.fieldLabel}>{t('market.listing.create.availableUntilLabel')}</Text>
        <DatePickerField
          value={availableUntil}
          onChange={setAvailableUntil}
          minimumDate={availableFrom}
          maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
        />

        <Text style={s.fieldLabel}>{t('market.listing.create.countyLabel')}</Text>
        <Pressable style={s.pickerBtn} onPress={() => setShowCountyPicker(true)} accessibilityRole="button">
          <Text style={county ? s.pickerBtnValue : s.pickerBtnPlaceholder}>
            {county || t('market.listing.create.countyPlaceholder')}
          </Text>
          <Text style={s.pickerChevron}>›</Text>
        </Pressable>

        <Text style={s.fieldLabel}>{t('market.listing.create.locationDescLabel')}</Text>
        <TextInput
          style={[s.textInput, s.notesInput]}
          value={locationDescription}
          onChangeText={setLocationDescription}
          placeholder={t('market.listing.create.locationDescPlaceholder')}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        <Pressable
          style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {mutation.isPending ? t('market.listing.create.saving') : t('market.listing.create.saveBtn')}
          </Text>
        </Pressable>

        <View style={s.bottomPad} />
      </ScrollView>

      {/* Farm picker modal */}
      <Modal visible={showFarmPicker} animationType="slide" transparent onRequestClose={() => setShowFarmPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('market.listing.create.farmPickerTitle')}</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setShowFarmPicker(false)} accessibilityRole="button">
                <Text style={s.modalCloseLabel}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={farms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.optionRow, farmId === item.id && s.optionRowSelected]}
                  onPress={() => selectFarm(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: farmId === item.id }}
                >
                  <Text style={s.optionText}>{item.name}</Text>
                  {farmId === item.id && <Text style={s.optionCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* County picker modal */}
      <Modal visible={showCountyPicker} animationType="slide" transparent onRequestClose={() => setShowCountyPicker(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('market.listing.create.countyPickerTitle')}</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setShowCountyPicker(false)} accessibilityRole="button">
                <Text style={s.modalCloseLabel}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={KENYA_COUNTIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.optionRow, county === item && s.optionRowSelected]}
                  onPress={() => { setCounty(item); setShowCountyPicker(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: county === item }}
                >
                  <Text style={s.optionText}>{item}</Text>
                  {county === item && <Text style={s.optionCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  topArea: { backgroundColor: '#2E7D32' },
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
  fieldLabel: { fontSize: 9, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 36,
  },
  notesInput: { height: 56, textAlignVertical: 'top' },
  twoColRow:  { flexDirection: 'row', gap: 8 },
  twoColCell: { flex: 1 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 8, paddingHorizontal: 9, backgroundColor: '#F9FAFB', minHeight: 36,
  },
  pickerBtnValue:       { fontSize: 10, color: '#111827', flex: 1 },
  pickerBtnPlaceholder: { fontSize: 10, color: '#9CA3AF', flex: 1 },
  pickerChevron:        { fontSize: 16, color: '#9CA3AF', marginLeft: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#2E7D32', backgroundColor: '#fff',
  },
  chipActive:      { backgroundColor: '#2E7D32' },
  chipLabel:       { fontSize: 9, fontWeight: '600', color: '#2E7D32' },
  chipLabelActive: { color: '#fff' },
  saveBtn: {
    minHeight: 48, backgroundColor: '#2E7D32',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '70%', paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB',
  },
  modalTitle:      { fontSize: 12, fontWeight: '700', color: '#111827' },
  modalCloseBtn:   { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  modalCloseLabel: { fontSize: 16, color: '#6B7280' },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB', minHeight: 44,
  },
  optionRowSelected: { backgroundColor: '#EAF4EE' },
  optionText:  { fontSize: 11, color: '#111827' },
  optionCheck: { fontSize: 14, color: '#2E7D32', fontWeight: '700' },
});
