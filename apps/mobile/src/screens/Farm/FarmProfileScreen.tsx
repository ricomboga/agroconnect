import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useFarm, useFarmSchedule, useFarmWorkers, useFarms, useFarmAnimals } from '../../hooks/useFarms';
import { useFarmStore } from '../../store/farm.store';
import type { Farm, FarmWorker, ScheduledActivity } from '../../api/farm';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { ActivityLogModal } from '../../components/Farm/ActivityLogModal';
import { useAuthStore } from '../../stores/authStore';

type Props = NativeStackScreenProps<FarmStackParamList, 'FarmProfile'>;
type ProfileTab = 'overview' | 'my_tasks' | 'workers';
type ExtendedFarm = Farm & { healthScore?: number };

const WEB_URL = process.env['EXPO_PUBLIC_WEB_URL'] ?? 'https://agroconnect.co.ke';

// ─── Activity Emoji + Display Label Maps ─────────────────────────────────────

const ACTIVITY_EMOJI = {
  irrigation: '💧',
  pesticide:  '🌿',
  fertilising:'🌾',
  weeding:    '✂️',
  planting:   '🌱',
  harvesting: '🌽',
  vaccination:'💉',
  deworming:  '💊',
  feeding:    '🐾',
  other:      '📋',
} as const;

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  irrigation:  'Watering',
  pesticide:   'Spraying',
  fertilising: 'Fertilising',
  weeding:     'Weeding',
  planting:    'Planting',
  harvesting:  'Harvesting',
  vaccination: 'Vaccination',
  deworming:   'Deworming',
  feeding:     'Feeding',
  other:       'Other',
};

function activityDisplayLabel(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

type ActivityWithDone = ScheduledActivity & { completedDate?: string | null };

function resolveActivityEmoji(activityType: string): string {
  return (ACTIVITY_EMOJI as Record<string, string>)[activityType] ?? '📋';
}

function formatDayHeader(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-KE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getWorkerInitials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase();
}

function getLogBtnKey(activityType: string): string {
  switch (activityType) {
    case 'irrigation':  return 'activity.schedule.btn.logWatering';
    case 'vaccination': return 'activity.schedule.btn.bookVet';
    case 'pesticide':   return 'activity.schedule.btn.logSpraying';
    default:            return 'activity.schedule.btn.logNow';
  }
}

// Progress bar showing urgency/time-to-due for a task
function TaskProgressBar({
  status,
  daysUntil,
}: {
  status: string;
  daysUntil: number | null;
}) {
  if (status === 'completed' || status === 'skipped') return null;

  let progress: number;
  let fillColor: string;

  if (status === 'overdue') {
    progress = 100;
    fillColor = '#DC2626';
  } else if (status === 'today') {
    progress = 100;
    fillColor = '#D97706';
  } else if (status === 'this_week') {
    const days = daysUntil ?? 7;
    progress = Math.max(12, Math.round(((7 - days) / 7) * 100));
    fillColor = days <= 2 ? '#D97706' : '#16A34A';
  } else {
    // upcoming
    const days = daysUntil ?? 14;
    progress = Math.max(5, Math.round(((21 - Math.min(days, 21)) / 21) * 100));
    fillColor = '#9CA3AF';
  }

  const empty = 100 - progress;

  return (
    <View style={mt.progressTrack}>
      <View style={{ flex: progress, backgroundColor: fillColor }} />
      {empty > 0 && <View style={{ flex: empty }} />}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCropEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('maize') || n.includes('corn')) return '🌽';
  if (n.includes('tomato')) return '🍅';
  if (n.includes('bean')) return '🫘';
  if (n.includes('cabbage')) return '🥬';
  if (n.includes('wheat')) return '🌾';
  if (n.includes('potato')) return '🥔';
  if (n.includes('chicken') || n.includes('layer') || n.includes('poultry')) return '🐔';
  if (n.includes('cattle') || n.includes('dairy') || n.includes('cow')) return '🐄';
  if (n.includes('goat')) return '🐐';
  return '🌿';
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── Farm Switcher Modal ──────────────────────────────────────────────────────

function FarmSwitcherModal({
  visible,
  farms,
  currentFarmId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  farms: Farm[];
  currentFarmId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={sw.root}>
        <View style={sw.header}>
          <Text style={sw.title}>{t('farm.switcher.title')}</Text>
          <Pressable onPress={onClose} style={sw.closeBtn} accessibilityRole="button">
            <Text style={sw.closeText}>✕</Text>
          </Pressable>
        </View>
        <ScrollView>
          {farms.map((f, idx) => (
            <Pressable
              key={f.id}
              style={[sw.item, idx > 0 && sw.itemBorder, f.id === currentFarmId && sw.itemActive]}
              onPress={() => { onSelect(f.id); onClose(); }}
              accessibilityRole="button"
            >
              <View style={sw.itemContent}>
                <Text style={[sw.itemName, f.id === currentFarmId && sw.itemNameActive]}>{f.name}</Text>
                <Text style={sw.itemMeta}>{f.county} · {f.areaAcres} acres</Text>
              </View>
              {f.id === currentFarmId && <Text style={sw.checkmark}>✓</Text>}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── TopBar ──────────────────────────────────────────────────────────────────

function TopBar({
  farm,
  allFarms,
  activeTab,
  onBack,
  onSwitchFarm,
  onAddActivity,
  onEditFarm,
}: {
  farm: Farm;
  allFarms: Farm[];
  activeTab: ProfileTab;
  onBack: () => void;
  onSwitchFarm: (id: string) => void;
  onAddActivity: () => void;
  onEditFarm: () => void;
}) {
  const { t } = useTranslation();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const hasMultipleFarms = allFarms.length > 1;

  const openMenu = useCallback(() => {
    type AlertBtn = { text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' };
    const options: AlertBtn[] = [
      {
        text: t('farm.profile.menuViewOnWeb'),
        onPress: () => void Linking.openURL(`${WEB_URL}/farms/${farm.id}`),
      },
      {
        text: t('farm.profile.menuEditFarm'),
        onPress: onEditFarm,
      },
    ];
    if (hasMultipleFarms) {
      options.push({ text: t('farm.switcher.switch'), onPress: () => setShowSwitcher(true) });
    }
    options.push({ text: t('common.cancel'), style: 'cancel' });
    Alert.alert(farm.name, undefined, options);
  }, [farm, hasMultipleFarms, onEditFarm, t]);

  // Back label: "← My Farms" on overview, "← [Farm Name]" on sub-tabs
  const backLabel = activeTab === 'overview'
    ? `← ${t('farm.profile.backLabel')}`
    : `← ${farm.name}`;

  // Center title: farm name on overview, tab name on sub-tabs
  const centerTitle = activeTab === 'overview'
    ? farm.name
    : activeTab === 'my_tasks'
    ? t('farm.profile.tab.myTasks')
    : t('farm.profile.tab.workers');

  return (
    <>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.topBarBack} accessibilityRole="button">
          <Text style={styles.topBarBackText}>{backLabel}</Text>
        </Pressable>

        <Text style={styles.topBarTitle} numberOfLines={1}>{centerTitle}</Text>

        {activeTab === 'my_tasks' ? (
          <Pressable onPress={onAddActivity} style={styles.topBarMenu} accessibilityRole="button">
            <Text style={styles.topBarMenuIcon}>＋</Text>
          </Pressable>
        ) : activeTab === 'workers' ? (
          <Pressable
            onPress={() => void Linking.openURL(`${WEB_URL}/farms/${farm.id}/workers`)}
            style={styles.topBarMenu}
            accessibilityRole="button"
          >
            <Text style={styles.topBarManageText}>Manage on web</Text>
          </Pressable>
        ) : (
          <Pressable onPress={openMenu} style={styles.topBarMenu} accessibilityRole="button">
            <Text style={styles.topBarMenuIcon}>⋯</Text>
          </Pressable>
        )}
      </View>

      {hasMultipleFarms && (
        <FarmSwitcherModal
          visible={showSwitcher}
          farms={allFarms}
          currentFarmId={farm.id}
          onSelect={onSwitchFarm}
          onClose={() => setShowSwitcher(false)}
        />
      )}
    </>
  );
}

// ─── Worker TopBar ────────────────────────────────────────────────────────────

function shortWorkerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  return `${parts[0]} ${parts[1]?.[0] ?? ''}.`;
}

function WorkerTopBar({ farmName, workerName }: { farmName: string; workerName: string }) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topBarTitle} numberOfLines={1}>
        My Tasks — {farmName}
      </Text>
      <Text style={styles.topBarManageText} numberOfLines={1}>
        {shortWorkerName(workerName)}
      </Text>
    </View>
  );
}

// ─── SubTabs ─────────────────────────────────────────────────────────────────

function SubTabs({
  active,
  tabs,
  overdueCount,
  onChange,
}: {
  active: ProfileTab;
  tabs: { key: ProfileTab; label: string }[];
  overdueCount: number;
  onChange: (tab: ProfileTab) => void;
}) {
  return (
    <View style={styles.subTabs}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const showBadge = tab.key === 'my_tasks' && overdueCount > 0;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.subTab}
            accessibilityRole="tab"
          >
            <View style={styles.subTabInner}>
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
              {showBadge && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{overdueCount}</Text>
                </View>
              )}
            </View>
            {isActive && <View style={styles.subTabIndicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Activity Card (My Tasks tab) ────────────────────────────────────────────

function ActivityCard({
  item,
  isWorker,
  onPress,
  onLogNow,
}: {
  item: ScheduledActivity;
  isWorker: boolean;
  onPress: () => void;
  onLogNow: () => void;
}) {
  const { t } = useTranslation();
  const isOverdue = item.status === 'overdue';
  const isToday = item.status === 'today';

  const badgeStyle = isOverdue ? styles.badgeRed
    : isToday ? styles.badgeAmber
    : item.status === 'this_week' ? styles.badgeBlue
    : styles.badgeGrey;
  const badgeTextStyle = isOverdue ? styles.badgeTextRed
    : isToday ? styles.badgeTextAmber
    : item.status === 'this_week' ? styles.badgeTextBlue
    : styles.badgeTextGrey;
  const badgeLabel = isOverdue ? t('activity.schedule.badge.late')
    : isToday ? t('activity.schedule.badge.today')
    : item.daysUntil != null ? t('activity.schedule.badge.daysAway', { n: item.daysUntil })
    : item.scheduledDate;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.actCard, isOverdue && styles.actCardRed, isToday && styles.actCardAmber]}
      accessibilityRole="button"
    >
      <View style={styles.actCardRow}>
        <Text style={styles.actCardTitle} numberOfLines={1}>
          {item.activityEmoji} {item.title}
        </Text>
        <View style={[styles.actBadge, badgeStyle]}>
          <Text style={[styles.actBadgeText, badgeTextStyle]}>{badgeLabel}</Text>
        </View>
      </View>
      {(item.plotName ?? item.cropName) ? (
        <Text style={styles.actCardSub} numberOfLines={1}>
          {[item.plotName, item.cropName].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {item.assignedToWorkerName ? (
        <Text style={styles.actCardWorker}>
          👤 {t('farm.schedule.assignedTo')}: {item.assignedToWorkerName}
        </Text>
      ) : !isWorker ? (
        <Text style={styles.actCardUnassigned}>
          👤 {t('farm.schedule.unassignedTap')}
        </Text>
      ) : null}
      {(isOverdue || isToday) && (
        <Pressable
          onPress={onLogNow}
          style={[styles.logNowBtn, isOverdue ? styles.logNowBtnRed : styles.logNowBtnAmber]}
          accessibilityRole="button"
        >
          <Text style={styles.logNowBtnText}>
            {isOverdue ? t('farm.schedule.logNowOverdue') : t('farm.schedule.logNow')}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

// ─── Workers Tab ─────────────────────────────────────────────────────────────

const WORKER_ROLE_LABELS: Record<string, string> = {
  manager:      'Manager',
  field_worker: 'Field Worker',
  harvester:    'Harvester',
  sprayer:      'Sprayer',
  driver:       'Driver',
};

const ROLE_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  manager:      { bg: '#EAF4EE', color: '#0D4A28' },
  field_worker: { bg: '#DBEAFE', color: '#1E40AF' },
  harvester:    { bg: '#FEF3C7', color: '#92400E' },
  sprayer:      { bg: '#F3E8FF', color: '#6B21A8' },
  driver:       { bg: '#CFFAFE', color: '#0E7490' },
};

function maskedPhone(phone: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const cc = `+${digits.slice(0, 3)}`;
  const prefix = digits.slice(3, 6);
  const last3 = digits.slice(-3);
  return `${cc} ${prefix} *** ${last3}`;
}

function WorkersTab({ workers, farmName }: { workers: FarmWorker[]; farmName: string }) {
  const { t } = useTranslation();

  const sortedByTasks = useMemo(
    () => [...workers].sort((a, b) => (b.assignedTaskCount ?? 0) - (a.assignedTaskCount ?? 0)),
    [workers],
  );

  const distMonth = useMemo(
    () => new Date().toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
    [],
  );

  return (
    <ScrollView contentContainerStyle={wt.scroll}>
      {/* 1. Info Alert */}
      <View style={wt.infoAlert}>
        <Text style={wt.infoAlertText}>{t('farm.workers.webPortalInfo')}</Text>
      </View>

      {/* 2. Section Header */}
      <Text style={styles.sectionHeaderLabel}>{t('farm.workers.teamOn', { farmName })}</Text>

      {/* 3. Worker Cards */}
      {workers.map((worker) => {
        const initials = getWorkerInitials(worker.fullName);
        const avatarBg = worker.role === 'manager' ? '#1A6B3C' : '#0E7490';
        const badge = ROLE_BADGE_COLORS[worker.role] ?? { bg: '#F3F4F6', color: '#374151' };
        const taskCount = worker.assignedTaskCount ?? 0;
        const isActive = worker.isActive !== false;

        return (
          <View key={worker.userId} style={wt.workerCard}>
            <View style={wt.workerRow}>
              <View style={[wt.avatar, { backgroundColor: avatarBg }]}>
                <Text style={wt.avatarText}>{initials}</Text>
              </View>
              <View style={wt.workerInfo}>
                <Text style={wt.workerName}>{worker.fullName}</Text>
                <Text style={wt.workerPhone}>{maskedPhone(worker.phone)}</Text>
                <View style={[wt.roleBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[wt.roleBadgeText, { color: badge.color }]}>
                    {WORKER_ROLE_LABELS[worker.role] ?? worker.role}
                  </Text>
                </View>
              </View>
              <View style={wt.workerRight}>
                <Text style={[wt.activeLabel, { color: isActive ? '#1A6B3C' : '#6B7280' }]}>
                  {isActive ? t('farm.workers.active') : t('farm.workers.inactive')}
                </Text>
                <Text style={wt.taskCount}>{t('farm.workers.tasks', { count: taskCount })}</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* 4. Task Distribution Card */}
      <View style={wt.distCard}>
        <Text style={wt.distTitle}>{t('farm.workers.taskDistribution')}</Text>
        <Text style={wt.distSub}>{distMonth}</Text>
        {sortedByTasks.map((worker, idx) => {
          const initials = getWorkerInitials(worker.fullName);
          const avatarBg = worker.role === 'manager' ? '#1A6B3C' : '#0E7490';
          const isLast = idx === sortedByTasks.length - 1;
          return (
            <View key={worker.userId} style={[wt.distRow, !isLast && wt.distRowBorder]}>
              <View style={[wt.distAvatar, { backgroundColor: avatarBg }]}>
                <Text style={wt.distAvatarText}>{initials}</Text>
              </View>
              <Text style={wt.distName}>{worker.fullName}</Text>
              <Text style={wt.distTaskCount}>
                {t('farm.workers.tasks', { count: worker.assignedTaskCount ?? 0 })}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 5. Web Management Card */}
      <View style={wt.webCard}>
        <Text style={wt.webCardTitle}>{t('farm.workers.manageTitle')}</Text>
        <Text style={wt.webCardSub}>{t('farm.workers.manageSub')}</Text>
      </View>
    </ScrollView>
  );
}

// ─── Care Cards (Overview Tab) ────────────────────────────────────────────────

interface CropGroup {
  name: string;
  urgency: 'urgent' | 'on-track';
  overdueActs: ScheduledActivity[];
  upcomingActs: ScheduledActivity[];
}

function UrgentCareCard({
  group,
  onLogNow,
}: {
  group: CropGroup;
  onLogNow: () => void;
}) {
  const { t } = useTranslation();
  const emoji = getCropEmoji(group.name);

  return (
    <View style={[styles.careCard, styles.careCardUrgent]}>
      <View style={styles.careCardHeader}>
        <Text style={styles.careCardTitle}>
          {emoji} {group.name} {t('farm.care.careSuffix')}
        </Text>
        <View style={styles.badgeRed}>
          <Text style={[styles.badgeTextRed, styles.careBadgeText]}>
            {t('farm.care.urgent')}
          </Text>
        </View>
      </View>

      {group.overdueActs.map((act, i) => (
        <View key={act.id}>
          <View
            style={[
              styles.careRow,
              i < group.overdueActs.length - 1 && styles.careRowBorder,
            ]}
          >
            <Text style={styles.careRowEmoji}>{act.activityEmoji}</Text>
            <View style={styles.careRowBody}>
              <Text style={styles.careRowTitle}>
                {activityDisplayLabel(act.activityType)}
                {act.daysLate != null
                  ? ` — ${t('farm.care.daysOverdue', { count: act.daysLate })}`
                  : ''}
              </Text>
            </View>
            <View style={styles.badgeRed}>
              <Text style={[styles.badgeTextRed, styles.careBadgeText]}>
                {t('farm.care.late')}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFillRed} />
          </View>
        </View>
      ))}

      <Pressable onPress={onLogNow} style={styles.careLogBtn} accessibilityRole="button">
        <Text style={styles.careLogBtnText}>
          ⚡ {t('farm.care.logNow', { type: activityDisplayLabel(group.overdueActs[0]?.activityType ?? '') })}
        </Text>
      </Pressable>
    </View>
  );
}

function OnTrackCareCard({ group }: { group: CropGroup }) {
  const { t } = useTranslation();
  const emoji = getCropEmoji(group.name);

  return (
    <View style={[styles.careCard, styles.careCardOnTrack]}>
      <View style={styles.careCardHeader}>
        <Text style={styles.careCardTitle}>
          {emoji} {group.name} {t('farm.care.careSuffix')}
        </Text>
        <View style={styles.badgeGreen}>
          <Text style={[styles.badgeTextGreen, styles.careBadgeText]}>
            {t('farm.care.onTrack')}
          </Text>
        </View>
      </View>

      {group.upcomingActs.map((act, i) => {
        const isDone = act.status === 'completed' || act.status === 'skipped';
        const isToday = act.status === 'today';
        const badge = isDone
          ? { view: styles.badgeGreen, text: styles.badgeTextGreen, label: t('farm.care.done') }
          : isToday
          ? { view: styles.badgeAmber, text: styles.badgeTextAmber, label: t('activity.schedule.badge.today') }
          : { view: styles.badgeBlue, text: styles.badgeTextBlue, label: t('farm.care.soon') };
        const sub = isDone
          ? t('farm.care.doneSub', { date: formatShortDate((act as ScheduledActivity & { completedDate?: string | null }).completedDate ?? act.scheduledDate) })
          : isToday
          ? t('farm.care.doneSub', { date: formatShortDate(act.scheduledDate) })
          : act.daysUntil != null
          ? t('farm.care.dueOnDate', { date: formatShortDate(act.scheduledDate), count: act.daysUntil })
          : formatShortDate(act.scheduledDate);

        return (
          <View
            key={act.id}
            style={[
              styles.careRow,
              i < group.upcomingActs.length - 1 && styles.careRowBorder,
            ]}
          >
            <Text style={styles.careRowEmoji}>
              {isDone ? '✅' : act.activityEmoji}
            </Text>
            <View style={styles.careRowBody}>
              <Text style={styles.careRowTitle}>
                {activityDisplayLabel(act.activityType)}{isDone ? ` — ${t('farm.care.done')}` : ''}
              </Text>
              <Text style={styles.careRowSub}>{sub}</Text>
            </View>
            <View style={badge.view}>
              <Text style={[badge.text, styles.careBadgeText]}>{badge.label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── My Tasks Tab ─────────────────────────────────────────────────────────────

const MyTasksTab = ({
  farmId,
  currentUserId,
  isWorkerRole,
  hasWorkers,
  onLogNow,
}: {
  farmId: string;
  currentUserId: string;
  isWorkerRole: boolean;
  hasWorkers: boolean;
  onLogNow: (activity: ScheduledActivity) => void;
}) => {
  const { t } = useTranslation();
  const scheduleQ = useFarmSchedule(farmId);

  const allActs = useMemo(
    () => (scheduleQ.data?.data ?? []) as ActivityWithDone[],
    [scheduleQ.data],
  );

  // ── Group 1: Pending = overdue + today ──────────────────────────────────────
  const pending = useMemo(
    () => allActs.filter((a) => a.status === 'overdue' || a.status === 'today'),
    [allActs],
  );

  // ── Group 2: Completed — sub-divided by recency ─────────────────────────────
  const todayIso = new Date().toISOString().slice(0, 10);
  const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const monthStartIso = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString().slice(0, 10);

  const completedActs = useMemo(
    () =>
      allActs.filter(
        (a): a is ActivityWithDone =>
          (a.status === 'completed' || a.status === 'skipped') &&
          Boolean((a as ActivityWithDone).completedDate),
      ),
    [allActs],
  );

  const completedToday = useMemo(
    () => completedActs.filter((a) => a.completedDate!.slice(0, 10) === todayIso),
    [completedActs, todayIso],
  );
  const completedThisWeek = useMemo(
    () =>
      completedActs.filter((a) => {
        const d = a.completedDate!.slice(0, 10);
        return d >= weekAgoIso && d < todayIso;
      }),
    [completedActs, weekAgoIso, todayIso],
  );
  const completedThisMonth = useMemo(
    () =>
      completedActs.filter((a) => {
        const d = a.completedDate!.slice(0, 10);
        return d >= monthStartIso && d < weekAgoIso;
      }),
    [completedActs, monthStartIso, weekAgoIso],
  );

  // ── Group 3: Upcoming = this_week + upcoming ────────────────────────────────
  const upcoming = useMemo(
    () => allActs.filter((a) => a.status === 'this_week' || a.status === 'upcoming'),
    [allActs],
  );

  if (scheduleQ.isLoading) {
    return (
      <View style={styles.tabCenter}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const hasAny =
    pending.length > 0 ||
    completedActs.length > 0 ||
    upcoming.length > 0;

  if (!hasAny) {
    return (
      <View style={styles.tabCenter}>
        <Text style={styles.allCaughtUp}>{t('farm.schedule.allCaughtUp')}</Text>
      </View>
    );
  }

  // ── Reusable card renderer ──────────────────────────────────────────────────

  const renderPendingCard = (activity: ActivityWithDone) => {
    const emoji = resolveActivityEmoji(activity.activityType);
    const isOverdue = activity.status === 'overdue';
    const isAssigned = activity.assignedToWorkerId === currentUserId;

    return (
      <View
        key={activity.id}
        style={[mt.pendingCard, isOverdue ? mt.pendingCardRed : mt.pendingCardAmber]}
      >
        <View style={mt.cardRow}>
          <Text style={mt.cardTitle} numberOfLines={1}>
            {emoji} {activity.title}
          </Text>
          {isOverdue ? (
            <View style={mt.badgeLate}>
              <Text style={mt.badgeLateText}>
                {t('activity.schedule.sub.daysLate', { daysLate: activity.daysLate ?? 0 })}
              </Text>
            </View>
          ) : (
            <View style={mt.badgeToday}>
              <Text style={mt.badgeTodayText}>{t('activity.schedule.badge.today')}</Text>
            </View>
          )}
        </View>
        {(activity.plotName ?? activity.cropName ?? activity.animalName) ? (
          <Text style={mt.cardSub}>
            {[activity.plotName, activity.cropName ?? activity.animalName]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {isAssigned && activity.assignedToWorkerName ? (
          <View style={mt.workerChip}>
            <View style={mt.workerInitialCircle}>
              <Text style={mt.workerInitialText}>
                {getWorkerInitials(activity.assignedToWorkerName)}
              </Text>
            </View>
            <Text style={mt.workerChipLabel}>{t('activity.schedule.assignedToYou')}</Text>
          </View>
        ) : null}
        {activity.aiReason ? (
          <View style={mt.aiBox}>
            <Text style={mt.aiBoxTitle}>
              {isOverdue
                ? (isWorkerRole ? t('activity.schedule.whyUrgentLabel') : t('activity.schedule.whyNowLabel'))
                : t('activity.schedule.whyNowLabel')}
            </Text>
            <Text style={mt.aiBoxBody}>{activity.aiReason}</Text>
          </View>
        ) : null}
        <TaskProgressBar status={activity.status} daysUntil={activity.daysUntil} />
        <View style={mt.actionBtnRow}>
          <Pressable
            style={[isOverdue ? mt.actionBtnRed : mt.actionBtnGreen, mt.actionBtnFlex]}
            onPress={() => onLogNow(activity)}
            accessibilityRole="button"
          >
            <Text style={mt.actionBtnText}>
              {isOverdue ? t(getLogBtnKey(activity.activityType)) : t('activity.schedule.btn.logDone')}
            </Text>
          </Pressable>
          {hasWorkers && !isWorkerRole && !activity.assignedToWorkerId && (
            <Pressable
              style={mt.assignChip}
              onPress={() => onLogNow(activity)}
              accessibilityRole="button"
            >
              <Text style={mt.assignChipText}>{t('activity.schedule.btn.assign')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderCompletedCard = (activity: ActivityWithDone) => {
    const emoji = resolveActivityEmoji(activity.activityType);
    const isSkipped = activity.status === 'skipped';
    return (
      <View key={activity.id} style={[mt.card, mt.cardGreenLeft, mt.cardDoneOpacity]}>
        <View style={mt.cardRow}>
          <Text style={mt.cardTitle} numberOfLines={1}>
            {isSkipped ? '⏭ ' : '✅ '}{activity.title}
          </Text>
          <View style={isSkipped ? mt.badgeGrey : mt.badgeDone}>
            <Text style={isSkipped ? mt.badgeGreyText : mt.badgeDoneText}>
              {isSkipped ? t('activity.status.skipped') : t('activity.schedule.badge.done')}
            </Text>
          </View>
        </View>
        {(activity.plotName ?? activity.cropName ?? activity.animalName) ? (
          <Text style={mt.cardSub}>
            {[activity.plotName, activity.cropName ?? activity.animalName]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {activity.completedDate ? (
          <Text style={mt.cardSub}>
            {t('activity.schedule.completedOnDate', {
              date: formatShortDate(activity.completedDate),
            })}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderUpcomingCard = (activity: ActivityWithDone) => {
    const emoji = resolveActivityEmoji(activity.activityType);
    return (
      <View key={activity.id} style={[mt.card, mt.cardGreyLeft]}>
        <View style={mt.cardRow}>
          <Text style={mt.cardTitle} numberOfLines={1}>
            {emoji} {activity.title}
          </Text>
          <View style={mt.badgeBlue}>
            <Text style={mt.badgeBlueText}>{formatShortDate(activity.scheduledDate)}</Text>
          </View>
        </View>
        {(activity.plotName ?? activity.cropName ?? activity.animalName) ? (
          <Text style={mt.cardSub}>
            {[activity.plotName, activity.cropName ?? activity.animalName]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {activity.aiReason ? (
          <View style={mt.aiBox}>
            <Text style={mt.aiBoxTitle}>{t('activity.schedule.whyThenLabel')}</Text>
            <Text style={mt.aiBoxBody}>{activity.aiReason}</Text>
          </View>
        ) : null}
        <TaskProgressBar status={activity.status} daysUntil={activity.daysUntil} />
        <View style={mt.actionBtnRow}>
          <Pressable
            style={[mt.actionBtnOutline, mt.actionBtnFlex]}
            onPress={() => onLogNow(activity)}
            accessibilityRole="button"
          >
            <Text style={mt.actionBtnOutlineText}>{t('activity.schedule.btn.logEarly')}</Text>
          </Pressable>
          {hasWorkers && !isWorkerRole && !activity.assignedToWorkerId && (
            <Pressable
              style={mt.assignChip}
              onPress={() => onLogNow(activity)}
              accessibilityRole="button"
            >
              <Text style={mt.assignChipText}>{t('activity.schedule.btn.assign')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const hasCompleted =
    completedToday.length > 0 || completedThisWeek.length > 0 || completedThisMonth.length > 0;

  return (
    <ScrollView contentContainerStyle={mt.scrollPad}>

      {/* ── GROUP 1: PENDING TASKS (overdue + today) ── */}
      {pending.length > 0 && (
        <View style={mt.groupBlock}>
          <View style={mt.groupHeader}>
            <Text style={mt.groupHeaderText}>{t('farm.schedule.groupPending')}</Text>
            <View style={mt.groupCountBadge}>
              <Text style={mt.groupCountText}>{pending.length}</Text>
            </View>
          </View>
          {pending.map(renderPendingCard)}
        </View>
      )}

      {/* ── GROUP 2: COMPLETED TASKS ── */}
      {hasCompleted && (
        <View style={mt.groupBlock}>
          <View style={mt.groupHeader}>
            <Text style={mt.groupHeaderText}>{t('farm.schedule.groupCompleted')}</Text>
            <View style={[mt.groupCountBadge, mt.groupCountBadgeGreen]}>
              <Text style={mt.groupCountText}>{completedActs.length}</Text>
            </View>
          </View>
          {completedToday.length > 0 && (
            <>
              <Text style={mt.subGroupLabel}>{t('farm.schedule.subToday')}</Text>
              {completedToday.map(renderCompletedCard)}
            </>
          )}
          {completedThisWeek.length > 0 && (
            <>
              <Text style={mt.subGroupLabel}>{t('farm.schedule.subThisWeek')}</Text>
              {completedThisWeek.map(renderCompletedCard)}
            </>
          )}
          {completedThisMonth.length > 0 && (
            <>
              <Text style={mt.subGroupLabel}>{t('farm.schedule.subThisMonth')}</Text>
              {completedThisMonth.map(renderCompletedCard)}
            </>
          )}
        </View>
      )}

      {/* ── GROUP 3: UPCOMING TASKS (this week + later) ── */}
      {upcoming.length > 0 && (
        <View style={mt.groupBlock}>
          <View style={mt.groupHeader}>
            <Text style={mt.groupHeaderText}>{t('farm.schedule.groupUpcoming')}</Text>
            <View style={[mt.groupCountBadge, mt.groupCountBadgeBlue]}>
              <Text style={mt.groupCountText}>{upcoming.length}</Text>
            </View>
          </View>
          {upcoming.map(renderUpcomingCard)}
        </View>
      )}
    </ScrollView>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  farm,
  scheduleActs,
  animalCount,
  workerCount,
  overdueCount,
  onSwitchToTasks,
}: {
  farm: Farm;
  scheduleActs: ScheduledActivity[];
  animalCount: number;
  workerCount: number;
  overdueCount: number;
  onSwitchToTasks: () => void;
}) {
  const { t } = useTranslation();
  const extFarm = farm as ExtendedFarm;
  const healthScore = extFarm.healthScore !== undefined ? `${extFarm.healthScore}%` : '--';

  const cropCount = useMemo(
    () =>
      farm.farmType === 'animal'
        ? animalCount
        : (farm.plots ?? []).filter((p) => p.currentCrop).length,
    [farm, animalCount],
  );

  // Group schedule activities by crop/animal name for care cards
  const careGroups = useMemo((): CropGroup[] => {
    const map = new Map<string, ScheduledActivity[]>();
    for (const act of scheduleActs) {
      const key = act.cropName ?? act.animalName ?? 'General';
      const bucket = map.get(key) ?? [];
      bucket.push(act);
      map.set(key, bucket);
    }
    return Array.from(map.entries()).map(([name, acts]) => ({
      name,
      urgency: acts.some((a) => a.status === 'overdue') ? 'urgent' : 'on-track',
      overdueActs: acts.filter((a) => a.status === 'overdue'),
      upcomingActs: acts.filter((a) => a.status !== 'overdue'),
    }));
  }, [scheduleActs]);

  return (
    <View>
      {/* A. Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={[styles.statVal, styles.statValGreen]}>{healthScore}</Text>
          <Text style={styles.statSubLabel}>{t('farm.profile.stat.health')}</Text>
        </View>
        <View style={styles.statDivLine} />
        <View style={styles.statCell}>
          <Text style={[styles.statVal, styles.statValAmber]}>{overdueCount}</Text>
          <Text style={styles.statSubLabel}>{t('farm.profile.stat.overdue')}</Text>
        </View>
        <View style={styles.statDivLine} />
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{cropCount}</Text>
          <Text style={styles.statSubLabel}>{t('farm.stat.crops')}</Text>
        </View>
        <View style={styles.statDivLine} />
        <View style={styles.statCell}>
          <Text style={styles.statVal}>{workerCount}</Text>
          <Text style={styles.statSubLabel}>{t('farm.stat.workers')}</Text>
        </View>
      </View>

      {/* B. Map Thumbnail */}
      <View style={styles.mapThumbWrap}>
        <View style={styles.mapThumb}>
          <Text style={styles.mapThumbPin}>📍</Text>
          <View style={styles.mapThumbOverlay}>
            <Text style={styles.mapThumbOverlayText}>
              {farm.county} · {farm.areaAcres} acres
            </Text>
          </View>
        </View>
      </View>

      {/* C. AI Care Cards header */}
      <Text style={styles.sectionHeaderLabel}>{t('farm.care.title')}</Text>

      {/* D. Care Cards */}
      <View style={styles.careCardsWrap}>
        {careGroups.length === 0 ? (
          <View style={styles.careEmpty}>
            <Text style={styles.careEmptyText}>{t('farm.schedule.allCaughtUp')}</Text>
          </View>
        ) : (
          careGroups.map((group) =>
            group.urgency === 'urgent' ? (
              <UrgentCareCard
                key={group.name}
                group={group}
                onLogNow={onSwitchToTasks}
              />
            ) : (
              <OnTrackCareCard key={group.name} group={group} />
            ),
          )
        )}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function FarmProfileScreen({ navigation, route }: Props) {
  const { farmId: initialFarmId, initialTab } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const user = useAuthStore((s) => s.user);
  const isWorker = user?.role === 'farm_worker';
  const canManage = !isWorker;

  const setActiveFarmId = useFarmStore((s) => s.setActiveFarmId);
  const [farmId, setFarmId] = useState(initialFarmId);
  const [activeTab, setActiveTab] = useState<ProfileTab>(
    initialTab ?? (isWorker ? 'my_tasks' : 'overview'),
  );
  const [selectedActivity, setSelectedActivity] = useState<ScheduledActivity | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: farm, isLoading, isError, refetch } = useFarm(farmId);
  const scheduleQ = useFarmSchedule(farmId);
  const workersQ = useFarmWorkers(farmId);
  const animalsQ = useFarmAnimals(farmId);
  const allFarmsQ = useFarms(1, 50);

  const allFarms = (allFarmsQ.data?.data ?? []) as Farm[];
  const workers = (workersQ.data?.data ?? []) as FarmWorker[];
  const animalCount = animalsQ.data?.data?.length ?? 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), scheduleQ.refetch(), workersQ.refetch(), animalsQ.refetch()]);
    setRefreshing(false);
  }, [refetch, scheduleQ, workersQ, animalsQ]);

  const myTaskCount = useMemo(
    () => workers.find((w) => w.userId === user?.id)?.assignedTaskCount ?? 0,
    [workers, user],
  );

  const tabs = useMemo(() => {
    if (isWorker) return [];
    return [
      { key: 'overview' as ProfileTab, label: t('farm.profile.tab.overview') },
      { key: 'my_tasks' as ProfileTab, label: t('farm.profile.tab.myTasks') },
      { key: 'workers' as ProfileTab, label: t('farm.profile.tab.workers') },
    ];
  }, [isWorker, t]);

  const scheduleActs = useMemo(
    () => (scheduleQ.data?.data ?? []) as ScheduledActivity[],
    [scheduleQ.data],
  );

  const overdueCount = useMemo(
    () => scheduleActs.filter((a) => a.status === 'overdue').length,
    [scheduleActs],
  );

  if (isLoading) return <LoadingScreen />;
  if (isError || !farm) return <ErrorScreen onRetry={refetch} />;

  const handleBack = () => {
    if (activeTab === 'overview') {
      navigation.goBack();
    } else {
      setActiveTab('overview');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
      {!isOnline && <OfflineBanner />}

      {isWorker ? (
        <WorkerTopBar
          farmName={farm.name}
          workerName={user?.fullName ?? ''}
        />
      ) : (
        <TopBar
          farm={farm}
          allFarms={allFarms}
          activeTab={activeTab}
          onBack={handleBack}
          onSwitchFarm={(id) => { setFarmId(id); setActiveFarmId(id); }}
          onAddActivity={() => navigation.navigate('ActivityForm', { farmId })}
          onEditFarm={() => navigation.navigate('EditFarmScreen', { farmId })}
        />
      )}

      {isWorker ? (
        <View style={styles.workerBanner}>
          <View style={styles.workerRoleBadge}>
            <Text style={styles.workerRoleBadgeText}>
              {WORKER_ROLE_LABELS[user?.workerRole ?? ''] ?? t('farm.workers.role.worker')}
            </Text>
          </View>
          <Text style={styles.workerBannerCount}>
            {t('farm.workers.tasksAssigned', { count: myTaskCount })}
          </Text>
        </View>
      ) : (
        <SubTabs
          active={activeTab}
          tabs={tabs}
          overdueCount={overdueCount}
          onChange={setActiveTab}
        />
      )}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1A6B3C']}
              tintColor="#1A6B3C"
            />
          }
        >
          <OverviewTab
            farm={farm}
            scheduleActs={scheduleActs}
            animalCount={animalCount}
            workerCount={workers.length}
            overdueCount={overdueCount}
            onSwitchToTasks={() => setActiveTab('my_tasks')}
          />
        </ScrollView>
      )}

      {/* ── MY TASKS TAB ── */}
      {(activeTab === 'my_tasks' || isWorker) && (
        <View style={styles.flex}>
          <MyTasksTab
            farmId={farmId}
            currentUserId={user?.id ?? ''}
            isWorkerRole={isWorker}
            hasWorkers={workers.length > 0}
            onLogNow={setSelectedActivity}
          />
        </View>
      )}

      {/* ── WORKERS TAB ── */}
      {activeTab === 'workers' && (
        <View style={styles.flex}>
          <WorkersTab
            workers={workers}
            farmName={farm.name}
          />
        </View>
      )}

      <ActivityLogModal
        farmId={farmId}
        activity={selectedActivity}
        workers={workers}
        isWorkerRole={isWorker}
        onSuccess={() => setSelectedActivity(null)}
        onClose={() => setSelectedActivity(null)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  // TopBar
  topBar: {
    backgroundColor: '#1A6B3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'space-between',
  },
  topBarBack:       { minHeight: 44, minWidth: 60, justifyContent: 'center' },
  topBarBackText:   { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  topBarTitle:      { fontSize: 13, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center' },
  topBarMenu:       { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  topBarMenuIcon:   { fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  topBarManageText: { fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  // SubTabs
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  subTab: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 0,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'flex-end',
  },
  subTabInner:      { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  subTabText:       { fontSize: 9, color: '#6B7280' },
  subTabTextActive: { color: '#1A6B3C', fontWeight: '600' },
  subTabIndicator:  { height: 2, backgroundColor: '#1A6B3C', borderRadius: 1, alignSelf: 'stretch' },
  tabBadge:     { backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 4, marginLeft: 3, minWidth: 14, alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 7, fontWeight: '700' },

  scrollContent: { paddingBottom: 80 },
  tabCenter:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText:   { fontSize: 11, color: '#6B7280' },
  allCaughtUp:   { fontSize: 11, color: '#1A6B3C', textAlign: 'center' },

  // Overview — Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statCell:      { flex: 1, alignItems: 'center' },
  statVal:       { fontSize: 14, fontWeight: '700', color: '#111827' },
  statValGreen:  { color: '#1A6B3C' },
  statValAmber:  { color: '#D97706' },
  statSubLabel:  { fontSize: 8, color: '#6B7280', marginTop: 1 },
  statDivLine:   { width: 1, height: 30, backgroundColor: '#E5E7EB', alignSelf: 'center' },

  // Overview — Map Thumbnail
  mapThumbWrap:        { paddingHorizontal: 11, marginBottom: 7 },
  mapThumb:            {
    height: 60,
    borderRadius: 6,
    backgroundColor: '#BBF7D0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapThumbPin:         { fontSize: 18 },
  mapThumbOverlay:     {
    position: 'absolute',
    bottom: 5,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  mapThumbOverlayText: { color: '#fff', fontSize: 8 },

  // Section header
  sectionHeaderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 5,
    marginHorizontal: 11,
  },
  sectionHeader: {
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
    marginTop: 4,
  },
  sectionHeaderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Care Cards wrapper
  careCardsWrap: { paddingHorizontal: 11, paddingBottom: 16 },
  careEmpty:     { paddingVertical: 16, alignItems: 'center' },
  careEmptyText: { fontSize: 11, color: '#1A6B3C', textAlign: 'center' },

  // Care Card base
  careCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 8,
  },
  careCardUrgent:  { borderColor: '#DC2626' },
  careCardOnTrack: { borderColor: '#D97706' },

  careCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  careCardTitle: { fontSize: 10, fontWeight: '700', color: '#111827', flex: 1 },
  careBadgeText: { fontSize: 8, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2 },

  careRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  careRowBorder: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  careRowEmoji:  { fontSize: 14 },
  careRowBody:   { flex: 1, marginLeft: 4 },
  careRowTitle:  { fontSize: 9, fontWeight: '600', color: '#111827' },
  careRowSub:    { fontSize: 8, color: '#6B7280' },

  aiReasonBox:  {
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 4,
  },
  aiReasonText: { fontSize: 9, color: '#374151' },

  progressTrack:   { height: 4, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFillRed: { height: 4, width: '100%', backgroundColor: '#DC2626' },

  careLogBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingVertical: 6,
    marginTop: 5,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  careLogBtnText: { color: '#fff', fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // Shared badges
  badgeRed:       { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTextRed:   { color: '#991B1B' },
  badgeAmber:     { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTextAmber: { color: '#92400E' },
  badgeBlue:      { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTextBlue:  { color: '#1E40AF' },
  badgeGreen:     { backgroundColor: '#EAF4EE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTextGreen: { color: '#0D4A28' },
  badgeGrey:      { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTextGrey:  { color: '#374151' },

  actBadge:     { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  actBadgeText: { fontSize: 8, fontWeight: '700' },

  // Activity card (My Tasks)
  actCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D1D5DB',
    padding: 10,
    marginBottom: 6,
  },
  actCardRed:        { borderLeftColor: '#DC2626', backgroundColor: '#FFF9F9' },
  actCardAmber:      { borderLeftColor: '#D97706', backgroundColor: '#FFFBF0' },
  actCardRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  actCardTitle:      { fontSize: 11, fontWeight: '600', color: '#111827', flex: 1, marginRight: 6 },
  actCardSub:        { fontSize: 9, color: '#6B7280', marginBottom: 2 },
  actCardWorker:     { fontSize: 9, color: '#0E7490', marginTop: 2 },
  actCardUnassigned: { fontSize: 9, color: '#9CA3AF', marginTop: 2 },

  logNowBtn: {
    marginTop: 8,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  logNowBtnRed:   { backgroundColor: '#DC2626' },
  logNowBtnAmber: { backgroundColor: '#D97706' },
  logNowBtnText:  { fontSize: 10, fontWeight: '600', color: '#fff' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    left: 16,
    backgroundColor: '#1A6B3C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  fabText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Worker role banner (farm_worker view)
  workerBanner: {
    backgroundColor: '#CFFAFE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  workerRoleBadge: {
    borderWidth: 1,
    borderColor: '#0E7490',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#CFFAFE',
  },
  workerRoleBadgeText: { fontSize: 8, fontWeight: '600', color: '#0E7490' },
  workerBannerCount:   { fontSize: 9, color: '#0E7490' },
});

// ─── My Tasks Tab Styles ──────────────────────────────────────────────────────

const mt = StyleSheet.create({
  scrollPad: { padding: 11, paddingBottom: 88 },

  // ── Group block ────────────────────────────────────────────────────────────
  groupBlock: {
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  groupHeaderText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  groupCountBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  groupCountBadgeGreen: { backgroundColor: '#1A6B3C' },
  groupCountBadgeBlue:  { backgroundColor: '#1D4ED8' },
  groupCountText: { fontSize: 8, fontWeight: '700', color: '#fff' },

  // Sub-group label (Today / This Week / This Month inside Completed)
  subGroupLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 4,
  },

  // Pending cards (replaces overdueCard / today card)
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 7,
    padding: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  pendingCardRed:   { borderColor: '#DC2626', backgroundColor: '#FFF9F9' },
  pendingCardAmber: { borderColor: '#D97706', backgroundColor: '#FFFDF0' },

  // Keep for legacy references (overview urgent care card)
  overdueContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  overdueSectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 5,
  },
  overdueCard: {
    backgroundColor: '#fff',
    borderRadius: 7,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DC2626',
    marginBottom: 5,
  },

  // Shared future/done card
  card: {
    backgroundColor: '#fff',
    borderRadius: 7,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 7,
  },
  cardAmberLeft:   { borderLeftWidth: 3, borderLeftColor: '#D97706' },
  cardGreyLeft:    { borderLeftWidth: 3, borderLeftColor: '#E5E7EB' },
  cardGreenLeft:   { borderLeftWidth: 3, borderLeftColor: '#1A6B3C' },
  cardDoneOpacity: { opacity: 0.7 },

  // Card internals
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardTitle: { fontSize: 10, fontWeight: '600', color: '#111827', flex: 1, marginRight: 6 },
  cardSub:   { fontSize: 8, color: '#6B7280', marginTop: 2 },

  // Badges
  badgeLate:      { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeLateText:  { fontSize: 8, fontWeight: '600', color: '#991B1B' },
  badgeToday:     { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTodayText: { fontSize: 8, fontWeight: '700', color: '#92400E' },
  badgeBlue:      { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeBlueText:  { fontSize: 8, fontWeight: '600', color: '#1E40AF' },
  badgeDone:      { backgroundColor: '#EAF4EE', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeDoneText:  { fontSize: 8, fontWeight: '600', color: '#0D4A28' },
  badgeGrey:      { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGreyText:  { fontSize: 8, fontWeight: '600', color: '#6B7280' },

  // Worker chip
  workerChip: {
    backgroundColor: '#CFFAFE',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  workerInitialCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0E7490',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerInitialText: { fontSize: 7, fontWeight: '700', color: '#fff' },
  workerChipLabel:   { fontSize: 8, fontWeight: '600', color: '#0E7490' },

  // AI reasoning box
  aiBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 5,
    padding: 7,
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#EAF4EE',
  },
  aiBoxTitle: { fontSize: 9, fontWeight: '700', color: '#1A6B3C' },
  aiBoxBody:  { fontSize: 9, color: '#374151', lineHeight: 14 },

  // AI collapse toggle (This Week cards)
  aiToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 28,
  },
  aiToggleText: { fontSize: 9, color: '#1A6B3C' },

  // Progress bar
  progressTrack: {
    flexDirection: 'row',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginTop: 6,
    marginBottom: 2,
  },

  // Action buttons
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  actionBtnFlex: { flex: 1 },
  actionBtnRed: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  actionBtnGreen: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  actionBtnOutlineText: { fontSize: 10, fontWeight: '600', color: '#1A6B3C' },
  actionBtnText: { fontSize: 10, fontWeight: '600', color: '#fff' },

  // Quick assign chip
  assignChip: {
    borderWidth: 1,
    borderColor: '#1A6B3C',
    borderRadius: 6,
    paddingHorizontal: 10,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAF4EE',
  },
  assignChipText: { fontSize: 9, fontWeight: '600', color: '#0D4A28' },

  // Section label (day header / section title)
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 5,
  },
});

// ─── Workers Tab Styles ───────────────────────────────────────────────────────

const wt = StyleSheet.create({
  scroll:     { padding: 11, paddingBottom: 80 },
  infoAlert: {
    backgroundColor: '#DBEAFE',
    borderLeftWidth: 3,
    borderLeftColor: '#1D4ED8',
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 10,
  },
  infoAlertText: { fontSize: 9, color: '#1D4ED8' },
  workerCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  workerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  workerInfo:  { flex: 1 },
  workerName:  { fontSize: 11, fontWeight: '600', color: '#111827' },
  workerPhone: { fontSize: 9, color: '#6B7280', marginTop: 1 },
  roleBadge:   { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  roleBadgeText: { fontSize: 8, fontWeight: '600' },
  workerRight: { alignItems: 'flex-end' },
  activeLabel: { fontSize: 8, fontWeight: '600' },
  taskCount:   { fontSize: 8, color: '#6B7280', marginTop: 2 },

  distCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  distTitle:      { fontSize: 10, fontWeight: '600', color: '#111827', marginBottom: 6 },
  distSub:        { fontSize: 9, color: '#6B7280', marginBottom: 8 },
  distRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  distRowBorder:  { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  distAvatar:     { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  distAvatarText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  distName:       { fontSize: 9, fontWeight: '600', flex: 1 },
  distTaskCount:  { fontSize: 9, fontWeight: '700', color: '#1A6B3C' },

  webCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  webCardTitle: { fontSize: 10, fontWeight: '600', color: '#1A6B3C', marginBottom: 3 },
  webCardSub:   { fontSize: 8, color: '#6B7280' },
});

// ─── Farm Switcher Modal Styles ───────────────────────────────────────────────

const sw = StyleSheet.create({
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
  title:    { fontSize: 15, fontWeight: '600', color: '#fff' },
  closeBtn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  itemBorder:     { borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  itemActive:     { backgroundColor: '#F0FDF4' },
  itemContent:    { flex: 1 },
  itemName:       { fontSize: 13, fontWeight: '600', color: '#111827' },
  itemNameActive: { color: '#1A6B3C' },
  itemMeta:       { fontSize: 10, color: '#6B7280', marginTop: 2 },
  checkmark:      { fontSize: 16, color: '#1A6B3C', fontWeight: '700' },
});
