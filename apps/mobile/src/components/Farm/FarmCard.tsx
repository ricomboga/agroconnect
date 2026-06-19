import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Farm } from '../../api/farm';

interface FarmCardProps {
  farm: Farm;
  onPress: () => void;
}

const STATUS_COLORS: Record<Farm['status'], string> = {
  active: '#2E7D32',
  fallow: '#F59E0B',
  rented_out: '#1565C0',
  sold: '#757575',
};

const STATUS_LABEL_KEYS: Record<Farm['status'], string> = {
  active: 'farm.card.status.active',
  fallow: 'farm.card.status.fallow',
  rented_out: 'farm.card.status.rented_out',
  sold: 'farm.card.status.sold',
};

export function FarmCard({ farm, onPress }: FarmCardProps) {
  const { t } = useTranslation();
  const plots = farm.plots ?? [];
  const crops = [...new Set(plots.map((p) => p.cropType).filter((c): c is string => c !== null))];
  const statusColor = STATUS_COLORS[farm.status];

  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#E8F5E9' }}>
      {/* Status strip on left edge */}
      <View style={[styles.statusStrip, { backgroundColor: statusColor }]} />

      <View style={styles.body}>
        {/* Top row: name + status badge */}
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{farm.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18`, borderColor: statusColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {t(STATUS_LABEL_KEYS[farm.status])}
            </Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <Text style={styles.metaItem}>📍 {farm.county}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaItem}>📐 {farm.areaAcres} ac</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaItem}>🌾 {plots.length} {t('farm.card.plots')}</Text>
        </View>

        {/* Crop chips */}
        {crops.length > 0 && (
          <View style={styles.cropRow}>
            {crops.slice(0, 4).map((c) => (
              <View key={c} style={styles.cropChip}>
                <Text style={styles.cropChipText}>{c}</Text>
              </View>
            ))}
            {crops.length > 4 && (
              <View style={[styles.cropChip, styles.cropChipMore]}>
                <Text style={styles.cropChipMoreText}>+{crops.length - 4}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusStrip: { width: 4, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B1B1B',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  metaItem: { fontSize: 12, color: '#555555' },
  metaDot: { fontSize: 12, color: '#BBBBBB' },
  cropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cropChip: {
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cropChipText: { fontSize: 11, color: '#2E7D32', fontWeight: '600' },
  cropChipMore: { backgroundColor: '#F0F0F0' },
  cropChipMoreText: { fontSize: 11, color: '#757575', fontWeight: '600' },
  chevron: { fontSize: 24, color: '#CCCCCC', paddingRight: 12 },
});
