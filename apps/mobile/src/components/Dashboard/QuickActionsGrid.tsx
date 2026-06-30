import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

export interface QuickAction {
  id: string;
  icon: string;
  labelKey: string;
  onPress: () => void;
  disabled?: boolean;
}

interface QuickActionsGridProps {
  actions: QuickAction[];
}

const TILE_GAP = 8;
const SCREEN_PADDING = 11;
const NUM_COLS = 3;

export function QuickActionsGrid({ actions }: QuickActionsGridProps) {
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;
  const tileSize =
    (screenWidth - SCREEN_PADDING * 2 - TILE_GAP * (NUM_COLS - 1)) / NUM_COLS;

  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>{t('dashboard.actions.title')}</Text>
      <View style={s.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={action.disabled ? undefined : action.onPress}
            style={[
              s.tile,
              { width: tileSize, opacity: action.disabled ? 0.4 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.disabled }}
          >
            <View style={s.iconCircle}>
              <Text style={s.iconEmoji}>{action.icon}</Text>
            </View>
            <Text style={s.label} numberOfLines={2}>
              {t(action.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 11,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF4EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  iconEmoji: { fontSize: 18 },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 12,
  },
});
