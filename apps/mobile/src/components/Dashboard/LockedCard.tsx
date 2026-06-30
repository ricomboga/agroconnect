import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface LockedCardProps {
  icon: string;
  titleKey: string;
  descriptionKey: string;
  ctaKey: string;
  onCta: () => void;
}

export function LockedCard({
  icon,
  titleKey,
  descriptionKey,
  ctaKey,
  onCta,
}: LockedCardProps) {
  const { t } = useTranslation();

  return (
    <View style={s.card}>
      <View style={s.overlay} />
      <View style={s.content}>
        <Text style={s.icon}>{icon}</Text>
        <Text style={s.lockIcon}>🔒</Text>
        <Text style={s.title}>{t(titleKey)}</Text>
        <Text style={s.description}>{t(descriptionKey)}</Text>
        <Pressable
          onPress={onCta}
          style={s.ctaBtn}
          accessibilityRole="button"
        >
          <Text style={s.ctaText}>{t(ctaKey)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginHorizontal: 11,
    marginBottom: 8,
    overflow: 'hidden',
    minHeight: 120,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(249,250,251,0.85)',
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginBottom: 4,
  },
  lockIcon: {
    fontSize: 24,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  description: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 13,
  },
  ctaBtn: {
    borderWidth: 1.5,
    borderColor: '#1A6B3C',
    borderRadius: 6,
    height: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1A6B3C',
  },
});
