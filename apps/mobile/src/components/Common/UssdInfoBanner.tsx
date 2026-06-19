import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useOfflineSync } from '../../hooks/useOfflineSync';

interface UssdInfoBannerProps {
  dismissKey?: string;
}

const DEFAULT_KEY = 'ussd_banner_dismissed';

export function UssdInfoBanner({ dismissKey = DEFAULT_KEY }: UssdInfoBannerProps) {
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(dismissKey).then((val) => {
      setDismissed(val === 'true');
    });
  }, [dismissKey]);

  const handleDismiss = () => {
    setDismissed(true);
    void AsyncStorage.setItem(dismissKey, 'true');
  };

  if (isOnline || dismissed !== false) return null;

  return (
    <View style={s.banner}>
      <Text style={s.text} accessibilityRole="text">
        {t('ussd.banner.text')}
      </Text>
      <Pressable onPress={handleDismiss} style={s.dismissBtn} accessibilityRole="button">
        <Text style={s.dismissText}>{t('ussd.banner.dismiss')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  text:         { flex: 1, fontSize: 13, color: '#4E342E', lineHeight: 18 },
  dismissBtn:   { minHeight: 36, minWidth: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  dismissText:  { fontSize: 12, fontWeight: '700', color: '#5D4037' },
});
