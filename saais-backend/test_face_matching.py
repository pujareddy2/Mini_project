import sys
import os
import urllib.request
import logging

sys.path.append(os.getcwd())
from app.services.face_service import verify_face

def download(url, filename):
    if not os.path.exists(filename):
        print(f"Downloading {filename}...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(filename, 'wb') as out_file:
            out_file.write(response.read())

# Use DeepFace's own test dataset which is guaranteed to be faces
url_person1_a = "https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img1.jpg"
url_person1_b = "https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img2.jpg"
url_person2 = "https://raw.githubusercontent.com/serengil/deepface/master/tests/dataset/img3.jpg"

print("Setting up test images...")
download(url_person1_a, "person1_a.jpg")
download(url_person1_b, "person1_b.jpg")
download(url_person2, "person2.jpg")

print("\n--- Test 1: Same Person ---")
match, distance = verify_face("person1_a.jpg", "person1_b.jpg")
print(f"Result: Match={match}, Distance={distance:.4f}")

print("\n--- Test 2: Different Persons ---")
match, distance = verify_face("person1_a.jpg", "person2.jpg")
print(f"Result: Match={match}, Distance={distance:.4f}")

print("\nTests complete!")
