import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FABProps {
  onPress: () => void;
  label?: string;
  accessibilityLabel?: string;
}

// Circular icon button — label is meant to be a single glyph (default "+").
// Pass accessibilityLabel for a descriptive screen-reader name when the
// visual label alone (e.g. "+") isn't self-explanatory.
export function FAB({ onPress, label = '+', accessibilityLabel }: FABProps) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        style={styles.fab}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '400',
  },
});
