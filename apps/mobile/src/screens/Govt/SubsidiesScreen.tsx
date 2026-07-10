import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { govtApi } from '../../api/govt';
import type { SubsidyStatus, SubsidyProgram, SubsidyApplication } from '../../api/govt';
import { useFarmStore } from '../../store/farm.store';
import type { GovtStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GovtStackParamList, 'Subsidies'>;

const STATUS_COLOR: Record<SubsidyStatus, string> = {
  pending:   '#E65100',
  approved:  '#1B5E20',
  disbursed: '#00695C',
  rejected:  '#B71C1C',
};
const STATUS_BG: Record<SubsidyStatus, string> = {
  pending:   '#FFF3E0',
  approved:  '#E8F5E9',
  disbursed: '#E0F2F1',
  rejected:  '#FFEBEE',
};

export function SubsidiesScreen({ navigation: _navigation }: Props) {
  const { t } = useTranslation();
  const activeFarmId = useFarmStore((s) => s.activeFarmId);

  const programsQuery = useQuery({
    queryKey: ['govt', 'subsidies', 'programs'],
    queryFn: () => govtApi.subsidies.list(),
  });

  const applicationsQuery = useQuery({
    queryKey: ['govt', 'subsidies', 'applications'],
    queryFn: () => govtApi.subsidies.applications(),
  });

  async function handleApply(programId: string) {
    if (!activeFarmId) {
      Alert.alert(t('common.error.loadFailed'));
      return;
    }
    try {
      await govtApi.subsidies.apply(programId, activeFarmId);
      Alert.alert(t('govt.subsidies.apply'), t('common.save'));
    } catch {
      Alert.alert(t('common.error.loadFailed'));
    }
  }

  const programs = programsQuery.data?.data ?? [];
  const applications = applicationsQuery.data?.data ?? [];

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.header}>{t('govt.subsidies.title')}</Text>

        <Text style={s.sectionTitle}>{t('govt.subsidies.programs')}</Text>

        {programsQuery.isLoading && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginBottom: 16 }} />
        )}

        {!programsQuery.isLoading && programs.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('govt.subsidies.empty')}</Text>
          </View>
        )}

        {programs.map((program: SubsidyProgram) => (
          <View key={program.id} style={s.programCard}>
            <View style={s.programInfo}>
              <Text style={s.programName}>{program.name}</Text>
              {program.eligibilityCriteria ? (
                <Text style={s.programEligibility}>{program.eligibilityCriteria}</Text>
              ) : null}
            </View>
            <Pressable
              style={s.applyBtn}
              onPress={() => handleApply(program.id)}
              accessibilityRole="button"
            >
              <Text style={s.applyLabel}>{t('govt.subsidies.apply')}</Text>
            </Pressable>
          </View>
        ))}

        <Text style={[s.sectionTitle, { marginTop: 16 }]}>{t('govt.subsidies.myApplications')}</Text>

        {applicationsQuery.isLoading && (
          <ActivityIndicator size="small" color="#1B5E20" style={{ marginBottom: 16 }} />
        )}

        {!applicationsQuery.isLoading && applications.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('govt.subsidies.empty')}</Text>
          </View>
        )}

        {applications.map((app: SubsidyApplication) => (
          <View key={app.id} style={s.row}>
            <View style={s.rowInfo}>
              <Text style={s.rowName}>{app.programName}</Text>
              <Text style={s.rowSub}>{app.id}</Text>
            </View>
            <View style={[s.pill, { backgroundColor: STATUS_BG[app.status] }]}>
              <Text style={[s.pillText, { color: STATUS_COLOR[app.status] }]}>
                {t(`govt.subsidies.status.${app.status}`)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: '#FAFAFA' },
  scroll:       { padding: 16, paddingBottom: 32 },
  header:       { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  emptyBox:  { paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
  emptyTitle:{ fontSize: 14, color: '#757575' },

  programCard:       { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', padding: 14, marginBottom: 10 },
  programInfo:       { gap: 4, marginBottom: 10 },
  programName:       { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  programEligibility:{ fontSize: 12, color: '#555' },
  applyBtn:          { backgroundColor: '#1B5E20', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  applyLabel:        { color: '#FFF', fontSize: 13, fontWeight: '700' },

  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  rowInfo:  { flex: 1, gap: 2 },
  rowName:  { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  rowSub:   { fontSize: 12, color: '#757575' },
  pill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  pillText: { fontSize: 11, fontWeight: '700' },
});
