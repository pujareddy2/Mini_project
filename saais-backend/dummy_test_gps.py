def check_gps(distance, accuracy):
    if distance <= 600.0:
        return "PASS", "Distance <= 600m"
    elif distance <= 650.0 and accuracy <= 50.0:
        return "PASS WITH WARNING", "Distance > 600m but <= 650m and accuracy is good (<= 50m)"
    else:
        return "FAIL", "Distance > 650m or accuracy too poor"

test_cases = [
    {"student": "Student A", "distance": 100, "accuracy": 10, "expected": "PASS"},
    {"student": "Student B", "distance": 250, "accuracy": 5, "expected": "PASS"},
    {"student": "Student C", "distance": 590, "accuracy": 100, "expected": "PASS"},
    {"student": "Student D", "distance": 620, "accuracy": 20, "expected": "PASS WITH WARNING"},
    {"student": "Student E", "distance": 700, "accuracy": 10, "expected": "FAIL"},
    {"student": "Student F", "distance": 900, "accuracy": 60, "expected": "FAIL"},
]

print("--- RUNNING AUTOMATIC VALIDATION TESTING ---\n")
all_passed = True

for case in test_cases:
    status, reason = check_gps(case["distance"], case["accuracy"])
    
    match = "[OK]" if status == case["expected"] else "[ERROR]"
    if status != case["expected"]:
        all_passed = False
        
    print(f"[{match}] {case['student']}")
    print(f"    Distance: {case['distance']}m")
    print(f"    Accuracy: {case['accuracy']}m")
    print(f"    Expected: {case['expected']}")
    print(f"    Result:   {status}")
    print(f"    Reason:   {reason}\n")

if all_passed:
    print("[SUCCESS] All test cases passed successfully.")
else:
    print("[FAIL] Some test cases failed.")
