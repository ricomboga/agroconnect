import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface WizardStepProps {
  title: string;
  children: React.ReactNode;
}

export function WizardStep({ title, children }: WizardStepProps) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B1B1B',
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
});
