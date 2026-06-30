import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { ScreenTopBar } from '../../components/layout/ScreenTopBar';
import { Button } from '../../components/ui/Button';
import { AlertBox } from '../../components/ui/AlertBox';

function isWeakPin(pin: string): boolean {
  // four identical digits (1111, 2222, …)
  if (/^(\d)\1{3}$/.test(pin)) return true;
  return false;
}

export function SetPINScreen() {
  const { t } = useTranslation();
  const changePassword = useAuthStore((s) => s.changePassword);
  const completePinSetup = useAuthStore((s) => s.completePinSetup);
  const loginPassword = useAuthStore((s) => s.loginPassword);

  // When loginPassword is null (session restored without fresh login), we need the user to confirm their current password
  const needsCurrentPassword = loginPassword === null;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const newPinRef = useRef<TextInput>(null);
  const confirmPinRef = useRef<TextInput>(null);

  const weakPinError = newPin.length === 4 && isWeakPin(newPin)
    ? t('auth.setPin.errorSimple')
    : null;

  const mismatchError = confirmPin.length === 4 && newPin !== confirmPin
    ? t('auth.setPin.errorMismatch')
    : null;

  const visibleError = weakPinError ?? mismatchError ?? apiError;

  const effectiveCurrentPassword = needsCurrentPassword ? currentPassword : (loginPassword ?? '');

  const canSubmit =
    newPin.length === 4 &&
    confirmPin.length === 4 &&
    newPin === confirmPin &&
    !isWeakPin(newPin) &&
    (!needsCurrentPassword || currentPassword.length > 0) &&
    !isLoading;

  const handleNewPinChange = (val: string) => {
    setNewPin(val);
    setApiError(null);
    if (val.length === 4) {
      confirmPinRef.current?.focus();
    }
  };

  const handleSavePin = async () => {
    if (!canSubmit) return;
    setIsLoading(true);
    setApiError(null);
    try {
      await changePassword(effectiveCurrentPassword, newPin);
      await completePinSetup();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('auth.error.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  const confirmMismatch = confirmPin.length > 0 && confirmPin.length === 4 && newPin !== confirmPin;
  const confirmMatch = confirmPin.length === 4 && newPin === confirmPin;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScreenTopBar title={t('auth.setPin.topBarTitle')} />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Shield icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>🔐</Text>
          </View>

          <Text style={styles.title}>{t('auth.setPin.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.setPin.subtitle')}</Text>

          {/* Current password field — only shown when we don't have it from login */}
          {needsCurrentPassword && (
            <>
              <Text style={styles.fieldLabel}>{t('auth.setPin.currentPasswordLabel')}</Text>
              <TextInput
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); setApiError(null); }}
                keyboardType="default"
                secureTextEntry
                editable={!isLoading}
                style={styles.currentPasswordInput}
                placeholder="••••••••"
                placeholderTextColor="rgba(0,0,0,0.3)"
                accessibilityLabel={t('auth.setPin.currentPasswordLabel')}
                returnKeyType="next"
                onSubmitEditing={() => newPinRef.current?.focus()}
              />
            </>
          )}

          <Text style={styles.fieldLabel}>{t('auth.setPin.newPinLabel')}</Text>

          <PinBoxRow
            inputRef={newPinRef}
            value={newPin}
            onChange={handleNewPinChange}
            accessibilityLabel={t('auth.setPin.newPinLabel')}
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
            {t('auth.setPin.confirmPinLabel')}
          </Text>

          <PinBoxRow
            inputRef={confirmPinRef}
            value={confirmPin}
            onChange={(val) => { setConfirmPin(val); setApiError(null); }}
            mismatch={confirmMismatch}
            match={confirmMatch}
            accessibilityLabel={t('auth.setPin.confirmPinLabel')}
          />

          {visibleError != null && (
            <Text style={styles.errorText}>{visibleError}</Text>
          )}

          <Button
            label={t('auth.setPin.submit')}
            onPress={() => void handleSavePin()}
            variant="primary"
            loading={isLoading}
            disabled={!canSubmit}
            style={styles.submitBtn}
          />

          <AlertBox variant="amber" message={t('auth.setPin.warning')} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── PinBoxRow helper ──────────────────────────────────────────────────────

interface PinBoxRowProps {
  inputRef: React.RefObject<TextInput>;
  value: string;
  onChange: (val: string) => void;
  mismatch?: boolean;
  match?: boolean;
  accessibilityLabel: string;
}

function PinBoxRow({
  inputRef,
  value,
  onChange,
  mismatch = false,
  match = false,
  accessibilityLabel,
}: PinBoxRowProps) {
  return (
    <View style={pinStyles.wrapper}>
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry={false}
        caretHidden
        style={pinStyles.hiddenInput}
        accessibilityLabel={accessibilityLabel}
      />
      {/* Visual boxes */}
      <Pressable
        style={pinStyles.row}
        onPress={() => inputRef.current?.focus()}
      >
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
              {filled && (
                <Text
                  style={[
                    pinStyles.digit,
                    mismatch && pinStyles.digitMismatch,
                  ]}
                >
                  {value[i]}
                </Text>
              )}
            </View>
          );
        })}
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF4EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconEmoji: { fontSize: 26 },

  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
    maxWidth: 200,
    lineHeight: 14,
  },

  currentPasswordInput: {
    alignSelf: 'stretch',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },

  fieldLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 5,
    alignSelf: 'center',
  },
  fieldLabelSpaced: { marginTop: 8 },

  errorText: {
    color: '#DC2626',
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 8,
  },

  submitBtn: { marginTop: 4, alignSelf: 'stretch', marginBottom: 10 },
});

const pinStyles = StyleSheet.create({
  wrapper: { position: 'relative', marginBottom: 12, alignItems: 'center' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 44,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: '#1A6B3C',
    borderWidth: 2,
  },
  boxFilled: {
    backgroundColor: '#EAF4EE',
    borderColor: '#1A6B3C',
    borderWidth: 2,
  },
  boxMismatch: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  boxMatch: {
    backgroundColor: '#EAF4EE',
    borderColor: '#1A6B3C',
  },
  digit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A6B3C',
  },
  digitMismatch: {
    color: '#DC2626',
  },
});
