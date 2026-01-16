import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=False, index=True)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)

    amount = Column(Numeric(15, 2), nullable=False)
    memo = Column(Text, nullable=True)
    purchase_url = Column(String(2048), nullable=True)  # 온라인 구매 URL
    expense_at = Column(DateTime, nullable=False, index=True)  # 지출 시간
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="expenses")
    account = relationship("Account", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
    subcategory = relationship("Subcategory", back_populates="expenses")
    product = relationship("Product", back_populates="expenses")
