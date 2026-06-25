import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import { AlertsContext } from '../context/AlertsContext';
import ROUTES from '../navigation/routes';
import { getDashboardData } from '../services/dashboardService';
import { getFacultyStudents } from '../services/facultyService';
import { captureGPS } from '../services/validationService';
import { captureWiFi } from '../services/networkService';
import { COLORS, RADIUS, SPACING } from '../theme';
import STORAGE_KEYS from '../utils/storageKeys';

import { BASE_URL } from '../config';
import QRCode from 'react-native-qrcode-svg';

function HomeScreen({ navigation }) {
  const { unreadCount, inAppToast, dismissInAppToast } = useContext(AlertsContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const [facultySessionId, setFacultySessionId] = useState(null);
  const [facultyQrToken, setFacultyQrToken] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [facultyStudents, setFacultyStudents] = useState([]);
  const [isRefreshingStudents, setIsRefreshingStudents] = useState(false);
  const [roomName, setRoomName] = useState('Hall A');
  const [subjectName, setSubjectName] = useState('');

  const QR_REFRESH_SECONDS = 60;
  const SESSION_DURATION_HOURS = 2;
  const MIN_ATTENDANCE_PCT = 75;

  const loadDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const data = await getDashboardData();
      setDashboardData(data);
      setDashboardError(null);
    } catch (err) {
      setDashboardData(null);
      setDashboardError(err.message);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function checkRole() {
      const role = await AsyncStorage.getItem('role');
      if (isMounted) setUserRole(role || 'student');
    }
    checkRole();

    async function loadFacultyData() {
      const role = await AsyncStorage.getItem('role');
      if (role === 'faculty') {
        try {
          const students = await getFacultyStudents();
          if (isMounted) setFacultyStudents(students);
        } catch (err) {
          console.log('Error loading faculty data:', err);
        }
      }
    }

    loadDashboard();
    loadFacultyData();

    return () => {
      isMounted = false;
    };
  }, []);

  const attendanceColor = useMemo(() => {
    if (!dashboardData || dashboardData.total_classes === 0) return '#64748b';
    const percentage = dashboardData?.attendance_percentage ?? 0;

    if (percentage > 85) {
      return '#0f766e';
    }

    if (percentage >= MIN_ATTENDANCE_PCT) {
      return '#b45309';
    }

    return '#a83836';
  }, [dashboardData]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good Morning';
    }

    if (hour < 17) {
      return 'Good Afternoon';
    }

    return 'Good Evening';
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_ID,
      STORAGE_KEYS.DEVICE_INFO,
    ]);

    setIsLoggingOut(false);
    navigation.replace(ROUTES.LOGIN);
  }

  async function handleStartSession() {
    setIsStartingSession(true);
    try {
      const [gps, wifi] = await Promise.all([captureGPS(), captureWiFi()]);
      const endTime = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subjectName.trim() || roomName.trim() || 'Class',
          end_time: endTime,
          classroom_lat: gps.latitude || 0.0,
          classroom_lon: gps.longitude || 0.0,
          room_name: roomName,
          wifi_ssid: wifi.ssid || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to start session');
      setFacultySessionId(data.id);
      setFacultyQrToken(data.qr_token);
      setCountdown(QR_REFRESH_SECONDS);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsStartingSession(false);
    }
  }

  async function refreshQR() {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/session/qr/${facultySessionId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setFacultyQrToken(data.qr_token);
      }
    } catch (err) {
      console.log('Error refreshing QR:', err);
    }
  }

  useEffect(() => {
    let timerId;
    if (userRole === 'faculty' && facultySessionId) {
      timerId = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            refreshQR();
            return QR_REFRESH_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerId);
  }, [userRole, facultySessionId]);

  function NavCard({ title, subtitle, onPress }) {
    return (
      <Pressable onPress={onPress} style={styles.navCard}>
        <View style={styles.navCardCopy}>
          <Text style={styles.navCardTitle}>{title}</Text>
          <Text style={styles.navCardSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.navArrow}>›</Text>
      </Pressable>
    );
  }

  return (
    <ScreenLayout>
      <AppHeader title="Verimark" subtitle="Faculty Dashboard" />

      {inAppToast ? (
        <Pressable style={styles.toastBanner} onPress={dismissInAppToast}>
          <Text style={styles.toastTitle}>{inAppToast.title}</Text>
          <Text numberOfLines={1} style={styles.toastMessage}>
            {inAppToast.message}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.contentStack}>
        {isLoadingDashboard ? (
          <View style={styles.loadingWrap}>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonMini} />
              <View style={styles.skeletonMini} />
              <View style={styles.skeletonMini} />
            </View>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : !dashboardData ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>
              {dashboardError ? `Error: ${dashboardError}` : 'No attendance data yet'}
            </Text>
            <AppButton
              label="Retry"
              onPress={() => loadDashboard()}
              style={{ marginTop: 20, width: 200 }}
            />
            <Pressable
              onPress={handleLogout}
              disabled={isLoggingOut}
              style={[styles.logoutWrap, { marginTop: 10 }]}
            >
              <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Card style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroGreeting}>
                    {greeting}, {dashboardData.name.split(' ')[0]}
                  </Text>
                  <Text style={styles.heroName}>{dashboardData.name}</Text>
                  {userRole !== 'faculty' && (
                    <Text style={styles.heroSubtitle}>
                      Last marked: {dashboardData.lastMarkedLabel}
                    </Text>
                  )}
                </View>
                <Pressable
                  style={styles.alertBell}
                  onPress={() => navigation.navigate(ROUTES.ALERTS)}
                >
                  <Text style={styles.alertBellIcon}>🔔</Text>
                  {unreadCount > 0 ? (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                <View style={styles.profileBadge}>
                  {dashboardData.profile_photo_url ? (
                    <Image source={{ uri: `${BASE_URL.replace('/api/v1', '')}${dashboardData.profile_photo_url.startsWith('/') ? '' : '/'}${dashboardData.profile_photo_url}` }} style={{ width: '100%', height: '100%', borderRadius: 999 }} />
                  ) : (
                    <Text style={styles.profileInitial}>{dashboardData.name.charAt(0)}</Text>
                  )}
                </View>
              </View>
            </Card>

            {userRole === 'faculty' ? (
              <>
                <Card style={{ marginTop: 12, alignItems: 'center', gap: 16 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Faculty Controls</Text>
                  </View>
                  {!facultySessionId ? (
                    <View style={{ width: '100%', gap: 10 }}>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                          SUBJECT NAME
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#f1f5f9',
                            borderRadius: 8,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                          }}
                        >
                          <TextInput
                            value={subjectName}
                            onChangeText={setSubjectName}
                            placeholder="e.g. Data Structures, Physics"
                            style={{ fontSize: 16, color: '#0f172a' }}
                          />
                        </View>
                      </View>
                      <View style={{ gap: 4 }}>
                        <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
                          CLASSROOM / ROOM NAME
                        </Text>
                        <View
                          style={{
                            backgroundColor: '#f1f5f9',
                            borderRadius: 8,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                          }}
                        >
                          <TextInput
                            value={roomName}
                            onChangeText={setRoomName}
                            placeholder="e.g. Lab 2, Hall A"
                            style={{ fontSize: 16, color: '#0f172a' }}
                          />
                        </View>
                      </View>
                      <AppButton
                        label={isStartingSession ? 'Starting...' : 'Start New Session'}
                        onPress={handleStartSession}
                        loading={isStartingSession}
                        style={{ width: '100%' }}
                      />
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', width: '100%', gap: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600' }}>
                        Scan to Mark Attendance
                      </Text>
                      <View style={{ padding: 16, backgroundColor: 'white', borderRadius: 12 }}>
                        <QRCode value={facultyQrToken} size={250} />
                      </View>
                      <Text style={{ fontSize: 18, color: '#eab308', fontWeight: 'bold' }}>
                        Refreshes in: {countdown}s
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>
                        Raw Token for manual entry:
                      </Text>
                      <Text style={{ fontSize: 10, color: '#000' }} selectable>
                        {facultyQrToken}
                      </Text>
                    </View>
                  )}
                </Card>

                <Card style={{ marginTop: 12, gap: 12 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Students Registered</Text>
                    <Pressable
                      onPress={async () => {
                        setIsRefreshingStudents(true);
                        try {
                          const data = await getFacultyStudents();
                          setFacultyStudents(data);
                        } finally {
                          setIsRefreshingStudents(false);
                        }
                      }}
                      style={{ padding: 4 }}
                    >
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                        {isRefreshingStudents ? 'Refreshing...' : 'Refresh List'}
                      </Text>
                    </Pressable>
                  </View>

                  {facultyStudents.length === 0 ? (
                    <Text style={{ color: '#64748b', textAlign: 'center', paddingVertical: 10 }}>
                      No students registered to you yet.
                    </Text>
                  ) : (
                    facultyStudents.map((stu) => (
                      <View
                        key={stu.student_id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: '#f1f5f9',
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '600', fontSize: 14 }}>{stu.name}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>
                            Last:{' '}
                            {stu.latest_status
                              ? stu.latest_status === 'valid'
                                ? '✅ Present'
                                : stu.latest_status === 'suspicious'
                                  ? '⚠️ Suspicious'
                                  : '❌ Rejected'
                              : 'None'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary }}>
                            {stu.total_records > 0
                              ? `${Math.round((stu.total_present / stu.total_records) * 100)}%`
                              : '0%'}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#64748b' }}>
                            {stu.total_present}/{stu.total_records} classes
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </Card>
              </>
            ) : null}

            <View style={styles.quickStatsRow}>
              <LinearGradient
                colors={['#ecfdf3', '#ffffff']}
                style={[styles.quickStatCard, styles.presentTint]}
              >
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.quickStatValue}>{dashboardData.present}</Text>
                <Text style={styles.quickStatLabel}>Present</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#fef2f2', '#ffffff']}
                style={[styles.quickStatCard, styles.absentTint]}
              >
                <Text style={styles.statIcon}>❌</Text>
                <Text style={styles.quickStatValue}>{dashboardData.rejected}</Text>
                <Text style={styles.quickStatLabel}>Absent</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#eff6ff', '#ffffff']}
                style={[styles.quickStatCard, styles.totalTint]}
              >
                <Text style={styles.statIcon}>📚</Text>
                <Text style={styles.quickStatValue}>{dashboardData.total_classes}</Text>
                <Text style={styles.quickStatLabel}>Total</Text>
              </LinearGradient>
            </View>

            <Card style={styles.attendanceCard}>
              <Text style={styles.sectionKicker}>Overall attendance</Text>
              <View style={styles.attendanceRow}>
                <Text style={[styles.attendanceValue, { color: attendanceColor }]}>
                  {dashboardData.total_classes > 0
                    ? `${dashboardData.attendance_percentage}%`
                    : 'N/A'}
                </Text>
                <Text style={styles.attendanceHint}>
                  {dashboardData.present}/{dashboardData.total_classes} classes
                </Text>
              </View>
              {dashboardData.total_classes > 0 && (
                <ProgressBar value={dashboardData.attendance_percentage} />
              )}
              <Text style={styles.minRequired}>Minimum required: {MIN_ATTENDANCE_PCT}%</Text>
            </Card>

            <View style={styles.navStack}>
              <NavCard
                title="Attendance"
                subtitle="Overview and insights →"
                onPress={() => navigation.navigate(ROUTES.ATTENDANCE)}
              />
              <NavCard
                title="Period-wise Attendance"
                subtitle="Subject-level breakdown →"
                onPress={() => navigation.navigate(ROUTES.PERIOD_WISE)}
              />
              <NavCard
                title="Timetable"
                subtitle="View today's schedule →"
                onPress={() => navigation.navigate(ROUTES.TIMETABLE)}
              />
            </View>

            {userRole !== 'faculty' && (
              <AppButton
                label="Start Attendance Scan"
                onPress={() => navigation.navigate(ROUTES.SCAN)}
                style={styles.scanButton}
              />
            )}

            <Pressable onPress={handleLogout} disabled={isLoggingOut} style={styles.logoutWrap}>
              <Text style={styles.logoutText}>{isLoggingOut ? 'Logging out...' : 'Logout'}</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStack: {
    alignSelf: 'stretch',
    gap: 16,
    marginVertical: 12,
    width: '100%',
  },
  toastBanner: {
    backgroundColor: '#eaf2ff',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastTitle: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  toastMessage: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingWrap: {
    alignItems: 'center',
    gap: 10,
    marginVertical: SPACING.lg,
    width: '100%',
  },
  skeletonCard: {
    backgroundColor: '#e2e8f0',
    borderRadius: RADIUS.card,
    height: 130,
    width: '100%',
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  skeletonMini: {
    backgroundColor: '#e2e8f0',
    borderRadius: RADIUS.card,
    flex: 1,
    height: 84,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
    marginVertical: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  heroCard: {
    borderRadius: RADIUS.card,
    padding: 18,
    boxShadow: '0 8px 12px rgba(15, 23, 42, 0.08)',
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },
  heroName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  heroGreeting: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  heroSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
  profileBadge: {
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  alertBell: {
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    marginRight: 8,
    position: 'relative',
    width: 42,
  },
  alertBellIcon: {
    fontSize: 18,
  },
  alertBadge: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileInitial: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '600',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  quickStatCard: {
    alignItems: 'center',
    borderRadius: RADIUS.card,
    flex: 1,
    gap: 4,
    paddingVertical: 18,
    boxShadow: '0 6px 10px rgba(15, 23, 42, 0.08)',
  },
  statIcon: {
    fontSize: 16,
  },
  quickStatValue: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  quickStatLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  presentTint: {
    backgroundColor: 'transparent',
  },
  absentTint: {
    backgroundColor: 'transparent',
  },
  totalTint: {
    backgroundColor: 'transparent',
  },
  attendanceCard: {
    gap: 10,
  },
  sectionKicker: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  attendanceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  attendanceValue: {
    fontSize: 50,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 54,
  },
  attendanceHint: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  minRequired: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  navStack: {
    gap: 12,
    marginVertical: 12,
  },
  navCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navCardCopy: {
    flex: 1,
    paddingRight: 10,
  },
  navCardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  navCardSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  navArrow: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '500',
  },
  scanButton: {
    borderRadius: RADIUS.button,
    width: '100%',
  },
  logoutWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  logoutText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default HomeScreen;
