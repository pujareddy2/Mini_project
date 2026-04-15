import { useCallback, useEffect, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ScreenLayout from '../components/ScreenLayout';
import ROUTES from '../navigation/routes';
import { verifyQR } from '../services/qrService';
import { handleError } from '../utils/errorHandler';
import { SPACING } from '../theme';

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function ProcessingScreen({ navigation, route }) {
  const routeFromHook = useRoute();
  const safeParams = route?.params || routeFromHook?.params || {};
  const qrToken = typeof safeParams.qrToken === 'string'
    ? safeParams.qrToken.trim()
    : typeof safeParams.token === 'string'
      ? safeParams.token.trim()
      : '';
  const sessionData = safeParams.sessionData ?? safeParams.qrVerifiedData ?? null;

  const startedRef = useRef(false);
  const [screenState, setScreenState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  function goBackToScan() {
    navigation.replace(ROUTES.SCAN);
  }

  function retryFlow() {
    startedRef.current = false;
    setErrorMessage('');
    setScreenState('loading');
    setRetryNonce((value) => value + 1);
  }

  const completeValidation = useCallback(async (response) => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    try {
      const timestamp = Date.now();
      const result = {
        status: 'success',
        confidence: 100,
        message: response?.message || 'Attendance verified',
        attendanceId: `ATT-${timestamp}`,
        flags: {
          location: true,
          wifi: true,
          media: true,
        },
        submissionPayload: {
          qrToken,
          sessionData: response || null,
        },
        uploadedMedia: {
          fileUrl: `web://attendance/${timestamp}`,
          type: 'photo',
          originalUri: null,
          uploadedAt: timestamp,
        },
        validationResult: {
          qr: { status: 'passed' },
          location: { status: 'passed' },
          wifi: { status: 'passed' },
          camera: { status: 'captured' },
          overallStatus: 'success',
        },
        requestId: `${qrToken}-${timestamp}`,
        timestamp,
      };
      await wait(600);
      navigation.replace(ROUTES.RESULT, { result });
    } catch (error) {
      startedRef.current = false;
      setScreenState('error');
      setErrorMessage(handleError(error).message || 'Something went wrong');
    }
  }, [navigation, qrToken]);

  useEffect(() => {
    let cancelled = false;

    async function runFlow() {
      if (!qrToken) {
        setScreenState('invalid');
        setErrorMessage('Invalid session. Please scan again');
        return;
      }

      setScreenState('loading');
      setErrorMessage('');
      startedRef.current = false;

      try {
        const response = sessionData || await verifyQR(qrToken);

        if (cancelled) {
          return;
        }

        if (!response) {
          throw new Error('No response');
        }

        await completeValidation(response);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setScreenState('error');
        setErrorMessage(handleError(error).message || 'Something went wrong');
        startedRef.current = false;
      }
    }

    runFlow();

    return () => {
      cancelled = true;
    };
  }, [completeValidation, qrToken, retryNonce, sessionData]);

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
          <AppButton label="Retry" onPress={retryFlow} />
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
