import React, { useLayoutEffect, useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';
import { useFarm, useUpdateFarm } from '../../hooks/useFarms';
import { useUiStore } from '../../store/ui.store';
import type { FarmStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FarmStackParamList, 'EditFarmScreen'>;

type SoilType = 'clay' | 'loam' | 'sandy' | 'silty' | 'peaty' | 'chalky';
const SOIL_TYPES: SoilType[] = ['clay', 'loam', 'sandy', 'silty', 'peaty', 'chalky'];

type WaterSource = 'rain' | 'irrigation' | 'borehole' | 'river' | 'mixed';
const WATER_SOURCES: WaterSource[] = ['rain', 'irrigation', 'borehole', 'river', 'mixed'];

export function EditFarmScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const showToast = useUiStore((st) => st.showToast);
  const farmQuery = useFarm(farmId);
  const mutation = useUpdateFarm(farmId);
  const farm = farmQuery.data;

  const [name, setName]           = useState(farm?.name ?? '');
  const [county, setCounty]       = useState(farm?.county ?? '');
  const [subCounty, setSubCounty] = useState(farm?.subCounty ?? '');
  const [areaText, setAreaText]   = useState(farm ? String(farm.areaAcres) : '');
  const [soilType, setSoilType]   = useState<SoilType | ''>((farm?.soilType as SoilType) ?? '');
  const [waterSource, setWaterSource] = useState<WaterSource | ''>((farm?.waterSource as WaterSource) ?? '');
  const [showCountyPicker, setShowCountyPicker] = useState(false);
  const [hydrated, setHydrated]   = useState(false);

  // Hydrate local form state once the farm loads (screen mounts before the query resolves)
  if (!hydrated && farm) {
    setName(farm.name);
    setCounty(farm.county);
    setSubCounty(farm.subCounty ?? '');
    setAreaText(String(farm.areaAcres));
    setSoilType((farm.soilType as SoilType) ?? '');
    setWaterSource((farm.waterSource as WaterSource) ?? '');
    setHydrated(true);
  }

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const area = parseFloat(areaText) || 0;
  const isValid = name.trim().length > 0 && county.length > 0 && area > 0;

  async function handleSave() {
    if (!isValid) return;
    mutation.mutate(
      {
        name: name.trim(),
        county,
        subCounty: subCounty.trim() || undefined,
        areaAcres: area,
        soilType: soilType || undefined,
        waterSource: waterSource || undefined,
      },
      {
        onSuccess: () => {
          showToast(t('farm.editFarm.successToast'), 'success');
          navigation.goBack();
        },
      },
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A6B3C" />
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('farm.editFarm.title')}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={s.fieldLabel}>{t('farm.editFarm.nameLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={name}
          onChangeText={setName}
          placeholder={t('farm.editFarm.namePlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={s.fieldLabel}>{t('farm.editFarm.countyLabel')}</Text>
        <Pressable style={s.pickerBtn} onPress={() => setShowCountyPicker(true)} accessibilityRole="button">
          <Text style={county ? s.pickerBtnValue : s.pickerBtnPlaceholder}>
            {county || t('farm.editFarm.countyPlaceholder')}
          </Text>
          <Text style={s.pickerChevron}>›</Text>
        </Pressable>

        <Text style={s.fieldLabel}>{t('farm.editFarm.subCountyLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={subCounty}
          onChangeText={setSubCounty}
          placeholder={t('farm.editFarm.subCountyPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={s.fieldLabel}>{t('farm.editFarm.areaLabel')}</Text>
        <TextInput
          style={s.textInput}
          value={areaText}
          onChangeText={setAreaText}
          keyboardType="decimal-pad"
          placeholder={t('farm.editFarm.areaPlaceholder')}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={s.fieldLabel}>{t('farm.editFarm.soilLabel')}</Text>
        <View style={s.chipGrid}>
          {SOIL_TYPES.map((soil) => (
            <Pressable
              key={soil}
              style={[s.chip, soilType === soil && s.chipActive]}
              onPress={() => setSoilType(soilType === soil ? '' : soil)}
              accessibilityRole="radio"
              accessibilityState={{ checked: soilType === soil }}
            >
              <Text style={[s.chipLabel, soilType === soil && s.chipLabelActive]}>
                {t(`farm.editFarm.soil.${soil}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.fieldLabel}>{t('farm.editFarm.waterLabel')}</Text>
        <View style={s.chipGrid}>
          {WATER_SOURCES.map((water) => (
            <Pressable
              key={water}
              style={[s.chip, waterSource === water && s.chipActive]}
              onPress={() => setWaterSource(waterSource === water ? '' : water)}
              accessibilityRole="radio"
              accessibilityState={{ checked: waterSource === water }}
            >
              <Text style={[s.chipLabel, waterSource === water && s.chipLabelActive]}>
                {t(`farm.editFarm.water.${water}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[s.saveBtn, (!isValid || mutation.isPending) && s.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={!isValid || mutation.isPending}
          accessibilityRole="button"
        >
          <Text style={s.saveBtnLabel}>
            {mutation.isPending ? t('farm.editFarm.saving') : t('farm.editFarm.saveBtn')}
          </Text>
        </Pressable>

        <View style={s.bottomPad} />
      </ScrollView>

      {/* County picker modal */}
      <Modal
        visible={showCountyPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCountyPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('farm.editFarm.countyPickerTitle')}</Text>
              <Pressable
                style={s.modalCloseBtn}
                onPress={() => setShowCountyPicker(false)}
                accessibilityRole="button"
              >
                <Text style={s.modalCloseLabel}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={KENYA_COUNTIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.countyOption, county === item && s.countyOptionSelected]}
                  onPress={() => {
                    setCounty(item);
                    setShowCountyPicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: county === item }}
                >
                  <Text style={s.countyOptionName}>{item}</Text>
                  {county === item && <Text style={s.countyOptionCheck}>✓</Text>}
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
  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12,
  },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 5,
    paddingVertical: 7, paddingHorizontal: 9,
    fontSize: 10, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 36,
  },
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
    borderWidth: 1, borderColor: '#1A6B3C', backgroundColor: '#fff',
  },
  chipActive:      { backgroundColor: '#1A6B3C' },
  chipLabel:       { fontSize: 9, fontWeight: '600', color: '#1A6B3C' },
  chipLabelActive: { color: '#fff' },
  saveBtn: {
    minHeight: 48, backgroundColor: '#1A6B3C',
    borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnLabel:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  bottomPad: { height: 20 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
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
  countyOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB', minHeight: 44,
  },
  countyOptionSelected: { backgroundColor: '#EAF4EE' },
  countyOptionName:     { fontSize: 11, color: '#111827' },
  countyOptionCheck:    { fontSize: 14, color: '#1A6B3C', fontWeight: '700' },
});
