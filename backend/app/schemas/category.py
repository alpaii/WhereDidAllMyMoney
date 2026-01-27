from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal


# Category
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=50)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class CategoryResponse(CategoryBase):
    id: UUID
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# Category order update
class CategoryOrderItem(BaseModel):
    id: UUID
    sort_order: int


class CategoryOrderUpdate(BaseModel):
    categories: List[CategoryOrderItem]


# Subcategory
class SubcategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class SubcategoryCreate(SubcategoryBase):
    category_id: UUID


class SubcategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class SubcategoryResponse(SubcategoryBase):
    id: UUID
    category_id: UUID
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubcategoryOrderItem(BaseModel):
    id: UUID
    sort_order: int


class SubcategoryOrderUpdate(BaseModel):
    subcategories: List[SubcategoryOrderItem]


class CategoryWithSubcategories(CategoryResponse):
    subcategories: list[SubcategoryResponse] = []


# Product
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    default_price: Optional[Decimal] = None
    memo: Optional[str] = Field(None, max_length=1000)


class ProductCreate(ProductBase):
    subcategory_id: UUID
    default_account_id: UUID


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    default_price: Optional[Decimal] = None
    default_account_id: Optional[UUID] = None
    memo: Optional[str] = Field(None, max_length=1000)
    is_favorite: Optional[bool] = None


class ProductResponse(ProductBase):
    id: UUID
    subcategory_id: UUID
    user_id: UUID
    default_account_id: Optional[UUID] = None
    is_favorite: bool = False
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
