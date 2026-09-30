from fastapi import Depends , HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")
        role = payload.get("role")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        return {
            "user_id": user_id,
            "role": role
        }

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


def require_admin(
        current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )
    return current_user

def require_employee(current_user = Depends(get_current_user)):
     if current_user["role"] != "employee":
          raise HTTPException(
               status_code=403,
               detail="Employee access required"
          )
     return current_user