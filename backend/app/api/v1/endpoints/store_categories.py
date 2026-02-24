from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.store_category import StoreCategory, StoreSubcategory
from app.models.store import Store
from app.schemas.store_category import (
    StoreCategoryCreate, StoreCategoryUpdate, StoreCategoryResponse,
    StoreCategoryWithSubcategories, StoreCategoryOrderUpdate,
    StoreSubcategoryCreate, StoreSubcategoryUpdate, StoreSubcategoryResponse,
    StoreSubcategoryOrderUpdate,
)
from app.core.deps import get_current_user

router = APIRouter()


# ==================== Store Categories ====================

@router.get("/", response_model=List[StoreCategoryWithSubcategories])
async def get_store_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 카테고리 목록 조회 (서브카테고리 포함)"""
    result = await db.execute(
        select(StoreCategory)
        .where(StoreCategory.user_id == current_user.id)
        .options(selectinload(StoreCategory.subcategories))
        .order_by(StoreCategory.sort_order, StoreCategory.name)
    )
    return result.scalars().all()


@router.post("/", response_model=StoreCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_store_category(
    category_data: StoreCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 카테고리 생성"""
    # Check if name already exists for this user
    result = await db.execute(
        select(StoreCategory).where(
            StoreCategory.user_id == current_user.id,
            StoreCategory.name == category_data.name
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store category name already exists"
        )

    # Get max sort_order
    max_order_result = await db.execute(
        select(func.coalesce(func.max(StoreCategory.sort_order), -1))
        .where(StoreCategory.user_id == current_user.id)
    )
    max_order = max_order_result.scalar()

    category = StoreCategory(
        user_id=current_user.id,
        name=category_data.name,
        sort_order=max_order + 1
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return category


@router.patch("/{category_id}", response_model=StoreCategoryResponse)
async def update_store_category(
    category_id: UUID,
    category_data: StoreCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 카테고리 수정"""
    result = await db.execute(
        select(StoreCategory).where(
            StoreCategory.id == category_id,
            StoreCategory.user_id == current_user.id
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store category not found"
        )

    # Check if new name already exists
    if category_data.name and category_data.name != category.name:
        existing = await db.execute(
            select(StoreCategory).where(
                StoreCategory.user_id == current_user.id,
                StoreCategory.name == category_data.name
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Store category name already exists"
            )

    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 카테고리 삭제 (하위 서브카테고리가 있으면 차단)"""
    result = await db.execute(
        select(StoreCategory).where(
            StoreCategory.id == category_id,
            StoreCategory.user_id == current_user.id
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store category not found"
        )

    # Check if any subcategories exist
    sub_count = await db.execute(
        select(func.count(StoreSubcategory.id))
        .where(StoreSubcategory.store_category_id == category_id)
    )
    if sub_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="서브카테고리가 있는 카테고리는 삭제할 수 없습니다"
        )

    await db.delete(category)
    await db.commit()


@router.put("/order", status_code=status.HTTP_200_OK)
async def update_store_category_order(
    order_data: StoreCategoryOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 카테고리 순서 변경"""
    for item in order_data.categories:
        result = await db.execute(
            select(StoreCategory).where(
                StoreCategory.id == item.id,
                StoreCategory.user_id == current_user.id
            )
        )
        category = result.scalar_one_or_none()
        if category:
            category.sort_order = item.sort_order

    await db.commit()
    return {"message": "Order updated successfully"}


# ==================== Store Subcategories ====================

@router.get("/{category_id}/subcategories", response_model=List[StoreSubcategoryResponse])
async def get_store_subcategories(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 서브카테고리 목록 조회"""
    # Check if category belongs to user
    cat_result = await db.execute(
        select(StoreCategory).where(
            StoreCategory.id == category_id,
            StoreCategory.user_id == current_user.id
        )
    )
    if not cat_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store category not found"
        )

    result = await db.execute(
        select(StoreSubcategory)
        .where(StoreSubcategory.store_category_id == category_id)
        .order_by(StoreSubcategory.sort_order, StoreSubcategory.name)
    )
    return result.scalars().all()


@router.post("/subcategories", response_model=StoreSubcategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_store_subcategory(
    subcategory_data: StoreSubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 서브카테고리 생성"""
    # Check if category exists and belongs to user
    result = await db.execute(
        select(StoreCategory).where(
            StoreCategory.id == subcategory_data.store_category_id,
            StoreCategory.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store category not found"
        )

    # Get max sort_order
    max_order_result = await db.execute(
        select(func.coalesce(func.max(StoreSubcategory.sort_order), -1))
        .where(StoreSubcategory.store_category_id == subcategory_data.store_category_id)
    )
    max_order = max_order_result.scalar()

    subcategory = StoreSubcategory(
        store_category_id=subcategory_data.store_category_id,
        name=subcategory_data.name,
        sort_order=max_order + 1
    )
    db.add(subcategory)
    await db.commit()
    await db.refresh(subcategory)

    return subcategory


@router.patch("/subcategories/{subcategory_id}", response_model=StoreSubcategoryResponse)
async def update_store_subcategory(
    subcategory_id: UUID,
    subcategory_data: StoreSubcategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 서브카테고리 수정"""
    # Join with StoreCategory to check user ownership
    result = await db.execute(
        select(StoreSubcategory)
        .join(StoreCategory)
        .where(
            StoreSubcategory.id == subcategory_id,
            StoreCategory.user_id == current_user.id
        )
    )
    subcategory = result.scalar_one_or_none()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store subcategory not found"
        )

    update_data = subcategory_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subcategory, field, value)

    await db.commit()
    await db.refresh(subcategory)

    return subcategory


@router.delete("/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store_subcategory(
    subcategory_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 서브카테고리 삭제 (하위 매장이 있으면 차단)"""
    # Join with StoreCategory to check user ownership
    result = await db.execute(
        select(StoreSubcategory)
        .join(StoreCategory)
        .where(
            StoreSubcategory.id == subcategory_id,
            StoreCategory.user_id == current_user.id
        )
    )
    subcategory = result.scalar_one_or_none()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store subcategory not found"
        )

    # Check if any stores exist under this subcategory
    store_count = await db.execute(
        select(func.count(Store.id))
        .where(Store.store_subcategory_id == subcategory_id)
    )
    if store_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="매장이 등록된 서브카테고리는 삭제할 수 없습니다"
        )

    await db.delete(subcategory)
    await db.commit()


@router.put("/subcategories/order", status_code=status.HTTP_200_OK)
async def update_store_subcategory_order(
    order_data: StoreSubcategoryOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 서브카테고리 순서 변경"""
    for item in order_data.subcategories:
        # Verify ownership through category
        result = await db.execute(
            select(StoreSubcategory)
            .join(StoreCategory)
            .where(
                StoreSubcategory.id == item.id,
                StoreCategory.user_id == current_user.id
            )
        )
        subcategory = result.scalar_one_or_none()
        if subcategory:
            subcategory.sort_order = item.sort_order

    await db.commit()
    return {"message": "Order updated successfully"}


# ==================== Init Default ====================

@router.post("/init-default", status_code=status.HTTP_200_OK)
async def init_default_store_category(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """기본 '임시' 카테고리 초기화 + 기존 매장 할당"""
    # Check if user already has categories
    existing = await db.execute(
        select(func.count(StoreCategory.id))
        .where(StoreCategory.user_id == current_user.id)
    )
    if existing.scalar() > 0:
        return {"message": "Already initialized"}

    # Create default category
    category = StoreCategory(
        user_id=current_user.id,
        name="임시",
        sort_order=0
    )
    db.add(category)
    await db.flush()

    # Create default subcategory
    subcategory = StoreSubcategory(
        store_category_id=category.id,
        name="임시",
        sort_order=0
    )
    db.add(subcategory)
    await db.flush()

    # Assign all unassigned stores to default subcategory
    unassigned_stores = await db.execute(
        select(Store).where(
            Store.user_id == current_user.id,
            Store.store_subcategory_id.is_(None)
        )
    )
    for store in unassigned_stores.scalars().all():
        store.store_category_id = category.id
        store.store_subcategory_id = subcategory.id

    await db.commit()

    return {"message": "Default category initialized", "category_id": str(category.id), "subcategory_id": str(subcategory.id)}
