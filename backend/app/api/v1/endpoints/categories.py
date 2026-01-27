from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.category import Category, Subcategory, Product
from app.models.expense import Expense
from app.schemas.category import (
    CategoryCreate, CategoryUpdate, CategoryResponse, CategoryWithSubcategories,
    CategoryOrderUpdate,
    SubcategoryCreate, SubcategoryUpdate, SubcategoryResponse, SubcategoryOrderUpdate,
    ProductCreate, ProductUpdate, ProductResponse
)
from app.core.deps import get_current_user

router = APIRouter()


# ==================== Categories ====================

@router.get("/", response_model=List[CategoryWithSubcategories])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카테고리 목록 조회 (본인 카테고리만, 소 카테고리 포함)"""
    result = await db.execute(
        select(Category)
        .where(Category.user_id == current_user.id)
        .options(selectinload(Category.subcategories))
        .order_by(Category.sort_order, Category.name)
    )
    return result.scalars().all()


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카테고리 생성"""
    # Check if name already exists for this user
    result = await db.execute(
        select(Category).where(
            Category.user_id == current_user.id,
            Category.name == category_data.name
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category name already exists"
        )

    # Get max sort_order for new category
    max_order_result = await db.execute(
        select(func.coalesce(func.max(Category.sort_order), -1))
        .where(Category.user_id == current_user.id)
    )
    max_order = max_order_result.scalar()

    category = Category(
        user_id=current_user.id,
        name=category_data.name,
        icon=category_data.icon,
        sort_order=max_order + 1
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카테고리 수정"""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if new name already exists
    if category_data.name and category_data.name != category.name:
        existing = await db.execute(
            select(Category).where(
                Category.user_id == current_user.id,
                Category.name == category_data.name
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category name already exists"
            )

    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    await db.commit()
    await db.refresh(category)

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카테고리 삭제"""
    result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
    )
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if any subcategory has products
    product_count = await db.execute(
        select(func.count(Product.id))
        .join(Subcategory, Product.subcategory_id == Subcategory.id)
        .where(Subcategory.category_id == category_id)
    )
    if product_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="상품이 등록된 카테고리는 삭제할 수 없습니다"
        )

    await db.delete(category)
    await db.commit()


@router.put("/order", status_code=status.HTTP_200_OK)
async def update_category_order(
    order_data: CategoryOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카테고리 순서 변경"""
    for item in order_data.categories:
        result = await db.execute(
            select(Category).where(
                Category.id == item.id,
                Category.user_id == current_user.id
            )
        )
        category = result.scalar_one_or_none()
        if category:
            category.sort_order = item.sort_order

    await db.commit()
    return {"message": "Order updated successfully"}


# ==================== Subcategories ====================

@router.get("/{category_id}/subcategories", response_model=List[SubcategoryResponse])
async def get_subcategories(
    category_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """소 카테고리 목록 조회 (본인 카테고리의 소 카테고리만)"""
    # Check if category belongs to user
    cat_result = await db.execute(
        select(Category).where(
            Category.id == category_id,
            Category.user_id == current_user.id
        )
    )
    if not cat_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    result = await db.execute(
        select(Subcategory)
        .where(Subcategory.category_id == category_id)
        .order_by(Subcategory.sort_order, Subcategory.name)
    )
    return result.scalars().all()


@router.post("/subcategories", response_model=SubcategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_subcategory(
    subcategory_data: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """소 카테고리 생성"""
    # Check if category exists and belongs to user
    result = await db.execute(
        select(Category).where(
            Category.id == subcategory_data.category_id,
            Category.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Get max sort_order for new subcategory
    max_order_result = await db.execute(
        select(func.coalesce(func.max(Subcategory.sort_order), -1))
        .where(Subcategory.category_id == subcategory_data.category_id)
    )
    max_order = max_order_result.scalar()

    subcategory = Subcategory(
        category_id=subcategory_data.category_id,
        name=subcategory_data.name,
        sort_order=max_order + 1
    )
    db.add(subcategory)
    await db.commit()
    await db.refresh(subcategory)

    return subcategory


@router.patch("/subcategories/{subcategory_id}", response_model=SubcategoryResponse)
async def update_subcategory(
    subcategory_id: UUID,
    subcategory_data: SubcategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """소 카테고리 수정"""
    # Join with Category to check user ownership
    result = await db.execute(
        select(Subcategory)
        .join(Category)
        .where(
            Subcategory.id == subcategory_id,
            Category.user_id == current_user.id
        )
    )
    subcategory = result.scalar_one_or_none()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found"
        )

    update_data = subcategory_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subcategory, field, value)

    await db.commit()
    await db.refresh(subcategory)

    return subcategory


@router.delete("/subcategories/{subcategory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subcategory(
    subcategory_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """소 카테고리 삭제"""
    # Join with Category to check user ownership
    result = await db.execute(
        select(Subcategory)
        .join(Category)
        .where(
            Subcategory.id == subcategory_id,
            Category.user_id == current_user.id
        )
    )
    subcategory = result.scalar_one_or_none()

    if not subcategory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found"
        )

    await db.delete(subcategory)
    await db.commit()


@router.put("/subcategories/order", status_code=status.HTTP_200_OK)
async def update_subcategory_order(
    order_data: SubcategoryOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """소 카테고리 순서 변경"""
    for item in order_data.subcategories:
        # Verify ownership through category
        result = await db.execute(
            select(Subcategory)
            .join(Category)
            .where(
                Subcategory.id == item.id,
                Category.user_id == current_user.id
            )
        )
        subcategory = result.scalar_one_or_none()
        if subcategory:
            subcategory.sort_order = item.sort_order

    await db.commit()
    return {"message": "Order updated successfully"}


# ==================== Products ====================

@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    subcategory_id: UUID = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """제품 목록 조회 (본인 제품만, 즐겨찾기 우선)"""
    query = select(Product).where(Product.user_id == current_user.id)

    if subcategory_id:
        query = query.where(Product.subcategory_id == subcategory_id)

    # 즐겨찾기 우선 정렬, 그 다음 이름순
    query = query.order_by(Product.is_favorite.desc(), Product.name)
    result = await db.execute(query)

    return result.scalars().all()


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """제품 생성"""
    # Check if subcategory exists and belongs to user's category
    result = await db.execute(
        select(Subcategory)
        .join(Category)
        .where(
            Subcategory.id == product_data.subcategory_id,
            Category.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found"
        )

    product = Product(
        subcategory_id=product_data.subcategory_id,
        user_id=current_user.id,
        name=product_data.name,
        default_price=str(product_data.default_price) if product_data.default_price else None,
        default_account_id=product_data.default_account_id,
        memo=product_data.memo
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    return product


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """제품 수정"""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.user_id == current_user.id
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    update_data = product_data.model_dump(exclude_unset=True)
    if "default_price" in update_data and update_data["default_price"] is not None:
        update_data["default_price"] = str(update_data["default_price"])

    for field, value in update_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """제품 삭제"""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.user_id == current_user.id
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Check if product has expenses
    expense_count = await db.execute(
        select(func.count(Expense.id)).where(Expense.product_id == product_id)
    )
    if expense_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="지출내역이 등록된 상품은 삭제할 수 없습니다"
        )

    await db.delete(product)
    await db.commit()


@router.post("/products/{product_id}/toggle-favorite", response_model=ProductResponse)
async def toggle_product_favorite(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """제품 즐겨찾기 토글"""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.user_id == current_user.id
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    product.is_favorite = not product.is_favorite
    await db.commit()
    await db.refresh(product)

    return product
