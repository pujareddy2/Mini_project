import AsyncStorage from '@react-native-async-storage/async-storage';
import STORAGE_KEYS from '../utils/storageKeys';

function wait(timeout) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}

async function loginUser(email, password, deviceInfo) {
  await wait(900);

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const registeredStudentRaw = await AsyncStorage.getItem(STORAGE_KEYS.REGISTERED_STUDENT);
  const registeredStudent = registeredStudentRaw ? JSON.parse(registeredStudentRaw) : null;

  if (
    registeredStudent
    && normalizedEmail === registeredStudent.email.trim().toLowerCase()
    && normalizedPassword === registeredStudent.password.trim()
  ) {
    return {
      userID: registeredStudent.rollNumber || 'registered-user',
      token: 'mock-jwt-token',
      deviceStatus: 'approved',
      deviceInfo,
    };
  }

  if (normalizedEmail === 'student@test.com' && normalizedPassword === '1234') {
    return {
      userID: '123',
      token: 'mock-jwt-token',
      deviceStatus: 'approved',
      deviceInfo,
    };
  }

  throw new Error('Invalid credentials');
}

export { loginUser };
