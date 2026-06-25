import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BASE_URL } from '../config';

export const loginStudent = async (email, password, deviceInfo) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/student/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        ...(deviceInfo && deviceInfo.deviceId ? { device_id: deviceInfo.deviceId } : {})
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    if (data.token) {
      await AsyncStorage.setItem('token', String(data.token));
    }
    if (data.role) {
      await AsyncStorage.setItem('role', String(data.role));
    }
    if (data.student_id) {
      await AsyncStorage.setItem('user_id', String(data.student_id));
    }
    if (data.name) {
      await AsyncStorage.setItem('name', String(data.name));
    }
    if (deviceInfo && deviceInfo.deviceId) {
      await AsyncStorage.setItem('device_id', String(deviceInfo.deviceId));
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

export const registerStudent = async (studentProfile) => {
  try {
    const formData = new FormData();
    formData.append('name', studentProfile.name);
    formData.append('email', studentProfile.email);
    formData.append('password', studentProfile.password);
    formData.append('role', studentProfile.role || 'student');

    // Device, WiFi, GPS captured at registration time
    if (studentProfile.deviceId) formData.append('device_id', String(studentProfile.deviceId));
    if (studentProfile.wifiSsid) formData.append('wifi_ssid', String(studentProfile.wifiSsid));
    if (studentProfile.wifiBssid) formData.append('wifi_bssid', String(studentProfile.wifiBssid));
    if (studentProfile.gpsLat != null) formData.append('gps_lat', String(studentProfile.gpsLat));
    if (studentProfile.gpsLon != null) formData.append('gps_lon', String(studentProfile.gpsLon));

    if (studentProfile.profilePhotoUri) {
      const uri = studentProfile.profilePhotoUri;
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('profile_photo', blob, 'profile.jpg');
      } else {
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('profile_photo', { uri, name: filename, type });
      }
    }

    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData,
    });

    const ct = response.headers.get('content-type') || '';
    const data = ct.includes('application/json')
      ? await response.json()
      : await response.text().then(t => { throw new Error(t || `Server error ${response.status}`); });

    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const loginUser = loginStudent;