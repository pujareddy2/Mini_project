import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ScreenLayout from '../components/ScreenLayout';
import ROUTES from '../navigation/routes';
import { verifyQR } from '../services/qrService';
import { handleError } from '../utils/errorHandler';

function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [scanState, setScanState] = useState('scanning');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [inputMode, setInputMode] = useState(Platform.OS === 'web' ? 'manual' : 'camera');

  const framePulse = useRef(new Animated.Value(0.25)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') {
      setHasPermission(true);
      return;
    }

    async function askPermission() {
      try {
        if (permission?.granted) {
          setHasPermission(true);
          return;
        }

        const response = await requestPermission();
        setHasPermission(Boolean(response?.granted));
      } catch (error) {
        const normalizedError = handleError(error);
        setHasPermission(false);
        setScannerError(normalizedError.message || 'Camera is not available on this device.');
      }
    }

    askPermission();
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(framePulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(framePulse, {
          toValue: 0.25,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(scanLine, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ).start();
  }, [framePulse, scanLine]);

  async function startProcessing(tokenValue, options = {}) {
    const { fromCamera = false } = options;
    const token = tokenValue?.trim() || '';

    console.log('QR input:', token);

    if (!token) {
      setScannerError('Please enter a valid QR code');
      return;
    }

    setScannerError('');
    if (fromCamera) {
      setScanned(true);
    }
    setScanState('processing');

    try {
      setIsValidatingToken(true);
      const response = await verifyQR(token);

      console.log('API response:', response);

      if (!response) {
        setScannerError('Invalid QR code');
        setScanState('scanning');
        if (fromCamera) {
          setScanned(false);
        }
        return;
      }

      if (Platform.OS !== 'web') {
        Vibration.vibrate(80);
      }

      try {
        let parsedToken = token;
        let originalSessionId = null;
        try {
          const parsed = JSON.parse(token);
          parsedToken = parsed.qr_token;
          originalSessionId = parsed.session_id;
        } catch {}

        navigation.navigate(ROUTES.CAMERA_CAPTURE, {
          token: parsedToken,
          sessionId: response.id || response.session_id || originalSessionId,
        });
      } catch {
        setScannerError('Something went wrong. Try again');
        setScanState('scanning');
        if (fromCamera) {
          setScanned(false);
        }
      }
    } catch {
      setScannerError('Something went wrong. Try again');
      setScanState('scanning');
      if (fromCamera) {
        setScanned(false);
      }
    } finally {
      setIsValidatingToken(false);
    }
  }

  function handleScan({ data }) {
    if (scanned) {
      return;
    }

    startProcessing(data, { fromCamera: true });
  }

  function handleScanAgain() {
    setScanned(false);
    setScanState('scanning');
    setScannerError('');
    setManualToken('');
  }

  function renderManualEntry() {
    return (
      <Card style={styles.webFallbackWrap}>
        <Text style={styles.helpText}>Manual Entry</Text>
        <Text style={styles.helpSubText}>Type or paste the session token.</Text>

        <TextInput
          value={manualToken}
          onChangeText={(value) => {
            setManualToken(value);
            if (scannerError) {
              setScannerError('');
            }
          }}
          placeholder="Enter QR token manually"
          style={styles.tokenInput}
          autoCapitalize="none"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.helperText}>Enter QR token carefully</Text>

        <AppButton
          label={isValidatingToken ? 'Validating...' : 'Continue to Verification'}
          onPress={() => startProcessing(manualToken)}
          style={styles.verifyButton}
          loading={isValidatingToken}
          disabled={!manualToken.trim() || isValidatingToken}
        />

        {scannerError ? <Text style={styles.errorText}>{scannerError}</Text> : null}

        {scanned ? (
          <AppButton
            label="Scan Again"
            onPress={handleScanAgain}
            style={styles.scanAgainButton}
          />
        ) : null}
      </Card>
    );
  }

  function renderScannerBody() {
    if (inputMode === 'manual') {
      return renderManualEntry();
    }

    if (hasPermission === null) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#3b82f6" size="large" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (!hasPermission) {
      return (
        <Card style={styles.permissionCard}>
          <Text style={styles.errorTitle}>Camera permission is required</Text>
          <Text style={styles.helpSubText}>Enable camera access from device settings.</Text>
          <AppButton label="Try Permission Again" onPress={requestPermission} style={styles.verifyButton} />
        </Card>
      );
    }

    return (
      <View style={styles.scannerStack}>
        <View style={styles.sessionPill}>
          <Text style={styles.sessionPillText}>Scanning active • 60s remaining</Text>
        </View>
        <Text style={styles.sessionTag}>{scanState === 'processing' ? 'Processing scan...' : 'Session active'}</Text>
        <Text style={styles.scannerTitle}>Position QR code within frame</Text>

        <View style={styles.overlayWrap}>
          <CameraView
            onBarcodeScanned={scanned ? undefined : handleScan}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            style={styles.scannerView}
            autofocus="on"
          />

          <View style={[styles.maskTop, { pointerEvents: 'none' }]} />
          <View style={[styles.maskBottom, { pointerEvents: 'none' }]} />
          <View style={[styles.maskLeft, { pointerEvents: 'none' }]} />
          <View style={[styles.maskRight, { pointerEvents: 'none' }]} />

          <Animated.View style={[styles.scanGlow, { opacity: framePulse, pointerEvents: 'none' }]} />
          <View style={[styles.scanFrame, { pointerEvents: 'none' }]} />
          <View style={[styles.cornerTopLeft, { pointerEvents: 'none' }]} />
          <View style={[styles.cornerTopRight, { pointerEvents: 'none' }]} />
          <View style={[styles.cornerBottomLeft, { pointerEvents: 'none' }]} />
          <View style={[styles.cornerBottomRight, { pointerEvents: 'none' }]} />

          <Animated.View
            style={[
              styles.scanLine,
              {
                pointerEvents: 'none',
                transform: [{
                  translateY: scanLine.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-86, 86],
                  }),
                }],
              },
            ]}
          />
        </View>

        <Text style={styles.helpSubText}>Place the QR token fully inside the highlighted frame.</Text>
        {scannerError ? <Text style={styles.errorText}>{scannerError}</Text> : null}

        <View style={styles.actionsRow}>
          <Pressable onPress={handleScanAgain} style={styles.iconAction}>
            <Text style={styles.iconActionText}>Reset</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader title="Verimark" subtitle="Scanner" showBack onBackPress={() => navigation.goBack()} />

      <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 999, padding: 4, marginHorizontal: 20, marginTop: 16 }}>
        <Pressable 
          onPress={() => setInputMode('camera')}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: inputMode === 'camera' ? '#fff' : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: inputMode === 'camera' ? '700' : '500', color: inputMode === 'camera' ? '#0f172a' : '#64748b' }}>Scan QR Code</Text>
        </Pressable>
        <Pressable 
          onPress={() => setInputMode('manual')}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: inputMode === 'manual' ? '#fff' : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: inputMode === 'manual' ? '700' : '500', color: inputMode === 'manual' ? '#0f172a' : '#64748b' }}>Enter Code Manually</Text>
        </Pressable>
      </View>

      <View style={styles.centerWrap}>{renderScannerBody()}</View>

      <AppButton
        label="Back to Home"
        onPress={() => navigation.navigate(ROUTES.HOME)}
        style={[styles.backButton, { marginHorizontal: 20, width: 'auto' }]}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginVertical: 10,
    width: '100%',
  },
  scannerStack: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  sessionPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionPillText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  webFallbackWrap: {
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
  },
  permissionCard: {
    alignItems: 'stretch',
    gap: 10,
  },
  overlayWrap: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    height: 380,
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
    width: '100%',
  },
  scannerView: {
    height: 380,
    width: '100%',
  },
  maskTop: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    height: 75,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  maskBottom: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    bottom: 0,
    height: 75,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  maskLeft: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    bottom: 75,
    left: 0,
    position: 'absolute',
    top: 75,
    width: 55,
  },
  maskRight: {
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    bottom: 75,
    position: 'absolute',
    right: 0,
    top: 75,
    width: 55,
  },
  scanFrame: {
    borderColor: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 18,
    borderWidth: 2.5,
    height: 210,
    position: 'absolute',
    width: 210,
  },
  scanGlow: {
    borderColor: '#3b82f6',
    borderRadius: 24,
    borderWidth: 2,
    height: 224,
    position: 'absolute',
    width: 224,
  },
  cornerTopLeft: {
    borderColor: '#3b82f6',
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
    borderTopWidth: 4,
    height: 26,
    left: 31,
    position: 'absolute',
    top: 31,
    width: 26,
  },
  cornerTopRight: {
    borderColor: '#3b82f6',
    borderRightWidth: 4,
    borderTopRightRadius: 12,
    borderTopWidth: 4,
    height: 26,
    position: 'absolute',
    right: 31,
    top: 31,
    width: 26,
  },
  cornerBottomLeft: {
    borderBottomLeftRadius: 12,
    borderBottomWidth: 4,
    borderColor: '#3b82f6',
    borderLeftWidth: 4,
    bottom: 31,
    height: 26,
    left: 31,
    position: 'absolute',
    width: 26,
  },
  cornerBottomRight: {
    borderBottomRightRadius: 12,
    borderBottomWidth: 4,
    borderColor: '#3b82f6',
    borderRightWidth: 4,
    bottom: 31,
    height: 26,
    position: 'absolute',
    right: 31,
    width: 26,
  },
  scanLine: {
    backgroundColor: 'rgba(191, 219, 254, 0.9)',
    borderRadius: 999,
    height: 3,
    left: 35,
    position: 'absolute',
    right: 35,
    top: '50%',
  },
  sessionTag: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  scannerTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  helpText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  helpSubText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    width: '100%',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 10,
  },
  tokenInput: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(100, 116, 139, 0.24)',
    borderRadius: 12,
    borderWidth: 1,
    color: '#0f172a',
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  verifyButton: {
    marginTop: 8,
    width: '100%',
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  actionsRow: {
    marginTop: 4,
  },
  iconAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  iconActionText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  scanAgainButton: {
    marginTop: 10,
    width: '100%',
  },
  backButton: {
    marginTop: 16,
    width: '100%',
  },
});

export default ScanScreen;
