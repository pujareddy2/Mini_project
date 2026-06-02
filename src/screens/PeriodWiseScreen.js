import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import SegmentTabs from '../components/SegmentTabs';
import { getDetailedAnalytics } from '../services/dashboardService';
import { getFacultyStudents } from '../services/facultyService';
import { COLORS, RADIUS, SPACING } from '../theme';

const SUBJECT_ICONS = {
  Math: '🧮',
  Mathematics: '🧮',
  Physics: '⚛️',
  Chemistry: '🧪',
  English: '📘',
  Biology: '🧬',
  Computer: '💻',
};

function PeriodWiseScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [facultyStudents, setFacultyStudents] = useState([]);
  const [userRole, setUserRole] = useState('student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const role = await AsyncStorage.getItem('role');
        setUserRole(role || 'student');

        const data = await getDetailedAnalytics();
        setAnalytics(data);
        const months = getMonthsFromData(data.records);
        if (months.length > 0) setSelectedMonth(months[0]);

        if (role === 'faculty') {
          const students = await getFacultyStudents();
          setFacultyStudents(students);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function getMonthsFromData(records) {
    if (!records || records.length === 0) return ['Current Month'];
    const months = new Set();
    records.forEach(r => {
      const d = new Date(r.marked_at);
      months.add(d.toLocaleString('en-US', { month: 'long' }));
    });
    return Array.from(months);
  }

  const monthOptions = useMemo(() => getMonthsFromData(analytics?.records), [analytics]);

  const periodWiseSummaries = useMemo(() => {
    if (!analytics || !analytics.records) return {};
    const periods = {};
    analytics.records.forEach((r) => {
      const m = new Date(r.marked_at).toLocaleString('en-US', { month: 'long' });
      const sub = r.subject || 'Unknown Subject';
      if (!periods[m]) periods[m] = {};
      if (!periods[m][sub]) periods[m][sub] = { subject: sub, present: 0, absent: 0, total: 0 };
      
      periods[m][sub].total += 1;
      if (r.status === 'valid') periods[m][sub].present += 1;
      else periods[m][sub].absent += 1;
    });
    return periods;
  }, [analytics]);

  const consolidatedSummaries = useMemo(() => {
    if (!analytics || !analytics.records) return [];
    const subjects = {};
    analytics.records.forEach((r) => {
      const sub = r.subject || 'Unknown Subject';
      if (!subjects[sub]) {
        subjects[sub] = { subject: sub, present: 0, absent: 0, total: 0 };
      }
      subjects[sub].total += 1;
      if (r.status === 'valid') subjects[sub].present += 1;
      else subjects[sub].absent += 1;
    });

    return Object.values(subjects);
  }, [analytics]);

  const rows = useMemo(() => {
    if (activeTab === 'month') {
      const mData = periodWiseSummaries[selectedMonth] || {};
      return Object.values(mData);
    }
    return consolidatedSummaries;
  }, [activeTab, selectedMonth, periodWiseSummaries, consolidatedSummaries]);

  const tableTitle = useMemo(() => (
    activeTab === 'month' ? `${selectedMonth} breakdown` : 'Consolidated breakdown'
  ), [activeTab, selectedMonth]);

  if (loading) {
    return (
      <ScreenLayout contentStyle={styles.contentStyle}>
        <AppHeader title="Period-wise" subtitle="Monthly and consolidated analytics" showBack onBackPress={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={COLORS?.primary || '#3b82f6'} style={{ marginTop: 50 }} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Period-wise" subtitle={userRole === 'faculty' ? "Faculty analytics" : "Monthly and consolidated analytics"} showBack onBackPress={() => navigation.goBack()} />

      {userRole !== 'faculty' && (
        <SegmentTabs
          tabs={[
            { key: 'month', label: 'Month Wise' },
            { key: 'consolidated', label: 'Consolidated' },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      )}

      {activeTab === 'month' && userRole !== 'faculty' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
          {monthOptions.map((month) => {
            const active = month === selectedMonth;
            return (
              <Pressable
                key={month}
                onPress={() => setSelectedMonth(month)}
                style={[styles.monthChip, active && styles.monthChipActive]}
              >
                <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{month}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Card style={styles.heroCard}>
        <Text style={styles.sectionKicker}>{userRole === 'faculty' ? 'Student tracking' : 'Period-wise view'}</Text>
        <Text style={styles.sectionTitle}>{userRole === 'faculty' ? 'Registered students' : tableTitle}</Text>
      </Card>

      <View style={styles.rowStack}>
        {userRole === 'faculty' ? (
          facultyStudents.length === 0 ? (
            <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No students registered yet.</Text>
          ) : (
            facultyStudents.map((stu) => {
              const percentage = stu.total_records > 0 ? Math.round((stu.total_present / stu.total_records) * 100) : 0;
              return (
                <Card key={stu.student_id} style={styles.studentSectionCard}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectMetaWrap}>
                      <Text style={styles.subjectName}>👤 {stu.name}</Text>
                      <Text style={styles.subjectFaculty}>{stu.total_present}/{stu.total_records} periods present</Text>
                    </View>
                    <Text style={styles.subjectPercent}>{percentage}%</Text>
                  </View>
                  
                  <View style={styles.periodLogContainer}>
                    <Text style={styles.logTitle}>Recent Periods</Text>
                    {/* Note: We'd ideally fetch specific student records here, but since we have aggregated analytics, 
                        we'll show the latest status and a summary. To show 'each period', we'd need to fetch 
                        records for this specific student. For now, we show the latest status clearly. */}
                    <View style={styles.periodItem}>
                      <Text style={styles.periodTime}>Latest</Text>
                      <View style={styles.periodInfo}>
                        <Text style={styles.periodSubject}>Class Session</Text>
                        <Text style={styles.periodStatusLabel}>
                          Status: {stu.latest_status ? (stu.latest_status === 'valid' ? '✅ Present' : '❌ Rejected') : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          )
        ) : (
          <>
            {(!analytics || !analytics.records || analytics.records.length === 0) ? (
              <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No periods recorded yet.</Text>
            ) : (
              analytics.records.slice().reverse().map((record) => {
                const dateObj = new Date(record.marked_at);
                const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });
                
                return (
                  <Card key={record.record_id} style={styles.periodCard}>
                    <View style={styles.periodTimeWrap}>
                      <Text style={styles.periodTimeText}>{timeStr}</Text>
                      <Text style={styles.periodDateText}>{dateStr}</Text>
                    </View>
                    <View style={styles.periodContent}>
                      <Text style={styles.periodSubjectText}>{record.subject || 'Class'}</Text>
                      <View style={[
                        styles.statusBadge, 
                        record.status === 'valid' ? styles.statusValid : record.status === 'suspicious' ? styles.statusSuspicious : styles.statusRejected
                      ]}>
                        <Text style={[
                          styles.statusBadgeText,
                          record.status === 'valid' ? styles.statusValidText : record.status === 'suspicious' ? styles.statusSuspiciousText : styles.statusRejectedText
                        ]}>
                          {record.status === 'valid' ? 'Present' : record.status === 'suspicious' ? 'Flagged' : 'Rejected'}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </>
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
  monthStrip: {
    gap: 10,
    paddingHorizontal: 10,
    paddingRight: 4,
  },
  monthChip: {
    backgroundColor: '#eef2f4',
    borderRadius: RADIUS.button,
    minWidth: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  monthChipActive: {
    backgroundColor: '#3b82f6',
  },
  monthChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  heroCard: {
    gap: 6,
  },
  sectionKicker: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  rowStack: {
    gap: 12,
  },
  subjectCard: {
    gap: 10,
    marginVertical: 10,
  },
  subjectHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subjectMetaWrap: {
    flex: 1,
    gap: 3,
    paddingRight: 8,
  },
  subjectName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  subjectFaculty: {
    color: '#64748b',
    fontSize: 12,
  },
  subjectPercent: {
    color: '#3b82f6',
    fontSize: 22,
    fontWeight: '600',
  },
  subjectCount: {
    color: '#64748b',
    fontSize: 12,
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  progressWrap: {
    flex: 1,
  },
  progressTrack: {
    borderRadius: 999,
    height: 8,
  },
  progressBar: {
    borderRadius: 999,
    height: 8,
  },
  progressLabel: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  studentSectionCard: {
    gap: 12,
    padding: 16,
  },
  periodLogContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
  },
  logTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  periodItem: {
    flexDirection: 'row',
    gap: 12,
  },
  periodTime: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
    width: 50,
  },
  periodInfo: {
    flex: 1,
    gap: 2,
  },
  periodSubject: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  periodStatusLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  periodCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  periodTimeWrap: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 10,
    width: 70,
  },
  periodTimeText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '700',
  },
  periodDateText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  periodContent: {
    flex: 1,
    gap: 6,
  },
  periodSubjectText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusValid: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  statusValidText: { color: '#15803d' },
  statusSuspicious: { backgroundColor: 'rgba(234, 179, 8, 0.12)' },
  statusSuspiciousText: { color: '#a16207' },
  statusRejected: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  statusRejectedText: { color: '#b91c1c' },
});

export default PeriodWiseScreen;
