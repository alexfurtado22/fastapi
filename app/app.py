from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from sqladmin import Admin
from starlette.middleware.sessions import SessionMiddleware

from .database import engine
from .models import User, Post, Comment  # noqa: F401
from .auth import (
    fastapi_users,
    get_refresh_token_strategy,
    get_access_token_strategy,
    get_user_manager,
)
from .schemas import UserRead, UserCreate
from .config import get_settings
from .posts import router as posts_router
from .admin import UserAdmin, PostAdmin, CommentAdmin
from .auth_backend import AdminAuthBackend  # 👈 NEW IMPORT


# --- 1. Lifespan (Handles Startup/Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("INFO:     Starting up...")
    print("INFO:     Startup complete.")
    yield
    print("INFO:     Shutting down and disposing engine...")
    await engine.dispose()
    print("INFO:     Shutdown complete.")


app = FastAPI(lifespan=lifespan)

# --- 2. Middleware ---
# REQUIRED for admin authentication
app.add_middleware(
    SessionMiddleware,
    secret_key=get_settings().JWT_SECRET,
)

# --- 3. SQLAdmin Panel with Authentication Backend ---
# This is the CORRECT way to secure the entire admin panel
authentication_backend = AdminAuthBackend(secret_key=get_settings().JWT_SECRET)

admin = Admin(
    app=app,
    engine=engine,
    authentication_backend=authentication_backend,  # 👈 THIS PROTECTS EVERYTHING
)

admin.add_view(UserAdmin)
admin.add_view(PostAdmin)
admin.add_view(CommentAdmin)


# --- 4. Custom Auth Routes (Login, Refresh, Logout) ---
@app.post("/auth/login", tags=["auth"])
async def login(
    response: Response,
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager=Depends(get_user_manager),
):
    """
    Login endpoint: returns access token in body, sets refresh token in cookie.
    """
    user = await user_manager.authenticate(credentials)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Create Access Token
    access_strategy = get_access_token_strategy()
    access_token = await access_strategy.write_token(user)

    # Create Refresh Token
    refresh_strategy = get_refresh_token_strategy()
    refresh_token = await refresh_strategy.write_token(user)

    # Set the secure refresh token cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=604800,  # 7 days
        httponly=True,
        secure=get_settings().ENVIRONMENT == "production",
        samesite="lax",
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/refresh", tags=["auth"])
async def refresh_token(
    request: Request,
    response: Response,
    user_manager=Depends(get_user_manager),
):
    """
    Uses the refresh token from cookie to generate a new access token.
    """
    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        raise HTTPException(
            status_code=401, detail="Refresh token not found. Please login again."
        )
    try:
        strategy = get_refresh_token_strategy()
        user = await strategy.read_token(refresh_token_value, user_manager)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=401, detail="Invalid refresh token or inactive user"
            )

        access_strategy = get_access_token_strategy()
        new_access_token = await access_strategy.write_token(user)

        refresh_strategy = get_refresh_token_strategy()
        new_refresh_token = await refresh_strategy.write_token(user)

        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=604800,
            httponly=True,
            secure=get_settings().ENVIRONMENT == "production",
            samesite="lax",
        )
        return {"access_token": new_access_token, "token_type": "bearer"}
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token. Please login again.",
        )


@app.post("/auth/logout", tags=["auth"])
async def logout(response: Response):
    """
    Clears the refresh token cookie.
    """
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


# --- 5. Pre-built FastAPI_Users Routes ---
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserCreate),
    prefix="/users",
    tags=["users"],
)

# --- 6. Your "Posts" App ---
app.include_router(posts_router)


# --- 7. Example & Debug Routes ---
@app.get("/protected")
async def protected_route(
    user: User = Depends(fastapi_users.current_user(active=True)),
):
    return {
        "message": "This is a protected route",
        "user_id": str(user.id),
        "email": user.email,
    }


@app.get("/debug/cookies")
async def debug_cookies(request: Request):
    return {"cookies": dict(request.cookies)}


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the API"}
