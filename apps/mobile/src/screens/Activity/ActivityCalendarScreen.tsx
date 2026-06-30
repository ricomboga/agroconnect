import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useActivities } from '../../hooks/useActivities';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { EmptyState } from '../../components/Common/EmptyState';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { UssdInfoBanner } from '../../components/Common/UssdInfoBanner';
import { FAB } from '../../components/Common/FAB';
import { ActivityCalendarDay } from '../../components/Activity/ActivityCalendarDay';
import { ActivityListItem } from '../../components/Activity/ActivityListItem';
import type { Activity } from '../../api/activity';

type Props = NativeStackScreenProps<FarmStackParamList, 'ActivityCalendar'>;

function monthBounds(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    daysInMonth: to.getDate(),
    firstDayOfWeek: from.getDay(),
  };
}

export function ActivityCalendarScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { fromDate, toDate, daysInMonth, firstDayOfWeek } = monthBounds(year, month);
  const { data, isLoading, isError, refetch } = useActivities({ farmId, fromDate, toDate });

  const activities: Activity[] = data?.data ?? [];

  const activitiesByDay = useMemo(() => {
    const map: Record<number, Activity[]> = {};
    for (const a of activities) {
      const d = new Date(a.scheduledDate).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(a);
    }
    return map;
  }, [activities]);

  const selectedActivities = selectedDay !== null ? (activitiesByDay[selectedDay] ?? []) : [];

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  const cells: (number | null)[] = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  if (activities.length === 0 && selectedDay === null) {
    return (
      <View style={styles.flex}>
        {!isOnline && <OfflineBanner />}
        <UssdInfoBanner dismissKey="ussd_calendar_dismissed" />
        <EmptyState
          title={t('activity.calendar.empty.title')}
          body={t('activity.calendar.empty.body')}
          ctaLabel={t('activity.calendar.empty.cta')}
          onCta={() => navigation.navigate('ActivityForm', { farmId })}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {!isOnline && <OfflineBanner />}
      <UssdInfoBanner dismissKey="ussd_calendar_dismissed" />

      <View style={styles.nav}>
        <Pressable style={styles.navBtn} onPress={prevMonth}>
          <Text style={styles.navBtnText}>{t('activity.calendar.monthNav.prev')}</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{`${t(`activity.calendar.month.${month}`)} ${year}`}</Text>
        <Pressable style={styles.navBtn} onPress={nextMonth}>
          <Text style={styles.navBtnText}>{t('activity.calendar.monthNav.next')}</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {cells.map((day, idx) => (
          <ActivityCalendarDay
            key={idx}
            day={day}
            activities={day !== null ? (activitiesByDay[day] ?? []) : []}
            isToday={day === today.getDate() && month === today.getMonth() && year === today.getFullYear()}
            isSelected={day === selectedDay}
            onPress={() => setSelectedDay(day)}
          />
        ))}
      </View>

      {selectedDay !== null && (
        <FlatList
          data={selectedActivities}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ActivityListItem
              activity={item}
              onPress={() => navigation.navigate('ActivityLogModal', { farmId, activityId: item.id })}
            />
          )}
          style={styles.tray}
          ListEmptyComponent={
            <Text style={styles.emptyTray}>{t('activity.calendar.empty.title')}</Text>
          }
        />
      )}
      <FAB onPress={() => navigation.navigate('ActivityForm', { farmId })} label="+" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  navBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  navBtnText: { fontSize: 22, color: '#2E7D32' },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1B1B1B' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  tray: { flex: 1, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  emptyTray: { padding: 16, color: '#9E9E9E', textAlign: 'center' },
});
