"""Authentication routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..database import get_db
from ..deps import get_current_user
from ..models.schemas import TokenOut, UserCreate, UserLogin, UserOut
from ..security import create_access_token, hash_password, verify_password
from ..utils import now_utc, serialize

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate) -> TokenOut:
    db = get_db()
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    # First ever user becomes an admin so the platform is bootstrappable.
    role = payload.role
    if await db.users.count_documents({}) == 0:
        role = "admin"

    doc = {
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": role,
        "org": payload.org,
        "created_at": now_utc(),
    }
    result = await db.users.insert_one(doc)
    doc["_id"] = result.inserted_id
    token = create_access_token(str(result.inserted_id), role)
    user = serialize(doc)
    return TokenOut(access_token=token, user=UserOut(**user))


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin) -> TokenOut:
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    token = create_access_token(str(user["_id"]), user["role"])
    return TokenOut(access_token=token, user=UserOut(**serialize(user)))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(**serialize(user))
