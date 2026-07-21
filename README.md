# AI-Powered Urban Air Quality Intelligence for Smart City Intervention 🌍💨

**An AI-powered Urban Air Quality Intelligence Platform** for detecting pollution hotspots, probabilistic source attribution, hyperlocal AQI forecasting, and automated enforcement recommendations.

![AirTrace AI](https://img.shields.io/badge/AirTrace-AI-3A536B?style=flat-square)
![Version](https://img.shields.io/badge/version-2.4.0-blue?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)

---

## 📋 Overview

AirTrace AI is a comprehensive environmental intelligence platform built for **Bengaluru, India** that leverages **real-time sensor data**, **satellite imagery**, and **AI/ML models** (including **Google Gemini**) to:

- 📊 **Monitor** real-time Air Quality Index (AQI) across 12 municipal wards
- 🔥 **Detect** pollution hotspots with geospatial accuracy
- 🔍 **Attribute** pollution sources (traffic, construction, industry, waste burning, road dust)
- 📈 **Forecast** hyperlocal AQI 24 hours in advance
- 🚔 **Automate** enforcement recommendations and inspector dispatch
- 👥 **Empower** citizens to file pollution complaints with image evidence

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18
- **npm** or **bun**
- A **Firebase project** (for cloud sync)

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure Firebase (optional, for cloud sync)
# Create firebase-applet-config.json with your Firebase credentials:
# {
#   "apiKey": "AIzaSy...",
#   "authDomain": "your-app.firebaseapp.com",
#   "projectId": "your-project-id",
#   "storageBucket": "your-app.appspot.com",
#   "messagingSenderId": "1234567890",
#   "appId": "1:123456:web:abc123"
# }

# 3. Start the development server
npm run dev

# 4. Open in browser
open http://localhost:3000
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run clean` | Clean build artifacts |
| `npm run lint` | Run TypeScript type checking |

## 🏗️ Architecture

```
airtrace-ai/
├── server.ts                    # Express backend + Vite middleware
├── firebase-applet-config.json  # Firebase credentials
├── AirTrace_AI_Live_Data.xlsx   # Live Excel sync workbook
├── src/
│   ├── App.tsx                  # Root React application
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Global styles (Tailwind CSS v4)
│   ├── types.ts                 # TypeScript type definitions
│   ├── lib/
│   │   ├── firebaseService.ts   # Client-side Firebase/Firestore
│   │   └── geoUtils.ts          # Geospatial utility functions
│   ├── components/
│   │   ├── AQIMap.tsx           # Leaflet map with AQI heatmap
│   │   ├── AnalystCenter.tsx    # AI analytics & Gemini explanations
│   │   ├── CitizenPortal.tsx    # Citizen complaint filing portal
│   │   ├── DatabaseManager.tsx   # CRUD data management UI
│   │   ├── DataManagement.tsx   # Data management dashboard
│   │   ├── DatasetManager.tsx   # Dataset import/export
│   │   ├── EnforcementInspector.tsx  # Inspector dashboard
│   │   ├── EnforcementQueue.tsx  # Priority enforcement queue
│   │   ├── ForecastChart.tsx    # AQI prediction charts (Recharts)
│   │   ├── GisTelemetryHud.tsx  # Real-time GIS telemetry HUD
│   │   ├── LoginModal.tsx       # Authentication modal
│   │   ├── MapSearch.tsx        # GIS location search
│   │   ├── SourceAttributionCard.tsx  # Source pie chart
│   │   └── ValidationAnalytics.tsx    # Data validation analytics
│   └── server/
│       ├── db.ts                # In-memory DB with JSON persistence
│       ├── data.json            # Persisted database
│       ├── gemini.ts            # Google Gemini AI integration
│       ├── liveData.ts          # Open-Meteo & Nominatim API calls
│       └── syncManager.ts       # Firebase ↔ Excel ↔ DB sync
├── firebase-blueprint.json      # Firestore schema blueprint
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## 🔥 Firebase Integration

### Firestore Collections

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `wards/{wardId}` | e.g., `w-1` | Municipal ward data with AQI |
| `pollution_complaints/{complaintId}` | e.g., `AQI-2026-000145` | Citizen pollution complaints |
| `enforcement_queue/{recommendationId}` | e.g., `rc-w-1-2026-07-29` | Enforcement dispatch tasks |

### Sync Architecture

```
User Browser (React)                  Node.js Server                    Firebase Cloud
      │                                     │                              │
      │  POST /api/complaints               │                              │
      ├─────────────────────────────────────►                              │
      │                                     │  writeBatch()               │
      │                                     ├─────────────────────────────►│
      │                                     │                              │
      │                                     │  writeLiveExcel()           │
      │                                     ├───► AirTrace_AI_Live.xlsx   │
      │                                     │                              │
      │  onSnapshot() ◄─────────────────────┤  onSnapshot() ◄─────────────┤
      │  (real-time)                        │  (real-time)                │
```

### Configuration Methods

**1. Create `firebase-applet-config.json` manually** (recommended):

```json
{
  "apiKey": "AIzaSyBmahH5o0QS7aLaPxdoEq0eOHEqnI-j11Y",
  "authDomain": "airtrace-4da68.firebaseapp.com",
  "projectId": "airtrace-4da68",
  "storageBucket": "airtrace-4da68.firebasestorage.app",
  "messagingSenderId": "284768957497",
  "appId": "1:284768957497:web:1fc33f503373911a5bc9e8",
  "measurementId": "G-BLRW8R12NB"
}
```

**2. POST via API** (while server is running):

```bash
curl -X POST http://localhost:3000/api/config/firebase \
  -H "Content-Type: application/json" \
  -d @firebase-applet-config.json
```

**3. Check config status:**

```bash
curl http://localhost:3000/api/config/firebase
```

## 📡 REST API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| GET | `/api/auth/me` | Get current logged-in user |
| POST | `/api/auth/logout` | Logout user |

### Air Quality Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/aqi/live` | Latest AQI for all wards |
| GET | `/api/aqi/history?wardId=w-1&limit=30` | Historical AQI records |
| GET | `/api/weather?wardId=w-1` | Latest weather data |
| GET | `/api/traffic?wardId=w-1` | Traffic density data |

### AI & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hotspots` | Current pollution hotspots |
| GET | `/api/source-attribution` | Pollution source attribution |
| GET | `/api/forecast` | 24-hour AQI predictions |
| POST | `/api/gemini/explain` | AI-powered diagnostic analysis |
| POST | `/api/gemini/advisory` | Citizen health advisory |

### Enforcement

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations` | Enforcement queue |
| POST | `/api/recommendations/:id/status` | Update enforcement status |

### Citizen Complaints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/complaints` | All citizen complaints |
| POST | `/api/complaints` | Submit a new complaint |
| POST | `/api/complaints/:id/status` | Update complaint status |

### Reports & Exports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/excel` | Download Excel workbook |
| GET | `/api/reports/csv` | Download CSV data dump |
| GET | `/api/reports/complaints-csv` | Download complaints CSV |

### GIS & Live Telemetry

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gis/search?q=Koramangala` | Search locations via OSM |
| GET | `/api/gis/data?lat=12.9352&lng=77.6244` | Live environmental telemetry |

### Data Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/records/:type` | Create record (aqi, weather, traffic, etc.) |
| PUT | `/api/records/:type/:id` | Update record |
| DELETE | `/api/records/:type/:id` | Delete record |

### Dashboard & Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Dashboard aggregates |
| GET | `/api/citizen-alerts` | AQI threshold alerts |
| GET | `/api/audit-logs` | Recent audit log entries |

## 🧠 AI/ML Pipeline

The platform runs an automated ML pipeline every **5 minutes** that:

1. **Hotspot Detection** — Identifies pollution clusters using real-time AQI data
2. **Source Attribution** — Calculates probabilistic contributions from 5 source categories
3. **AQI Forecasting** — Predicts next 24-hour AQI using temporal/weather factors
4. **Enforcement Scoring** — Ranks wards by priority (0–100) based on:
   - AQI severity
   - Population density
   - Vulnerable infrastructure (schools, hospitals)
   - Predicted AQI trend
   - Source attribution confidence

## 🧪 Simulated Environment Data

The system seeds **30 days of realistic historical data** for Bengaluru including:

- **12 municipal wards** with polygon boundaries
- **8 CACQM stations**
- **5 industrial facilities**
- **10+ pre-seeded enforcement cases** with various statuses (pending, dispatched, resolved, dismissed)
- **Citizen complaints** with timestamps and images
- **Weather, traffic, construction, and waste burning** records with daily temporal patterns

## 🔒 User Roles

| Role | Username | Password | Capabilities |
|------|----------|----------|--------------|
| **Administrator** | `admin` | (any) | Full system access, audit logs |
| **Municipal Officer** | `officer_smartcity` | (any) | Ward management, complaints |
| **Pollution Control Officer** | `officer_pollution` | (any) | Enforcement queue, inspections |
| **Analyst** | `analyst_science` | (any) | AI analytics, reports, forecasts |
| **Citizen** | `citizen_demo` | (any) | File complaints, view AQI |

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Framer Motion |
| **Maps** | Leaflet, OpenStreetMap Nominatim |
| **Charts** | Recharts |
| **Backend** | Express.js, Node.js |
| **AI** | Google Gemini API, Open-Meteo Air Quality API |
| **Database** | In-memory with JSON persistence, Firebase Firestore |
| **Sync** | Real-time bidirectional (Firestore ↔ DB ↔ Excel) |
| **Build** | Vite, esbuild, tsx |
| **Icons** | Lucide React |

## 📁 Data Flow

```
External APIs                          AirTrace AI Server
─────────────                          ────────────────
Open-Meteo (AQI + Weather) ──────►  fetchLiveEnvironmentalData()
                                         │
OpenStreetMap Nominatim ──────────►  fetchLiveReverseGeocode()
                                         │
Google Gemini ─────────────────────►  explainAirQuality()
                                         │
                                    ┌────▼────┐
                                    │ In-Memory │
                                    │ Database   │──► data.json (persistence)
                                    └────┬────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                   Firebase           Excel            REST API
                   Firestore       (.xlsx file)       (JSON/CSV)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Authors

- **Srinivasan S** — Bengaluru Citizen & Project Lead
- **KSPCB Enforcement Team** — Field Operations
- **BBMP Smart City Division** — Municipal Coordination

---

> **AirTrace AI** — Making Bengaluru's air quality transparent, actionable, and healthier for everyone. 🌱


