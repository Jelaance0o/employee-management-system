from fastapi import APIRouter , HTTPException , Depends , Response
from database import users_collection
from utils.password import verify_password
from utils.jwt import create_access_token
from schemas.auth import LoginRequest


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/login")
def login(
    login_data: LoginRequest,
    response: Response
    ):
    user = users_collection.find_one({
        "email":login_data.email
    })
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    password_correct = verify_password(
        login_data.password,
        user["password_hash"]
        )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    access_token = create_access_token({
        "user_id": str(user["_id"]),
        "role":user["role"]
    })

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age= 60*60
    )

    return{
        "message": "Login successful",
        "user":{
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }
