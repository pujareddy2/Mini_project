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
  const [progress, setProgress] = useState({
    qr: 'pending',
    gps: 'pending',
    wifi: 'pending',
    media: 'pending',
    submit: 'pending'
  });

  const { qrToken } = route.params || {};

  function goBackToScan() {
    navigation.replace(ROUTES.SCAN);
  }

  useEffect(() => {
    const runAttendanceFlow = async () => {
      try {
        const { qrToken: token, photoUri, mediaType, cameraCancelled, sessionId: paramSessionId } = route.params || {};

        if (!token) {
          setScreenState('invalid');
          setErrorMessage('QR Token is missing');
          return;
        }

        const studentId = await AsyncStorage.getItem('user_id');
        const deviceId = await AsyncStorage.getItem('device_id');
        
        let sessionId = paramSessionId;

        // Execute validations in parallel
        const [qrRes, gps, wifi, mediaUrl] = await Promise.all([
          verifyQR(token).then(res => { setProgress(p => ({ ...p, qr: 'done' })); return res; }).catch(e => {
            console.log('QR verify failed:', e);
            if (!sessionId) throw new Error('QR verification failed and no session ID available.');
            setProgress(p => ({ ...p, qr: 'done' }));
            return null;
          }),
          captureGPS().then(res => { setProgress(p => ({ ...p, gps: 'done' })); return res; }),
          captureWiFi().then(res => { setProgress(p => ({ ...p, wifi: 'done' })); return res; }),
          (photoUri ? uploadMedia(photoUri, mediaType) : Promise.resolve('no_photo')).then(res => { setProgress(p => ({ ...p, media: 'done' })); return res; })
        ]);

        if (qrRes && qrRes.session_id) sessionId = qrRes.session_id;

        const result = await submitAttendance({
          session_id: sessionId,
          qr_token: token,
          device_id: deviceId || 'web_browser_device',
          gps_lat: gps.latitude || 0.0,
          gps_lon: gps.longitude || 0.0,
          gps_accuracy: gps.accuracy || 100.0,
          wifi_ssid: wifi.ssid || 'unavailable',
          bssid: wifi.bssid || '',
          media_url: mediaUrl
        });

        setProgress(p => ({ ...p, submit: 'done' }));
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

  if (screenState === 'invalid' || screenState === 'error') {
    return (
      <ScreenLayout contentStyle={styles.contentStyle} centered>
        <Card style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>{screenState === 'invalid' ? 'Invalid session' : 'Something went wrong'}</Text>
          <Text style={styles.fallbackText}>{errorMessage || 'Processing failed unexpectedly.'}</Text>
          <AppButton label="Go Back" variant="secondary" onPress={goBackToScan} />
        </Card>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader title="Validating" onBack={goBackToScan} />
      <View style={styles.contentStyle}>
        <Card style={styles.loadingCard}>
          <View style={styles.spinnerWrap}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
          <Text style={styles.title}>Verifying attendance...</Text>
          <Text style={styles.subtitle}>Validating your QR input and calculating location distance.</Text>
          
          <View style={{ width: '100%', marginTop: 20 }}>
            <Text style={{ fontSize: 16, color: progress.qr === 'done' ? '#10b981' : '#64748b' }}>
              {progress.qr === 'done' ? '✓' : '...'} QR Validation
            </Text>
            <Text style={{ fontSize: 16, color: progress.gps === 'done' ? '#10b981' : '#64748b', marginTop: 8 }}>
              {progress.gps === 'done' ? '✓' : '...'} GPS Validation
            </Text>
            <Text style={{ fontSize: 16, color: progress.wifi === 'done' ? '#10b981' : '#64748b', marginTop: 8 }}>
              {progress.wifi === 'done' ? '✓' : '...'} WiFi Validation
            </Text>
            <Text style={{ fontSize: 16, color: progress.media === 'done' ? '#10b981' : '#64748b', marginTop: 8 }}>
              {progress.media === 'done' ? '✓' : '...'} Camera & Liveness Verification
            </Text>
            <Text style={{ fontSize: 16, color: progress.submit === 'done' ? '#10b981' : '#64748b', marginTop: 8 }}>
              {progress.submit === 'done' ? '✓' : '...'} Final Attendance Submission
            </Text>
          </View>
        </Card>
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

