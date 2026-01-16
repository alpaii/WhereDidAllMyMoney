from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.core.deps import get_db, get_current_admin_user
from app.models.user import User, UserRole
from app.models.category import Category, Subcategory
from app.models.expense import Expense
from app.schemas.user import UserResponse
from app.db.seed import seed_categories
from pydantic import BaseModel

router = APIRouter()


class AdminStats(BaseModel):
    total_users: int
    total_categories: int
    total_expenses: int
    total_expense_amount: float


class UserRoleUpdate(BaseModel):
    role: str


class UserActiveUpdate(BaseModel):
    is_active: bool


class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None


class SubcategoryCreate(BaseModel):
    name: str


class PaginatedUsers(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int

    class Config:
        from_attributes = True


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get admin dashboard statistics"""
    # Total users
    user_result = await db.execute(select(func.count(User.id)))
    total_users = user_result.scalar() or 0

    # Total categories
    category_result = await db.execute(select(func.count(Category.id)))
    total_categories = category_result.scalar() or 0

    # Total expenses
    expense_result = await db.execute(select(func.count(Expense.id)))
    total_expenses = expense_result.scalar() or 0

    # Total expense amount
    amount_result = await db.execute(select(func.sum(Expense.amount)))
    total_expense_amount = amount_result.scalar() or 0

    return AdminStats(
        total_users=total_users,
        total_categories=total_categories,
        total_expenses=total_expenses,
        total_expense_amount=float(total_expense_amount)
    )


@router.get("/users", response_model=PaginatedUsers)
async def get_users(
    page: int = 1,
    size: int = 10,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get all users with pagination"""
    query = select(User)

    if search:
        query = query.where(
            (User.name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    offset = (page - 1) * size
    query = query.offset(offset).limit(size).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()

    pages = (total + size - 1) // size

    return PaginatedUsers(
        items=users,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update user role"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    try:
        user.role = UserRole(role_update.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")

    await db.commit()
    return {"message": "User role updated successfully"}


@router.put("/users/{user_id}/active")
async def update_user_active(
    user_id: str,
    active_update: UserActiveUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update user active status"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user.is_active = active_update.is_active
    await db.commit()
    return {"message": "User status updated successfully"}


@router.post("/categories/", response_model=dict)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new category"""
    category = Category(
        name=category_data.name,
        icon=category_data.icon,
        is_system=False
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return {"id": str(category.id), "message": "Category created successfully"}


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a category"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.name = category_data.name
    if category_data.icon is not None:
        category.icon = category_data.icon

    await db.commit()
    return {"message": "Category updated successfully"}


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a category"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if category.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system category")

    await db.delete(category)
    await db.commit()
    return {"message": "Category deleted successfully"}


@router.post("/categories/{category_id}/subcategories")
async def create_subcategory(
    category_id: str,
    subcategory_data: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Create a new subcategory"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    subcategory = Subcategory(
        category_id=category.id,
        name=subcategory_data.name
    )
    db.add(subcategory)
    await db.commit()
    await db.refresh(subcategory)
    return {"id": str(subcategory.id), "message": "Subcategory created successfully"}


@router.put("/subcategories/{subcategory_id}")
async def update_subcategory(
    subcategory_id: str,
    subcategory_data: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Update a subcategory"""
    result = await db.execute(select(Subcategory).where(Subcategory.id == subcategory_id))
    subcategory = result.scalar_one_or_none()

    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    subcategory.name = subcategory_data.name
    await db.commit()
    return {"message": "Subcategory updated successfully"}


@router.delete("/subcategories/{subcategory_id}")
async def delete_subcategory(
    subcategory_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a subcategory"""
    result = await db.execute(select(Subcategory).where(Subcategory.id == subcategory_id))
    subcategory = result.scalar_one_or_none()

    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    await db.delete(subcategory)
    await db.commit()
    return {"message": "Subcategory deleted successfully"}


@router.post("/seed")
async def run_seed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Run seed data"""
    await seed_categories(db)
    return {"message": "Seed data executed successfully"}
