import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const { t } = useTranslation();
  const progress = currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {t('wizard.common.progress', { step: currentStep, total: totalSteps })}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 6,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: '#2E7D32',
  },
});
