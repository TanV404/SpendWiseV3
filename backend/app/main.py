from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, budgets, categories, recurring, transactions

# Create tables if not existing (for local SQLite dev/testing)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SpendWise API",
    description="Backend API for SpendWise Personal Finance Tracker",
    version="1.0.0",
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


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "SpendWise Backend"}
