"""Facility routes."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models.schemas import FacilityIn, FacilityOut
from ..utils import now_utc, serialize

router = APIRouter(prefix="/api/facilities", tags=["facilities"])


@router.get("", response_model=list[FacilityOut])
async def list_facilities(
    search: str | None = Query(None),
    type: str | None = Query(None),
    user: dict = Depends(get_current_user),
) -> list[FacilityOut]:
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"city": {"$regex": search, "$options": "i"}},
        ]
    if type:
        query["type"] = type
    docs = await get_db().facilities.find(query).sort("name", 1).to_list(500)
    return [FacilityOut(**serialize(d)) for d in docs]


@router.post("", response_model=FacilityOut, status_code=status.HTTP_201_CREATED)
async def create_facility(
    payload: FacilityIn,
    user: dict = Depends(require_roles("admin", "manager")),
) -> FacilityOut:
    db = get_db()
    if await db.facilities.find_one({"code": payload.code}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Facility code already exists")
    doc = payload.model_dump()
    doc["created_at"] = now_utc()
    result = await db.facilities.insert_one(doc)
    doc["_id"] = result.inserted_id
    return FacilityOut(**serialize(doc))


@router.put("/{facility_id}", response_model=FacilityOut)
async def update_facility(
    facility_id: str,
    payload: FacilityIn,
    user: dict = Depends(require_roles("admin", "manager")),
) -> FacilityOut:
    db = get_db()
    try:
        oid = ObjectId(facility_id)
    except InvalidId:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility id")
    doc = payload.model_dump()
    doc["updated_at"] = now_utc()
    updated = await db.facilities.find_one_and_update(
        {"_id": oid}, {"$set": doc}, return_document=True
    )
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facility not found")
    return FacilityOut(**serialize(updated))


@router.delete("/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_facility(
    facility_id: str,
    user: dict = Depends(require_roles("admin", "manager")),
) -> None:
    try:
        oid = ObjectId(facility_id)
    except InvalidId:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility id")
    result = await get_db().facilities.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facility not found")
