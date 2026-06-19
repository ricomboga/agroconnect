import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { activityApi, type ActivityType, type CreateActivityDto } from '../../api/activity';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useFarm } from '../../hooks/useFarms';
import { LoadingScreen } from '../../components/Common/LoadingScreen';
import { ErrorScreen } from '../../components/Common/ErrorScreen';
import { OfflineBanner } from '../../components/Common/OfflineBanner';
import { useUiStore } from '../../store/ui.store';

type Props = NativeStackScreenProps<FarmStackParamList, 'ActivityForm'>;

const ACTIVITY_TYPES: ActivityType[] = [
  'planting', 'irrigation', 'fertilising', 'weeding',
  'harvesting', 'scouting', 'spraying', 'other',
];

export function ActivityFormScreen({ navigation, route }: Props) {
  const { farmId, activityId } = route.params;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { isOnline, queueWrite } = useOfflineSync();
  const showToast = useUiStore((s) => s.showToast);
  const { data: farm } = useFarm(farmId);

  const [type, setType] = useState<ActivityType>('planting');
  const [description, setDescription] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [plotId, setPlotId] = useState<string | undefined>();
  const [labourCost, setLabourCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!activityId;
  const { data: existing, isLoading, isError, refetch } = useQuery({
    queryKey: ['activity', farmId, activityId],
    queryFn: () => activityApi.list(farmId, { page: 1, pageSize: 1 }),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.data[0]) {
      const a = existing.data[0];
      setType(a.type);
      setDescription(a.description ?? '');
      setPlannedDate(a.plannedDate);
      setPlotId(a.plotId ?? undefined);
      setLabourCost(a.labourCostKes !== null ? String(a.labourCostKes) : '');
    }
  }, [existing]);

  if (isEdit && isLoading) return <LoadingScreen />;
  if (isEdit && isError) return <ErrorScreen onRetry={refetch} />;

  const submit = async () => {
    setSubmitting(true);
    const dto: CreateActivityDto = {
      type,
      description: description || undefined,
      plannedDate,
      plotId,
      labourCostKes: labourCost ? Number(labourCost) : undefined,
    };
    try {
      if (isOnline) {
        if (isEdit) {
          await activityApi.update(farmId, activityId!, dto);
        } else {
          await activityApi.create(farmId, dto);
        }
        await queryClient.invalidateQueries({ queryKey: ['activities', farmId] });
      } else {
        queueWrite({
          id: `activity-${Date.now()}`,
          operation: isEdit ? 'UPDATE' : 'CREATE',
          entity: 'activities',
          endpoint: isEdit ? `/farms/${farmId}/activities/${activityId}` : `/farms/${farmId}/activities`,
          payload: JSON.stringify(dto),
          created_at: new Date().toISOString(),
          status: 'pending',
        });
        showToast(t('common.savedOffline'), 'info');
      }
      navigation.goBack();
    } catch {
      showToast(t('common.error.loadFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!isOnline && <OfflineBanner />}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('activity.form.type')}</Text>
        <View style={styles.chips}>
          {ACTIVITY_TYPES.map((at) => (
            <Pressable
              key={at}
              style={[styles.chip, type === at && styles.chipSelected]}
              onPress={() => setType(at)}
            >
              <Text style={type === at ? styles.chipTextSelected : styles.chipText}>
                {t(`activity.type.${at}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t('activity.form.description')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholder={t('activity.form.description')}
        />

        <Text style={styles.sectionLabel}>{t('activity.form.plannedDate')}</Text>
        <TextInput
          style={styles.input}
          value={plannedDate}
          onChangeText={setPlannedDate}
          placeholder="YYYY-MM-DD"
        />

        {farm && (farm.plots ?? []).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('activity.form.plot.label')}</Text>
            <View style={styles.chips}>
              <Pressable
                style={[styles.chip, !plotId && styles.chipSelected]}
                onPress={() => setPlotId(undefined)}
              >
                <Text style={!plotId ? styles.chipTextSelected : styles.chipText}>
                  {t('activity.form.plot.none')}
                </Text>
              </Pressable>
              {(farm.plots ?? []).map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.chip, plotId === p.id && styles.chipSelected]}
                  onPress={() => setPlotId(p.id)}
                >
                  <Text style={plotId === p.id ? styles.chipTextSelected : styles.chipText}>{p.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>{t('activity.form.labourCost')}</Text>
        <TextInput
          style={styles.input}
          value={labourCost}
          onChangeText={setLabourCost}
          keyboardType="decimal-pad"
          placeholder="0"
        />

        <Pressable
          style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          onPress={submit}
          disabled={submitting || !plannedDate}
        >
          <Text style={styles.saveBtnText}>{t('activity.form.save')}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#555555', marginBottom: 8, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  chipText: { fontSize: 14, color: '#555555' },
  chipTextSelected: { fontSize: 14, color: '#2E7D32', fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  saveBtn: {
    minHeight: 48,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
