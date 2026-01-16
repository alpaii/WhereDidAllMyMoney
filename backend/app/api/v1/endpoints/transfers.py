from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.account import Account, Transfer
from app.schemas.account import TransferCreate, TransferResponse
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[TransferResponse])
async def get_transfers(
    account_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """이체 내역 조회"""
    # Get user's account IDs
    result = await db.execute(
        select(Account.id).where(Account.user_id == current_user.id)
    )
    user_account_ids = [row[0] for row in result.all()]

    query = select(Transfer).where(
        or_(
            Transfer.from_account_id.in_(user_account_ids),
            Transfer.to_account_id.in_(user_account_ids)
        )
    )

    if account_id:
        query = query.where(
            or_(
                Transfer.from_account_id == account_id,
                Transfer.to_account_id == account_id
            )
        )

    query = query.order_by(Transfer.transferred_at.desc())
    result = await db.execute(query)

    return result.scalars().all()


@router.post("/", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    transfer_data: TransferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """계좌 이체"""
    # Verify both accounts belong to user
    result = await db.execute(
        select(Account).where(
            Account.id == transfer_data.from_account_id,
            Account.user_id == current_user.id
        )
    )
    from_account = result.scalar_one_or_none()

    result = await db.execute(
        select(Account).where(
            Account.id == transfer_data.to_account_id,
            Account.user_id == current_user.id
        )
    )
    to_account = result.scalar_one_or_none()

    if not from_account or not to_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both accounts not found"
        )

    if from_account.id == to_account.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same account"
        )

    # Perform transfer (allow negative balance for credit cards)
    from_account.balance -= transfer_data.amount
    to_account.balance += transfer_data.amount

    # Create transfer record
    transfer = Transfer(
        from_account_id=transfer_data.from_account_id,
        to_account_id=transfer_data.to_account_id,
        amount=transfer_data.amount,
        memo=transfer_data.memo,
        transferred_at=transfer_data.transferred_at or datetime.utcnow()
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(transfer)

    return transfer


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """이체 상세 조회"""
    # Get user's account IDs
    result = await db.execute(
        select(Account.id).where(Account.user_id == current_user.id)
    )
    user_account_ids = [row[0] for row in result.all()]

    result = await db.execute(
        select(Transfer).where(
            Transfer.id == transfer_id,
            or_(
                Transfer.from_account_id.in_(user_account_ids),
                Transfer.to_account_id.in_(user_account_ids)
            )
        )
    )
    transfer = result.scalar_one_or_none()

    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found"
        )

    return transfer
