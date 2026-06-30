import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { activityApi, type Activity, type ActivityDetail } from '../../api/activity';
import { farmApi, type FarmWorker } from '../../api/farm';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUiStore } from '../../store/ui.store';
import { useAuthStore } from '../../stores/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<FarmStackParamList, 'ActivityLogModal'>;

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVITY_EMOJI: Record<string, string> = {
  planting:    '🌱',
  irrigation:  '💧',
  fertilising: '🌾',
  pesticide:   '🌿',
  harvesting:  '🌽',
  weeding:     '✂️',
  other:       '📋',
};

const { width: SW } = Dimensions.get('window');
const CAL_DAY = (SW - 32) / 7;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayDate(d: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `📅 ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeCurrentStreak(activities: Activity[]): number {
  const doneDays = new Set(
    activities
      .filter((a) => a.status === 'completed' && a.completedDate != null)
      .map((a) => a.completedDate!.slice(0, 10)),
  );
  let streak = 0;
  const cursor = new Date();
  while (doneDays.has(toIsoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y: number, m: number)    { return new Date(y, m, 1).getDay(); }

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return <Text style={s.label}>{label}</Text>;
}

function AlertBox({ message }: { message: string }) {
  return (
    <View style={s.alertBox}>
      <Text style={s.alertText}>{message}</Text>
    </View>
  );
}

function MiniCalendar({
  visible, value, onSelect, onClose,
}: {
  visible: boolean; value: Date; onSelect: (d: Date) => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [year, setYear]   = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day, setDay]     = useState<number | null>(value.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow    = getFirstDow(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setDay(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={cal.root}>
        <View style={cal.header}>
          <Pressable onPress={prevMonth} style={cal.navBtn} accessibilityRole="button">
            <Text style={cal.navText}>‹</Text>
          </Pressable>
          <Text style={cal.monthLabel}>
            {['January','February','March','April','May','June','July','August','September','October','November','December'][month]} {year}
          </Text>
          <Pressable onPress={nextMonth} style={cal.navBtn} accessibilityRole="button">
            <Text style={cal.navText}>›</Text>
          </Pressable>
        </View>
        <View style={cal.dowRow}>
          {DOW.map((d) => <Text key={d} style={cal.dowLabel}>{d}</Text>)}
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
            style={[cal.confirmBtn, !day && cal.confirmBtnDisabled]}
            onPress={() => day && onSelect(new Date(year, month, day))}
            disabled={!day}
            accessibilityRole="button"
          >
            <Text style={cal.confirmText}>{t('activity.log.datePickerSelect')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WorkerPickerModal({
  visible, title, workers, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  workers: FarmWorker[];
  onSelect: (id: string | null, name: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
          <Pressable
            style={pkr.item}
            onPress={() => { onSelect(null, t('activity.log.unassigned')); onClose(); }}
            accessibilityRole="button"
          >
            <Text style={pkr.itemText}>{t('activity.log.unassigned')}</Text>
          </Pressable>
          {workers.map((w, idx) => (
            <Pressable
              key={w.userId}
              style={[pkr.item, idx >= 0 && pkr.itemBorder]}
              onPress={() => { onSelect(w.userId, w.fullName); onClose(); }}
              accessibilityRole="button"
            >
              <Text style={pkr.itemText}>{w.fullName}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ActivityLogModal({ navigation, route }: Props) {
  const { farmId, activityId } = route.params;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((st) => st.showToast);
  const user = useAuthStore((s) => s.user);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [completedDate, setCompletedDate]           = useState<Date>(new Date());
  const [labourCostKes, setLabourCostKes]           = useState('0');
  const [notes, setNotes]                           = useState('');
  const [assignedToWorkerId, setAssignedToWorkerId] = useState<string | null>(null);
  const [assignedWorkerName, setAssignedWorkerName] = useState('');
  const [showDatePicker, setShowDatePicker]         = useState(false);
  const [showWorkerPicker, setShowWorkerPicker]     = useState(false);
  const [submitting, setSubmitting]                 = useState(false);
  const [errorMsg, setErrorMsg]                     = useState<string | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  const activityQ = useQuery({
    queryKey: ['activity', farmId, activityId],
    queryFn: () => activityApi.get(farmId, activityId),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    select: (res) => res.data,
  });

  const workersQ = useQuery({
    queryKey: ['farms/workers', farmId],
    queryFn: () => farmApi.workers(farmId),
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    enabled: !!farmId,
    select: (res) => res.data,
  });

  const streakQ = useQuery({
    queryKey: ['activities', farmId, 'streak'],
    queryFn: () => activityApi.list(farmId, { pageSize: 100 }),
    staleTime: isOnline ? 2 * 60 * 1000 : Infinity,
    select: (res) => computeCurrentStreak(res.data),
  });

  const activity  = activityQ.data;
  const workers   = workersQ.data ?? [];
  const streak    = streakQ.data ?? 0;

  // ── Derived display values ──────────────────────────────────────────────────
  const activityEmoji = useMemo(
    () => ACTIVITY_EMOJI[activity?.type ?? ''] ?? '📋',
    [activity],
  );

  const canManage = user?.role !== 'farm_worker';

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const submitWithStatus = useCallback(
    async (status: 'completed' | 'skipped') => {
      if (status === 'completed' && !completedDate) {
        setErrorMsg(t('activity.log.errorRequired'));
        return;
      }
      setSubmitting(true);
      setErrorMsg(null);

      const dto = {
        status,
        completedDate: status === 'completed' ? toIsoDate(completedDate) : undefined,
        labourCostKes: labourCostKes ? Number(labourCostKes) : undefined,
        notes: notes.trim() || undefined,
        assignedToWorkerId: assignedToWorkerId ?? undefined,
      };

      try {
        if (isOnline) {
          await activityApi.update(farmId, activityId, dto);
        } else {
          await queueWrite({
            operation: 'UPDATE',
            entity: 'activities',
            endpoint: `/farms/${farmId}/activities/${activityId}`,
            payload: JSON.stringify(dto),
          });
        }
        await queryClient.invalidateQueries({ queryKey: ['farms/schedule', farmId] });
        await queryClient.invalidateQueries({ queryKey: ['farms', user?.id] });
        await queryClient.invalidateQueries({ queryKey: ['activities', farmId] });

        if (status === 'completed') {
          showToast(t('activity.log.successToast', { streak: streak + 1 }), 'success');
        }
        navigation.goBack();
      } catch {
        setErrorMsg(t('activity.log.errorSave'));
      } finally {
        setSubmitting(false);
      }
    },
    [
      completedDate, labourCostKes, notes, assignedToWorkerId, isOnline,
      queueWrite, farmId, activityId, queryClient, navigation, showToast, streak, t, user,
    ],
  );

  const handleComplete = useCallback(() => submitWithStatus('completed'), [submitWithStatus]);
  const handleSkip     = useCallback(() => submitWithStatus('skipped'),   [submitWithStatus]);

  // ── Loading / error states (shown inside sheet) ───────────────────────────
  const renderSheetContent = () => {
    if (activityQ.isLoading) {
      return (
        <View style={s.stateCenter}>
          <ActivityIndicator size="large" color="#1A6B3C" />
        </View>
      );
    }

    if (activityQ.isError || !activity) {
      return (
        <View style={s.stateCenter}>
          <Text style={s.stateText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => activityQ.refetch()} style={s.retryBtn} accessibilityRole="button">
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    const plotAndCrop = [activity.plotName, activity.cropName].filter(Boolean).join(' · ');

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 3. Handle bar */}
        <View style={s.handle} />

        {/* 4. Activity header */}
        <View style={s.activityHeader}>
          <View style={s.activityHeaderLeft}>
            <Text style={s.activityTitle}>
              {activityEmoji} {activity.title}
            </Text>
            {!!plotAndCrop && (
              <Text style={s.activitySub}>{plotAndCrop}</Text>
            )}
          </View>
          {!!activity.aiReason && (
            <View style={s.aiBadge}>
              <Text style={s.aiBadgeText}>{t('activity.log.aiScheduled')}</Text>
            </View>
          )}
        </View>

        {/* 5. AI reasoning */}
        {!!activity.aiReason && (
          <View style={s.aiBox}>
            <Text style={s.aiBoxTitle}>{t('activity.log.whyTitle')}</Text>
            <Text style={s.aiBoxBody}>{activity.aiReason}</Text>
          </View>
        )}

        {/* 6. Divider */}
        <View style={s.divider} />

        {/* 7. Form fields */}
        <FieldLabel label={t('activity.log.completedOn')} />
        <Pressable
          style={s.inputTouchable}
          onPress={() => setShowDatePicker(true)}
          accessibilityRole="button"
        >
          <Text style={s.inputValue}>{formatDisplayDate(completedDate)}</Text>
        </Pressable>

        <View style={s.twoCol}>
          <View style={s.flex1}>
            <FieldLabel label={t('activity.log.actualCost')} />
            <TextInput
              style={s.input}
              value={labourCostKes}
              onChangeText={setLabourCostKes}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          {canManage && (
            <View style={[s.flex1, { marginLeft: 6 }]}>
              <FieldLabel label={t('activity.log.assignTo')} />
              <Pressable
                style={s.inputTouchable}
                onPress={() => setShowWorkerPicker(true)}
                accessibilityRole="button"
              >
                <Text style={s.inputValue}>
                  {assignedToWorkerId ? assignedWorkerName : t('activity.log.unassigned')} ▾
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <FieldLabel label={t('activity.log.notes')} />
        <TextInput
          style={s.input}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('activity.log.notesPh')}
          placeholderTextColor="#9CA3AF"
          returnKeyType="done"
        />

        {/* 8. Streak motivator */}
        {streak >= 3 && (
          <View style={s.streakBox}>
            <Text style={s.streakFire}>🔥</Text>
            <View style={s.flex1}>
              <Text style={s.streakMsg}>{t('activity.log.streakMsg', { streak })}</Text>
              <Text style={s.streakCredit}>{t('activity.log.streakCredit')}</Text>
            </View>
          </View>
        )}

        {/* Error alert */}
        {!!errorMsg && <AlertBox message={errorMsg} />}

        {/* 9. Complete button */}
        <Pressable
          style={[s.completeBtn, submitting && s.completeBtnDisabled]}
          onPress={handleComplete}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={s.completeBtnText}>{t('activity.log.completeBtn')}</Text>
          )}
        </Pressable>

        {/* 10. Skip link */}
        <Pressable
          style={s.skipLink}
          onPress={handleSkip}
          disabled={submitting}
          accessibilityRole="button"
        >
          <Text style={s.skipLinkText}>{t('activity.log.skipLink')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    );
  };

  return (
    <>
      {/* Bottom sheet modal */}
      <Modal
        visible
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={handleDismiss}
      >
        {/* 1. Dark overlay — tap to dismiss */}
        <Pressable style={s.overlay} onPress={handleDismiss} accessibilityRole="button">
          {/* 2. Sheet — stop propagation so tapping inside doesn't close */}
          <Pressable style={s.sheet} onPress={() => { /* absorb */ }} accessibilityRole="none">
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.sheetContent}
            >
              {renderSheetContent()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date picker */}
      <MiniCalendar
        visible={showDatePicker}
        value={completedDate}
        onSelect={(d) => { setCompletedDate(d); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Worker picker */}
      <WorkerPickerModal
        visible={showWorkerPicker}
        title={t('activity.log.workerPickerTitle')}
        workers={workers}
        onSelect={(id, name) => {
          setAssignedToWorkerId(id);
          setAssignedWorkerName(name);
        }}
        onClose={() => setShowWorkerPicker(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  sheetContent: {
    paddingHorizontal: 14,
    paddingBottom: 28,
    paddingTop: 12,
  },

  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },

  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityHeaderLeft: { flex: 1, marginRight: 8 },
  activityTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  activitySub:   { fontSize: 9,  color: '#6B7280', marginTop: 2 },
  aiBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 8, fontWeight: '600', color: '#1D4ED8' },

  aiBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EAF4EE',
  },
  aiBoxTitle: { fontSize: 9, fontWeight: '700', color: '#1A6B3C', marginBottom: 3 },
  aiBoxBody:  { fontSize: 9, color: '#374151', lineHeight: 14 },

  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 8 },

  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
    marginTop: 8,
  },

  inputTouchable: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    backgroundColor: '#F9FAFB',
    minHeight: 36,
    justifyContent: 'center',
    marginBottom: 2,
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
    minHeight: 36,
    marginBottom: 2,
  },
  inputValue: { fontSize: 10, color: '#111827' },

  twoCol: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  flex1:  { flex: 1 },

  streakBox: {
    backgroundColor: '#F5E9C8',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakFire:   { fontSize: 16 },
  streakMsg:    { fontSize: 10, fontWeight: '700', color: '#92400E' },
  streakCredit: { fontSize: 8,  color: '#B45309' },

  alertBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FEE2E2',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 8,
  },
  alertText: { fontSize: 9, color: '#7F1D1D', lineHeight: 14 },

  completeBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 11,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  completeBtnDisabled: { opacity: 0.5 },
  completeBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  skipLink:     { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  skipLinkText: { fontSize: 10, color: '#9CA3AF' },

  stateCenter: { padding: 24, alignItems: 'center' },
  stateText:   { fontSize: 12, color: '#374151', marginBottom: 12, textAlign: 'center' },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 10, fontWeight: '600', color: '#fff' },
});

const cal = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#1A6B3C',
  },
  monthLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  navBtn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  navText: { fontSize: 22, color: '#fff', fontWeight: '600' },
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
  confirmBtn: {
    flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1A6B3C', borderRadius: 6,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 10, fontWeight: '600', color: '#fff' },
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
