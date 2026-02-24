from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class StoreBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    road_address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    naver_place_id: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)


class StoreCreate(StoreBase):
    store_category_id: Optional[UUID] = None
    store_subcategory_id: Optional[UUID] = None


class StoreUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    road_address: Optional[str] = Field(None, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    naver_place_id: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=50)
    store_category_id: Optional[UUID] = None
    store_subcategory_id: Optional[UUID] = None


class StoreResponse(StoreBase):
    id: UUID
    store_category_id: Optional[UUID] = None
    store_subcategory_id: Optional[UUID] = None
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class StoreMoveCategory(BaseModel):
    store_category_id: UUID
    store_subcategory_id: UUID


class StoreOrderItem(BaseModel):
    id: UUID
    sort_order: int


class StoreOrderUpdate(BaseModel):
    stores: List[StoreOrderItem]


# 네이버 지역 검색 결과
class NaverPlaceItem(BaseModel):
    title: str  # 상호명 (HTML 태그 포함 가능)
    link: str  # 업체 홈페이지
    category: str  # 업종
    description: str  # 설명
    telephone: str  # 전화번호
    address: str  # 지번 주소
    road_address: str  # 도로명 주소
    mapx: str  # X 좌표 (경도 * 10000000)
    mapy: str  # Y 좌표 (위도 * 10000000)


class NaverSearchResponse(BaseModel):
    items: List[NaverPlaceItem]
    total: int
    start: int
    display: int
