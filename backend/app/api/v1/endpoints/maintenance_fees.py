from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.maintenance_fee import MaintenanceFee, MaintenanceFeeRecord, MaintenanceFeeDetail
from app.schemas.maintenance_fee import (
    MaintenanceFeeCreate, MaintenanceFeeUpdate, MaintenanceFeeResponse,
    MaintenanceFeeOrderUpdate,
    MaintenanceFeeRecordCreate, MaintenanceFeeRecordUpdate, MaintenanceFeeRecordResponse,
    MaintenanceFeeRecordWithDetails, MaintenanceFeeRecordWithDetailsCreate,
    MaintenanceFeeDetailCreate, MaintenanceFeeDetailUpdate, MaintenanceFeeDetailResponse,
    MaintenanceFeeDetailBulkCreate,
    MaintenanceFeeStatsByMonth, MaintenanceFeeStatsByItem
)
from app.core.deps import get_current_user

router = APIRouter()


# =====================
# MaintenanceFee (관리비 장소) CRUD
# =====================

@router.get("/", response_model=List[MaintenanceFeeResponse])
async def get_maintenance_fees(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 장소 목록 조회"""
    result = await db.execute(
        select(MaintenanceFee)
        .where(MaintenanceFee.user_id == current_user.id)
        .order_by(MaintenanceFee.sort_order, MaintenanceFee.name)
    )
    return result.scalars().all()


@router.post("/", response_model=MaintenanceFeeResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance_fee(
    data: MaintenanceFeeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 장소 생성"""
    # Get max sort_order
    max_order_result = await db.execute(
        select(func.coalesce(func.max(MaintenanceFee.sort_order), -1))
        .where(MaintenanceFee.user_id == current_user.id)
    )
    max_order = max_order_result.scalar()

    maintenance_fee = MaintenanceFee(
        user_id=current_user.id,
        name=data.name,
        address=data.address,
        memo=data.memo,
        is_active=data.is_active,
        sort_order=max_order + 1
    )
    db.add(maintenance_fee)
    await db.commit()
    await db.refresh(maintenance_fee)

    return maintenance_fee


@router.get("/{fee_id}", response_model=MaintenanceFeeResponse)
async def get_maintenance_fee(
    fee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 장소 상세 조회"""
    result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    fee = result.scalar_one_or_none()

    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    return fee


@router.patch("/{fee_id}", response_model=MaintenanceFeeResponse)
async def update_maintenance_fee(
    fee_id: UUID,
    data: MaintenanceFeeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 장소 수정"""
    result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    fee = result.scalar_one_or_none()

    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fee, field, value)

    await db.commit()
    await db.refresh(fee)

    return fee


@router.delete("/{fee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_fee(
    fee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 장소 삭제"""
    result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    fee = result.scalar_one_or_none()

    if not fee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    await db.delete(fee)
    await db.commit()


@router.put("/order", status_code=status.HTTP_200_OK)
async def update_maintenance_fee_order(
    order_data: MaintenanceFeeOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 장소 순서 변경"""
    for item in order_data.items:
        result = await db.execute(
            select(MaintenanceFee).where(
                MaintenanceFee.id == item.id,
                MaintenanceFee.user_id == current_user.id
            )
        )
        fee = result.scalar_one_or_none()
        if fee:
            fee.sort_order = item.sort_order

    await db.commit()
    return {"message": "순서가 변경되었습니다."}


# =====================
# MaintenanceFeeRecord (월별 기록) CRUD
# =====================

@router.get("/{fee_id}/records", response_model=List[MaintenanceFeeRecordWithDetails])
async def get_maintenance_fee_records(
    fee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 월별 기록 목록 조회 (상세 항목 포함)"""
    # 먼저 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(MaintenanceFeeRecord)
        .options(selectinload(MaintenanceFeeRecord.details))
        .where(MaintenanceFeeRecord.maintenance_fee_id == fee_id)
        .order_by(MaintenanceFeeRecord.year_month.desc())
    )
    return result.scalars().all()


@router.post("/{fee_id}/records", response_model=MaintenanceFeeRecordWithDetails, status_code=status.HTTP_201_CREATED)
async def create_maintenance_fee_record(
    fee_id: UUID,
    data: MaintenanceFeeRecordWithDetailsCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 월별 기록 생성 (상세 항목 포함)"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    # 중복 체크
    existing = await db.execute(
        select(MaintenanceFeeRecord).where(
            MaintenanceFeeRecord.maintenance_fee_id == fee_id,
            MaintenanceFeeRecord.year_month == data.year_month
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{data.year_month} 관리비 기록이 이미 존재합니다."
        )

    # 기록 생성
    record = MaintenanceFeeRecord(
        maintenance_fee_id=fee_id,
        year_month=data.year_month,
        total_amount=data.total_amount,
        due_date=data.due_date,
        paid_date=data.paid_date,
        is_paid=data.is_paid,
        memo=data.memo
    )
    db.add(record)
    await db.flush()

    # 상세 항목 생성
    for idx, detail_data in enumerate(data.details):
        detail = MaintenanceFeeDetail(
            record_id=record.id,
            category=detail_data.category,
            item_name=detail_data.item_name,
            amount=detail_data.amount,
            usage_amount=detail_data.usage_amount,
            usage_unit=detail_data.usage_unit,
            is_vat_included=detail_data.is_vat_included,
            sort_order=idx
        )
        db.add(detail)

    await db.commit()

    # 상세 항목 포함해서 다시 조회
    result = await db.execute(
        select(MaintenanceFeeRecord)
        .options(selectinload(MaintenanceFeeRecord.details))
        .where(MaintenanceFeeRecord.id == record.id)
    )
    return result.scalar_one()


@router.get("/{fee_id}/records/{record_id}", response_model=MaintenanceFeeRecordWithDetails)
async def get_maintenance_fee_record(
    fee_id: UUID,
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 월별 기록 상세 조회"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(MaintenanceFeeRecord)
        .options(selectinload(MaintenanceFeeRecord.details))
        .where(
            MaintenanceFeeRecord.id == record_id,
            MaintenanceFeeRecord.maintenance_fee_id == fee_id
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 기록을 찾을 수 없습니다."
        )

    return record


@router.patch("/{fee_id}/records/{record_id}", response_model=MaintenanceFeeRecordWithDetails)
async def update_maintenance_fee_record(
    fee_id: UUID,
    record_id: UUID,
    data: MaintenanceFeeRecordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 월별 기록 수정"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(MaintenanceFeeRecord)
        .options(selectinload(MaintenanceFeeRecord.details))
        .where(
            MaintenanceFeeRecord.id == record_id,
            MaintenanceFeeRecord.maintenance_fee_id == fee_id
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 기록을 찾을 수 없습니다."
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    await db.commit()
    await db.refresh(record)

    return record


@router.delete("/{fee_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_fee_record(
    fee_id: UUID,
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 월별 기록 삭제"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(MaintenanceFeeRecord).where(
            MaintenanceFeeRecord.id == record_id,
            MaintenanceFeeRecord.maintenance_fee_id == fee_id
        )
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 기록을 찾을 수 없습니다."
        )

    await db.delete(record)
    await db.commit()


# =====================
# MaintenanceFeeDetail (상세 항목) CRUD
# =====================

@router.post("/{fee_id}/records/{record_id}/details", response_model=MaintenanceFeeDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_maintenance_fee_detail(
    fee_id: UUID,
    record_id: UUID,
    data: MaintenanceFeeDetailCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 상세 항목 추가"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    # 기록 확인
    record_result = await db.execute(
        select(MaintenanceFeeRecord).where(
            MaintenanceFeeRecord.id == record_id,
            MaintenanceFeeRecord.maintenance_fee_id == fee_id
        )
    )
    if not record_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 기록을 찾을 수 없습니다."
        )

    # Get max sort_order
    max_order_result = await db.execute(
        select(func.coalesce(func.max(MaintenanceFeeDetail.sort_order), -1))
        .where(MaintenanceFeeDetail.record_id == record_id)
    )
    max_order = max_order_result.scalar()

    detail = MaintenanceFeeDetail(
        record_id=record_id,
        category=data.category,
        item_name=data.item_name,
        amount=data.amount,
        usage_amount=data.usage_amount,
        usage_unit=data.usage_unit,
        is_vat_included=data.is_vat_included,
        sort_order=max_order + 1
    )
    db.add(detail)
    await db.commit()
    await db.refresh(detail)

    return detail


@router.put("/{fee_id}/records/{record_id}/details", response_model=List[MaintenanceFeeDetailResponse])
async def bulk_update_maintenance_fee_details(
    fee_id: UUID,
    record_id: UUID,
    data: MaintenanceFeeDetailBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 상세 항목 일괄 저장 (기존 항목 삭제 후 새로 생성)"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    # 기록 확인
    record_result = await db.execute(
        select(MaintenanceFeeRecord).where(
            MaintenanceFeeRecord.id == record_id,
            MaintenanceFeeRecord.maintenance_fee_id == fee_id
        )
    )
    record = record_result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 기록을 찾을 수 없습니다."
        )

    # 기존 상세 항목 삭제
    existing_details = await db.execute(
        select(MaintenanceFeeDetail).where(MaintenanceFeeDetail.record_id == record_id)
    )
    for detail in existing_details.scalars().all():
        await db.delete(detail)

    # 새 상세 항목 생성
    new_details = []
    total_amount = 0
    for idx, detail_data in enumerate(data.details):
        detail = MaintenanceFeeDetail(
            record_id=record_id,
            category=detail_data.category,
            item_name=detail_data.item_name,
            amount=detail_data.amount,
            usage_amount=detail_data.usage_amount,
            usage_unit=detail_data.usage_unit,
            is_vat_included=detail_data.is_vat_included,
            sort_order=idx
        )
        db.add(detail)
        new_details.append(detail)
        total_amount += detail_data.amount

    # 총액 업데이트
    record.total_amount = total_amount

    await db.commit()

    # 새로 생성된 항목들 refresh
    for detail in new_details:
        await db.refresh(detail)

    return new_details


@router.patch("/{fee_id}/records/{record_id}/details/{detail_id}", response_model=MaintenanceFeeDetailResponse)
async def update_maintenance_fee_detail(
    fee_id: UUID,
    record_id: UUID,
    detail_id: UUID,
    data: MaintenanceFeeDetailUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 상세 항목 수정"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(MaintenanceFeeDetail).where(
            MaintenanceFeeDetail.id == detail_id,
            MaintenanceFeeDetail.record_id == record_id
        )
    )
    detail = result.scalar_one_or_none()

    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 항목을 찾을 수 없습니다."
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(detail, field, value)

    await db.commit()
    await db.refresh(detail)

    return detail


@router.delete("/{fee_id}/records/{record_id}/details/{detail_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_maintenance_fee_detail(
    fee_id: UUID,
    record_id: UUID,
    detail_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """관리비 상세 항목 삭제"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(MaintenanceFeeDetail).where(
            MaintenanceFeeDetail.id == detail_id,
            MaintenanceFeeDetail.record_id == record_id
        )
    )
    detail = result.scalar_one_or_none()

    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 항목을 찾을 수 없습니다."
        )

    await db.delete(detail)
    await db.commit()


# =====================
# 통계 API
# =====================

@router.get("/{fee_id}/statistics/monthly", response_model=List[MaintenanceFeeStatsByMonth])
async def get_maintenance_fee_stats_by_month(
    fee_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """월별 관리비 총액 추이"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(
            MaintenanceFeeRecord.year_month,
            MaintenanceFeeRecord.total_amount
        )
        .where(MaintenanceFeeRecord.maintenance_fee_id == fee_id)
        .order_by(MaintenanceFeeRecord.year_month)
    )

    return [
        MaintenanceFeeStatsByMonth(year_month=row.year_month, total_amount=row.total_amount)
        for row in result.all()
    ]


@router.get("/{fee_id}/statistics/items", response_model=List[MaintenanceFeeStatsByItem])
async def get_maintenance_fee_stats_by_item(
    fee_id: UUID,
    item_name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """특정 항목의 월별 추이 (예: 전기료 추이)"""
    # 장소 소유권 확인
    fee_result = await db.execute(
        select(MaintenanceFee).where(
            MaintenanceFee.id == fee_id,
            MaintenanceFee.user_id == current_user.id
        )
    )
    if not fee_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="관리비 장소를 찾을 수 없습니다."
        )

    result = await db.execute(
        select(
            MaintenanceFeeRecord.year_month,
            MaintenanceFeeDetail.item_name,
            MaintenanceFeeDetail.amount,
            MaintenanceFeeDetail.usage_amount,
            MaintenanceFeeDetail.usage_unit
        )
        .join(MaintenanceFeeRecord, MaintenanceFeeDetail.record_id == MaintenanceFeeRecord.id)
        .where(
            MaintenanceFeeRecord.maintenance_fee_id == fee_id,
            MaintenanceFeeDetail.item_name == item_name
        )
        .order_by(MaintenanceFeeRecord.year_month)
    )

    return [
        MaintenanceFeeStatsByItem(
            year_month=row.year_month,
            item_name=row.item_name,
            amount=row.amount,
            usage_amount=row.usage_amount,
            usage_unit=row.usage_unit
        )
        for row in result.all()
    ]
