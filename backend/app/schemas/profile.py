import base64
import binascii

from pydantic import BaseModel, Field, field_validator


class UserProfileUpdate(BaseModel):
    department: str | None = Field(default=None, max_length=100)
    job_title: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=1000)
    skills: list[str] | None = Field(default=None, max_length=50)
    tech_stack: list[str] | None = Field(default=None, max_length=50)
    profile_picture_data: str | None = Field(default=None, max_length=700_000)

    @field_validator("skills", "tech_stack")
    @classmethod
    def clean_list_values(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        cleaned = []
        for value in values:
            item = value.strip()
            if not item:
                continue
            if len(item) > 80:
                raise ValueError("Each skill or technology must be 80 characters or fewer.")
            if item.casefold() not in {existing.casefold() for existing in cleaned}:
                cleaned.append(item)
        return cleaned

    @field_validator("profile_picture_data")
    @classmethod
    def validate_profile_picture_data(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not value:
            raise ValueError("Choose an image file or clear the current picture.")
        try:
            header, encoded = value.split(",", 1)
        except ValueError as exc:
            raise ValueError("Profile picture must be a valid image data URL.") from exc
        allowed = {"data:image/png;base64", "data:image/jpeg;base64", "data:image/webp;base64"}
        if header not in allowed:
            raise ValueError("Profile picture must be PNG, JPEG, or WebP.")
        try:
            decoded = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise ValueError("Profile picture data is invalid.") from exc
        if not decoded or len(decoded) > 512 * 1024:
            raise ValueError("Profile picture must be no larger than 512 KB.")
        valid_signature = (
            (header == "data:image/png;base64" and decoded.startswith(b"\x89PNG\r\n\x1a\n"))
            or (header == "data:image/jpeg;base64" and decoded.startswith(b"\xff\xd8\xff"))
            or (header == "data:image/webp;base64" and decoded.startswith(b"RIFF") and decoded[8:12] == b"WEBP")
        )
        if not valid_signature:
            raise ValueError("The selected file does not match its image format.")
        return value

