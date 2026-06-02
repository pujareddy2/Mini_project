import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: studentProfile.name,
        email: studentProfile.email,
        password: studentProfile.password,
        role: 'student',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const loginUser = loginStudent;