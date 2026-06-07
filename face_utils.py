import os

import cv2
import face_recognition
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGES_DIR = os.path.join(BASE_DIR, "ImagesAttendance")

# Only Varshini is allowed — match common filenames for her photo
VARSHINI_FILENAMES = {
    "varshini.jpg",
    "varshini.jpeg",
    "varshini.png",
    "varshini munigala.jpg",
    "varshini munigala.jpeg",
    "varshini munigala.png",
    "v.jpg",
    "v.jpeg",
    "v.png",
}


def _find_varshini_image():
    if not os.path.isdir(IMAGES_DIR):
        return None

    for name in os.listdir(IMAGES_DIR):
        if name.lower() in VARSHINI_FILENAMES:
            return os.path.join(IMAGES_DIR, name)

    for name in os.listdir(IMAGES_DIR):
        lower = name.lower()
        if "varshini" in lower or lower.startswith("v."):
            return os.path.join(IMAGES_DIR, name)

    return None


def load_varshini_encoding():
    path = _find_varshini_image()
    if not path:
        return None, None

    img = cv2.imread(path)
    if img is None:
        return None, path

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)
    if not encodings:
        return None, path

    return encodings[0], path


def verify_face_from_bytes(image_bytes, known_encoding, tolerance=0.55):
    if known_encoding is None:
        return False, "Verification is not set up yet."

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return False, "Could not read the image."

    small = cv2.resize(img, (0, 0), fx=0.25, fy=0.25)
    rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

    locations = face_recognition.face_locations(rgb)
    if not locations:
        return False, "No face detected. Try moving closer to the camera."

    encodings = face_recognition.face_encodings(rgb, locations)
    if not encodings:
        return False, "Could not read your face. Try again."

    match = face_recognition.compare_faces([known_encoding], encodings[0], tolerance=tolerance)[0]

    if match:
        return True, "Verified."

    return False, "Verification failed. Please try again."
