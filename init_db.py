import sqlite3

def init_database():
    # Connect to SQLite database file
    conn = sqlite3.connect("ewaste_system.db")
    cursor = conn.cursor()

    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")

    # 1. Master lookup table for detected e-waste components
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS components (
        component_id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_name TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        hazard_level TEXT CHECK(hazard_level IN ('High', 'Medium', 'Low')),
        material_composition TEXT NOT NULL,
        valuable_metals TEXT,
        toxic_materials TEXT,
        target_bin TEXT NOT NULL,
        handling_instructions TEXT NOT NULL
    );
    """)

    # 2. Table for live detection logs from YOLO script
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detection_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        component_id INTEGER NOT NULL,
        confidence_score REAL NOT NULL,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image_frame_path TEXT,
        FOREIGN KEY (component_id) REFERENCES components(component_id) ON DELETE CASCADE
    );
    """)

    # 3. Domain-specific data for your 6 YOLO classes
    e_waste_data = [
        (
            "phone",
            "Mobile & Telecom",
            "High",
            "Lithium-ion Battery, Glass, Aluminum, Copper, Gold, Silver, Tantalum, Cobalt",
            "Gold, Silver, Copper, Cobalt, Lithium, Palladium",
            "Lithium, Cobalt, Heavy Metal Electrolytes, Lead Solder",
            "Hazardous_Battery_Depot",
            "Isolate phone to extract battery safely. Do not crush or puncture casing to prevent thermal runaway."
        ),
        (
            "laptop",
            "Personal Computing",
            "High",
            "Li-ion Battery Pack, Aluminum Casing, Motherboard PCB, LCD/OLED Screen, Copper Heatpipes",
            "Gold, Silver, Copper, Aluminum, Tantalum, Indium",
            "Lithium, Lead, Brominated Flame Retardants (BFR), Mercury (in older displays)",
            "Complex_E-Waste_Vault",
            "Remove battery pack immediately. Separate LCD screen, magnesium/aluminum chassis, and main circuit board."
        ),
        (
            "keyboard",
            "Computer Peripherals",
            "Low",
            "ABS/PBT Plastics, Polycarbonate membrane, Small FR-2 PCB, Copper wiring",
            "Copper, Trace Gold/Tin",
            "Brominated Flame Retardants (BFRs in plastics)",
            "Plastics_Membrane_Bin",
            "Dismantle keycaps and plastic frame for shredding; extract thin membrane circuit for copper recovery."
        ),
        (
            "mouse",
            "Computer Peripherals",
            "Low",
            "ABS Plastic Casing, Optical Sensor IC, Micro-switches, FR-4 PCB, Copper Wire",
            "Copper, Tin, Trace Gold",
            "Brominated Flame Retardants (BFRs)",
            "General_Plastics_Bin",
            "Unscrew casing, remove internal PCB for metal extraction, and route plastic shell to granulator."
        ),
        (
            "pd",
            "Storage Media (Pen Drive / USB)",
            "Medium",
            "NAND Flash Memory IC, USB Connector, Controller Chip, FR-4 PCB, Aluminum/Plastic Housing",
            "Gold (connector contacts), Copper, Silver, Silicon",
            "Lead solder (older units), BFRs",
            "Precious_Metals_Bin",
            "Route directly to fine shredding and pyrometallurgical recovery for high-density gold and copper retrieval."
        ),
        (
            "earbud",
            "Audio Wearables",
            "High",
            "Miniature Li-ion Coin Cell (Varta/Button Battery), Neodymium Driver Magnets, ABS Plastic, Copper Coils",
            "Neodymium (Rare Earth), Copper, Gold, Lithium",
            "Lithium, Nickel, Cobalt, Micro-plastics",
            "Hazardous_Battery_Depot",
            "Contains miniature volatile lithium coin cells. Do not shred directly; route to dedicated micro-battery recovery."
        )
    ]

    # Insert or update dataset records
    cursor.executemany("""
    INSERT INTO components (
        class_name, category, hazard_level, material_composition,
        valuable_metals, toxic_materials, target_bin, handling_instructions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(class_name) DO UPDATE SET
        category=excluded.category,
        hazard_level=excluded.hazard_level,
        material_composition=excluded.material_composition,
        valuable_metals=excluded.valuable_metals,
        toxic_materials=excluded.toxic_materials,
        target_bin=excluded.target_bin,
        handling_instructions=excluded.handling_instructions;
    """, e_waste_data)

    conn.commit()
    conn.close()
    print("Database `ewaste_system.db` initialized and populated for 6 classes successfully!")

if __name__ == "__main__":
    init_database()