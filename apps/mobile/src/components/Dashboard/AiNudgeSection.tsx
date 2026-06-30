import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

export type NudgeType = 'urgent' | 'soon' | 'upcoming';

export interface Nudge {
  id: string;
  type: NudgeType;
  icon: string;
  textKey: string;
  textParams?: Record<string, string | number>;
  actionKey: string;
  onAction: () => void;
}

interface AiNudgeSectionProps {
  nudges: Nudge[];
  loading: boolean;
}

const BADGE: Record<NudgeType, { bg: string; text: string; labelKey: string }> = {
  urgent: { bg: '#FEE2E2', text: '#991B1B', labelKey: 'dashboard.nudge.urgentBadge' },
  soon:   { bg: '#FEF3C7', text: '#92400E', labelKey: 'dashboard.nudge.soonBadge' },
  upcoming: { bg: '#DBEAFE', text: '#1E40AF', labelKey: 'dashboard.nudge.upcomingBadge' },
};

export function AiNudgeSection({ nudges, loading }: AiNudgeSectionProps) {
  const { t } = useTranslation();

  if (!loading && nudges.length === 0) return null;

  return (
    <View style={s.container}>
      <Text style={s.title}>{t('dashboard.nudge.sectionTitle')}</Text>

      {loading ? (
        <ActivityIndicator size="small" color="#0D4A28" style={{ marginVertical: 8 }} />
      ) : (
        nudges.slice(0, 3).map((nudge) => {
          const badge = BADGE[nudge.type];
          return (
            <View key={nudge.id} style={s.row}>
              <Text style={s.icon}>{nudge.icon}</Text>
              <View style={s.textBlock}>
                <Text style={s.nudgeText} numberOfLines={2}>
                  {t(nudge.textKey, nudge.textParams)}
                </Text>
              </View>
              <View style={[s.badge, { backgroundColor: badge.bg }]}>
                <Text style={[s.badgeText, { color: badge.text }]}>
                  {t(badge.labelKey)}
                </Text>
              </View>
              <Pressable
                onPress={nudge.onAction}
                style={s.actionBtn}
                accessibilityRole="button"
              >
                <Text style={s.actionText}>{t(nudge.actionKey)}</Text>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#EAF4EE',
    borderWidth: 1,
    borderColor: '#2E8B57',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 11,
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0D4A28',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 7,
    gap: 6,
    marginBottom: 4,
  },
  icon: { fontSize: 16 },
  textBlock: { flex: 1 },
  nudgeText: { fontSize: 9, color: '#0D4A28', lineHeight: 13 },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 8, fontWeight: '600' },
  actionBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 9,
    color: '#1A6B3C',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
