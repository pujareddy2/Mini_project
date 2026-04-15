import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import SegmentTabs from '../components/SegmentTabs';
import ROUTES from '../navigation/routes';
import {
  getDailySummary,
  getMonthOptions,
  getMonthlySummary,
  getOverallSummary,
  getPeriodWiseSummary,
  getSubjectSummary,
} from '../services/attendanceDataService';
import { COLORS, RADIUS, SPACING } from '../theme';

const TAB_KEYS = {
  OVERVIEW: 'overview',
  MONTH: 'month',
  SUBJECT: 'subject',
  DAILY: 'daily',
  PERIOD: 'period',
};

function AttendanceScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState(route.params?.initialTab || TAB_KEYS.OVERVIEW);
  const [selectedMonth, setSelectedMonth] = useState(getMonthOptions()[0]);

  const overall = getOverallSummary();
  const monthSummaries = getMonthlySummary();
  const subjectSummaries = getSubjectSummary();
  const dailySummaries = getDailySummary();
  const periodWiseRows = getPeriodWiseSummary(selectedMonth);

  const overviewStats = useMemo(
    () => [
      { label: 'Present', value: overall.present },
      { label: 'Absent', value: overall.absent },
      { label: 'Working Days', value: overall.total },
    ],
    [overall.absent, overall.present, overall.total],
  );

  const currentMonth = monthSummaries.find((item) => item.month === selectedMonth) || monthSummaries[0];

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

  function renderOverview() {
    return (
      <View style={styles.sectionGap}>
        <Card style={styles.overallCard}>
          <Text style={styles.sectionKicker}>Overall attendance</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{overall.percentage}%</Text>
            <Text style={styles.summaryMeta}>{overall.present}/{overall.total} classes</Text>
          </View>
          <ProgressBar value={overall.percentage} />
          <Text style={styles.minRequired}>Minimum required: 75%</Text>
        </Card>

        <View style={styles.statGrid}>
          {overviewStats.map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.noteCard}>
          <Text style={styles.noteTitle}>Quick status</Text>
          <Text style={styles.noteText}>Use Month-wise for date cards, Period-wise for subject cards, and Timetable for the day timeline.</Text>
        </Card>
      </View>
    );
  }

  function renderMonthWise() {
    return (
      <View style={styles.sectionGap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
          {getMonthOptions().map((month) => (
            <MonthChip key={month} month={month} />
          ))}
        </ScrollView>

        <Card style={styles.overallCard}>
          <Text style={styles.sectionKicker}>{selectedMonth} overview</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>{currentMonth.percentage}%</Text>
            <Text style={styles.summaryMeta}>{currentMonth.present}/{currentMonth.total} classes</Text>
          </View>
          <ProgressBar value={currentMonth.percentage} />
          <View style={styles.inlineStatsRow}>
            <View style={styles.inlineStat}><Text style={styles.inlineStatValue}>{currentMonth.present}</Text><Text style={styles.inlineStatLabel}>Present</Text></View>
            <View style={styles.inlineStat}><Text style={styles.inlineStatValue}>{currentMonth.absent}</Text><Text style={styles.inlineStatLabel}>Absent</Text></View>
            <View style={styles.inlineStat}><Text style={styles.inlineStatValue}>{currentMonth.total}</Text><Text style={styles.inlineStatLabel}>Total</Text></View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Daily cards</Text>
        {dailySummaries.map((day) => (
          <Card key={day.date} style={styles.dateCard}>
            <View>
              <Text style={styles.dateText}>{day.date} 2026</Text>
              <Text style={styles.dateSubText}>Month-wise attendance snapshot</Text>
            </View>
            <Text
              style={[
                styles.dateStatus,
                day.status === 'Present'
                  ? styles.presentStatus
                  : day.status === 'Absent'
                    ? styles.absentStatus
                    : styles.offStatus,
              ]}
            >
              {day.status}
            </Text>
          </Card>
        ))}
      </View>
    );
  }

  function renderSubjectWise() {
    return (
      <View style={styles.sectionGap}>
        {subjectSummaries.map((subject) => (
          <Card key={subject.name} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectMetaWrap}>
                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectFaculty}>{subject.faculty}</Text>
              </View>
              <Text style={styles.subjectPercent}>{subject.percentage}%</Text>
            </View>
            <ProgressBar value={subject.percentage} />
            <Text style={styles.subjectCount}>{subject.present} present • {subject.absent} absent</Text>
          </Card>
        ))}
      </View>
    );
  }

  function renderDailyWise() {
    return (
      <View style={styles.sectionGap}>
        {dailySummaries.map((daily) => (
          <Card key={daily.date} style={styles.dateCard}>
            <View>
              <Text style={styles.dateText}>{daily.date} 2026</Text>
              <Text style={styles.dateSubText}>Attendance log</Text>
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
    return (
      <View style={styles.sectionGap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
          {getMonthOptions().map((month) => (
            <MonthChip key={month} month={month} />
          ))}
        </ScrollView>

        <Card style={styles.overallCard}>
          <Text style={styles.sectionKicker}>Period-wise breakdown</Text>
          <Text style={styles.sectionTitle}>{selectedMonth}</Text>
        </Card>

        {periodWiseRows.map((row) => (
          <Card key={row.subject} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectMetaWrap}>
                <Text style={styles.subjectName}>{row.subject}</Text>
                <Text style={styles.subjectFaculty}>Present: {row.present} • Absent: {row.absent}</Text>
              </View>
              <Text style={styles.subjectPercent}>{row.total}</Text>
            </View>
            <ProgressBar value={Math.round((row.present / row.total) * 100)} />
          </Card>
        ))}

        <AppButton label="Open Period-wise Details" onPress={() => navigation.navigate(ROUTES.PERIOD_WISE)} />
        <AppButton label="Open Timetable" variant="secondary" onPress={() => navigation.navigate(ROUTES.TIMETABLE)} />
      </View>
    );
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Attendance" subtitle="Detailed analytics" showBack onBackPress={() => navigation.goBack()} />

      <SegmentTabs
        tabs={[
          { key: TAB_KEYS.OVERVIEW, label: 'Overview' },
          { key: TAB_KEYS.MONTH, label: 'Month wise' },
          { key: TAB_KEYS.SUBJECT, label: 'Subject-wise' },
          { key: TAB_KEYS.DAILY, label: 'Daily' },
          { key: TAB_KEYS.PERIOD, label: 'Period-wise' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === TAB_KEYS.OVERVIEW ? renderOverview() : null}
      {activeTab === TAB_KEYS.MONTH ? renderMonthWise() : null}
      {activeTab === TAB_KEYS.SUBJECT ? renderSubjectWise() : null}
      {activeTab === TAB_KEYS.DAILY ? renderDailyWise() : null}
      {activeTab === TAB_KEYS.PERIOD ? renderPeriodWise() : null}
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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
