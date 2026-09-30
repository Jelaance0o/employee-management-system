from fastapi import APIRouter, Depends

from utils.auth_dependency import require_employee


router = APIRouter(
    prefix="/employee",
    tags=["Employee"]
)


@router.get("/test")
def employee_test(
    current_user=Depends(require_employee)
):

    return {
        "message": "Welcome Employee!",
        "user": current_user
    }