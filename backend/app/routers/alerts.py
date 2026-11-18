"""Alert routes."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models.schemas import AlertOut, AlertUpdate
from ..utils import serialize

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    status_filter: str | None = Query(None, alias="status"),
    severity: str | None = Query(None),
    limit: int = Query(200, le=1000),
    user: dict = Depends(get_current_user),
) -> list[AlertOut]:
    query: dict = {}
    if status_filter:
        query["status"] = status_filter
    if severity:
        query["severity"] = severity
    docs = await get_db().alerts.find(query).sort("created_at", -1).to_list(limit)
    return [AlertOut(**serialize(d)) for d in docs]


@router.patch("/{alert_id}", response_model=AlertOut)
async def update_alert(
    alert_id: str,
    payload: AlertUpdate,
    user: dict = Depends(require_roles("admin", "manager", "operator")),
) -> AlertOut:
    try:
        oid = ObjectId(alert_id)
    except InvalidId:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid alert id")
    updated = await get_db().alerts.find_one_and_update(
        {"_id": oid},
        {"$set": {"status": payload.status}},
        return_document=True,
    )
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alert not found")
    return AlertOut(**serialize(updated))
