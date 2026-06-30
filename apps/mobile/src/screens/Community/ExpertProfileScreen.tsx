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
import { communityApi } from '../../api/community';
import type { Expert } from '../../api/community';
import type { CommunityStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'ExpertProfile'>;

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

const EXPERT_TYPE_COLORS: Record<Expert['providerType'], string> = {
  agronomist:        '#2E7D32',
  vet:               '#6D4C41',
  extension_officer: '#1565C0',
};
const EXPERT_TYPE_BG: Record<Expert['providerType'], string> = {
  agronomist:        '#E8F5E9',
  vet:               '#EFEBE9',
  extension_officer: '#E3F2FD',
};

export function ExpertProfileScreen({ navigation, route }: Props) {
  const { expertId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();

  const expertQuery = useQuery({
    queryKey: ['expert', expertId],
    queryFn: () => communityApi.experts.get(expertId),
    staleTime: isOnline ? 10 * 60 * 1000 : Infinity,
  });

  if (expertQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('community.expert.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  if (expertQuery.isError || !expertQuery.data?.data) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backLabel}>{t('common.back')}</Text>
          </Pressable>
          <Text style={s.topTitle}>{t('community.expert.title')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.center}>
          <Text style={s.errorText}>{t('common.error.loadFailed')}</Text>
          <Pressable onPress={() => expertQuery.refetch()} style={s.retryBtn}>
            <Text style={s.retryLabel}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const expert = expertQuery.data.data as Expert;
  const typeColor = EXPERT_TYPE_COLORS[expert.providerType];
  const typeBg = EXPERT_TYPE_BG[expert.providerType];

  const handleCall = () => { void Linking.openURL(`tel:${expert.phone}`); };
  const handleWhatsApp = () => {
    const num = (expert.whatsapp ?? expert.phone).replace(/[^0-9]/g, '');
    void Linking.openURL(`whatsapp://send?phone=${num}`);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('community.expert.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.heroCard}>
          <View style={[s.avatar, { backgroundColor: typeColor }]}>
            <Text style={s.avatarInitials}>{getInitials(expert.name)}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.expertName}>{expert.name}</Text>
            <View style={s.verifiedRow}>
              <Text style={s.verifiedCheckmark}>✓</Text>
              <Text style={s.verifiedLabel}>{t('community.thread.verified')}</Text>
            </View>
            <View style={[s.typeBadge, { backgroundColor: typeBg }]}>
              <Text style={[s.typeText, { color: typeColor }]}>
                {t(`community.expert.type.${expert.providerType}`)}
              </Text>
            </View>
          </View>
        </View>

        {expert.bio ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('community.expert.bio')}</Text>
            <Text style={s.bioText}>{expert.bio}</Text>
          </View>
        ) : null}

        <View style={s.ratingCard}>
          <Text style={s.stars}>{renderStars(expert.rating)}</Text>
          <Text style={s.ratingText}>
            {t('community.expert.rating', { rating: expert.rating.toFixed(1), count: expert.reviewCount })}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('community.expert.specialisations')}</Text>
          <View style={s.chipRow}>
            {expert.specialisations.map((spec) => (
              <View key={spec} style={[s.chip, { backgroundColor: typeBg }]}>
                <Text style={[s.chipText, { color: typeColor }]}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('community.expert.counties')}</Text>
          <View style={s.chipRow}>
            {expert.countiesServed.map((county) => (
              <View key={county} style={s.countyChip}>
                <Text style={s.countyChipText}>{county}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.contactRow}>
          <Pressable style={[s.contactBtn, { backgroundColor: typeColor }]} onPress={handleCall} accessibilityRole="button">
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
  avatar:         { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  heroRight:      { flex: 1, gap: 6 },
  expertName:     { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  verifiedRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedCheckmark: { fontSize: 14, color: '#2E7D32', fontWeight: '800' },
  verifiedLabel:  { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  typeBadge:      { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeText:       { fontSize: 12, fontWeight: '700' },

  ratingCard:     { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12,
                    borderWidth: 1, borderColor: '#EEEEEE', alignItems: 'center', gap: 4 },
  stars:          { fontSize: 22, color: '#F9A825' },
  ratingText:     { fontSize: 13, color: '#555' },

  section:        { backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 12,
                    borderWidth: 1, borderColor: '#EEEEEE', gap: 10 },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase',
                    letterSpacing: 0.5 },
  bioText:        { fontSize: 12, color: '#374151', lineHeight: 18 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:           { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText:       { fontSize: 13, fontWeight: '600' },
  countyChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F5F5F5' },
  countyChipText: { fontSize: 13, color: '#424242', fontWeight: '500' },

  contactRow:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  contactBtn:     { flex: 1, minHeight: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  whatsappBtn:    { backgroundColor: '#25D366' },
  whatsappBtnText:{ color: '#FFF', fontSize: 15, fontWeight: '700' },
});
