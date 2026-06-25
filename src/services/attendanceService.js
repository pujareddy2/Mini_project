import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BASE_URL } from '../config';

async function safeJson(response) {
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  throw new Error(text || `Server error ${response.status}`);
}

export const uploadMedia = async (photoUri, mediaType = 'photo') => {
  try {
    if (!photoUri || photoUri === 'no_photo') return 'no_photo';

    const token = await AsyncStorage.getItem('token');

    const formData = new FormData();
    const isVideo = mediaType === 'video' || photoUri.endsWith('.mp4') || photoUri.endsWith('.mov');
    
    if (Platform.OS === 'web') {
      const res = await fetch(photoUri);
      const blob = await res.blob();
      formData.append('photo', blob, isVideo ? 'attendance_video.mp4' : 'attendance_photo.jpg');
    } else {
      formData.append('photo', {
        uri: photoUri,
        type: isVideo ? 'video/mp4' : 'image/jpeg',
        name: isVideo ? 'attendance_video.mp4' : 'attendance_photo.jpg'
      });
    }

    const response = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await safeJson(response);

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

    const data = await safeJson(response);

    if (!response.ok) {
      throw new Error(data.detail || 'Attendance submission failed');
    }

    return data;
  } catch (error) {
    throw new Error('Submit failed: ' + error.message);
  }
};
