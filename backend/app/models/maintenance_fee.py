import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text, Boolean, Integer, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class MaintenanceFee(Base):
    """관리비 장소 (집, 사무실 등)"""
    __tablename__ = "maintenance_fees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # 예: "집", "사무실"
    address = Column(String(500), nullable=True)  # 주소
    memo = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="maintenance_fees")
    records = relationship("MaintenanceFeeRecord", back_populates="maintenance_fee", cascade="all, delete-orphan")


class MaintenanceFeeRecord(Base):
    """월별 관리비 기록"""
    __tablename__ = "maintenance_fee_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    maintenance_fee_id = Column(UUID(as_uuid=True), ForeignKey("maintenance_fees.id", ondelete="CASCADE"), nullable=False, index=True)
    year_month = Column(String(7), nullable=False, index=True)  # 형식: "2025-11"
    total_amount = Column(Numeric(15, 2), nullable=False, default=0)
    due_date = Column(Date, nullable=True)  # 납부 기한
    paid_date = Column(Date, nullable=True)  # 실제 납부일
    is_paid = Column(Boolean, default=False)  # 납부 여부
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    maintenance_fee = relationship("MaintenanceFee", back_populates="records")
    details = relationship("MaintenanceFeeDetail", back_populates="record", cascade="all, delete-orphan")


class MaintenanceFeeDetail(Base):
    """관리비 상세 항목"""
    __tablename__ = "maintenance_fee_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("maintenance_fee_records.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), nullable=False)  # 관리비, 에너지, 기타
    item_name = Column(String(100), nullable=False)  # 일반관리비, 전기료 등
    amount = Column(Numeric(15, 2), nullable=False, default=0)
    usage_amount = Column(Numeric(15, 2), nullable=True)  # 사용량 (241 kWh 등)
    usage_unit = Column(String(20), nullable=True)  # 단위 (kWh, ㎥, MJ 등)
    is_vat_included = Column(Boolean, default=True)  # 부가세 포함 여부
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    record = relationship("MaintenanceFeeRecord", back_populates="details")
