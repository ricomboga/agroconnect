import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenTopBarProps {
  title: string;
  showBack?: boolean;
  rightIcon?: string;
  rightAction?: () => void;
}

export function ScreenTopBar({
  title,
  showBack = false,
  rightIcon,
  rightAction,
}: ScreenTopBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.slot}>
        {showBack && (
          <TouchableOpacity onPress={rightAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.centerSlot}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <View style={[styles.slot, styles.rightSlot]}>
        {rightIcon != null && rightAction != null && (
          <TouchableOpacity onPress={rightAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A6B3C',
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
  },
  centerSlot: {
    flex: 2,
    alignItems: 'center',
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  backText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  rightIcon: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
  },
});
