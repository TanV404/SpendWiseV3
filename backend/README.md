# SpendWise

**SpendWise** is a full-stack personal finance tracker designed to give users a clear, data-driven view of their financial activity. It brings **transactions, budgets, savings goals, recurring subscriptions, analytics, and email alerts** into one dashboard.

The application is built around a decoupled **React + TypeScript frontend** and **FastAPI + PostgreSQL backend**, with JWT-based authentication and automated transactional notifications.

---

## Overview

SpendWise helps users answer questions such as:

* Where is my money being spent?
* How much of my budget have I used?
* Am I on track to meet my savings goal?
* What subscriptions are coming due?
* How quickly am I spending this month?
* Am I likely to exceed my budget?
* Which spending patterns or transactions are unusual?

The dashboard combines these data points into visual KPIs, charts, forecasts, and alerts so users can monitor their finances without manually analyzing their transaction history.

---

## Core Features

### 💳 Transaction Management

Users can manage their complete transaction history from a centralized interface.

Supported operations include:

* Add transactions
* Edit existing transactions
* Delete transactions
* Search and filter transactions
* Export transaction data to CSV
* Categorize income and expenses

Each transaction is associated with the authenticated user, ensuring that financial data remains isolated between accounts.

---

### 📥 CSV Import

SpendWise supports bulk transaction ingestion through CSV files.

The import pipeline validates each row before inserting it into the database.

Validation includes:

* Data type validation
* Amount range enforcement
* Required-field validation
* Duplicate detection using content hashing
* Row-level error reporting
* Import success/failure summaries

The amount validation prevents unrealistic values by enforcing:

`|amount| < 1,000,000`

Instead of failing an entire import because of one invalid row, the system reports which rows were accepted and which rows require correction.

---

### 💰 Budget Tracking

Users can create monthly budgets for individual spending categories as well as overall spending.

The dashboard tracks:

* Budget limit
* Current spending
* Remaining budget
* Percentage utilized
* Forecasted spending
* Budget status

SpendWise distinguishes between different budget states so the UI communicates meaningful information:

* **No budget set** — the user has not configured a budget.
* **Budget active** — spending remains within the configured limit.
* **Budget fully spent** — the available budget has been exhausted.

This prevents empty or zero-value states from being interpreted as the same financial condition.

---

### 🎯 Savings Goals

Savings goals allow users to define a target and monitor progress toward it.

Progress is based on **net retained savings**, rather than simply counting income.

The application calculates the relationship between income and spending to determine how much money has actually been retained toward the goal.

Progress is displayed visually using progress indicators, making it easy to understand how close the user is to the target.

---

### 🔄 Recurring Subscriptions

SpendWise tracks recurring expenses such as:

* Streaming services
* Software subscriptions
* Memberships
* Utilities
* Other recurring payments

Each recurring transaction maintains its cadence and automatically determines the next expected due date.

Supported cadence tracking allows the system to identify upcoming renewals and generate relevant notifications.

---

### 📧 Transactional Email Alerts

SpendWise integrates **Resend** for automated financial notifications.

The email system supports:

#### Budget alerts

Users can receive notifications when their spending reaches configured budget thresholds.

#### Subscription alerts

Upcoming recurring payments can trigger renewal notifications.

#### Weekly spending digests

Users receive periodic summaries of their spending activity.

Email delivery is designed to be **idempotent**. The `alerts_sent` uniqueness constraint prevents the same alert from being repeatedly delivered for the same event.

Responsive **Jinja2 email templates** are used to generate the notification content.

---

# 📊 Dashboard & Analytics

The dashboard transforms transaction data into actionable financial insights.

### Spending by Category

A donut chart visualizes spending distribution across categories.

To keep the visualization readable, the system displays:

* Top 5 spending categories
* Remaining categories grouped into **Others**

This prevents users with many categories from being presented with an overcrowded chart.

---

### Spend vs. Budget

The dashboard compares actual spending against the user's configured budget.

It also incorporates forecasting to estimate where spending is heading based on the current month's activity.

This allows users to identify potential budget overruns before the month ends.

---

### Daily Burn Rate

SpendWise calculates the user's spending rate throughout the month.

The burn-rate metric helps answer:

> "At my current spending pace, how much am I likely to spend by the end of the month?"

The forecast accounts for the amount already spent and the number of days elapsed, rather than treating every day of the month equally.

---

### Outlier-Safe KPIs

Financial dashboards can become misleading when a single unusually large transaction dominates the statistics.

SpendWise therefore applies outlier handling to relevant analytics so that exceptional transactions do not unnecessarily distort the user's normal spending indicators.

This makes the dashboard more useful for understanding **typical spending behavior**, while still retaining the original transaction data.

---

# 🔐 Authentication & Data Isolation

SpendWise uses **JWT-based authentication** to protect user accounts and financial data.

The authentication system includes:

* Secure password hashing with bcrypt
* JWT access tokens
* Token refresh
* Authenticated API requests
* User-isolated database records

The backend follows a multi-tenant data model where financial entities are associated with individual users.

This ensures that one authenticated user cannot access another user's transactions, budgets, goals, or recurring payments.

---

# 🏗️ Architecture

SpendWise uses a decoupled frontend/backend architecture:

```text
                    ┌─────────────────────┐
                    │      Vercel         │
                    │ React + TypeScript  │
                    │      Frontend       │
                    └──────────┬──────────┘
                               │
                         REST API / JWT
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Render        │
                    │       FastAPI       │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ PostgreSQL  │   │   Resend    │   │   Business  │
      │   Database  │   │   Emails    │   │    Logic    │
      └─────────────┘   └─────────────┘   └─────────────┘
```

### Frontend

The React SPA is responsible for:

* User interaction
* Dashboard visualization
* Transaction management
* Budget and savings interfaces
* Subscription management
* Client-side validation
* API communication

### Backend

FastAPI handles:

* Authentication
* Authorization
* API endpoints
* Validation
* Financial calculations
* Forecasting
* Database operations
* Recurring-payment logic
* Email notification workflows

### Database

PostgreSQL stores:

* Users
* Transactions
* Budgets
* Savings goals
* Recurring subscriptions
* Alert delivery records

SQLAlchemy provides ORM-based database access, while Alembic manages schema migrations.

---

# 📁 Project Structure

```text
spendwise/
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Dashboard UI, charts, cards & modals
│   │   ├── types.ts          # TypeScript data models
│   │   └── api.ts            # Typed API client & error handling
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── alembic/              # Database migrations
│   ├── app/
│   │   ├── models.py         # SQLAlchemy database models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── routers/          # API routes
│   │   ├── services/         # Business & email logic
│   │   └── main.py           # FastAPI entry point
│   │
│   ├── tests/                # Automated backend tests
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker-compose.yml
└── .env.example
```

---

# 🧰 Technology Stack

## Backend

| Technology                    | Purpose                          |
| ----------------------------- | -------------------------------- |
| **FastAPI**                   | REST API and backend application |
| **Python 3.11+**              | Backend language                 |
| **PostgreSQL**                | Persistent relational database   |
| **SQLAlchemy**                | ORM and database interaction     |
| **Alembic**                   | Database migrations              |
| **JWT / Jose / Cryptography** | Authentication                   |
| **bcrypt**                    | Password hashing                 |
| **Resend**                    | Transactional email              |
| **Jinja2**                    | Responsive email templates       |
| **Pytest**                    | Automated backend testing        |
| **Docker**                    | Containerization                 |

## Frontend

| Technology           | Purpose                             |
| -------------------- | ----------------------------------- |
| **React 18**         | UI framework                        |
| **TypeScript**       | Type-safe frontend development      |
| **Vite**             | Frontend build tooling              |
| **Tailwind CSS**     | UI styling                          |
| **Recharts**         | Financial charts and visualizations |
| **Lucide Icons**     | Interface icons                     |
| **Material Symbols** | Interface icons                     |
| **Vitest**           | Frontend unit testing               |

## Infrastructure

| Technology            | Purpose                         |
| --------------------- | ------------------------------- |
| **Vercel**            | Frontend hosting                |
| **Render**            | FastAPI backend hosting         |
| **Render PostgreSQL** | Managed database                |
| **GitHub Actions**    | CI/CD and automated checks      |
| **Docker Compose**    | Local multi-service environment |

---

# 🧪 Testing & Reliability

The project includes automated tests across the major financial workflows.

### Backend

**18 automated Pytest tests** cover areas including:

* Authentication
* Budget calculations
* Financial aggregations
* Category operations
* Cascade safety
* Forecasting
* Burn-rate calculations
* Email notifications
* Recurring-payment cadence
* Outlier filtering
* Duplicate transaction detection

### Frontend

The frontend includes:

* **Vitest** unit tests
* **TypeScript** type checking
* Production build validation

Current checks include:

```text
Backend:   18 tests passing
Frontend:   6/6 tests passing
TypeScript: 0 errors
Production build: passing
```

---

# 🚀 Deployment

SpendWise is designed as a production-style, independently deployable application.

### Frontend

The React/Vite application is built into a static bundle and deployed through **Vercel**.

### Backend

The FastAPI application runs as a service on **Render**.

### Database

PostgreSQL is hosted as a managed database alongside the backend infrastructure.

### CI/CD

GitHub Actions automates key quality checks, including:

* Linting
* Backend tests
* Frontend tests
* Type checking
* Migration synchronization checks

This helps prevent broken code or inconsistent database migrations from reaching deployment.

---

# 🔄 End-to-End Workflow

A typical SpendWise workflow looks like this:

```text
User signs in
      │
      ▼
JWT authentication
      │
      ▼
Dashboard loads user financial data
      │
      ├──────────────► Transactions
      │
      ├──────────────► Budgets
      │
      ├──────────────► Savings Goals
      │
      └──────────────► Recurring Payments
                           │
                           ▼
                    Analytics Engine
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        Spending       Forecasts      Burn Rate
        Analysis
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                     Dashboard KPIs
                           │
                           ▼
                    Alert Conditions
                           │
                           ▼
                     Resend Email
```

For example, when a user imports transactions, SpendWise validates the CSV, removes duplicate entries, stores valid transactions in PostgreSQL, and makes the new data immediately available to dashboard analytics. The analytics layer can then update category spending, budget utilization, forecasts, and savings calculations.

Similarly, recurring transactions are evaluated against their cadence and next due date. When an alert condition is reached, the notification service generates an email and records the delivery to prevent duplicate alerts.

---

# 🎯 Project Highlights

SpendWise goes beyond basic CRUD functionality by combining financial data management with automated analysis and notification workflows.

Key engineering aspects include:

* **Full-stack architecture** with independent frontend and backend services
* **Multi-tenant data isolation** using authenticated user ownership
* **Validated bulk data ingestion** with duplicate detection
* **Financial forecasting** and spending-rate calculations
* **Outlier-resistant analytics**
* **Automated recurring-payment detection**
* **Idempotent transactional email delivery**
* **Database constraints and migrations**
* **Automated backend and frontend testing**
* **Containerized development environment**
* **Production deployment with CI/CD**

The result is a personal finance platform that not only records financial activity, but also turns that data into **budgets, forecasts, savings progress, recurring-payment awareness, and proactive financial alerts**.
