import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { marketApi } from '../../api/market';
import type { MarketStackParamList, DiagnoseStackParamList } from '../../navigation/types';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';

type Props =
  | NativeStackScreenProps<MarketStackParamList, 'SupplierProductDetail'>
  | NativeStackScreenProps<DiagnoseStackParamList, 'SupplierProductDetail'>;

const fmtKes = (n: number): string =>
  Math.round(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function SupplierProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [qtyText, setQtyText]           = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes]               = useState('');
  const [orderSent, setOrderSent]       = useState(false);

  const productQuery = useQuery({
    queryKey: ['market', 'products', productId],
    queryFn: () => marketApi.products.get(productId),
    select: (res) => res.data,
  });
  const product = productQuery.data;

  const supplierQuery = useQuery({
    queryKey: ['market', 'supplier-profiles', 'by-user', product?.supplierId],
    queryFn: () => marketApi.supplierProfiles.list({ userId: product?.supplierId }),
    select: (res) => res.data[0] ?? null,
    enabled: !!product?.supplierId,
  });
  const supplier = supplierQuery.data;

  const orderMutation = useMutation({
    mutationFn: () =>
      marketApi.orders.create({
        productId,
        quantityUnits: parseFloat(qtyText) || 0,
        deliveryAddress: deliveryAddress.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['market', 'orders'] });
      setOrderSent(true);
    },
    onError: () => {
      Alert.alert(t('market.product.detail.orderError'));
    },
  });

  const qty = parseFloat(qtyText) || 0;
  const isValid = qty > 0 && deliveryAddress.trim().length > 0;

  function callSupplier() {
    if (supplier?.phone) void Linking.openURL(`tel:${supplier.phone}`);
  }

  if (productQuery.isLoading) return <LoadingScreen />;
  if (productQuery.isError || !product) {
    return <ErrorScreen onRetry={() => void productQuery.refetch()} />;
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
      <SafeAreaView edges={['top']} style={s.topArea}>
        <View style={s.topBar}>
          <Pressable style={s.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topBarTitle} numberOfLines={1}>{product.name}</Text>
          <View style={s.topBarSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <Text style={s.name}>{product.name}</Text>
        {product.brand && <Text style={s.brand}>{product.brand}</Text>}
        <Text style={s.price}>
          KES {fmtKes(product.pricePerUnitKes)} / {product.unit}
        </Text>
        <Text style={s.category}>{t(`market.product.filter.${product.category}`)}</Text>

        <Text style={s.sectionLabel}>{t('market.product.detail.descriptionLabel')}</Text>
        <Text style={s.description}>{product.description}</Text>

        <Text style={s.sectionLabel}>{t('market.product.detail.availabilityLabel')}</Text>
        <Text style={s.description}>
          {product.stockQuantity > 0
            ? t('market.product.detail.inStock', { qty: product.stockQuantity.toLocaleString(), unit: product.unit })
            : t('market.product.detail.outOfStock')}
        </Text>

        {/* ── Supplier contact ────────────────────────────────────────── */}
        <View style={s.supplierCard}>
          <Text style={s.sectionLabel}>{t('market.product.detail.supplierLabel')}</Text>
          {supplierQuery.isLoading && <Text style={s.description}>{t('common.loading')}</Text>}
          {supplier && (
            <>
              <Text style={s.supplierName}>{supplier.businessName}</Text>
              <Text style={s.supplierLocation}>{supplier.county}</Text>
              <Pressable style={s.callBtn} onPress={callSupplier} accessibilityRole="button">
                <Text style={s.callBtnLabel}>
                  {t('market.product.detail.callBtn', { phone: supplier.phone })}
                </Text>
              </Pressable>
            </>
          )}
          {!supplierQuery.isLoading && !supplier && (
            <Text style={s.description}>{t('market.product.detail.supplierUnavailable')}</Text>
          )}
        </View>

        {/* ── Send order ──────────────────────────────────────────────── */}
        {orderSent ? (
          <View style={s.successBox}>
            <Text style={s.successText}>{t('market.product.detail.orderSent')}</Text>
          </View>
        ) : (
          <View style={s.orderForm}>
            <Text style={s.sectionLabel}>{t('market.product.detail.orderLabel')}</Text>

            <Text style={s.fieldLabel}>{t('market.product.detail.qtyLabel', { unit: product.unit })}</Text>
            <TextInput
              style={s.textInput}
              value={qtyText}
              onChangeText={setQtyText}
              keyboardType="decimal-pad"
              placeholder="1"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={s.fieldLabel}>{t('market.product.detail.deliveryLabel')}</Text>
            <TextInput
              style={s.textInput}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder={t('market.product.detail.deliveryPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={s.fieldLabel}>{t('market.product.detail.notesLabel')}</Text>
            <TextInput
              style={[s.textInput, s.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('market.product.detail.notesPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            <Pressable
              style={[s.orderBtn, (!isValid || orderMutation.isPending) && s.orderBtnDisabled]}
              onPress={() => orderMutation.mutate()}
              disabled={!isValid || orderMutation.isPending}
              accessibilityRole="button"
            >
              <Text style={s.orderBtnLabel}>
                {orderMutation.isPending
                  ? t('market.product.detail.sending')
                  : t('market.product.detail.sendOrderBtn')}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={s.bottomPad} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  topArea: { backgroundColor: '#1565C0' },
  topBar: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 12,
  },
  backBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, minWidth: 44 },
  backArrow:    { fontSize: 18, color: 'rgba(255,255,255,0.85)' },
  backLabel:    { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  topBarTitle:  { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center' },
  topBarSpacer: { minWidth: 64 },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  name:     { fontSize: 18, fontWeight: '700', color: '#1B1B1B' },
  brand:    { fontSize: 13, color: '#757575', marginTop: 2 },
  price:    { fontSize: 16, fontWeight: '700', color: '#1565C0', marginTop: 8 },
  category: {
    fontSize: 12, color: '#555555', backgroundColor: '#F5F5F5',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    alignSelf: 'flex-start', marginTop: 6,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#1565C0',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 18, marginBottom: 6,
  },
  description: { fontSize: 13, color: '#333333', lineHeight: 19 },

  supplierCard: {
    marginTop: 12, padding: 14, borderRadius: 10,
    backgroundColor: '#F5F8FF', borderWidth: 1, borderColor: '#DCE8FF',
  },
  supplierName:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  supplierLocation: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 10 },
  callBtn: {
    minHeight: 44, backgroundColor: '#1565C0', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  callBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  orderForm: { marginTop: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  textInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6,
    paddingVertical: 9, paddingHorizontal: 11,
    fontSize: 13, color: '#111827', backgroundColor: '#F9FAFB', minHeight: 42,
  },
  notesInput: { height: 64, textAlignVertical: 'top' },
  orderBtn: {
    minHeight: 50, backgroundColor: '#2E7D32', borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  orderBtnDisabled: { opacity: 0.5 },
  orderBtnLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },

  successBox: {
    marginTop: 18, padding: 16, borderRadius: 10,
    backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7',
  },
  successText: { fontSize: 13, fontWeight: '600', color: '#1B5E20', textAlign: 'center' },

  bottomPad: { height: 20 },
});
