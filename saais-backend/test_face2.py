import time
import concurrent.futures
from app.services.face_service import verify_face, check_liveness

img = "uploads/profile_53c977aa-0f39-42d2-90f4-0dfc441d9a7b.jpeg"
print("Warming up...")
check_liveness(img)
verify_face(img, img)

print("\n--- PARALLEL IN-MEMORY SPEED ---")
start = time.time()

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    future_liveness = executor.submit(check_liveness, img)
    future_verify = executor.submit(verify_face, img, img)

    liveness = future_liveness.result()
    match, dist = future_verify.result()

total_time = time.time() - start
print(f"Liveness result: {liveness}")
print(f"Verify result: match={match}, distance={dist}")
print(f"Total Parallel Time: {total_time:.2f}s")
