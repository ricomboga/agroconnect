import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { activityApi, type ActivityType, type CreateActivityDto } from '../../api/activity';
import { farmApi } from '../../api/farm';
import type { Farm, FarmPlot, FarmWorker } from '../../api/farm';
import { useFarms, useFarmWorkers } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import { useAuthStore } from '../../stores/authStore';
import { OfflineBanner } from '../../components/Common/OfflineBanner';

type Props = NativeStackScreenProps<FarmStackParamList, 'ActivityForm'>;

type UiActivityType =
  | 'watering' | 'spraying' | 'fertilising'
  | 'weeding' | 'planting' | 'harvesting'
  | 'vaccination' | 'deworming' | 'feeding';

const UI_TO_API: Record<UiActivityType, ActivityType> = {
  watering:    'irrigation',
  spraying:    'pesticide',
  fertilising: 'fertilising',
  weeding:     'weeding',
  planting:    'planting',
  harvesting:  'harvesting',
  vaccination: 'other',
  deworming:   'other',
  feeding:     'other',
};

const CROP_TILES: { value: UiActivityType; icon: string; tileKey: string }[] = [
  { value: 'watering',    icon: '💧', tileKey: 'activity.form.tile.watering'    },
  { value: 'spraying',    icon: '🌿', tileKey: 'activity.form.tile.spraying'    },
  { value: 'fertilising', icon: '🌾', tileKey: 'activity.form.tile.fertilising' },
  { value: 'weeding',     icon: '✂️', tileKey: 'activity.form.tile.weeding'     },
  { value: 'planting',    icon: '🌱', tileKey: 'activity.form.tile.planting'    },
  { value: 'harvesting',  icon: '🌽', tileKey: 'activity.form.tile.harvesting'  },
];

const ANIMAL_TILES: { value: UiActivityType; icon: string; tileKey: string }[] = [
  { value: 'vaccination', icon: '💉', tileKey: 'activity.form.tile.vaccination' },
  { value: 'deworming',   icon: '💊', tileKey: 'activity.form.tile.deworming'   },
  { value: 'feeding',     icon: '🐾', tileKey: 'activity.form.tile.feeding'     },
];

const ANIMAL_TYPE_KEYS = [
  'layers', 'dairyCattle', 'beefCattle', 'goats', 'sheep', 'pigs', 'rabbits',
] as const;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_PAD = 11;
const TILE_GAP = 5;
const TILE_WIDTH = (SCREEN_WIDTH - CONTENT_PAD * 2 - TILE_GAP * 2) / 3;
const CAL_DAY = (SCREEN_WIDTH - 32) / 7;

const DOW_KEYS = [
  'crop.add.dateModal.su', 'crop.add.dateModal.mo', 'crop.add.dateModal.tu',
  'crop.add.dateModal.we', 'crop.add.dateModal.th', 'crop.add.dateModal.fr',
  'crop.add.dateModal.sa',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDow(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function DatePickerModal({
  visible, value, onSelect, onClose,
}: {
  visible: boolean; value: Date; onSelect: (d: Date) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day, setDay] = useState<number | null>(value.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDow(year, month);
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
          <Text style={cal.monthLabel}>{t(`activity.calendar.month.${month}`)} {year}</Text>
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
                {d ? <Text style={[cal.dayText, d === day ? cal.dayTextSel : null]}>{d}</Text> : null}
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

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function TimePickerModal({
  visible, value, onSelect, onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [hour, setHour] = useState(value.split(':')[0] ?? '08');
  const [minute, setMinute] = useState(value.split(':')[1] ?? '00');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pkr.root}>
        <View style={pkr.header}>
          <Text style={pkr.headerTitle}>{t('activity.form.timePickerTitle')}</Text>
          <Pressable onPress={onClose} style={pkr.closeBtn} accessibilityRole="button">
            <Text style={pkr.closeText}>✕</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              {t('activity.form.timePickerHour')}
            </Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {HOURS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setHour(h)}
                  style={[pkr.item, h === hour && { backgroundColor: '#EAF4EE' }]}
                  accessibilityRole="button"
                >
                  <Text style={[pkr.itemText, h === hour && { color: '#1A6B3C', fontWeight: '700' }]}>{h}:00</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
              {t('activity.form.timePickerMinute')}
            </Text>
            {MINUTES.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMinute(m)}
                style={[pkr.item, m === minute && { backgroundColor: '#EAF4EE' }]}
                accessibilityRole="button"
              >
                <Text style={[pkr.itemText, m === minute && { color: '#1A6B3C', fontWeight: '700' }]}>:{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={cal.footer}>
          <Pressable style={cal.cancelBtn} onPress={onClose} accessibilityRole="button">
            <Text style={cal.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
          <Pressable
            style={cal.selectBtn}
            onPress={() => onSelect(`${hour}:${minute}`)}
            accessibilityRole="button"
          >
            <Text style={cal.selectText}>{t('activity.form.timePickerConfirm')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ListPickerModal({
  visible, title, items, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  items: { id: string; label: string }[];
  onSelect: (id: string, label: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={pkr.root}>
        <View style={pkr.header}>
          <Text style={pkr.headerTitle}>{title}</Text>
          <Pressable onPress={onClose} style={pkr.closeBtn} accessibilityRole="button">
            <Text style={pkr.closeText}>✕</Text>
          </Pressable>
        </View>
        <ScrollView>
          {items.map((item, idx) => (
            <Pressable
              key={item.id}
              style={[pkr.item, idx > 0 && pkr.itemBorder]}
              onPress={() => { onSelect(item.id, item.label); onClose(); }}
              accessibilityRole="button"
            >
              <Text style={pkr.itemText}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function AlertBox({ variant, message }: { variant: 'green' | 'red'; message: string }) {
  const colors = variant === 'green'
    ? { bg: '#EAF4EE', border: '#1A6B3C', text: '#0D4A28' }
    : { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' };
  return (
    <View style={[s.alertBox, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <Text style={[s.alertText, { color: colors.text }]}>{message}</Text>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

export function ActivityFormScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore(st => st.showToast);

  const { farmId: prefillFarmId, activityType: prefillType, cropName: prefillCrop, streak = 0 } = route.params ?? {};
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role !== 'farm_worker';

  const [selectedFarmId, setSelectedFarmId] = useState<string | undefined>(prefillFarmId);
  const [selectedFarmName, setSelectedFarmName] = useState<string>('');
  const [activityType, setActivityType] = useState<UiActivityType | null>(
    (prefillType as UiActivityType | undefined) ?? null,
  );
  const [cropOrAnimal, setCropOrAnimal] = useState<string>(prefillCrop ?? '');
  const [selectedPlotId, setSelectedPlotId] = useState<string | undefined>();
  const [date, setDate] = useState<Date>(new Date());
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [labourCostKes, setLabourCostKes] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | undefined>();
  const [assignedWorkerName, setAssignedWorkerName] = useState<string>('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFarmPicker, setShowFarmPicker] = useState(false);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { data: farmsData, isLoading: farmsLoading, isError: farmsError, refetch: farmsRefetch } = useFarms();
  const { data: workersData } = useFarmWorkers(selectedFarmId ?? '');

  const { data: selectedFarm, isLoading: farmDetailLoading } = useQuery({
    queryKey: ['farm', selectedFarmId],
    queryFn: () => farmApi.get(selectedFarmId!),
    enabled: !!selectedFarmId,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    select: res => res.data,
  });

  useEffect(() => {
    if (selectedFarm?.name && !selectedFarmName) {
      setSelectedFarmName(selectedFarm.name);
    }
  }, [selectedFarm, selectedFarmName]);

  const farmItems = useMemo(() => {
    return (farmsData?.data ?? []).map((f: Farm) => ({ id: f.id, label: f.name }));
  }, [farmsData]);

  const workerItems = useMemo(() => {
    return (workersData?.data ?? []).map((w: FarmWorker) => ({ id: w.userId, label: w.fullName }));
  }, [workersData]);

  const cropAnimalItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (selectedFarm) {
      selectedFarm.plots.forEach((p: FarmPlot) => {
        if (p.cropType) items.push({ id: p.id, label: `${p.cropType}${p.name ? ` (${p.name})` : ''}` });
      });
      const ft = selectedFarm.farmType;
      if (ft === 'animal' || ft === 'both' || selectedFarm.plots.length === 0) {
        ANIMAL_TYPE_KEYS.forEach(k => items.push({ id: `animal_${k}`, label: t(`activity.form.animalType.${k}`) }));
      }
    }
    return items;
  }, [selectedFarm, t]);

  const showAnimalTiles = useMemo(() => {
    if (!selectedFarm) return false;
    const ft = selectedFarm.farmType;
    return ft === 'animal' || ft === 'both' || selectedFarm.plots.length === 0;
  }, [selectedFarm]);

  const formatDate = (d: Date) => {
    const m = t(`activity.calendar.month.${d.getMonth()}`);
    return `📅 ${m} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const canSubmit = activityType !== null && !!selectedFarmId && !!cropOrAnimal && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !activityType || !selectedFarmId) return;
    setSubmitting(true);
    setErrorMsg(null);

    const isAnimal = ['vaccination', 'deworming', 'feeding'].includes(activityType);
    const titleParts = [t(`activity.form.tile.${activityType}`)];
    if (cropOrAnimal) titleParts.push(cropOrAnimal);

    const dto: CreateActivityDto = {
      type: UI_TO_API[activityType],
      title: titleParts.join(' – '),
      description: notes.trim() || undefined,
      scheduledDate: date.toISOString().split('T')[0] as string,
      scheduledTime: scheduledTime || undefined,
      plotId: selectedPlotId,
      labourCostKes: labourCostKes ? Number(labourCostKes) : undefined,
      assignedToWorkerId: assignedWorkerId,
    };

    try {
      if (isOnline) {
        await activityApi.create(selectedFarmId, dto);
        await queryClient.invalidateQueries({ queryKey: ['farms'] });
        await queryClient.invalidateQueries({ queryKey: ['activities', selectedFarmId] });
      } else {
        await queueWrite({
          operation: 'CREATE',
          entity: 'activities',
          endpoint: `/farms/${selectedFarmId}/activities`,
          payload: JSON.stringify(dto),
        });
      }
      const newStreak = streak + 1;
      showToast(t('activity.form.successToast', { streak: newStreak }), 'success');
      navigation.goBack();
    } catch {
      setErrorMsg(t('activity.form.errorSave'));
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit, activityType, selectedFarmId, cropOrAnimal, notes, date,
    selectedPlotId, labourCostKes, isOnline, queueWrite, queryClient,
    navigation, showToast, streak, t,
  ]);

  const renderTile = (tile: { value: UiActivityType; icon: string; tileKey: string }) => {
    const selected = activityType === tile.value;
    return (
      <Pressable
        key={tile.value}
        style={[s.tile, { width: TILE_WIDTH, height: TILE_WIDTH }, selected ? s.tileSelected : s.tileDefault]}
        onPress={() => setActivityType(tile.value)}
        accessibilityRole="button"
      >
        <Text style={s.tileIcon}>{tile.icon}</Text>
        <Text style={[s.tileLabel, selected ? s.tileLabelSel : s.tileLabelDef]}>{t(tile.tileKey)}</Text>
      </Pressable>
    );
  };

  if (farmsLoading) {
    return (
      <View style={s.root}>
        <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.topBarBack} accessibilityRole="button">
            <Text style={s.topBarBackText}>←</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('activity.form.topBarTitle')}</Text>
          <View style={s.topBarSpacer} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1A6B3C" />
        </View>
      </View>
    );
  }

  if (farmsError) {
    return (
      <View style={s.root}>
        <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.topBarBack} accessibilityRole="button">
            <Text style={s.topBarBackText}>←</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('activity.form.topBarTitle')}</Text>
          <View style={s.topBarSpacer} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => farmsRefetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!farmsLoading && farmItems.length === 0) {
    return (
      <View style={s.root}>
        <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.topBarBack} accessibilityRole="button">
            <Text style={s.topBarBackText}>←</Text>
          </Pressable>
          <Text style={s.topBarTitle}>{t('activity.form.topBarTitle')}</Text>
          <View style={s.topBarSpacer} />
        </View>
        <View style={s.center}>
          <Text style={s.emptyTitle}>{t('farm.list.empty.webTitle')}</Text>
          <Text style={s.emptyBody}>{t('farm.list.empty.webBody')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.topBarBack} accessibilityRole="button">
          <Text style={s.topBarBackText}>←</Text>
        </Pressable>
        <Text style={s.topBarTitle}>{t('activity.form.topBarTitle')}</Text>
        <View style={s.topBarSpacer} />
      </View>

      {!isOnline && <OfflineBanner />}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {streak >= 2 && (
            <AlertBox
              variant="green"
              message={t('activity.form.streakAlert', { streak })}
            />
          )}

          {errorMsg && <AlertBox variant="red" message={errorMsg} />}

          {/* Activity type grid */}
          <SectionLabel label={t('activity.form.activityTypeSection')} />
          <View style={s.tileGrid}>
            {CROP_TILES.map(renderTile)}
          </View>
          {showAnimalTiles && (
            <View style={s.tileGrid}>
              {ANIMAL_TILES.map(renderTile)}
            </View>
          )}

          {/* Farm picker */}
          <SectionLabel label={t('activity.form.detailsSection')} />
          <Text style={s.label}>{t('activity.form.farmLabel')}</Text>
          <Pressable
            style={[s.input, s.inputTouchable, !!prefillFarmId && s.inputDisabled]}
            onPress={() => !prefillFarmId && setShowFarmPicker(true)}
            accessibilityRole="button"
            disabled={!!prefillFarmId}
          >
            <Text style={selectedFarmId ? s.inputValue : s.inputPlaceholder}>
              {selectedFarmId ? (selectedFarmName || t('activity.form.farmPlaceholder')) : t('activity.form.farmPlaceholder')}
            </Text>
          </Pressable>

          {/* Crop / Animal picker */}
          <Text style={s.label}>{t('activity.form.cropAnimalLabel')}</Text>
          <Pressable
            style={[s.input, s.inputTouchable, (!selectedFarmId || farmDetailLoading) && s.inputDisabled]}
            onPress={() => selectedFarmId && !farmDetailLoading && setShowCropPicker(true)}
            accessibilityRole="button"
            disabled={!selectedFarmId || farmDetailLoading}
          >
            <Text style={cropOrAnimal ? s.inputValue : s.inputPlaceholder}>
              {farmDetailLoading
                ? t('common.loading')
                : (cropOrAnimal || t('activity.form.cropAnimalPlaceholder'))}
            </Text>
          </Pressable>

          {/* Date + Time row */}
          <View style={s.row}>
            <View style={s.flex}>
              <Text style={s.label}>{t('activity.form.dateLabel')}</Text>
              <Pressable
                style={[s.input, s.inputTouchable]}
                onPress={() => setShowDateModal(true)}
                accessibilityRole="button"
              >
                <Text style={s.inputValue}>{formatDate(date)}</Text>
              </Pressable>
            </View>
            <View style={[s.flex, { marginLeft: TILE_GAP }]}>
              <Text style={s.label}>{t('activity.form.timeLabel')}</Text>
              <Pressable
                style={[s.input, s.inputTouchable]}
                onPress={() => setShowTimePicker(true)}
                accessibilityRole="button"
              >
                <Text style={scheduledTime ? s.inputValue : s.inputPlaceholder}>
                  {scheduledTime || t('activity.form.timePlaceholder')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Labour cost */}
          <Text style={s.label}>{t('activity.form.labourCost')}</Text>
          <TextInput
            style={s.input}
            value={labourCostKes}
            onChangeText={setLabourCostKes}
            placeholder={t('activity.form.labourCostPlaceholder')}
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />

          {/* Assign worker — owner/supervisor only */}
          {canManage && workerItems.length > 0 && (
            <>
              <Text style={s.label}>{t('activity.form.assignWorker')}</Text>
              <Pressable
                style={[s.input, s.inputTouchable, !selectedFarmId && s.inputDisabled]}
                onPress={() => selectedFarmId && setShowWorkerPicker(true)}
                accessibilityRole="button"
                disabled={!selectedFarmId}
              >
                <Text style={assignedWorkerId ? s.inputValue : s.inputPlaceholder}>
                  {assignedWorkerId ? assignedWorkerName : t('activity.form.assignWorkerPlaceholder')}
                </Text>
              </Pressable>
            </>
          )}

          {/* Notes */}
          <Text style={s.label}>{t('activity.form.notesLabel')}</Text>
          <TextInput
            style={[s.input, s.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('activity.form.notesPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          {/* Save button */}
          <Pressable
            style={[s.saveBtn, (!canSubmit) && s.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{t('activity.form.saveBtn')}</Text>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDateModal}
        value={date}
        onSelect={d => { setDate(d); setShowDateModal(false); }}
        onClose={() => setShowDateModal(false)}
      />

      <TimePickerModal
        visible={showTimePicker}
        value={scheduledTime}
        onSelect={(t) => { setScheduledTime(t); setShowTimePicker(false); }}
        onClose={() => setShowTimePicker(false)}
      />

      <ListPickerModal
        visible={showFarmPicker}
        title={t('activity.form.farmPickerTitle')}
        items={farmItems}
        onSelect={(id, label) => {
          setSelectedFarmId(id);
          setSelectedFarmName(label);
          setCropOrAnimal('');
          setSelectedPlotId(undefined);
          setAssignedWorkerId(undefined);
          setAssignedWorkerName('');
        }}
        onClose={() => setShowFarmPicker(false)}
      />

      <ListPickerModal
        visible={showCropPicker}
        title={t('activity.form.cropPickerTitle')}
        items={cropAnimalItems}
        onSelect={(id, label) => {
          setCropOrAnimal(label);
          setSelectedPlotId(id.startsWith('animal_') ? undefined : id);
        }}
        onClose={() => setShowCropPicker(false)}
      />

      <ListPickerModal
        visible={showWorkerPicker}
        title={t('activity.form.workerPickerTitle')}
        items={[{ id: '__none', label: t('activity.form.assignWorkerNone') }, ...workerItems]}
        onSelect={(id, label) => {
          if (id === '__none') {
            setAssignedWorkerId(undefined);
            setAssignedWorkerName('');
          } else {
            setAssignedWorkerId(id);
            setAssignedWorkerName(label);
          }
        }}
        onClose={() => setShowWorkerPicker(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 12, color: '#374151', marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    minHeight: 44, paddingHorizontal: 20,
    backgroundColor: '#1A6B3C', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  retryText:  { fontSize: 10, fontWeight: '600', color: '#fff' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6, textAlign: 'center' },
  emptyBody:  { fontSize: 10, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
  emptyBtn: {
    minHeight: 44, paddingHorizontal: 20,
    backgroundColor: '#1A6B3C', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnText: { fontSize: 10, fontWeight: '600', color: '#fff' },

  alertBox: {
    borderLeftWidth: 3,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 10,
  },
  alertText: { fontSize: 9, lineHeight: 14 },

  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 5,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    marginBottom: 4,
  },
  tile: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDefault:  { borderWidth: 1,   borderColor: '#E5E7EB', backgroundColor: '#fff'     },
  tileSelected: { borderWidth: 1.5, borderColor: '#1A6B3C', backgroundColor: '#EAF4EE' },
  tileIcon:     { fontSize: 20, marginBottom: 3 },
  tileLabel:    { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  tileLabelDef: { color: '#6B7280' },
  tileLabelSel: { color: '#1A6B3C' },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 2,
    minHeight: 36,
  },
  inputTouchable:   { justifyContent: 'center' },
  inputDisabled:    { opacity: 0.5 },
  inputValue:       { fontSize: 10, color: '#111827' },
  inputPlaceholder: { fontSize: 10, color: '#9CA3AF' },

  notesInput: { height: 60, paddingTop: 7 },

  row: { flexDirection: 'row' },

  saveBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText:     { fontSize: 10, fontWeight: '600', color: '#fff' },
});

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
  closeBtn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: 'rgba(255,255,255,0.85)' },
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
  weekRow:    { flexDirection: 'row', paddingHorizontal: 16 },
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
    flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 6,
  },
  cancelText:        { fontSize: 10, fontWeight: '600', color: '#374151' },
  selectBtn: {
    flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A6B3C', borderRadius: 6,
  },
  selectBtnDisabled: { opacity: 0.4 },
  selectText:        { fontSize: 10, fontWeight: '600', color: '#fff' },
});

const pkr = StyleSheet.create({
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
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  itemBorder: { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  itemText:   { fontSize: 13, color: '#111827' },
});
