import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type CardVariant = 'default' | 'highlighted' | 'urgent' | 'success';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {},
  highlighted: { borderColor: '#D97706', borderWidth: 1.5 },
  urgent: { borderColor: '#DC2626', borderWidth: 1.5 },
  success: { borderColor: '#1A6B3C', borderWidth: 1.5 },
};

export function Card({ children, variant = 'default', style }: CardProps) {
  return (
    <View style={[styles.base, variantStyles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
