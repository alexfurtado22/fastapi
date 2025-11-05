import uuid
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from .models import User
from .config import get_settings
from .dependencies import get_user_db  # <-- Importing from our new file


# --- 1. User Manager ---
class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    """
    Manages user creation, password hashing, etc.
    """

    reset_password_token_secret = get_settings().JWT_SECRET
    verification_token_secret = get_settings().JWT_SECRET

    async def on_after_register(self, user: User, request: Request | None = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Request | None = None
    ):
        print(f"User {user.id} has requested a password reset. Token: {token}")


# --- 2. User Manager Dependency ---
async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    """
    Dependency to get the UserManager.
    """
    yield UserManager(user_db)
