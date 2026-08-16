# SpendWise

A full-stack personal finance tracker for managing **transactions, budgets, savings goals, recurring subscriptions, and financial analytics**.

SpendWise turns transaction data into actionable insights such as **budget utilization, spending trends, burn rate, forecasts, savings progress, and automated financial alerts**.

## ✨ Features

* **Transactions** — Add, edit, delete, search, export, and bulk CSV import.
* **CSV Validation** — Type validation, amount limits, row-level errors, and duplicate detection using content hashing.
* **Budget Tracking** — Category and overall budgets with spending progress and forecasts.
* **Savings Goals** — Track net retained savings toward customizable targets.
* **Recurring Subscriptions** — Track cadence, automatically calculate next due dates, and manage renewals.
* **Financial Analytics** — Category-wise spending, budget vs. actual spending, daily burn rate, forecasts, and outlier-safe KPIs.
* **Email Alerts** — Resend-powered budget warnings, subscription reminders, and weekly spending digests with idempotent delivery.
* **Authentication** — JWT authentication, bcrypt password hashing, token refresh, and user-isolated data.

## 🏗️ How It Works

```text
React + TypeScript
        │
        │ REST API + JWT
        ▼
     FastAPI
        │
   ┌────┴────┐
   ▼         ▼
PostgreSQL  Resend
   │
   ▼
Financial Analytics
   │
   ├── Spending Analysis
   ├── Budget Tracking
   ├── Forecasting
   ├── Burn Rate
   └── Savings Progress
```

The frontend provides the dashboard and financial management interface. FastAPI handles authentication, validation, business logic, analytics, and notifications. PostgreSQL stores user financial data, while Resend handles transactional emails.

## 🧰 Tech Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts, Vitest

**Backend:** FastAPI, Python 3.11+, PostgreSQL, SQLAlchemy, Alembic, JWT, bcrypt, Pytest

**Infrastructure:** Docker, Docker Compose, Render, Vercel, GitHub Actions

## 🧪 Testing

* **18 backend Pytest tests**
* **6/6 frontend Vitest tests**
* **0 TypeScript errors**
* Production build validation
* Migration synchronization checks

## 🚀 Deployment

```text
Frontend  → Vercel
Backend   → Render
Database  → Render PostgreSQL
CI/CD     → GitHub Actions
Email     → Resend
```

SpendWise is designed as a production-style full-stack application with **secure authentication, isolated user data, validated financial workflows, automated analytics, and proactive notifications**.
