import os
import hashlib
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Component, DetectionLog, Pickup, CollectionCenter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ewaste_system.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_database():
    print(f"Creating database tables at {DB_PATH}...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Users (Pre-seeded test accounts)
        existing_users = db.query(User).count()
        if existing_users == 0:
            print("Seeding test users...")
            donor_user = User(
                name="Rohan Patil",
                email="donor@reroute.in",
                phone="+91 98221 44550",
                password_hash=hash_password("donor123"),
                role="donor",
                address="Plot 42, Gulmohar Colony, South Shivajinagar, Sangli - 416416"
            )
            operator_user = User(
                name="Sunil Deshmukh (SMKC Officer)",
                email="admin@smkc.in",
                phone="+91 94230 11223",
                password_hash=hash_password("admin123"),
                role="center_operator",
                address="SMKC Ward Office #3, Rajwada Chowk, Sangli - 416416"
            )
            donor_user_2 = User(
                name="Priyanka Kulkarni",
                email="priyanka@gmail.com",
                phone="+91 98901 23456",
                password_hash=hash_password("password123"),
                role="donor",
                address="Flat 402, Royal Residency, Vishrambag, Sangli - 416415"
            )
            db.add_all([donor_user, operator_user, donor_user_2])
            db.commit()
            print("Users seeded successfully.")

        # 2. Seed 6 Core E-Waste Components
        existing_components = db.query(Component).count()
        if existing_components == 0:
            print("Seeding 6 Core E-Waste Components...")
            components = [
                Component(
                    class_name="phone",
                    category="Mobile Telecom & Portable Computing",
                    hazard_level="High",
                    material_composition="42% Plastic/Glass, 23% Aluminum, 18% Copper, 15% Li-ion Battery cell, 2% Noble metals",
                    valuable_metals="Gold (0.034g), Silver (0.35g), Palladium (0.015g), Copper (15g), Cobalt",
                    toxic_materials="Lithium Cobalt Oxide, Lead solder, Arsenic trace, Brominated Flame Retardants",
                    target_bin="Hazardous_Battery_Depot",
                    handling_instructions="CRITICAL: Inspect for battery bulging or puncture. Tape terminals with anti-static Kapton tape. Never crush or incinerate.",
                    est_weight_kg=0.18,
                    co2_offset_kg=2.40
                ),
                Component(
                    class_name="laptop",
                    category="Personal Computing & Displays",
                    hazard_level="High",
                    material_composition="35% Aluminum/Magnesium alloy, 25% LCD/Glass, 20% Li-ion Battery pack, 15% Circuitry, 5% Plastics",
                    valuable_metals="Gold (0.22g), Silver (1.1g), Copper (220g), Tantalum, Neodymium",
                    toxic_materials="Lithium-ion cells, Mercury (backlight CCFL if older), Lead, Polyvinyl Chloride (PVC)",
                    target_bin="Hazardous_Battery_Depot",
                    handling_instructions="PRIORITY: Remove external battery if detachable. Quarantine swollen units in fireproof sand bins. Perform NIST SP 800-88 storage purge.",
                    est_weight_kg=1.85,
                    co2_offset_kg=14.20
                ),
                Component(
                    class_name="keyboard",
                    category="Peripheral & Human Interface Devices",
                    hazard_level="Low",
                    material_composition="70% ABS/PBT Engineering Plastics, 20% Membrane/Steel Plate, 10% Copper wiring",
                    valuable_metals="Copper wiring (45g), Nickel plating, Trace Tin",
                    toxic_materials="Brominated Flame Retardants (BFR), Trace Phthalates",
                    target_bin="Shredder_Feed_Plastic",
                    handling_instructions="Detonate cable connector. Mechanical shredding safe. Separate keycaps for thermoplastic polymer pelletization.",
                    est_weight_kg=0.65,
                    co2_offset_kg=1.10
                ),
                Component(
                    class_name="mouse",
                    category="Peripheral & Optical Devices",
                    hazard_level="Low",
                    material_composition="65% Injection Molded ABS, 25% FR-4 PCB & Optical Sensor, 10% Copper cable",
                    valuable_metals="Copper (18g), Gold trace in micro-switches, Tin",
                    toxic_materials="Brominated Flame Retardants, Lead in older soldering",
                    target_bin="Shredder_Feed_Plastic",
                    handling_instructions="Remove AA/AAA alkaline batteries if wireless. Clip braided cables. Route plastic shell to secondary recycling.",
                    est_weight_kg=0.12,
                    co2_offset_kg=0.45
                ),
                Component(
                    class_name="pd",
                    category="Solid State Storage & Flash Memory",
                    hazard_level="Low",
                    material_composition="45% Aluminum/Zinc alloy casing, 40% Silicon NAND flash/Controller, 15% Copper substrate",
                    valuable_metals="Gold bond wires (0.005g), Silver solder, Copper substrate",
                    toxic_materials="Trace Antimony trioxide in epoxy mold, Lead",
                    target_bin="Precious_Metals_Bin",
                    handling_instructions="Ensure cryptographic zero-fill or physical punch degaussing before chemical hydrometallurgical gold recovery.",
                    est_weight_kg=0.03,
                    co2_offset_kg=0.30
                ),
                Component(
                    class_name="earbud",
                    category="Miniature Audio & Micro-Wearables",
                    hazard_level="High",
                    material_composition="45% Polycarbonate enclosure, 30% Micro Li-ion button cell, 15% Neodymium magnets, 10% Copper coil",
                    valuable_metals="Neodymium (N52 magnets), Copper micro-coils, Gold contact pins",
                    toxic_materials="Lithium Nickel Manganese Cobalt (NMC) micro-cells, Electrolyte irritants",
                    target_bin="Hazardous_Battery_Depot",
                    handling_instructions="WARNING: High thermal-runaway risk due to micro-lithium coin cells. Do not crush. Submerge damaged cells in vermiculite.",
                    est_weight_kg=0.05,
                    co2_offset_kg=0.85
                )
            ]
            db.add_all(components)
            db.commit()
            print("Components seeded successfully.")

        # 3. Seed Sangli-Miraj-Kupwad Municipal Collection Centers
        print("Seeding / updating Sangli-Miraj-Kupwad Collection Centers...")
        db.query(CollectionCenter).delete()
        centers = [
            CollectionCenter(
                center_id=1,
                name="SMKC Central E-Waste Collection Hub (Sangli HQ)",
                type="permanent_hub",
                address="Sangli-Miraj-Kupwad Municipal Corporation Bldg, Near Rajwada, Sangli, MH 416416",
                latitude=16.8524,
                longitude=74.5815,
                contact_phone="+91 233 2373021",
                accepts_household=True,
                drive_date="Monday - Saturday: 09:00 AM - 06:00 PM"
            ),
            CollectionCenter(
                center_id=2,
                name="WCE Campus Community E-Waste Drive",
                type="temporary_drive",
                address="Walchand College of Engineering (WCE), A/P Vishrambag, Sangli, MH 416415",
                latitude=16.8458,
                longitude=74.6015,
                contact_phone="+91 98220 78120",
                accepts_household=True,
                drive_date="Active Drive: Oct 25 - Nov 15, 2026 (Daily 10:00 AM - 5:00 PM)"
            ),
            CollectionCenter(
                center_id=3,
                name="Prithvi Zero E-Waste",
                type="permanent_hub",
                address="Othonial Colony, MIraj, Maharashtra, 416410",
                latitude=16.8272,
                longitude=74.6465,
                contact_phone="+91 7030758874",
                accepts_household=True,
                drive_date="All Days: 08:00 AM - 08:00 PM"
            ),
            CollectionCenter(
                center_id=4,
                name="Kupwad MIDC Industrial Hazardous Recycler",
                type="industrial_recycler",
                address="Plot B-14, Kupwad MIDC Phase 2, Sangli-Miraj Road, MH 416436",
                latitude=16.8682,
                longitude=74.6291,
                contact_phone="+91 233 2644910",
                accepts_household=False,
                drive_date="Commercial & Bulk Hauls Only (Mon - Fri)"
            ),
            CollectionCenter(
                center_id=5,
                name="Bharati Vidyapeeth Campus Green Drive",
                type="temporary_drive",
                address="Bharati Vidyapeeth Complex, Sangli-Miraj Bypass Highway, Wanlesswadi, Sangli, MH 416414",
                latitude=16.8385,
                longitude=74.6210,
                contact_phone="+91 94224 88900",
                accepts_household=True,
                drive_date="Weekend Drive (Sat & Sun 9:00 AM - 4:00 PM)"
            )
        ]
        db.add_all(centers)
        db.commit()
        print("Collection Centers seeded successfully.")

        # 4. Seed Initial Pickups
        existing_pickups = db.query(Pickup).count()
        if existing_pickups == 0:
            print("Seeding sample pickups for Sangli-Miraj...")
            donor1 = db.query(User).filter(User.email == "donor@reroute.in").first()
            user1_id = donor1.id if donor1 else 1

            sample_pickups = [
                Pickup(
                    user_id=user1_id,
                    donor_name="Rohan Patil",
                    donor_phone="+91 98221 44550",
                    status="pending",
                    address="Plot 42, Gulmohar Colony, South Shivajinagar, Sangli - 416416",
                    latitude=16.8540,
                    longitude=74.5830,
                    scheduled_date="Tomorrow, 10:30 AM",
                    items_json=json.dumps([
                        {"item": "phone", "qty": 2, "category": "Mobile Telecom & Portable Computing", "hazard": "High"},
                        {"item": "earbud", "qty": 1, "category": "Miniature Audio & Micro-Wearables", "hazard": "High"}
                    ]),
                    tracking_code="RR-84912",
                    created_at=datetime.utcnow() - timedelta(hours=3)
                ),
                Pickup(
                    user_id=user1_id,
                    donor_name="Priyanka Kulkarni",
                    donor_phone="+91 98901 23456",
                    status="scheduled",
                    address="Flat 402, Royal Residency, Vishrambag, Sangli - 416415",
                    latitude=16.8470,
                    longitude=74.6030,
                    scheduled_date="Today, 03:00 PM",
                    items_json=json.dumps([
                        {"item": "laptop", "qty": 1, "category": "Personal Computing & Displays", "hazard": "High"},
                        {"item": "keyboard", "qty": 1, "category": "Peripheral & Human Interface Devices", "hazard": "Low"}
                    ]),
                    tracking_code="RR-30194",
                    created_at=datetime.utcnow() - timedelta(days=1)
                ),
                Pickup(
                    user_id=user1_id,
                    donor_name="Mahesh Joshi",
                    donor_phone="+91 94220 55112",
                    status="completed",
                    address="Brahman Puri, Near Ganpati Temple, Sangli - 416416",
                    latitude=16.8580,
                    longitude=74.5720,
                    scheduled_date="Yesterday, 11:00 AM",
                    items_json=json.dumps([
                        {"item": "mouse", "qty": 2, "category": "Peripheral & Optical Devices", "hazard": "Low"},
                        {"item": "pd", "qty": 3, "category": "Solid State Storage & Flash Memory", "hazard": "Low"}
                    ]),
                    tracking_code="RR-61205",
                    created_at=datetime.utcnow() - timedelta(days=2)
                )
            ]
            db.add_all(sample_pickups)
            db.commit()
            print("Sample pickups seeded successfully.")

        # 5. Seed Initial Detection Logs
        existing_logs = db.query(DetectionLog).count()
        if existing_logs == 0:
            print("Seeding sample detection logs...")
            phone_comp = db.query(Component).filter(Component.class_name == "phone").first()
            laptop_comp = db.query(Component).filter(Component.class_name == "laptop").first()
            keyboard_comp = db.query(Component).filter(Component.class_name == "keyboard").first()
            mouse_comp = db.query(Component).filter(Component.class_name == "mouse").first()

            logs = [
                DetectionLog(
                    component_id=phone_comp.component_id if phone_comp else 1,
                    confidence_score=0.94,
                    source="drive_intake",
                    detected_at=datetime.utcnow() - timedelta(hours=5)
                ),
                DetectionLog(
                    component_id=laptop_comp.component_id if laptop_comp else 2,
                    confidence_score=0.88,
                    source="drive_intake",
                    detected_at=datetime.utcnow() - timedelta(hours=4)
                ),
                DetectionLog(
                    component_id=keyboard_comp.component_id if keyboard_comp else 3,
                    confidence_score=0.91,
                    source="donor_scan",
                    detected_at=datetime.utcnow() - timedelta(hours=2)
                ),
                DetectionLog(
                    component_id=mouse_comp.component_id if mouse_comp else 4,
                    confidence_score=0.85,
                    source="drive_intake",
                    detected_at=datetime.utcnow() - timedelta(hours=1)
                )
            ]
            db.add_all(logs)
            db.commit()
            print("Detection logs seeded successfully.")

        print("Database seeded and ready!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
