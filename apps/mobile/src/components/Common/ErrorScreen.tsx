import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface ErrorScreenProps {
  onRetry: () => void;
  message?: string;
}

export function ErrorScreen({ onRetry, message }: ErrorScreenProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message ?? t('common.error.loadFailed')}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  message: {
    fontSize: 16,
    color: '#B00020',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    minHeight: 48,
    minWidth: 120,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
