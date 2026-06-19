import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MarketStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MarketStackParamList, 'Cart'>;

export function CartScreen(_: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.center}>
      <Text style={styles.label}>{t('common.comingSoon')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  label: { fontSize: 16, color: '#757575' },
});
