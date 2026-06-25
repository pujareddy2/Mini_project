import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const verifyQR = async (qrData) => {
  try {
    const token = await AsyncStorage.getItem('token');

    let payload;
    try {
      payload = JSON.parse(qrData);
    } catch {
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

    const ct = response.headers.get('content-type') || '';
    const data = ct.includes('application/json')
      ? await response.json()
      : await response.text().then(t => { throw new Error(t || `Server error ${response.status}`); });

    if (!response.ok) {
      throw new Error(data.detail || 'QR validation failed');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'QR validation failed');
  }
};