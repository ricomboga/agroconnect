import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';
import { govtApi } from '../../api/govt';
import { useFarm } from '../../hooks/useFarms';
import { useFarmStore } from '../../store/farm.store';
import { useUiStore } from '../../store/ui.store';
import type { GovtStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<GovtStackParamList, 'NewRegistration'>;

export function NewRegistrationScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const showToast = useUiStore((s) => s.showToast);
  const activeFarmId = useFarmStore((s) => s.activeFarmId);
  const farmQuery = useFarm(activeFarmId ?? '');
  const farm = farmQuery.data;

  const [county, setCounty] = useState('');
  const [showCountyPicker, setShowCountyPicker] = useState(false);

  const effectiveCounty = county || farm?.county || '';

  const mutation = useMutation({
    mutationFn: () => govtApi.registrations.create(activeFarmId as string, effectiveCounty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['govt', 'registrations'] });
      showToast(t('govt.newRegistration.successToast'), 'success');
      navigation.goBack();
    },
    onError: () => {
      showToast(t('common.error.loadFailed'), 'error');
    },
  });

  const canSubmit = !!activeFarmId && effectiveCounty.length > 0 && !mutation.isPending;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} accessibilityRole="button">
          <Text style={s.backLabel}>{t('common.back')}</Text>
        </Pressable>
        <Text style={s.topTitle}>{t('govt.newRegistration.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {!activeFarmId ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTitle}>{t('govt.newRegistration.noFarm')}</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>{t('govt.newRegistration.farmSection')}</Text>
            <View style={s.readOnlyCard}>
              <View style={[s.readOnlyRow, s.noBorder]}>
                <Text style={s.readOnlyLabel}>{t('govt.newRegistration.farmName')}</Text>
                <Text style={s.readOnlyValue}>
                  {farmQuery.isLoading ? '…' : (farm?.name ?? '—')}
                </Text>
              </View>
            </View>

            <Text style={s.sectionLabel}>{t('govt.newRegistration.countySection')}</Text>
            <Pressable style={s.pickerBtn} onPress={() => setShowCountyPicker(true)} accessibilityRole="button">
              <Text style={effectiveCounty ? s.pickerBtnValue : s.pickerBtnPlaceholder}>
                {effectiveCounty || t('govt.newRegistration.countyPlaceholder')}
              </Text>
              <Text style={s.pickerChevron}>›</Text>
            </Pressable>

            <Pressable
              style={[s.submitBtn, !canSubmit && s.submitDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit}
              accessibilityRole="button"
            >
              {mutation.isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={s.submitLabel}>{t('govt.newRegistration.submit')}</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showCountyPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCountyPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('govt.newRegistration.countyPickerTitle')}</Text>
              <Pressable style={s.modalCloseBtn} onPress={() => setShowCountyPicker(false)} accessibilityRole="button">
                <Text style={s.modalCloseLabel}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={KENYA_COUNTIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[s.countyOption, effectiveCounty === item && s.countyOptionSelected]}
                  onPress={() => {
                    setCounty(item);
                    setShowCountyPicker(false);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: effectiveCounty === item }}
                >
                  <Text style={s.countyOptionName}>{item}</Text>
                  {effectiveCounty === item && <Text style={s.countyOptionCheck}>✓</Text>}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
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

  pickerBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#DDDDDD', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFF', minHeight: 48 },
  pickerBtnValue:       { fontSize: 15, color: '#1A1A1A' },
  pickerBtnPlaceholder: { fontSize: 15, color: '#9CA3AF' },
  pickerChevron:        { fontSize: 20, color: '#9CA3AF' },

  submitBtn:      { minHeight: 52, backgroundColor: '#1B5E20', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  submitDisabled: { backgroundColor: '#A7D7B9' },
  submitLabel:    { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', paddingBottom: 24 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  modalTitle:      { fontSize: 15, fontWeight: '700', color: '#111827' },
  modalCloseBtn:   { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  modalCloseLabel: { fontSize: 18, color: '#6B7280' },
  countyOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#E5E7EB', minHeight: 44 },
  countyOptionSelected: { backgroundColor: '#EAF4EE' },
  countyOptionName:     { fontSize: 14, color: '#111827' },
  countyOptionCheck:    { fontSize: 16, color: '#1B5E20', fontWeight: '700' },
});
