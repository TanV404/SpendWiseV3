# SpendWise FastAPI Backend

Production-ready backend API for **SpendWise** Personal Finance Tracker, built with FastAPI, SQLAlchemy 2.0, PostgreSQL, Alembic, Pydantic v2, Docker, and GitHub Actions CI.

---

## 🏗 Architecture & Design Decisions

### 1. Authentication & Token Strategy
- **JWT (JSON Web Tokens)**: Encodes `sub` (User UUID) and expiry `exp` with `HS256`.
- **Token Expiry**:
  - `access_token`: 60 minutes.
  - `refresh_token`: 7 days.
- **Trade-off Analysis**: Short-lived access tokens mitigate replay/leak attacks, while refresh tokens allow seamless session extension without requiring the user to re-type credentials repeatedly.
- **Strict User Scoping**: All database queries unconditionally filter by `current_user.id`. Accessing another user's resource returns `404 Not Found` (rather than `403 Forbidden`) to avoid leaking resource existence.

### 2. Category Cascade & Data Preservation
- **`ON DELETE SET NULL`**: When a category is deleted, referencing transactions have their `category_id` set to `NULL` (or fall back to `"Other"`). Deleting a category never deletes user transaction history.

### 3. Recurring Detection Heuristic (`POST /recurring/detect`)
- **Matching Algorithm**:
  1. Scans user's historical expense transactions (`amount < 0`).
  2. Groups by normalized merchant name.
  3. For merchants with $\ge 2$ entries:
     - Calculates intervals (in days) between successive transactions.
     - Confirms amount consistency: all amounts must be within a $\pm 10\%$ tolerance (or $\le \$5.00$ variance).
     - Matches frequency based on average interval:
       - 6–9 days $\rightarrow$ Weekly (7 days)
       - 12–17 days $\rightarrow$ Bi-weekly (14 days)
       - 24–36 days $\rightarrow$ Monthly (30 days)
       - 340–380 days $\rightarrow$ Yearly (365 days)
  4. Automatically upserts `RecurringItem` records with `detected_automatically = True`.

### 4. Budget Forecasting (`GET /budgets/forecast`)
- **Linear Month Extrapolation**:
  $$\text{daily\_burn\_rate} = \frac{\text{current\_month\_expenses}}{\text{days\_elapsed}}$$
  $$\text{projected\_total} = \text{daily\_burn\_rate} \times \text{days\_in\_month}$$
  $$\text{over\_budget\_risk} = \text{projected\_total} > \text{total\_monthly\_budget}$$
  $$\text{days\_until\_exhausted} = \left\lfloor \frac{\text{remaining\_budget}}{\text{daily\_burn\_rate}} \right\rfloor$$

---

## 📡 API Contract & Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user (returns JWT token & user profile) |
| `POST` | `/auth/login` | Login with email/password (JSON & OAuth2 form compatible) |
| `POST` | `/auth/google` | Google OAuth authentication & account linking |
| `POST` | `/auth/refresh` | Refresh expired access token |
| `GET` | `/auth/me` | Get current authenticated user profile |
| `GET` | `/transactions` | List current user's transactions (ordered by date desc) |
| `POST` | `/transactions` | Create transaction (`merchant`, `category`, `date`, `amount`, `icon`) |
| `PATCH` | `/transactions/{id}` | Partial update transaction |
| `DELETE` | `/transactions/{id}` | Delete transaction |
| `POST` | `/transactions/import` | CSV statement batch import |
| `GET` | `/categories` | List user categories |
| `POST` | `/categories` | Create category (`name`, `type`, `icon`) |
| `PATCH` | `/categories/{id}` | Update / rename category |
| `DELETE` | `/categories/{id}` | Delete category (reassigns transactions to null/Other) |
| `GET` | `/recurring` | List recurring subscriptions |
| `POST` | `/recurring` | Add recurring item |
| `PATCH` | `/recurring/{id}` | Update recurring item |
| `DELETE` | `/recurring/{id}` | Delete recurring item |
| `POST` | `/recurring/detect` | Run recurring pattern detection algorithm |
| `POST` | `/budgets` | Upsert monthly budget limit and percentages |
| `GET` | `/budgets/status` | Get budget limits, essential/discretionary breakdown, and precomputed spent/remaining |
| `GET` | `/budgets/forecast` | Spending pace forecast, burn rate, and over-budget risk |
| `GET` | `/health` | Healthcheck endpoint |

---

## 🚀 Running Locally

### Option A: Using Docker Compose
```bash
# From workspace root:
docker-compose up --build
```
- API: `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

### Option B: Local Python Virtualenv
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run server
uvicorn app.main:app --reload --port 8000
```

---

## 🧪 Testing

```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest -v
```

---

## 🌐 Deploying to Render

### Environment Variables
Set the following environment variables in the Render Dashboard (or via `render.yaml`):

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/spendwise` |
| `JWT_SECRET` | Secret key for signing JWTs | `generate-a-secure-random-string` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `7` |

### Deployment Steps:
1. Create a **New Blueprint Instance** on [Render](https://render.com).
2. Connect your Git repository. Render will detect `render.yaml` and provision both the PostgreSQL instance and the FastAPI web service automatically.
