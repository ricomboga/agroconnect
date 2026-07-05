import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../store/ui.store';
import type { AuthStackParamList } from '../../navigation/types';

type ResetPinNav = NativeStackNavigationProp<AuthStackParamList, 'ResetPin'>;
type ResetPinRoute = RouteProp<AuthStackParamList, 'ResetPin'>;

function isWeakPin(pin: string): boolean {
  return /^(\d)\1{3}$/.test(pin);
}

export function ResetPinScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<ResetPinNav>();
  const { params } = useRoute<ResetPinRoute>();
  const resetPin = useAuthStore((s) => s.resetPin);
  const showToast = useUiStore((s) => s.showToast);

  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const newPinRef = useRef<TextInput>(null);
  const confirmPinRef = useRef<TextInput>(null);

  const weakPinError = newPin.length === 4 && isWeakPin(newPin) ? t('auth.setPin.errorSimple') : null;
  const mismatchError = confirmPin.length === 4 && newPin !== confirmPin ? t('auth.setPin.errorMismatch') : null;
  const visibleError = weakPinError ?? mismatchError ?? apiError;

  const canSubmit =
    code.length === 6 &&
    newPin.length === 4 &&
    confirmPin.length === 4 &&
    newPin === confirmPin &&
    !isWeakPin(newPin) &&
    !isSubmitting;

  const handleCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setApiError(null);
    if (digits.length === 6) newPinRef.current?.focus();
  };

  const handleNewPinChange = (val: string) => {
    setNewPin(val);
    setApiError(null);
    if (val.length === 4) confirmPinRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setApiError(null);
    try {
      await resetPin(params.phone, code, newPin);
      showToast(t('auth.resetPin.success'), 'success');
      navigation.navigate('Login');
    } catch (err) {
      setApiError(err instanceof Error ? t(err.message) : t('auth.error.networkError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backRow} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </Pressable>

          <Text style={styles.title}>{t('auth.resetPin.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.resetPin.subtitle', { phone: params.phone })}</Text>

          <Text style={styles.fieldLabel}>{t('auth.resetPin.codeLabel')}</Text>
          <TextInput
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isSubmitting}
            style={styles.codeInput}
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel={t('auth.resetPin.codeLabel')}
          />

          <Text style={styles.fieldLabel}>{t('auth.setPin.newPinLabel')}</Text>
          <PinBoxRow inputRef={newPinRef} value={newPin} onChange={handleNewPinChange} accessibilityLabel={t('auth.setPin.newPinLabel')} />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>{t('auth.setPin.confirmPinLabel')}</Text>
          <PinBoxRow
            inputRef={confirmPinRef}
            value={confirmPin}
            onChange={(val) => { setConfirmPin(val); setApiError(null); }}
            mismatch={confirmPin.length === 4 && newPin !== confirmPin}
            match={confirmPin.length === 4 && newPin === confirmPin}
            accessibilityLabel={t('auth.setPin.confirmPinLabel')}
          />

          {visibleError != null && <Text style={styles.errorText}>{visibleError}</Text>}

          <Pressable style={styles.submitBtn} onPress={() => void handleSubmit()} disabled={!canSubmit} accessibilityRole="button">
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{t('auth.resetPin.submit')}</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface PinBoxRowProps {
  inputRef: React.RefObject<TextInput>;
  value: string;
  onChange: (val: string) => void;
  mismatch?: boolean;
  match?: boolean;
  accessibilityLabel: string;
}

function PinBoxRow({ inputRef, value, onChange, mismatch = false, match = false, accessibilityLabel }: PinBoxRowProps) {
  return (
    <View style={pinStyles.wrapper}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={4}
        caretHidden
        style={pinStyles.hiddenInput}
        accessibilityLabel={accessibilityLabel}
      />
      <Pressable style={pinStyles.row} onPress={() => inputRef.current?.focus()}>
        {[0, 1, 2, 3].map((i) => {
          const filled = i < value.length;
          const isActive = i === value.length;
          return (
            <View
              key={i}
              style={[
                pinStyles.box,
                isActive && pinStyles.boxActive,
                filled && pinStyles.boxFilled,
                filled && mismatch && pinStyles.boxMismatch,
                filled && match && pinStyles.boxMatch,
              ]}
            >
              {filled && <Text style={[pinStyles.digit, mismatch && pinStyles.digitMismatch]}>{value[i]}</Text>}
            </View>
          );
        })}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  backRow: { minHeight: 48, justifyContent: 'center', marginBottom: 8 },
  backText: { color: '#2E7D32', fontSize: 15 },
  title: { fontSize: 24, fontWeight: '800', color: '#1B5E20', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#555555', lineHeight: 20, marginBottom: 24 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  fieldLabelSpaced: { marginTop: 12 },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    letterSpacing: 4,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  errorText: { color: '#B00020', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  submitBtn: {
    backgroundColor: '#1A6B3C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 20,
  },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

const pinStyles = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: 8 },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  row: { flexDirection: 'row', gap: 10 },
  box: {
    width: 48,
    height: 54,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: '#1A6B3C', borderWidth: 2 },
  boxFilled: { backgroundColor: '#EAF4EE', borderColor: '#1A6B3C', borderWidth: 2 },
  boxMismatch: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  boxMatch: { backgroundColor: '#EAF4EE', borderColor: '#1A6B3C' },
  digit: { fontSize: 22, fontWeight: '700', color: '#1A6B3C' },
  digitMismatch: { color: '#DC2626' },
});
