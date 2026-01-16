from fastapi import APIRouter
from app.api.v1.endpoints import auth, accounts, transfers, categories, expenses, statistics

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["인증"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["계좌"])
api_router.include_router(transfers.router, prefix="/transfers", tags=["이체"])
api_router.include_router(categories.router, prefix="/categories", tags=["카테고리"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["지출"])
api_router.include_router(statistics.router, prefix="/statistics", tags=["통계"])
