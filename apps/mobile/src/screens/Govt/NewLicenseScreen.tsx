import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { govtApi } from '../../api/govt';
import { useFarm } from '../../hooks/useFarms';
import { useFarmStore } from '../../store/farm.store';
import { useUiStore } from '../../store/ui.store';
import type { GovtStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GovtStackParamList, 'NewLicense'>;

const LICENSE_TYPES = [
  { key: 'movement_permit',       icon: '🚚', i18nKey: 'govt.newLicense.type.movement_permit' },
  { key: 'pesticide_applicator',  icon: '🧪', i18nKey: 'govt.newLicense.type.pesticide_applicator' },
  { key: 'water_permit',          icon: '💧', i18nKey: 'govt.newLicense.type.water_permit' },
  { key: 'organic_certification', icon: '🌿', i18nKey: 'govt.newLicense.type.organic_certification' },
  { key: 'export_phytosanitary',  icon: '📦', i18nKey: 'govt.newLicense.type.export_phytosanitary' },
] as const;

export function NewLicenseScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const activeFarmId = useFarmStore((s) => s.activeFarmId);
  const farmQuery = useFarm(activeFarmId ?? '');
  const farm = farmQuery.data;

  const [type, setType] = useState<string>('');

  const mutation = useMutation({
    mutationFn: () => govtApi.licenses.create(type, activeFarmId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['govt', 'licenses'] });
      showToast(t('govt.newLicense.successToast'), 'success');
      navigation.goBack();
    },
    onError: () => {
      showToast(t('common.error.loadFailed'), 'error');
    },
  });

  const canSubmit = !!activeFarmId && type.length > 0 && !mutation.isPending;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('govt.newLicense.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {!activeFarmId ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('govt.newLicense.noFarm')}</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>{t('govt.newLicense.farmSection')}</Text>
            <View style={s.readOnlyCard}>
              <View style={[s.readOnlyRow, s.noBorder]}>
                <Text style={s.readOnlyLabel}>{t('govt.newLicense.farmName')}</Text>
                <Text style={s.readOnlyValue}>
                  {farmQuery.isLoading ? '…' : (farm?.name ?? '—')}
                </Text>
              </View>
            </View>

            <Text style={s.sectionLabel}>{t('govt.newLicense.typeSection')}</Text>
            <View style={s.typeList}>
              {LICENSE_TYPES.map((lt) => {
                const selected = type === lt.key;
                return (
                  <Pressable
                    key={lt.key}
                    style={[s.typeRow, selected && s.typeRowSelected]}
                    onPress={() => setType(lt.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={s.typeIcon}>{lt.icon}</Text>
                    <Text style={[s.typeLabel, selected && s.typeLabelSelected]}>{t(lt.i18nKey)}</Text>
                    {selected && <Text style={s.typeCheck}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[s.submitBtn, !canSubmit && s.submitDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.submitLabel}>{t('govt.newLicense.submit')}</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: '#FAFAFA' },
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  backBtn:    { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backLabel:  { fontSize: 15, color: '#1B5E20', fontWeight: '600' },
  topTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  scroll:     { padding: 16, paddingBottom: 48 },

  emptyBox:   { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#424242', textAlign: 'center' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 12 },

  readOnlyCard:  { backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 8 },
  readOnlyRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  noBorder:      { borderBottomWidth: 0 },
  readOnlyLabel: { fontSize: 13, color: '#757575' },
  readOnlyValue: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },

  typeList:   { gap: 10 },
  typeRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#EEEEEE', paddingHorizontal: 14, paddingVertical: 14, minHeight: 56 },
  typeRowSelected: { borderColor: '#1B5E20', backgroundColor: '#E8F5E9' },
  typeIcon:   { fontSize: 22 },
  typeLabel:  { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  typeLabelSelected: { color: '#1B5E20' },
  typeCheck:  { fontSize: 18, color: '#1B5E20', fontWeight: '700' },

  submitBtn:      { minHeight: 52, backgroundColor: '#1B5E20', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  submitDisabled: { backgroundColor: '#A7D7B9' },
  submitLabel:    { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
