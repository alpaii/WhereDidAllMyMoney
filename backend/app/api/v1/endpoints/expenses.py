from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal

from app.db.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.category import Category, Subcategory, Product
from app.models.expense import Expense
from app.schemas.expense import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseWithDetails,
    ExpenseStatsByCategory, ExpenseStatsByPeriod, ExpenseSummary
)
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ExpenseWithDetails])
async def get_expenses(
    account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 내역 조회"""
    query = (
        select(Expense)
        .where(Expense.user_id == current_user.id)
        .options(
            selectinload(Expense.account),
            selectinload(Expense.category),
            selectinload(Expense.subcategory),
            selectinload(Expense.product)
        )
    )

    if account_id:
        query = query.where(Expense.account_id == account_id)
    if category_id:
        query = query.where(Expense.category_id == category_id)
    if start_date:
        query = query.where(Expense.expense_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.where(Expense.expense_at <= datetime.combine(end_date, datetime.max.time()))

    query = query.order_by(Expense.expense_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    expenses = result.scalars().all()

    # Convert to response with details
    return [
        ExpenseWithDetails(
            id=exp.id,
            user_id=exp.user_id,
            account_id=exp.account_id,
            category_id=exp.category_id,
            subcategory_id=exp.subcategory_id,
            product_id=exp.product_id,
            amount=exp.amount,
            memo=exp.memo,
            purchase_url=exp.purchase_url,
            expense_at=exp.expense_at,
            created_at=exp.created_at,
            updated_at=exp.updated_at,
            account_name=exp.account.name if exp.account else None,
            category_name=exp.category.name if exp.category else None,
            subcategory_name=exp.subcategory.name if exp.subcategory else None,
            product_name=exp.product.name if exp.product else None
        )
        for exp in expenses
    ]


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

    # Verify category exists
    result = await db.execute(
        select(Category).where(Category.id == expense_data.category_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
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

    # Create expense
    expense = Expense(
        user_id=current_user.id,
        account_id=expense_data.account_id,
        category_id=expense_data.category_id,
        subcategory_id=expense_data.subcategory_id,
        product_id=expense_data.product_id,
        amount=expense_data.amount,
        memo=expense_data.memo,
        purchase_url=expense_data.purchase_url,
        expense_at=expense_data.expense_at
    )
    db.add(expense)

    # Update account balance
    account.balance -= expense_data.amount

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
            selectinload(Expense.category),
            selectinload(Expense.subcategory),
            selectinload(Expense.product)
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
        category_id=expense.category_id,
        subcategory_id=expense.subcategory_id,
        product_id=expense.product_id,
        amount=expense.amount,
        memo=expense.memo,
        purchase_url=expense.purchase_url,
        expense_at=expense.expense_at,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        account_name=expense.account.name if expense.account else None,
        category_name=expense.category.name if expense.category else None,
        subcategory_name=expense.subcategory.name if expense.subcategory else None,
        product_name=expense.product.name if expense.product else None
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

    old_amount = expense.amount
    old_account = expense.account

    update_data = expense_data.model_dump(exclude_unset=True)

    # Handle amount change - restore old balance, apply new
    if "amount" in update_data:
        old_account.balance += old_amount  # Restore old amount
        new_amount = update_data["amount"]

        # If account is also changing
        if "account_id" in update_data:
            result = await db.execute(
                select(Account).where(
                    Account.id == update_data["account_id"],
                    Account.user_id == current_user.id
                )
            )
            new_account = result.scalar_one_or_none()
            if not new_account:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Account not found"
                )
            new_account.balance -= new_amount
        else:
            old_account.balance -= new_amount
    elif "account_id" in update_data:
        # Only account changed, move the expense amount
        old_account.balance += old_amount
        result = await db.execute(
            select(Account).where(
                Account.id == update_data["account_id"],
                Account.user_id == current_user.id
            )
        )
        new_account = result.scalar_one_or_none()
        if not new_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        new_account.balance -= old_amount

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
        .options(selectinload(Expense.account))
    )
    expense = result.scalar_one_or_none()

    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )

    # Restore account balance
    expense.account.balance += expense.amount

    await db.delete(expense)
    await db.commit()
