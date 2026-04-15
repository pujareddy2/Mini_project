import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppButton from '../components/AppButton';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import ScreenLayout from '../components/ScreenLayout';
import { AlertsContext } from '../context/AlertsContext';
import ROUTES from '../navigation/routes';
import { getDashboardData } from '../services/dashboardService';
import { COLORS, RADIUS, SPACING } from '../theme';
import STORAGE_KEYS from '../utils/storageKeys';

function HomeScreen({ navigation }) {
  const { unreadCount, inAppToast, dismissInAppToast } = useContext(AlertsContext);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoadingDashboard(true);
      try {
        const data = await getDashboardData();
        if (isMounted) {
          setDashboardData(data);
        }
      } catch {
        if (isMounted) {
          setDashboardData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const attendanceColor = useMemo(() => {
    const percentage = dashboardData?.attendancePercentage ?? 0;

    if (percentage > 85) {
      return '#0f766e';
    }

    if (percentage >= 75) {
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
      <AppHeader title="Verimark" subtitle="Student dashboard" />

      {inAppToast ? (
        <Pressable style={styles.toastBanner} onPress={dismissInAppToast}>
          <Text style={styles.toastTitle}>{inAppToast.title}</Text>
          <Text numberOfLines={1} style={styles.toastMessage}>{inAppToast.message}</Text>
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
            <Text style={styles.emptyText}>No attendance data yet</Text>
          </View>
        ) : (
          <>
            <Card style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroGreeting}>{greeting}, {dashboardData.name.split(' ')[0]}</Text>
                  <Text style={styles.heroName}>{dashboardData.name}</Text>
                  <Text style={styles.heroSubtitle}>Last marked: {dashboardData.lastMarkedLabel}</Text>
                </View>
                <Pressable style={styles.alertBell} onPress={() => navigation.navigate(ROUTES.ALERTS)}>
                  <Text style={styles.alertBellIcon}>🔔</Text>
                  {unreadCount > 0 ? (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  ) : null}
                </Pressable>
                <View style={styles.profileBadge}>
                  <Text style={styles.profileInitial}>{dashboardData.name.charAt(0)}</Text>
                </View>
              </View>
            </Card>

            <View style={styles.quickStatsRow}>
              <LinearGradient colors={['#ecfdf3', '#ffffff']} style={[styles.quickStatCard, styles.presentTint]}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.quickStatValue}>{dashboardData.presentCount}</Text>
                <Text style={styles.quickStatLabel}>Present</Text>
              </LinearGradient>
              <LinearGradient colors={['#fef2f2', '#ffffff']} style={[styles.quickStatCard, styles.absentTint]}>
                <Text style={styles.statIcon}>❌</Text>
                <Text style={styles.quickStatValue}>{dashboardData.absentCount}</Text>
                <Text style={styles.quickStatLabel}>Absent</Text>
              </LinearGradient>
              <LinearGradient colors={['#eff6ff', '#ffffff']} style={[styles.quickStatCard, styles.totalTint]}>
                <Text style={styles.statIcon}>📚</Text>
                <Text style={styles.quickStatValue}>{dashboardData.totalClasses}</Text>
                <Text style={styles.quickStatLabel}>Total</Text>
              </LinearGradient>
            </View>

            <Card style={styles.attendanceCard}>
              <Text style={styles.sectionKicker}>Overall attendance</Text>
              <View style={styles.attendanceRow}>
                <Text style={[styles.attendanceValue, { color: attendanceColor }]}>{dashboardData.attendancePercentage}%</Text>
                <Text style={styles.attendanceHint}>{dashboardData.presentCount}/{dashboardData.totalClasses} classes</Text>
              </View>
              <ProgressBar value={dashboardData.attendancePercentage} />
              <Text style={styles.minRequired}>Minimum required: 75%</Text>
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

            <AppButton
              label="Start Attendance Scan"
              onPress={() => navigation.navigate(ROUTES.SCAN)}
              style={styles.scanButton}
            />

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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
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
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
