import csv
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Category, Transaction, User
from app.schemas import (
    CSVImportErrorDetail,
    CSVImportResponse,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

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
        merchant=tx_in.merchant,
        date=formatted_date,
        amount=tx_in.amount,
        icon=icon,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

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

        try:
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

            if not merchant:
                errors.append(CSVImportErrorDetail(row=row_idx, reason="Missing merchant/description"))
                continue

            clean_amt = amount_str.replace("$", "").replace(",", "").strip()
            if not clean_amt:
                errors.append(CSVImportErrorDetail(row=row_idx, reason="Missing transaction amount"))
                continue

            try:
                amount = float(clean_amt)
            except ValueError:
                errors.append(CSVImportErrorDetail(row=row_idx, reason=f"Invalid numeric amount format: '{amount_str}'"))
                continue

            # Validate date
            is_valid_date, formatted_date = parse_and_validate_date(date_str)
            if not is_valid_date:
                errors.append(CSVImportErrorDetail(row=row_idx, reason=f"Invalid date format: '{date_str}'"))
                continue

            cat_id = get_or_create_category_id(db, current_user.id, category_name)
            tx = Transaction(
                user_id=current_user.id,
                category_id=cat_id,
                merchant=merchant,
                date=formatted_date,
                amount=amount,
                icon="cloud_upload",
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)

            created.append(
                TransactionResponse(
                    id=tx.id,
                    merchant=tx.merchant,
                    category=category_name,
                    date=tx.date,
                    amount=tx.amount,
                    icon=tx.icon,
                )
            )
        except Exception as e:
            db.rollback()
            errors.append(CSVImportErrorDetail(row=row_idx, reason=f"Failed to parse row: {e!s}"))

    return CSVImportResponse(created=created, errors=errors)
