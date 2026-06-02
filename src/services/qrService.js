import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const verifyQR = async (qrData) => {
  try {
    const token = await AsyncStorage.getItem('token');

    let payload;
    try {
      // If the QR code contains JSON string like {"qr_token": "...", "session_id": 1}
      payload = JSON.parse(qrData);
    } catch {
      // Fallback if it's just the raw token string
      payload = { qr_token: qrData };
    }

    const response = await fetch(`${BASE_URL}/session/validate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'QR validation failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'QR validation failed');
  }
};