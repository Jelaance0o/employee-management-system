from fastapi import APIRouter , HTTPException , Depends
from fastapi.security import OAuth2PasswordRequestForm

from database import users_collection
from utils.password import verify_password
from utils.jwt import create_access_token


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({
        "email":form_data.username
    })
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    password_correct = verify_password(
        form_data.password,
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

    return{
        "message": "Login successful",
        "access_token":access_token,
        "token_type" : "bearer",
        "user":{
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }
