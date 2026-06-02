import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ScreenLayout from '../components/ScreenLayout';
import ROUTES from '../navigation/routes';
import { verifyQR } from '../services/qrService';
import { captureGPS } from '../services/validationService';
import { captureWiFi } from '../services/networkService';
import { uploadMedia, submitAttendance } from '../services/attendanceService';
import { SPACING } from '../theme';

function ProcessingScreen({ navigation, route }) {
  const [screenState, setScreenState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const { qrToken } = route.params || {};

  function goBackToScan() {
    navigation.replace(ROUTES.SCAN);
  }

  useEffect(() => {
    const runAttendanceFlow = async () => {
      try {
        const { qrToken: token, photoUri, cameraCancelled, sessionId: paramSessionId } = route.params || {};

        if (!token) {
          setScreenState('invalid');
          setErrorMessage('QR Token is missing');
          return;
        }

        // Use photo if available, otherwise skip (camera was cancelled or unavailable)
        let finalPhotoUri = photoUri || null;

        const studentId = await AsyncStorage.getItem('user_id');
        const deviceId = await AsyncStorage.getItem('device_id');

        // QR verification — fall back to sessionId from params if verify fails
        let sessionId = paramSessionId;
        try {
          const qrResult = await verifyQR(token);
          sessionId = paramSessionId || qrResult.session_id;
        } catch (qrError) {
          console.log('QR verify failed, using sessionId from params:', paramSessionId);
          if (!sessionId) {
            throw new Error('QR verification failed and no session ID available.');
          }
        }

        const gps = await captureGPS();
        const wifi = await captureWiFi();

        // Upload media only if photo exists
        let mediaUrl = 'no_photo';
        if (finalPhotoUri) {
          mediaUrl = await uploadMedia(finalPhotoUri);
        }

        const result = await submitAttendance({
          session_id: sessionId,
          qr_token: token,
          device_id: deviceId || 'web_browser_device',
          gps_lat: gps.latitude || 0.0,
          gps_lon: gps.longitude || 0.0,
          wifi_ssid: wifi.ssid || 'unavailable',
          bssid: wifi.bssid || '',
          media_url: mediaUrl
        });

        navigation.replace(ROUTES.RESULT, { attendanceResult: result });

      } catch (error) {
        navigation.replace(ROUTES.ERROR, {
          error: error.message,
          canRetry: true,
          retryRoute: ROUTES.SCAN
        });
      }
    };

    runAttendanceFlow();
  }, []);

  if (screenState === 'invalid') {
    return (
      <ScreenLayout contentStyle={styles.contentStyle} centered>
        <Card style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Invalid session. Please scan again</Text>
          <Text style={styles.fallbackText}>The QR data was missing or could not be used safely.</Text>
          <AppButton label="Go Back" variant="secondary" onPress={goBackToScan} />
          <AppButton label="Scan Again" onPress={goBackToScan} />
        </Card>
      </ScreenLayout>
    );
  }

  if (screenState === 'error') {
    return (
      <ScreenLayout contentStyle={styles.contentStyle} centered>
        <Card style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Something went wrong</Text>
          <Text style={styles.fallbackText}>{errorMessage || 'Processing failed unexpectedly.'}</Text>
          <AppButton label="Go Back" variant="secondary" onPress={goBackToScan} />
        </Card>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle} centered>
      <AppHeader title="Verimark" subtitle="Attendance verification" />

      <Card style={styles.loadingCard}>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
        {Platform.OS === 'web' ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Web demo mode</Text>
          </View>
        ) : null}
        <Text style={styles.title}>Processing attendance...</Text>
        <Text style={styles.subtitle}>Validating your QR input and preparing the next screen.</Text>
      </Card>

      <View style={styles.helperStack}>
        <Text style={styles.helperText}>QR token received</Text>
        <Text style={styles.helperTextMuted}>{qrToken || 'Missing QR token'}</Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.md,
    justifyContent: 'center',
    paddingBottom: SPACING.lg,
  },
  loadingCard: {
    alignItems: 'center',
    gap: 10,
  },
  spinnerWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 999,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  badge: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  helperStack: {
    alignItems: 'center',
    gap: 4,
  },
  helperText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '600',
  },
  helperTextMuted: {
    color: '#64748b',
    fontSize: 12,
  },
  fallbackCard: {
    alignItems: 'stretch',
    gap: 12,
  },
  fallbackTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});

export default ProcessingScreen;

