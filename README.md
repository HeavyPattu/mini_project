# ReRoute: Edge-AI E-Waste Recycling & Battery Hazard Ecosystem

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF.svg?style=flat&logo=yolo&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_58-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactnative.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Compliance](https://img.shields.io/badge/Compliance-MPCB_Rule_19_Form_6-10B981.svg)](#mpcb-form-6-compliance)

**ReRoute** is an Edge-AI circular economy and mobile ecosystem developed specifically for Tier-2/Tier-3 municipal corporations—piloted in **Sangli-Miraj-Kupwad (SMKC), Maharashtra**. It eliminates informal open dumping, enforces strict lithium-ion battery hazard quarantines, digitizes MPCB Form-6 compliance manifests, and incentivizes citizen participation with digital green certificates.

---

## 📑 Table of Contents

- [Key Capabilities](#-key-capabilities)
- [Target E-Waste Classes](#-target-e-waste-classes)
- [System Architecture](#-system-architecture)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
  - [1. Backend Setup (FastAPI & YOLOv8)](#1-backend-setup-fastapi--yolov8)
  - [2. Mobile App Setup (React Native & Expo Go)](#2-mobile-app-setup-react-native--expo-go)
- [Environment Configuration](#-environment-configuration)
- [API Reference](#-api-reference)
- [Pre-Seeded Demo Credentials](#-pre-seeded-demo-credentials)
- [MPCB Form-6 Compliance](#-mpcb-form-6-compliance)

---

## 🌟 Key Capabilities

### 👤 Citizen / Donor Portal
- **Real-Time Edge-AI Scanner:** Uses custom-trained YOLOv8 weights to instantly classify discarded gadgets from live camera or photo uploads.
- **Audio-Visual Hazard Warning:** Emits acoustic alarms for high thermal-runaway lithium batteries to prevent household bin dumping.
- **Precious Metals & Carbon Valuation:** Calculates recoverable gold, silver, cobalt, and estimated avoided $\text{CO}_2\text{e}$ emissions.
- **Pre-Handover Privacy Checklist:** Guides citizens through factory resets, cloud account unlinking, and SIM/microSD removal.
- **Doorstep Collection Booking:** Generates unique tracking codes (`RR-XXXXX`) for municipal EV collection vans.
- **Digital Green Donor Card:** Visualizes total e-waste diverted and community eco-credits.

### 🏭 Municipal Collection Center & Drive Operator
- **High-Speed Drive Intake:** Color-coded triage tagging physical destination vaults (`[Hazardous_Battery_Depot]`, `[Precious_Metals_Bin]`, `[Shredder_Feed_Plastic]`).
- **Pickup Dispatch Kanban Board:** Manages doorstep collections through `[Pending]` $\rightarrow$ `[Scheduled]` $\rightarrow$ `[Completed]`.
- **WhatsApp Notification Bridge:** Automatically generates pre-formatted WhatsApp status notifications for citizens with one tap.
- **Automated MPCB Form-6 Manifest Generator:** One-click CSV export compliant with Rule 19 of the E-Waste (Management) Rules, 2022.
- **Institutional NAAC Green Audit Certificate:** Generates digitally hashed certificates for universities, schools, and corporate donors.

---

## 🔬 Target E-Waste Classes

| Class | Category | Hazard Level | Target Sorting Bin | Primary Recoverable Elements |
| :--- | :--- | :--- | :--- | :--- |
| **`phone`** | Mobile Telecom & Computing | 🔴 **High** (Li-ion) | `Hazardous_Battery_Depot` | Gold ($0.034\text{g}$), Silver ($0.35\text{g}$), Cobalt, Copper |
| **`laptop`** | Computing & Displays | 🔴 **High** (Li-ion Pack) | `Hazardous_Battery_Depot` | Gold ($0.22\text{g}$), Silver ($1.1\text{g}$), Tantalum, Copper |
| **`earbud`** | Micro-Wearables | 🔴 **High** (Coin Cell) | `Hazardous_Battery_Depot` | Neodymium (N52), Gold Contacts, Copper Coils |
| **`keyboard`** | Peripherals & HID | 🟢 **Low** | `Shredder_Feed_Plastic` | ABS/PBT Polymers, Copper Wiring ($45\text{g}$) |
| **`mouse`** | Peripherals & Optical | 🟢 **Low** | `Shredder_Feed_Plastic` | Injection Molded ABS, FR-4 PCB, Trace Gold |
| **`pd`** | Solid State Flash Storage | 🟡 **Low** | `Precious_Metals_Bin` | NAND Gold Bond Wires, Silver Solder |

---

## 🏛️ System Architecture

```text
[ Citizen / Operator Smartphone ]
           │
           │  (Expo SDK 58 / React Native)
           ▼
   [ Axios API Bridge ] ──── (HTTP / Multipart)
           │
           ▼
[ FastAPI Backend Gateway (Port 8000) ]
   ├── Ultralytics YOLOv8 Nano Inference (`backend/best.pt`)
   ├── SQLite Relational Database (`backend/ewaste_system.db`)
   │      ├── Users (Role-Based Access: Citizen vs SMKC Operator)
   │      ├── Components (Hazard specifications & sorting targets)
   │      ├── DetectionLogs (Audited intake scans)
   │      ├── Pickups (Doorstep logistics)
   │      └── CollectionCenters (Sangli-Miraj geo-hubs)
   ├── MPCB Form-6 Rule 19 Manifest CSV Streamer
   └── Institutional Green Audit Certificate Engine
```

---

## 📂 Project Directory Structure

```
mp_sem5/
├── backend/
│   ├── best.pt                       # Custom trained YOLOv8 model weights
│   ├── ewaste_system.db              # SQLite database (auto-seeded)
│   ├── main.py                       # FastAPI REST API & YOLOv8 Bridge
│   ├── models.py                     # SQLAlchemy ORM database models
│   ├── seed_db.py                    # Database seeder (Sangli-Miraj test data)
│   ├── requirements.txt              # Python backend dependencies
│   ├── .env.example                  # Backend environment template
│   └── .env                          # Local backend environment file
├── mobile-app/                       # React Native Expo mobile application
│   ├── App.js                        # Navigation & authentication root
│   ├── app.json                      # Expo configuration & permissions
│   ├── package.json                  # Dependencies (Expo SDK 58, React 19)
│   ├── .env.example                  # Mobile environment template
│   ├── .env                          # Local mobile environment file
│   └── src/
│       ├── screens/
│       │   ├── AuthScreen.js         # Citizen & Operator Authentication
│       │   ├── DonorHomeScreen.js    # AI Scanner, Hazard Alert & Scheduler
│       │   ├── DonorHubsScreen.js    # Sangli Drop-Off Map & Green ID Card
│       │   ├── OperatorDashboardScreen.js # High-speed drive intake & alarm
│       │   ├── OperatorDispatchScreen.js  # Kanban board & WhatsApp bridge
│       │   └── OperatorAnalyticsScreen.js # MPCB Form-6 CSV & Certificates
│       └── services/
│           └── api.js                # Dynamic LAN & Axios API client
├── .gitignore                        # Standard Git ignore rules
└── README.md                         # Project documentation
```

---

## ⚙️ Prerequisites

- **Python 3.10+** (64-bit)
- **Node.js 18+** & **npm**
- **Expo Go App** installed on Android / iOS (for physical device testing)

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI & YOLOv8)

Open a terminal and run:

```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Initialize and seed the database with Sangli-Miraj collection hubs
python seed_db.py

# Start the FastAPI server (accessible across your LAN)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- **Backend Health Check:** `http://localhost:8000/api/health`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

### 2. Mobile App Setup (React Native & Expo Go)

Open a second terminal window:

```bash
# Navigate to mobile application directory
cd mobile-app

# Install Node dependencies
npm install --legacy-peer-deps

# Start the Expo development server
npx expo start
```

- **Android:** Scan the generated terminal QR code using **Expo Go**.
- **iOS:** Scan the terminal QR code using the default **Camera app**.
- **Web Preview:** Press `w` in the terminal to view in your browser.

> [!TIP]
> If testing on a physical phone, ensure both your phone and PC are connected to the same Wi-Fi. The mobile app automatically detects your computer's IP address.

---

## 🔒 Environment Configuration

### Backend (`backend/.env`)
```ini
PORT=8000
HOST=0.0.0.0
DATABASE_URL=sqlite:///./ewaste_system.db
MODEL_PATH=best.pt
OPERATOR_SECRET_CODE=SMKC-ADMIN
ENVIRONMENT=development
```

### Mobile App (`mobile-app/.env`)
```ini
EXPO_PUBLIC_API_URL=http://<YOUR_COMPUTER_IP>:8000
```

---

## 🔑 Pre-Seeded Demo Credentials

Pre-configured test accounts for instant evaluation and live demonstrations:

| Portal Role | Email | Password | Municipal Secret Code |
| :--- | :--- | :--- | :--- |
| **Citizen Donor** | `donor@reroute.in` | `donor123` | *None (Public Access)* |
| **SMKC Drive Operator** | `admin@smkc.in` | `admin123` | `SMKC-ADMIN` |

---

## 📋 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | User authentication & session token |
| `POST` | `/api/auth/register` | Account registration (Operator requires `SMKC-ADMIN`) |
| `POST` | `/api/scan` | Multipart image upload $\rightarrow$ YOLOv8 detection & hazard triage |
| `GET` | `/api/components` | Reference database of 6 target classes & recovery specs |
| `GET` | `/api/centers` | Geo-locations of Sangli-Miraj collection centers |
| `POST` | `/api/pickups` | Books a citizen doorstep pickup (`RR-XXXXX`) |
| `GET` | `/api/pickups` | Lists pickups for operator dispatch |
| `PATCH`| `/api/pickups/{id}` | Updates pickup status (`pending` $\rightarrow$ `scheduled` $\rightarrow$ `completed`) |
| `GET` | `/api/analytics` | Real-time intake metrics, $\text{CO}_2$ offsets, and bin counts |
| `GET` | `/api/export/form6-csv` | Generates & streams MPCB Form-6 compliance CSV manifest |
| `DELETE`| `/api/analytics/reset` | Flushes shift logs for next intake batch |
| `POST` | `/api/certificates/generate` | Generates NAAC/Institutional Green Audit certificates |

---

## 📜 MPCB Form-6 Compliance

Under Rule 19 of the **E-Waste (Management) Rules, 2022**, transport of segregated hazardous e-waste from collection hubs to authorized recyclers (e.g., Kupwad MIDC Phase-2) mandates a 7-copy Form-6 manifest.

The `/api/export/form6-csv` endpoint programmatically streams a verified manifest containing:
1. Sender & Recycler Authorization Codes
2. Component-level Hazard Classifications
3. Designated storage vault targets
4. Estimated gross weights and net $\text{CO}_2\text{e}$ offset tallies
5. Timestamped chain-of-custody logs

---

## 📄 License

This project is licensed under the MIT License.
