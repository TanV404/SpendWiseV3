from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models import Category, CategoryType, Transaction, User
from app.schemas import CategoryCreate, CategoryResponse, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Category).filter(Category.user_id == current_user.id).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = Category(
        user_id=current_user.id,
        name=cat_in.name,
        type=CategoryType(cat_in.type),
        icon=cat_in.icon or "category",
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    cat_in: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if cat_in.name is not None:
        category.name = cat_in.name
    if cat_in.type is not None:
        category.type = CategoryType(cat_in.type)
    if cat_in.icon is not None:
        category.icon = cat_in.icon

    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.user_id == current_user.id,
        )
        .first()
    )
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Set null on referencing transactions to ensure user financial history is preserved
    db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category_id == category_id,
    ).update({Transaction.category_id: None})

    db.delete(category)
    db.commit()
