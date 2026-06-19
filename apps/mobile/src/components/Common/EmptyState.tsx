import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  body: string;
  ctaLabel: string;
  onCta: () => void;
  illustration?: React.ReactNode;
}

export function EmptyState({ title, body, ctaLabel, onCta, illustration }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable style={styles.button} onPress={onCta}>
        <Text style={styles.buttonText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1B1B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    minHeight: 48,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
