
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
    department: str | None = Field(default=None, max_length=100)
    job_title: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=1000)
    skills: list[str] | None = Field(default=None, max_length=50)
    tech_stack: list[str] | None = Field(default=None, max_length=50)

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

    @field_validator("skills", "tech_stack")
    @classmethod
    def clean_profile_lists(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        cleaned: list[str] = []
        for value in values:
            item = value.strip()
            if not item:
                continue
            if len(item) > 80:
                raise ValueError("Each skill or technology must be 80 characters or fewer.")
            if item.casefold() not in {existing.casefold() for existing in cleaned}:
                cleaned.append(item)
        return cleaned

    @field_validator("department", "job_title", "bio")
    @classmethod
    def clean_profile_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None
