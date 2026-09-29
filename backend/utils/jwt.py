import os
from datetime import datetime , timedelta , timezone
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token (data:dict):
    payload = data.copy()

    expire = datetime.now(timezone.utc)+timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload["exp"] = expire

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )
    return token