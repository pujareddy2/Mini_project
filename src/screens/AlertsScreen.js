import { useContext } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppHeader from '../components/AppHeader';
import Card from '../components/Card';
import ScreenLayout from '../components/ScreenLayout';
import { AlertsContext } from '../context/AlertsContext';
import { SPACING } from '../theme';

function formatTime(timestamp) {
  if (!timestamp) {
    return 'Time unavailable';
  }

  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function typeMeta(type) {
  if (type === 'warning') {
    return { icon: '⚠', color: '#F59E0B', bg: '#fffbeb' };
  }

  if (type === 'error') {
    return { icon: '❌', color: '#EF4444', bg: '#fff1f2' };
  }

  if (type === 'success') {
    return { icon: '✔', color: '#22C55E', bg: '#f0fdf4' };
  }

  return { icon: '🔔', color: '#3b82f6', bg: '#eff6ff' };
}

function AlertsScreen({ navigation }) {
  const {
    alerts,
    unreadCount,
    loading,
    permissionDenied,
    refreshAlerts,
    markAsRead,
  } = useContext(AlertsContext);

  async function handleOpenAlert(alert) {
    if (!alert.read) {
      await markAsRead(alert.id);
    }
  }

  return (
    <ScreenLayout contentStyle={styles.contentStyle}>
      <AppHeader title="Notifications" subtitle={unreadCount ? `${unreadCount} unread alerts` : 'All caught up'} showBack onBackPress={() => navigation.goBack()} />

      {permissionDenied ? (
        <Card style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Notifications disabled</Text>
          <Text style={styles.permissionText}>Device notification permission is denied. In-app alerts still work.</Text>
        </Card>
      ) : null}

      {alerts.length === 0 && !loading ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyText}>You are all clear. New attendance alerts will appear here.</Text>
        </Card>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => refreshAlerts(false)} />}
        >
          <View style={styles.alertList}>
            {alerts.map((alert) => {
              const meta = typeMeta(alert.type);

              return (
                <Card key={alert.id} style={[styles.alertCard, { backgroundColor: meta.bg, opacity: alert.read ? 0.72 : 1 }]}>
                  <View style={styles.alertHeader}>
                    <Text style={[styles.alertIcon, { color: meta.color }]}>{meta.icon}</Text>
                    <View style={styles.alertCopy}>
                      <Text style={styles.alertTitle}>{alert.title}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTimestamp}>{formatTime(alert.timestamp)}</Text>
                    </View>
                    {!alert.read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.markRead} onPress={() => handleOpenAlert(alert)}>
                    {alert.read ? 'Read' : 'Mark as read'}
                  </Text>
                </Card>
              );
            })}
          </View>
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentStyle: {
    gap: SPACING.section,
    paddingBottom: SPACING.lg,
  },
  alertList: {
    gap: 12,
    paddingBottom: 8,
  },
  alertCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
  },
  alertHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  alertIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  alertCopy: {
    flex: 1,
  },
  alertTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  alertMessage: {
    color: '#475569',
    fontSize: 13,
    marginTop: 2,
  },
  alertTimestamp: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
  },
  unreadDot: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    height: 10,
    marginTop: 8,
    width: 10,
  },
  markRead: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 22,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  permissionCard: {
    backgroundColor: '#fff7ed',
    gap: 5,
  },
  permissionTitle: {
    color: '#b45309',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionText: {
    color: '#92400e',
    fontSize: 12,
  },
});

export default AlertsScreen;
