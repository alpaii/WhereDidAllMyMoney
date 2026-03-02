from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


# ExpensePhoto schemas
class ExpensePhotoResponse(BaseModel):
    id: UUID
    expense_id: UUID
    file_path: str
    thumbnail_path: Optional[str] = None
    media_type: str = "image"
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# Base
class ExpenseBase(BaseModel):
    amount: Decimal
    memo: Optional[str] = None
    purchase_url: Optional[str] = Field(None, max_length=2048)
    satisfaction: Optional[bool] = None  # True=만족, False=불만족, None=미평가
    expense_at: datetime


# Create
class ExpenseCreate(ExpenseBase):
    account_id: UUID
    subcategory_id: UUID
    product_id: UUID
    store_id: Optional[UUID] = None


# Update
class ExpenseUpdate(BaseModel):
    account_id: Optional[UUID] = None
    subcategory_id: Optional[UUID] = None
    product_id: Optional[UUID] = None
    store_id: Optional[UUID] = None
    amount: Optional[Decimal] = None
    memo: Optional[str] = None
    purchase_url: Optional[str] = Field(None, max_length=2048)
    satisfaction: Optional[bool] = None
    expense_at: Optional[datetime] = None


# Response
class ExpenseResponse(ExpenseBase):
    id: UUID
    user_id: UUID
    account_id: UUID
    category_id: Optional[UUID] = None
    subcategory_id: UUID
    product_id: Optional[UUID]
    store_id: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExpenseWithDetails(ExpenseResponse):
    account_name: Optional[str] = None
    category_name: Optional[str] = None
    subcategory_name: Optional[str] = None
    product_name: Optional[str] = None
    store_name: Optional[str] = None
    photos: List[ExpensePhotoResponse] = []


# Paginated response
class PaginatedExpenseResponse(BaseModel):
    items: list[ExpenseWithDetails]
    total: int
    total_amount: Decimal
    page: int
    size: int
    pages: int


# Statistics
class ExpenseStatsByCategory(BaseModel):
    category_id: UUID
    category_name: str
    total_amount: Decimal
    count: int


class ExpenseStatsByPeriod(BaseModel):
    period: str  # YYYY-MM or YYYY-MM-DD
    total_amount: Decimal
    count: int


class ExpenseSummary(BaseModel):
    total_amount: Decimal
    count: int
    by_category: list[ExpenseStatsByCategory]
    by_period: list[ExpenseStatsByPeriod]
