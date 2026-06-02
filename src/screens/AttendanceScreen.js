import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import SegmentTabs from '../components/SegmentTabs';
import ROUTES from '../navigation/routes';
import { getDetailedAnalytics } from '../services/dashboardService';
import { getFacultyStudents } from '../services/facultyService';
import { COLORS, RADIUS, SPACING } from '../theme';

const TAB_KEYS = {
  OVERVIEW: 'overview',
  MONTH: 'month',
  SUBJECT: 'subject',
  DAILY: 'daily',
  PERIOD: 'period',
  STUDENTS: 'students',
};

function AttendanceScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || TAB_KEYS.OVERVIEW);
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
          setActiveTab(TAB_KEYS.STUDENTS);
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

  const availableMonths = useMemo(() => getMonthsFromData(analytics?.records), [analytics]);

  const overall = useMemo(() => {
    if (!analytics) return { present: 0, absent: 0, total: 0, percentage: 0 };
    return {
      present: analytics.present,
      absent: analytics.rejected,
      total: analytics.total,
      percentage: analytics.total > 0 ? analytics.attendance_percentage : 0,
    };
  }, [analytics]);

  const overviewStats = useMemo(
    () => [
      { label: userRole === 'faculty' ? 'Total Present' : 'Present', value: overall.present },
      { label: userRole === 'faculty' ? 'Total Absent' : 'Absent', value: overall.absent },
      { label: userRole === 'faculty' ? 'Total Marks' : 'Total Classes', value: overall.total },
    ],
    [overall, userRole]
  );

  const dailySummaries = useMemo(() => {
    if (!analytics || !analytics.records) return [];
    return analytics.records.map((r) => {
      const dateObj = new Date(r.marked_at);
      return {
        date: dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        fullDate: dateObj.toLocaleString(),
        status: r.status === 'valid' ? 'Present' : r.status === 'suspicious' ? 'Suspicious' : 'Absent',
        subject: r.subject || 'Unknown Subject',
      };
    }).reverse();
  }, [analytics]);

  const subjectSummaries = useMemo(() => {
    if (!analytics || !analytics.records) return [];
    const subjects = {};
    analytics.records.forEach((r) => {
      const sub = r.subject || 'Unknown Subject';
      if (!subjects[sub]) {
        subjects[sub] = { name: sub, present: 0, absent: 0, total: 0 };
      }
      subjects[sub].total += 1;
      if (r.status === 'valid') subjects[sub].present += 1;
      else subjects[sub].absent += 1;
    });

    return Object.values(subjects).map((sub) => ({
      ...sub,
      percentage: sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 0,
    }));
  }, [analytics]);

  const monthlySummaries = useMemo(() => {
    if (!analytics || !analytics.records) return {};
    const months = {};
    analytics.records.forEach((r) => {
      const m = new Date(r.marked_at).toLocaleString('en-US', { month: 'long' });
      if (!months[m]) months[m] = { present: 0, absent: 0, total: 0, percentage: 0 };
      months[m].total += 1;
      if (r.status === 'valid') months[m].present += 1;
      else months[m].absent += 1;
    });
    
    Object.keys(months).forEach(m => {
      months[m].percentage = months[m].total > 0 ? Math.round((months[m].present / months[m].total) * 100) : 0;
    });
    return months;
  }, [analytics]);

  const periodWiseSummaries = useMemo(() => {
    if (!analytics || !analytics.records) return {};
    const periods = {};
    analytics.records.forEach((r) => {
      const m = new Date(r.marked_at).toLocaleString('en-US', { month: 'long' });
      const sub = r.subject || 'Unknown Subject';
      if (!periods[m]) periods[m] = {};
      if (!periods[m][sub]) periods[m][sub] = { present: 0, absent: 0, total: 0 };
      
      periods[m][sub].total += 1;
      if (r.status === 'valid') periods[m][sub].present += 1;
      else periods[m][sub].absent += 1;
    });
    return periods;
  }, [analytics]);

  if (loading) {
    return (
      <ScreenLayout contentStyle={styles.contentStyle}>
        <AppHeader title="Attendance" subtitle="Detailed analytics" showBack onBackPress={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      </ScreenLayout>
    );
  }

  function renderOverview() {
    return (
      <View style={styles.sectionGap}>
        <Card style={styles.overallCard}>
          <Text style={styles.sectionKicker}>{userRole === 'faculty' ? 'Total student performance' : 'Overall attendance'}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{overall.total > 0 ? `${overall.percentage}%` : 'N/A'}</Text>
            <Text style={styles.summaryMeta}>{overall.present}/{overall.total} marks</Text>
          </View>
          {overall.total > 0 && <ProgressBar value={overall.percentage} />}
          <Text style={styles.minRequired}>{userRole === 'faculty' ? 'Target average: 75%' : 'Minimum required: 75%'}</Text>
        </Card>

        <View style={styles.statGrid}>
          {overviewStats.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>
      </View>
    );
  }

  function renderStudentList() {
    return (
      <View style={styles.sectionGap}>
        <Card style={{ gap: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Students Registered</Text>
          {facultyStudents.length === 0 ? (
            <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 20 }}>No students registered yet.</Text>
          ) : (
            facultyStudents.map((stu) => (
              <View key={stu.student_id} style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', fontSize: 15 }}>{stu.name}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    Latest: {stu.latest_status ? (stu.latest_status === 'valid' ? '✅ Present' : '❌ Rejected') : 'None'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary }}>
                    {stu.total_records > 0 ? `${Math.round((stu.total_present / stu.total_records) * 100)}%` : '0%'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b' }}>{stu.total_present}/{stu.total_records} classes</Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </View>
    );
  }

  function MonthChip({ month }) {
    const isActive = month === selectedMonth;
    return (
      <Pressable
        onPress={() => setSelectedMonth(month)}
        style={[styles.monthChip, isActive && styles.monthChipActive]}
      >
        <Text style={[styles.monthChipText, isActive && styles.monthChipTextActive]}>{month}</Text>
      </Pressable>
    );
  }

  function renderMonthWise() {
    const mData = monthlySummaries[selectedMonth] || { present: 0, absent: 0, total: 0, percentage: 0 };
    return (
      <View style={styles.sectionGap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
          {availableMonths.map((month) => (
            <MonthChip key={month} month={month} />
          ))}
        </ScrollView>

        <Card style={styles.overallCard}>
          <Text style={styles.sectionKicker}>{selectedMonth} overview</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{mData.total > 0 ? `${mData.percentage}%` : 'N/A'}</Text>
            <Text style={styles.summaryMeta}>{mData.present}/{mData.total} classes</Text>
          </View>
          {mData.total > 0 && <ProgressBar value={mData.percentage} />}
          <View style={styles.inlineStatsRow}>
            <View style={styles.inlineStat}><Text style={styles.inlineStatValue}>{mData.present}</Text><Text style={styles.inlineStatLabel}>Present</Text></View>
            <View style={styles.inlineStat}><Text style={styles.inlineStatValue}>{mData.absent}</Text><Text style={styles.inlineStatLabel}>Absent</Text></View>
            <View style={styles.inlineStat}><Text style={styles.inlineStatValue}>{mData.total}</Text><Text style={styles.inlineStatLabel}>Total</Text></View>
          </View>
        </Card>
      </View>
    );
  }

  function renderSubjectWise() {
    if (subjectSummaries.length === 0) {
      return <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No data entered yet.</Text>;
    }
    return (
      <View style={styles.sectionGap}>
        {subjectSummaries.map((subject) => (
          <Card key={subject.name} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectMetaWrap}>
                <Text style={styles.subjectName}>{subject.name}</Text>
              </View>
              <Text style={styles.subjectPercent}>{subject.total > 0 ? `${subject.percentage}%` : 'N/A'}</Text>
            </View>
            {subject.total > 0 && <ProgressBar value={subject.percentage} />}
            <Text style={styles.subjectCount}>{subject.present} present • {subject.absent} absent</Text>
          </Card>
        ))}
      </View>
    );
  }

  function renderDailyWise() {
    if (dailySummaries.length === 0) {
      return <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No data entered yet.</Text>;
    }
    return (
      <View style={styles.sectionGap}>
        {dailySummaries.map((daily, index) => (
          <Card key={index} style={styles.dateCard}>
            <View>
              <Text style={styles.dateText}>{daily.date}</Text>
              <Text style={styles.dateSubText}>{daily.subject}</Text>
            </View>
            <Text
              style={[
                styles.dateStatus,
                daily.status === 'Present'
                  ? styles.presentStatus
                  : daily.status === 'Absent'
                    ? styles.absentStatus
                    : styles.offStatus,
              ]}
            >
              {daily.status}
            </Text>
          </Card>
        ))}
      </View>
    );
  }

  function renderPeriodWise() {
    const pData = periodWiseSummaries[selectedMonth] || {};
    const subjects = Object.keys(pData);

    return (
      <View style={styles.sectionGap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
          {availableMonths.map((month) => (
            <MonthChip key={month} month={month} />
          ))}
        </ScrollView>

        <Card style={styles.overallCard}>
          <Text style={styles.sectionKicker}>Period-wise breakdown</Text>
          <Text style={styles.sectionTitle}>{selectedMonth}</Text>
        </Card>

        {subjects.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 20, color: '#64748b' }}>No data entered yet.</Text>
        )}

        {subjects.map((sub) => {
          const row = pData[sub];
          const pct = row.total > 0 ? Math.round((row.present / row.total) * 100) : 0;
          return (
            <Card key={sub} style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <View style={styles.subjectMetaWrap}>
                  <Text style={styles.subjectName}>{sub}</Text>
                  <Text style={styles.subjectFaculty}>Present: {row.present} • Absent: {row.absent}</Text>
                </View>
                <Text style={styles.subjectPercent}>{row.total}</Text>
              </View>
              {row.total > 0 && <ProgressBar value={pct} />}
            </Card>
          );
        })}
      </View>
    );
  }

  const tabs = [
    { key: TAB_KEYS.OVERVIEW, label: 'Overview' },
    { key: TAB_KEYS.MONTH, label: 'Month wise' },
    { key: TAB_KEYS.SUBJECT, label: 'Subject-wise' },
    { key: TAB_KEYS.DAILY, label: 'Daily' },
    { key: TAB_KEYS.PERIOD, label: 'Period-wise' },
  ];

  if (userRole === 'faculty') {
    tabs.unshift({ key: TAB_KEYS.STUDENTS, label: 'Student List' });
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Attendance" subtitle={userRole === 'faculty' ? "Faculty analytics" : "Detailed analytics"} showBack onBackPress={() => navigation.goBack()} />

      <SegmentTabs
        tabs={tabs}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === TAB_KEYS.OVERVIEW ? renderOverview() : null}
      {activeTab === TAB_KEYS.MONTH ? renderMonthWise() : null}
      {activeTab === TAB_KEYS.SUBJECT ? renderSubjectWise() : null}
      {activeTab === TAB_KEYS.DAILY ? renderDailyWise() : null}
      {activeTab === TAB_KEYS.PERIOD ? renderPeriodWise() : null}
      {activeTab === TAB_KEYS.STUDENTS ? renderStudentList() : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.section,
    paddingBottom: SPACING.lg,
  },
  sectionGap: {
    marginVertical: 12,
    gap: SPACING.section,
  },
  monthStrip: {
    gap: 10,
    paddingHorizontal: 10,
    paddingRight: 4,
  },
  monthChip: {
    backgroundColor: '#e5e7eb',
    borderRadius: RADIUS.button,
    minWidth: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  monthChipActive: {
    backgroundColor: COLORS.primary,
  },
  monthChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  monthChipTextActive: {
    color: '#ffffff',
  },
  overallCard: {
    gap: 10,
  },
  sectionKicker: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  summaryRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: {
    color: '#3b82f6',
    fontSize: 48,
    fontWeight: '600',
    letterSpacing: -1,
  },
  summaryMeta: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  minRequired: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    gap: 4,
    paddingVertical: 14,
  },
  statValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  noteCard: {
    gap: 6,
  },
  noteTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  noteText: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  inlineStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  inlineStat: {
    backgroundColor: '#f1f4f5',
    borderRadius: 14,
    flex: 1,
    gap: 3,
    paddingVertical: 12,
  },
  inlineStatValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineStatLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  subjectCard: {
    gap: 10,
    marginVertical: 10,
    padding: 16,
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
  dateCard: {
    alignItems: 'center',
    borderRadius: RADIUS.card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    padding: 16,
    boxShadow: '0 6px 10px rgba(15, 23, 42, 0.08)',
  },
  dateText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  dateSubText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  dateStatus: {
    borderRadius: RADIUS.pill,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: 'center',
  },
  presentStatus: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    color: '#15803d',
  },
  absentStatus: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#b91c1c',
  },
  offStatus: {
    backgroundColor: 'rgba(100, 116, 139, 0.14)',
    color: '#475569',
  },
});

export default AttendanceScreen;
