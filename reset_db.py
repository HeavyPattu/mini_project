import sqlite3
import os

def reset_inventory():
    conn = sqlite3.connect("ewaste_system.db")
    cursor = conn.cursor()

    # Clear all logged detection events
    cursor.execute("DELETE FROM detection_logs;")
    
    # Reset the auto-increment primary key ID back to 1
    cursor.execute("DELETE FROM sqlite_sequence WHERE name='detection_logs';")

    conn.commit()
    conn.close()
    
    # Optionally clear saved snapshot images
    snapshot_dir = "logs_snapshots"
    if os.path.exists(snapshot_dir):
        for file in os.listdir(snapshot_dir):
            file_path = os.path.join(snapshot_dir, file)
            if os.path.isfile(file_path):
                os.remove(file_path)

    print("✅ Detection logs and snapshots reset to 0 successfully!")

if __name__ == "__main__":
    reset_inventory()