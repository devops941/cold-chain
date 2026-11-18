"""Telemetry ingestion and automatic temperature-excursion detection."""

from __future__ import annotations

from datetime import timedelta

from bson import ObjectId

from ..database import get_db
from ..utils import now_utc


async def record_telemetry(shipment: dict, reading: dict) -> dict:
    """Persist a single telemetry reading and raise alerts when out of band."""
    db = get_db()
    doc = {
        "shipment_id": shipment["_id"],
        "shipment_code": shipment["code"],
        "ts": reading.get("ts") or now_utc(),
        "temperature_c": reading["temperature_c"],
        "humidity_pct": reading.get("humidity_pct"),
        "door_open": bool(reading.get("door_open", False)),
        "battery_pct": reading.get("battery_pct"),
        "lat": reading.get("lat"),
        "lng": reading.get("lng"),
        "source": reading.get("source", "sensor"),
        "created_at": now_utc(),
    }
    result = await db.telemetry.insert_one(doc)
    doc["_id"] = result.inserted_id

    await _check_excursions(shipment, doc)
    return doc


async def record_many(shipment_lookup: dict, rows: list[dict]) -> dict:
    """Bulk ingest telemetry rows. `shipment_lookup` maps code -> shipment doc."""
    db = get_db()
    inserted, failed, errors = 0, 0, []
    docs: list[dict] = []

    for index, row in enumerate(rows):
        code = str(row.get("shipment_code") or "").strip()
        shipment = shipment_lookup.get(code)
        if shipment is None:
            failed += 1
            errors.append({"row": index + 1, "error": f"Unknown shipment code '{code}'"})
            continue
        temp = row.get("temperature_c")
        if temp is None:
            failed += 1
            errors.append({"row": index + 1, "error": "Missing temperature_c"})
            continue
        docs.append(
            {
                "shipment_id": shipment["_id"],
                "shipment_code": code,
                "ts": row.get("ts") or now_utc(),
                "temperature_c": float(temp),
                "humidity_pct": row.get("humidity_pct"),
                "door_open": bool(row.get("door_open", False)),
                "battery_pct": row.get("battery_pct"),
                "lat": row.get("lat"),
                "lng": row.get("lng"),
                "source": row.get("source", "upload"),
                "created_at": now_utc(),
            }
        )

    if docs:
        await db.telemetry.insert_many(docs)
        inserted = len(docs)
        seen: set[ObjectId] = set()
        for doc in docs:
            if doc["shipment_id"] in seen:
                continue
            seen.add(doc["shipment_id"])
            shipment = shipment_lookup.get(doc["shipment_code"])
            if shipment:
                await _check_excursions(shipment, doc)

    return {"inserted": inserted, "failed": failed, "errors": errors}


async def _check_excursions(shipment: dict, reading: dict) -> None:
    """Compare a reading against the shipment band and open alerts as needed."""
    db = get_db()
    temp = reading["temperature_c"]
    low, high = shipment.get("min_c"), shipment.get("max_c")

    alert: dict | None = None
    if low is not None and temp < low:
        alert = {
            "type": "temperature_low",
            "severity": "critical" if temp < low - 2 else "warning",
            "message": f"{shipment['code']} dropped to {temp}°C (below {low}°C)",
            "value": temp,
            "threshold": low,
        }
    elif high is not None and temp > high:
        alert = {
            "type": "temperature_high",
            "severity": "critical" if temp > high + 2 else "warning",
            "message": f"{shipment['code']} rose to {temp}°C (above {high}°C)",
            "value": temp,
            "threshold": high,
        }
    elif reading.get("door_open") and shipment.get("status") == "in_transit":
        alert = {
            "type": "door_open",
            "severity": "warning",
            "message": f"{shipment['code']} door open while in transit",
            "value": None,
            "threshold": None,
        }

    if alert is None:
        return

    recent = await db.alerts.find_one(
        {
            "shipment_id": shipment["_id"],
            "type": alert["type"],
            "status": {"$ne": "resolved"},
            "created_at": {"$gte": now_utc() - timedelta(minutes=10)},
        }
    )
    if recent:
        return

    alert.update(
        {
            "shipment_id": shipment["_id"],
            "shipment_code": shipment["code"],
            "status": "open",
            "created_at": now_utc(),
        }
    )
    await db.alerts.insert_one(alert)
