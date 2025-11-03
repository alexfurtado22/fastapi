# app/schemas.py
import uuid
from pydantic import EmailStr
from fastapi_users.schemas import BaseUser, BaseUserCreate  # 1. Import these


# 2. Change BaseModel to BaseUserCreate
class UserCreate(BaseUserCreate):
    email: EmailStr
    password: str
    # You can add extra fields here, e.g. first_name: str


# 3. Change BaseModel to BaseUser
class UserRead(BaseUser):
    id: uuid.UUID
    email: EmailStr
    # You can also add your extra fields here
