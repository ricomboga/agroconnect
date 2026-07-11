import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface NotificationBellProps {
  unreadCount: number;
  onPress: () => void;
}

export function NotificationBell({ unreadCount, onPress }: NotificationBellProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={s.btn}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('dashboard.notifications.bellLabel')}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={s.icon}>🔔</Text>
      {unreadCount > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn:       { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 18 },
  badge:     { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16,
               borderRadius: 8, backgroundColor: '#DC2626', alignItems: 'center',
               justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#0D4A28' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
