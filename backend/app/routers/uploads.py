"""Data upload routes — CSV and JSON ingestion with per-row validation."""

from __future__ import annotations

import csv
import io
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models.schemas import UploadOut
from ..services import ingest
from ..utils import (
    now_utc,
    parse_bool,
    parse_dt,
    parse_float,
    parse_int,
    serialize,
)

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

KINDS = {"telemetry", "shipments", "products", "facilities"}


def _extension(filename: str) -> str:
    return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _rows_from_csv(text: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(text))
    return [{(k or "").strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items()} for row in reader]


def _rows_from_json(text: str) -> list[dict]:
    data = json.loads(text)
    if isinstance(data, dict):
        # allow {"data": [...]} or {"rows": [...]}
        for key in ("data", "rows", "items", "records"):
            if isinstance(data.get(key), list):
                return data[key]
        return [data]
    if isinstance(data, list):
        return data
    raise ValueError("JSON must be an object or a list of objects")


def _normalise_telemetry(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        out.append(
            {
                "shipment_code": str(row.get("shipment_code") or row.get("shipment") or "").strip(),
                "ts": parse_dt(row.get("ts") or row.get("timestamp")),
                "temperature_c": parse_float(row.get("temperature_c") or row.get("temp")),
                "humidity_pct": parse_float(row.get("humidity_pct") or row.get("humidity")),
                "door_open": parse_bool(row.get("door_open", False)),
                "battery_pct": parse_int(row.get("battery_pct") or row.get("battery")),
                "lat": parse_float(row.get("lat")),
                "lng": parse_float(row.get("lng") or row.get("lon")),
                "source": "upload",
            }
        )
    return out


def _normalise_shipments(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        out.append(
            {
                "code": str(row.get("code") or row.get("shipment_code") or "").strip(),
                "origin_code": str(row.get("origin_code") or row.get("origin") or "").strip(),
                "destination_code": str(row.get("destination_code") or row.get("destination") or "").strip(),
                "product_sku": (row.get("product_sku") or row.get("sku") or None),
                "carrier": row.get("carrier"),
                "vehicle_no": row.get("vehicle_no") or row.get("vehicle"),
                "driver": row.get("driver"),
                "status": (row.get("status") or "planned").strip().lower(),
                "priority": (row.get("priority") or "normal").strip().lower(),
                "min_c": parse_float(row.get("min_c")) if row.get("min_c") is not None else 2.0,
                "max_c": parse_float(row.get("max_c")) if row.get("max_c") is not None else 8.0,
                "quantity": parse_int(row.get("quantity")),
                "distance_km": parse_float(row.get("distance_km")),
                "departed_at": parse_dt(row.get("departed_at")),
                "eta": parse_dt(row.get("eta")),
                "notes": row.get("notes"),
            }
        )
    return out


def _normalise_products(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        out.append(
            {
                "sku": str(row.get("sku") or "").strip(),
                "name": str(row.get("name") or "").strip(),
                "category": (row.get("category") or "general"),
                "unit": (row.get("unit") or "box"),
                "min_c": parse_float(row.get("min_c")) if row.get("min_c") is not None else 2.0,
                "max_c": parse_float(row.get("max_c")) if row.get("max_c") is not None else 8.0,
                "shelf_life_days": parse_int(row.get("shelf_life_days")),
                "active": parse_bool(row.get("active", True)),
            }
        )
    return out


def _normalise_facilities(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        out.append(
            {
                "name": str(row.get("name") or "").strip(),
                "code": str(row.get("code") or "").strip(),
                "type": (row.get("type") or "warehouse").strip().lower(),
                "city": row.get("city"),
                "country": row.get("country"),
                "lat": parse_float(row.get("lat")),
                "lng": parse_float(row.get("lng") or row.get("lon")),
                "capacity_pallets": parse_int(row.get("capacity_pallets")),
                "temp_min_c": parse_float(row.get("temp_min_c")),
                "temp_max_c": parse_float(row.get("temp_max_c")),
                "active": parse_bool(row.get("active", True)),
            }
        )
    return out


NORMALISERS = {
    "telemetry": _normalise_telemetry,
    "shipments": _normalise_shipments,
    "products": _normalise_products,
    "facilities": _normalise_facilities,
}


@router.get("", response_model=list[UploadOut])
async def list_uploads(user: dict = Depends(get_current_user)) -> list[UploadOut]:
    docs = await get_db().uploads.find({}).sort("created_at", -1).limit(100).to_list(100)
    return [UploadOut(**serialize(d)) for d in docs]


@router.post("", response_model=UploadOut, status_code=status.HTTP_201_CREATED)
async def upload_data(
    kind: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_roles("admin", "manager", "operator")),
) -> UploadOut:
    if kind not in KINDS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"kind must be one of {sorted(KINDS)}")

    ext = _extension(file.filename or "")
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type '{ext}'. Allowed: {sorted(settings.allowed_extensions)}",
        )

    raw = await file.read()
    if len(raw) > settings.upload_max_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"File exceeds {settings.upload_max_mb} MB limit",
        )

    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File must be UTF-8 encoded")

    try:
        rows = _rows_from_csv(text) if ext == ".csv" else _rows_from_json(text)
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Could not parse file: {exc}")

    if not rows:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File contains no rows")

    normalised = NORMALISERS[kind](rows)
    db = get_db()
    inserted, failed, errors = 0, 0, []

    if kind == "telemetry":
        codes = {r["shipment_code"] for r in normalised if r.get("shipment_code")}
        shipment_lookup = {
            s["code"]: s for s in await db.shipments.find({"code": {"$in": list(codes)}}).to_list(len(codes) or 1)
        }
        result = await ingest.record_many(shipment_lookup, normalised)
        inserted, failed, errors = result["inserted"], result["failed"], result["errors"]
    else:
        collection = {"shipments": db.shipments, "products": db.products, "facilities": db.facilities}[kind]
        unique_key = {"shipments": "code", "products": "sku", "facilities": "code"}[kind]
        for index, row in enumerate(normalised):
            key = row.get(unique_key)
            if not key or not str(key).strip():
                failed += 1
                errors.append({"row": index + 1, "error": f"Missing {unique_key}"})
                continue
            if await collection.find_one({unique_key: key}):
                failed += 1
                errors.append({"row": index + 1, "error": f"Duplicate {unique_key} '{key}'"})
                continue
            row["created_at"] = now_utc()
            row["updated_at"] = now_utc()
            await collection.insert_one(row)
            inserted += 1

    record = {
        "filename": file.filename,
        "kind": kind,
        "rows": len(normalised),
        "inserted": inserted,
        "failed": failed,
        "status": "completed" if failed == 0 else ("partial" if inserted else "failed"),
        "uploaded_by": user.get("email"),
        "errors": errors[:50],
        "created_at": now_utc(),
    }
    result = await db.uploads.insert_one(record)
    record["_id"] = result.inserted_id
    return UploadOut(**serialize(record))


@router.get("/templates/{kind}")
async def download_template(kind: str) -> dict:
    """Return a sample header/row so the UI can show the expected format."""
    templates = {
        "telemetry": {
            "headers": ["shipment_code", "ts", "temperature_c", "humidity_pct", "door_open", "battery_pct"],
            "sample": ["CC-2026-0001", "2026-02-11T08:00:00Z", "4.2", "63", "false", "97"],
        },
        "shipments": {
            "headers": ["code", "origin_code", "destination_code", "carrier", "vehicle_no", "min_c", "max_c", "quantity", "priority"],
            "sample": ["CC-2026-0100", "FAC-BLR-01", "FAC-CHN-02", "ThermoMove", "KA01AB1234", "2", "8", "1200", "high"],
        },
        "products": {
            "headers": ["sku", "name", "category", "unit", "min_c", "max_c", "shelf_life_days"],
            "sample": ["SKU-VAC-001", "Vaccine Vial", "pharma", "vial", "2", "8", "365"],
        },
        "facilities": {
            "headers": ["name", "code", "type", "city", "country", "capacity_pallets"],
            "sample": ["Bengaluru Cold Hub", "FAC-BLR-01", "warehouse", "Bengaluru", "India", "5000"],
        },
    }
    if kind not in templates:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown template")
    return templates[kind]
