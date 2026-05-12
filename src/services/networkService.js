import * as Network from 'expo-network';
import { Platform } from 'react-native';

export const captureWiFi = async () => {
  try {
    if (Platform.OS === 'web') {
      return { ssid: null, bssid: null };
    }

    const networkState = await Network.getNetworkStateAsync();

    if (
      networkState.type !== Network.NetworkStateType.WIFI &&
      networkState.type !== 'WIFI'
    ) {
      return { ssid: null, bssid: null };
    }

    return {
      ssid: networkState.ssid || null,
      bssid: networkState.bssid || null
    };
  } catch (error) {
    return { ssid: null, bssid: null };
  }
};
