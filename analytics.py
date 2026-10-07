import sqlite3

def run_analytics():
    conn = sqlite3.connect("ewaste_system.db")
    cursor = conn.cursor()

    print("\n--- E-WASTE RECYCLING INVENTORY SUMMARY ---")
    query = """
    SELECT 
        c.class_name,
        c.hazard_level,
        c.target_bin,
        COUNT(l.log_id) AS total_detections,
        ROUND(AVG(l.confidence_score), 3) AS avg_confidence
    FROM components c
    LEFT JOIN detection_logs l ON c.component_id = l.component_id
    GROUP BY c.component_id
    ORDER BY total_detections DESC;
    """
    
    cursor.execute(query)
    rows = cursor.fetchall()

    print(f"{'Class Name':<18} | {'Hazard':<8} | {'Target Bin':<22} | {'Count':<6} | {'Avg Conf':<8}")
    print("-" * 75)
    for row in rows:
        print(f"{row[0]:<18} | {row[1]:<8} | {row[2]:<22} | {row[3]:<6} | {str(row[4]):<8}")

    print("\n--- RECENT HAZARD ALERTS (HIGH HAZARD) ---")
    query_hazards = """
    SELECT l.log_id, c.class_name, l.confidence_score, l.detected_at, l.image_frame_path
    FROM detection_logs l
    JOIN components c ON l.component_id = c.component_id
    WHERE c.hazard_level = 'High'
    ORDER BY l.detected_at DESC LIMIT 5;
    """
    cursor.execute(query_hazards)
    hazards = cursor.fetchall()

    for h in hazards:
        print(f"ALERT #{h[0]}: {h[1].upper()} detected with {h[2]:.2f} confidence at {h[3]} (Snapshot: {h[4]})")

    conn.close()

if __name__ == "__main__":
    run_analytics()