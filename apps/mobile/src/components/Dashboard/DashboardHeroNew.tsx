import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface DashboardHeroNewProps {
  farmerName: string;
  setupStep: number;
  onSetup: () => void;
}

const TOTAL_STEPS = 4;

export function DashboardHeroNew({
  farmerName,
  setupStep,
  onSetup,
}: DashboardHeroNewProps) {
  const { t } = useTranslation();
  const firstName = farmerName.split(' ')[0] ?? farmerName;
  const pct = Math.round((setupStep / TOTAL_STEPS) * 100);

  return (
    <LinearGradient
      colors={['#0D4A28', '#1A6B3C', '#2E8B57']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.container}
    >
      <Text style={s.title}>
        {t('dashboard.new.welcome', { name: firstName })}
      </Text>
      <Text style={s.subtitle}>{t('dashboard.new.subtitle')}</Text>

      <View style={s.progressBlock}>
        <View style={s.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                s.step,
                i < setupStep && s.stepDone,
                i === setupStep && s.stepCurrent,
                i > setupStep && s.stepFuture,
              ]}
            />
          ))}
        </View>
        <Text style={s.pct}>{pct}% {t('dashboard.new.complete')}</Text>
      </View>

      <Pressable
        onPress={onSetup}
        style={s.ctaBtn}
        accessibilityRole="button"
      >
        <Text style={s.ctaText}>{t('dashboard.new.cta')}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  progressBlock: {
    marginBottom: 14,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  step: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepDone: { backgroundColor: '#1A6B3C' },
  stepCurrent: { backgroundColor: '#C9A84C' },
  stepFuture: { backgroundColor: 'rgba(255,255,255,0.25)' },
  pct: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  ctaBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A6B3C',
  },
});
