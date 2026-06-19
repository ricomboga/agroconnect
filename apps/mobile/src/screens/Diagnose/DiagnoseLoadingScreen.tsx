import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';
import { diagnoseApi } from '../../api/diagnose';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnoseLoading'>;

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 120000;

export function DiagnoseLoadingScreen({ navigation, route }: Props) {
  const { diagnosisId, farmId } = route.params;
  const { t } = useTranslation();
  const [timedOut, setTimedOut] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;
  const elapsed = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spinValue, { toValue: 1, duration: 1500, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [spinValue]);

  const doPoll = useCallback(async () => {
    try {
      const result = await diagnoseApi.getResult(diagnosisId);
      if (result.status === 'completed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        navigation.replace('DiagnoseResult', { diagnosisId, farmId });
      } else if (result.status === 'failed') {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimedOut(true);
      }
    } catch {
      /* keep polling on network error */
    }
  }, [diagnosisId, farmId, navigation]);

  const startPolling = useCallback(() => {
    elapsed.current = 0;
    setTimedOut(false);
    void doPoll();
    intervalRef.current = setInterval(() => {
      elapsed.current += POLL_INTERVAL_MS;
      if (elapsed.current >= TIMEOUT_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimedOut(true);
        return;
      }
      void doPoll();
    }, POLL_INTERVAL_MS);
  }, [doPoll]);

  useEffect(() => {
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startPolling]);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.ringWrap}>
        <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
        <View style={styles.ringCenter}>
          <Text style={styles.ringIcon}>🔬</Text>
        </View>
      </View>

      <Text style={styles.title}>{t('diagnose.loading.title')}</Text>
      <Text style={styles.subtitle}>{t('diagnose.loading.subtitle')}</Text>

      {timedOut && (
        <View style={styles.timeoutBox}>
          <Text style={styles.timeoutText}>{t('diagnose.loading.timeout')}</Text>
          <Pressable style={styles.retryBtn} onPress={startPolling}>
            <Text style={styles.retryBtnText}>{t('diagnose.loading.retry')}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  ringWrap: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: '#2E7D32',
    borderRightColor: '#2E7D32',
  },
  ringCenter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringIcon: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: '700', color: '#1B1B1B', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#757575', textAlign: 'center' },
  timeoutBox: { marginTop: 32, alignItems: 'center' },
  timeoutText: { fontSize: 14, color: '#757575', textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
