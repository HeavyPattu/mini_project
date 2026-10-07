import os
import sqlite3
import time
import cv2
from ultralytics import YOLO

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------
MODEL_PATH = "best.pt"
CONF_THRESHOLD = 0.50
LOG_COOLDOWN_SECONDS = 3.0  # Time in seconds before printing/logging the same item again
SNAPSHOT_DIR = "logs_snapshots"

os.makedirs(SNAPSHOT_DIR, exist_ok=True)

# ---------------------------------------------------------
# Database Helper Functions
# ---------------------------------------------------------
def get_db_connection():
    conn = sqlite3.connect("ewaste_system.db", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def load_component_metadata(conn):
    """Loads all component data into an in-memory dictionary for zero-latency lookups."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT component_id, class_name, category, hazard_level, 
               material_composition, valuable_metals, target_bin, handling_instructions 
        FROM components
    """)
    rows = cursor.fetchall()
    return {row["class_name"]: dict(row) for row in rows}

def log_detection_to_db(conn, component_id, confidence, image_path):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO detection_logs (component_id, confidence_score, image_frame_path)
        VALUES (?, ?, ?)
    """, (component_id, float(confidence), image_path))
    conn.commit()

# ---------------------------------------------------------
# Terminal Printing Utility
# ---------------------------------------------------------
def print_terminal_info(class_name, confidence, meta):
    """Prints a clean, structured e-waste profile card directly in the terminal."""
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

# ---------------------------------------------------------
# Main Execution Loop
# ---------------------------------------------------------
def main():
    db_conn = get_db_connection()
    meta_lookup = load_component_metadata(db_conn)
    model = YOLO(MODEL_PATH)
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Error: Could not access webcam.")
        return

    last_logged_time = {}

    print("\n--- Edge-AI E-Waste Classifier Active ---")
    print("Point items at camera. Details will print below in real time. Press 'q' to quit.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model.predict(source=frame, conf=CONF_THRESHOLD, verbose=False)
        current_time = time.time()

        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                class_name = model.names[cls_id]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Fetch database metadata
                meta = meta_lookup.get(class_name, {
                    "component_id": None,
                    "category": "Unknown",
                    "hazard_level": "Low",
                    "material_composition": "N/A",
                    "valuable_metals": "None",
                    "target_bin": "General_Vault",
                    "handling_instructions": "Inspect manually."
                })

                # Determine simple bounding box color on clean video feed
                box_color = (0, 255, 0) # Green for Low Hazard
                if meta["hazard_level"] == "High":
                    box_color = (0, 0, 255) # Red for High Hazard
                elif meta["hazard_level"] == "Medium":
                    box_color = (0, 165, 255) # Orange for Medium Hazard

                # Draw minimal bounding box and basic label on the camera feed
                label = f"{class_name.upper()} {confidence:.2f}"
                cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                cv2.putText(frame, label, (x1, max(y1 - 10, 20)), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)

                # Terminal Output + Database Logging (Triggered based on Cooldown)
                last_time = last_logged_time.get(class_name, 0)
                if meta["component_id"] and (current_time - last_time >= LOG_COOLDOWN_SECONDS):
                    # Save Snapshot
                    timestamp_str = time.strftime("%Y%m%d_%H%M%S")
                    snapshot_path = f"{SNAPSHOT_DIR}/{class_name}_{timestamp_str}.jpg"
                    cv2.imwrite(snapshot_path, frame)

                    # Log to SQLite
                    log_detection_to_db(db_conn, meta["component_id"], confidence, snapshot_path)
                    
                    # Print full profile to terminal terminal window
                    print_terminal_info(class_name, confidence, meta)
                    
                    last_logged_time[class_name] = current_time

        # Display the video frame
        cv2.imshow("Edge-AI E-Waste Camera Feed", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    db_conn.close()

if __name__ == "__main__":
    main()