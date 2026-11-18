"""Telemetry ingestion routes (live sensor posts)."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models.schemas import TelemetryIn, TelemetryOut
from ..services import ingest
from ..utils import serialize

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


async def _resolve_shipment(payload: TelemetryIn) -> dict:
    db = get_db()
    if payload.shipment_id:
        try:
            oid = ObjectId(payload.shipment_id)
        except InvalidId:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid shipment id")
        shipment = await db.shipments.find_one({"_id": oid})
    elif payload.shipment_code:
        shipment = await db.shipments.find_one({"code": payload.shipment_code})
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide shipment_id or shipment_code")
    if shipment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shipment not found")
    return shipment


@router.post("", response_model=TelemetryOut, status_code=status.HTTP_201_CREATED)
async def create_reading(
    payload: TelemetryIn,
    user: dict = Depends(require_roles("admin", "manager", "operator")),
) -> TelemetryOut:
    shipment = await _resolve_shipment(payload)
    doc = await ingest.record_telemetry(shipment, payload.model_dump())
    return TelemetryOut(**serialize(doc))


@router.get("", response_model=list[TelemetryOut])
async def list_telemetry(
    shipment_code: str | None = Query(None),
    limit: int = Query(200, le=1000),
    user: dict = Depends(get_current_user),
) -> list[TelemetryOut]:
    db = get_db()
    query: dict = {}
    if shipment_code:
        query["shipment_code"] = shipment_code
    docs = await db.telemetry.find(query).sort("ts", -1).limit(limit).to_list(limit)
    return [TelemetryOut(**serialize(d)) for d in docs]
