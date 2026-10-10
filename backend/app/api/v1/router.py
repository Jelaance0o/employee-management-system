from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.invitations import router as invitations_router
from app.api.v1.endpoints.teammates import router as teammates_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(invitations_router)
api_router.include_router(teammates_router)