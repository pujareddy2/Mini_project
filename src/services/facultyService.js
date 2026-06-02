import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config';

export const getFacultyStudents = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const user_id = await AsyncStorage.getItem('user_id');

    const response = await fetch(`${BASE_URL}/faculty/${user_id}/students`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch faculty students');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch faculty students');
  }
};

export const registerStudentToFaculty = async (studentId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const user_id = await AsyncStorage.getItem('user_id');

    const response = await fetch(`${BASE_URL}/faculty/${user_id}/students`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ student_id: studentId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to register student');
    }

    return data;
  } catch (error) {
    throw new Error(error.message || 'Failed to register student');
  }
};
