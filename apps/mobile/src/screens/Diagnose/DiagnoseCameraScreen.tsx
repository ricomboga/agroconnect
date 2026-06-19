import React, { useCallback, useRef, useState } from 'react';
import {
  Image, Pressable, SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<DiagnoseStackParamList, 'DiagnoseCamera'>;

export function DiagnoseCameraScreen({ navigation, route }: Props) {
  const { farmId } = route.params;
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [photos, setPhotos] = useState<string[]>([]);
  const [captured, setCaptured] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const takePicture = useCallback(async () => {
    if (photos.length >= 3) return;
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
    if (photo) setCaptured(photo.uri);
  }, [photos.length]);

  const usePhoto = useCallback(() => {
    if (captured) {
      setPhotos((prev) => [...prev, captured]);
      setCaptured(null);
    }
  }, [captured]);

  const retake = useCallback(() => setCaptured(null), []);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const proceed = useCallback(() => {
    navigation.navigate('DiagnoseSubject', { farmId, photoUris: photos });
  }, [navigation, farmId, photos]);

  if (!permission) return <View style={styles.flex} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permContainer}>
        <Text style={styles.permText}>{t('diagnose.camera.permission')}</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>{t('diagnose.camera.permissionBtn')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top bar: close + thumbnails + count */}
      <SafeAreaView style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
        <View style={styles.thumbRow}>
          {photos.map((uri, i) => (
            <View key={i} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <Pressable style={styles.thumbRemove} onPress={() => removePhoto(i)} hitSlop={12}>
                <Text style={styles.thumbRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {photos.length > 0 && (
          <Text style={styles.countBadge}>
            {t('diagnose.camera.photoCount', { count: photos.length })}
          </Text>
        )}
      </SafeAreaView>

      {/* Full-screen preview after capture */}
      {captured && (
        <View style={[StyleSheet.absoluteFill, styles.previewOverlay]}>
          <Image source={{ uri: captured }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={styles.previewActions}>
            <Pressable style={styles.previewBtn} onPress={retake}>
              <Text style={styles.previewBtnText}>{t('diagnose.camera.retake')}</Text>
            </Pressable>
            <Pressable style={[styles.previewBtn, styles.previewBtnPrimary]} onPress={usePhoto}>
              <Text style={[styles.previewBtnText, styles.previewBtnTextPrimary]}>
                {t('diagnose.camera.usePhoto')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Bottom controls */}
      {!captured && (
        <View style={styles.bottomBar}>
          {photos.length < 3 ? (
            <Pressable style={styles.captureBtn} onPress={takePicture} accessibilityLabel="Take photo">
              <View style={styles.captureBtnInner} />
            </Pressable>
          ) : (
            <View style={styles.captureBtnDisabled} />
          )}
          {photos.length >= 1 && (
            <Pressable style={styles.continueBtn} onPress={proceed}>
              <Text style={styles.continueBtnText}>{t('diagnose.camera.continue')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },

  permContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permText: { fontSize: 16, color: '#555555', textAlign: 'center', marginBottom: 24 },
  permBtn: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  thumbRow: { flex: 1, flexDirection: 'row', gap: 8 },
  thumbWrap: { width: 52, height: 52 },
  thumb: { width: 52, height: 52, borderRadius: 6, borderWidth: 2, borderColor: '#2E7D32' },
  thumbRemove: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B00020',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  thumbRemoveText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  countBadge: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginLeft: 8 },

  previewOverlay: { justifyContent: 'flex-end' },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },
  previewBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  previewBtnPrimary: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  previewBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  previewBtnTextPrimary: { color: '#FFFFFF' },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingTop: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    gap: 16,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 4,
  },
  captureBtnInner: { flex: 1, borderRadius: 32, backgroundColor: '#FFFFFF' },
  captureBtnDisabled: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  continueBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
