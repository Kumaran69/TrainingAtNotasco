# 🏢 AttritionAI — Employee Attrition Prediction System

A full-stack, real-time employee management and attrition risk prediction system built with modern technologies.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Tailwind CSS v4 + Vite |
| Backend | Python FastAPI + SQLAlchemy |
| Database | PostgreSQL 16 |
| Auth | JWT (bcrypt + python-jose) |
| Real-time | WebSocket |
| Containerization | Docker + Docker Compose |
| Charts | Recharts |

## ✨ Features

### Core (Tasks 1-8)
- ✅ 25+ pre-seeded employees across 6 departments
- ✅ Full CRUD: Add, Search, Update, Delete employees
- ✅ OOP Inheritance: Person → Employee → EmployeeManager
- ✅ Robust error handling (6 exception types, never crashes)
- ✅ Weighted risk scoring (High/Medium/Low)
- ✅ 5 report types: dept count, salary stats, top paid, low satisfaction, attrition %
- ✅ JSON export/import for data persistence
- ✅ Menu system via React sidebar navigation

### Additional Features
- 🔐 JWT Authentication (login/register)
- ⚡ Real-time WebSocket notifications
- 📊 Live dashboard with auto-updating stats
- 🔔 Activity feed with real-time events
- 🎨 Dark glassmorphism UI with smooth animations
- 📱 Responsive design
- 🐳 Docker containerized

## 🏁 Quick Start

### With Docker (Recommended)
```bash
# Clone and start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Without Docker (Development)

**Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**PostgreSQL:**
- Install PostgreSQL locally
- Create database `employee_attrition_db`
- Update `DATABASE_URL` in `.env`

## 🔑 Default Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@company.com | admin123 | Admin |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/employees/` | List/Search employees |
| POST | `/api/employees/` | Add employee |
| GET | `/api/employees/{id}` | Get employee |
| PUT | `/api/employees/{id}` | Update employee |
| DELETE | `/api/employees/{id}` | Delete employee |
| GET | `/api/employees/data/export` | Export JSON |
| POST | `/api/employees/data/import` | Import JSON |
| GET | `/api/analysis/dashboard` | Dashboard stats |
| GET | `/api/analysis/reports` | Full report |
| GET | `/api/attrition/risk` | Risk overview |
| GET | `/api/attrition/risk/{id}` | Employee risk breakdown |
| POST | `/api/attrition/recalculate` | Recalculate all risks |
| WS | `/ws` | WebSocket real-time |

## ⚡ Risk Scoring Algorithm

| Factor | Weight | Scoring |
|--------|--------|---------|
| Satisfaction (1-5) | 30% | Lower satisfaction → higher risk |
| Attendance (0-100%) | 20% | Lower attendance → higher risk |
| Overtime (bool) | 15% | Overtime = +15 pts |
| Salary (vs dept avg) | 20% | Below dept average → higher risk |
| Experience (years) | 15% | <2 or >15 years → higher risk |

**Risk Levels:** High (≥60), Medium (35-59), Low (<35)
