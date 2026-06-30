import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'outline' | 'gold' | 'red';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

type VariantConfig = { bg: string; text: string; borderWidth?: number; borderColor?: string };

const VARIANT_MAP: Record<ButtonVariant, VariantConfig> = {
  primary: { bg: '#1A6B3C', text: '#FFFFFF' },
  outline: { bg: '#FFFFFF', text: '#1A6B3C', borderWidth: 1.5, borderColor: '#1A6B3C' },
  gold:    { bg: '#C9A84C', text: '#FFFFFF' },
  red:     { bg: '#DC2626', text: '#FFFFFF' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { bg, text, borderWidth, borderColor } = VARIANT_MAP[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderWidth: borderWidth ?? 0, borderColor: borderColor ?? 'transparent' },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabledOpacity,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={text} size="small" />
      ) : (
        <Text style={[styles.label, { color: text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    minHeight: 44,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  disabledOpacity: {
    opacity: 0.4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
