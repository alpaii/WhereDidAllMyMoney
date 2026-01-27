from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class StoreBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)


class StoreResponse(StoreBase):
    id: UUID
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class StoreOrderItem(BaseModel):
    id: UUID
    sort_order: int


class StoreOrderUpdate(BaseModel):
    stores: List[StoreOrderItem]
