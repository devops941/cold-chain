"""Shipment routes."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models.schemas import ShipmentIn, ShipmentOut, ShipmentUpdate
from ..services import analytics
from ..utils import now_utc, serialize, serialize_many

router = APIRouter(prefix="/api/shipments", tags=["shipments"])


def _to_oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid shipment id")


async def _next_code() -> str:
    db = get_db()
    year = now_utc().year
    count = await db.shipments.count_documents({})
    return f"CC-{year}-{count + 1:04d}"


async def _attach_latest_temp(docs: list[dict]) -> list[dict]:
    db = get_db()
    out = []
    for doc in docs:
        latest = await db.telemetry.find_one(
            {"shipment_id": doc["_id"]}, sort=[("ts", -1)]
        )
        payload = serialize(doc)
        payload["latest_temp_c"] = latest["temperature_c"] if latest else None
        out.append(payload)
    return out


@router.get("", response_model=list[ShipmentOut])
async def list_shipments(
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = Query(None),
    limit: int = Query(100, le=500),
    user: dict = Depends(get_current_user),
) -> list[ShipmentOut]:
    query: dict = {}
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"origin_code": {"$regex": search, "$options": "i"}},
            {"destination_code": {"$regex": search, "$options": "i"}},
            {"carrier": {"$regex": search, "$options": "i"}},
        ]
    if status_filter:
        query["status"] = status_filter
    if priority:
        query["priority"] = priority
    docs = await get_db().shipments.find(query).sort("created_at", -1).to_list(limit)
    return [ShipmentOut(**d) for d in await _attach_latest_temp(docs)]


@router.get("/{shipment_id}", response_model=ShipmentOut)
async def get_shipment(
    shipment_id: str,
    user: dict = Depends(get_current_user),
) -> ShipmentOut:
    doc = await get_db().shipments.find_one({"_id": _to_oid(shipment_id)})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shipment not found")
    payload = (await _attach_latest_temp([doc]))[0]
    return ShipmentOut(**payload)


@router.get("/{shipment_id}/telemetry")
async def get_shipment_telemetry(
    shipment_id: str,
    limit: int = Query(200, le=1000),
    user: dict = Depends(get_current_user),
) -> dict:
    oid = _to_oid(shipment_id)
    db = get_db()
    docs = (
        await db.telemetry.find({"shipment_id": oid}).sort("ts", -1).limit(limit).to_list(limit)
    )
    docs.reverse()
    return {
        "telemetry": serialize_many(docs),
        "stats": await analytics.shipment_analytics(oid),
    }


@router.post("", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    payload: ShipmentIn,
    user: dict = Depends(require_roles("admin", "manager", "operator")),
) -> ShipmentOut:
    db = get_db()
    code = payload.code or await _next_code()
    if await db.shipments.find_one({"code": code}):
        raise HTTPException(status.HTTP_409_CONFLICT, "Shipment code already exists")
    if payload.min_c >= payload.max_c:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "min_c must be below max_c")

    doc = payload.model_dump()
    doc["code"] = code
    doc["created_at"] = now_utc()
    doc["updated_at"] = now_utc()
    result = await db.shipments.insert_one(doc)
    doc["_id"] = result.inserted_id
    doc["latest_temp_c"] = None
    return ShipmentOut(**serialize(doc))


@router.patch("/{shipment_id}", response_model=ShipmentOut)
async def update_shipment(
    shipment_id: str,
    payload: ShipmentUpdate,
    user: dict = Depends(require_roles("admin", "manager", "operator")),
) -> ShipmentOut:
    db = get_db()
    oid = _to_oid(shipment_id)
    updates = payload.model_dump(exclude_none=True)
    updates["updated_at"] = now_utc()
    if updates.get("status") == "delivered" and "delivered_at" not in updates:
        updates["delivered_at"] = now_utc()
    updated = await db.shipments.find_one_and_update(
        {"_id": oid}, {"$set": updates}, return_document=True
    )
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shipment not found")
    payload_out = (await _attach_latest_temp([updated]))[0]
    return ShipmentOut(**payload_out)


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment(
    shipment_id: str,
    user: dict = Depends(require_roles("admin", "manager")),
) -> None:
    db = get_db()
    oid = _to_oid(shipment_id)
    result = await db.shipments.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shipment not found")
    await db.telemetry.delete_many({"shipment_id": oid})
    await db.alerts.delete_many({"shipment_id": oid})
