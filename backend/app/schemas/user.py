from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr = Field(description="Must be a valid email address")
    password: str = Field(min_length=6, max_length=128, description="6–128 characters")
    full_name: str = Field(min_length=1, max_length=100, description="Your full name")

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long for the hashing algorithm (max 72 bytes)")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Full name cannot be empty")
        if len(v) > 100:
            raise ValueError("Full name must be 100 characters or less")
        return v


class UserLogin(BaseModel):
    email: EmailStr = Field(description="Must be a valid email address")
    password: str = Field(min_length=6, description="6 characters or more")


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None


class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password is too long for the hashing algorithm (max 72 bytes)")
        return v

