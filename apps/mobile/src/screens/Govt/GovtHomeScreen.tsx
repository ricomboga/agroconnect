import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GovtStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GovtStackParamList, 'GovtHome'>;

export function GovtHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  const cards: Array<{
    titleKey: string;
    descKey: string;
    screen: keyof GovtStackParamList;
  }> = [
    {
      titleKey: 'govt.home.registrations.title',
      descKey: 'govt.home.registrations.desc',
      screen: 'Registrations',
    },
    {
      titleKey: 'govt.home.subsidies.title',
      descKey: 'govt.home.subsidies.desc',
      screen: 'Subsidies',
    },
    {
      titleKey: 'govt.home.licenses.title',
      descKey: 'govt.home.licenses.desc',
      screen: 'Licenses',
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.header}>{t('govt.home.title')}</Text>

        {cards.map((card) => (
          <Pressable
            key={card.screen}
            style={s.card}
            onPress={() => navigation.navigate(card.screen as never)}
            accessibilityRole="button"
          >
            <View style={s.cardBody}>
              <Text style={s.cardTitle}>{t(card.titleKey)}</Text>
              <Text style={s.cardDesc}>{t(card.descKey)}</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: '#FAFAFA' },
  scroll:    { padding: 16, paddingBottom: 32 },
  header:    { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },

  card:      {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1B5E20',
    padding: 16,
    marginBottom: 12,
    minHeight: 72,
  },
  cardBody:  { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20' },
  cardDesc:  { fontSize: 13, color: '#555' },
  arrow:     { fontSize: 22, color: '#1B5E20', marginLeft: 8, fontWeight: '700' },
});
