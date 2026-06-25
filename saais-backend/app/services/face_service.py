import os
import logging
from deepface import DeepFace

logger = logging.getLogger(__name__)

import cv2

def get_image_path(media_path: str) -> str:
    """If media_path is a video, extracts the first frame and saves it as a temp image, returning its path."""
    if media_path.lower().endswith(('.mp4', '.mov', '.avi', '.mkv', '.3gp')):
        temp_img_path = media_path + "_frame.jpg"
        if os.path.exists(temp_img_path):
            return temp_img_path
        try:
            cap = cv2.VideoCapture(media_path)
            ret, frame = cap.read()
            cap.release()
            if ret:
                cv2.imwrite(temp_img_path, frame)
                return temp_img_path
        except Exception as e:
            logger.error(f"Failed to extract frame from video: {e}")
    return media_path

def verify_face(profile_photo_path: str, attendance_photo_path: str) -> tuple[bool, float]:
    """
    Verifies if the face in attendance_photo_path matches the face in profile_photo_path.
    Returns (is_match, distance)
    """
    img1 = get_image_path(profile_photo_path)
    img2 = get_image_path(attendance_photo_path)
    
    if not os.path.exists(img1) or not os.path.exists(img2):
        logger.warning("One or both images do not exist.")
        return False, 0.0

    try:
        # We use Facenet for better facial measurements/embeddings in bad light.
        # retinaface is a highly robust detector for varying lighting conditions.
        # align=True aligns faces based on eye positions as requested.
        # enforce_detection=False prevents throwing an exception if no face is found in one of the images.
        result = DeepFace.verify(
            img1_path=img1,
            img2_path=img2,
            enforce_detection=False,
            model_name="Facenet",
            detector_backend="opencv",
            align=False
        )
        is_match = result.get("verified", False)
        distance = result.get("distance", 0.0)
        return is_match, distance
    except Exception as e:
        logger.error(f"Face verification failed: {e}")
        return False, 0.0


def check_liveness(attendance_photo_path: str) -> bool:
    """
    Checks if the photo represents a real live person (anti-spoofing).
    Returns True if real, False if spoofed or no face found.
    """
    img = get_image_path(attendance_photo_path)
    if not os.path.exists(img):
        return False

    try:
        faces = DeepFace.extract_faces(
            img_path=img,
            anti_spoofing=True,
            enforce_detection=False,
            detector_backend="opencv"
        )
        
        # Check if any face detected is considered real
        for face in faces:
            # is_real is a boolean returned when anti_spoofing=True
            if face.get("is_real", False) is True:
                return True
                
        return False
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        # Fallback if liveness check throws an error (e.g. weights not downloaded properly)
        return False
