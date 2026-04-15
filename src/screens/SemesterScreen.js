import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import ROUTES from '../navigation/routes';
import { getOverallSummary, getSemesterSummary } from '../services/attendanceDataService';
import { SPACING } from '../theme';

function SemesterScreen({ navigation }) {
  const semester = getSemesterSummary();
  const overall = getOverallSummary();

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Semester" subtitle="Academic overview" showBack onBackPress={() => navigation.goBack()} />

      <Card style={styles.heroCard}>
        <Text style={styles.heroLabel}>{semester.label}</Text>
        <Text style={styles.heroTitle}>{semester.status}</Text>
        <Text style={styles.heroSubtitle}>GPA {semester.gpa} • {semester.creditsEarned} credits earned</Text>
        <ProgressBar value={overall.percentage} />
      </Card>

      <View style={styles.infoRow}>
        <Card style={styles.infoCard}><Text style={styles.infoValue}>{overall.percentage}%</Text><Text style={styles.infoLabel}>Attendance</Text></Card>
        <Card style={styles.infoCard}><Text style={styles.infoValue}>{semester.attendanceBenchmark}%</Text><Text style={styles.infoLabel}>Benchmark</Text></Card>
      </View>

      <AppButton label="Open Attendance Analytics" onPress={() => navigation.replace(ROUTES.ATTENDANCE)} />
      <AppButton label="Open Timetable" variant="secondary" onPress={() => navigation.replace(ROUTES.TIMETABLE)} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  heroCard: {
    gap: 8,
  },
  heroLabel: {
    color: '#3a6095',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#2d3335',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    color: '#5a6062',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoCard: {
    flex: 1,
    gap: 4,
  },
  infoValue: {
    color: '#3a6095',
    fontSize: 26,
    fontWeight: '800',
  },
  infoLabel: {
    color: '#5a6062',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

export default SemesterScreen;
