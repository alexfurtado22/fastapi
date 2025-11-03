# app/auth.py
import uuid
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from .models import User
from .database import get_db_session
from .config import get_settings


# --- 1. User Manager ---
class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = get_settings().JWT_SECRET
    verification_token_secret = get_settings().JWT_SECRET

    async def on_after_register(self, user: User, request: Request | None = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Request | None = None
    ):
        print(f"User {user.id} has requested a password reset. Token: {token}")


async def get_user_db(session: AsyncSession = Depends(get_db_session)):
    yield SQLAlchemyUserDatabase(session, User)


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


# --- 2. JWT Strategies ---


# Short-lived ACCESS token (15 minutes for better security)
def get_access_token_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=get_settings().JWT_SECRET,
        lifetime_seconds=900,  # 15 minutes (more secure than 1 hour)
    )


# Long-lived REFRESH token (7 days)
def get_refresh_token_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=get_settings().JWT_SECRET, lifetime_seconds=604800  # 7 days
    )


# --- 3. Transports ---

# Bearer transport for ACCESS tokens (sent in Authorization header)
bearer_transport = BearerTransport(tokenUrl="/auth/login")

# Cookie transport for REFRESH tokens (HttpOnly, secure)
cookie_transport = CookieTransport(
    cookie_name="refresh_token",
    cookie_max_age=604800,  # 7 days
    cookie_httponly=True,  # Prevents JavaScript access (XSS protection)
    cookie_secure=get_settings().ENVIRONMENT
    == "production",  # HTTPS only in production
    cookie_samesite="lax",  # CSRF protection
)

# --- 4. Authentication Backends ---

# ACCESS token backend (for protected routes)
access_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_access_token_strategy,
)

# REFRESH token backend (for refresh endpoint only)
refresh_backend = AuthenticationBackend(
    name="refresh",
    transport=cookie_transport,
    get_strategy=get_refresh_token_strategy,
)

# --- 5. FastAPIUsers Instance ---
fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [access_backend, refresh_backend],
)

# --- 6. Current User Dependency ---
# This checks ONLY the access token (Bearer header)
current_active_user = fastapi_users.current_user(active=True)
