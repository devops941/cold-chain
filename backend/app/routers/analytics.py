"""Analytics routes (compliance, temperature distribution, carrier performance)."""

from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Query

from ..database import get_db
from ..deps import get_current_user
from ..utils import now_utc

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
async def overview(days: int = Query(30, ge=1, le=365), user: dict = Depends(get_current_user)) -> dict:
    db = get_db()
    since = now_utc() - timedelta(days=days)

    # Temperature histogram (bucketed to whole degrees).
    histogram = await db.telemetry.aggregate(
        [
            {"$match": {"ts": {"$gte": since}}},
            {
                "$group": {
                    "_id": {"$floor": "$temperature_c"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    ).to_list(100)

    # Alerts by type.
    alerts_by_type = await db.alerts.aggregate(
        [
            {"$match": {"created_at": {"$gte": since}}},
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
    ).to_list(20)

    # Carrier performance: shipments + excursions.
    carriers = await db.shipments.aggregate(
        [
            {"$match": {"carrier": {"$ne": None}}},
            {
                "$group": {
                    "_id": "$carrier",
                    "shipments": {"$sum": 1},
                    "delivered": {"$sum": {"$cond": [{"$eq": ["$status", "delivered"]}, 1, 0]}},
                    "delayed": {"$sum": {"$cond": [{"$eq": ["$status", "delayed"]}, 1, 0]}},
                }
            },
            {"$sort": {"shipments": -1}},
            {"$limit": 10},
        ]
    ).to_list(10)

    # Daily throughput.
    throughput = await db.shipments.aggregate(
        [
            {"$match": {"created_at": {"$gte": since}}},
            {
                "$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    ).to_list(90)

    # Category mix of products.
    categories = await db.products.aggregate(
        [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    ).to_list(20)

    total_shipments = await db.shipments.count_documents({})
    on_time = await db.shipments.count_documents({"status": "delivered"})
    delayed = await db.shipments.count_documents({"status": "delayed"})
    compliance = round((on_time / total_shipments) * 100, 1) if total_shipments else 100.0

    return {
        "range_days": days,
        "compliance_rate": compliance,
        "on_time": on_time,
        "delayed": delayed,
        "temperature_histogram": [
            {"bucket": int(r["_id"]) if r["_id"] is not None else 0, "count": r["count"]}
            for r in histogram
        ],
        "alerts_by_type": [{"type": r["_id"], "count": r["count"]} for r in alerts_by_type],
        "carriers": [
            {
                "carrier": r["_id"],
                "shipments": r["shipments"],
                "delivered": r["delivered"],
                "delayed": r["delayed"],
            }
            for r in carriers
        ],
        "throughput": [{"date": r["_id"], "count": r["count"]} for r in throughput],
        "categories": [{"category": r["_id"], "count": r["count"]} for r in categories],
    }
