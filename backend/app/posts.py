# app/posts.py

import os  # 👈 1. Import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from .auth import current_active_verified_user
from .database import get_db_session
from .logging_config import logger  # 👈 2. Import your logger
from .models import Comment, Post, User
from .schemas import (
    CommentCreate,
    CommentReadWithUser,
    PaginatedPostResponse,
    PostCreate,
    PostRead,
    PostReadWithDetails,
    PostUpdate,
)

# ⛔ We no longer need this ImageKit import
# from .utils import delete_file_from_imagekit

# 👈 3. Define the path to your static images folder
STATIC_DIR = "app/static/images"

# Create a new router
router = APIRouter(prefix="/posts", tags=["Posts"])


# === 1. Create Post (NO CHANGES) ===
@router.post("/", response_model=PostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
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


# === 2. Get All Posts  ===
@router.get("/", response_model=PaginatedPostResponse)  # 👈 Use new model
async def get_all_posts(
    session: AsyncSession = Depends(get_db_session),
    skip: int = 0,
    limit: int = 10,
    search: str = None,
):
    # Base query for posts
    posts_query = select(Post).order_by(Post.created_at.desc())
    # Base query for *counting* posts
    count_query = select(func.count()).select_from(Post)

    if search:
        search_term = f"%{search}%"
        search_filter = or_(
            Post.title.ilike(search_term), Post.content.ilike(search_term)
        )
        posts_query = posts_query.where(search_filter)
        count_query = count_query.where(search_filter)

    # Get the total count
    total_result = await session.execute(count_query)
    total = total_result.scalar_one()

    # Get the paginated posts
    paginated_posts_query = posts_query.offset(skip).limit(limit)
    posts_result = await session.execute(paginated_posts_query)
    posts = posts_result.scalars().all()

    return {"total": total, "posts": posts}


# === 3. Get Single Post (NO CHANGES) ===
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


# === 4. Update Post (UPDATED) ===
@router.patch("/{post_id}", response_model=PostRead)
async def update_post(
    post_id: int,
    post_update: PostUpdate,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Update a post. The user must be the owner AND VERIFIED.
    This will also delete the old image file if a new one is provided.
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

    # Store old URL *before* updating the post object
    old_image_url = post.image_url if "image_url" in update_data else None

    # Update the post object in memory
    for key, value in update_data.items():
        setattr(post, key, value)

    # Commit the changes to the database
    session.add(post)
    await session.commit()
    await session.refresh(post)

    # --- 👇 4. UPDATED FILE DELETION LOGIC ---
    # Now that the DB update is successful, delete the old file
    if old_image_url and old_image_url != post.image_url:
        try:
            filename = os.path.basename(old_image_url)
            file_path = os.path.join(STATIC_DIR, filename)

            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"✅ Old image file {filename} deleted after update.")
            else:
                logger.warning(f"⚠️ Old image file {filename} not found at {file_path}.")
        except Exception as e:
            logger.error(f"❌ Failed to delete old image file {filename}: {e}")
            # Do not raise an error, the post update was still successful

    return post


# === 5. Delete Post (UPDATED) ===
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Delete a post. The user must be the owner AND VERIFIED.
    This will also delete the associated image file from the server.
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

    # --- 👇 5. UPDATED FILE DELETION LOGIC ---

    # Store the URL before we delete the post from the DB
    image_url_to_delete = post.image_url

    # First, delete the post from the database
    await session.delete(post)
    await session.commit()
    logger.success(f"Post {post_id} deleted from database by {user.email}")

    # Now that the post is deleted, delete the file from the server
    if image_url_to_delete:
        try:
            # Extract the filename from the URL
            # e.g., "http://.../static/images/my-file.jpg" -> "my-file.jpg"
            filename = os.path.basename(image_url_to_delete)
            file_path = os.path.join(STATIC_DIR, filename)

            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"✅ Image file {filename} deleted from server.")
            else:
                logger.warning(f"⚠️ Image file {filename} not found at {file_path}.")

        except Exception as e:
            # Log the error, but don't stop the request.
            # The post is already deleted, which is the most important part.
            logger.error(f"❌ Failed to delete image file {filename}: {e}")

    return None


# === 6. GET ALL COMMENTS FOR A POST (NO CHANGES) ===
@router.get(
    "/{post_id}/comments/",
    response_model=List[CommentReadWithUser],
    tags=["Posts", "Comments"],
)
async def get_comments_for_post(
    post_id: int, session: AsyncSession = Depends(get_db_session)
):
    """
    Get all comments for a specific post. Public endpoint.
    """
    post_result = await session.execute(select(Post).where(Post.id == post_id))
    if post_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found"
        )
    query = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .options(selectinload(Comment.owner))
        .order_by(Comment.created_at.asc())
    )
    result = await session.execute(query)
    comments = result.scalars().all()
    return comments


# === 7. Create Comment (Fixed) ===
@router.post(
    "/{post_id}/comments/",
    response_model=CommentReadWithUser,
    status_code=status.HTTP_201_CREATED,
    tags=["Posts", "Comments"],
)
async def create_comment_for_post(
    post_id: int,
    comment: CommentCreate,
    user: User = Depends(current_active_verified_user),
    session: AsyncSession = Depends(get_db_session),
):
    """
    Create a new comment. The user must be authenticated AND VERIFIED.
    """
    post_result = await session.execute(select(Post).where(Post.id == post_id))
    if post_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",  # ✅ Fixed
        )
    new_comment = Comment(**comment.model_dump(), owner_id=user.id, post_id=post_id)
    session.add(new_comment)
    await session.commit()
    await session.refresh(new_comment)
    result = await session.execute(
        select(Comment)
        .where(Comment.id == new_comment.id)
        .options(selectinload(Comment.owner))
    )
    new_comment_with_owner = result.scalar_one()
    return new_comment_with_owner
