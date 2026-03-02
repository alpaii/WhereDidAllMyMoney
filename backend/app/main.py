import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from sqlalchemy import text

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import engine, Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create uploads directory if not exists
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    (upload_path / "photos").mkdir(exist_ok=True)
    (upload_path / "thumbnails").mkdir(exist_ok=True)

    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Add store_category_id, store_subcategory_id columns to stores table (if not exists)
        await conn.execute(
            text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'stores' AND column_name = 'store_category_id'
                    ) THEN
                        ALTER TABLE stores ADD COLUMN store_category_id UUID REFERENCES store_categories(id) ON DELETE SET NULL;
                        CREATE INDEX IF NOT EXISTS ix_stores_store_category_id ON stores(store_category_id);
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'stores' AND column_name = 'store_subcategory_id'
                    ) THEN
                        ALTER TABLE stores ADD COLUMN store_subcategory_id UUID REFERENCES store_subcategories(id) ON DELETE SET NULL;
                        CREATE INDEX IF NOT EXISTS ix_stores_store_subcategory_id ON stores(store_subcategory_id);
                    END IF;
                END $$;
            """)
        )

        # Add media_type column to expense_photos (if not exists)
        await conn.execute(
            text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'expense_photos' AND column_name = 'media_type'
                    ) THEN
                        ALTER TABLE expense_photos ADD COLUMN media_type VARCHAR(10) DEFAULT 'image';
                    END IF;
                END $$;
            """)
        )

        # Drop category_id column from expenses (now derived via subcategory)
        await conn.execute(
            text("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'expenses' AND column_name = 'category_id'
                    ) THEN
                        ALTER TABLE expenses DROP COLUMN category_id;
                    END IF;
                END $$;
            """)
        )

    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="소비 관리 프로그램 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"https?://.*",  # Allow all origins with regex
)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {"message": "Welcome to WhereDidAllMyMoneyGo API", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
