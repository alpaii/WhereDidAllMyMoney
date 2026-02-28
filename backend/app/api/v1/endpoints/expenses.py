import os
import uuid as uuid_lib
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from PIL import Image

from app.db.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.category import Category, Subcategory, Product
from app.models.expense import Expense, ExpensePhoto
from app.models.store import Store
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseWithDetails,
    ExpenseStatsByCategory, ExpenseStatsByPeriod, ExpenseSummary,
    PaginatedExpenseResponse, ExpensePhotoResponse
)
from app.core.deps import get_current_user
from app.core.config import settings
from app.services.account_service import update_balance, get_account_with_lock

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
THUMBNAIL_SIZE = (200, 200)


@router.get("/", response_model=PaginatedExpenseResponse)
async def get_expenses(
    account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    store_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(default=1, ge=1),
    size: int = Query(default=100, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 내역 조회 (페이지네이션)"""
    # Base conditions
    conditions = [Expense.user_id == current_user.id]

    if account_id:
        conditions.append(Expense.account_id == account_id)
    if category_id:
        subq = select(Subcategory.id).where(Subcategory.category_id == category_id)
        conditions.append(Expense.subcategory_id.in_(subq))
    if store_id:
        conditions.append(Expense.store_id == store_id)
    if start_date:
        conditions.append(Expense.expense_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(Expense.expense_at <= datetime.combine(end_date, datetime.max.time()))

    # Count total
    count_query = select(func.count(Expense.id)).where(*conditions)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Get paginated data
    offset = (page - 1) * size
    query = (
        select(Expense)
        .where(*conditions)
        .options(
            selectinload(Expense.account),
            selectinload(Expense.subcategory).selectinload(Subcategory.category),
            selectinload(Expense.product),
            selectinload(Expense.store),
            selectinload(Expense.photos)
        )
        .order_by(Expense.expense_at.desc())
        .offset(offset)
        .limit(size)
    )
    result = await db.execute(query)
    expenses = result.scalars().all()

    # Calculate total pages
    pages = (total + size - 1) // size if total > 0 else 1

    # Convert to response with details
    items = [
        ExpenseWithDetails(
            id=exp.id,
            user_id=exp.user_id,
            account_id=exp.account_id,
            category_id=exp.subcategory.category_id if exp.subcategory else None,
            subcategory_id=exp.subcategory_id,
            product_id=exp.product_id,
            store_id=exp.store_id,
            amount=exp.amount,
            memo=exp.memo,
            purchase_url=exp.purchase_url,
            satisfaction=exp.satisfaction,
            expense_at=exp.expense_at,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
            account_name=exp.account.name if exp.account else None,
            category_name=exp.subcategory.category.name if exp.subcategory and exp.subcategory.category else None,
            subcategory_name=exp.subcategory.name if exp.subcategory else None,
            product_name=exp.product.name if exp.product else None,
            store_name=exp.store.name if exp.store else None,
            photos=[ExpensePhotoResponse.model_validate(p) for p in sorted(exp.photos, key=lambda x: x.sort_order)]
        )
        for exp in expenses
    ]

    return PaginatedExpenseResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 생성"""
    # Verify account belongs to user
    result = await db.execute(
        select(Account).where(
            Account.id == expense_data.account_id,
            Account.user_id == current_user.id
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Verify subcategory exists
    result = await db.execute(
        select(Subcategory).where(Subcategory.id == expense_data.subcategory_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found"
        )

    # Verify product if provided
    if expense_data.product_id:
        result = await db.execute(
            select(Product).where(
                Product.id == expense_data.product_id,
                Product.user_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

    # Verify store if provided
    if expense_data.store_id:
        result = await db.execute(
            select(Store).where(
                Store.id == expense_data.store_id,
                Store.user_id == current_user.id
            )
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found"
            )

    # Create expense
    expense = Expense(
        user_id=current_user.id,
        account_id=expense_data.account_id,
        subcategory_id=expense_data.subcategory_id,
        product_id=expense_data.product_id,
        store_id=expense_data.store_id,
        amount=expense_data.amount,
        memo=expense_data.memo,
        purchase_url=expense_data.purchase_url,
        expense_at=expense_data.expense_at
    )
    db.add(expense)

    # Update account balance with lock for concurrency safety
    await update_balance(db, expense_data.account_id, current_user.id, -Decimal(str(expense_data.amount)))

    await db.commit()
    await db.refresh(expense)

    return expense


@router.get("/{expense_id}", response_model=ExpenseWithDetails)
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 상세 조회"""
    result = await db.execute(
        select(Expense)
        .where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .options(
            selectinload(Expense.account),
            selectinload(Expense.subcategory).selectinload(Subcategory.category),
            selectinload(Expense.product),
            selectinload(Expense.store),
            selectinload(Expense.photos)
        )
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    return ExpenseWithDetails(
        id=expense.id,
        user_id=expense.user_id,
        account_id=expense.account_id,
        category_id=expense.subcategory.category_id if expense.subcategory else None,
        subcategory_id=expense.subcategory_id,
        product_id=expense.product_id,
        store_id=expense.store_id,
        amount=expense.amount,
        memo=expense.memo,
        purchase_url=expense.purchase_url,
        satisfaction=expense.satisfaction,
        expense_at=expense.expense_at,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        account_name=expense.account.name if expense.account else None,
        category_name=expense.subcategory.category.name if expense.subcategory and expense.subcategory.category else None,
        subcategory_name=expense.subcategory.name if expense.subcategory else None,
        product_name=expense.product.name if expense.product else None,
        store_name=expense.store.name if expense.store else None,
        photos=[ExpensePhotoResponse.model_validate(p) for p in sorted(expense.photos, key=lambda x: x.sort_order)]
    )


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    expense_data: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 수정"""
    result = await db.execute(
        select(Expense)
        .where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .options(selectinload(Expense.account))
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    old_amount = Decimal(str(expense.amount))
    old_account_id = expense.account_id

    update_data = expense_data.model_dump(exclude_unset=True)

    # Handle balance changes with concurrency-safe operations
    if "amount" in update_data or "account_id" in update_data:
        new_amount = Decimal(str(update_data.get("amount", expense.amount)))
        new_account_id = update_data.get("account_id", expense.account_id)

        if old_account_id == new_account_id:
            # Same account: apply difference
            delta = old_amount - new_amount  # positive if reducing expense
            await update_balance(db, old_account_id, current_user.id, delta)
        else:
            # Different accounts: restore old, deduct from new
            await update_balance(db, old_account_id, current_user.id, old_amount)
            await update_balance(db, new_account_id, current_user.id, -new_amount)

    for field, value in update_data.items():
        setattr(expense, field, value)

    await db.commit()
    await db.refresh(expense)

    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 삭제"""
    result = await db.execute(
        select(Expense)
        .where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .options(
            selectinload(Expense.account),
            selectinload(Expense.photos)
        )
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Delete photo files
    for photo in expense.photos:
        try:
            if photo.file_path and os.path.exists(photo.file_path):
                os.remove(photo.file_path)
            if photo.thumbnail_path and os.path.exists(photo.thumbnail_path):
                os.remove(photo.thumbnail_path)
        except Exception:
            pass

    # Restore account balance with concurrency safety
    await update_balance(db, expense.account_id, current_user.id, Decimal(str(expense.amount)))

    await db.delete(expense)
    await db.commit()


# Photo endpoints
@router.post("/{expense_id}/photos", response_model=ExpensePhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_expense_photo(
    expense_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 사진 업로드"""
    # Verify expense belongs to user
    result = await db.execute(
        select(Expense)
        .where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
        .options(selectinload(Expense.photos))
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Validate file extension
    ext = Path(file.filename).suffix.lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )

    # Generate unique filename
    unique_id = str(uuid_lib.uuid4())
    filename = f"{unique_id}{ext}"
    photo_path = Path(settings.UPLOAD_DIR) / "photos" / filename
    thumbnail_path = Path(settings.UPLOAD_DIR) / "thumbnails" / filename

    # Save original file
    photo_path.parent.mkdir(parents=True, exist_ok=True)
    with open(photo_path, "wb") as f:
        f.write(content)

    # Create thumbnail
    thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(photo_path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            img.save(thumbnail_path)
    except Exception:
        thumbnail_path = None

    # Get next sort order
    max_sort = max([p.sort_order for p in expense.photos], default=-1)

    # Create database record
    photo = ExpensePhoto(
        expense_id=expense_id,
        file_path=str(photo_path),
        thumbnail_path=str(thumbnail_path) if thumbnail_path else None,
        sort_order=max_sort + 1
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)

    return photo


@router.delete("/{expense_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense_photo(
    expense_id: UUID,
    photo_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 사진 삭제"""
    # Verify expense belongs to user
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == current_user.id
        )
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Get photo
    result = await db.execute(
        select(ExpensePhoto).where(
            ExpensePhoto.id == photo_id,
            ExpensePhoto.expense_id == expense_id
        )
    )
    photo = result.scalar_one_or_none()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    # Delete files
    try:
        if photo.file_path and os.path.exists(photo.file_path):
            os.remove(photo.file_path)
        if photo.thumbnail_path and os.path.exists(photo.thumbnail_path):
            os.remove(photo.thumbnail_path)
    except Exception:
        pass

    await db.delete(photo)
    await db.commit()
