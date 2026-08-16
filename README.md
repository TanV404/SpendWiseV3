# SpendWise

A full-stack personal finance tracker for managing transactions, budgets, savings goals, and recurring subscriptions — with CSV import, real-time dashboard analytics, and transactional email alerts.

**Live demo:** [your-vercel-url.vercel.app](#)  
**API docs:** [your-render-url.onrender.com/docs](#)

---

## Features

- **Transaction management** — Add, edit, delete, search, and export to CSV.
- **CSV import** — Row-level validation (type checking, amount range enforcement `|amount| < 1,000,000`, duplicate detection via content hashing), and a detailed import summary.
- **Budget tracking** — Set monthly limits per category and overall limits, with distinct empty states (*"No budget set"* vs. *"Budget fully spent"*).
- **Savings goals** — Track net retained savings progress toward a target goal with visual progress rings.
- **Recurring subscriptions** — Automatic next-due-date calculation, cadence tracking, and renewal management.
- **Email notifications via Resend** — Dynamic budget threshold warnings, recurring subscription alerts, and weekly spending digests with idempotent delivery (`alerts_sent` uniqueness).
- **Dashboard analytics** — Spending by category (donut pie chart with top 5 categories + Others), spend vs. budget forecast, daily burn rate, and outlier-safe KPI cards.
- **JWT authentication** — Secure password hashing with bcrypt, token refresh, and user-isolated multi-tenant data structures.

---

## Tech Stack

### Backend
- **FastAPI** (Python 3.11+)
- **PostgreSQL** + **SQLAlchemy** + **Alembic** (migrations)
- **JWT** (Jose / Cryptography) authentication
- **Resend** (Transactional email with Jinja2 responsive templates)
- **Pytest** (Automated integration & unit test suite)
- **Docker** & **Docker Compose**

### Frontend
- **React 18** + **TypeScript**
- **Vite** + **Tailwind CSS**
- **Lucide Icons** & **Material Symbols**
- **Recharts** (Interactive Donut & Trend charts)
- **Vitest** (Unit tests)

### Infra / Deployment
- **Backend & Database**: Render (FastAPI + Managed PostgreSQL)
- **Frontend**: Vercel (Static SPA build)
- **CI/CD**: GitHub Actions (Linting, automated tests, migration sync checks)

---

## Architecture

```text
spendwise/
├── frontend/                     # React + TypeScript SPA
│   ├── src/
│   │   ├── components/           # UI Bento Cards, Charts & Modals
│   │   ├── types.ts              # Shared TypeScript definitions
│   │   └── api.ts                # Typed ApiError client
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/                      # FastAPI Backend
│   ├── alembic/                  # Versioned DB migrations (001 - 006)
│   ├── app/
│   │   ├── models.py             # SQLAlchemy ORM models & constraints
│   │   ├── schemas.py            # Pydantic validation schemas
│   │   ├── routers/              # API endpoints (Auth, Tx, Budgets, Recurring, Alerts)
│   │   ├── services/             # Business logic & Resend email engine
│   │   └── main.py               # Application entrypoint
│   ├── tests/                    # 18 passing Pytest test suites
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

Frontend and backend are decoupled — the frontend is a static bundle served from Vercel, and the backend is a FastAPI service talking to a managed PostgreSQL instance.

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- PostgreSQL (or Docker)
- A [Resend](https://resend.com) API key (for transactional email features)

---

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp ../.env.example .env
# Edit .env with your local settings

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
- **Web App**: `http://localhost:5173` (or `http://localhost:3000`)

---

### 3. Run with Docker Compose

To launch the full stack (PostgreSQL + FastAPI Backend) in a single command:

```bash
docker-compose up --build
```

---

---

## 🧪 Testing & Code Quality

### Backend Test Suite (Pytest)
```bash
cd backend
source venv/bin/activate
pytest -v
```
- **18 automated tests** covering Authentication, Budgeting & Aggregations, Categories & Cascade safety, Forecasting burn rates, Email notifications, Recurring cadence detection, Outlier filtering, and Duplicate ingestion detection.

### Frontend Test Suite & Linting
```bash
cd frontend
npm test                # Vitest unit test suite (6/6 tests passing)
npx tsc --noEmit        # TypeScript type checker (0 errors)
npm run build           # Production bundle build
```
