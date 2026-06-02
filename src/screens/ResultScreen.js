import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import ValidationItem from '../components/ValidationItem';
import ROUTES from '../navigation/routes';

const STATUS_META = {
  valid: {
    icon: '✔',
    title: 'Attendance Marked Successfully',
    accent: '#22C55E',
    gradient: ['#f0fdf4', '#ecfdf3'],
  },
  success: {
    icon: '✔',
    title: 'Attendance Marked Successfully',
    accent: '#22C55E',
    gradient: ['#f0fdf4', '#ecfdf3'],
  },
  suspicious: {
    icon: '⚠',
    title: 'Attendance Marked (Under Review)',
    accent: '#F59E0B',
    gradient: ['#fffbeb', '#fef3c7'],
  },
  rejected: {
    icon: '❌',
    title: 'Attendance Rejected',
    accent: '#EF4444',
    gradient: ['#fff1f2', '#ffe4e6'],
  },
};

function statusFromFlag(flag) {
  return flag ? 'passed' : 'failed';
}

function formatTimestamp(value) {
  if (!value) {
    return 'Marked time unavailable';
  }

  const date = new Date(value);
  return `Marked at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function ResultScreen({ navigation, route }) {
  const { attendanceResult } = route.params || {};

  if (!attendanceResult) {
    return (
      <ScreenLayout contentStyle={styles.contentStyle}>
        <AppHeader title="Verimark" subtitle="Result" />
        <Card style={styles.missingCard}>
          <Text style={styles.missingTitle}>Result Missing</Text>
          <Text style={styles.missingSubtitle}>Could not find attendance result data.</Text>
          <AppButton label="Go Back" onPress={() => navigation.goBack()} />
        </Card>
      </ScreenLayout>
    );
  }

  const status = attendanceResult.status;
  const confidence = Number(attendanceResult.confidence_score || attendanceResult.confidence || 0);
  const flags = attendanceResult.flags || {};
  const attendanceId = attendanceResult.attendanceId || 'N/A';
  const timestamp = attendanceResult.marked_at || attendanceResult.timestamp || Date.now();

  const iconScale = useRef(new Animated.Value(0.4)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const confidenceAnim = useRef(new Animated.Value(0)).current;

  const statusMeta = useMemo(() => STATUS_META[status] || null, [status]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(confidenceAnim, {
        toValue: Math.max(0, Math.min(100, confidence)),
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [confidence, confidenceAnim, contentOpacity, iconScale]);

  if (!statusMeta) {
    return (
      <ScreenLayout contentStyle={styles.contentStyle}>
        <AppHeader title="Verimark" subtitle="Result" />
        <Card style={styles.missingCard}>
          <Text style={styles.missingTitle}>Unable to fetch result</Text>
          <Text style={styles.missingSubtitle}>Status "{status}" is not recognized.</Text>
          <AppButton label="Go Back" onPress={() => navigation.goBack()} />
        </Card>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Verimark" subtitle="Final verification result" />

      <LinearGradient colors={statusMeta.gradient} style={styles.heroGradient}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <Text style={[styles.iconText, { color: statusMeta.accent }]}>{statusMeta.icon}</Text>
        </Animated.View>

        <Text style={[styles.heroTitle, { color: statusMeta.accent }]}>{statusMeta.title}</Text>
        <Text style={styles.heroSubtitle}>{attendanceResult.message || 'Verification complete.'}</Text>
      </LinearGradient>

      <Animated.View style={{ opacity: contentOpacity }}>
        <Card style={styles.confidenceCard}>
          <Text style={styles.sectionTitle}>Verification Confidence</Text>
          <Text style={styles.confidenceText}>Confidence: {Math.max(0, Math.min(100, confidence))}%</Text>
          <AnimatedProgress value={confidenceAnim} barColor={statusMeta.accent} />
          <Text style={styles.metaText}>{formatTimestamp(timestamp)}</Text>
          <Text style={styles.metaText}>Attendance ID: {attendanceId}</Text>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Validation Details</Text>
        </Card>

        <View style={styles.validationList}>
          <ValidationItem
            title={flags.location ? 'Location Verified' : 'Location Failed'}
            status={statusFromFlag(flags.location)}
            subtitle={flags.location ? `Room: ${attendanceResult.room_name || 'Classroom'}` : 'Outside campus range'}
            extraInfo={flags.location ? `Distance: ${attendanceResult.distance ?? 0}m (Allowed: 50m)` : `Distance: ${attendanceResult.distance ?? 'N/A'}m`}
          />
          <ValidationItem
            title={flags.wifi ? 'WiFi Verified' : 'WiFi Failed'}
            status={statusFromFlag(flags.wifi)}
            subtitle={flags.wifi ? 'Campus WiFi matched' : 'WiFi network not matched'}
            extraInfo={flags.wifi ? 'Network check passed' : 'Failure reason: WiFi network not matched'}
          />
          <ValidationItem
            title={flags.media ? 'Media Verified' : 'Media Failed'}
            status={statusFromFlag(flags.media)}
            subtitle={flags.media ? 'Camera/media accepted' : 'Media verification rejected'}
            extraInfo={flags.media ? 'Face/media validation passed' : 'Failure reason: Duplicate or unclear media'}
          />
          <ValidationItem
            title={flags.device ? 'Device Verified' : 'Device Failed'}
            status={statusFromFlag(flags.device)}
            subtitle={flags.device ? 'Authorized device' : 'Unauthorized device detected'}
            extraInfo={flags.device ? 'Device check passed' : 'Failure reason: Device ID mismatch'}
          />
        </View>
      </Animated.View>

      {status === 'suspicious' ? (
        <AppButton label="View Details" onPress={() => navigation.replace(ROUTES.ATTENDANCE)} />
      ) : null}

      <AppButton label="Retry Attendance" onPress={() => navigation.replace(ROUTES.SCAN)} />
      <AppButton label="Go to Dashboard" variant="secondary" onPress={() => navigation.replace(ROUTES.HOME)} style={styles.dashboardButton} />
    </ScreenLayout>
  );
}

function AnimatedProgress({ value, barColor }) {
  const [progressState, setProgressState] = useState(0);

  useEffect(() => {
    const listenerId = value.addListener(({ value: next }) => {
      setProgressState(next);
    });

    return () => {
      value.removeListener(listenerId);
    };
  }, [value]);

  return <ProgressBar value={progressState} barStyle={{ backgroundColor: barColor }} />;
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: 18,
    paddingBottom: 40,
  },
  dashboardButton: {
    marginTop: 16,
  },
  heroGradient: {
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 24,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 88,
    justifyContent: 'center',
    marginBottom: 10,
    width: 88,
  },
  iconText: {
    fontSize: 44,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: '#475569',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  confidenceCard: {
    gap: 8,
    marginBottom: 16,
  },
  detailsCard: {
    backgroundColor: '#f8fafc',
    marginBottom: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  confidenceText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  metaText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '400',
  },
  validationList: {
    marginBottom: 16,
  },
  missingCard: {
    gap: 10,
  },
  missingTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '700',
  },
  missingSubtitle: {
    color: '#64748b',
    fontSize: 13,
  },
});

export default ResultScreen;
