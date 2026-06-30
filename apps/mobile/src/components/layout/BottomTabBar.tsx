import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type TabId = 'home' | 'farm' | 'finance' | 'stock' | 'me';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'home',    icon: '🏠', label: 'Home' },
  { id: 'farm',    icon: '🌾', label: 'Farm' },
  { id: 'finance', icon: '💰', label: 'Finance' },
  { id: 'stock',   icon: '📦', label: 'Stock' },
  { id: 'me',      icon: '👤', label: 'Me' },
];

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <View style={styles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={styles.tab}
            onPress={() => onTabChange(tab.id)}
          >
            <Text style={styles.icon}>{tab.icon}</Text>
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 9,
    marginTop: 2,
  },
  labelActive: {
    color: '#1A6B3C',
    fontWeight: '600',
  },
  labelInactive: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
});
