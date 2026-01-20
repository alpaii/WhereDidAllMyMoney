from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from calendar import monthrange
from pydantic import BaseModel
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.expense import Expense
from app.schemas.expense import (
    ExpenseStatsByCategory, ExpenseStatsByPeriod, ExpenseSummary
)
from app.core.deps import get_current_user

router = APIRouter()


# Response models for new endpoints
class MonthlySummaryResponse(BaseModel):
    year: int
    month: int
    total_expense: Decimal
    expense_count: int
    daily_average: Decimal


class CategorySummaryResponse(BaseModel):
    category_id: str
    category_name: str
    category_icon: Optional[str] = None
    total_amount: Decimal
    expense_count: int
    percentage: Decimal


class DailyExpenseResponse(BaseModel):
    date: str
    total_amount: Decimal
    expense_count: int


@router.get("/summary", response_model=ExpenseSummary)
async def get_expense_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """지출 통계 요약"""
    # Base query conditions
    conditions = [Expense.user_id == current_user.id]

    if start_date:
        conditions.append(Expense.expense_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(Expense.expense_at <= datetime.combine(end_date, datetime.max.time()))

    # Total amount and count
    total_query = select(
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
        func.count(Expense.id).label("count")
    ).where(*conditions)

    result = await db.execute(total_query)
    total_row = result.one()
    total_amount = Decimal(str(total_row.total))
    total_count = total_row.count

    # By category
    category_query = (
        select(
            Category.id,
            Category.name,
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count")
        )
        .join(Expense, Expense.category_id == Category.id)
        .where(*conditions)
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Expense.amount).desc())
    )

    result = await db.execute(category_query)
    by_category = [
        ExpenseStatsByCategory(
            category_id=row.id,
            category_name=row.name,
            total_amount=Decimal(str(row.total)),
            count=row.count
        )
        for row in result.all()
    ]

    # By period (monthly)
    period_query = (
        select(
            func.to_char(Expense.expense_at, 'YYYY-MM').label("period"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count")
        )
        .where(*conditions)
        .group_by(func.to_char(Expense.expense_at, 'YYYY-MM'))
        .order_by(func.to_char(Expense.expense_at, 'YYYY-MM').desc())
    )

    result = await db.execute(period_query)
    by_period = [
        ExpenseStatsByPeriod(
            period=row.period,
            total_amount=Decimal(str(row.total)),
            count=row.count
        )
        for row in result.all()
    ]

    return ExpenseSummary(
        total_amount=total_amount,
        count=total_count,
        by_category=by_category,
        by_period=by_period
    )


@router.get("/by-category", response_model=list[ExpenseStatsByCategory])
async def get_expenses_by_category(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """카테고리별 지출 통계"""
    conditions = [Expense.user_id == current_user.id]

    if start_date:
        conditions.append(Expense.expense_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(Expense.expense_at <= datetime.combine(end_date, datetime.max.time()))

    query = (
        select(
            Category.id,
            Category.name,
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count")
        )
        .join(Expense, Expense.category_id == Category.id)
        .where(*conditions)
        .group_by(Category.id, Category.name)
        .order_by(func.sum(Expense.amount).desc())
    )

    result = await db.execute(query)

    return [
        ExpenseStatsByCategory(
            category_id=row.id,
            category_name=row.name,
            total_amount=Decimal(str(row.total)),
            count=row.count
        )
        for row in result.all()
    ]


@router.get("/by-period", response_model=list[ExpenseStatsByPeriod])
async def get_expenses_by_period(
    period_type: str = Query(default="monthly", regex="^(daily|monthly|yearly)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """기간별 지출 통계"""
    conditions = [Expense.user_id == current_user.id]

    if start_date:
        conditions.append(Expense.expense_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        conditions.append(Expense.expense_at <= datetime.combine(end_date, datetime.max.time()))

    # Date format based on period type
    format_map = {
        "daily": "YYYY-MM-DD",
        "monthly": "YYYY-MM",
        "yearly": "YYYY"
    }
    date_format = format_map[period_type]

    query = (
        select(
            func.to_char(Expense.expense_at, date_format).label("period"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count")
        )
        .where(*conditions)
        .group_by(func.to_char(Expense.expense_at, date_format))
        .order_by(func.to_char(Expense.expense_at, date_format).desc())
    )

    result = await db.execute(query)

    return [
        ExpenseStatsByPeriod(
            period=row.period,
            total_amount=Decimal(str(row.total)),
            count=row.count
        )
        for row in result.all()
    ]


@router.get("/monthly/{year}/{month}", response_model=MonthlySummaryResponse)
async def get_monthly_summary(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """월별 지출 요약"""
    # Get the first and last day of the month
    _, last_day = monthrange(year, month)
    start_date = datetime(year, month, 1)
    end_date = datetime(year, month, last_day, 23, 59, 59)

    conditions = [
        Expense.user_id == current_user.id,
        Expense.expense_at >= start_date,
        Expense.expense_at <= end_date
    ]

    query = select(
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
        func.count(Expense.id).label("count")
    ).where(*conditions)

    result = await db.execute(query)
    row = result.one()

    total_expense = Decimal(str(row.total))
    expense_count = row.count
    daily_average = total_expense / last_day if total_expense > 0 else Decimal("0")

    return MonthlySummaryResponse(
        year=year,
        month=month,
        total_expense=total_expense,
        expense_count=expense_count,
        daily_average=daily_average.quantize(Decimal("0.01"))
    )


@router.get("/category/{year}/{month}", response_model=list[CategorySummaryResponse])
async def get_category_summary(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """월별 카테고리별 지출 통계"""
    _, last_day = monthrange(year, month)
    start_date = datetime(year, month, 1)
    end_date = datetime(year, month, last_day, 23, 59, 59)

    conditions = [
        Expense.user_id == current_user.id,
        Expense.expense_at >= start_date,
        Expense.expense_at <= end_date
    ]

    # Get total for percentage calculation
    total_query = select(
        func.coalesce(func.sum(Expense.amount), 0).label("total")
    ).where(*conditions)
    total_result = await db.execute(total_query)
    total_amount = Decimal(str(total_result.scalar_one()))

    # Get by category
    query = (
        select(
            Category.id,
            Category.name,
            Category.icon,
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count")
        )
        .join(Expense, Expense.category_id == Category.id)
        .where(*conditions)
        .group_by(Category.id, Category.name, Category.icon)
        .order_by(func.sum(Expense.amount).desc())
    )

    result = await db.execute(query)

    return [
        CategorySummaryResponse(
            category_id=str(row.id),
            category_name=row.name,
            category_icon=row.icon,
            total_amount=Decimal(str(row.total)),
            expense_count=row.count,
            percentage=(Decimal(str(row.total)) / total_amount * 100).quantize(Decimal("0.01")) if total_amount > 0 else Decimal("0")
        )
        for row in result.all()
    ]


@router.get("/daily/{year}/{month}", response_model=list[DailyExpenseResponse])
async def get_daily_expenses(
    year: int,
    month: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """월별 일별 지출 통계"""
    _, last_day = monthrange(year, month)
    start_date = datetime(year, month, 1)
    end_date = datetime(year, month, last_day, 23, 59, 59)

    conditions = [
        Expense.user_id == current_user.id,
        Expense.expense_at >= start_date,
        Expense.expense_at <= end_date
    ]

    query = (
        select(
            func.to_char(Expense.expense_at, 'YYYY-MM-DD').label("date"),
            func.coalesce(func.sum(Expense.amount), 0).label("total"),
            func.count(Expense.id).label("count")
        )
        .where(*conditions)
        .group_by(func.to_char(Expense.expense_at, 'YYYY-MM-DD'))
        .order_by(func.to_char(Expense.expense_at, 'YYYY-MM-DD'))
    )

    result = await db.execute(query)

    return [
        DailyExpenseResponse(
            date=row.date,
            total_amount=Decimal(str(row.total)),
            expense_count=row.count
        )
        for row in result.all()
    ]
