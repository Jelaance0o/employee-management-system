from pydantic import BaseModel, Field, field_validator


class UserProfileUpdate(BaseModel):
    department: str | None = Field(default=None, max_length=100)
    job_title: str | None = Field(default=None, max_length=120)
    bio: str | None = Field(default=None, max_length=1000)
    skills: list[str] | None = Field(default=None, max_length=50)
    tech_stack: list[str] | None = Field(default=None, max_length=50)

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
