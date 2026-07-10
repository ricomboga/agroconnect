import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SupplierProduct } from '../../api/market';

interface SupplierProductCardProps {
  product: SupplierProduct;
  onPress: () => void;
}

const fmtKes = (n: number | null | undefined): string =>
  Math.round(n ?? 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function SupplierProductCard({ product, onPress }: SupplierProductCardProps) {
  const { t } = useTranslation();
  const inStock = product.stockQuantity > 0;
  const stockColor = inStock ? { bg: '#E8F5E9', text: '#1B5E20' } : { bg: '#FFEBEE', text: '#C62828' };

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          {product.brand && (
            <Text style={styles.brand}>{product.brand}</Text>
          )}
        </View>
        <View style={[styles.stockBadge, { backgroundColor: stockColor.bg }]}>
          <Text style={[styles.stockText, { color: stockColor.text }]}>
            {inStock
              ? t('market.product.stock.in_stock')
              : t('market.product.stock.out_of_stock')}
          </Text>
        </View>
      </View>

      <View style={styles.midRow}>
        <Text style={styles.price}>
          KES {fmtKes(product.pricePerUnitKes)}/{product.unit}
        </Text>
        <Text style={styles.category}>
          {t(`market.product.filter.${product.category}`)}
        </Text>
      </View>
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
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nameBlock: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#1B1B1B' },
  brand: { fontSize: 12, color: '#757575', marginTop: 2 },
  stockBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  stockText: { fontSize: 11, fontWeight: '700' },
  midRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: { fontSize: 15, fontWeight: '700', color: '#1565C0' },
  category: {
    fontSize: 12,
    color: '#555555',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
