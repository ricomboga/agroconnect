import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FarmStackParamList } from '../../navigation/types';
import { useAddWorker } from '../../hooks/useFarms';
import { farmApi } from '../../api/farm';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineBanner } from '../../components/Common/OfflineBanner';

type Props = NativeStackScreenProps<FarmStackParamList, 'AddWorkerScreen'>;

type WorkerRole = 'field_worker' | 'harvester' | 'sprayer' | 'driver' | 'manager';

interface RoleTile {
  value: WorkerRole;
  icon: string;
  labelKey: string;
}

const ROLE_TILES: RoleTile[] = [
  { value: 'field_worker', icon: '🌾', labelKey: 'worker.add.role.fieldWorker' },
  { value: 'harvester',    icon: '🌽', labelKey: 'worker.add.role.harvester'   },
  { value: 'sprayer',      icon: '🌿', labelKey: 'worker.add.role.sprayer'     },
  { value: 'driver',       icon: '🚜', labelKey: 'worker.add.role.driver'      },
  { value: 'manager',      icon: '📋', labelKey: 'worker.add.role.manager'     },
];

function AlertBox({ variant, message }: { variant: 'green' | 'red'; message: string }) {
  const colors = variant === 'green'
    ? { bg: '#EAF4EE', border: '#1A6B3C', text: '#0D4A28' }
    : { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' };
  return (
    <View style={[s.alert, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <Text style={[s.alertText, { color: colors.text }]}>{message}</Text>
    </View>
  );
}

export function AddWorkerScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const addWorkerMutation = useAddWorker(farmId);

  const [phone, setPhone] = useState('');
  const [lookupResult, setLookupResult] = useState<{ id: string; fullName: string } | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [role, setRole] = useState<WorkerRole | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleLookup = useCallback(async () => {
    const cleaned = phone.trim();
    if (!cleaned) return;
    setLookupError(null);
    setLookupResult(null);
    setLookingUp(true);
    try {
      const result = await farmApi.lookupUserByPhone(cleaned);
      setLookupResult(result.data);
    } catch {
      setLookupError(t('worker.add.lookupError'));
    } finally {
      setLookingUp(false);
    }
  }, [phone, t]);

  const canSubmit = !!lookupResult && !!role && !addWorkerMutation.isPending;

  const handleSave = useCallback(async () => {
    if (!canSubmit || !lookupResult || !role) return;
    setErrorMsg(null);
    try {
      await addWorkerMutation.mutateAsync({
        userId: lookupResult.id,
        role,
      });
      navigation.goBack();
    } catch {
      setErrorMsg(t('worker.add.errorSave'));
    }
  }, [canSubmit, lookupResult, role, addWorkerMutation, navigation, t]);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.topBarBack} accessibilityRole="button">
          <Text style={s.topBarBackText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topBarTitle}>{t('worker.add.topBarTitle')}</Text>
        <View style={s.topBarSpacer} />
      </View>

      {!isOnline && <OfflineBanner />}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {errorMsg && <AlertBox variant="red" message={errorMsg} />}

          {/* Phone lookup */}
          <Text style={s.sectionLabel}>{t('worker.add.lookupSection')}</Text>
          <Text style={s.label}>{t('worker.add.phoneLabel')}</Text>
          <View style={s.lookupRow}>
            <TextInput
              style={[s.input, s.lookupInput]}
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setLookupResult(null);
                setLookupError(null);
              }}
              placeholder={t('worker.add.phonePlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <Pressable
              style={[s.lookupBtn, (!phone.trim() || lookingUp) && s.lookupBtnDisabled]}
              onPress={handleLookup}
              disabled={!phone.trim() || lookingUp}
              accessibilityRole="button"
            >
              {lookingUp ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.lookupBtnText}>{t('worker.add.lookupBtn')}</Text>
              )}
            </Pressable>
          </View>

          {lookupError && <AlertBox variant="red" message={lookupError} />}

          {lookupResult && (
            <View style={s.lookupResult}>
              <Text style={s.lookupResultIcon}>✅</Text>
              <View>
                <Text style={s.lookupResultName}>{lookupResult.fullName}</Text>
                <Text style={s.lookupResultPhone}>{phone}</Text>
              </View>
            </View>
          )}

          {/* Role selector */}
          <Text style={s.sectionLabel}>{t('worker.add.roleSection')}</Text>
          <View style={s.roleGrid}>
            {ROLE_TILES.map((tile) => {
              const selected = role === tile.value;
              return (
                <Pressable
                  key={tile.value}
                  style={[s.roleTile, selected ? s.roleTileSelected : s.roleTileDefault]}
                  onPress={() => setRole(tile.value)}
                  accessibilityRole="button"
                >
                  <Text style={s.roleTileIcon}>{tile.icon}</Text>
                  <Text style={[s.roleTileLabel, selected ? s.roleTileLabelSel : s.roleTileLabelDef]}>
                    {t(tile.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Save */}
          <Pressable
            style={[s.saveBtn, !canSubmit && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {addWorkerMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{t('worker.add.saveBtn')}</Text>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  topBar: {
    backgroundColor: '#1A6B3C',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  topBarBack:     { minHeight: 44, minWidth: 60, justifyContent: 'center' },
  topBarBackText: { fontSize: 12, color: '#fff', fontWeight: '500' },
  topBarTitle:    { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
  topBarSpacer:   { minWidth: 60 },

  content: { padding: 11, paddingBottom: 40 },

  alert: {
    borderLeftWidth: 3,
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginBottom: 10,
  },
  alertText: { fontSize: 9, lineHeight: 14 },

  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A6B3C',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 10,
  },

  lookupRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  lookupInput: { flex: 1 },
  lookupBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 5,
    paddingHorizontal: 14,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupBtnDisabled: { opacity: 0.45 },
  lookupBtnText: { fontSize: 10, fontWeight: '600', color: '#fff' },

  lookupResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EAF4EE',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  lookupResultIcon: { fontSize: 20 },
  lookupResultName: { fontSize: 12, fontWeight: '700', color: '#111827' },
  lookupResultPhone:{ fontSize: 10, color: '#6B7280', marginTop: 1 },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  roleTile: {
    width: '30%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  roleTileDefault:  { borderWidth: 1,   borderColor: '#E5E7EB', backgroundColor: '#fff'     },
  roleTileSelected: { borderWidth: 1.5, borderColor: '#1A6B3C', backgroundColor: '#EAF4EE' },
  roleTileIcon:  { fontSize: 20, marginBottom: 3 },
  roleTileLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  roleTileLabelDef: { color: '#6B7280' },
  roleTileLabelSel: { color: '#1A6B3C' },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontSize: 11,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 38,
  },

  saveBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 9,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText:     { fontSize: 11, fontWeight: '700', color: '#fff' },
});
