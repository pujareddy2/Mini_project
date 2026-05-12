import * as Location from 'expo-location';

export const captureGPS = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('GPS permission denied. Please enable location access.');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    };
  } catch (error) {
    throw new Error('GPS capture failed: ' + error.message);
  }
};
