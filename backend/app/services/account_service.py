from uuid import UUID
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.account import Account


async def get_account_with_lock(
    db: AsyncSession,
    account_id: UUID,
    user_id: UUID
) -> Account:
    """
    사용자 소유의 계좌를 행 잠금(FOR UPDATE)과 함께 조회합니다.
    동시성 문제를 방지하기 위해 트랜잭션 내에서 사용해야 합니다.
    """
    result = await db.execute(
        select(Account)
        .where(Account.id == account_id, Account.user_id == user_id)
        .with_for_update()
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


async def update_balance(
    db: AsyncSession,
    account_id: UUID,
    user_id: UUID,
    delta: Decimal
) -> Account:
    """
    계좌 잔고를 안전하게 업데이트합니다.
    행 잠금을 사용하여 동시성 문제를 방지합니다.

    Args:
        db: 데이터베이스 세션
        account_id: 계좌 ID
        user_id: 사용자 ID (소유권 확인용)
        delta: 잔고 변경량 (양수: 증가, 음수: 감소)

    Returns:
        업데이트된 계좌 객체
    """
    account = await get_account_with_lock(db, account_id, user_id)
    account.balance = Decimal(str(account.balance)) + delta
    return account


async def transfer_balance(
    db: AsyncSession,
    from_account_id: UUID,
    to_account_id: UUID,
    user_id: UUID,
    amount: Decimal
) -> tuple[Account, Account]:
    """
    두 계좌 간 이체를 안전하게 처리합니다.
    행 잠금을 사용하여 동시성 문제를 방지합니다.

    Args:
        db: 데이터베이스 세션
        from_account_id: 출금 계좌 ID
        to_account_id: 입금 계좌 ID
        user_id: 사용자 ID (소유권 확인용)
        amount: 이체 금액

    Returns:
        (출금 계좌, 입금 계좌) 튜플
    """
    # 두 계좌 모두 잠금 (데드락 방지를 위해 ID 순서대로)
    if str(from_account_id) < str(to_account_id):
        from_account = await get_account_with_lock(db, from_account_id, user_id)
        to_account = await get_account_with_lock(db, to_account_id, user_id)
    else:
        to_account = await get_account_with_lock(db, to_account_id, user_id)
        from_account = await get_account_with_lock(db, from_account_id, user_id)

    from_account.balance = Decimal(str(from_account.balance)) - amount
    to_account.balance = Decimal(str(to_account.balance)) + amount

    return from_account, to_account
