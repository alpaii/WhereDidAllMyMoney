import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class StoreCategory(Base):
    __tablename__ = "store_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="store_categories")
    subcategories = relationship("StoreSubcategory", back_populates="store_category", cascade="all, delete-orphan", order_by="StoreSubcategory.sort_order")
    stores = relationship("Store", back_populates="store_category_rel")


class StoreSubcategory(Base):
    __tablename__ = "store_subcategories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_category_id = Column(UUID(as_uuid=True), ForeignKey("store_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    store_category = relationship("StoreCategory", back_populates="subcategories")
    stores = relationship("Store", back_populates="store_subcategory_rel")
