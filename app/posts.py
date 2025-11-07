from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from .database import get_db_session
from .models import User, Post, Comment
from .schemas import (
    PostCreate,
    PostUpdate,
    PostRead,
    PostReadWithDetails,
    CommentCreate,
    CommentReadWithUser,
)

# --- 1. IMPORT THE NEW DEPENDENCY ---
from .auth import current_active_verified_user  # Changed from current_active_user

# Create a new router
router = APIRouter(prefix="/posts", tags=["Posts"])


# === 1. Create Post ===
@router.post("/", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    # --- 2. USE THE NEW DEPENDENCY ---
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new post. The user must be authenticated AND VERIFIED.
    """
    new_post = Post(**post.model_dump(), owner_id=user.id)
    session.add(new_post)
    await session.commit()
    await session.refresh(new_post)
    return new_post


# === 2. Get All Posts (Public) ===
@router.get("/", response_model=List[PostRead])
async def get_all_posts(
    session: AsyncSession = Depends(get_db_session), skip: int = 0, limit: int = 10
):
    """
    Get all posts. This endpoint is public.
    """
    query = select(Post).order_by(Post.created_at.desc()).offset(skip).limit(limit)
    result = await session.execute(query)
    posts = result.scalars().all()
    return posts


# === 3. Get Single Post (Public) ===
@router.get("/{post_id}", response_model=PostReadWithDetails)
async def get_post_by_id(post_id: int, session: AsyncSession = Depends(get_db_session)):
    """
    Get a single post by its ID. Public and includes details.
    """
    query = (
        select(Post)
        .where(Post.id == post_id)
        .options(
            selectinload(Post.owner),
            selectinload(Post.comments).selectinload(Comment.owner),
        )
    )
    result = await session.execute(query)
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    return post


# === 4. Update Post (Owner Only & Verified) ===
@router.patch("/{post_id}", response_model=PostRead)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    # --- 3. USE THE NEW DEPENDENCY ---
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Update a post. The user must be the owner AND VERIFIED.
    """
    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    if post.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    update_data = post_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)

    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


# === 5. Delete Post (Owner Only & Verified) ===
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    # --- 4. USE THE NEW DEPENDENCY ---
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a post. The user must be the owner AND VERIFIED.
    """
    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    if post.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    await session.delete(post)
    await session.commit()
    return None


# === 6. Create Comment (Verified Users) ===
@router.post(
    "/{post_id}/comments/",
    response_model=CommentReadWithUser,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment_for_post(
    post_id: int,
    comment: CommentCreate,
    # --- 5. USE THE NEW DEPENDENCY ---
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new comment. The user must be authenticated AND VERIFIED.
    """
    post_result = await session.execute(select(Post).where(Post.id == post_id))
    if post_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )

    new_comment = Comment(**comment.model_dump(), owner_id=user.id, post_id=post_id)
    session.add(new_comment)
    await session.commit()
    await session.refresh(new_comment)

    # We need to refresh the comment AND its relationships to return them
    result = await session.execute(
        select(Comment)
        .where(Comment.id == new_comment.id)
        .options(selectinload(Comment.owner))
    )
    new_comment_with_owner = result.scalar_one()

    return new_comment_with_owner
