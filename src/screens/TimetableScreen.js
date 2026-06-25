import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ScreenLayout from '../components/ScreenLayout';
import { getTimetableSummary } from '../services/attendanceDataService';
import { COLORS, SPACING } from '../theme';

function TimetableScreen({ navigation }) {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const currentHour = new Date().getHours();
  
  // Get current day name (e.g., 'Monday')
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[new Date().getDay()];

  useEffect(() => {
    async function loadTimetable() {
      setLoading(true);
      const data = await getTimetableSummary(currentDay);
      setTimetable(data);
      setLoading(false);
    }
    loadTimetable();
  }, [currentDay]);

  function isCurrentSlot(timeLabel) {
    const match = timeLabel.match(/^(\d{1,2})/);
    if (!match) {
      return false;
    }
    const hour = Number(match[1]);
    return hour === currentHour;
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Timetable" subtitle={`${currentDay}'s Schedule`} showBack onBackPress={() => navigation.goBack()} />

      <Card style={styles.heroCard}>
        <Text style={styles.heroTitle}>{`${currentDay}'s Schedule`}</Text>
        <Text style={styles.heroText}>Time, subject, and faculty at a glance.</Text>
      </Card>

      <View style={styles.timelineStack}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : timetable.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No classes scheduled for {currentDay}.</Text>
        ) : (
          timetable.map((item) => (
            <Card key={`${item.time}-${item.subject}`} style={[styles.timelineCard, isCurrentSlot(item.time) && styles.currentClassCard]}>
              <View style={styles.timePill}>
                <Text style={styles.timeText}>{item.time}</Text>
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.subjectText}>{item.subject}</Text>
                <Text style={styles.classText}>{item.className}</Text>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.section,
    paddingBottom: SPACING.lg,
  },
  heroCard: {
    gap: 6,
  },
  heroTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
  },
  heroText: {
    color: '#64748b',
    fontSize: 12,
  },
  timelineStack: {
    gap: 12,
  },
  timelineCard: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    boxShadow: '0 6px 10px rgba(15, 23, 42, 0.08)',
  },
  currentClassCard: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
  },
  timePill: {
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  timeText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineBody: {
    borderColor: 'rgba(148, 163, 184, 0.25)',
    borderLeftWidth: 1,
    flex: 1,
    gap: 2,
    paddingLeft: 12,
  },
  subjectText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  classText: {
    color: '#64748b',
    fontSize: 12,
  },
});

export default TimetableScreen;
