import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

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
  try {
    const token = await AsyncStorage.getItem('token');
    
    if (!payload?.pushToken) {
      return { ok: true, message: 'No push token to register' };
    }

    const response = await fetch(`${BASE_URL}/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
  try {
    const token = await AsyncStorage.getItem('token');
    const user_id = await AsyncStorage.getItem('user_id');

    if (!token || !user_id) {
      return [];
    }

    const response = await fetch(`${BASE_URL}/alerts/student/${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeAlert) : [];
  } catch (error) {
    return [];
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
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await fetch(`${BASE_URL}/alerts/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
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
