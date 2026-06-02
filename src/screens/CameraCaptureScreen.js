import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AppButton from '../components/AppButton';
import Card from '../components/Card';
import ScreenLayout from '../components/ScreenLayout';
import ROUTES from '../navigation/routes';
import {
  capturePhoto,
  recordVideo,
  requestCameraPermission,
} from '../services/cameraService';
import { SPACING } from '../theme';
import { handleError } from '../utils/errorHandler';

function CameraCaptureScreen({ navigation, route }) {
  const token = route.params?.qrToken || route.params?.token;
  const cameraRef = useRef(null);
  const [permission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [captureMode, setCaptureMode] = useState('photo');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [captureSuccessText, setCaptureSuccessText] = useState('');
  const [errorText, setErrorText] = useState('');

  async function ensureCameraPermission() {
    try {
      setIsRequestingPermission(true);
      const permissionResult = await requestCameraPermission();

      if (!permissionResult.granted) {
        setErrorText('Camera permission is required to capture identity proof.');
      } else {
        setErrorText('');
      }
    } catch {
      setErrorText('Camera is unavailable on this device.');
    } finally {
      setIsRequestingPermission(false);
    }
  }

  useEffect(() => {
    ensureCameraPermission();
  }, []);

  function goBackToProcessing(data) {
    navigation.navigate(ROUTES.PROCESSING, {
      qrToken: token,
      photoUri: data.media?.uri,
      sessionId: route.params?.sessionId,
      ...data,
    });
  }

  async function handleCapture() {
    if (!cameraRef.current) {
      setErrorText('Camera preview is not ready.');
      return;
    }

    try {
      setIsCapturing(true);
      setErrorText('');
      setCaptureSuccessText('Capturing image...');

      const media = captureMode === 'video'
        ? await recordVideo(cameraRef)
        : await capturePhoto(cameraRef);

      setPreviewMedia(media);
      setCaptureSuccessText('Photo captured successfully');
    } catch (error) {
      const normalizedError = handleError(error);
      setCaptureSuccessText('');
      setErrorText(normalizedError.message || 'Camera capture failed. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }

  function handleConfirmCapture() {
    if (!previewMedia) {
      return;
    }

    navigation.navigate(ROUTES.PROCESSING, {
      qrToken: token,
      sessionId: route.params?.sessionId,
      photoUri: previewMedia.uri,
      cameraCancelled: false,
    });
  }

  function handleRetake() {
    setPreviewMedia(null);
    setCaptureSuccessText('');
    setErrorText('');
  }

  function handleCancelCapture() {
    navigation.navigate(ROUTES.PROCESSING, {
      qrToken: token,
      sessionId: route.params?.sessionId,
      photoUri: null,
      cameraCancelled: true,
    });
  }

  if (permission?.granted === false) {
    return (
      <ScreenLayout contentStyle={styles.contentStyle}>
        <Card style={styles.permissionCard}>
          <Text style={styles.errorTitle}>Camera access required</Text>
          <Text style={styles.subtitle}>Grant camera access to complete attendance validation.</Text>
          <AppButton
            label={isRequestingPermission ? 'Requesting...' : 'Allow Camera'}
            onPress={ensureCameraPermission}
            loading={isRequestingPermission}
            disabled={isRequestingPermission}
          />
          <AppButton label="Cancel Capture" variant="secondary" onPress={handleCancelCapture} />
        </Card>
      </ScreenLayout>
    );
  }

  if (!permission) {
    return (
      <ScreenLayout contentStyle={styles.contentStyle} centered>
        <ActivityIndicator size="large" color="#3a6095" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <View style={styles.topBar}>
        <AppButton label="Cancel" variant="secondary" onPress={handleCancelCapture} style={styles.cancelButton} />
      </View>

      <View style={styles.previewWrap}>
        {previewMedia?.uri ? (
          <Image source={{ uri: previewMedia.uri }} style={styles.cameraPreview} resizeMode="cover" />
        ) : (
          <>
            <CameraView ref={cameraRef} style={styles.cameraPreview} />
            <View style={[styles.overlayFrame, { pointerEvents: 'none' }]} />
          </>
        )}
      </View>

      <Text style={styles.subtitle}>{previewMedia?.uri ? 'Review your capture before confirm' : 'Align yourself clearly inside frame'}</Text>
      {captureSuccessText ? <Text style={styles.successText}>{captureSuccessText}</Text> : null}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      {!previewMedia?.uri ? (
        <View style={styles.modeToggle}>
          <Pressable
            style={[styles.modePill, captureMode === 'photo' && styles.modePillActive]}
            onPress={() => setCaptureMode('photo')}
            disabled={isCapturing}
          >
            <Text style={[styles.modeText, captureMode === 'photo' && styles.modeTextActive]}>Photo</Text>
          </Pressable>
          <Pressable
            style={[styles.modePill, captureMode === 'video' && styles.modePillActive]}
            onPress={() => setCaptureMode('video')}
            disabled={isCapturing}
          >
            <Text style={[styles.modeText, captureMode === 'video' && styles.modeTextActive]}>Video (3s)</Text>
          </Pressable>
        </View>
      ) : null}

      {previewMedia?.uri ? (
        <View style={styles.confirmRow}>
          <AppButton label="Retake" variant="secondary" onPress={handleRetake} style={styles.halfButton} />
          <AppButton label="Confirm" onPress={handleConfirmCapture} style={styles.halfButton} />
        </View>
      ) : (
        <AppButton
          label={isCapturing ? (captureMode === 'video' ? 'Recording...' : 'Capturing image...') : (captureMode === 'video' ? 'Record 3s Video' : 'Capture Photo')}
          loading={isCapturing}
          onPress={handleCapture}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  topBar: {
    alignItems: 'flex-start',
  },
  cancelButton: {
    minWidth: 110,
  },
  previewWrap: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    aspectRatio: 9 / 13,
  },
  cameraPreview: {
    height: '100%',
    width: '100%',
  },
  overlayFrame: {
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 18,
    borderWidth: 2,
    height: '56%',
    position: 'absolute',
    width: '68%',
  },
  subtitle: {
    color: '#5a6062',
    fontSize: 13,
    textAlign: 'center',
  },
  modeToggle: {
    backgroundColor: '#e5e9eb',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    padding: 4,
  },
  modePill: {
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  modePillActive: {
    backgroundColor: '#3a6095',
  },
  modeText: {
    color: '#5a6062',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeTextActive: {
    color: '#f8f8ff',
  },
  permissionCard: {
    gap: 10,
  },
  errorTitle: {
    color: '#a83836',
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: '#a83836',
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    color: '#16a34a',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
  },
});

export default CameraCaptureScreen;
