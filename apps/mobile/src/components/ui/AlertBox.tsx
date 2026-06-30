import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type AlertVariant = 'green' | 'amber' | 'red' | 'blue';

interface AlertBoxProps {
  message: string;
  variant: AlertVariant;
}

type AlertColors = { bg: string; border: string; text: string };

const COLOR_MAP: Record<AlertVariant, AlertColors> = {
  green: { bg: '#EAF4EE', border: '#1A6B3C', text: '#0D4A28' },
  amber: { bg: '#FEF3C7', border: '#D97706', text: '#78350F' },
  red:   { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' },
  blue:  { bg: '#DBEAFE', border: '#1D4ED8', text: '#1D4ED8' },
};

export function AlertBox({ message, variant }: AlertBoxProps) {
  const { bg, border, text } = COLOR_MAP[variant];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bg, borderLeftColor: border },
      ]}
    >
      <Text style={[styles.message, { color: text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  message: {
    fontSize: 9,
    lineHeight: 14,
  },
});
