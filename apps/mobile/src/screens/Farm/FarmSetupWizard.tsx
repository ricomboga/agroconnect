import React, { useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { farmApi, type CreateFarmDto } from '../../api/farm';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useLocation } from '../../hooks/useLocation';
import { WizardStep } from '../../components/Wizard/WizardStep';
import { WizardProgress } from '../../components/Wizard/WizardProgress';
import { KENYA_COUNTIES } from '../../constants/counties';
import { useUiStore } from '../../store/ui.store';

type Props = NativeStackScreenProps<FarmStackParamList, 'FarmSetupWizard'>;

const SOIL_TYPES = ['loam', 'clay', 'sandy', 'silt', 'peaty', 'chalky'] as const;
type AreaUnit = 'acres' | 'hectares';

const CROP_OPTIONS: { key: string; icon: string }[] = [
  { key: 'maize',   icon: '🌽' },
  { key: 'tomato',  icon: '🍅' },
  { key: 'beans',   icon: '🫘' },
  { key: 'potato',  icon: '🥔' },
  { key: 'tea',     icon: '🍃' },
  { key: 'coffee',  icon: '☕' },
  { key: 'avocado', icon: '🥑' },
  { key: 'other',   icon: '🌱' },
];

const TOTAL_STEPS = 4;

export function FarmSetupWizard({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((s) => s.showToast);
  const { coords, loading: gpsLoading, permissionDenied, requestLocation } = useLocation();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [name, setName] = useState('');
  const [county, setCounty] = useState('');
  // Step 2
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('acres');
  const [soilType, setSoilType] = useState('');
  // Step 4
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [plantingDate, setPlantingDate] = useState('');

  const toggleCrop = (key: string) => {
    setSelectedCrops((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const areaAcres = areaUnit === 'hectares' ? Number(area) * 2.471 : Number(area);

  const canAdvance = () => {
    if (step === 1) return name.trim().length > 0 && county.length > 0;
    if (step === 2) return Number(area) > 0;
    return true;
  };

  const next = () => { if (step < TOTAL_STEPS) setStep((s) => s + 1); };
  const back = () => { if (step > 1) setStep((s) => s - 1); };

  const submit = async () => {
    setSubmitting(true);
    const dto: CreateFarmDto = {
      name: name.trim(),
      county,
      areaAcres,
      soilType: soilType || undefined,
      gpsLat: coords?.latitude,
      gpsLng: coords?.longitude,
      firstCrop: selectedCrops.length > 0 ? selectedCrops.join(',') : undefined,
      plantingDate: plantingDate || undefined,
    };
    try {
      if (isOnline) {
        const res = await farmApi.create(dto);
        await queryClient.invalidateQueries({ queryKey: ['farms'] });
        navigation.replace('FarmProfile', { farmId: res.data.id });
        return;
      } else {
        queueWrite({
          id: `wizard-${Date.now()}`,
          operation: 'CREATE',
          entity: 'farms',
          endpoint: '/farms',
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
      <WizardProgress currentStep={step} totalSteps={TOTAL_STEPS} />

      {step === 1 && (
        <WizardStep title={t('wizard.step1.title')}>
          <Text style={styles.label}>{t('wizard.step1.name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('wizard.step1.name')}
          />
          <Text style={styles.label}>{t('wizard.step1.county')}</Text>
          <View style={styles.pickerList}>
            {KENYA_COUNTIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.chip, county === c && styles.chipSelected]}
                onPress={() => setCounty(c)}
              >
                <Text style={county === c ? styles.chipTextSelected : styles.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep title={t('wizard.step2.title')}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex]}
              value={area}
              onChangeText={setArea}
              keyboardType="decimal-pad"
              placeholder={t('wizard.step2.area')}
            />
            <Pressable
              style={styles.unitToggle}
              onPress={() => setAreaUnit((u) => u === 'acres' ? 'hectares' : 'acres')}
            >
              <Text style={styles.unitText}>
                {areaUnit === 'acres' ? t('wizard.step2.unit.acres') : t('wizard.step2.unit.ha')}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.label}>{t('wizard.step2.soilType')}</Text>
          <View style={styles.pickerList}>
            {SOIL_TYPES.map((s) => (
              <Pressable
                key={s}
                style={[styles.chip, soilType === s && styles.chipSelected]}
                onPress={() => setSoilType(s)}
              >
                <Text style={soilType === s ? styles.chipTextSelected : styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </WizardStep>
      )}

      {step === 3 && (
        <WizardStep title={t('wizard.step3.title')}>
          <Pressable style={styles.locationBtn} onPress={requestLocation} disabled={gpsLoading}>
            <Text style={styles.locationBtnText}>
              {gpsLoading ? '...' : t('wizard.step3.useLocation')}
            </Text>
          </Pressable>
          {permissionDenied && (
            <Text style={styles.warning}>{t('wizard.step3.noPermission')}</Text>
          )}
          {coords && (
            <View style={styles.mapContainer}>
              <Image
                source={{
                  uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${coords.latitude},${coords.longitude}&zoom=15&size=600x200&markers=${coords.latitude},${coords.longitude}`,
                }}
                style={styles.mapImage}
                resizeMode="cover"
              />
              <View style={styles.coordsBadge}>
                <Text style={styles.coordsText}>
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </Text>
              </View>
            </View>
          )}
        </WizardStep>
      )}

      {step === 4 && (
        <WizardStep title={t('wizard.step4.title')}>
          <Text style={styles.label}>{t('wizard.step4.crop')}</Text>
          <View style={styles.cropGrid}>
            {CROP_OPTIONS.map((crop) => {
              const selected = selectedCrops.includes(crop.key);
              return (
                <Pressable
                  key={crop.key}
                  style={[styles.cropTile, selected && styles.cropTileSelected]}
                  onPress={() => toggleCrop(crop.key)}
                >
                  <Text style={styles.cropIcon}>{crop.icon}</Text>
                  <Text style={[styles.cropLabel, selected && styles.cropLabelSelected]}>
                    {t(`wizard.step4.crops.${crop.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>{t('wizard.step4.plantingDate')}</Text>
          <TextInput
            style={styles.input}
            value={plantingDate}
            onChangeText={setPlantingDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
        </WizardStep>
      )}

      <View style={styles.footer}>
        {step > 1 && (
          <Pressable style={styles.footerBtn} onPress={back}>
            <Text style={styles.footerBtnText}>{t('wizard.common.back')}</Text>
          </Pressable>
        )}
        <View style={styles.flex} />
        {step < TOTAL_STEPS ? (
          <Pressable
            style={[styles.footerBtn, styles.footerBtnPrimary, !canAdvance() && styles.footerBtnDisabled]}
            onPress={next}
            disabled={!canAdvance()}
          >
            <Text style={styles.footerBtnTextPrimary}>{t('wizard.common.next')}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.footerBtn, styles.footerBtnPrimary]} onPress={submit} disabled={submitting}>
            <Text style={styles.footerBtnTextPrimary}>{t('wizard.common.submit')}</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  label: { fontSize: 14, color: '#555555', marginBottom: 6, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  pickerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
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
  chipText: { fontSize: 14, color: '#555555' },
  chipTextSelected: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  unitToggle: {
    minHeight: 48,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
  },
  unitText: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  locationBtn: {
    minHeight: 48,
    backgroundColor: '#1565C0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  locationBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  warning: { color: '#B00020', fontSize: 14, marginBottom: 12 },
  mapContainer: { height: 200, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  mapImage: { width: '100%', height: '100%' },
  coordsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coordsText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'monospace' },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  footerBtn: {
    minHeight: 48,
    minWidth: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  footerBtnPrimary: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  footerBtnDisabled: { opacity: 0.5 },
  footerBtnText: { fontSize: 16, color: '#555555', fontWeight: '600' },
  footerBtnTextPrimary: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  cropGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  cropTile: {
    width: '22%',
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  cropTileSelected: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  cropIcon: { fontSize: 28 },
  cropLabel: { fontSize: 11, color: '#555555', textAlign: 'center' },
  cropLabelSelected: { color: '#2E7D32', fontWeight: '700' },
});
