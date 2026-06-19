import React from 'react';
import {
  FlatList, Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { useFarms } from '../../hooks/useFarms';
import type { Farm } from '../../api/farm';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { UssdInfoBanner } from '../../components/Common/UssdInfoBanner';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnoseHome'>;

export function DiagnoseHomeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useFarms();

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  const farms: Farm[] = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <UssdInfoBanner dismissKey="ussd_diagnose_dismissed" />
      <View style={styles.header}>
        <Text style={styles.title}>{t('diagnose.home.title')}</Text>
        <Text style={styles.subtitle}>{t('diagnose.home.subtitle')}</Text>
      </View>

      {farms.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('diagnose.home.noFarms')}</Text>
        </View>
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.farmCard}
              onPress={() => navigation.navigate('DiagnoseCamera', { farmId: item.id })}
            >
              <View style={styles.farmIconWrap}>
                <Text style={styles.farmIcon}>🌱</Text>
              </View>
              <View style={styles.farmInfo}>
                <Text style={styles.farmName}>{item.name}</Text>
                <Text style={styles.farmMeta}>{item.county} · {item.areaAcres} acres</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 24, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1B1B1B', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#757575' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  farmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  farmIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  farmIcon: { fontSize: 20 },
  farmInfo: { flex: 1 },
  farmName: { fontSize: 16, fontWeight: '700', color: '#1B1B1B', marginBottom: 2 },
  farmMeta: { fontSize: 13, color: '#757575' },
  chevron: { fontSize: 22, color: '#2E7D32', fontWeight: '300' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#757575' },
});
