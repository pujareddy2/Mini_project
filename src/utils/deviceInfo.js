import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import STORAGE_KEYS from './storageKeys';

function generateCustomId() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${Platform.OS}-${Date.now()}-${randomPart}`;
}

async function getOrCreateUniqueId() {
  try {
    const androidId = Application.getAndroidId();
    if (androidId) {
      return androidId;
    }
  } catch {
    // Non-Android platforms will use stored/generated fallback ID.
  }

  const storedId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_UNIQUE_ID);
  if (storedId) {
    return storedId;
  }

  const newId = generateCustomId();
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_UNIQUE_ID, newId);
  return newId;
}

async function getDeviceInfo() {
  const uniqueId = await getOrCreateUniqueId();

  return {
    deviceName: Device.modelName || 'Unknown Device',
    modelName: Device.modelName || 'Unknown Device',
    osName: Device.osName || 'Unknown OS',
    osVersion: Device.osVersion || 'Unknown OS Version',
    brand: Device.brand || 'Unknown Brand',
    deviceId: uniqueId,
    uniqueId,
  };
}

export default getDeviceInfo;
