from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserOut, TokenOut, AuthOut, UserUpdate, PasswordUpdate

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    async with async_session_factory() as session:
        user = await session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user


@router.post("/register", response_model=AuthOut, status_code=201)
async def register(body: UserCreate):
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == body.email))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(email=body.email, hashed_password=hash_password(body.password), full_name=body.full_name)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        token = create_access_token({"sub": user.id})
        return AuthOut(access_token=token, user=UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active))


@router.post("/login", response_model=AuthOut)
async def login(body: UserLogin):
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == body.email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(body.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token({"sub": user.id})
        return AuthOut(access_token=token, user=UserOut(id=user.id, email=user.email, full_name=user.full_name, is_active=user.is_active))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserOut)
async def update_profile(body: UserUpdate, current_user: User = Depends(get_current_user)):
    async with async_session_factory() as session:
        db_user = await session.get(User, current_user.id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if body.email is not None and body.email != db_user.email:
            # check email uniqueness
            res = await session.execute(select(User).where(User.email == body.email))
            if res.scalar_one_or_none():
                raise HTTPException(status_code=400, detail="Email already taken")
            db_user.email = body.email
            
        if body.full_name is not None:
            db_user.full_name = body.full_name
            
        session.add(db_user)
        await session.commit()
        await session.refresh(db_user)
        return db_user


@router.put("/password")
async def update_password(body: PasswordUpdate, current_user: User = Depends(get_current_user)):
    async with async_session_factory() as session:
        db_user = await session.get(User, current_user.id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if not verify_password(body.current_password, db_user.hashed_password):
            raise HTTPException(status_code=400, detail="Invalid current password")
            
        db_user.hashed_password = hash_password(body.new_password)
        session.add(db_user)
        await session.commit()
        return {"message": "Password updated successfully"}
