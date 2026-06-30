import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface ProgressBarProps {
  value: number;
  color?: string;
}

function resolveColor(value: number): string {
  if (value >= 80) return '#1A6B3C';
  if (value >= 50) return '#D97706';
  return '#DC2626';
}

export function ProgressBar({ value, color }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const fillColor = color ?? resolveColor(clampedValue);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [clampedValue, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fill, { width: animatedWidth, backgroundColor: fillColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
