import os
import sqlite3
import time
import cv2
from ultralytics import YOLO

# ---------------------------------------------------------
# 1. Database & Snapshot Setup
# ---------------------------------------------------------
LOG_COOLDOWN_SECONDS = 3.0  # Cooldown so it doesn't print spam every single frame
SNAPSHOT_DIR = "logs_snapshots"
os.makedirs(SNAPSHOT_DIR, exist_ok=True)

# Connect to database file
conn = sqlite3.connect("ewaste_system.db", check_same_thread=False)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Cache component metadata in memory for ultra-fast zero-delay lookup
cursor.execute("""
    SELECT component_id, class_name, category, hazard_level, 
           material_composition, valuable_metals, target_bin, handling_instructions 
    FROM components
""")
meta_lookup = {row["class_name"]: dict(row) for row in cursor.fetchall()}
last_logged_time = {}

# ---------------------------------------------------------
# 2. Load Model & Open Webcam
# ---------------------------------------------------------
model = YOLO("best.pt")
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("Error: Could not open webcam.")
    exit()

print("=======================================================")
print("Live E-Waste Detector is running with Database Logging!")
print("Press 'q' on your keyboard to stop the camera feed.")
print("=======================================================\n")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to grab frame from webcam.")
        break

    # Run YOLO object detection on the current frame
    results = model.predict(source=frame, conf=0.50, verbose=False)
    current_time = time.time()

    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            class_name = model.names[cls_id]
            confidence = float(box.conf[0])

            # Fetch component info from database
            meta = meta_lookup.get(class_name)
            last_time = last_logged_time.get(class_name, 0)

            # Check if component exists in DB and cooldown period has passed
            if meta and (current_time - last_time >= LOG_COOLDOWN_SECONDS):
                # Save frame snapshot
                timestamp_str = time.strftime("%Y%m%d_%H%M%S")
                snapshot_path = f"{SNAPSHOT_DIR}/{class_name}_{timestamp_str}.jpg"
                cv2.imwrite(snapshot_path, frame)

                # Log detection to database
                cursor.execute("""
                    INSERT INTO detection_logs (component_id, confidence_score, image_frame_path)
                    VALUES (?, ?, ?)
                """, (meta["component_id"], confidence, snapshot_path))
                conn.commit()

                # Print structured E-Waste metadata card in Terminal
                border = "=" * 65
                print("\n" + border)
                print(f" 🚨 DETECTED E-WASTE ITEM: {class_name.upper()} (Confidence: {confidence*100:.1f}%)")
                print(border)
                print(f" • Category        : {meta['category']}")
                print(f" • Hazard Level    : {meta['hazard_level']}")
                print(f" • Target Bin      : {meta['target_bin']}")
                print(f" • Valuable Metals : {meta['valuable_metals']}")
                print(f" • Composition     : {meta['material_composition']}")
                print(f" • Action Required : {meta['handling_instructions']}")
                print(border + "\n")

                last_logged_time[class_name] = current_time

    # Draw bounding boxes and labels on the video feed
    annotated_frame = results[0].plot()

    # Display the camera feed in a popup window
    cv2.imshow("E-Waste Real-Time Detection Test", annotated_frame)

    # Press 'q' on keyboard to exit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

# Clean up webcam and database connection
cap.release()
cv2.destroyAllWindows()
conn.close()