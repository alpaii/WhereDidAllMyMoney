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

## 구성

DB는 별도 머신(또는 별도 Docker Compose)에서 실행하고, 앱(Frontend + Backend)은 개발 머신에서 실행합니다.

```
[개발 머신 (아이맥)]                    [DB 서버 (맥미니)]
┌─────────────────────┐                ┌──────────────────┐
│  Frontend (:3000)   │                │  PostgreSQL      │
│  Backend  (:8000)   │── socat ──────>│  (:5432)         │
│  socat    (:5432)   │                │                  │
└─────────────────────┘                └──────────────────┘
```

## 실행 방법

### 1. DB 서버 (맥미니)

```bash
docker compose -f docker-compose.db.yml up -d
```

### 2. 개발 머신 (아이맥)

Docker Desktop for Mac 컨테이너는 로컬 LAN에 직접 접근할 수 없으므로, socat으로 포트 포워딩이 필요합니다.

```bash
# socat 설치 (최초 1회)
brew install socat

# 포트 포워딩 시작 (DB 서버 IP에 맞게 수정)
socat TCP-LISTEN:5432,fork,reuseaddr TCP:192.168.50.153:5432 &

# 앱 실행
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1

### 포트 포워딩 종료

```bash
# socat 프로세스 종료
kill $(lsof -t -i:5432 -sTCP:LISTEN)
```

### DB 데이터 마이그레이션

```bash
# 현재 DB 덤프
docker exec money_tracker_db pg_dump -U postgres money_tracker > db_dump.sql

# 덤프 파일의 \restrict 줄 제거 (버전 호환성 문제 방지)
sed -i '' '/^\\restrict/d' db_dump.sql

# 새 DB에 복원
docker exec -i money_tracker_db psql -U postgres money_tracker < db_dump.sql
```

### 이미지 파일 동기화

아이맥과 맥미니 간 업로드 이미지를 rsync로 동기화합니다.

```bash
# 아이맥 → 맥미니
rsync -avz /Users/jmac/Documents/dev/WhereDidAllMyMoneyGo/files/uploads/ jkh@192.168.50.153:~/dev/WhereDidAllMyMoney/files/uploads/

# 맥미니 → 아이맥
rsync -avz jkh@192.168.50.153:~/dev/WhereDidAllMyMoney/files/uploads/ /Users/jmac/Documents/dev/WhereDidAllMyMoneyGo/files/uploads/
```

> 맥미니에서 **시스템 설정 → 일반 → 공유 → 원격 로그인**이 켜져 있어야 하며, **개인정보 보호 및 보안 → 전체 디스크 접근 권한**에 `sshd-keygen-wrapper`가 추가되어 있어야 합니다.

### 로컬 개발 (Docker 없이)

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

## 환경 설정 파일

| 파일 | 용도 |
|------|------|
| `backend/.env` | DB 접속 정보, JWT 시크릿, CORS 등 |
| `frontend/.env.local` | API URL, 외부 서비스 키 |
| `docker-compose.yml` | 앱 (Frontend + Backend) |
| `docker-compose.db.yml` | DB 단독 실행 |
