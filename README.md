# WhereDidAllMyMoneyGo

개인 지출 관리 웹 애플리케이션. 카테고리/상품 기반으로 지출을 기록하고, 계좌별 잔액과 통계를 한눈에 확인할 수 있습니다.

## 주요 기능

- **지출 관리** - 카테고리 > 서브카테고리 > 상품 계층 구조로 지출 기록, 사진 첨부, 빠른 지출 추가
- **계좌 관리** - 복수 계좌 등록 및 잔액 추적, 계좌 간 이체
- **상품 관리** - 자주 쓰는 상품 등록 (기본 가격/계좌 설정), 즐겨찾기
- **매장 관리** - 구매 매장 기록
- **관리비** - 월별 관리비 내역 관리
- **통계** - 월별/카테고리별 지출 추이 및 분석

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand, React Hook Form, Recharts |
| Backend | FastAPI, SQLAlchemy 2 (async), Pydantic, Alembic |
| Database | PostgreSQL 15 |
| Infra | Docker, Docker Compose |

## 실행 방법

### Docker Compose (권장)

```bash
# DB 실행
docker compose -f docker-compose.db.yml up -d

# 앱 실행 (같은 머신의 DB 사용)
docker compose up -d

# 다른 서버의 DB에 연결할 경우
DB_HOST=192.168.1.100 docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1

### 로컬 개발

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```
