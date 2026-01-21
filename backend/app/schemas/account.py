from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.models.account import AccountType


# Base
class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    account_type: AccountType
    is_primary: bool = False
    description: Optional[str] = Field(None, max_length=500)


# Create
class AccountCreate(AccountBase):
    balance: Decimal = Field(default=Decimal("0.00"))


# Update
class AccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    account_type: Optional[AccountType] = None
    is_primary: Optional[bool] = None
    balance: Optional[Decimal] = None
    description: Optional[str] = Field(None, max_length=500)


# Response
class AccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    account_type: AccountType
    balance: Decimal
    is_primary: bool
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class AccountBalanceSummary(BaseModel):
    total_balance: Decimal
    accounts: list[AccountResponse]


# Transfer
class TransferCreate(BaseModel):
    from_account_id: UUID
    to_account_id: UUID
    amount: Decimal = Field(..., gt=0)
    memo: Optional[str] = Field(None, max_length=500)
    transferred_at: Optional[datetime] = None


class TransferUpdate(BaseModel):
    from_account_id: Optional[UUID] = None
    to_account_id: Optional[UUID] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    memo: Optional[str] = Field(None, max_length=500)
    transferred_at: Optional[datetime] = None


class TransferResponse(BaseModel):
    id: UUID
    from_account_id: UUID
    to_account_id: UUID
    amount: Decimal
    memo: Optional[str]
    transferred_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
