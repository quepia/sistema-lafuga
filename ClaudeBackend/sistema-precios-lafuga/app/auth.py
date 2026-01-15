"""
Authentication module for Google OAuth
Sistema de Gestión de Precios - LA FUGA
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import httpx
import os

from app.database import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# Configuration - should be in environment variables
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Dependency to get current authenticated user.
    Extracts token from Authorization header or cookie.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try to get token from Authorization header
    auth_header = request.headers.get("Authorization")
    token = None

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        # Try to get from cookie
        token = request.cookies.get("access_token")

    if not token:
        raise credentials_exception

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Optional authentication - returns None if not authenticated"""
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None


@router.get("/login/google")
async def login_google():
    """
    Redirect to Google OAuth login page
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable."
        )

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"redirect_uri={GOOGLE_REDIRECT_URI}&"
        "response_type=code&"
        "scope=openid%20email%20profile&"
        "access_type=offline"
    )
    return RedirectResponse(url=google_auth_url)


@router.get("/callback")
async def auth_callback(code: str, db: Session = Depends(get_db)):
    """
    Handle Google OAuth callback.
    Exchange code for tokens, create/update user, and redirect with JWT.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for tokens"
            )

        tokens = token_response.json()
        access_token = tokens.get("access_token")

        # Get user info from Google
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )

        google_user = userinfo_response.json()

    # Create or update user in database
    user = db.query(User).filter(User.google_id == google_user["id"]).first()

    if user:
        # Update existing user
        user.name = google_user.get("name", user.name)
        user.picture = google_user.get("picture", user.picture)
        user.last_login = datetime.utcnow()
    else:
        # Create new user
        user = User(
            email=google_user["email"],
            google_id=google_user["id"],
            name=google_user.get("name", google_user["email"]),
            picture=google_user.get("picture"),
            role="user"
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    # Redirect to frontend with token
    response = RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?token={access_token}")
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax"
    )

    return response


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's data
    """
    return current_user.to_dict()


@router.post("/logout")
async def logout():
    """
    Logout - clear the access token cookie
    """
    response = RedirectResponse(url=f"{FRONTEND_URL}/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie(key="access_token")
    return response


@router.get("/verify")
async def verify_auth(request: Request, db: Session = Depends(get_db)):
    """
    Verify if the current token is valid
    """
    user = get_current_user_optional(request, db)
    if user:
        return {"authenticated": True, "user": user.to_dict()}
    return {"authenticated": False, "user": None}


@router.post("/login/dev")
async def login_dev(db: Session = Depends(get_db)):
    """
    Developer bypass login - creates a mock admin user and returns a valid JWT.
    WARNING: This endpoint should be disabled in production!
    """
    DEV_EMAIL = "admin@lafuga.com"
    DEV_GOOGLE_ID = "dev-user-bypass-12345"
    DEV_NAME = "Usuario Desarrollador"
    DEV_ROLE = "admin"
    DEV_PICTURE = "https://ui-avatars.com/api/?name=Dev+User&background=006AC0&color=fff"

    # Find or create the dev user
    user = db.query(User).filter(User.email == DEV_EMAIL).first()

    if not user:
        # Create the dev user
        user = User(
            email=DEV_EMAIL,
            google_id=DEV_GOOGLE_ID,
            name=DEV_NAME,
            picture=DEV_PICTURE,
            role=DEV_ROLE
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)

    # Create JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.to_dict()
    }
