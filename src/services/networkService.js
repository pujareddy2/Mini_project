import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Network from 'expo-network';

const ALLOWED_WIFI = {
  ssid: 'Campus_WiFi',
  bssid: 'AA:BB:CC:DD',
};

function normalizeType(type) {
  if (type === Network.NetworkStateType.WIFI) {
    return 'wifi';
  }

  if (type === Network.NetworkStateType.CELLULAR) {
    return 'cellular';
  }

  return 'unknown';
}

async function getNetworkDetails() {
  try {
    if (Platform.OS === 'web') {
      return {
        isConnected: true,
        type: 'wifi',
        ssid: 'WEB_SIMULATED',
        bssid: null,
      };
    }

    const state = await Network.getNetworkStateAsync();
    const details = state.details || {};

    const result = {
      isConnected: state.isConnected === true,
      type: normalizeType(state.type),
      ssid: typeof details.ssid === 'string' ? details.ssid : null,
      bssid: typeof details.bssid === 'string' ? details.bssid : null,
    };

    if (Platform.OS === 'android') {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        return {
          ...result,
          permissionDenied: true,
        };
      }

      return result;
    }

    if (Platform.OS === 'ios') {
      return {
        ...result,
        ssid: null,
        bssid: null,
        limitedAccess: true,
      };
    }

    return result;
  } catch (error) {
    return {
      isConnected: false,
      type: 'unknown',
      ssid: null,
      bssid: null,
      error: error.message,
    };
  }
}

function validateWiFiNetwork(networkData) {
  if (Platform.OS === 'web') {
    return {
      isValid: true,
      status: 'passed',
      ssid: networkData.ssid || 'WEB_SIMULATED',
      bssid: networkData.bssid || null,
      reason: 'Web simulated WiFi accepted for testing',
    };
  }

  if (!networkData.isConnected) {
    return {
      isValid: false,
      status: 'failed',
      ssid: networkData.ssid,
      bssid: networkData.bssid,
      reason: 'No internet connection',
    };
  }

  if (networkData.type !== 'wifi') {
    return {
      isValid: false,
      status: 'failed',
      ssid: networkData.ssid,
      bssid: networkData.bssid,
      reason: 'Not connected to WiFi network',
    };
  }

  if (networkData.permissionDenied) {
    return {
      isValid: false,
      status: 'failed',
      ssid: networkData.ssid,
      bssid: networkData.bssid,
      reason: 'Location permission required for WiFi validation',
    };
  }

  if (networkData.ssid !== ALLOWED_WIFI.ssid) {
    return {
      isValid: false,
      status: 'failed',
      ssid: networkData.ssid,
      bssid: networkData.bssid,
      reason: 'Not connected to campus network',
    };
  }

  if (networkData.bssid && networkData.bssid !== ALLOWED_WIFI.bssid) {
    return {
      isValid: false,
      status: 'failed',
      ssid: networkData.ssid,
      bssid: networkData.bssid,
      reason: 'WiFi access point mismatch',
    };
  }

  if (!networkData.bssid && Platform.OS === 'ios') {
    return {
      isValid: true,
      status: 'limited',
      ssid: networkData.ssid,
      bssid: null,
      reason: 'SSID verified, BSSID unavailable on iOS',
    };
  }

  if (!networkData.bssid) {
    return {
      isValid: true,
      status: 'limited',
      ssid: networkData.ssid,
      bssid: null,
      reason: 'SSID verified, BSSID unavailable',
    };
  }

  return {
    isValid: true,
    status: 'passed',
    ssid: networkData.ssid,
    bssid: networkData.bssid,
    reason: 'WiFi SSID and BSSID verified',
  };
}

async function postWiFiValidation(payload) {
  try {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    return {
      endpoint: '/verify-wifi',
      ok: true,
      valid: true,
      message: 'WiFi verification request accepted',
      payload: {
        studentId: payload.studentId,
        ssid: payload.ssid,
        bssid: payload.bssid,
        deviceTime: payload.deviceTime,
      },
    };
  } catch (error) {
    return {
      endpoint: '/verify-wifi',
      ok: false,
      valid: false,
      message: `WiFi verification request failed: ${error.message}`,
      payload,
    };
  }
}

export {
  ALLOWED_WIFI,
  getNetworkDetails,
  postWiFiValidation,
  validateWiFiNetwork,
};
