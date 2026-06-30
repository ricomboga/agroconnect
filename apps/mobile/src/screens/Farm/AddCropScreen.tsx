import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { farmApi } from '../../api/farm';
import { useOfflineSync } from '../../hooks/useOfflineSync';

type Props = NativeStackScreenProps<FarmStackParamList, 'AddCropScreen'>;
type CropType = 'maize' | 'tomato' | 'beans' | 'cabbage' | 'potato' | 'other';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_PAD = 11;
const TILE_GAP = 5;
const TILE_SIZE = (SCREEN_WIDTH - CONTENT_PAD * 2 - TILE_GAP * 2) / 3;

interface CropSchedule {
  waterDays: number;
  weedDay: number;
  fertDay1: number;
  fertDay2: number | null;
  harvestDay: number;
}

const CROP_SCHEDULES: Record<CropType, CropSchedule> = {
  maize:   { waterDays: 3, weedDay: 42, fertDay1: 35, fertDay2: 63,   harvestDay: 105 },
  tomato:  { waterDays: 2, weedDay: 28, fertDay1: 21, fertDay2: 49,   harvestDay: 75  },
  beans:   { waterDays: 3, weedDay: 28, fertDay1: 21, fertDay2: null, harvestDay: 65  },
  cabbage: { waterDays: 2, weedDay: 21, fertDay1: 28, fertDay2: null, harvestDay: 90  },
  potato:  { waterDays: 3, weedDay: 35, fertDay1: 28, fertDay2: 56,   harvestDay: 90  },
  other:   { waterDays: 3, weedDay: 42, fertDay1: 35, fertDay2: null, harvestDay: 90  },
};

const CROP_OPTIONS: { value: CropType; icon: string; labelKey: string }[] = [
  { value: 'maize',   icon: '🌽', labelKey: 'crop.add.crops.maize'   },
  { value: 'tomato',  icon: '🍅', labelKey: 'crop.add.crops.tomato'  },
  { value: 'beans',   icon: '🫘', labelKey: 'crop.add.crops.beans'   },
  { value: 'cabbage', icon: '🥬', labelKey: 'crop.add.crops.cabbage' },
  { value: 'potato',  icon: '🥔', labelKey: 'crop.add.crops.potato'  },
  { value: 'other',   icon: '➕', labelKey: 'crop.add.crops.other'   },
];

const DOW_KEYS = ['crop.add.dateModal.su','crop.add.dateModal.mo','crop.add.dateModal.tu',
                  'crop.add.dateModal.we','crop.add.dateModal.th','crop.add.dateModal.fr',
                  'crop.add.dateModal.sa'];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function AlertBox({ variant, message }: { variant: 'green' | 'red'; message: string }) {
  const colors = variant === 'green'
    ? { bg: '#EAF4EE', border: '#1A6B3C', text: '#0D4A28' }
    : { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' };
  return (
    <View style={[styles.alertBox, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <Text style={[styles.alertText, { color: colors.text }]}>{message}</Text>
    </View>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} style={styles.topBarBack} accessibilityRole="button">
        <Text style={styles.topBarBackText}>←</Text>
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarSpacer} />
    </View>
  );
}

function StepDots() {
  return (
    <View style={styles.stepDots}>
      <View style={[styles.dot, styles.dotInactive]} />
      <View style={[styles.dot, styles.dotActive]} />
    </View>
  );
}

function DatePickerModal({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const initial = value ?? new Date();
  const [year, setYear]   = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay]     = useState<number | null>(value ? value.getDate() : null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow    = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setDay(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={cal.root}>
        <View style={cal.header}>
          <Text style={cal.headerTitle}>{t('crop.add.dateModal.title')}</Text>
          <Pressable onPress={onClose} style={cal.closeBtn} accessibilityRole="button">
            <Text style={cal.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={cal.monthNav}>
          <Pressable onPress={prevMonth} style={cal.navBtn} accessibilityRole="button">
            <Text style={cal.navText}>‹</Text>
          </Pressable>
          <Text style={cal.monthLabel}>
            {t(`activity.calendar.month.${month}`)} {year}
          </Text>
          <Pressable onPress={nextMonth} style={cal.navBtn} accessibilityRole="button">
            <Text style={cal.navText}>›</Text>
          </Pressable>
        </View>

        <View style={cal.dowRow}>
          {DOW_KEYS.map(k => (
            <Text key={k} style={cal.dowLabel}>{t(k)}</Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={cal.weekRow}>
            {week.map((d, di) => (
              <Pressable
                key={di}
                style={[cal.dayCell, d === day ? cal.dayCellSel : null]}
                onPress={() => d && setDay(d)}
                disabled={!d}
                accessibilityRole="button"
              >
                {d ? (
                  <Text style={[cal.dayText, d === day ? cal.dayTextSel : null]}>{d}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ))}

        <View style={cal.footer}>
          <Pressable style={cal.cancelBtn} onPress={onClose} accessibilityRole="button">
            <Text style={cal.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            style={[cal.selectBtn, !day ? cal.selectBtnDisabled : null]}
            onPress={() => day && onSelect(new Date(year, month, day))}
            disabled={!day}
            accessibilityRole="button"
          >
            <Text style={cal.selectText}>{t('crop.add.dateModal.select')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function AddCropScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { farmId } = route.params;
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();

  const [cropType, setCropType]           = useState<CropType | null>(null);
  const [variety, setVariety]             = useState('');
  const [plantingDate, setPlantingDate]   = useState<Date | null>(null);
  const [area, setArea]                   = useState('');
  const [plotNumber, setPlotNumber]       = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const canSubmit = cropType !== null && plantingDate !== null;

  const formatDateDisplay = (d: Date) => {
    const m = t(`activity.calendar.month.${d.getMonth()}`);
    return `📅 ${m} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const formatDateShort = (d: Date) => {
    const m = t(`activity.calendar.month.${d.getMonth()}`).slice(0, 3);
    return `${m} ${d.getDate()}`;
  };

  const aiPreview: string | null = (() => {
    if (!cropType || !plantingDate) return null;
    const s = CROP_SCHEDULES[cropType];
    const weedDate    = formatDateShort(addDays(plantingDate, s.weedDay));
    const weedWeek    = Math.round(s.weedDay / 7);
    const fert1       = formatDateShort(addDays(plantingDate, s.fertDay1));
    const harvestDate = formatDateShort(addDays(plantingDate, s.harvestDay));
    if (s.fertDay2 !== null) {
      const fert2 = formatDateShort(addDays(plantingDate, s.fertDay2));
      return t('crop.add.aiPreviewWith2Fert', { water: s.waterDays, weedDate, weedWeek, fert1, fert2, harvest: harvestDate });
    }
    return t('crop.add.aiPreviewWith1Fert', { water: s.waterDays, weedDate, weedWeek, fert1, harvest: harvestDate });
  })();

  const resetForm = () => {
    setCropType(null);
    setVariety('');
    setPlantingDate(null);
    setArea('');
    setPlotNumber('');
    setErrorMsg(null);
  };

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !cropType || !plantingDate) return;
    setSubmitting(true);
    setErrorMsg(null);
    const dto = {
      cropType,
      variety:      variety.trim() || undefined,
      plantingDate: plantingDate.toISOString().split('T')[0],
      areaAcres:    Number(area) || undefined,
      plotNumber:   plotNumber.trim() || undefined,
    };
    try {
      if (isOnline) {
        await farmApi.addCrop(farmId, dto);
        await queryClient.invalidateQueries({ queryKey: ['farms', farmId] });
        navigation.navigate('ActivityCalendar', { farmId });
      } else {
        queueWrite({
          id: `addcrop-${Date.now()}`,
          operation: 'CREATE',
          entity: 'crops',
          endpoint: `/farms/${farmId}/crops`,
          payload: JSON.stringify(dto),
          created_at: new Date().toISOString(),
          status: 'pending',
        });
        navigation.goBack();
      }
    } catch {
      setErrorMsg(t('crop.add.errorSave'));
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, cropType, plantingDate, variety, area, plotNumber, farmId, isOnline, queueWrite, queryClient, navigation, t]);

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
      <TopBar title={t('crop.add.topBarTitle')} onBack={() => navigation.goBack()} />
      <StepDots />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <AlertBox variant="green" message={t('crop.add.aiScheduleAlert')} />

          {errorMsg && <AlertBox variant="red" message={errorMsg} />}

          {/* Crop type grid */}
          <Text style={styles.label}>{t('crop.add.cropTypeLabel')}</Text>
          <View style={styles.cropGrid}>
            {CROP_OPTIONS.map(({ value, icon, labelKey }) => {
              const selected = cropType === value;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.cropTile,
                    { width: TILE_SIZE, height: TILE_SIZE },
                    selected ? styles.cropTileSelected : styles.cropTileDefault,
                  ]}
                  onPress={() => setCropType(value)}
                  accessibilityRole="button"
                >
                  <Text style={styles.cropTileIcon}>{icon}</Text>
                  <Text style={[styles.cropTileLabel, selected ? styles.cropTileLabelSel : styles.cropTileLabelDef]}>
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Variety */}
          <Text style={styles.label}>{t('crop.add.varietyLabel')}</Text>
          <TextInput
            style={styles.input}
            value={variety}
            onChangeText={setVariety}
            placeholder={t('crop.add.varietyPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />

          {/* Planting date + Area row */}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>{t('crop.add.plantingDateLabel')}</Text>
              <Pressable
                style={[styles.input, styles.dateTouchable]}
                onPress={() => setShowDateModal(true)}
                accessibilityRole="button"
              >
                <Text style={plantingDate ? styles.dateValue : styles.datePlaceholder}>
                  {plantingDate ? formatDateDisplay(plantingDate) : t('crop.add.plantingDatePlaceholder')}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.flex, styles.colRight]}>
              <Text style={styles.label}>{t('crop.add.areaLabel')}</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder={t('crop.add.areaPlaceholder')}
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* AI preview */}
          {aiPreview && <AlertBox variant="green" message={aiPreview} />}

          {/* Plot number */}
          <Text style={styles.label}>{t('crop.add.plotLabel')}</Text>
          <TextInput
            style={styles.input}
            value={plotNumber}
            onChangeText={setPlotNumber}
            placeholder={t('crop.add.plotPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />

          {/* Save */}
          <Pressable
            style={[styles.btn, styles.btnPrimary, (!canSubmit || submitting) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>{t('crop.add.saveCrop')}</Text>
            )}
          </Pressable>

          {/* Add another */}
          <Pressable
            style={[styles.btn, styles.btnOutline]}
            onPress={resetForm}
            accessibilityRole="button"
          >
            <Text style={styles.btnOutlineText}>{t('crop.add.addAnother')}</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDateModal}
        value={plantingDate}
        onSelect={(d) => { setPlantingDate(d); setShowDateModal(false); }}
        onClose={() => setShowDateModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  flex:    { flex: 1 },
  content: { padding: CONTENT_PAD, paddingBottom: 40 },

  topBar: {
    backgroundColor: '#1A6B3C',
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  topBarBack:     { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  topBarBackText: { fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 28 },
  topBarTitle:    { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff', textAlign: 'center' },
  topBarSpacer:   { minWidth: 44 },

  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotActive:  { backgroundColor: '#1A6B3C' },
  dotInactive:{ backgroundColor: '#E5E7EB' },

  alertBox: {
    borderLeftWidth: 3,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 12,
  },
  alertText: { fontSize: 9, lineHeight: 14 },

  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 2,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 10,
    minHeight: 36,
  },

  dateTouchable: { justifyContent: 'center' },
  dateValue:     { fontSize: 10, color: '#111827' },
  datePlaceholder:{ fontSize: 10, color: '#9CA3AF' },

  row:      { flexDirection: 'row', gap: 6 },
  colRight: { marginLeft: 0 },

  cropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    marginBottom: 10,
  },
  cropTile: {
    padding: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cropTileDefault:  { borderWidth: 1,   borderColor: '#E5E7EB', backgroundColor: '#fff'     },
  cropTileSelected: { borderWidth: 1.5, borderColor: '#1A6B3C', backgroundColor: '#EAF4EE' },
  cropTileIcon:     { fontSize: 22, marginBottom: 3 },
  cropTileLabel:    { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  cropTileLabelDef: { color: '#6B7280' },
  cropTileLabelSel: { color: '#1A6B3C' },

  btn: {
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnPrimary:     { backgroundColor: '#1A6B3C' },
  btnPrimaryText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  btnOutline:     { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#1A6B3C', marginTop: 8 },
  btnOutlineText: { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },
  btnDisabled:    { opacity: 0.45 },
});

const CAL_DAY = (SCREEN_WIDTH - 32) / 7; // modal has 16px horizontal padding each side

const cal = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#1A6B3C',
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  closeBtn:    { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  closeText:   { fontSize: 18, color: 'rgba(255,255,255,0.85)' },

  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navBtn:     { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  navText:    { fontSize: 22, color: '#1A6B3C', fontWeight: '600' },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },

  dowRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dowLabel: {
    width: CAL_DAY,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },

  weekRow: { flexDirection: 'row', paddingHorizontal: 16 },
  dayCell: {
    width: CAL_DAY,
    height: CAL_DAY,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CAL_DAY / 2,
  },
  dayCellSel: { backgroundColor: '#1A6B3C' },
  dayText:    { fontSize: 12, color: '#111827' },
  dayTextSel: { color: '#fff', fontWeight: '700' },

  footer: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 6,
  },
  cancelText: { fontSize: 10, fontWeight: '600', color: '#374151' },
  selectBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
  },
  selectBtnDisabled: { opacity: 0.4 },
  selectText:        { fontSize: 10, fontWeight: '600', color: '#fff' },
});
