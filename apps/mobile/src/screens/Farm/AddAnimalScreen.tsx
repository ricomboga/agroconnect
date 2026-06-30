import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { useAddAnimal } from '../../hooks/useFarms';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineBanner } from '../../components/Common/OfflineBanner';

type Props = NativeStackScreenProps<FarmStackParamList, 'AddAnimalScreen'>;

type AnimalTile = { value: string; icon: string; labelKey: string };

const ANIMAL_TILES: AnimalTile[] = [
  { value: 'cattle',  icon: '🐄', labelKey: 'animal.add.tile.cattle'  },
  { value: 'goats',   icon: '🐐', labelKey: 'animal.add.tile.goats'   },
  { value: 'sheep',   icon: '🐑', labelKey: 'animal.add.tile.sheep'   },
  { value: 'poultry', icon: '🐓', labelKey: 'animal.add.tile.poultry' },
  { value: 'pigs',    icon: '🐷', labelKey: 'animal.add.tile.pigs'    },
  { value: 'rabbits', icon: '🐰', labelKey: 'animal.add.tile.rabbits' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAD = 11;
const GAP = 6;
const TILE_SIZE = (SCREEN_WIDTH - PAD * 2 - GAP * 2) / 3;

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

export function AddAnimalScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const { isOnline } = useOfflineSync();
  const addAnimalMutation = useAddAnimal(farmId);

  const [animalType, setAnimalType] = useState<string | null>(null);
  const [customType, setCustomType] = useState('');
  const [count, setCount] = useState('');
  const [breed, setBreed] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const resolvedType = animalType === 'other'
    ? customType.trim()
    : animalType
    ? t(`animal.add.tile.${animalType}`)
    : '';

  const canSubmit =
    !!resolvedType &&
    count.trim() !== '' &&
    Number(count) > 0 &&
    !addAnimalMutation.isPending;

  const handleSave = useCallback(async () => {
    if (!canSubmit || !resolvedType) return;
    setErrorMsg(null);

    try {
      await addAnimalMutation.mutateAsync({
        animalType: resolvedType,
        count: Number(count),
        breed: breed.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch {
      setErrorMsg(t('animal.add.errorSave'));
    }
  }, [canSubmit, resolvedType, count, breed, notes, addAnimalMutation, navigation, t]);

  return (
    <View style={s.root}>
      <StatusBar backgroundColor="#1A6B3C" barStyle="light-content" />

      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={s.topBarBack} accessibilityRole="button">
          <Text style={s.topBarBackText}>← {t('common.back')}</Text>
        </Pressable>
        <Text style={s.topBarTitle}>{t('animal.add.topBarTitle')}</Text>
        <View style={s.topBarSpacer} />
      </View>

      {!isOnline && <OfflineBanner />}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.flex} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {errorMsg && <AlertBox variant="red" message={errorMsg} />}

          {/* Animal type tiles */}
          <Text style={s.sectionLabel}>{t('animal.add.typeSection')}</Text>
          <View style={s.tileGrid}>
            {ANIMAL_TILES.map((tile) => {
              const selected = animalType === tile.value;
              return (
                <Pressable
                  key={tile.value}
                  style={[s.tile, { width: TILE_SIZE, height: TILE_SIZE }, selected ? s.tileSelected : s.tileDefault]}
                  onPress={() => setAnimalType(tile.value)}
                  accessibilityRole="button"
                >
                  <Text style={s.tileIcon}>{tile.icon}</Text>
                  <Text style={[s.tileLabel, selected ? s.tileLabelSel : s.tileLabelDef]}>
                    {t(tile.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Custom type when "other" selected — not in tiles; any free-text input */}
          <Text style={s.label}>{t('animal.add.customTypeLabel')}</Text>
          <TextInput
            style={s.input}
            value={animalType && animalType !== 'other' ? t(`animal.add.tile.${animalType}`) : customType}
            onChangeText={(v) => {
              setCustomType(v);
              setAnimalType('other');
            }}
            placeholder={t('animal.add.customTypePlaceholder')}
            placeholderTextColor="#9CA3AF"
            editable={true}
          />

          {/* Count */}
          <Text style={s.label}>{t('animal.add.countLabel')}</Text>
          <TextInput
            style={s.input}
            value={count}
            onChangeText={setCount}
            placeholder={t('animal.add.countPlaceholder')}
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />

          {/* Breed (optional) */}
          <Text style={s.label}>{t('animal.add.breedLabel')}</Text>
          <TextInput
            style={s.input}
            value={breed}
            onChangeText={setBreed}
            placeholder={t('animal.add.breedPlaceholder')}
            placeholderTextColor="#9CA3AF"
          />

          {/* Notes (optional) */}
          <Text style={s.label}>{t('animal.add.notesLabel')}</Text>
          <TextInput
            style={[s.input, s.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('animal.add.notesPlaceholder')}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          {/* Save */}
          <Pressable
            style={[s.saveBtn, !canSubmit && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {addAnimalMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{t('animal.add.saveBtn')}</Text>
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

  content: { padding: PAD, paddingBottom: 40 },

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

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    marginBottom: 4,
  },
  tile: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileDefault:  { borderWidth: 1,   borderColor: '#E5E7EB', backgroundColor: '#fff'     },
  tileSelected: { borderWidth: 1.5, borderColor: '#1A6B3C', backgroundColor: '#EAF4EE' },
  tileIcon:     { fontSize: 22, marginBottom: 3 },
  tileLabel:    { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  tileLabelDef: { color: '#6B7280' },
  tileLabelSel: { color: '#1A6B3C' },

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
  notesInput: { height: 70, paddingTop: 7 },

  saveBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 6,
    paddingVertical: 9,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText:     { fontSize: 11, fontWeight: '700', color: '#fff' },
});
