import * as Location from 'expo-location';
import {
  getNetworkDetails,
  postWiFiValidation,
  validateWiFiNetwork,
} from './networkService';

const CAMPUS_COORDS = {
  lat: 17.3850,
  lng: 78.4867,
};

const CAMPUS_RADIUS_METERS = 200;
function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

async function getLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    const error = new Error('Location permission is required.');
    error.code = 'location_permission_denied';
    throw error;
  }

  const gpsEnabled = await Location.hasServicesEnabledAsync();
  if (!gpsEnabled) {
    const error = new Error('Please enable GPS/location services.');
    error.code = 'gps_off';
    throw error;
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

function checkLocationInsideCampus(location) {
  if (!location?.latitude || !location?.longitude) {
    return {
      valid: false,
      distance: Number.MAX_SAFE_INTEGER,
    };
  }

  const distance = distanceInMeters(
    location.latitude,
    location.longitude,
    CAMPUS_COORDS.lat,
    CAMPUS_COORDS.lng,
  );

  return {
    valid: distance <= CAMPUS_RADIUS_METERS,
    distance,
  };
}

async function getNetworkInfo() {
  const networkData = await getNetworkDetails();
  const wifiValidation = validateWiFiNetwork(networkData);

  const wifiPayload = {
    studentId: '12345',
    ssid: networkData.ssid,
    bssid: networkData.bssid,
    deviceTime: new Date().toISOString(),
  };

  const backendResponse = await postWiFiValidation(wifiPayload);

  return {
    valid: wifiValidation.isValid,
    networkAvailable: networkData.isConnected,
    networkType: networkData.type,
    ssid: networkData.ssid,
    bssid: networkData.bssid,
    wifi: {
      status: wifiValidation.status,
      ssid: networkData.ssid,
      bssid: networkData.bssid,
      reason: wifiValidation.reason,
    },
    backend: backendResponse,
  };
}

async function capturePhoto(media, metadata = {}) {
  if (metadata.cancelled) {
    const error = new Error('Photo capture cancelled by user.');
    error.code = 'camera_failed';
    throw error;
  }

  if (!media?.uri) {
    const error = new Error('No image captured');
    error.code = 'camera_failed';
    throw error;
  }

  return {
    imageUri: media.uri,
    uri: media.uri,
    type: media.type || 'photo',
    timestamp: media.timestamp || Date.now(),
    captured: true,
  };
}

async function postValidateAttendance(payload) {
  // Mock backend integration for POST /validate-attendance
  await wait(900);

  return {
    endpoint: '/validate-attendance',
    ok: true,
    payload,
  };
}

function validateAll({
  qrValid = true,
  locationValid,
  wifiValid,
  photoCaptured,
  wifiStatus = 'failed',
  wifiSSID = null,
  wifiBSSID = null,
  wifiReason = 'WiFi validation failed',
  cameraCaptured = false,
  cameraType = null,
  cameraTimestamp = null,
  cameraUri = null,
}) {
  const qr = {
    status: qrValid ? 'passed' : 'failed',
  };

  const location = {
    status: Boolean(locationValid) ? 'passed' : 'failed',
  };

  const details = {
    location: Boolean(locationValid),
    wifi: Boolean(wifiValid),
    photo: Boolean(photoCaptured),
  };

  let confidence = 0;

  if (details.location) {
    confidence += 40;
  }
  if (details.wifi) {
    confidence += 30;
  }
  if (details.photo) {
    confidence += 30;
  }

  let reason = null;
  if (!qrValid) {
    reason = 'qr_invalid';
  } else if (!details.location) {
    reason = 'location_outside';
  } else if (!details.wifi) {
    reason = 'wifi_invalid';
  } else if (!details.photo) {
    reason = 'camera_failed';
  }

  const wifi = {
    status: details.wifi ? wifiStatus : 'failed',
    ssid: wifiSSID,
    bssid: wifiBSSID,
    reason: details.wifi ? wifiReason : wifiReason || 'WiFi validation failed',
  };

  const photo = {
    status: details.photo ? 'passed' : 'failed',
  };

  const camera = {
    status: details.photo && cameraCaptured ? 'captured' : 'failed',
    type: cameraType,
    timestamp: cameraTimestamp,
    uri: cameraUri,
    reason: details.photo ? null : 'No image captured',
  };

  const overallStatus = qrValid && details.location && details.wifi && details.photo ? 'success' : 'failed';

  return {
    status: overallStatus,
    reason,
    confidence,
    details,
    qr,
    location,
    wifi,
    photo,
    camera,
    overallStatus,
    validationResult: {
      qr,
      location,
      wifi,
      camera,
      overallStatus,
    },
  };
}

export {
  capturePhoto,
  checkLocationInsideCampus,
  getLocation,
  getNetworkInfo,
  postValidateAttendance,
  validateAll,
};
