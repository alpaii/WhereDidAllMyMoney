"""
초기 카테고리 시드 데이터
실행: python -m app.db.seed
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.category import Category, Subcategory

SEED_DATA = {
    "식비": {
        "icon": "🍽️",
        "subcategories": ["식사", "카페/음료", "간식", "배달음식", "식료품", "술/회식"]
    },
    "주거/생활": {
        "icon": "🏠",
        "subcategories": ["월세/관리비", "공과금", "생활용품", "가구/가전", "인테리어"]
    },
    "통신": {
        "icon": "📱",
        "subcategories": ["휴대폰", "인터넷/TV", "구독서비스", "앱/소프트웨어"]
    },
    "교통": {
        "icon": "🚗",
        "subcategories": ["대중교통", "택시", "자동차", "주차", "킥보드/자전거"]
    },
    "쇼핑": {
        "icon": "🛍️",
        "subcategories": ["의류", "뷰티", "전자기기", "온라인쇼핑", "기타쇼핑"]
    },
    "건강/의료": {
        "icon": "🏥",
        "subcategories": ["병원", "약국", "운동", "보험"]
    },
    "문화/여가": {
        "icon": "🎬",
        "subcategories": ["영화/공연", "도서", "취미", "여행", "게임"]
    },
    "교육": {
        "icon": "📚",
        "subcategories": ["학원/강의", "학습자료", "자기개발"]
    },
    "경조사/선물": {
        "icon": "🎁",
        "subcategories": ["축의금/부의금", "선물", "기부/후원"]
    },
    "금융": {
        "icon": "💰",
        "subcategories": ["이체수수료", "대출이자", "카드연회비", "투자"]
    },
    "반려동물": {
        "icon": "🐾",
        "subcategories": ["사료/간식", "병원", "용품", "미용"]
    },
    "기타": {
        "icon": "📦",
        "subcategories": ["미분류", "ATM출금", "기타"]
    }
}


async def seed_categories(db: AsyncSession):
    """카테고리 및 소 카테고리 시드 데이터 삽입"""

    for category_name, data in SEED_DATA.items():
        # Check if category already exists
        result = await db.execute(
            select(Category).where(Category.name == category_name)
        )
        existing_category = result.scalar_one_or_none()

        if existing_category:
            print(f"Category '{category_name}' already exists, skipping...")
            category = existing_category
        else:
            # Create category
            category = Category(
                name=category_name,
                icon=data["icon"]
            )
            db.add(category)
            await db.flush()
            print(f"Created category: {category_name}")

        # Create subcategories
        for subcategory_name in data["subcategories"]:
            result = await db.execute(
                select(Subcategory).where(
                    Subcategory.category_id == category.id,
                    Subcategory.name == subcategory_name
                )
            )
            if result.scalar_one_or_none():
                print(f"  Subcategory '{subcategory_name}' already exists, skipping...")
                continue

            subcategory = Subcategory(
                category_id=category.id,
                name=subcategory_name
            )
            db.add(subcategory)
            print(f"  Created subcategory: {subcategory_name}")

    await db.commit()
    print("\nSeed data inserted successfully!")


async def main():
    async with AsyncSessionLocal() as session:
        await seed_categories(session)


if __name__ == "__main__":
    asyncio.run(main())
