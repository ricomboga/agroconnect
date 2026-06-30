import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'teal';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

type ColorConfig = { bg: string; text: string };

const COLOR_MAP: Record<BadgeVariant, ColorConfig> = {
  green:  { bg: '#EAF4EE', text: '#0D4A28' },
  amber:  { bg: '#FEF3C7', text: '#92400E' },
  red:    { bg: '#FEE2E2', text: '#991B1B' },
  blue:   { bg: '#DBEAFE', text: '#1E40AF' },
  purple: { bg: '#F3E8FF', text: '#6B21A8' },
  teal:   { bg: '#CFFAFE', text: '#0E7490' },
};

export function Badge({ label, variant }: BadgeProps) {
  const { bg, text } = COLOR_MAP[variant];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 8,
    fontWeight: '600',
  },
});
