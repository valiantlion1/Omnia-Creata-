from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, User as UserSchema, UserMe, Token
from ..auth import (
    get_password_hash, 
    authenticate_user, 
    create_access_token, 
    create_refresh_token,
    get_current_active_user
)
from ..config import settings
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserSchema)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    hashed_password = get_password_hash(user_data.password)
    # Sprint-2: initialize credits on first register
    today = datetime.utcnow().date().isoformat()
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        credits=settings.DAILY_FREE_CREDITS,
        credit_refresh_date=today,
        feedback_popup_disabled=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT tokens"""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Daily credit refresh check on login
    today = datetime.utcnow().date().isoformat()
    if user.credit_refresh_date != today:
        user.credits = settings.DAILY_FREE_CREDITS
        user.credit_refresh_date = today
        db.add(user)
        db.commit()

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )


@router.get("/me", response_model=UserMe)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user
