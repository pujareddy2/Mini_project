import time
from app.services.face_service import verify_face, check_liveness

img = "uploads/profile_53c977aa-0f39-42d2-90f4-0dfc441d9a7b.jpeg"
print("Warming up...")
check_liveness(img)
verify_face(img, img)

print("\n--- ACTUAL IN-MEMORY SPEED (Like FastAPI) ---")
print("Testing liveness...")
start = time.time()
liveness = check_liveness(img)
print(f"Liveness result: {liveness}, Time: {time.time() - start:.2f}s")

print("Testing verify_face...")
start = time.time()
match, dist = verify_face(img, img)
print(f"Verify result: match={match}, distance={dist}, Time: {time.time() - start:.2f}s")
