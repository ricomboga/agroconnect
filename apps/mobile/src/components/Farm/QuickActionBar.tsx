import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export interface QuickAction {
  key: string;
  labelKey: string;
  onPress: () => void;
}

interface QuickActionBarProps {
  actions: QuickAction[];
}

export function QuickActionBar({ actions }: QuickActionBarProps) {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {actions.map((action) => (
        <Pressable key={action.key} style={styles.action} onPress={action.onPress}>
          <Text style={styles.label}>{t(action.labelKey)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  action: {
    minHeight: 48,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
});
