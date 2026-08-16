from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class CSVImportRequest(BaseModel):
    raw_csv: str | None = None


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


class UserProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str | None = None
    provider: Literal["email", "guest"] = "email"
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


class TransactionImportRow(BaseModel):
    merchant: str
    category: str = "Other"
    amount: Decimal
    date: str
    icon: str | None = "cloud_upload"

    @field_validator("merchant", mode="before")
    @classmethod
    def validate_merchant(cls, v: Any) -> str:
        if v is None:
            raise ValueError("Missing merchant/description")
        s = str(v).strip()
        if not s:
            raise ValueError("Merchant name cannot be empty or whitespace only")
        if len(s) > 200:
            raise ValueError("Merchant name exceeds maximum length of 200 characters")
        return s

    @field_validator("amount", mode="before")
    @classmethod
    def validate_amount(cls, v: Any) -> Decimal:
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ValueError("Missing transaction amount")
        try:
            if isinstance(v, str):
                cleaned = v.replace("$", "").replace(",", "").strip()
                amt = Decimal(cleaned)
            else:
                amt = Decimal(str(v))
        except Exception:
            raise ValueError(f"Invalid numeric amount format: '{v}'")

        if amt <= Decimal("-1000000") or amt >= Decimal("1000000"):
            raise ValueError(f"Amount {amt} exceeds allowed boundary (-1,000,000 to 1,000,000)")
        if amt == Decimal("0"):
            raise ValueError("Transaction amount cannot be zero ($0.00)")
        return amt

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, v: Any) -> str:
        if v is None:
            return "Other"
        s = str(v).strip()
        return s if s else "Other"

    @field_validator("date", mode="before")
    @classmethod
    def validate_date(cls, v: Any) -> str:
        if not v or not str(v).strip():
            raise ValueError("Missing transaction date")
        date_str = str(v).strip()
        # Parse strictly
        formats = [
            "%b %d, %Y",
            "%b %d %Y",
            "%B %d, %Y",
            "%B %d %Y",
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
        ]
        parsed_dt = None
        for fmt in formats:
            try:
                parsed_dt = datetime.strptime(date_str, fmt)
                break
            except ValueError:
                continue

        if not parsed_dt:
            # Check ISO format
            try:
                parsed_dt = datetime.fromisoformat(date_str)
            except Exception:
                pass

        if not parsed_dt:
            raise ValueError(f"Invalid date format: '{date_str}'")

        # Range check (years 1990 - 2100)
        if parsed_dt.year < 1990 or parsed_dt.year > 2100:
            raise ValueError(f"Date '{date_str}' is out of acceptable range (1990-2100)")

        return parsed_dt.strftime("%b %d, %Y")


class CSVImportErrorDetail(BaseModel):
    row: int
    reason: str


class CSVImportResponse(BaseModel):
    imported: int = 0
    skipped: int = 0
    created: list[TransactionResponse] = []
    errors: list[CSVImportErrorDetail] = []


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
    monthly_limit: float | None = None
    savings_goal: float | None = None
    essential_pct: float | None = 50.0
    discretionary_pct: float | None = 30.0
    ai_smart_adjust: bool | None = True


class BudgetStatusResponse(BaseModel):
    category_id: str | None = None
    category_name: str
    monthly_limit: float
    savings_goal: float = 0.0
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


# --- Notification Schemas ---
class NotificationPreferenceItem(BaseModel):
    alert_type: Literal["budget_threshold", "savings_milestone", "weekly_digest"]
    enabled: bool = True
    threshold_pct: float = 80.0


class NotificationPreferenceResponse(BaseModel):
    preferences: list[NotificationPreferenceItem]


class NotificationPreferenceUpdate(BaseModel):
    preferences: list[NotificationPreferenceItem]


class TestNotificationRequest(BaseModel):
    alert_type: Literal["budget_threshold", "savings_milestone", "weekly_digest"] = "budget_threshold"


class TestNotificationResponse(BaseModel):
    status: str
    message: str
    recipient: str

