# Healthcare AI System (HealthSetu)

## Project Overview
Healthcare AI System (HealthSetu) is a full-stack case management and diagnosis support platform for:
- Villagers
- ASHA workers
- Doctors
- Admins

It provides role-based dashboards, case intake, symptom tracking, image-assisted machine analysis, alerts, reports, and user management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Router |
| Backend API | Node.js, Express, JWT Auth |
| Database | MongoDB (Mongoose models) |
| Optional DB Schema | Supabase SQL migration files (for schema reference/workflow) |
| ML Module | Python (Pillow, NumPy, scikit-learn, joblib) |
| Icons/UI | lucide-react |

---

## Core Features (Complete)

| Module | Feature | Description | Roles |
|---|---|---|---|
| Authentication | Register/Login | JWT-based auth with role assignment | All |
| Authentication | Session Check | Current user profile retrieval via token | All |
| Access Control | Protected Routes | Route guards with role-based restrictions | All |
| Dashboard | Role-based Navigation | Sidebar menu changes by role | All |
| Case Management | Create Case | Villager can create case with title, description, symptoms, images | Villager |
| Case Management | My Cases | Villager-specific case list | Villager |
| Case Management | All Cases | Staff view for all accessible cases | ASHA, Doctor, Admin |
| Case Management | Case Details | Detailed case view with symptoms and diagnosis summary | All (authorized) |
| Case Management | Case Assignment | Assign case to medical staff | ASHA, Doctor, Admin |
| Symptoms | Symptom Capture | Add symptom name, severity, and duration | Villager |
| Diagnosis | Normal Result | Derived diagnosis summary based on case name/description/symptoms | All (authorized) |
| Diagnosis | Machine Result | Image-based prediction flow from uploaded images | Villager, ASHA, Admin (via diagnosis page) |
| ML Integration | Python Inference | Express route calls Python model for image analysis | Backend |
| Alerts | Alert Feed | User alert listing and unread filtering | All |
| Alerts | Mark Read/Read All | Update alert read status | All |
| Reports | Summary Report | Aggregated stats (cases, severe cases, resolved, etc.) | ASHA, Doctor, Admin |
| User Management | User Listing | View users with filtering | Admin |
| User Management | Edit User | Update profile role/name/contact/village | Admin |
| User Management | Block/Unblock | Administrative account control with reason/duration | Admin |
| Settings/Profile | Profile Update | Update own profile details | All |
| Progress Tracking | Progress Page | Track case progression workflow | Villager, ASHA |
| Decision Engine | Classification Queue | Queue and classify pending cases | ASHA, Admin |

---

## Role-wise Navigation Features

| Role | Available Navigation Items |
|---|---|
| Villager | Dashboard, Create Case, My Cases, Diagnosis, Progress Tracking, Alerts, Settings |
| ASHA Worker | Dashboard, All Cases, Diagnosis, Decision Engine, Progress Tracking, Alerts, Reports, Settings |
| Doctor | Dashboard, All Cases, Alerts, Reports, Settings |
| Admin | Dashboard, All Cases, Diagnosis, Decision Engine, Alerts, Reports, User Management, Settings |

---

## Frontend Routes

| Route | Page | Access |
|---|---|---|
| / | Home | Public |
| /login | Login | Public |
| /register | Register | Public |
| /unauthorized | Unauthorized | Public |
| /dashboard | Dashboard | Authenticated |
| /create-case | Create Case | Villager |
| /my-cases | My Cases | Villager |
| /cases | All Cases | ASHA, Doctor, Admin |
| /case/:id | Case Details | Authenticated (authorized case access) |
| /ai-prediction | Diagnosis | Authenticated |
| /decision-engine | Decision Engine | ASHA, Doctor, Admin |
| /progress | Progress | Authenticated |
| /alerts | Alerts | Authenticated |
| /reports | Reports | ASHA, Doctor, Admin |
| /users | User Management | Admin |
| /settings | Settings | Authenticated |

---

## Backend API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health | Health check |
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current auth user |
| GET | /api/dashboard/stats | Dashboard stats |
| POST | /api/cases | Create case |
| GET | /api/cases | List accessible cases |
| GET | /api/cases/me | List villager cases |
| GET | /api/cases/selectable | Case dropdown list |
| GET | /api/cases/:id | Case details |
| GET | /api/cases/:id/symptoms | Case symptoms |
| PATCH | /api/cases/:id/assign | Assign case |
| GET | /api/cases/decision-queue | Decision queue |
| POST | /api/cases/:id/classify | Classify case |
| GET | /api/predictions/latest/:caseId | Get latest prediction |
| POST | /api/predictions/generate | Generate prediction |
| POST | /api/predictions | Save prediction manually |
| POST | /api/ml/predict-image | Image-based machine prediction |
| GET | /api/alerts | List alerts |
| PATCH | /api/alerts/:id/read | Mark one alert read |
| PATCH | /api/alerts/read-all | Mark all alerts read |
| GET | /api/reports/summary | Summary report |
| GET | /api/users | List users |
| GET | /api/users/:id | User details |
| PATCH | /api/users/:id | Update user |
| POST | /api/users/:id/block | Block user |
| POST | /api/users/:id/unblock | Unblock user |
| PATCH | /api/profile/me | Update own profile |

---

## Data Models (MongoDB)

| Model | Key Fields |
|---|---|
| User | email, passwordHash, full_name, role, phone_number, village, blocked fields |
| Case | user_id, title, description, status, severity, image_url, images[], assigned_to |
| Symptom | case_id, symptom_name, severity, duration_days |
| Prediction | case_id, disease_name, confidence_score, recommended_action |
| Alert | user_id, case_id, alert_type, message, is_read |

---

## ML Module Notes

| Item | Current Behavior |
|---|---|
| Model Script | backend/ml/disease_classifier.py |
| Inference Route | /api/ml/predict-image |
| Input | One or more uploaded images (base64 payload) |
| Output | disease_name, confidence_score, recommended_action, top_predictions |
| Dataset Requirement | Labeled folders inside supabase/dataset (one folder per disease class) |
| Safety Rule | Unlabeled flat datasets are rejected to avoid fake/random class mapping |

---

## Project Structure

| Path | Purpose |
|---|---|
| src/ | React app source |
| src/pages/ | Screens and dashboard pages |
| src/components/ | Shared components/layout |
| src/contexts/ | Auth context |
| src/lib/ | API and utility clients |
| backend/server.js | Express API server |
| backend/ml/ | Python ML scripts and artifacts |
| supabase/migrations/ | SQL schema and policies |
| images/ | Static/media assets |

---

## Environment Variables

### Frontend (.env)

| Variable | Description |
|---|---|
| VITE_API_BASE_URL | Backend API base URL (default localhost:4000/api fallback in code) |
| VITE_SUPABASE_URL | Optional Supabase URL |
| VITE_SUPABASE_ANON_KEY | Optional Supabase anon key |

### Backend (backend/.env)

| Variable | Description |
|---|---|
| PORT | Backend port (default 4000) |
| JWT_SECRET | JWT signing secret |
| FRONTEND_ORIGIN | Allowed frontend origin for CORS |
| MONGODB_URI | MongoDB connection URI |
| GROQ_API_KEY | Optional AI provider key for text prediction workflow |
| GROQ_MODEL | Optional model name |
| PYTHON_BIN | Python executable path if needed |

---

## Local Setup

### 1) Install frontend dependencies
```bash
npm install
```

### 2) Install backend dependencies
```bash
cd backend
npm install
```

### 3) Start backend
```bash
cd backend
npm start
```

### 4) Start frontend
```bash
npm run dev
```

### 5) Optional production build
```bash
npm run build
```

---

## Important Operational Notes

| Topic | Note |
|---|---|
| Backend Restarts | After backend code changes, restart backend to load new API routes |
| ML Accuracy | For meaningful disease classification, dataset must be correctly labeled by class folders |
| Diagnosis in Case Details | Case Details shows normal diagnosis summary derived from case content |
| Machine Diagnosis Save | Machine image prediction is saved against selected case for audit/history |

---

## Current Status

| Area | Status |
|---|---|
| Frontend build | Passing |
| Role-based navigation | Implemented |
| Case management flow | Implemented |
| Diagnosis (normal + machine) | Implemented |
| Alerts, reports, user admin | Implemented |
| ML labeled-dataset guard | Implemented |

---

If you want, I can also generate an API reference section with sample request/response JSON for each endpoint.
