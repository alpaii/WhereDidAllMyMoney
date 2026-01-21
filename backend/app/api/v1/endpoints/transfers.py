from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.models.user import User
from app.models.account import Account, Transfer
from app.schemas.account import TransferCreate, TransferUpdate, TransferResponse
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


@router.patch("/{transfer_id}", response_model=TransferResponse)
async def update_transfer(
    transfer_id: UUID,
    transfer_data: TransferUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """이체 수정"""
    # Get user's account IDs
    result = await db.execute(
        select(Account.id).where(Account.user_id == current_user.id)
    )
    user_account_ids = [row[0] for row in result.all()]

    # Get existing transfer
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

    # Get old accounts to restore balances
    result = await db.execute(
        select(Account).where(Account.id == transfer.from_account_id)
    )
    old_from_account = result.scalar_one()

    result = await db.execute(
        select(Account).where(Account.id == transfer.to_account_id)
    )
    old_to_account = result.scalar_one()

    # Restore old balances
    old_from_account.balance += transfer.amount
    old_to_account.balance -= transfer.amount

    update_data = transfer_data.model_dump(exclude_unset=True)

    # Get new account IDs (or use existing)
    new_from_account_id = update_data.get("from_account_id", transfer.from_account_id)
    new_to_account_id = update_data.get("to_account_id", transfer.to_account_id)
    new_amount = update_data.get("amount", transfer.amount)

    # Verify new accounts belong to user
    if new_from_account_id != transfer.from_account_id or new_to_account_id != transfer.to_account_id:
        if new_from_account_id not in user_account_ids or new_to_account_id not in user_account_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both accounts not found"
            )

    if new_from_account_id == new_to_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same account"
        )

    # Get new accounts and apply new balances
    result = await db.execute(
        select(Account).where(Account.id == new_from_account_id)
    )
    new_from_account = result.scalar_one()

    result = await db.execute(
        select(Account).where(Account.id == new_to_account_id)
    )
    new_to_account = result.scalar_one()

    new_from_account.balance -= new_amount
    new_to_account.balance += new_amount

    # Update transfer fields
    for field, value in update_data.items():
        setattr(transfer, field, value)

    await db.commit()
    await db.refresh(transfer)

    return transfer


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transfer(
    transfer_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """이체 삭제"""
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

    # Restore account balances
    result = await db.execute(
        select(Account).where(Account.id == transfer.from_account_id)
    )
    from_account = result.scalar_one()

    result = await db.execute(
        select(Account).where(Account.id == transfer.to_account_id)
    )
    to_account = result.scalar_one()

    from_account.balance += transfer.amount
    to_account.balance -= transfer.amount

    await db.delete(transfer)
    await db.commit()
