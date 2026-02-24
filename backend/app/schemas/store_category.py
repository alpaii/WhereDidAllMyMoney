from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# Store Category
class StoreCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class StoreCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class StoreCategoryResponse(BaseModel):
    id: UUID
    name: str
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class StoreCategoryOrderItem(BaseModel):
    id: UUID
    sort_order: int


class StoreCategoryOrderUpdate(BaseModel):
    categories: List[StoreCategoryOrderItem]


# Store Subcategory
class StoreSubcategoryCreate(BaseModel):
    store_category_id: UUID
    name: str = Field(..., min_length=1, max_length=100)


class StoreSubcategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class StoreSubcategoryResponse(BaseModel):
    id: UUID
    store_category_id: UUID
    name: str
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class StoreSubcategoryOrderItem(BaseModel):
    id: UUID
    sort_order: int


class StoreSubcategoryOrderUpdate(BaseModel):
    subcategories: List[StoreSubcategoryOrderItem]


# Category with subcategories
class StoreCategoryWithSubcategories(StoreCategoryResponse):
    subcategories: List[StoreSubcategoryResponse] = []
