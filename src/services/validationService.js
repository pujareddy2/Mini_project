import * as Location from 'expo-location';

export const captureGPS = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('GPS permission denied. Please enable location access.');
    }

    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // 10-second timeout to prevent hanging forever on some Android devices
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 10000));

    const result = await Promise.race([locationPromise, timeoutPromise]);

    if (result === 'timeout') {
      // Fallback to last known position if current position takes too long
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        return {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
          accuracy: lastKnown.coords.accuracy || 50.0
        };
      }
      return { latitude: 0.0, longitude: 0.0, accuracy: 100.0 };
    }

    return {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracy: result.coords.accuracy || 20.0
    };
  } catch (error) {
    return { latitude: 0.0, longitude: 0.0, accuracy: 100.0 };
  }
};
