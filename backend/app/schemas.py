from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID


# ====================================================================
# 👤 USER SCHEMAS
# ====================================================================
class UserRead(BaseModel):
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    is_superuser: bool

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserUpdate(BaseModel):
    password: Optional[str] = None
    full_name: Optional[str] = None


# ====================================================================
# 💬 COMMENT SCHEMAS
# ====================================================================
class CommentCreate(BaseModel):
    content: str


class CommentUpdate(BaseModel):
    content: Optional[str] = None


class CommentRead(BaseModel):
    id: int
    content: str
    owner_id: UUID
    post_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentReadWithUser(CommentRead):
    owner: UserRead


# ====================================================================
# 📝 POST SCHEMAS
# ====================================================================
class PostBase(BaseModel):
    title: str
    content: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


class PostCreate(PostBase):
    pass


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    video_url: Optional[str] = None


# The main Schema used in lists (Feed)
class PostRead(PostBase):
    id: int
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    # ❤️ New Fields for Likes
    likes_count: int = 0
    user_has_liked: bool = False

    model_config = ConfigDict(from_attributes=True)


# The Detailed Schema used for Single Post View (includes comments & owner)
class PostReadWithDetails(PostRead):
    owner: UserRead
    comments: List[CommentReadWithUser] = Field(default_factory=list)


# ====================================================================
# 📄 PAGINATION SCHEMA
# ====================================================================
class PaginatedPostResponse(BaseModel):
    total: int
    posts: List[PostRead]
