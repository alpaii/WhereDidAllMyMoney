from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID
from decimal import Decimal

from app.db.database import get_db
from app.models.user import User
from app.models.account import Account, AccountType
from app.schemas.account import (
    AccountCreate, AccountUpdate, AccountResponse, AccountBalanceSummary
)
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[AccountResponse])
async def get_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 목록 조회"""
    result = await db.execute(
        select(Account)
        .where(Account.user_id == current_user.id)
        .order_by(Account.created_at.desc())
    )
    return result.scalars().all()


@router.get("/summary", response_model=AccountBalanceSummary)
async def get_account_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 잔고 합계 조회"""
    result = await db.execute(
        select(Account).where(Account.user_id == current_user.id)
    )
    accounts = result.scalars().all()

    total_balance = sum(account.balance for account in accounts)

    return AccountBalanceSummary(
        total_balance=total_balance,
        accounts=accounts
    )


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    account_data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 생성"""
    # If setting as primary, unset other primary accounts
    if account_data.is_primary:
        await db.execute(
            select(Account)
            .where(Account.user_id == current_user.id, Account.is_primary == True)
        )
        result = await db.execute(
            select(Account).where(Account.user_id == current_user.id, Account.is_primary == True)
        )
        for acc in result.scalars():
            acc.is_primary = False

    account = Account(
        user_id=current_user.id,
        name=account_data.name,
        account_type=account_data.account_type,
        balance=account_data.balance,
        is_primary=account_data.is_primary,
        description=account_data.description
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)

    return account


@router.get("/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 상세 조회"""
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == current_user.id
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    return account


@router.patch("/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: UUID,
    account_data: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 수정"""
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == current_user.id
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # If setting as primary, unset other primary accounts
    if account_data.is_primary:
        result = await db.execute(
            select(Account).where(
                Account.user_id == current_user.id,
                Account.is_primary == True,
                Account.id != account_id
            )
        )
        for acc in result.scalars():
            acc.is_primary = False

    # Update fields
    update_data = account_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    await db.commit()
    await db.refresh(account)

    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 삭제"""
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == current_user.id
        )
    )
    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    await db.delete(account)
    await db.commit()
