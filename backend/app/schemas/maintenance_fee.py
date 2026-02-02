from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


# =====================
# MaintenanceFeeItemTemplate (관리비 항목 템플릿)
# =====================

class MaintenanceFeeItemTemplateBase(BaseModel):
    name: str = Field(..., max_length=100)


class MaintenanceFeeItemTemplateCreate(MaintenanceFeeItemTemplateBase):
    pass


class MaintenanceFeeItemTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)


class MaintenanceFeeItemTemplateResponse(MaintenanceFeeItemTemplateBase):
    id: UUID
    maintenance_fee_id: UUID
    sort_order: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class MaintenanceFeeItemTemplateOrderItem(BaseModel):
    id: UUID
    sort_order: int


class MaintenanceFeeItemTemplateOrderUpdate(BaseModel):
    items: List[MaintenanceFeeItemTemplateOrderItem]


# =====================
# MaintenanceFee (관리비 장소)
# =====================

class MaintenanceFeeBase(BaseModel):
    name: str = Field(..., max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    memo: Optional[str] = None
    is_active: bool = True


class MaintenanceFeeCreate(MaintenanceFeeBase):
    pass


class MaintenanceFeeUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    memo: Optional[str] = None
    is_active: Optional[bool] = None


class MaintenanceFeeResponse(MaintenanceFeeBase):
    id: UUID
    user_id: UUID
    sort_order: int
    created_at: datetime
    updated_at: Optional[datetime]
    item_templates: List[MaintenanceFeeItemTemplateResponse] = []

    class Config:
        from_attributes = True


class MaintenanceFeeOrderItem(BaseModel):
    id: UUID
    sort_order: int


class MaintenanceFeeOrderUpdate(BaseModel):
    items: List[MaintenanceFeeOrderItem]


# =====================
# MaintenanceFeeRecord (월별 관리비 기록)
# =====================

class MaintenanceFeeRecordBase(BaseModel):
    year_month: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")  # YYYY-MM
    total_amount: Decimal = Field(default=0, ge=0)
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    is_paid: bool = False
    memo: Optional[str] = None


class MaintenanceFeeRecordCreate(MaintenanceFeeRecordBase):
    pass


class MaintenanceFeeRecordUpdate(BaseModel):
    year_month: Optional[str] = Field(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    total_amount: Optional[Decimal] = Field(None, ge=0)
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    is_paid: Optional[bool] = None
    memo: Optional[str] = None


class MaintenanceFeeRecordResponse(MaintenanceFeeRecordBase):
    id: UUID
    maintenance_fee_id: UUID
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# =====================
# MaintenanceFeeDetail (관리비 상세 항목)
# =====================

class MaintenanceFeeDetailBase(BaseModel):
    item_template_id: UUID
    amount: Decimal = Field(default=0)
    usage_amount: Optional[Decimal] = None
    usage_unit: Optional[str] = Field(None, max_length=20)
    is_vat_included: bool = True


class MaintenanceFeeDetailCreate(MaintenanceFeeDetailBase):
    pass


class MaintenanceFeeDetailUpdate(BaseModel):
    item_template_id: Optional[UUID] = None
    amount: Optional[Decimal] = None
    usage_amount: Optional[Decimal] = None
    usage_unit: Optional[str] = Field(None, max_length=20)
    is_vat_included: Optional[bool] = None


class MaintenanceFeeDetailResponse(MaintenanceFeeDetailBase):
    id: UUID
    record_id: UUID
    sort_order: int
    created_at: datetime
    item_template: Optional[MaintenanceFeeItemTemplateResponse] = None

    class Config:
        from_attributes = True


# =====================
# 복합 응답 타입
# =====================

class MaintenanceFeeRecordWithDetails(MaintenanceFeeRecordResponse):
    """상세 항목이 포함된 월별 기록"""
    details: List[MaintenanceFeeDetailResponse] = []


class MaintenanceFeeWithRecords(MaintenanceFeeResponse):
    """월별 기록이 포함된 관리비 장소"""
    records: List[MaintenanceFeeRecordResponse] = []


# =====================
# 일괄 저장용 스키마
# =====================

class MaintenanceFeeDetailBulkCreate(BaseModel):
    """상세 항목 일괄 생성"""
    details: List[MaintenanceFeeDetailCreate]


class MaintenanceFeeRecordWithDetailsCreate(MaintenanceFeeRecordCreate):
    """상세 항목과 함께 월별 기록 생성"""
    details: List[MaintenanceFeeDetailCreate] = []


# =====================
# 통계용 스키마
# =====================

class MaintenanceFeeStatsByMonth(BaseModel):
    """월별 관리비 통계"""
    year_month: str
    total_amount: Decimal


class MaintenanceFeeStatsByItem(BaseModel):
    """항목별 관리비 추이"""
    year_month: str
    item_name: str
    amount: Decimal
    usage_amount: Optional[Decimal] = None
    usage_unit: Optional[str] = None
