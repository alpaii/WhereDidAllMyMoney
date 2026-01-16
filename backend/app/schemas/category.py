from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal


# Category
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=50)


class CategoryCreate(CategoryBase):
    pass


class CategoryResponse(CategoryBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# Subcategory
class SubcategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class SubcategoryCreate(SubcategoryBase):
    category_id: UUID


class SubcategoryResponse(SubcategoryBase):
    id: UUID
    category_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryWithSubcategories(CategoryResponse):
    subcategories: list[SubcategoryResponse] = []


# Product
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    default_price: Optional[Decimal] = None
    memo: Optional[str] = Field(None, max_length=1000)


class ProductCreate(ProductBase):
    subcategory_id: UUID


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    default_price: Optional[Decimal] = None
    memo: Optional[str] = Field(None, max_length=1000)


class ProductResponse(ProductBase):
    id: UUID
    subcategory_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
