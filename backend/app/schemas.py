from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    StringConstraints,
    model_validator,
)

from app.models import IncidentStatus, Severity, UserRole

Title = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
Description = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10_000)
]
Category = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
Assignee = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class IncidentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class IncidentCreate(IncidentInput):
    title: Title
    description: Description
    severity: Severity
    category: Category
    assignee: Assignee | None = None
    status: IncidentStatus = IncidentStatus.OPEN


class IncidentUpdate(IncidentInput):
    title: Title | None = None
    description: Description | None = None
    severity: Severity | None = None
    status: IncidentStatus | None = None
    category: Category | None = None
    assignee: Assignee | None = None

    @model_validator(mode="after")
    def validate_changes(self) -> "IncidentUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one incident field must be provided")

        required_fields = ("title", "description", "severity", "status", "category")
        for field_name in required_fields:
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")

        return self


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    severity: Severity
    status: IncidentStatus
    category: str
    assignee: str | None
    created_at: datetime
    updated_at: datetime


class AuthLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr = Field(min_length=1, max_length=1024)


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime