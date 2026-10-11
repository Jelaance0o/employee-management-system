from typing import Literal

from pydantic import BaseModel


class TeammateRoleUpdate(BaseModel):
    role: Literal["admin", "project_manager", "employee"]