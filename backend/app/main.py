from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, budgets, categories, notifications, recurring, transactions
from app.services.digest import shutdown_scheduler, start_scheduler

# Create tables if not existing (for local SQLite dev/testing)
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start APScheduler for weekly digest
    try:
        start_scheduler()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Could not start scheduler: %s", e)
    yield
    # Shutdown: Stop scheduler
    try:
        shutdown_scheduler()
    except Exception:
        pass


app = FastAPI(
    title="SpendWise API",
    description="Backend API for SpendWise Personal Finance Tracker",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration allowing local web origins
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(recurring.router)
app.include_router(notifications.router)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "SpendWise Backend"}
