# app/posts.py

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .auth import current_active_verified_user
from .database import get_db_session
from .logging_config import logger
from .models import Comment, Like, Post, User
from .schemas import (
    CommentCreate,
    CommentReadWithUser,
    PaginatedPostResponse,
    PostCreate,
    PostRead,
    PostReadWithDetails,
    PostUpdate,
)

STATIC_DIR = "app/static/images"

router = APIRouter(prefix="/posts", tags=["Posts"])


# ----------------------------------------
# 1. Create Post
# ----------------------------------------
@router.post("/", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    new_post = Post(**post.model_dump(), owner_id=user.id)
    session.add(new_post)
    await session.commit()
    await session.refresh(new_post)
    return new_post


# ----------------------------------------
# 2. Get All Posts (WITH likes)
# ----------------------------------------
@router.get("/", response_model=PaginatedPostResponse)
async def get_all_posts(
    session: AsyncSession = Depends(get_db_session),
    user: Optional[User] = Depends(current_active_verified_user),
    skip: int = 0,
    limit: int = 10,
    search: str = None,
):
    posts_query = select(Post).order_by(Post.created_at.desc())
    count_query = select(func.count()).select_from(Post)

    if search:
        search_term = f"%{search}%"
        search_filter = or_(
            Post.title.ilike(search_term),
            Post.content.ilike(search_term),
        )
        posts_query = posts_query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Count total
    total = (await session.execute(count_query)).scalar_one()

    # Fetch posts
    posts_result = await session.execute(posts_query.offset(skip).limit(limit))
    posts = posts_result.scalars().all()

    # Attach likes_count and user_has_liked
    post_ids = [p.id for p in posts]
    if not post_ids:
        return {"total": total, "posts": []}

    # Count likes per post
    # 👇 FIX: Changed func.count(Like.id) to func.count()
    likes_counts_query = (
        select(Like.post_id, func.count())
        .where(Like.post_id.in_(post_ids))
        .group_by(Like.post_id)
    )
    likes_counts_result = await session.execute(likes_counts_query)
    likes_counts = dict(likes_counts_result.all())

    # Fetch which posts this user liked
    user_likes = []
    if user:
        user_likes = [
            row[0]
            for row in (
                await session.execute(
                    select(Like.post_id).where(
                        and_(Like.post_id.in_(post_ids), Like.user_id == user.id)
                    )
                )
            ).all()
        ]

    for p in posts:
        p.likes_count = likes_counts.get(p.id, 0)
        p.user_has_liked = p.id in user_likes

    return {"total": total, "posts": posts}


# ----------------------------------------
# 3. Get Single Post (WITH likes)
# ----------------------------------------
@router.get("/{post_id}", response_model=PostReadWithDetails)
async def get_post_by_id(
    post_id: int,
    session: AsyncSession = Depends(get_db_session),
    user: Optional[User] = Depends(current_active_verified_user),
):
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

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Likes count
    # 👇 FIX: Ensure this uses func.count() without arguments inside select() if Like.id is missing
    likes_count = (
        await session.execute(
            select(func.count()).select_from(Like).where(Like.post_id == post_id)
        )
    ).scalar_one()

    user_has_liked = False
    if user:
        user_has_liked = (
            await session.execute(
                select(func.count())
                .select_from(Like)
                .where(and_(Like.post_id == post_id, Like.user_id == user.id))
            )
        ).scalar_one() > 0

    post.likes_count = likes_count
    post.user_has_liked = user_has_liked

    return post


## ----------------------------------------
# 4. Toggle Like / Unlike
# ----------------------------------------
@router.post("/{post_id}/like")
async def toggle_like(
    post_id: int,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Toggle like. Prevents users from liking their own posts.
    """
    # Check post exists
    post = (
        await session.execute(select(Post).where(Post.id == post_id))
    ).scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # 👇 FIX: Prevent self-liking
    if post.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot like your own post.",
        )

    # Check if already liked
    existing = (
        await session.execute(
            select(Like).where(and_(Like.post_id == post_id, Like.user_id == user.id))
        )
    ).scalar_one_or_none()

    if existing:
        # Unlike
        await session.delete(existing)
        await session.commit()
        return {"status": "unliked"}

    # Like
    new_like = Like(post_id=post_id, user_id=user.id)
    session.add(new_like)
    await session.commit()
    return {"status": "liked"}


# ----------------------------------------
# 5. Update Post
# ----------------------------------------
@router.patch("/{post_id}", response_model=PostRead)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(404, "Post not found")

    if post.owner_id != user.id:
        raise HTTPException(403, "Not authorized")

    update_data = post_update.model_dump(exclude_unset=True)
    old_image_url = post.image_url if "image_url" in update_data else None

    for key, value in update_data.items():
        setattr(post, key, value)

    session.add(post)
    await session.commit()
    await session.refresh(post)

    if old_image_url and old_image_url != post.image_url:
        try:
            filename = os.path.basename(old_image_url)
            file_path = os.path.join(STATIC_DIR, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted old image file {filename}")
        except Exception as e:
            logger.error(f"Failed to delete old image: {e}")

    return post


# ----------------------------------------
# 6. Delete Post
# ----------------------------------------
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(404, "Post not found")

    if post.owner_id != user.id:
        raise HTTPException(403, "Not authorized")

    image_url = post.image_url

    await session.delete(post)
    await session.commit()

    if image_url:
        try:
            filename = os.path.basename(image_url)
            path = os.path.join(STATIC_DIR, filename)
            if os.path.exists(path):
                os.remove(path)
                logger.info(f"Deleted image {filename}")
        except Exception as e:
            logger.error(f"Failed to delete image: {e}")

    return None


# ----------------------------------------
# 7. Get Comments
# ----------------------------------------
@router.get("/{post_id}/comments/", response_model=List[CommentReadWithUser])
async def get_comments_for_post(
    post_id: int,
    session: AsyncSession = Depends(get_db_session),
):
    post_exists = (
        await session.execute(select(Post).where(Post.id == post_id))
    ).scalar_one_or_none()
    if not post_exists:
        raise HTTPException(404, "Post not found")

    result = await session.execute(
        select(Comment)
        .where(Comment.post_id == post_id)
        .options(selectinload(Comment.owner))
        .order_by(Comment.created_at.asc())
    )
    return result.scalars().all()


# ----------------------------------------
# 8. Create Comment
# ----------------------------------------
@router.post(
    "/{post_id}/comments/",
    response_model=CommentReadWithUser,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment_for_post(
    post_id: int,
    comment: CommentCreate,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    post_exists = (
        await session.execute(select(Post).where(Post.id == post_id))
    ).scalar_one_or_none()

    if not post_exists:
        raise HTTPException(404, "Post not found")

    new_comment = Comment(**comment.model_dump(), owner_id=user.id, post_id=post_id)
    session.add(new_comment)
    await session.commit()
    await session.refresh(new_comment)

    result = await session.execute(
        select(Comment)
        .where(Comment.id == new_comment.id)
        .options(selectinload(Comment.owner))
    )
    return result.scalar_one()
