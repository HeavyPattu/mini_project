import os
import hashlib
import json
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, User, Component, DetectionLog, Pickup, CollectionCenter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "ewaste_system.db")
raw_db_url = os.getenv("DATABASE_URL")
if not raw_db_url or raw_db_url.startswith("sqlite:///.") or raw_db_url == "sqlite:///ewaste_system.db":
    DATABASE_URL = f"sqlite:///{DB_PATH}"
else:
    DATABASE_URL = raw_db_url

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def ensure_schema():
    """Ensure newly added columns exist in SQLite without needing full drop."""
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(components)")
    columns = [col[1] for col in cursor.fetchall()]
    
    needed_cols = [
        ("device_image_url", "VARCHAR(500)"),
        ("sub_components_json", "TEXT"),
        ("disassembly_steps_json", "TEXT"),
        ("recycling_protocols_json", "TEXT"),
        ("environmental_alert", "TEXT")
    ]
    for col_name, col_type in needed_cols:
        if col_name not in columns:
            cursor.execute(f"ALTER TABLE components ADD COLUMN {col_name} {col_type}")
    conn.commit()
    conn.close()

def seed_database():
    print(f"Creating database tables at {DB_PATH}...")
    Base.metadata.create_all(bind=engine)
    ensure_schema()
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

        # 2. Seed / Update 6 Core E-Waste Components with Rich Visual Sub-Components & Recycling Protocols
        print("Seeding / updating 6 Core E-Waste Components with visual sub-components...")
        raw_components_data = [
            {
                "class_name": "phone",
                "category": "Mobile Telecom & Portable Computing",
                "hazard_level": "High",
                "material_composition": "42% Plastic/Glass, 23% Aluminum, 18% Copper, 15% Li-ion Battery cell, 2% Noble metals",
                "valuable_metals": "Gold (0.034g), Silver (0.35g), Palladium (0.015g), Copper (15g), Cobalt",
                "toxic_materials": "Lithium Cobalt Oxide, Lead solder, Arsenic trace, Brominated Flame Retardants",
                "target_bin": "Hazardous_Battery_Depot",
                "handling_instructions": "CRITICAL: Inspect for battery bulging or puncture. Tape terminals with anti-static Kapton tape. Never crush or incinerate.",
                "est_weight_kg": 0.18,
                "co2_offset_kg": 2.40,
                "device_image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80",
                "environmental_alert": "If thrown in open municipal trash, 1 mobile phone battery can contaminate 600,000 liters of drinking water with Lithium, Cobalt, and Nickel leachate.",
                "sub_components": [
                    {
                        "id": "phone_battery",
                        "name": "Lithium-Ion / Li-Po Battery Pack",
                        "location": "Center to Lower Rear Interior",
                        "hazardLevel": "High",
                        "badgeColor": "#EF4444",
                        "imageUrl": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Flat rectangular silver or black foil pouch with warning icons and printed voltage ratings (3.8V - 4.4V).",
                        "whereItIs": "Located directly behind the rear casing/display panel, occupying up to 60% of internal volume.",
                        "materials": "Cobalt (5-15g), Lithium Carbonate, Nickel, Graphite, Copper Foil, Aluminum.",
                        "handlingSafety": "CRITICAL: Never puncture or bend with metal tools. Check for swelling or chemical odor. Tape contact terminals with anti-static Kapton tape immediately.",
                        "recyclingProcess": "Hydrometallurgical leaching in acid bath to precipitate battery-grade Cobalt sulfate, Lithium carbonate, and Nickel cathode precursors."
                    },
                    {
                        "id": "phone_motherboard",
                        "name": "Main Logic Board & Processor PCB",
                        "location": "Upper Rear Compartment (Beside Camera)",
                        "hazardLevel": "Medium",
                        "badgeColor": "#F59E0B",
                        "imageUrl": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Green or dark multi-layer FR-4 circuit board covered with silver metal RF shielding cans, flash memory chips, and gold-plated contact pads.",
                        "whereItIs": "Mounted on the top half of the internal metal mid-frame, connected to battery and display via flex ribbons.",
                        "materials": "Gold (0.034g), Silver (0.35g), Palladium (0.015g), Tantalum, Silicon, Copper traces.",
                        "handlingSafety": "High electro-static discharge sensitivity. Clip away antennas. Keep dry to prevent copper corrosion before hydrometallurgy.",
                        "recyclingProcess": "Secondary copper smelting followed by electrolytic refining and chemical precipitation of 99.99% pure gold and silver bullion."
                    },
                    {
                        "id": "phone_display",
                        "name": "AMOLED / LCD Touch Digitizer Assembly",
                        "location": "Front Exterior Surface",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1563770660941-20978e870e26?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Ultra-thin multi-layer glass panel with embedded capacitive touch layer, polarizer sheet, and copper flex ribbon connector.",
                        "whereItIs": "Forms the complete front display surface of the smartphone.",
                        "materials": "Indium Tin Oxide (ITO) thin film, Optical glass, Rare earth phosphors, Silicon.",
                        "handlingSafety": "Wear cut-resistant Kevlar gloves if shattered. Apply clear adhesive film over cracked glass to stabilize shards.",
                        "recyclingProcess": "Thermal optical glass cullet recycling and acid leaching for recovering scarce Indium element."
                    },
                    {
                        "id": "phone_camera",
                        "name": "Multi-Lens Camera & Haptic Motor",
                        "location": "Top Corner & Bottom Vibrator Cavity",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Miniature square optical lenses surrounded by copper coils and tiny metallic coin-shaped vibration actuators.",
                        "whereItIs": "Camera lenses reside at top rear; haptic vibration module sits near the bottom speaker port.",
                        "materials": "Neodymium (NdFeB) grade N52 permanent magnets, Optical grade glass, Copper micro-coils.",
                        "handlingSafety": "High magnetic attraction to ferrous tools. Store in demagnetizing shielded trays.",
                        "recyclingProcess": "Magnetic extraction and pyrometallurgical recovery of Neodymium and Dysprosium rare earth elements."
                    }
                ],
                "disassembly_steps": [
                    "1. Heat rear panel perimeter to 75°C to soften water-resistant adhesive.",
                    "2. Pry rear glass with a non-conductive plastic guitar pick; disconnect fingerprint sensor ribbon.",
                    "3. Disconnect battery flex cable FIRST to kill electrical current to the motherboard.",
                    "4. Pull battery stretch-release tabs smoothly without puncturing battery envelope.",
                    "5. Unscrew Phillips #00 screws holding motherboard RF shields and unclip logic board."
                ],
                "recycling_protocols": [
                    "Segregation: Route extracted battery directly to Hazardous_Battery_Depot with insulated terminals.",
                    "Data Sanitization: Ensure NIST SP 800-88 purge or physical punch through NAND chip.",
                    "Material Routing: Send logic boards to MPCB-licensed smelters (Kupwad MIDC Phase 2)."
                ]
            },
            {
                "class_name": "laptop",
                "category": "Personal Computing & Displays",
                "hazard_level": "High",
                "material_composition": "35% Aluminum/Magnesium alloy, 25% LCD/Glass, 20% Li-ion Battery pack, 15% Circuitry, 5% Plastics",
                "valuable_metals": "Gold (0.22g), Silver (1.1g), Copper (220g), Tantalum, Neodymium",
                "toxic_materials": "Lithium-ion cells, Mercury (backlight CCFL if older), Lead, Polyvinyl Chloride (PVC)",
                "target_bin": "Hazardous_Battery_Depot",
                "handling_instructions": "PRIORITY: Remove external battery if detachable. Quarantine swollen units in fireproof sand bins. Perform NIST SP 800-88 storage purge.",
                "est_weight_kg": 1.85,
                "co2_offset_kg": 14.20,
                "device_image_url": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80",
                "environmental_alert": "Heavy metals from 1 laptop motherboard can leach Lead and Beryllium into soil, contaminating agricultural fields near open dumping sites.",
                "sub_components": [
                    {
                        "id": "laptop_battery",
                        "name": "Multi-Cell Lithium Battery Array (Pouch or 18650)",
                        "location": "Base Interior / Bottom Casing Slot",
                        "hazardLevel": "High",
                        "badgeColor": "#EF4444",
                        "imageUrl": "https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Long black hard-plastic encased pack or flat internal 3-to-6 cell lithium polymer pouches with multi-pin terminal connector.",
                        "whereItIs": "Located along the front palm-rest interior or bottom rear hinge line.",
                        "materials": "Cobalt, Lithium Nickel Manganese Cobalt Oxide (NMC), Copper, Aluminum, Polypropylene.",
                        "handlingSafety": "PRIORITY: Inspect for swelling ('pillowing'). Swollen battery packs must be immediately quarantined in sand-lined steel bins.",
                        "recyclingProcess": "Discharged under saline brine buffer, mechanically dismantled, and hydrometallurgically refined for cobalt and nickel cathodes."
                    },
                    {
                        "id": "laptop_motherboard",
                        "name": "Mainboard & Copper Sintered Heat Pipe Assembly",
                        "location": "Chassis Base under Keyboard",
                        "hazardLevel": "Medium",
                        "badgeColor": "#F59E0B",
                        "imageUrl": "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Large green or blue multi-layer PCB fitted with prominent orange copper heat sink tubes, aluminum cooling fins, and gold-plated RAM/PCIe edge contacts.",
                        "whereItIs": "Spans the majority of the bottom laptop deck beneath the keyboard.",
                        "materials": "Copper (up to 250g), Gold (0.22g), Silver (1.1g), Tantalum, Silicon, Bismuth.",
                        "handlingSafety": "Clean dried thermal paste with isopropyl alcohol. Unclip copper heat pipe carefully without kinking.",
                        "recyclingProcess": "Clean copper tubes routed to copper refining; motherboard shredded and fed to smelting furnace for high recovery rate of noble metals."
                    },
                    {
                        "id": "laptop_display",
                        "name": "TFT LCD / IPS Display Panel",
                        "location": "Top Clamshell Lid",
                        "hazardLevel": "Medium",
                        "badgeColor": "#F59E0B",
                        "imageUrl": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Thin glass LCD panel with aluminum rear housing and LVDS/eDP high-density flex connector.",
                        "whereItIs": "Housed inside the hinged display lid.",
                        "materials": "Indium Tin Oxide, Optical polymer film, CCFL (Mercury trace in pre-2012 models) or LED backlights.",
                        "handlingSafety": "WARNING: If handling vintage laptops with CCFL tubes, do NOT break the thin backlight tubes to avoid mercury vapor release.",
                        "recyclingProcess": "Thermal treatment to capture trace mercury vapor; optical glass recycled into industrial reflective beads."
                    },
                    {
                        "id": "laptop_storage",
                        "name": "Solid State Drive (M.2 NVMe) / Mechanical HDD",
                        "location": "Dedicated Storage Bay on Motherboard",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Green/black rectangular circuit stick (M.2) or 2.5-inch metal enclosure (SATA SSD/HDD).",
                        "whereItIs": "Mounted in PCIe slot beside RAM modules.",
                        "materials": "NAND flash chips with gold wire bonds, controller IC, aluminum casing.",
                        "handlingSafety": "Mandatory data purge: Execute cryptographic wipe or punch physical holes through flash ICs before shredding.",
                        "recyclingProcess": "High-purity chemical leaching of gold and palladium contacts."
                    }
                ],
                "disassembly_steps": [
                    "1. Remove bottom base Torx/Phillips screws and lift laptop lower deck.",
                    "2. Detach battery cable from mainboard immediately to prevent short-circuits.",
                    "3. Unscrew and remove the battery pack; inspect cells for swelling.",
                    "4. Remove M.2 SSD stick and RAM modules; store in anti-static bag.",
                    "5. Detach copper cooling assembly and unscrew the motherboard."
                ],
                "recycling_protocols": [
                    "Segregation: Route Li-ion battery to Hazardous_Battery_Depot with kapton-taped terminals.",
                    "Copper Reclamation: Strip pure copper heat-pipes into Complex_E-Waste_Vault for dedicated copper furnace.",
                    "Aluminum Chassis: Secondary recycling directly saves 95% energy versus virgin bauxite extraction."
                ]
            },
            {
                "class_name": "keyboard",
                "category": "Peripheral & Human Interface Devices",
                "hazard_level": "Low",
                "material_composition": "70% ABS/PBT Engineering Plastics, 20% Membrane/Steel Plate, 10% Copper wiring",
                "valuable_metals": "Copper wiring (45g), Nickel plating, Trace Tin",
                "toxic_materials": "Brominated Flame Retardants (BFR), Trace Phthalates",
                "target_bin": "Shredder_Feed_Plastic",
                "handling_instructions": "Snip cable connector. Mechanical shredding safe. Separate keycaps for thermoplastic polymer pelletization.",
                "est_weight_kg": 0.65,
                "co2_offset_kg": 1.10,
                "device_image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
                "environmental_alert": "PVC cable coatings release toxic dioxins if illegally burnt by scrap scavengers for copper extraction. Certified mechanical granulators must be used.",
                "sub_components": [
                    {
                        "id": "kb_keycaps",
                        "name": "Injection Molded ABS / PBT Keycaps",
                        "location": "Top Exterior Typing Surface",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Individual molded plastic keycaps with laser-etched or double-shot legends.",
                        "whereItIs": "Mounted onto individual switches or rubber domes.",
                        "materials": "100% Acrylonitrile Butadiene Styrene (ABS) or Polybutylene Terephthalate (PBT).",
                        "handlingSafety": "Safe for manual handling. Pull off keycaps with a wire keycap puller for rapid polymer sorting.",
                        "recyclingProcess": "Optical sorting, mechanical shredding, and extrusion into high-purity recycled plastic pellets for automotive parts."
                    },
                    {
                        "id": "kb_membrane",
                        "name": "Flexible Printed Circuit Membrane / Switch PCB",
                        "location": "Interior Center Layer",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Three-layer clear PET flexible film printed with silver conductive ink tracks, or a rigid green FR-4 switch plate.",
                        "whereItIs": "Spans the complete internal surface underneath the keys.",
                        "materials": "Silver conductive ink traces, PET polyester film, or FR-4 laminate with copper tracks.",
                        "handlingSafety": "Safe for mechanical shredding.",
                        "recyclingProcess": "Pyrometallurgical incineration of polymer film with baghouse filter capture of silver residue."
                    },
                    {
                        "id": "kb_cable",
                        "name": "Braided Copper Cable & USB Connector",
                        "location": "Rear Interface Lead",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
                        "appearance": "1.8m rubberized or braided cable with 4-to-5 internal color-coded copper stranded wires.",
                        "whereItIs": "Exits from the top rear of the keyboard.",
                        "materials": "Electrolytic Tough Pitch (ETP) Copper (approx 45g), PVC/TPE jacket, Nickel-plated USB plug.",
                        "handlingSafety": "Snip cord close to the housing with cable cutters.",
                        "recyclingProcess": "Granulation through mechanical wire stripper; copper granulate yields 99.8% purity for electrical wiring re-manufacturing."
                    }
                ],
                "disassembly_steps": [
                    "1. Remove rear chassis screws and snap apart top and bottom clamshell plastic housings.",
                    "2. Snip USB connection wire and pull out steel weight plate (if mechanical).",
                    "3. Separate clear conductive membrane sheets from rubber dome array."
                ],
                "recycling_protocols": [
                    "Plastic Granulation: Route ABS top casing and keycaps to thermoplastic pelletizer.",
                    "Metal Recovery: Steel backplate sorted via magnetic conveyor belt."
                ]
            },
            {
                "class_name": "mouse",
                "category": "Peripheral & Optical Devices",
                "hazard_level": "Low",
                "material_composition": "65% Injection Molded ABS, 25% FR-4 PCB & Optical Sensor, 10% Copper cable",
                "valuable_metals": "Copper (18g), Gold trace in micro-switches, Tin",
                "toxic_materials": "Brominated Flame Retardants, Lead in older soldering",
                "target_bin": "Shredder_Feed_Plastic",
                "handling_instructions": "Remove AA/AAA alkaline batteries if wireless. Clip braided cables. Route plastic shell to secondary recycling.",
                "est_weight_kg": 0.12,
                "co2_offset_kg": 0.45,
                "device_image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
                "environmental_alert": "Neglected alkaline batteries left inside mice leak corrosive caustic potassium hydroxide into municipal waste streams.",
                "sub_components": [
                    {
                        "id": "mouse_sensor",
                        "name": "Optical / Laser Tracking Sensor & Micro-Switches",
                        "location": "Lower Internal PCB Base",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Small single-sided circuit board with red/infrared LED emitter, miniature sensor chip with optic lens, and 2 click micro-switches.",
                        "whereItIs": "Mounted flat onto the bottom base plate of the mouse.",
                        "materials": "FR-4 PCB, Copper traces, Gold-alloy micro-switch contact rivets, LED diode.",
                        "handlingSafety": "If wireless, inspect battery compartment for alkaline corrosion (white potassium carbonate powder); neutralize with vinegar.",
                        "recyclingProcess": "PCB smelting for copper and precious metals recovery."
                    },
                    {
                        "id": "mouse_shell",
                        "name": "Injection Molded Ergonomic ABS Enclosure",
                        "location": "Outer Palm Rest & Bottom Glides",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Contoured plastic shell with rubberized side grips and PTFE glide feet.",
                        "whereItIs": "Surrounds all electronic components.",
                        "materials": "ABS plastic, Silicone rubber scroll ring, PTFE glides.",
                        "handlingSafety": "Safe for manual disassembly and direct mechanical shredding.",
                        "recyclingProcess": "Washed, shredded, and pelletized into secondary engineering plastics."
                    }
                ],
                "disassembly_steps": [
                    "1. Peel off bottom PTFE glide skates to reveal hidden Phillips screws.",
                    "2. Remove 2 to 4 screws and lift top ergonomic palm shell.",
                    "3. Disconnect scroll wheel axle from rotary encoder.",
                    "4. Slide out main sensor PCB."
                ],
                "recycling_protocols": [
                    "Battery Inspection: Check for disposable AA/AAA batteries in wireless mice; route to alkaline depot.",
                    "Plastic Shredder: Route empty plastic chassis to Shredder_Feed_Plastic bin."
                ]
            },
            {
                "class_name": "pd",
                "category": "Solid State Storage & Flash Memory",
                "hazard_level": "Low",
                "material_composition": "45% Aluminum/Zinc alloy casing, 40% Silicon NAND flash/Controller, 15% Copper substrate",
                "valuable_metals": "Gold bond wires (0.005g), Silver solder, Copper substrate",
                "toxic_materials": "Trace Antimony trioxide in epoxy mold, Lead",
                "target_bin": "Precious_Metals_Bin",
                "handling_instructions": "Ensure cryptographic zero-fill or physical punch degaussing before chemical hydrometallurgical gold recovery.",
                "est_weight_kg": 0.03,
                "co2_offset_kg": 0.30,
                "device_image_url": "https://images.unsplash.com/photo-1618761714958-0ef713cdb885?auto=format&fit=crop&w=600&q=80",
                "environmental_alert": "Over 10,000 flash drives contain up to 50 grams of recoverable high-purity gold that would otherwise require mining 10 tons of virgin gold ore.",
                "sub_components": [
                    {
                        "id": "pd_nand",
                        "name": "NAND Flash Memory IC & Controller Chip",
                        "location": "Center of Internal Substrate",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Black epoxy-encapsulated rectangular integrated circuit chip with microscopic gold bonding wires inside.",
                        "whereItIs": "Surface-mounted onto the small internal circuit stick.",
                        "materials": "Gold bonding wires (0.005g), Silicon wafer, Silver conductive adhesive, Copper substrate.",
                        "handlingSafety": "MANDATORY PRIVACY CHECK: Execute zero-fill wiping or physically punch/drill the NAND chip to prevent citizen identity theft before recycling.",
                        "recyclingProcess": "Hydrometallurgical chemical extraction with aqua regia/electrowinning to recover high-purity gold and silver."
                    },
                    {
                        "id": "pd_connector",
                        "name": "USB-A / USB-C Male Metal Housing & Contacts",
                        "location": "Front Plug Interface",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Rectangular or oval nickel-plated steel sleeve enclosing 4 to 24 gold-plated copper contact pins.",
                        "whereItIs": "Protrudes from the front of the flash drive.",
                        "materials": "Nickel-plated brass/steel, 30-50 micro-inch Gold electroplating over phosphor bronze.",
                        "handlingSafety": "Safe for manual handling.",
                        "recyclingProcess": "Electrolytic gold stripping baths strip gold plating cleanly without dissolving base copper."
                    }
                ],
                "disassembly_steps": [
                    "1. Slide or pry metal outer swivel jacket / plastic casing.",
                    "2. Remove internal monolithic flash board.",
                    "3. Mechanically verify data destruction prior to precious metals smelting."
                ],
                "recycling_protocols": [
                    "Precious Metals Sorting: Route directly into Precious_Metals_Bin for chemical refining.",
                    "Metal Casing: Aluminum swivels separated into non-ferrous metal stream."
                ]
            },
            {
                "class_name": "earbud",
                "category": "Miniature Audio & Micro-Wearables",
                "hazard_level": "High",
                "material_composition": "45% Polycarbonate enclosure, 30% Micro Li-ion button cell, 15% Neodymium magnets, 10% Copper coil",
                "valuable_metals": "Neodymium (N52 magnets), Copper micro-coils, Gold contact pins",
                "toxic_materials": "Lithium Nickel Manganese Cobalt (NMC) micro-cells, Electrolyte irritants",
                "target_bin": "Hazardous_Battery_Depot",
                "handling_instructions": "WARNING: High thermal-runaway risk due to micro-lithium coin cells. Do not crush. Submerge damaged cells in vermiculite.",
                "est_weight_kg": 0.05,
                "co2_offset_kg": 0.85,
                "device_image_url": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80",
                "environmental_alert": "Over 80% of discarded earbuds end up incinerated or in open landfills, releasing toxic cobalt dust and fluorinated greenhouse gases.",
                "sub_components": [
                    {
                        "id": "earbud_coin_cell",
                        "name": "Micro Lithium Button Cell (LIR1254/1054)",
                        "location": "Inside Earbud Acoustic Head Pod",
                        "hazardLevel": "High",
                        "badgeColor": "#EF4444",
                        "imageUrl": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Tiny shiny circular metallic coin cell with positive/negative welded nickel tabs.",
                        "whereItIs": "Embedded deeply inside the sealed ultrasonic-welded earbud acoustic bulb.",
                        "materials": "Lithium Nickel Manganese Cobalt Oxide, Nickel, Copper, Polymer electrolyte.",
                        "handlingSafety": "EXTREME RISK: Never crush earbuds in standard industrial plastic shredders! The tiny coin cell will burst into flames upon mechanical impact. Requires non-destructive manual crack opening.",
                        "recyclingProcess": "Manual splitting under inert nitrogen atmosphere, followed by hydrometallurgical cobalt reclamation."
                    },
                    {
                        "id": "earbud_driver",
                        "name": "Micro Dynamic Driver & N52 Magnet",
                        "location": "Front Sound Nozzle",
                        "hazardLevel": "Low",
                        "badgeColor": "#10B981",
                        "imageUrl": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
                        "appearance": "Tiny 6mm-11mm circular speaker diaphragm surrounded by ultra-strong silver neodymium magnet ring and copper micro-coils.",
                        "whereItIs": "Directly behind the acoustic silicone ear tip grille.",
                        "materials": "Grade N52 Neodymium (NdFeB), Copper micro-wire, Titanium diaphragm coating.",
                        "handlingSafety": "High magnetic intensity; do not place near magnetic storage media or credit cards.",
                        "recyclingProcess": "High-temperature demagnetization followed by chemical separation of rare earth Neodymium and Praseodymium."
                    },
                    {
                        "id": "case_battery",
                        "name": "Charging Case Lithium Pouch Battery & Board",
                        "location": "Base of Charging Case",
                        "hazardLevel": "High",
                        "badgeColor": "#EF4444",
                        "imageUrl": "https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?auto=format&fit=crop&w=600&q=80",
                        "appearance": "300-500mAh rectangular lithium pouch cell wired to a USB-C / Lightning charging circuit board with gold-plated spring pins.",
                        "whereItIs": "Glued inside the bottom cavity of the earbud charging cradle.",
                        "materials": "Lithium Polymer cell, Gold pogo-pins, Copper trace PCB.",
                        "handlingSafety": "Use plastic spudger to pry battery away from adhesive; do not puncture foil skin.",
                        "recyclingProcess": "Standard battery recycling and gold contact pins hydrometallurgical leaching."
                    }
                ],
                "disassembly_steps": [
                    "1. Apply gentle heat (65°C) to earbud seam line to loosen cyanoacrylate adhesive.",
                    "2. Use nylon pry tool to split acoustic head from stem without touching the button cell.",
                    "3. Desolder battery ribbon leads cleanly; insulate cell with non-conductive electrical tape.",
                    "4. Pry charging case bottom insert and extract the main battery pack."
                ],
                "recycling_protocols": [
                    "Segregation: Place micro-cells and case battery in fire-resistant vermiculite-filled container.",
                    "Plastic Shells: Route clean polycarbonate casing to polymer pelletizer."
                ]
            }
        ]

        for item in raw_components_data:
            cname = item["class_name"]
            existing = db.query(Component).filter(Component.class_name == cname).first()
            if existing:
                existing.category = item["category"]
                existing.hazard_level = item["hazard_level"]
                existing.material_composition = item["material_composition"]
                existing.valuable_metals = item["valuable_metals"]
                existing.toxic_materials = item["toxic_materials"]
                existing.target_bin = item["target_bin"]
                existing.handling_instructions = item["handling_instructions"]
                existing.est_weight_kg = item["est_weight_kg"]
                existing.co2_offset_kg = item["co2_offset_kg"]
                existing.device_image_url = item["device_image_url"]
                existing.environmental_alert = item["environmental_alert"]
                existing.sub_components_json = json.dumps(item["sub_components"])
                existing.disassembly_steps_json = json.dumps(item["disassembly_steps"])
                existing.recycling_protocols_json = json.dumps(item["recycling_protocols"])
            else:
                new_c = Component(
                    class_name=cname,
                    category=item["category"],
                    hazard_level=item["hazard_level"],
                    material_composition=item["material_composition"],
                    valuable_metals=item["valuable_metals"],
                    toxic_materials=item["toxic_materials"],
                    target_bin=item["target_bin"],
                    handling_instructions=item["handling_instructions"],
                    est_weight_kg=item["est_weight_kg"],
                    co2_offset_kg=item["co2_offset_kg"],
                    device_image_url=item["device_image_url"],
                    environmental_alert=item["environmental_alert"],
                    sub_components_json=json.dumps(item["sub_components"]),
                    disassembly_steps_json=json.dumps(item["disassembly_steps"]),
                    recycling_protocols_json=json.dumps(item["recycling_protocols"])
                )
                db.add(new_c)
        db.commit()
        print("6 Core Components seeded and enriched with full visual breakdowns.")

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
