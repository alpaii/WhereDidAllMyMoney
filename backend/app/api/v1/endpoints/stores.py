import re
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models.user import User
from app.models.store import Store
from app.schemas.store import StoreCreate, StoreUpdate, StoreResponse, StoreOrderUpdate, NaverSearchResponse, NaverPlaceItem
from app.core.deps import get_current_user
from app.core.config import settings

router = APIRouter()


def remove_html_tags(text: str) -> str:
    """HTML 태그 제거"""
    return re.sub(r'<[^>]+>', '', text)


@router.get("/", response_model=List[StoreResponse])
async def get_stores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 목록 조회"""
    result = await db.execute(
        select(Store)
        .where(Store.user_id == current_user.id)
        .order_by(Store.sort_order, Store.name)
    )
    return result.scalars().all()


@router.post("/", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    store_data: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 생성"""
    # Get max sort_order for new store
    max_order_result = await db.execute(
        select(func.coalesce(func.max(Store.sort_order), -1))
        .where(Store.user_id == current_user.id)
    )
    max_order = max_order_result.scalar()

    store = Store(
        user_id=current_user.id,
        name=store_data.name,
        address=store_data.address,
        road_address=store_data.road_address,
        latitude=store_data.latitude,
        longitude=store_data.longitude,
        naver_place_id=store_data.naver_place_id,
        category=store_data.category,
        phone=store_data.phone,
        sort_order=max_order + 1
    )
    db.add(store)
    await db.commit()
    await db.refresh(store)

    return store


@router.get("/{store_id}", response_model=StoreResponse)
async def get_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 상세 조회"""
    result = await db.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == current_user.id
        )
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return store


@router.patch("/{store_id}", response_model=StoreResponse)
async def update_store(
    store_id: UUID,
    store_data: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 수정"""
    result = await db.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == current_user.id
        )
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    update_data = store_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)

    await db.commit()
    await db.refresh(store)

    return store


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_store(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 삭제"""
    result = await db.execute(
        select(Store).where(
            Store.id == store_id,
            Store.user_id == current_user.id
        )
    )
    store = result.scalar_one_or_none()

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    await db.delete(store)
    await db.commit()


@router.put("/order", status_code=status.HTTP_200_OK)
async def update_store_order(
    order_data: StoreOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """매장 순서 변경"""
    for item in order_data.stores:
        result = await db.execute(
            select(Store).where(
                Store.id == item.id,
                Store.user_id == current_user.id
            )
        )
        store = result.scalar_one_or_none()
        if store:
            store.sort_order = item.sort_order

    await db.commit()
    return {"message": "Order updated successfully"}


@router.get("/naver/search", response_model=NaverSearchResponse)
async def search_naver_places(
    query: str = Query(..., min_length=1, description="검색어"),
    display: int = Query(default=5, ge=1, le=5, description="검색 결과 개수"),
    current_user: User = Depends(get_current_user)
):
    """네이버 지역 검색 API"""
    if not settings.NAVER_CLIENT_ID or not settings.NAVER_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="네이버 API가 설정되지 않았습니다."
        )

    headers = {
        "X-Naver-Client-Id": settings.NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": settings.NAVER_CLIENT_SECRET,
    }

    params = {
        "query": query,
        "display": display,
        "sort": "comment",  # 리뷰 많은 순
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openapi.naver.com/v1/search/local.json",
                headers=headers,
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            # HTML 태그 제거 및 좌표 변환
            items = []
            for item in data.get("items", []):
                items.append(NaverPlaceItem(
                    title=remove_html_tags(item.get("title", "")),
                    link=item.get("link", ""),
                    category=item.get("category", ""),
                    description=item.get("description", ""),
                    telephone=item.get("telephone", ""),
                    address=item.get("address", ""),
                    road_address=item.get("roadAddress", ""),
                    mapx=item.get("mapx", ""),
                    mapy=item.get("mapy", ""),
                ))

            return NaverSearchResponse(
                items=items,
                total=data.get("total", 0),
                start=data.get("start", 1),
                display=data.get("display", 0)
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="네이버 API 요청 시간이 초과되었습니다."
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"네이버 API 오류: {e.response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"검색 중 오류가 발생했습니다: {str(e)}"
        )
