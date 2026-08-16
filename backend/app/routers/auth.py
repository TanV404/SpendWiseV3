from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Category, CategoryType, Transaction, User
from app.schemas import (
    TokenResponse,
    UserProfileResponse,
    UserRefresh,
    UserRegister,
)
from app.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_CATEGORIES = [
    ("Groceries", CategoryType.expense, "shopping_cart"),
    ("Entertainment", CategoryType.expense, "subscriptions"),
    ("Income", CategoryType.income, "payments"),
    ("Dining Out", CategoryType.expense, "local_cafe"),
    ("Travel", CategoryType.expense, "local_gas_station"),
    ("Utilities", CategoryType.expense, "wifi"),
    ("Fitness", CategoryType.expense, "fitness_center"),
    ("Shopping", CategoryType.expense, "shopping_bag"),
    ("Other", CategoryType.expense, "more_horiz"),
]


def seed_user_categories(user_id: str, db: Session):
    for name, cat_type, icon in DEFAULT_CATEGORIES:
        category = Category(
            user_id=user_id,
            name=name,
            type=cat_type,
            icon=icon,
        )
        db.add(category)
    db.commit()


def seed_user_initial_transactions(user_id: str, db: Session):
    categories = db.query(Category).filter(Category.user_id == user_id).all()
    cat_map = {c.name: c.id for c in categories}

    samples = [
        ("Whole Foods Market", cat_map.get("Groceries"), "May 12, 2024", -142.50, "shopping_cart"),
        ("Netflix Premium", cat_map.get("Entertainment"), "May 10, 2024", -19.99, "subscriptions"),
        ("Salaries Ltd", cat_map.get("Income"), "May 01, 2024", 4200.00, "payments"),
        ("Blue Bottle Coffee", cat_map.get("Dining Out"), "May 11, 2024", -12.40, "local_cafe"),
        ("Chevron Station", cat_map.get("Travel"), "May 08, 2024", -45.00, "local_gas_station"),
        ("Equinox Gym", cat_map.get("Fitness"), "May 05, 2024", -45.00, "fitness_center"),
    ]

    for merchant, cat_id, date_str, amount, icon in samples:
        tx = Transaction(
            user_id=user_id,
            category_id=cat_id,
            merchant=merchant,
            date=date_str,
            amount=amount,
            icon=icon,
        )
        db.add(tx)
    db.commit()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        name=user_in.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    seed_user_categories(user.id, db)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user=UserProfileResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    db: Session = Depends(get_db),
):
    email = None
    password = None

    # Support both JSON payload and OAuth2 Form data
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
        except Exception:
            pass
    elif "form" in content_type:
        form = await request.form()
        email = form.get("username") or form.get("email")
        password = form.get("password")

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing email or password",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token,
        user=UserProfileResponse.model_validate(user),
    )


@router.post("/refresh")
def refresh_token(token_in: UserRefresh, db: Session = Depends(get_db)):
    payload = decode_token(token_in.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    new_access_token = create_access_token(user.id)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserProfileResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
