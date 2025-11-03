# app/app.py
from fastapi import FastAPI, Depends, HTTPException, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from contextlib import asynccontextmanager
from .database import engine, Base
from .models import User  # noqa: F401
from .auth import (
    fastapi_users,
    get_refresh_token_strategy,
    get_access_token_strategy,
    get_user_manager,
)
from .schemas import UserRead, UserCreate
from .config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("INFO:     Starting up and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("INFO:     Startup complete.")

    yield  # The application runs here

    print("INFO:     Shutting down and disposing engine...")
    await engine.dispose()
    print("INFO:     Shutdown complete.")


app = FastAPI(lifespan=lifespan)

# --- Auth Routes ---


# Custom login endpoint that returns access token AND sets refresh cookie
@app.post("/auth/login", tags=["auth"])
async def login(
    response: Response,
    credentials: OAuth2PasswordRequestForm = Depends(),
    user_manager=Depends(get_user_manager),
):
    """
    Login endpoint that returns access token in body and sets refresh token in cookie.
    """
    # Authenticate user
    user = await user_manager.authenticate(credentials)

    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Generate access token
    access_strategy = get_access_token_strategy()
    access_token = await access_strategy.write_token(user)

    # Generate refresh token
    refresh_strategy = get_refresh_token_strategy()
    refresh_token = await refresh_strategy.write_token(user)

    # Set refresh token in cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=604800,  # 7 days
        httponly=True,
        secure=get_settings().ENVIRONMENT == "production",
        samesite="lax",
    )

    return {"access_token": access_token, "token_type": "bearer"}


# Register
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)


# --- Custom Refresh Endpoint ---
@app.post("/auth/refresh", tags=["auth"])
async def refresh_token(
    request: Request,
    response: Response,
    user_manager=Depends(get_user_manager),
):
    """
    Uses the refresh token from HttpOnly cookie to generate a new access token.
    Also rotates the refresh token for security.
    """
    # Get refresh token from cookie
    refresh_token_value = request.cookies.get("refresh_token")

    if not refresh_token_value:
        raise HTTPException(
            status_code=401, detail="Refresh token not found. Please login again."
        )

    try:
        # Verify refresh token and get user
        strategy = get_refresh_token_strategy()
        user = await strategy.read_token(refresh_token_value, user_manager)

        if user is None or not user.is_active:
            raise HTTPException(
                status_code=401, detail="Invalid refresh token or inactive user"
            )

        # Generate new access token
        access_strategy = get_access_token_strategy()
        new_access_token = await access_strategy.write_token(user)

        # Generate new refresh token (token rotation)
        refresh_strategy = get_refresh_token_strategy()
        new_refresh_token = await refresh_strategy.write_token(user)

        # Set new refresh token in cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            max_age=604800,  # 7 days
            httponly=True,
            secure=get_settings().ENVIRONMENT == "production",
            samesite="lax",
        )

        return {"access_token": new_access_token, "token_type": "bearer"}

    except Exception as e:
        print(f"Refresh token error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired refresh token. Please login again.",
        )


# --- Logout Endpoint ---
@app.post("/auth/logout", tags=["auth"])
async def logout(response: Response):
    """
    Clears the refresh token cookie.
    Frontend should also discard the access token from memory.
    """
    response.delete_cookie(key="refresh_token")
    return {"message": "Successfully logged out"}


# --- User Routes ---
app.include_router(
    fastapi_users.get_users_router(UserRead, UserCreate),
    prefix="/users",
    tags=["users"],
)


# --- Example Protected Route ---
@app.get("/protected")
async def protected_route(
    user: User = Depends(fastapi_users.current_user(active=True)),
):
    """
    Example protected endpoint that requires a valid access token.
    In Swagger: Click the 🔒 Authorize button and paste your access_token.
    """
    return {
        "message": "This is a protected route",
        "user_id": str(user.id),
        "email": user.email,
    }


# --- Debug endpoint to see your cookies ---
@app.get("/debug/cookies")
async def debug_cookies(request: Request):
    """
    Debug endpoint to see what cookies are being sent.
    Useful for testing in Swagger.
    """
    return {
        "cookies": dict(request.cookies),
        "has_refresh_token": "refresh_token" in request.cookies,
    }


# --- Public Route ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Welcome to the API"}
