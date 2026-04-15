import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

function buildBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  return baseUrl ? baseUrl.replace(/\/$/, '') : null;
}

function normalizeAlert(alert) {
  return {
    id: String(alert.id),
    type: alert.type || 'info',
    title: alert.title || 'Notification',
    message: alert.message || 'New alert',
    timestamp: alert.timestamp || new Date().toISOString(),
    read: Boolean(alert.read),
  };
}

function mockAlerts() {
  const now = Date.now();

  return [
    {
      id: 'mock-1',
      type: 'warning',
      title: 'Low Attendance',
      message: 'Your attendance dropped below 75%.',
      timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
      read: false,
    },
    {
      id: 'mock-2',
      type: 'error',
      title: 'Suspicious Behavior Detected',
      message: 'Verification was marked under review for your last scan.',
      timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
      read: false,
    },
  ];
}

async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  return {
    granted: status === 'granted',
    status,
  };
}

async function getPushToken() {
  const isExpoGo = Constants.appOwnership === 'expo';

  if (isExpoGo || !Device.isDevice) {
    return {
      token: null,
      granted: true,
      message: 'Running in Expo Go/emulator. Using local notifications only.',
    };
  }

  const permission = await requestNotificationPermission();
  if (!permission.granted) {
    return {
      token: null,
      granted: false,
      message: 'Notification permission denied',
    };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    return {
      token: tokenResponse.data,
      granted: true,
      message: 'Push token generated',
    };
  } catch (error) {
    return {
      token: null,
      granted: true,
      message: error.message || 'Unable to generate push token',
    };
  }
}

async function registerDeviceToken(payload) {
  const baseUrl = buildBaseUrl();
  if (!baseUrl || !payload?.pushToken) {
    return {
      ok: true,
      message: 'Mock device registration complete',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Device registration failed (${response.status})`,
      };
    }

    return {
      ok: true,
      message: 'Device registered for notifications',
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message || 'Device registration failed',
    };
  }
}

async function fetchAlerts() {
  const baseUrl = buildBaseUrl();

  if (!baseUrl) {
    return {
      status: 'success',
      data: mockAlerts().map(normalizeAlert),
      message: 'Mock alerts loaded',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/alerts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        status: 'failed',
        data: [],
        message: `Unable to fetch alerts (${response.status})`,
      };
    }

    const data = await response.json();
    const alerts = Array.isArray(data) ? data.map(normalizeAlert) : [];

    return {
      status: 'success',
      data: alerts,
      message: 'Alerts fetched',
    };
  } catch (error) {
    return {
      status: 'failed',
      data: [],
      message: error.message || 'Unable to fetch alerts',
    };
  }
}

async function sendNotification(alert) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.message,
      sound: true,
    },
    trigger: null,
  });
}

async function markAlertAsRead(alertId) {
  const baseUrl = buildBaseUrl();

  if (!baseUrl) {
    return {
      ok: true,
      message: 'Mock read status updated',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/alerts/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: alertId }),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Unable to update read status (${response.status})`,
      };
    }

    return {
      ok: true,
      message: 'Alert marked as read',
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message || 'Unable to update read status',
    };
  }
}

export {
  fetchAlerts,
  getPushToken,
  markAlertAsRead,
  registerDeviceToken,
  requestNotificationPermission,
  sendNotification,
};
