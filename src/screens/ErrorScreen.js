import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import ValidationItem from '../components/ValidationItem';
import ROUTES from '../navigation/routes';
import { submitAttendance } from '../services/attendanceService';
import { SPACING } from '../theme';

function ErrorScreen({ navigation, route }) {
  const result = route.params?.submissionResult || route.params?.result || {};
  const validationResult = route.params?.validationResult || result?.validationResult || result;
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');
  const reason = result?.reason || result?.code;
  const reasonMap = {
    qr_invalid: {
      title: 'Invalid QR code',
      description: 'Scan a valid classroom QR code and try again.',
    },
    location_outside: {
      title: "You're outside campus range",
      description: 'Move closer to the campus center and try again.',
    },
    wifi_invalid: {
      title: 'Please connect to campus WiFi',
      description: 'Join Campus_WiFi before submitting attendance.',
    },
    camera_failed: {
      title: 'Photo capture failed',
      description: 'Allow camera access and capture a clear proof image.',
    },
    submission_failed: {
      title: 'Attendance submission failed',
      description: 'Your data was captured, but the backend submission did not complete.',
    },
  };

  const reasonInfo = reasonMap[reason] || {
    title: 'Attendance verification failed',
    description: 'Please retry attendance after checking permissions and connectivity.',
  };

  const message = route.params?.error || route.params?.message || result?.message || reasonInfo.title;
  const details = result?.details || { location: false, wifi: false, photo: false };
  const reasons = result?.reasons || ['outside location'];
  const wifiReason = validationResult?.wifi?.reason || result?.wifi?.reason;
  const wifiSSID = validationResult?.wifi?.ssid || result?.wifi?.ssid;
  const cameraReason = validationResult?.camera?.reason || result?.camera?.reason;
  const qrStatus = validationResult?.qr?.status || result?.qr?.status || 'failed';
  const locationStatus = validationResult?.location?.status || result?.location?.status || (details.location ? 'passed' : 'failed');
  const wifiStatus = validationResult?.wifi?.status || result?.wifi?.status || (details.wifi ? 'passed' : 'failed');
  const cameraStatus = validationResult?.camera?.status || result?.camera?.status || (details.photo ? 'captured' : 'failed');
  const submissionPayload = result?.submissionPayload;
  const guidanceMap = {
    offline: {
      message: 'Check your connection and try again.',
      actionLabel: 'Retry',
      action: 'retry',
    },
    gps_off: {
      message: 'Enable location services to continue.',
      actionLabel: 'Open Settings',
      action: 'settings',
    },
    location_outside: {
      message: 'Move to campus range and retry attendance.',
      actionLabel: 'Retry Attendance',
      action: 'scan',
    },
    wifi_invalid: {
      message: 'Connect to campus WiFi, then retry.',
      actionLabel: 'Open Settings',
      action: 'settings',
    },
    camera_failed: {
      message: 'Camera permission required. Allow camera access.',
      actionLabel: 'Allow Camera',
      action: 'settings',
    },
    timeout: {
      message: 'Verification timed out. Please retry.',
      actionLabel: 'Retry',
      action: 'retry',
    },
  };
  const guidance = guidanceMap[reason] || {
    message: 'Try again after checking permissions and connectivity.',
    actionLabel: 'Retry',
    action: 'retry',
  };

  async function handleGuidedAction() {
    if (guidance.action === 'settings') {
      try {
        await Linking.openSettings();
      } catch {
        setRetryMessage('Unable to open settings. Please open them manually.');
      }
      return;
    }

    if (guidance.action === 'scan') {
      navigation.replace(ROUTES.SCAN);
      return;
    }

    await handleRetrySubmission();
  }

  async function handleRetrySubmission() {
    if (!submissionPayload) {
      navigation.replace(ROUTES.SCAN);
      return;
    }

    setIsRetrying(true);
    setRetryMessage('');

    try {
      const retryResult = await submitAttendance(submissionPayload);

      if (retryResult.status !== 'failed') {
        navigation.replace(ROUTES.RESULT, {
          result: {
            ...retryResult,
            submissionPayload,
            validationResult,
            requestId: result?.requestId,
            timestamp: result?.timestamp || Date.now(),
          },
        });
        return;
      }

      setRetryMessage(retryResult.message || 'Retry submission failed. Please try again.');
    } catch (error) {
      setRetryMessage(error.message || 'Retry submission failed. Please try again.');
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <View style={styles.sectionHeader}>
        <AppHeader title="Verimark" subtitle="Verification issue" />
      </View>

      <View style={styles.heroWrap}>
        <View style={styles.errorBadge}>
          <Text style={styles.errorGlyph}>!</Text>
        </View>
        <Text style={styles.title}>Attendance Failed</Text>
        <Text style={styles.subtitle}>{message}</Text>
        <Text style={styles.helperText}>{reasonInfo.description}</Text>
      </View>

      <Card style={styles.detailCard}>
        <Text style={styles.sectionTitle}>1. Summary</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Campus Location</Text>
          <Text style={styles.detailValue}>{result.room_name || 'Classroom area'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Required Range</Text>
          <Text style={styles.detailValue}>{result.allowed_range != null ? `Within ${result.allowed_range} meters` : 'N/A'}</Text>
        </View>
        {result.distance != null && result.allowed_range != null ? (
          <ProgressBar
            value={Math.min(100, Math.round((result.distance / result.allowed_range) * 100))}
            trackStyle={styles.errorTrack}
            barStyle={styles.errorBar}
          />
        ) : null}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Distance</Text>
          <Text style={styles.distanceValue}>{result.distance != null ? `${result.distance} meters away` : 'Unknown'}</Text>
        </View>
      </Card>

      <View style={styles.metricStack}>
        <Text style={styles.sectionTitle}>2. Validation Steps</Text>
        <ValidationItem title="QR Verification" status={qrStatus} subtitle="Token verified" extraInfo="Secure token check" style={styles.stepCard} />
        <ValidationItem title="Location Check" status={locationStatus} subtitle="Campus boundary check" extraInfo="Outside campus range will fail attendance" style={styles.stepCard} />
        <ValidationItem
          title="WiFi Check"
          status={wifiStatus}
          subtitle={`SSID: ${wifiSSID || 'Unavailable'}`}
          extraInfo={wifiSSID === 'WEB_SIMULATED' ? 'Simulated WiFi (Web Mode)' : `Status: ${wifiStatus}${wifiReason ? ` • ${wifiReason}` : ''}`}
          style={styles.stepCard}
        />
        <ValidationItem
          title="Camera Capture"
          status={cameraStatus === 'captured' ? 'passed' : cameraStatus}
          subtitle={cameraStatus === 'failed' ? `Reason: ${cameraReason || 'No image captured'}` : 'Classroom image capture'}
          extraInfo={`Type: ${validationResult?.camera?.type ? validationResult.camera.type.charAt(0).toUpperCase() + validationResult.camera.type.slice(1) : 'Photo'}`}
          style={styles.stepCard}
        />
      </View>

      <Card style={styles.reasonCard}>
        <Text style={styles.reasonTitle}>3. Failure Reasons</Text>
        {reasons.map((reason) => (
          <Text key={reason} style={styles.reasonItem}>• {reason}</Text>
        ))}
        {!details.wifi ? (
          <Text style={styles.reasonItem}>• WiFi Validation Failed: {wifiReason || 'Not connected to campus network'}</Text>
        ) : null}
        {!details.location ? <Text style={styles.reasonItem}>• Location Failed: Outside campus range</Text> : null}
        {!details.wifi && wifiSSID ? <Text style={styles.reasonItem}>• SSID: {wifiSSID}</Text> : null}
      </Card>

      <Card style={styles.guidanceCard}>
        <Text style={styles.guidanceTitle}>How to fix this</Text>
        <Text style={styles.guidanceText}>{guidance.message}</Text>
        <AppButton label={guidance.actionLabel} onPress={handleGuidedAction} variant="secondary" />
      </Card>

      {retryMessage ? <Text style={styles.retryNote}>{retryMessage}</Text> : null}

      <AppButton
        label={submissionPayload ? 'Retry Submission' : 'Retry Attendance'}
        onPress={handleRetrySubmission}
        loading={isRetrying}
        disabled={isRetrying}
        style={styles.ctaButton}
      />
      <AppButton
        label="Go to Dashboard"
        variant="secondary"
        onPress={() => navigation.replace(ROUTES.HOME)}
        style={styles.dashboardButton}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.section,
    paddingBottom: 40,
    paddingTop: 20,
  },
  sectionHeader: {
    marginBottom: 4,
  },
  heroWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 999,
    height: 76,
    justifyContent: 'center',
    marginBottom: 6,
    width: 76,
  },
  errorGlyph: {
    color: '#ef4444',
    fontSize: 38,
    fontWeight: '600',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 320,
    textAlign: 'center',
  },
  helperText: {
    color: '#94a3b8',
    fontSize: 12,
    maxWidth: 320,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    gap: 8,
    marginVertical: 10,
    padding: 16,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '500',
  },
  errorTrack: {
    backgroundColor: '#ffe4e6',
  },
  errorBar: {
    backgroundColor: '#ef4444',
  },
  distanceValue: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  ctaButton: {
    marginTop: SPACING.xs,
  },
  dashboardButton: {
    marginTop: 16,
  },
  metricStack: {
    marginVertical: 10,
  },
  stepCard: {
    marginVertical: 10,
  },
  reasonCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    gap: 8,
    marginVertical: 10,
    padding: 16,
  },
  guidanceCard: {
    backgroundColor: '#fffdf2',
    borderRadius: 14,
    gap: 10,
    marginVertical: 10,
    padding: 16,
  },
  guidanceTitle: {
    color: '#92400e',
    fontSize: 15,
    fontWeight: '700',
  },
  guidanceText: {
    color: '#78350f',
    fontSize: 12,
    fontWeight: '500',
  },
  reasonTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  reasonItem: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '500',
  },
  retryNote: {
    color: '#b91c1c',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ErrorScreen;
