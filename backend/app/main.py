from fastapi import FastAPI, HTTPException

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import FRONTEND_ORIGIN
from app.db.session import check_database_connection



app = FastAPI(
    title="TeamSpace API",
    description="Team, project, SOP, KRA and KPI management API.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "message": "TeamSpace API is running"
    }


@app.get("/health/database")
def database_health():
    if not check_database_connection():
        raise HTTPException(
            status_code=503,
            detail="Database connection failed.",
        )

    return {
        "status": "connected",
        "database": "teamspace_db",
    }