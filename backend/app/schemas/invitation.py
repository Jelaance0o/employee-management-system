
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class InvitationCreate(BaseModel):
    email: EmailStr
    role: Literal["admin", "project_manager", "employee"] = "employee"


class InvitationCreated(BaseModel):
    email: EmailStr
    role: str
    invitation_url: str
    expires_at: datetime


class InvitationValidation(BaseModel):
    valid: bool
    email: EmailStr
    role: str
    expires_at: datetime


class InvitationAccept(BaseModel):
    token: str = Field(min_length=32, max_length=200)
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Enter your full name.")
        return value

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
