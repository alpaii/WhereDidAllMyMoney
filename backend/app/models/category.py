import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True)
    is_system = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="categories")
    subcategories = relationship("Subcategory", back_populates="category", cascade="all, delete-orphan", order_by="Subcategory.sort_order")
    expenses = relationship("Expense", back_populates="category")


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    category = relationship("Category", back_populates="subcategories")
    products = relationship("Product", back_populates="subcategory", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="subcategory")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subcategory_id = Column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    default_account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(200), nullable=False)
    default_price = Column(String(15), nullable=True)  # 자주 사용하는 가격
    memo = Column(String(1000), nullable=True)
    is_favorite = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subcategory = relationship("Subcategory", back_populates="products")
    user = relationship("User", back_populates="products")
    default_account = relationship("Account", foreign_keys=[default_account_id])
    expenses = relationship("Expense", back_populates="product")
