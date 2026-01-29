import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Store(Base):
    __tablename__ = "stores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    address = Column(String(500), nullable=True)  # 지번 주소
    road_address = Column(String(500), nullable=True)  # 도로명 주소
    latitude = Column(Float, nullable=True)  # 위도
    longitude = Column(Float, nullable=True)  # 경도
    naver_place_id = Column(String(100), nullable=True)  # 네이버 플레이스 ID
    category = Column(String(200), nullable=True)  # 업종 카테고리
    phone = Column(String(50), nullable=True)  # 전화번호
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="stores")
    expenses = relationship("Expense", back_populates="store")
