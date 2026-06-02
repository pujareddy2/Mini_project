import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BASE_URL } from '../config';

export const uploadMedia = async (photoUri) => {
  try {
    if (!photoUri || photoUri === 'no_photo') return 'no_photo';

    const token = await AsyncStorage.getItem('token');

    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const res = await fetch(photoUri);
      const blob = await res.blob();
      formData.append('photo', blob, 'attendance_photo.jpg');
    } else {
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'attendance_photo.jpg'
      });
    }

    const response = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Media upload failed');
    }

    return data.media_url;
  } catch (error) {
    throw new Error('Upload failed: ' + error.message);
  }
};

export const submitAttendance = async (payload) => {
  try {
    const token = await AsyncStorage.getItem('token');

    const response = await fetch(`${BASE_URL}/attendance/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Attendance submission failed');
    }

    return data;
  } catch (error) {
    throw new Error('Submit failed: ' + error.message);
  }
};
