import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchAlerts,
  getPushToken,
  markAlertAsRead,
  registerDeviceToken,
  sendNotification,
} from '../services/alertService';

const AlertsContext = createContext({
  alerts: [],
  unreadCount: 0,
  loading: false,
  permissionDenied: false,
  pushToken: null,
  inAppToast: null,
  refreshAlerts: async () => {},
  markAsRead: async () => {},
  dismissInAppToast: () => {},
});

function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [inAppToast, setInAppToast] = useState(null);
  const knownAlertIdsRef = useRef(new Set());
  const toastTimeoutRef = useRef(null);

  const refreshAlerts = useCallback(async (notifyOnNew = true) => {
    setLoading(true);

    try {
      const response = await fetchAlerts();
      const nextAlerts = Array.isArray(response) ? response : (response && response.status === 'success' ? response.data : []);

      if (notifyOnNew) {
        for (const alert of nextAlerts) {
          if (!knownAlertIdsRef.current.has(alert.id)) {
            knownAlertIdsRef.current.add(alert.id);
            await sendNotification(alert);
            setInAppToast({
              id: alert.id,
              title: alert.title,
              message: alert.message,
            });

            if (toastTimeoutRef.current) {
              clearTimeout(toastTimeoutRef.current);
            }

            toastTimeoutRef.current = setTimeout(() => {
              setInAppToast(null);
            }, 3500);
          }
        }
      } else {
        for (const alert of nextAlerts) {
          knownAlertIdsRef.current.add(alert.id);
        }
      }

      setAlerts(nextAlerts);
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissInAppToast = useCallback(() => {
    setInAppToast(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  const markAsRead = useCallback(async (alertId) => {
    setAlerts((prev) => prev.map((item) => (String(item.id) === String(alertId) ? { ...item, read: true } : item)));
    await markAlertAsRead(alertId);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function setupNotifications() {
      const tokenResponse = await getPushToken();
      if (!mounted) {
        return;
      }

      if (!tokenResponse.granted) {
        setPermissionDenied(true);
        return;
      }

      setPushToken(tokenResponse.token);
      if (tokenResponse.token) {
        await registerDeviceToken({ pushToken: tokenResponse.token, platform: 'expo' });
      }
    }

    setupNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    refreshAlerts(false);

    const intervalId = setInterval(() => {
      refreshAlerts(true);
    }, 12000);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshAlerts]);

  useEffect(() => () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  }, []);

  const unreadCount = useMemo(() => alerts.filter((item) => !item.read).length, [alerts]);

  const contextValue = useMemo(() => ({
    alerts,
    unreadCount,
    loading,
    permissionDenied,
    pushToken,
    inAppToast,
    refreshAlerts,
    markAsRead,
    dismissInAppToast,
  }), [alerts, dismissInAppToast, inAppToast, loading, markAsRead, permissionDenied, pushToken, refreshAlerts, unreadCount]);

  return <AlertsContext.Provider value={contextValue}>{children}</AlertsContext.Provider>;
}

export { AlertsContext, AlertsProvider };
