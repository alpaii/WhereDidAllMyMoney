from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.store import Store
from app.schemas.store import StoreCreate, StoreUpdate, StoreResponse, StoreOrderUpdate
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[StoreResponse])
async def get_stores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 목록 조회"""
    result = await db.execute(
        select(Store)
        .where(Store.user_id == current_user.id)
        .order_by(Store.sort_order, Store.name)
    )
    return result.scalars().all()


@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    store_data: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 생성"""
    # Get max sort_order for new store
    max_order_result = await db.execute(
        select(func.coalesce(func.max(Store.sort_order), -1))
        .where(Store.user_id == current_user.id)
    )
    max_order = max_order_result.scalar()

    store = Store(
        user_id=current_user.id,
        name=store_data.name,
        sort_order=max_order + 1
    )
    db.add(store)
    await db.commit()
    await db.refresh(store)

    return store


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 상세 조회"""
    result = await db.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == current_user.id
        )
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return store


@router.patch("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    store_data: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 수정"""
    result = await db.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == current_user.id
        )
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    update_data = store_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)

    await db.commit()
    await db.refresh(store)

    return store


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 삭제"""
    result = await db.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == current_user.id
        )
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    await db.delete(store)
    await db.commit()


@router.put("/order", status_code=status.HTTP_200_OK)
async def update_store_order(
    order_data: StoreOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 순서 변경"""
    for item in order_data.stores:
        result = await db.execute(
            select(Store).where(
                Store.id == item.id,
                Store.user_id == current_user.id
            )
        )
        store = result.scalar_one_or_none()
        if store:
            store.sort_order = item.sort_order

    await db.commit()
    return {"message": "Order updated successfully"}
