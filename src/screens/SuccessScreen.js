import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import ValidationItem from '../components/ValidationItem';
import ROUTES from '../navigation/routes';
import { SPACING } from '../theme';

function SuccessScreen({ navigation, route }) {
  const submissionResult = route.params?.submissionResult || route.params?.result?.submissionResult || route.params?.result;
  const result = submissionResult || {};
  const validationResult = route.params?.validationResult || submissionResult?.validationResult || submissionResult;
  const backendData = submissionResult?.data || {};
  const confidence = backendData.confidence ?? submissionResult?.confidence ?? 0;
  const qrStatus = validationResult?.qr?.status || 'passed';
  const locationStatus = validationResult?.location?.status || 'passed';
  const wifi = validationResult?.wifi || result?.wifi || {};
  const camera = validationResult?.camera || result?.camera || {};
  const attendanceId = backendData.attendanceId || submissionResult?.attendanceId || 'Pending';
  const timestampValue = submissionResult?.timestamp || backendData.timestamp || Date.now();

  function formatCaptureTime(timestamp) {
    if (!timestamp) {
      return 'Time unavailable';
    }

    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle} scrollEnabled={false}>
      <AppHeader title="Verimark" subtitle="Attendance receipt" />

      <View style={styles.heroWrap}>
        <View style={styles.successBadge}>
          <Text style={styles.successGlyph}>✓</Text>
        </View>
        <Text style={styles.title}>Attendance Marked Successfully</Text>
        <Text style={styles.subtitle}>Your attendance has been verified and submitted.</Text>
      </View>

      <Card style={styles.confidenceCard}>
        <Text style={styles.mutedLabel}>Attendance ID</Text>
        <View style={styles.confidenceRow}>
          <Text style={styles.attendanceId}>{attendanceId}</Text>
        </View>
        <Text style={styles.mutedLabel}>Confidence Score</Text>
        <Text style={styles.confidenceValue}>{confidence}%</Text>
        <ProgressBar value={confidence} />
        <Text style={styles.timestampText}>
          Timestamp: {new Date(timestampValue).toLocaleString()}
        </Text>
      </Card>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Validation Summary</Text>
      </Card>

      <View style={styles.metricStack}>
        <ValidationItem title="QR Verification" status={qrStatus} subtitle="Token verified" extraInfo="Secure token check complete" />
        <ValidationItem title="Location Check" status={locationStatus} subtitle="Within campus range" extraInfo="Campus boundary check passed" />
        <ValidationItem
          title="WiFi Check"
          status={wifi.status || 'failed'}
          subtitle={`SSID: ${wifi.ssid || 'Unavailable'}`}
          extraInfo={wifi.reason ? (wifi.ssid === 'WEB_SIMULATED' ? 'Simulated WiFi (Web Mode)' : `Status: ${wifi.status || 'failed'} • ${wifi.reason}`) : `Status: ${wifi.status || 'failed'}`}
        />
        <ValidationItem
          title="Camera Capture"
          status={camera.status === 'captured' ? 'passed' : 'failed'}
          subtitle={`Captured at ${formatCaptureTime(camera.timestamp)}`}
          extraInfo={`Type: ${camera.type ? camera.type.charAt(0).toUpperCase() + camera.type.slice(1) : 'Photo'}`}
        />
      </View>

      {backendData.message || submissionResult?.message ? <Text style={styles.note}>{backendData.message || submissionResult?.message}</Text> : null}
      {wifi?.status === 'limited' ? <Text style={styles.note}>⚠ WiFi Data Limited</Text> : null}
      {wifi?.status === 'failed' ? <Text style={styles.note}>❌ WiFi Failed • Reason: {wifi.reason}</Text> : null}

      <AppButton
        label="Go to Dashboard"
        onPress={() => navigation.replace(ROUTES.HOME)}
        style={styles.ctaButton}
      />
      <AppButton
        label="Scan Another"
        onPress={() => navigation.replace(ROUTES.SCAN)}
        variant="secondary"
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.section,
    paddingBottom: SPACING.lg,
  },
  heroWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  successBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderRadius: 999,
    height: 90,
    justifyContent: 'center',
    marginBottom: 6,
    width: 90,
  },
  successGlyph: {
    color: '#22c55e',
    fontSize: 44,
    fontWeight: '600',
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '600',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    maxWidth: 330,
    textAlign: 'center',
  },
  confidenceCard: {
    alignItems: 'center',
    gap: 8,
  },
  mutedLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  confidenceRow: {
    flexDirection: 'row',
  },
  attendanceId: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  confidenceValue: {
    color: '#3b82f6',
    fontSize: 48,
    fontWeight: '600',
    letterSpacing: -1,
  },
  timestampText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  metricStack: {
    gap: 8,
  },
  summaryCard: {
    backgroundColor: '#eef6ff',
    paddingVertical: 12,
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: SPACING.xs,
  },
});

export default SuccessScreen;
