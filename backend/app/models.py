import uuid
from datetime import datetime

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# ===============================
# 👍 LIKE MODEL (Updated)
# ===============================
class Like(Base):
    __tablename__ = "likes"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), primary_key=True
    )
    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # 👇 Relationships (explicit, clean)
    user: Mapped["User"] = relationship(back_populates="likes")
    post: Mapped["Post"] = relationship(back_populates="likes")


# ===============================
# 👍 USER MODEL (Updated)
# ===============================
class User(SQLAlchemyBaseUserTableUUID, Base):
    full_name: Mapped[str | None] = mapped_column(String(100), nullable=True)

    posts: Mapped[list["Post"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan", lazy="selectin"
    )

    comments: Mapped[list["Comment"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan", lazy="selectin"
    )

    # 👇 Likes (clean back_populates + fast loading)
    likes: Mapped[list["Like"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )


# ===============================
# 👍 POST MODEL (Updated)
# ===============================
class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(100), index=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))

    owner: Mapped["User"] = relationship(back_populates="posts", lazy="selectin")

    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post", cascade="all, delete-orphan", lazy="selectin"
    )

    # 👇 Likes (clean back_populates + fast loading)
    likes: Mapped[list["Like"]] = relationship(
        back_populates="post", cascade="all, delete-orphan", lazy="selectin"
    )


# ===============================
# 👍 COMMENT MODEL (Updated)
# ===============================
class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"))
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"))

    owner: Mapped["User"] = relationship(back_populates="comments", lazy="selectin")

    post: Mapped["Post"] = relationship(back_populates="comments", lazy="selectin")
