import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useDashboardData } from '../../hooks/useDashboardData';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { FAB } from '../../components/Common/FAB';
import { DashboardHero } from '../../components/Dashboard/DashboardHero';
import { StreakBar } from '../../components/Dashboard/StreakBar';
import { AiNudgeSection, type Nudge } from '../../components/Dashboard/AiNudgeSection';
import { PriceAlertBanner } from '../../components/Dashboard/PriceAlertBanner';
import { QuickActionsGrid, type QuickAction } from '../../components/Dashboard/QuickActionsGrid';
import { MiniAnalytics } from '../../components/Dashboard/MiniAnalytics';
import { LockedCard } from '../../components/Dashboard/LockedCard';
import { InventorySummaryWidget } from '../../components/widgets/InventorySummaryWidget';
import { WeatherWidget } from '../../components/Dashboard/WeatherWidget';
import { FinanceSnapshotCard } from '../../components/Dashboard/FinanceSnapshotCard';
import { InventoryAlertCard } from '../../components/Dashboard/InventoryAlertCard';
import { NotificationsModal } from '../../components/Dashboard/NotificationsModal';
import { useNotifications } from '../../hooks/useNotifications';
import { useUiStore } from '../../store/ui.store';
import type { AppTabParamList } from '../../navigation/types';
import type { Activity } from '../../api/activity';

type DashboardNav = BottomTabNavigationProp<AppTabParamList, 'Home'>;

function buildNudges(
  overdue: Activity[],
  upcoming: Activity[],
  goToActivity: (farmId: string, activityId?: string) => void,
  farmId: string,
): Nudge[] {
  const nudges: Nudge[] = [];

  for (const a of overdue.slice(0, 2)) {
    const daysLate = a.scheduledDate
      ? Math.floor((Date.now() - new Date(a.scheduledDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    nudges.push({
      id: a.id,
      type: 'urgent',
      icon: a.type === 'irrigation' ? '💧' : a.type === 'pesticide' ? '🌿' : '⚠️',
      textKey: 'dashboard.nudge.overdueTask',
      textParams: { type: a.type, days: daysLate },
      actionKey: 'dashboard.nudge.logNow',
      onAction: () => goToActivity(farmId, a.id),
    });
  }

  for (const a of upcoming.slice(0, 3 - nudges.length)) {
    const daysUntil = a.scheduledDate
      ? Math.floor((new Date(a.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;
    const type = daysUntil <= 2 ? ('soon' as const) : ('upcoming' as const);
    nudges.push({
      id: a.id,
      type,
      icon: a.type === 'fertilising' ? '🌱' : a.type === 'pesticide' ? '🌿' : '📋',
      textKey: 'dashboard.nudge.upcomingTask',
      textParams: { type: a.type, days: daysUntil },
      actionKey: 'dashboard.nudge.schedule',
      onAction: () => goToActivity(farmId, a.id),
    });
  }

  return nudges;
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<DashboardNav>();
  const user = useAuthStore((s) => s.user);
  const { isOnline } = useOfflineSync();
  const dash = useDashboardData();
  const { unreadCount } = useNotifications();
  const showToast = useUiStore((st) => st.showToast);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const hasSnippeted = useRef(false);

  useEffect(() => {
    if (!hasSnippeted.current && unreadCount > 0) {
      hasSnippeted.current = true;
      showToast(t('dashboard.notifications.snippet', { count: unreadCount }), 'info');
    }
  }, [unreadCount, showToast, t]);

  const goToWeather = useCallback(() => {
    navigation.navigate('Farm', {
      screen: 'WeatherDetail',
      params: {
        lat: dash.primaryFarm?.locationLat,
        lng: dash.primaryFarm?.locationLng,
        county: dash.primaryFarm?.county,
      },
    } as never);
  }, [navigation, dash.primaryFarm]);

  const goToActivity = useCallback(
    (farmId: string, activityId?: string) => {
      navigation.navigate('Farm', {
        screen: 'ActivityForm',
        params: { farmId, activityId },
      } as never);
    },
    [navigation],
  );

  const goToFinance = useCallback(() => {
    navigation.navigate('Finance', { screen: 'FinanceHome' } as never);
  }, [navigation]);

  const goToPriceAlerts = useCallback(() => {
    navigation.navigate('Insights', { screen: 'Insights' } as never);
  }, [navigation]);

  const goToWizard = useCallback(() => {
    navigation.navigate('Farm', { screen: 'FarmList' } as never);
  }, [navigation]);

  const goToFarmList = useCallback(() => {
    navigation.navigate('Farm', { screen: 'FarmList' } as never);
  }, [navigation]);

  const goToDiagnose = useCallback(() => {
    navigation.navigate('Diagnose', { screen: 'DiagnosisHome' } as never);
  }, [navigation]);

  const goToMarket = useCallback(() => {
    navigation.navigate('Market', { screen: 'MarketHome' } as never);
  }, [navigation]);

  const goToInputLog = useCallback(() => {
    if (dash.primaryFarm) {
      navigation.navigate('Farm', {
        screen: 'InputLog',
        params: { farmId: dash.primaryFarm.id },
      } as never);
    }
  }, [navigation, dash.primaryFarm]);

  const goToAddTransaction = useCallback(() => {
    navigation.navigate('Finance', { screen: 'FinanceHome' } as never);
  }, [navigation]);

  if (dash.isLoading) return <LoadingScreen />;
  if (dash.isError) return <ErrorScreen onRetry={dash.refetch} />;

  const farmerName = user?.fullName ?? '';
  const county = user?.county ?? dash.primaryFarm?.county ?? '';
  const farmId = dash.primaryFarm?.id ?? '';

  const nudges = dash.hasData
    ? buildNudges(dash.overdueTasks, dash.upcomingTasks, goToActivity, farmId)
    : [];

  const activeActions: QuickAction[] = [
    {
      id: 'logActivity',
      icon: '📋',
      labelKey: 'dashboard.action.logActivity',
      onPress: () => goToActivity(farmId),
      disabled: !dash.hasData,
    },
    {
      id: 'addTransaction',
      icon: '💸',
      labelKey: 'dashboard.action.addTransaction',
      onPress: goToAddTransaction,
      disabled: !dash.hasData,
    },
    {
      id: 'diagnose',
      icon: '🔬',
      labelKey: 'dashboard.action.diagnose',
      onPress: goToDiagnose,
    },
    {
      id: 'recordStock',
      icon: '📦',
      labelKey: 'dashboard.action.recordStock',
      onPress: goToInputLog,
      disabled: !dash.hasData,
    },
    {
      id: 'viewFarms',
      icon: '🌾',
      labelKey: 'dashboard.action.viewFarms',
      onPress: dash.hasData ? goToFarmList : goToWizard,
    },
    {
      id: 'market',
      icon: '🏪',
      labelKey: 'dashboard.action.market',
      onPress: goToMarket,
    },
  ];

  // ── STATE A: active user with farms ─────────────────────────────────────────
  if (dash.hasData) {
    return (
      <View style={s.flex}>
        <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
        {!isOnline && <OfflineBanner />}

        {/* Header lives OUTSIDE ScrollView — always visible */}
        <DashboardHero
          farmerName={farmerName}
          county={county}
          farmLat={dash.primaryFarm?.locationLat}
          farmLng={dash.primaryFarm?.locationLng}
          netCashFlow={dash.cashFlowNet}
          farmCount={dash.farmCount}
          onWeatherPress={goToWeather}
          onNotificationsPress={() => setNotificationsVisible(true)}
        />

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {dash.streak >= 1 && (
            <StreakBar current={dash.streak} best={dash.bestStreak} />
          )}

          {/* Weather — expanded 5-day forecast */}
          {dash.primaryFarm && (
            <WeatherWidget
              lat={dash.primaryFarm.locationLat ?? -1.286}
              lng={dash.primaryFarm.locationLng ?? 36.817}
              county={county}
              onPress={goToWeather}
            />
          )}

          <AiNudgeSection nudges={nudges} loading={false} />

          {dash.topPriceAlert && (
            <PriceAlertBanner
              crop={dash.topPriceAlert.crop}
              currentPrice={dash.topPriceAlert.priceKes}
              changePercent={dash.topPriceAlert.changePct}
              direction={dash.topPriceAlert.direction}
              onPress={goToPriceAlerts}
            />
          )}

          <QuickActionsGrid actions={activeActions} />

          {/* Finance: bar chart + donut */}
          <FinanceSnapshotCard
            income={dash.cashFlowIncome}
            expenses={dash.cashFlowExpenses}
            net={dash.cashFlowNet}
            monthBars={dash.monthBars}
            onPress={goToFinance}
          />

          {/* Inventory low-stock alerts */}
          <InventoryAlertCard farmId={farmId} />

          <InventorySummaryWidget />

          <MiniAnalytics
            income={dash.cashFlowIncome}
            expenses={dash.cashFlowExpenses}
            net={dash.cashFlowNet}
            periodKey="dashboard.analytics.periodLabel"
            onPressFinance={goToFinance}
            activitiesTotal={dash.activitiesTotal}
            activitiesDone={dash.activitiesDone}
            activitiesPending={dash.activitiesPending}
            activitiesLate={dash.activitiesLate}
            onPressActivities={() => goToActivity(farmId)}
          />
        </ScrollView>

        <FAB onPress={() => goToActivity(farmId)} label="+" />

        <NotificationsModal
          visible={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />
      </View>
    );
  }

  // ── STATE B: new user, no farms ──────────────────────────────────────────────
  return (
    <View style={s.flex}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />
      {!isOnline && <OfflineBanner />}

      {/* Setup header with progress bar — outside ScrollView */}
      <LinearGradient
        colors={['#0D4A28', '#1A6B3C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.newHeader}
      >
        <View style={s.newHeaderTop}>
          <View>
            <Text style={s.greetingLabel}>{t('dashboard.greetingTime')}</Text>
            <Text style={s.greetingName}>{farmerName} 👋</Text>
          </View>
        </View>
        <Text style={s.stepLabel}>
          {t('dashboard.new.step', { n: 1 })} — {t('dashboard.new.subtitle')}
        </Text>
        <View style={s.progressRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                s.progressSeg,
                {
                  backgroundColor:
                    i === 0 ? '#C9A84C' : 'rgba(255,255,255,0.25)',
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={s.flex}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashed add-farm CTA card */}
        <Pressable style={s.dashedCard} onPress={goToWizard} accessibilityRole="button">
          <Text style={s.dashedIcon}>🏡</Text>
          <Text style={s.dashedTitle}>{t('dashboard.locked.addFarm')}</Text>
          <Text style={s.dashedDesc}>
            {t('dashboard.new.setupBody')}
          </Text>
          <View style={s.addFarmBtn}>
            <Text style={s.addFarmBtnText}>➕ {t('dashboard.new.cta')}</Text>
          </View>
        </Pressable>

        <LockedCard
          icon="💰"
          titleKey="dashboard.locked.cashFlow"
          descriptionKey="dashboard.locked.desc"
          ctaKey="dashboard.locked.addFarm"
          onCta={goToWizard}
        />

        <LockedCard
          icon="🤖"
          titleKey="dashboard.locked.aiNudge"
          descriptionKey="dashboard.locked.desc"
          ctaKey="dashboard.locked.addFarm"
          onCta={goToWizard}
        />

        <LockedCard
          icon="⭐"
          titleKey="dashboard.locked.loans"
          descriptionKey="dashboard.locked.desc"
          ctaKey="dashboard.locked.addFarm"
          onCta={goToWizard}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 10, paddingBottom: 80 },
  // State B header
  newHeader: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  newHeaderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  greetingLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  greetingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  stepLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  // Dashed add-farm card
  dashedCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1A6B3C',
    borderRadius: 8,
    backgroundColor: '#EAF4EE',
    alignItems: 'center',
    padding: 18,
    marginBottom: 8,
  },
  dashedIcon: { fontSize: 28, marginBottom: 6 },
  dashedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A6B3C',
    marginBottom: 3,
    textAlign: 'center',
  },
  dashedDesc: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 14,
  },
  addFarmBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  addFarmBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
