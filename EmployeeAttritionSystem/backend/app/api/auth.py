"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.services.auth_service import AuthService
from app.core.exceptions import AuthenticationError
from app.core.dependencies import get_current_user
from app.models.user import User
from app.websocket_manager import manager

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    try:
        auth_service = AuthService(db)
        user = await auth_service.register(
            email=data.email,
            password=data.password,
            full_name=data.full_name,
            role=data.role,
        )
        # Broadcast real-time registration event
        await manager.broadcast("user_register", {"name": user.full_name})

        # Auto-login after registration
        result = await auth_service.login(data.email, data.password)
        return result
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=e.message)


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with email and password. Returns JWT token."""
    try:
        auth_service = AuthService(db)
        result = await auth_service.login(data.email, data.password)

        # Broadcast login event
        await manager.broadcast("user_login", {"name": result["user"]["full_name"]})

        return result
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return current_user
