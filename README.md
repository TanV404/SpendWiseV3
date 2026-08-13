# 💳 SpendWise — Personal Finance Tracker

**SpendWise** is a full-stack personal finance and budgeting platform designed to deliver real-time financial tracking, automated recurring subscription detection, smart spending pace forecasting, and secure multi-user data isolation.

Built with a high-performance **React + TypeScript** frontend and a robust **FastAPI + PostgreSQL + SQLAlchemy 2.0** backend.

---

## ✨ Features

- **📊 Dynamic Dashboard & KPI Cards**:
  - Real-time **Total Balance**, **Current Spend**, **Savings Goal**, and **Budget Left** metric tiles.
  - Zero-state handling for unset budgets and goals with inline modal triggers.
  - Interactive spending distribution pie chart and weekly breakdown analysis.

- **🎯 Smart Budgeting & Forecasting**:
  - Dynamic monthly budget limits with customizable Essential / Discretionary splits.
  - Linear extrapolation engine calculating **daily burn rate**, **projected month-end total**, **over-budget risk**, and **days until budget exhaustion**.

- **🔄 Automated Recurring Subscription Detection**:
  - Automated heuristic scanning transaction intervals (Weekly, Bi-weekly, Monthly, Yearly) within amount consistency tolerances ($\pm 10\%$).
  - Auto-upserting recurring items with due date scheduling.

- **📂 CSV Transaction Statement Importer**:
  - Pre-import validation engine enforcing header column presence (`Merchant`, `Category`, `Amount`, `Date`), numeric amounts, and multi-format date parsing.
  - Visual preview table with row-by-row error auditing and automatic fallback mapping for unmatched categories to `"Other"`.

- **🔐 Robust Authentication & Multi-Tenancy**:
  - JWT authentication (`HS256`) with short-lived access tokens (60 min) and refresh tokens (7 days).
  - Google OAuth single sign-on & account linking.
  - Strict database query isolation (`user_id == current_user.id`), returning `404 Not Found` for unauthorized resource access.

- **🗂 Safe Category Management**:
  - Custom category creation and renaming.
  - `ON DELETE SET NULL` cascade behavior ensuring user transaction history is never deleted when categories are removed.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS / Vanilla CSS, Material Symbols |
| **Backend** | FastAPI (Async Python 3.11+), Pydantic v2, Python-Jose (JWT), Passlib (Bcrypt) |
| **Database** | PostgreSQL 15, SQLAlchemy 2.0 (ORM), Alembic (Migrations) |
| **Testing & Quality** | Pytest, Pytest-Asyncio, Ruff Linter, TypeScript Compiler (`tsc`) |
| **DevOps & CI/CD** | Docker, Docker Compose, GitHub Actions CI, Render Blueprint (`render.yaml`) |

---

## 🚀 Quick Start

### Option 1: Run with Docker Compose (Recommended)

Launch the entire stack (PostgreSQL + FastAPI Backend) in a single command:

```bash
docker-compose up --build
```

- **Frontend**: Run `npm install && npm run dev` (available at `http://localhost:5173`)
- **Backend API**: `http://localhost:8000`
- **Swagger Interactive Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`

---

### Option 2: Local Development Setup

#### 1. Backend Setup
```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
DATABASE_URL=sqlite:///./dev.db alembic upgrade head

# Start FastAPI server
DATABASE_URL=sqlite:///./dev.db uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
# In the project root directory
npm install
npm run dev
```

The web application will open at `http://localhost:5173`.

---

## 📡 API Contract Overview

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user account |
| `POST` | `/auth/login` | Login with email & password (JSON & OAuth2 form compatible) |
| `POST` | `/auth/google` | Google OAuth account authentication |
| `POST` | `/auth/refresh` | Refresh expired access token |
| `GET` | `/auth/me` | Retrieve authenticated user profile |
| `GET` | `/transactions` | List user transactions (sorted chronologically) |
| `POST` | `/transactions` | Create transaction record |
| `PATCH` | `/transactions/{id}` | Update transaction details |
| `DELETE` | `/transactions/{id}` | Delete transaction |
| `POST` | `/transactions/import` | Validate and batch import CSV statement |
| `GET` | `/categories` | List user categories |
| `POST` | `/categories` | Create custom category |
| `PATCH` | `/categories/{id}` | Rename category |
| `DELETE` | `/categories/{id}` | Delete category (reassigns transactions to `"Other"`) |
| `GET` | `/recurring` | List recurring subscriptions |
| `POST` | `/recurring` | Add recurring subscription |
| `PATCH` | `/recurring/{id}` | Update recurring item |
| `DELETE` | `/recurring/{id}` | Delete recurring item |
| `POST` | `/recurring/detect` | Run automated recurring pattern detection |
| `POST` | `/budgets` | Upsert monthly budget allocation |
| `GET` | `/budgets/status` | Precomputed budget spend, limits, and remaining balance |
| `GET` | `/budgets/forecast` | Spending pace forecast, burn rate, and over-budget risk |
| `GET` | `/health` | Service health status check |

---

## 🧪 Testing & Code Quality

### Backend Automated Test Suite
```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest -v
```
- Tests cover registration, login, Google auth, transaction CRUD, category cascade safety, recurring detection heuristics, forecast burn rates, and user data isolation (404 barriers).

### Backend Linter
```bash
cd backend
./venv/bin/ruff check .
```

### Frontend Typecheck & Production Build
```bash
# In project root
npm run lint
npm run build
```

---

## 🚢 CI/CD & Deployment

### GitHub Actions CI
The workflow in `.github/workflows/backend-ci.yml` runs automatically on pushes and pull requests to `main`:
1. Spins up a PostgreSQL service container.
2. Applies all Alembic migrations (`alembic upgrade head`).
3. Executes Ruff linter checks.
4. Runs the complete `pytest` test suite.

### Render Cloud Deployment
This project includes a turnkey [`render.yaml`](file:///Users/tanvi/Desktop/spendwise_new/render.yaml) Blueprint:
1. Connect your repository on [Render](https://render.com).
2. Render provisions a managed PostgreSQL database and the FastAPI web service automatically.
3. Database migrations run seamlessly during the build step.

---

## 📄 License
MIT License. Built with ❤️ for seamless personal financial tracking.
