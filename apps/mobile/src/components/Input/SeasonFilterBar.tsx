import React, { useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';

interface SeasonFilterBarProps {
  selectedSeason: number;
  onSelect: (year: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 4 + i);

export function SeasonFilterBar({ selectedSeason, onSelect }: SeasonFilterBarProps) {
  const listRef = useRef<FlatList>(null);
  return (
    <FlatList
      ref={listRef}
      horizontal
      data={YEARS}
      keyExtractor={(y) => String(y)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.yearBtn, selectedSeason === item && styles.yearBtnSelected]}
          onPress={() => onSelect(item)}
        >
          <Text style={[styles.yearText, selectedSeason === item && styles.yearTextSelected]}>
            {item}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  yearBtn: {
    minWidth: 64,
    minHeight: 36,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearBtnSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  yearText: { fontSize: 15, color: '#555555', fontWeight: '600' },
  yearTextSelected: { color: '#2E7D32' },
});
