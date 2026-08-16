import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"


class AlertType(str, enum.Enum):
    budget_threshold = "budget_threshold"
    savings_milestone = "savings_milestone"
    weekly_digest = "weekly_digest"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False, default="User")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    recurring_items = relationship("RecurringItem", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", cascade="all, delete-orphan")
    alerts_sent = relationship("AlertSent", back_populates="user", cascade="all, delete-orphan")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False, default=AlertType.budget_threshold)
    enabled = Column(Boolean, nullable=False, default=True)
    threshold_pct = Column(Float, nullable=False, default=80.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notification_preferences")

    __table_args__ = (
        UniqueConstraint("user_id", "alert_type", name="uq_notification_preferences_user_alert"),
    )


class AlertSent(Base):
    __tablename__ = "alerts_sent"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    reference_id = Column(String, nullable=True)  # category_id or goal_id, nullable
    period = Column(String, nullable=False)  # e.g. "2026-08"
    threshold_hit = Column(Float, nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="alerts_sent")

    __table_args__ = (
        UniqueConstraint("user_id", "alert_type", "reference_id", "period", "threshold_hit", name="uq_alerts_sent_idempotency"),
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(SQLEnum(CategoryType), nullable=False, default=CategoryType.expense)
    icon = Column(String, nullable=True, default="category")

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category_rel")
    recurring_items = relationship("RecurringItem", back_populates="category_rel")
    budgets = relationship("Budget", back_populates="category_rel")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    merchant = Column(String, nullable=False)
    date = Column(String, nullable=False)  # Formatted string e.g. "May 12, 2024" or ISO "YYYY-MM-DD"
    amount = Column(Float, nullable=False)  # Negative for expense, positive for income
    icon = Column(String, nullable=True, default="shopping_cart")
    is_flagged = Column(Boolean, nullable=False, default=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="transactions")
    category_rel = relationship("Category", back_populates="transactions")

    __table_args__ = (
        CheckConstraint("abs(amount) < 1000000 AND amount != 0", name="ck_transactions_amount_range"),
    )


class RecurringItem(Base):
    __tablename__ = "recurring_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    merchant = Column(String, nullable=False)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    frequency = Column(String, nullable=False, default="monthly")  # "weekly", "biweekly", "monthly", "yearly"
    next_due_date = Column(String, nullable=True)
    next_expected_date = Column(String, nullable=True)
    detected_automatically = Column(Boolean, nullable=False, default=False)
    icon = Column(String, nullable=True, default="subscriptions")
    interval_days = Column(Float, nullable=True, default=30)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="recurring_items")
    category_rel = relationship("Category", back_populates="recurring_items")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    monthly_limit = Column(Float, nullable=False, default=0.0)
    savings_goal = Column(Float, nullable=False, default=0.0)
    essential_pct = Column(Float, nullable=False, default=50.0)
    discretionary_pct = Column(Float, nullable=False, default=30.0)
    ai_smart_adjust = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="budgets")
    category_rel = relationship("Category", back_populates="budgets")

    __table_args__ = (
        CheckConstraint("monthly_limit >= 0 AND savings_goal >= 0", name="ck_budgets_non_negative"),
    )

