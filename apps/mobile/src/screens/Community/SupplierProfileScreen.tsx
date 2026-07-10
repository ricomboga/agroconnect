import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { marketApi } from '../../api/market';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'SupplierDirectoryProfile'>;

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

export function SupplierProfileScreen({ navigation, route }: Props) {
  const { supplierId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const supplierQuery = useQuery({
    queryKey: ['supplierProfile', supplierId],
    queryFn: () => marketApi.supplierProfiles.get(supplierId),
    staleTime: isOnline ? 10 * 60 * 1000 : Infinity,
  });

  if (supplierQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('community.suppliers.profileTitle')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  if (supplierQuery.isError || !supplierQuery.data?.data) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('community.suppliers.profileTitle')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => supplierQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const supplier = supplierQuery.data.data;
  const handleCall = () => { void Linking.openURL(`tel:${supplier.phone}`); };
  const handleWhatsApp = () => {
    const num = supplier.phone.replace(/[^0-9]/g, '');
    void Linking.openURL(`whatsapp://send?phone=${num}`);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('community.suppliers.profileTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <View style={s.avatar}>
            <Text style={s.avatarInitials}>{getInitials(supplier.businessName)}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.supplierName}>{supplier.businessName}</Text>
            <Text style={s.countyText}>
              {supplier.county}{supplier.subCounty ? `, ${supplier.subCounty}` : ''}
            </Text>
            {supplier.deliveryRadiusKm ? (
              <Text style={s.deliveryText}>{t('community.suppliers.delivery', { radius: supplier.deliveryRadiusKm })}</Text>
            ) : null}
          </View>
        </View>

        {supplier.description ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('community.suppliers.about')}</Text>
            <Text style={s.bioText}>{supplier.description}</Text>
          </View>
        ) : null}

        {supplier.categories.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('community.suppliers.categories')}</Text>
            <View style={s.chipRow}>
              {supplier.categories.map((cat: string) => (
                <View key={cat} style={s.chip}>
                  <Text style={s.chipText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {supplier.address ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('community.suppliers.address')}</Text>
            <Text style={s.bioText}>{supplier.address}</Text>
          </View>
        ) : null}

        <View style={s.contactRow}>
          <Pressable style={s.contactBtn} onPress={handleCall} accessibilityRole="button">
            <Text style={s.contactBtnText}>📞 {t('community.expert.callBtn')}</Text>
          </Pressable>
          <Pressable style={[s.contactBtn, s.whatsappBtn]} onPress={handleWhatsApp} accessibilityRole="button">
            <Text style={s.whatsappBtnText}>💬 {t('community.expert.whatsappBtn')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: '#FAFAFA' },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText:      { fontSize: 15, color: '#B71C1C', marginBottom: 12, textAlign: 'center' },
  retryBtn:       { minHeight: 48, paddingHorizontal: 24, justifyContent: 'center',
                    backgroundColor: '#E8F5E9', borderRadius: 8 },
  retryLabel:     { fontSize: 15, color: '#2E7D32', fontWeight: '600' },

  topBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
                    borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:        { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:      { fontSize: 15, color: '#2E7D32', fontWeight: '600' },
  topTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:         { padding: 16, paddingBottom: 48 },

  heroCard:       { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 16,
                    marginBottom: 12, borderWidth: 1, borderColor: '#EEEEEE', gap: 14, alignItems: 'center' },
  avatar:         { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: '#1A6B3C' },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  heroRight:      { flex: 1, gap: 6 },
  supplierName:   { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  countyText:     { fontSize: 13, color: '#6B7280' },
  deliveryText:   { fontSize: 12, color: '#1A6B3C', fontWeight: '600' },

  section:        { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12,
                    borderWidth: 1, borderColor: '#EEEEEE', gap: 10 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase',
                    letterSpacing: 0.5 },
  bioText:        { fontSize: 12, color: '#374151', lineHeight: 18 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#EAF4EE' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#1A6B3C' },

  contactRow:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  contactBtn:     { flex: 1, minHeight: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: '#1A6B3C' },
  contactBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  whatsappBtn:    { backgroundColor: '#25D366' },
  whatsappBtnText:{ color: '#FFF', fontSize: 15, fontWeight: '700' },
});
