import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { SupplierProduct, StockStatus } from '../../api/market';

interface SupplierProductCardProps {
  product: SupplierProduct;
  onAddToCart: () => void;
}

const STOCK_COLORS: Record<StockStatus, { bg: string; text: string }> = {
  in_stock:    { bg: '#E8F5E9', text: '#1B5E20' },
  low_stock:   { bg: '#FFF9C4', text: '#F57F17' },
  out_of_stock: { bg: '#FFEBEE', text: '#C62828' },
};

export function SupplierProductCard({ product, onAddToCart }: SupplierProductCardProps) {
  const { t } = useTranslation();
  const stockColor = STOCK_COLORS[product.stockStatus];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          {product.brand && (
            <Text style={styles.brand}>{product.brand}</Text>
          )}
        </View>
        <View style={[styles.stockBadge, { backgroundColor: stockColor.bg }]}>
          <Text style={[styles.stockText, { color: stockColor.text }]}>
            {t(`market.product.stock.${product.stockStatus}`)}
          </Text>
        </View>
      </View>

      <View style={styles.midRow}>
        <Text style={styles.price}>
          KES {product.pricePerUnit.toLocaleString()}/{product.unit}
        </Text>
        <Text style={styles.category}>
          {t(`market.product.filter.${product.category}`)}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.supplier}>
          {t('market.product.card.by', { name: product.supplierName })} · {product.county}
        </Text>
        <Pressable
          style={[
            styles.cartBtn,
            product.stockStatus === 'out_of_stock' && styles.cartBtnDisabled,
          ]}
          onPress={onAddToCart}
          disabled={product.stockStatus === 'out_of_stock'}
          accessibilityRole="button"
        >
          <Text style={styles.cartBtnText}>{t('market.product.card.addToCart')}</Text>
        </Pressable>
      </View>
    </View>
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplier: { fontSize: 12, color: '#9E9E9E', flex: 1, marginRight: 8 },
  cartBtn: {
    minHeight: 36,
    backgroundColor: '#1565C0',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtnDisabled: { backgroundColor: '#BDBDBD' },
  cartBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});
