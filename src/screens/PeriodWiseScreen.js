import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import SegmentTabs from '../components/SegmentTabs';
import {
  getConsolidatedPeriodWiseSummary,
  getMonthOptions,
  getPeriodWiseSummary,
} from '../services/attendanceDataService';
import { RADIUS, SPACING } from '../theme';

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
  const monthOptions = getMonthOptions();
  const [activeTab, setActiveTab] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]);

  const rows = activeTab === 'month'
    ? getPeriodWiseSummary(selectedMonth)
    : getConsolidatedPeriodWiseSummary();

  const tableTitle = useMemo(() => (
    activeTab === 'month' ? `${selectedMonth} breakdown` : 'Consolidated breakdown'
  ), [activeTab, selectedMonth]);

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Period-wise" subtitle="Monthly and consolidated analytics" showBack onBackPress={() => navigation.goBack()} />

      <SegmentTabs
        tabs={[
          { key: 'month', label: 'Month Wise' },
          { key: 'consolidated', label: 'Consolidated' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'month' ? (
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
        <Text style={styles.sectionKicker}>Period-wise view</Text>
        <Text style={styles.sectionTitle}>{tableTitle}</Text>
      </Card>

      <View style={styles.rowStack}>
        {rows.map((row) => {
          const percentage = Math.round((row.present / row.total) * 100);
          const icon = Object.keys(SUBJECT_ICONS).find((key) => row.subject.includes(key));
          return (
            <Card key={row.subject} style={styles.subjectCard}>
              <View style={styles.subjectHeader}>
                <View style={styles.subjectMetaWrap}>
                  <Text style={styles.subjectName}>{icon ? `${SUBJECT_ICONS[icon]} ` : '📚 '}{row.subject}</Text>
                  <Text style={styles.subjectFaculty}>Present: {row.present} • Absent: {row.absent}</Text>
                </View>
                <Text style={styles.subjectPercent}>{percentage}%</Text>
              </View>
              <View style={styles.progressRow}>
                <View style={styles.progressWrap}>
                  <ProgressBar value={percentage} trackStyle={styles.progressTrack} barStyle={styles.progressBar} />
                </View>
                <Text style={styles.progressLabel}>{percentage}%</Text>
              </View>
              <Text style={styles.subjectCount}>{row.total} total periods</Text>
            </Card>
          );
        })}
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
});

export default PeriodWiseScreen;
