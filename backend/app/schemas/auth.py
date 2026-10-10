
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime


from pydantic import field_validator


class PasswordInput(BaseModel):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(char.isalpha() for char in value):
            raise ValueError("Password must contain a letter.")

        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain a number.")

        if not any(not char.isalnum() for char in value):
            raise ValueError("Password must contain a symbol.")

        return value