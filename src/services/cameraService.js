import { Camera } from 'expo-camera';

async function requestCameraPermission() {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();

    return {
      granted: status === 'granted',
    };
  } catch {
    return {
      granted: false,
    };
  }
}

async function capturePhoto(cameraRef) {
  if (!cameraRef?.current) {
    const error = new Error('Camera preview is not ready.');
    error.code = 'camera_not_ready';
    throw error;
  }

  const photo = await cameraRef.current.takePictureAsync({
    quality: 0.6,
    skipProcessing: true,
  });

  if (!photo?.uri) {
    const error = new Error('No image captured');
    error.code = 'camera_failed';
    throw error;
  }

  return {
    uri: photo.uri,
    type: 'photo',
    timestamp: Date.now(),
  };
}

async function recordVideo(cameraRef) {
  if (!cameraRef?.current) {
    const error = new Error('Camera preview is not ready.');
    error.code = 'camera_not_ready';
    throw error;
  }

  const video = await cameraRef.current.recordAsync({
    maxDuration: 3,
    quality: '480p',
  });

  if (!video?.uri) {
    const error = new Error('No video captured');
    error.code = 'camera_failed';
    throw error;
  }

  return {
    uri: video.uri,
    type: 'video',
    timestamp: Date.now(),
  };
}

export {
  capturePhoto,
  recordVideo,
  requestCameraPermission,
};
