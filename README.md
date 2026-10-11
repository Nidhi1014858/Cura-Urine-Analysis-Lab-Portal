# Cura — Point-of-Care Urinalysis Portal

**Cura** is a modern React web application for point-of-care urine test strip analysis used by pathology lab technicians and reviewing clinicians. It digitizes strip reading, provides automated non-linear concentration predictions for both **10-panel** and **14-panel** test strips, tags reports with pathology diagnostics company destinations, and manages clinician review workflows end-to-end.

---

## 🌟 Key Features

- **Clinical Diagnostic Aesthetic & Monospace Typography**:
  - Purpose-built clinical design palette with distinct light and dark modes.
  - Monospace font styling for technical parameters, RGB triplets, medical IDs, and timestamps.
  - Reagent pad strip brand motif embedded into the brand identity.

- **Pathology Company / Report Destination Tagging**:
  - Technicians select target pathology diagnostics providers (*Metropolis Healthcare, Dr Lal PathLabs, SRL Diagnostics, Thyrocare Laboratories, or In-house / K J Somaiya Hospital*) during test creation.
  - Displayed prominently on reports and filterable across the reports repository.

- **Dynamic 10-Panel vs. 14-Panel Strip Support**:
  - **10-Panel Core**: Glucose, Protein, pH, Ketones, Blood, Bilirubin, Urobilinogen, Nitrite, Leucocytes, Specific Gravity.
  - **14-Panel Extended**: Adds **Ascorbic Acid, Calcium, Creatinine, and Microalbumin** for early diabetic nephropathy screening.
  - Dynamic RGB pad entry table, live color swatches, and preset shortcuts (*Load Normal*, *Load Pathological*, *Load High Abnormal*).

- **Explicit End-to-End Clinician Review Workflow**:
  - Submitted tests auto-land in the **Clinician Review Queue** (sorted abnormal-first).
  - Dedicated **"Review Now" / "Sign Off"** action directly on the **Report Detail Page** — clinicians can review from either the queue or patient reports.
  - Visual 3-step **Review Status Timeline** (*Submitted → Pending Review → Reviewed/Approved or Flagged*).

- **Patient History & Longitudinal Trend Charts**:
  - Patients page groups all historical tests per patient.
  - Interactive **Recharts trend graph** tracking analyte concentrations over time.
  - **"Re-Test This Patient"** shortcut button that prefills patient demographics into the test wizard.

- **Technician Profile Management**:
  - Edit user credentials, designation, department, and profile photo avatar (data URL persistence).

- **Persistent Dark & Light Mode**:
  - Class-based dark mode (`dark:`) persisted to `localStorage` with anti-flash script in `index.html`.

---

## 🛠️ Architecture & Mock Data Layer

The application isolates all backend communication behind an asynchronous service layer:

- [`src/services/mockApi.js`](src/services/mockApi.js): Simulates a MongoDB-shaped database using `localStorage` (`cura_tests`, `cura_patients`, `cura_users`, `cura_session`).
- [`src/services/predictionEngine.js`](src/services/predictionEngine.js): Stand-in non-linear regression model computing values, units, reference ranges, flags, and confidence scores from pad RGB triplets.
- [`src/services/seedData.js`](src/services/seedData.js): Pre-populates realistic seed data on first run.

### Live Backend & Mock Mode Architecture
The application features a seamless dual-mode architecture controlled by the environment:

- **Live Backend (`VITE_USE_MOCK=false` / default)**: The centralized [`src/services/apiClient.js`](src/services/apiClient.js) and [`src/services/api.js`](src/services/api.js) route requests to the Node.js/Express + Mongoose backend (`http://localhost:5000`) via the Vite `/api` proxy. All auth, patient records, test submissions, batch summaries, and dashboard statistics persist to MongoDB Atlas.
- **Offline Mock Mode (`VITE_USE_MOCK=true`)**: Routes requests to [`src/services/localApi.js`](src/services/localApi.js) using browser `localStorage` and simulated network delay.
- The adapter in [`src/services/mockApi.js`](src/services/mockApi.js) ensures that UI components never need code changes when toggling between live backend and mock mode.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm
- MongoDB Atlas cluster or local MongoDB instance

### Installation & Running Locally

1. Install all dependencies (frontend and backend):
   ```bash
   npm run install:all
   ```

2. Configure environment files:
   - Frontend: create `.env` from `.env.example` (`VITE_USE_MOCK=false`).
   - Backend: create `server/.env` from `server/.env.example` (`PORT=5000`, `MONGO_URI=<your-mongodb-uri>`, `JWT_SECRET=<your-secret>`).

3. Start both frontend and backend concurrently:
   ```bash
   npm run dev:all
   ```
   Or start them in separate terminals:
   ```bash
   # Terminal 1: Backend API (port 5000)
   npm run server

   # Terminal 2: React Frontend (port 3000)
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Build production bundle:
   ```bash
   npm run build
   ```

---

## 🔑 Demo Login Credentials

You can use the quick demo buttons on the login page or enter these credentials:

| Role | Email | Password |
|---|---|---|
| **Lab Technician** | `tech@cura.lab` | `password123` |
| **Clinician Pathologist** | `clinician@cura.lab` | `password123` |

You can also use the **Active Role** switcher in the sidebar to toggle between Technician and Clinician modes instantly during testing.
