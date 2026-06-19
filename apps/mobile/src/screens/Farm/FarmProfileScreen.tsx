import React, { useCallback, useState } from 'react';
import { Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useFarm } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { PlotBadge } from '../../components/Farm/PlotBadge';
import { WeatherWidget } from '../../components/Weather/WeatherWidget';

type Props = NativeStackScreenProps<FarmStackParamList, 'FarmProfile'>;
type ProfileTab = 'activities' | 'inputs' | 'harvests';

export function FarmProfileScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const { data: farm, isLoading, isError, refetch } = useFarm(farmId);
  const [activeTab, setActiveTab] = useState<ProfileTab>('activities');

  const navigateTab = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
    if (tab === 'activities') navigation.navigate('ActivityCalendar', { farmId });
    else if (tab === 'inputs') navigation.navigate('InputLog', { farmId });
    else navigation.navigate('HarvestLog', { farmId });
  }, [navigation, farmId]);

  const openInMaps = useCallback(async (lat: number, lng: number, name: string) => {
    const label = encodeURIComponent(name);
    const url = Platform.select({
      ios: `maps:?q=${label}&ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });
    if (url && await Linking.canOpenURL(url)) Linking.openURL(url);
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (isError || !farm) return <ErrorScreen onRetry={refetch} />;

  const hasGps = farm.gpsLat !== null && farm.gpsLng !== null;
  const crops = (farm.plots ?? [])
    .map((p) => p.cropType)
    .filter((c): c is string => c !== null);
  const uniqueCrops = [...new Set(crops)];

  const TABS: { key: ProfileTab; labelKey: string }[] = [
    { key: 'activities', labelKey: 'farm.profile.tab.activities' },
    { key: 'inputs',     labelKey: 'farm.profile.tab.inputs' },
    { key: 'harvests',   labelKey: 'farm.profile.tab.harvests' },
  ];

  return (
    <ScrollView style={styles.container}>
      {!isOnline && <OfflineBanner />}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.name} numberOfLines={2}>{farm.name}</Text>
          <PlotBadge count={(farm.plots ?? []).length} />
        </View>
        <Text style={styles.metaRow}>
          {t('farm.profile.county')}: <Text style={styles.metaValue}>{farm.county}</Text>
        </Text>
        <Text style={styles.metaRow}>
          {t('farm.profile.area')}: <Text style={styles.metaValue}>{farm.areaAcres} ac</Text>
        </Text>
        {uniqueCrops.length > 0 && (
          <View style={styles.cropRow}>
            {uniqueCrops.map((c) => (
              <View key={c} style={styles.cropTag}>
                <Text style={styles.cropTagText}>{c}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Weather widget */}
      <WeatherWidget
        lat={farm.gpsLat}
        lng={farm.gpsLng}
        county={farm.county}
        onPress={() => navigation.navigate('WeatherDetail', { lat: farm.gpsLat, lng: farm.gpsLng, county: farm.county })}
      />

      {/* Map */}
      {hasGps ? (
        <Pressable
          style={styles.mapContainer}
          onPress={() => openInMaps(farm.gpsLat!, farm.gpsLng!, farm.name)}
        >
          <Image
            source={{
              uri: `https://staticmap.openstreetmap.de/staticmap.php?center=${farm.gpsLat},${farm.gpsLng}&zoom=14&size=600x200&markers=${farm.gpsLat},${farm.gpsLng}`,
            }}
            style={styles.mapImage}
            resizeMode="cover"
          />
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>📍 {t('farm.profile.map.open')}</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.noGps}>
          <Text style={styles.noGpsText}>{t('farm.profile.map.noGps')}</Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => navigateTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.quickBtn}
          onPress={() => navigation.navigate('ActivityForm', { farmId })}
        >
          <Text style={styles.quickBtnIcon}>📋</Text>
          <Text style={styles.quickBtnLabel}>{t('farm.quickAction.logActivity')}</Text>
        </Pressable>
        <Pressable
          style={styles.quickBtn}
          onPress={() => navigation.navigate('InputForm', { farmId })}
        >
          <Text style={styles.quickBtnIcon}>🌿</Text>
          <Text style={styles.quickBtnLabel}>{t('farm.quickAction.logInput')}</Text>
        </Pressable>
        <Pressable
          style={[styles.quickBtn, styles.quickBtnDiagnose]}
          onPress={() => navigation.getParent()?.getParent()?.navigate('Diagnose' as never)}
        >
          <Text style={styles.quickBtnIcon}>🔬</Text>
          <Text style={[styles.quickBtnLabel, styles.quickBtnLabelDiagnose]}>
            {t('farm.quickAction.diagnose')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 16, backgroundColor: '#FFFFFF', marginBottom: 4 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  name: { fontSize: 22, fontWeight: '700', color: '#1B1B1B', flex: 1 },
  metaRow: { fontSize: 14, color: '#757575', marginBottom: 3 },
  metaValue: { color: '#1B1B1B', fontWeight: '600' },
  cropRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  cropTag: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cropTagText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  mapContainer: {
    height: 200,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapImage: { width: '100%', height: '100%' },
  mapBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mapBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  noGps: {
    height: 72,
    margin: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noGpsText: { fontSize: 13, color: '#9E9E9E' },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabActive: { backgroundColor: '#2E7D32' },
  tabText: { fontSize: 13, color: '#555555', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  quickActions: {
    flexDirection: 'row',
    margin: 16,
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  quickBtnDiagnose: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  quickBtnIcon: { fontSize: 24 },
  quickBtnLabel: { fontSize: 11, color: '#555555', fontWeight: '600', textAlign: 'center' },
  quickBtnLabelDiagnose: { color: '#1565C0' },
});
