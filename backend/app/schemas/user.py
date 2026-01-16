from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole


# Base
class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)


# Create
class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


# Update
class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=8, max_length=100)


# Response
class UserResponse(UserBase):
    id: UUID
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Auth
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
