import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id", ondelete="SET NULL"), nullable=True, index=True)

    amount = Column(Numeric(15, 2), nullable=False)
    memo = Column(Text, nullable=True)
    purchase_url = Column(String(2048), nullable=True)  # 온라인 구매 URL
    satisfaction = Column(Boolean, nullable=True)  # True=만족, False=불만족, None=미평가
    expense_at = Column(DateTime, nullable=False, index=True)  # 지출 시간
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="expenses")
    account = relationship("Account", back_populates="expenses")
    subcategory = relationship("Subcategory", back_populates="expenses")
    product = relationship("Product", back_populates="expenses")
    store = relationship("Store", back_populates="expenses")
    photos = relationship("ExpensePhoto", back_populates="expense", cascade="all, delete-orphan")


class ExpensePhoto(Base):
    __tablename__ = "expense_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(512), nullable=False)  # 로컬 파일 경로
    thumbnail_path = Column(String(512), nullable=True)  # 썸네일 파일 경로
    media_type = Column(String(10), default="image")  # "image" or "video"
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    expense = relationship("Expense", back_populates="photos")
