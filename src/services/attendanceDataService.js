const ATTENDANCE_DATA = {
  overall: {
    present: 42,
    absent: 6,
    total: 48,
  },
  monthly: {
    April: {
      present: 12,
      absent: 2,
      total: 14,
    },
    March: {
      present: 15,
      absent: 1,
      total: 16,
    },
    February: {
      present: 15,
      absent: 3,
      total: 18,
    },
  },
  subjects: [
    {
      name: 'Cloud Computing',
      present: 14,
      absent: 2,
      total: 16,
      faculty: 'Dr. Rao',
    },
    {
      name: 'Compiler Design',
      present: 13,
      absent: 3,
      total: 16,
      faculty: 'Prof. Neha',
    },
    {
      name: 'DBMS',
      present: 8,
      absent: 2,
      total: 10,
      faculty: 'Dr. Kumar',
    },
    {
      name: 'Computer Networks',
      present: 7,
      absent: 1,
      total: 8,
      faculty: 'Ms. Priya',
    },
  ],
  daily: [
    { date: '14 Apr', status: 'Present' },
    { date: '13 Apr', status: 'Absent' },
    { date: '12 Apr', status: 'Week Off' },
    { date: '11 Apr', status: 'Present' },
    { date: '10 Apr', status: 'Present' },
    { date: '09 Apr', status: 'Present' },
    { date: '08 Apr', status: 'Absent' },
  ],
  periodWise: {
    monthly: {
      April: [
        { subject: 'Cloud Computing', total: 4, present: 4, absent: 0 },
        { subject: 'Compiler Design', total: 4, present: 3, absent: 1 },
        { subject: 'DBMS', total: 3, present: 2, absent: 1 },
        { subject: 'Computer Networks', total: 3, present: 3, absent: 0 },
      ],
      March: [
        { subject: 'Cloud Computing', total: 4, present: 4, absent: 0 },
        { subject: 'Compiler Design', total: 4, present: 4, absent: 0 },
        { subject: 'DBMS', total: 4, present: 4, absent: 0 },
        { subject: 'Computer Networks', total: 4, present: 3, absent: 1 },
      ],
    },
    consolidated: [
      { subject: 'Cloud Computing', total: 8, present: 8, absent: 0 },
      { subject: 'Compiler Design', total: 8, present: 7, absent: 1 },
      { subject: 'DBMS', total: 7, present: 6, absent: 1 },
      { subject: 'Computer Networks', total: 7, present: 6, absent: 1 },
    ],
  },
  timetable: [
    { time: '09:00', subject: 'Cloud Computing', faculty: 'Dr. Rao' },
    { time: '10:00', subject: 'Compiler Design', faculty: 'Prof. Neha' },
    { time: '11:15', subject: 'DBMS', faculty: 'Dr. Kumar' },
    { time: '12:15', subject: 'Lunch Break', faculty: '—' },
    { time: '01:15', subject: 'Computer Networks', faculty: 'Ms. Priya' },
  ],
  semester: {
    label: 'Semester IV',
    status: 'Active',
    gpa: '8.4',
    creditsEarned: 64,
    attendanceBenchmark: 75,
  },
};

function calculateAttendancePercentage(present, total) {
  if (!total) {
    return 0;
  }

  return Math.round((present / total) * 100);
}

function getDashboardSummary() {
  const attendancePercentage = calculateAttendancePercentage(
    ATTENDANCE_DATA.overall.present,
    ATTENDANCE_DATA.overall.total,
  );
  const latestDaily = ATTENDANCE_DATA.daily[0];

  return {
    name: 'Puja Midde',
    rollNumber: '12345',
    attendancePercentage,
    lastAttendanceStatus: `${latestDaily.date} • ${latestDaily.status}`,
    lastMarkedLabel: 'Today 09:15 AM',
    presentCount: ATTENDANCE_DATA.overall.present,
    absentCount: ATTENDANCE_DATA.overall.absent,
    totalClasses: ATTENDANCE_DATA.overall.total,
    alerts: [
      'Your attendance is below 85%',
      'You missed DBMS class yesterday',
    ],
    todayClasses: ATTENDANCE_DATA.timetable.slice(0, 2),
  };
}

function getOverallSummary() {
  const overall = ATTENDANCE_DATA.overall;

  return {
    ...overall,
    percentage: calculateAttendancePercentage(overall.present, overall.total),
  };
}

function getMonthlySummary() {
  return Object.entries(ATTENDANCE_DATA.monthly).map(([month, summary]) => ({
    month,
    ...summary,
    percentage: calculateAttendancePercentage(summary.present, summary.total),
  }));
}

function getSubjectSummary() {
  return ATTENDANCE_DATA.subjects.map((subject) => ({
    ...subject,
    percentage: calculateAttendancePercentage(subject.present, subject.total),
  }));
}

function getDailySummary() {
  return ATTENDANCE_DATA.daily;
}

function getPeriodWiseSummary(month = 'April') {
  return ATTENDANCE_DATA.periodWise.monthly[month] || ATTENDANCE_DATA.periodWise.monthly.April;
}

function getConsolidatedPeriodWiseSummary() {
  return ATTENDANCE_DATA.periodWise.consolidated;
}

function getTimetableSummary() {
  return ATTENDANCE_DATA.timetable;
}

function getSemesterSummary() {
  return ATTENDANCE_DATA.semester;
}

function getMonthOptions() {
  return Object.keys(ATTENDANCE_DATA.monthly);
}

export {
  ATTENDANCE_DATA,
  calculateAttendancePercentage,
  getConsolidatedPeriodWiseSummary,
  getDailySummary,
  getDashboardSummary,
  getMonthOptions,
  getMonthlySummary,
  getOverallSummary,
  getPeriodWiseSummary,
  getSemesterSummary,
  getSubjectSummary,
  getTimetableSummary,
};