import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import getDeviceInfo from '../utils/deviceInfo';
import STORAGE_KEYS from '../utils/storageKeys';

function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

function normalizeOsName(osName) {
  return osName || Device.osName || 'Unknown OS';
}

async function buildDeviceInfo() {
  const storedDeviceInfo = await getDeviceInfo();
  const model = Device.modelName || storedDeviceInfo.modelName || storedDeviceInfo.deviceName || 'Unknown Device';
  const osName = normalizeOsName(Device.osName);
  const osVersion = Device.osVersion || storedDeviceInfo.osVersion || 'Unknown OS Version';
  const deviceId = storedDeviceInfo.deviceId || storedDeviceInfo.uniqueId || `${model}-${Date.now()}`;

  return {
    model,
    os: osName,
    version: osVersion,
    deviceId,
  };
}

function buildFileUrl(media) {
  const extension = media?.type === 'video' ? 'mp4' : 'jpg';
  const mediaId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `https://media.verimark.local/${mediaId}.${extension}`;
}

async function uploadMedia(media) {
  if (!media?.uri) {
    return {
      status: 'failed',
      data: null,
      message: 'Invalid media payload',
    };
  }

  await wait(900);

  const fileUrl = buildFileUrl(media);

  return {
    status: 'success',
    data: {
      fileUrl,
      type: media.type || 'photo',
      originalUri: media.uri,
      uploadedAt: Date.now(),
    },
    message: 'Media uploaded successfully',
  };
}

async function getNetworkStatus() {
  try {
    const state = await Network.getNetworkStateAsync();
    return {
      isConnected: state.isConnected === true,
      type: state.type,
    };
  } catch {
    return {
      isConnected: true,
      type: 'unknown',
    };
  }
}

async function getQueuedAttendanceSubmissions() {
  const storedQueue = await AsyncStorage.getItem(STORAGE_KEYS.ATTENDANCE_QUEUE);
  if (!storedQueue) {
    return [];
  }

  try {
    const parsedQueue = JSON.parse(storedQueue);
    return Array.isArray(parsedQueue) ? parsedQueue : [];
  } catch {
    return [];
  }
}

async function queueAttendanceSubmission(payload) {
  const queue = await getQueuedAttendanceSubmissions();
  const requestId = payload.requestId || `${payload.device?.deviceId || 'device'}-${payload.timestamp}`;
  const nextQueue = [
    ...queue.filter((item) => item.requestId !== requestId),
    {
      ...payload,
      requestId,
      queuedAt: Date.now(),
    },
  ];

  await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_QUEUE, JSON.stringify(nextQueue));
  await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_LAST_REQUEST, requestId);
}

async function clearQueuedAttendanceSubmission(requestId) {
  const queue = await getQueuedAttendanceSubmissions();
  const nextQueue = queue.filter((item) => item.requestId !== requestId);
  await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE_QUEUE, JSON.stringify(nextQueue));
}

async function performAttendanceRequest(payload, authToken) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const endpoint = baseUrl ? `${baseUrl.replace(/\/$/, '')}/mark-attendance` : null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    if (!endpoint) {
      await wait(900);
      const confidence = payload.wifi?.ssid ? 93 : 74;
      const status = !payload.location?.latitude || !payload.location?.longitude
        ? 'rejected'
        : confidence < 80
          ? 'suspicious'
          : 'success';
      const mockData = {
        status,
        confidence,
        flags: {
          location: Boolean(payload.location?.latitude && payload.location?.longitude),
          wifi: Boolean(payload.wifi?.ssid),
          media: Boolean(payload.media?.fileUrl),
        },
        attendanceId: `ATT-${Date.now()}`,
        message: status === 'success'
          ? 'Attendance marked successfully'
          : status === 'suspicious'
            ? 'Attendance marked under review due to weak network context.'
            : 'Attendance rejected due to validation mismatch.',
      };

      if (__DEV__) {
        console.log('ATTENDANCE PAYLOAD:', payload);
        console.log('ATTENDANCE RESPONSE:', mockData);
      }

      return {
        ok: true,
        data: mockData,
      };
    }

    if (__DEV__) {
      console.log('ATTENDANCE PAYLOAD:', payload);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (__DEV__) {
      console.log('ATTENDANCE RESPONSE:', data);
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function submitAttendance(payload) {
  const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  if (!authToken) {
    return {
      status: 'failed',
      data: null,
      code: 'auth_missing',
      message: 'Authorization token missing',
    };
  }

  if (!payload?.qrToken || !payload?.location || !payload?.wifi || !payload?.media?.fileUrl || !payload?.device) {
    return {
      status: 'failed',
      data: null,
      code: 'invalid_payload',
      message: 'Invalid attendance payload',
    };
  }

  const networkStatus = await getNetworkStatus();
  const requestId = payload.requestId || `${payload.device.deviceId}-${payload.timestamp}`;
  const normalizedPayload = {
    ...payload,
    requestId,
    device: {
      ...payload.device,
      deviceId: payload.device.deviceId || requestId,
    },
  };

  if (!networkStatus.isConnected) {
    await queueAttendanceSubmission(normalizedPayload);
    return {
      status: 'failed',
      data: null,
      code: 'offline',
      message: 'No internet connection. Attendance saved for retry.',
    };
  }

  let lastResponse = null;
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      lastResponse = await performAttendanceRequest(normalizedPayload, authToken);

      const backendStatus = lastResponse.data?.status;
      if (lastResponse.ok && (backendStatus === 'success' || backendStatus === 'suspicious' || backendStatus === 'rejected')) {
        await clearQueuedAttendanceSubmission(requestId);
        return {
          status: backendStatus,
          confidence: Number(lastResponse.data.confidence || 0),
          flags: {
            location: Boolean(lastResponse.data?.flags?.location),
            wifi: Boolean(lastResponse.data?.flags?.wifi),
            media: Boolean(lastResponse.data?.flags?.media),
          },
          attendanceId: lastResponse.data.attendanceId || null,
          data: lastResponse.data,
          message: lastResponse.data.message || 'Attendance processed successfully',
          payload: normalizedPayload,
        };
      }

      lastError = new Error(lastResponse.data?.message || lastResponse.data?.reason || `Server error (${lastResponse.status || 'unknown'})`);
    } catch (error) {
      lastError = error;
      if (error.name !== 'AbortError' && attempt === 0) {
        continue;
      }
    }
  }

  await queueAttendanceSubmission(normalizedPayload);

  return {
    status: 'failed',
    data: lastResponse?.data || null,
    code: lastError?.name === 'AbortError' ? 'timeout' : 'server_error',
    message: lastError?.name === 'AbortError'
      ? 'Attendance submission timed out'
      : lastError?.message || 'Attendance submission failed',
    payload: normalizedPayload,
  };
}

export {
  buildDeviceInfo,
  submitAttendance,
  uploadMedia,
};
