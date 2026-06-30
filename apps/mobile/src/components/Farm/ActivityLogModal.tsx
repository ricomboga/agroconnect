import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { useQueryClient } from '@tanstack/react-query';
import { farmApi, type FarmWorker, type ScheduledActivity } from '../../api/farm';

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDisplayDate(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const date = new Date(`${isoDate}T12:00:00`);
    const formatted = date.toLocaleDateString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return isoDate === today ? `Today, ${formatted}` : formatted;
  } catch {
    return isoDate;
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ActivityLogModalProps {
  farmId: string;
  activity: ScheduledActivity | null;
  workers: FarmWorker[];
  isWorkerRole: boolean;
  streak?: number;
  onSuccess: () => void;
  onClose: () => void;
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function ActivityLogModal({
  farmId,
  activity,
  workers,
  isWorkerRole,
  streak = 0,
  onSuccess,
  onClose,
}: ActivityLogModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [completedDate, setCompletedDate] = useState(todayIso);
  const [labourCost, setLabourCost] = useState('0');
  const [notes, setNotes] = useState('');
  const [assignedWorkerId, setAssignedWorkerId] = useState<string | null>(
    activity?.assignedToWorkerId ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (activity) {
      setAssignedWorkerId(activity.assignedToWorkerId ?? null);
      setCompletedDate(new Date().toISOString().slice(0, 10));
      setLabourCost('0');
      setNotes('');
      setShowWorkerDropdown(false);
    }
  }, [activity]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const handleComplete = useCallback(async () => {
    if (!activity) return;
    setIsSubmitting(true);
    try {
      await farmApi.completeActivity(farmId, activity.id, {
        status: 'completed',
        completedDate,
        labourCostKes: Number(labourCost) || 0,
        notes: notes.trim() || undefined,
        assignedToWorkerId: assignedWorkerId,
      });
      await queryClient.invalidateQueries({ queryKey: ['farms/schedule', farmId] });
      await queryClient.invalidateQueries({ queryKey: ['farm-activities', farmId] });
      await queryClient.invalidateQueries({ queryKey: ['farm', farmId] });
      showToast(
        streak > 0
          ? t('activity.log.successToast', { streak: streak + 1 })
          : t('farm.schedule.completedToast'),
      );
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch {
      showToast(t('farm.schedule.completedError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activity,
    farmId,
    completedDate,
    labourCost,
    notes,
    assignedWorkerId,
    streak,
    queryClient,
    t,
    showToast,
    onSuccess,
  ]);

  const handleSkip = useCallback(async () => {
    if (!activity) return;
    setIsSubmitting(true);
    try {
      await farmApi.completeActivity(farmId, activity.id, {
        status: 'skipped',
        notes: notes.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['farms/schedule', farmId] });
      await queryClient.invalidateQueries({ queryKey: ['farm-activities', farmId] });
      onSuccess();
    } catch {
      showToast(t('farm.schedule.completedError'));
    } finally {
      setIsSubmitting(false);
    }
  }, [activity, farmId, notes, queryClient, t, showToast, onSuccess]);

  const subject = activity?.cropName ?? activity?.animalName ?? '';
  const showWorkerPicker = workers.length > 0 && !isWorkerRole;
  const showStreak = streak > 0;

  return (
    <Modal
      visible={!!activity}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {activity?.activityEmoji ?? '📋'} {activity?.title ?? ''}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {[subject, activity?.plotName].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {!!activity?.aiReason && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>{t('farm.schedule.aiScheduled')}</Text>
                </View>
              )}
            </View>
          </View>

          {/* AI Reasoning — always expanded */}
          {activity?.aiReason ? (
            <View style={styles.aiBox}>
              <Text style={styles.aiBoxTitle}>{t('activity.log.whyTitle')}</Text>
              <Text style={styles.aiBoxBody}>{activity.aiReason}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Scrollable form */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Completed Date — prev / label / next */}
            <Text style={styles.fieldLabel}>{t('activity.log.completedOn')}</Text>
            <View style={styles.dateRow}>
              <Pressable
                style={styles.datePrevBtn}
                onPress={() => {
                  const d = new Date(`${completedDate}T12:00:00`);
                  d.setDate(d.getDate() - 1);
                  setCompletedDate(d.toISOString().slice(0, 10));
                }}
                accessibilityRole="button"
                accessibilityLabel="Previous day"
              >
                <Text style={styles.dateNavText}>‹</Text>
              </Pressable>
              <Text style={styles.dateDisplay} numberOfLines={1}>
                📅 {formatDisplayDate(completedDate)}
              </Text>
              <Pressable
                style={styles.datePrevBtn}
                onPress={() => {
                  const d = new Date(`${completedDate}T12:00:00`);
                  d.setDate(d.getDate() + 1);
                  const newDate = d.toISOString().slice(0, 10);
                  if (newDate <= todayIso) setCompletedDate(newDate);
                }}
                accessibilityRole="button"
                accessibilityLabel="Next day"
              >
                <Text style={styles.dateNavText}>›</Text>
              </Pressable>
            </View>

            {/* Cost + Worker row */}
            <View style={styles.twoColRow}>
              <View style={styles.twoColLeft}>
                <Text style={styles.fieldLabel}>{t('activity.log.actualCost')}</Text>
                <TextInput
                  value={labourCost}
                  onChangeText={setLabourCost}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  accessibilityLabel={t('activity.log.actualCost')}
                />
              </View>

              {showWorkerPicker ? (
                <View style={styles.twoColRight}>
                  <Text style={styles.fieldLabel}>{t('activity.log.assignTo')}</Text>
                  <Pressable
                    style={styles.workerDropdown}
                    onPress={() => setShowWorkerDropdown((v) => !v)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.workerDropdownText} numberOfLines={1}>
                      {workers.find((w) => w.userId === assignedWorkerId)?.fullName ??
                        t('activity.log.unassigned')}
                    </Text>
                    <Text style={styles.workerDropdownChevron}>▾</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            {/* Worker dropdown list */}
            {showWorkerPicker && showWorkerDropdown ? (
              <View style={styles.workerDropdownList}>
                <Pressable
                  style={styles.workerDropdownItem}
                  onPress={() => { setAssignedWorkerId(null); setShowWorkerDropdown(false); }}
                  accessibilityRole="menuitem"
                >
                  <Text style={styles.workerDropdownItemText}>{t('activity.log.unassigned')}</Text>
                </Pressable>
                {workers.map((w) => (
                  <Pressable
                    key={w.userId}
                    style={[
                      styles.workerDropdownItem,
                      styles.workerDropdownItemBorder,
                      assignedWorkerId === w.userId && styles.workerDropdownItemActive,
                    ]}
                    onPress={() => { setAssignedWorkerId(w.userId); setShowWorkerDropdown(false); }}
                    accessibilityRole="menuitem"
                  >
                    <Text
                      style={[
                        styles.workerDropdownItemText,
                        assignedWorkerId === w.userId && styles.workerDropdownItemTextActive,
                      ]}
                    >
                      {w.fullName}
                    </Text>
                    {assignedWorkerId === w.userId && (
                      <Text style={styles.workerDropdownCheck}>✓</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* Notes */}
            <Text style={styles.fieldLabel}>{t('activity.log.notes')}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('activity.log.notesPh')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              accessibilityLabel={t('activity.log.notes')}
            />

            {/* Streak motivator */}
            {showStreak && (
              <View style={styles.streakBar}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View>
                  <Text style={styles.streakMsg}>
                    {t('activity.log.streakMsg', { streak })}
                  </Text>
                  <Text style={styles.streakCredit}>{t('activity.log.streakCredit')}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Complete button */}
          <View style={styles.btnArea}>
            <Pressable
              onPress={() => void handleComplete()}
              style={[styles.completeBtn, isSubmitting && styles.btnDisabled]}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              <Text style={styles.completeBtnText}>
                {isSubmitting ? t('common.saving') : t('activity.log.completeBtn')}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSkip()}
              style={styles.skipBtn}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              <Text style={styles.skipBtnText}>{t('activity.log.skipLink')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Toast message={toastMsg} visible={toastVisible} />
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    maxHeight: '88%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 10,
    color: '#6B7280',
  },
  aiBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  aiBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#1E40AF',
  },

  // AI reasoning
  aiBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EAF4EE',
  },
  aiBoxTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    marginBottom: 3,
  },
  aiBoxBody: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 14,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
    marginBottom: 2,
  },

  // Scrollable form
  formScroll: {
    flexShrink: 1,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 0,
  },

  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
  },

  // Date field
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  datePrevBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    justifyContent: 'center',
    minWidth: 36,
    alignItems: 'center',
  },
  dateNavText: {
    fontSize: 14,
    color: '#1A6B3C',
    fontWeight: '600',
  },
  dateDisplay: {
    flex: 1,
    fontSize: 10,
    color: '#111827',
    paddingVertical: 9,
    textAlign: 'center',
  },

  // Two-column row
  twoColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  twoColLeft: {
    flex: 1,
  },
  twoColRight: {
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 9,
    fontSize: 10,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputMultiline: {
    minHeight: 52,
    textAlignVertical: 'top',
    paddingTop: 8,
  },

  // Worker dropdown
  workerDropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: '#fff',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workerDropdownText: {
    fontSize: 10,
    color: '#111827',
    flex: 1,
  },
  workerDropdownChevron: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
  },
  workerDropdownList: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    backgroundColor: '#fff',
    marginBottom: 4,
    overflow: 'hidden',
  },
  workerDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  workerDropdownItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  workerDropdownItemActive: {
    backgroundColor: '#EAF4EE',
  },
  workerDropdownItemText: {
    fontSize: 10,
    color: '#111827',
    flex: 1,
  },
  workerDropdownItemTextActive: {
    color: '#0D4A28',
    fontWeight: '600',
  },
  workerDropdownCheck: {
    fontSize: 12,
    color: '#1A6B3C',
    fontWeight: '700',
    marginLeft: 4,
  },

  // Streak bar
  streakBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 12,
  },
  streakEmoji: {
    fontSize: 18,
  },
  streakMsg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  streakCredit: {
    fontSize: 9,
    color: '#B45309',
    marginTop: 1,
  },

  // Button area
  btnArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  completeBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: 8,
  },
  completeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toastText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
});
