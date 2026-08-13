from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str = "User"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserRefresh(BaseModel):
    refresh_token: str


class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: str
    avatar: str | None = None


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str | None = None
    provider: Literal["email", "google", "guest"] = "email"
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str | None = None
    user: UserProfileResponse | None = None


# --- Category Schemas ---
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    type: Literal["income", "expense"] = "expense"
    icon: str | None = "category"


class CategoryUpdate(BaseModel):
    name: str | None = None
    type: Literal["income", "expense"] | None = None
    icon: str | None = None


class CategoryResponse(BaseModel):
    id: str
    user_id: str
    name: str
    type: Literal["income", "expense"]
    icon: str | None = None

    model_config = ConfigDict(from_attributes=True)


# --- Transaction Schemas ---
class TransactionCreate(BaseModel):
    merchant: str = Field(..., min_length=1)
    category: str = "Other"  # Category name or ID
    date: str
    amount: float
    icon: str | None = None


class TransactionUpdate(BaseModel):
    merchant: str | None = None
    category: str | None = None
    date: str | None = None
    amount: float | None = None
    icon: str | None = None


class TransactionResponse(BaseModel):
    id: str
    merchant: str
    category: str
    date: str
    amount: float
    selected: bool | None = False
    icon: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CSVImportRequest(BaseModel):
    raw_csv: str | None = None


class CSVImportErrorDetail(BaseModel):
    row: int
    reason: str


class CSVImportResponse(BaseModel):
    created: list[TransactionResponse]
    errors: list[CSVImportErrorDetail]


# --- Recurring Schemas ---
class RecurringCreate(BaseModel):
    merchant: str | None = None
    name: str
    amount: float
    frequency: Literal["weekly", "biweekly", "monthly", "yearly", "custom"] = "monthly"
    date: str | None = None
    dueDate: str | None = None
    next_expected_date: str | None = None
    category: str | None = None
    icon: str | None = "subscriptions"
    interval_days: float | None = 30


class RecurringUpdate(BaseModel):
    merchant: str | None = None
    name: str | None = None
    amount: float | None = None
    frequency: str | None = None
    next_due_date: str | None = None
    next_expected_date: str | None = None
    category: str | None = None
    icon: str | None = None
    interval_days: float | None = None


class RecurringItemResponse(BaseModel):
    id: str
    merchant: str
    name: str
    amount: float
    frequency: str
    next_due_date: str | None = None
    next_expected_date: str | None = None
    dueDate: str | None = None
    category: str | None = None
    icon: str | None = "subscriptions"
    interval_days: float | None = 30
    detected_automatically: bool = False

    model_config = ConfigDict(from_attributes=True)


class RecurringDetectResponse(BaseModel):
    detected_count: int
    items: list[RecurringItemResponse]


# --- Budget Schemas ---
class BudgetCreate(BaseModel):
    category_id: str | None = None
    category_name: str | None = None
    monthly_limit: float = Field(..., ge=0)
    essential_pct: float | None = 50.0
    discretionary_pct: float | None = 30.0
    ai_smart_adjust: bool | None = True


class BudgetStatusResponse(BaseModel):
    category_id: str | None = None
    category_name: str
    monthly_limit: float
    essential_pct: float = 50.0
    discretionary_pct: float = 30.0
    essential: float = 0.0
    discretionary: float = 0.0
    ai_smart_adjust: bool = True
    spent: float
    remaining: float

    model_config = ConfigDict(from_attributes=True)


class CategoryAtRisk(BaseModel):
    category_id: str | None = None
    category_name: str
    projected_spend: float
    monthly_limit: float


class ForecastResponse(BaseModel):
    daily_burn_rate: float
    projected_total: float | None = None
    over_budget_risk: bool = False
    days_until_budget_exhausted: int | None = None
    current_spend: float
    monthly_budget: float
    remaining_budget: float
    insufficient_data: bool = False
    status: Literal["UNDER_BUDGET", "NEAR_BUDGET", "OVER_BUDGET"] = "UNDER_BUDGET"
    categories_at_risk: list[CategoryAtRisk] = []
