import csv
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Category, Transaction, User
from app.schemas import (
    CSVImportErrorDetail,
    CSVImportResponse,
    TransactionCreate,
    TransactionImportRow,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.alerts import check_budget_threshold

router = APIRouter(prefix="/transactions", tags=["transactions"])


def parse_and_validate_date(date_str: str) -> tuple[bool, str]:
    if not date_str or not date_str.strip():
        return True, datetime.now(timezone.utc).strftime("%b %d, %Y")

    clean_str = date_str.strip().strip('"').strip("'")
    formats = [
        "%b %d, %Y",
        "%b %d %Y",
        "%B %d, %Y",
        "%B %d %Y",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%m-%d-%Y",
        "%d-%m-%Y",
    ]
    for fmt in formats:
        try:
            parsed = datetime.strptime(clean_str, fmt)
            return True, parsed.strftime("%b %d, %Y")
        except ValueError:
            pass

    return False, date_str


def get_or_create_category_id(db: Session, user_id: str, category_name: str) -> str:
    category = (
        db.query(Category)
        .filter(
            Category.user_id == user_id,
            Category.name.ilike(category_name),
        )
        .first()
    )
    if category:
        return category.id

    # Create category if not present
    new_cat = Category(
        user_id=user_id,
        name=category_name,
        type="expense",
        icon="shopping_cart",
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat.id


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )

    result = []
    for tx in transactions:
        cat_name = tx.category_rel.name if tx.category_rel else "Other"
        result.append(
            TransactionResponse(
                id=tx.id,
                merchant=tx.merchant,
                category=cat_name,
                date=tx.date,
                amount=tx.amount,
                icon=tx.icon,
            )
        )
    return result


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    tx_in: TransactionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_valid_date, formatted_date = parse_and_validate_date(tx_in.date)
    if not is_valid_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: '{tx_in.date}'",
        )

    cat_id = get_or_create_category_id(db, current_user.id, tx_in.category)

    # 10-second duplicate check for manual creation (catches double-submit/double-click)
    ten_seconds_ago = datetime.now(timezone.utc) - timedelta(seconds=10)
    recent_duplicate = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.merchant == tx_in.merchant.strip(),
            Transaction.amount == tx_in.amount,
            Transaction.date == formatted_date,
            Transaction.category_id == cat_id,
            Transaction.created_at >= ten_seconds_ago,
        )
        .first()
    )
    if recent_duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate transaction detected (submitted within last 10 seconds)",
        )

    icon = tx_in.icon
    if not icon:
        if tx_in.amount > 0:
            icon = "payments"
        elif tx_in.category.lower() == "entertainment":
            icon = "subscriptions"
        else:
            icon = "shopping_cart"

    tx = Transaction(
        user_id=current_user.id,
        category_id=cat_id,
        merchant=tx_in.merchant.strip(),
        date=formatted_date,
        amount=tx_in.amount,
        icon=icon,
        is_flagged=False,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    # Check budget threshold in background if transaction is an expense
    if tx.amount < 0:
        check_budget_threshold(
            user_id=current_user.id,
            category_id=cat_id,
            db=db,
            background_tasks=background_tasks,
        )

    return TransactionResponse(
        id=tx.id,
        merchant=tx.merchant,
        category=tx_in.category,
        date=tx.date,
        amount=tx.amount,
        icon=tx.icon,
    )


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: str,
    tx_in: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if tx_in.merchant is not None:
        tx.merchant = tx_in.merchant
    if tx_in.date is not None:
        is_valid_date, formatted_date = parse_and_validate_date(tx_in.date)
        if not is_valid_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: '{tx_in.date}'",
            )
        tx.date = formatted_date
    if tx_in.amount is not None:
        tx.amount = tx_in.amount
    if tx_in.icon is not None:
        tx.icon = tx_in.icon
    if tx_in.category is not None:
        cat_id = get_or_create_category_id(db, current_user.id, tx_in.category)
        tx.category_id = cat_id

    db.commit()
    db.refresh(tx)

    cat_name = tx.category_rel.name if tx.category_rel else "Other"
    return TransactionResponse(
        id=tx.id,
        merchant=tx.merchant,
        category=cat_name,
        date=tx.date,
        amount=tx.amount,
        icon=tx.icon,
    )


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.user_id == current_user.id,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(tx)
    db.commit()


@router.post("/import", response_model=CSVImportResponse)
async def import_csv_transactions(
    request: Request,
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = ""
    if file:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8")
    else:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body_data = await request.json()
                content = body_data.get("raw_csv", "")
            except Exception:
                pass
        elif "form-data" in content_type or "x-www-form-urlencoded" in content_type:
            try:
                form_data = await request.form()
                if "file" in form_data:
                    file_obj = form_data["file"]
                    if hasattr(file_obj, "read"):
                        content_bytes = await file_obj.read()
                        content = content_bytes.decode("utf-8")
                if not content and "raw_csv" in form_data:
                    content = str(form_data["raw_csv"])
            except Exception:
                pass

    if not content:
        raise HTTPException(status_code=400, detail="No CSV file or text provided")

    lines = [line for line in content.splitlines() if line.strip()]
    created = []
    errors = []

    reader = csv.reader(lines)
    row_idx = 0
    today_str = datetime.now(timezone.utc).strftime("%b %d, %Y")

    # Fetch all existing transactions for this user to build duplicate signature hashes
    existing_user_txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .all()
    )

    # Helper function to compute deterministic signature hash
    def compute_tx_hash(u_id: str, d_str: str, merch: str, amt_val: float, cat_str: str) -> str:
        key = f"{u_id}|{d_str.strip().lower()}|{merch.strip().lower()}|{float(amt_val):.2f}|{cat_str.strip().lower()}"
        return hashlib.sha256(key.encode("utf-8")).hexdigest()

    existing_hashes = {
        compute_tx_hash(
            tx.user_id,
            tx.date,
            tx.merchant,
            tx.amount,
            tx.category_rel.name if tx.category_rel else "Other",
        )
        for tx in existing_user_txs
    }

    # Also track hashes within the current batch to detect intra-file duplicates
    batch_hashes = set()

    for row in reader:
        row_idx += 1
        if not row or all(not cell.strip() for cell in row):
            continue

        first_cell = row[0].strip().lower().strip('"').strip("'")
        if row_idx == 1 and first_cell in ["merchant", "id", "description", "title", "name", "date"]:
            continue

        clean_row = [cell.strip().strip('"').strip("'") for cell in row]

        if len(clean_row) < 2:
            errors.append(CSVImportErrorDetail(row=row_idx, reason="Invalid row format: too few columns"))
            continue

        merchant = ""
        category_name = "Other"
        amount_str = ""
        date_str = today_str

        if len(clean_row) >= 5 and clean_row[0].startswith("tx-"):
            merchant = clean_row[1]
            category_name = clean_row[2] or "Other"
            date_str = clean_row[3] or today_str
            amount_str = clean_row[4]
        elif len(clean_row) >= 4:
            merchant = clean_row[0]
            category_name = clean_row[1] or "Other"
            amount_str = clean_row[2]
            date_str = clean_row[3] or today_str
        elif len(clean_row) == 3:
            merchant = clean_row[0]
            category_name = clean_row[1] or "Other"
            amount_str = clean_row[2]
        elif len(clean_row) == 2:
            merchant = clean_row[0]
            amount_str = clean_row[1]

        # Strictly validate through TransactionImportRow Pydantic model
        try:
            validated_row = TransactionImportRow(
                merchant=merchant,
                category=category_name,
                amount=amount_str,
                date=date_str,
            )
        except Exception as e:
            # Extract clean error message
            err_msg = str(e)
            if hasattr(e, "errors") and callable(e.errors):
                try:
                    err_msg = e.errors()[0]["msg"]
                    if "Value error, " in err_msg:
                        err_msg = err_msg.replace("Value error, ", "")
                except Exception:
                    pass
            errors.append(CSVImportErrorDetail(row=row_idx, reason=err_msg))
            continue

        # Check duplicate hash against DB and current batch
        row_hash = compute_tx_hash(
            current_user.id,
            validated_row.date,
            validated_row.merchant,
            float(validated_row.amount),
            validated_row.category,
        )

        if row_hash in existing_hashes or row_hash in batch_hashes:
            errors.append(
                CSVImportErrorDetail(
                    row=row_idx,
                    reason="duplicate of existing transaction",
                )
            )
            continue

        batch_hashes.add(row_hash)

        try:
            cat_id = get_or_create_category_id(db, current_user.id, validated_row.category)
            tx = Transaction(
                user_id=current_user.id,
                category_id=cat_id,
                merchant=validated_row.merchant,
                date=validated_row.date,
                amount=float(validated_row.amount),
                icon=validated_row.icon or "cloud_upload",
                is_flagged=False,
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)

            created.append(
                TransactionResponse(
                    id=tx.id,
                    merchant=tx.merchant,
                    category=validated_row.category,
                    date=tx.date,
                    amount=tx.amount,
                    icon=tx.icon,
                )
            )
        except Exception as e:
            db.rollback()
            errors.append(CSVImportErrorDetail(row=row_idx, reason=f"Failed to persist row: {e!s}"))

    return CSVImportResponse(
        imported=len(created),
        skipped=len(errors),
        created=created,
        errors=errors,
    )
