from fastapi import APIRouter, Depends

from utils.auth_dependency import require_admin


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


@router.get("/test")
def admin_test(
    current_user=Depends(require_admin)
):
    return {
        "message": "Welcome Admin!",
        "user": current_user
    }