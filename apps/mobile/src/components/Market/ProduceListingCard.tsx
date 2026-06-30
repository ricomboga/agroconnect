import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProduceListing, QualityGrade } from '../../api/market';

interface ProduceListingCardProps {
  listing: ProduceListing;
  onPress: () => void;
}

const GRADE_COLORS: Record<QualityGrade, { bg: string; text: string }> = {
  A: { bg: '#E8F5E9', text: '#1B5E20' },
  B: { bg: '#FFF9C4', text: '#F57F17' },
  C: { bg: '#FBE9E7', text: '#BF360C' },
};

export function ProduceListingCard({ listing, onPress }: ProduceListingCardProps) {
  const { t } = useTranslation();
  const gradeColor = listing.qualityGrade ? GRADE_COLORS[listing.qualityGrade] : null;

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.topRow}>
        <Text style={styles.crop} numberOfLines={1}>
          {listing.crop}
          {listing.variety ? ` · ${listing.variety}` : ''}
        </Text>
        {gradeColor && listing.qualityGrade && (
          <View style={[styles.gradeBadge, { backgroundColor: gradeColor.bg }]}>
            <Text style={[styles.gradeText, { color: gradeColor.text }]}>
              {t('market.listing.card.grade', { grade: listing.qualityGrade })}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.midRow}>
        <Text style={styles.price}>
          {t('market.listing.card.pricePerKg', { price: (listing.pricePerKg ?? 0).toLocaleString() })}
        </Text>
        <Text style={styles.qty}>
          {t('market.listing.card.quantityKg', { quantity: (listing.quantityKg ?? 0).toLocaleString() })}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.meta}>{listing.county}</Text>
        <Text style={styles.meta}>
          {t('market.listing.card.availableFrom', { date: listing.availableFrom })}
        </Text>
      </View>

      <Text style={styles.farmer}>{listing.farmerName}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    minHeight: 48,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  crop: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B1B1B',
    flex: 1,
    marginRight: 8,
  },
  gradeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  midRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E7D32',
  },
  qty: {
    fontSize: 14,
    color: '#555555',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  farmer: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
});
