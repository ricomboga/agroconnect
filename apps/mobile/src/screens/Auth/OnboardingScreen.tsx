import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { ScreenTopBar } from '../../components/layout/ScreenTopBar';
import { Button } from '../../components/ui/Button';

const STEP_KEYS = [
  null,           // step 1 — always done
  null,           // step 2 — always done (PIN was just set)
  'onboarding_step_3',
  'onboarding_step_4',
  'onboarding_step_5',
] as const;

const STEP_ICONS = ['🎉', '🔐', '🌾', '📋', '📦'];

export function OnboardingScreen() {
  const { t } = useTranslation();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const user = useAuthStore((s) => s.user);

  const firstName = user?.fullName?.split(' ')[0] ?? '';

  // steps[i] = true means done
  const [steps, setSteps] = useState<[boolean, boolean, boolean, boolean, boolean]>([
    true, true, false, false, false,
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.multiGet(['onboarding_step_3', 'onboarding_step_4', 'onboarding_step_5'])
      .then(([[, s3], [, s4], [, s5]]) => {
        if (!cancelled) {
          setSteps([true, true, s3 !== null, s4 !== null, s5 !== null]);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const doneCount = steps.filter(Boolean).length;

  const handleComplete = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    completeOnboarding();
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenTopBar
        title={t('auth.onboarding.topBarTitle', { name: firstName })}
        rightIcon="→"
        rightAction={() => void handleComplete()}
      />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress bar */}
          {!isLoading && (
            <View style={styles.progressContainer}>
              <View style={styles.stepsRow}>
                {steps.map((done, i) => {
                  const isCurrent = !done && steps.slice(0, i).every(Boolean);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.stepBar,
                        done && styles.stepBarDone,
                        isCurrent && styles.stepBarCurrent,
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.progressLabel}>
                {t('auth.onboarding.progressLabel', { count: doneCount })}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.title}>{t('auth.onboarding.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.onboarding.subtitle')}</Text>

          {/* Achievement items */}
          <View style={styles.achievementsContainer}>
            {steps.map((done, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3 | 4 | 5;
              const isNew = done && i >= 2;
              return (
                <AchievementItem
                  key={i}
                  icon={STEP_ICONS[i]}
                  name={t(`auth.onboarding.step${stepNum}.name`)}
                  sub={t(`auth.onboarding.step${stepNum}.sub`)}
                  done={done}
                  isNew={isNew}
                  newLabel={t('auth.onboarding.newBadge')}
                />
              );
            })}
          </View>

          {/* CTA */}
          <Button
            label={t('auth.onboarding.cta')}
            onPress={() => void handleComplete()}
            variant="primary"
            style={styles.cta}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── AchievementItem ──────────────────────────────────────────────────────────

interface AchievementItemProps {
  icon: string;
  name: string;
  sub: string;
  done: boolean;
  isNew: boolean;
  newLabel: string;
}

function AchievementItem({ icon, name, sub, done, isNew, newLabel }: AchievementItemProps) {
  return (
    <View style={[achieveStyles.row, !done && achieveStyles.locked]}>
      <Text style={achieveStyles.icon}>{icon}</Text>
      <View style={achieveStyles.textBlock}>
        <View style={achieveStyles.nameRow}>
          <Text style={achieveStyles.name}>{name}</Text>
          {isNew && (
            <View style={achieveStyles.newBadge}>
              <Text style={achieveStyles.newBadgeText}>{newLabel}</Text>
            </View>
          )}
        </View>
        <Text style={achieveStyles.sub}>{sub}</Text>
      </View>
      <Text style={[achieveStyles.check, done && achieveStyles.checkDone]}>
        {done ? '✓' : '○'}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },

  // Progress bar
  progressContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  stepBarDone: {
    backgroundColor: '#1A6B3C',
  },
  stepBarCurrent: {
    backgroundColor: '#C9A84C',
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textAlign: 'right',
  },

  // Title / subtitle
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 14,
  },

  // Achievements
  achievementsContainer: {
    gap: 8,
    marginBottom: 20,
  },

  // CTA
  cta: { alignSelf: 'stretch' },
});

const achieveStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  locked: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 20,
  },
  textBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  name: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111827',
  },
  newBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sub: {
    fontSize: 8,
    color: '#6B7280',
  },
  check: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  checkDone: {
    color: '#1A6B3C',
  },
});
