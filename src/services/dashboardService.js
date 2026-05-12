import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

async function getDashboardData() {
  try {
    const token = await AsyncStorage.getItem('token');
    const user_id = await AsyncStorage.getItem('user_id');

    const response = await fetch(`${BASE_URL}/dashboard/student/${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = 'Failed to fetch dashboard data';
      if (data.detail) {
        errorMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data.message) {
        errorMsg = data.message;
      }
      throw new Error(`[${response.status}] ${errorMsg}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

async function getDetailedAnalytics() {
  try {
    const token = await AsyncStorage.getItem('token');
    const user_id = await AsyncStorage.getItem('user_id');

    const response = await fetch(`${BASE_URL}/analytics/student/${user_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch analytics data');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export { getDashboardData, getDetailedAnalytics };
