"""Aggregation helpers powering the dashboard and analytics pages."""

from __future__ import annotations

from datetime import timedelta

from ..database import get_db
from ..utils import now_utc


async def dashboard() -> dict:
    db = get_db()
    day_ago = now_utc() - timedelta(hours=24)

    shipments_total = await db.shipments.count_documents({})
    in_transit = await db.shipments.count_documents({"status": "in_transit"})
    delivered = await db.shipments.count_documents({"status": "delivered"})
    delayed = await db.shipments.count_documents({"status": "delayed"})
    facilities_total = await db.facilities.count_documents({})
    products_total = await db.products.count_documents({})
    alerts_open = await db.alerts.count_documents({"status": "open"})
    alerts_critical = await db.alerts.count_documents(
        {"status": "open", "severity": "critical"}
    )
    telemetry_24h = await db.telemetry.count_documents({"ts": {"$gte": day_ago}})

    total_alerts = await db.alerts.count_documents({})
    resolved = await db.alerts.count_documents({"status": "resolved"})
    compliance = round(((total_alerts - resolved) / total_alerts) * 100, 1) if total_alerts else 100.0

    temp_cursor = db.telemetry.aggregate(
        [{"$group": {"_id": None, "avg": {"$avg": "$temperature_c"}}}]
    )
    temp_rows = await temp_cursor.to_list(1)
    avg_temp = round(temp_rows[0]["avg"], 1) if temp_rows and temp_rows[0]["avg"] is not None else None

    status_breakdown = await db.shipments.aggregate(
        [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
    ).to_list(10)
    status_breakdown = [{"status": r["_id"], "count": r["count"]} for r in status_breakdown]

    trend_rows = await db.telemetry.aggregate(
        [
            {"$match": {"ts": {"$gte": now_utc() - timedelta(days=7)}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$ts"},
                    },
                    "avg_temp": {"$avg": "$temperature_c"},
                    "readings": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    ).to_list(30)
    temp_trend = [
        {"date": r["_id"], "avg_temp": round(r["avg_temp"], 1), "readings": r["readings"]}
        for r in trend_rows
        if r["avg_temp"] is not None
    ]

    recent_alerts = await db.alerts.find({}).sort("created_at", -1).limit(6).to_list(6)
    recent_alerts = [
        {
            "id": str(a["_id"]),
            "shipment_code": a.get("shipment_code"),
            "type": a.get("type"),
            "severity": a.get("severity"),
            "message": a.get("message"),
            "status": a.get("status"),
            "created_at": a["created_at"].isoformat() if a.get("created_at") else None,
        }
        for a in recent_alerts
    ]

    lane_rows = await db.shipments.aggregate(
        [
            {
                "$group": {
                    "_id": {"origin": "$origin_code", "destination": "$destination_code"},
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 5},
        ]
    ).to_list(5)
    top_lanes = [
        {
            "lane": f"{r['_id']['origin']} → {r['_id']['destination']}",
            "count": r["count"],
        }
        for r in lane_rows
    ]

    return {
        "shipments_total": shipments_total,
        "shipments_in_transit": in_transit,
        "shipments_delivered": delivered,
        "shipments_delayed": delayed,
        "facilities_total": facilities_total,
        "products_total": products_total,
        "alerts_open": alerts_open,
        "alerts_critical": alerts_critical,
        "compliance_rate": compliance,
        "avg_temp_c": avg_temp,
        "telemetry_24h": telemetry_24h,
        "status_breakdown": status_breakdown,
        "temp_trend": temp_trend,
        "recent_alerts": recent_alerts,
        "top_lanes": top_lanes,
    }


async def shipment_analytics(shipment_id) -> dict:
    """Per-shipment statistics for the detail page."""
    db = get_db()
    pipeline = [
        {"$match": {"shipment_id": shipment_id}},
        {
            "$group": {
                "_id": None,
                "readings": {"$sum": 1},
                "avg_temp": {"$avg": "$temperature_c"},
                "min_temp": {"$min": "$temperature_c"},
                "max_temp": {"$max": "$temperature_c"},
                "avg_humidity": {"$avg": "$humidity_pct"},
                "door_events": {"$sum": {"$cond": ["$door_open", 1, 0]}},
            }
        },
    ]
    rows = await db.telemetry.aggregate(pipeline).to_list(1)
    if not rows:
        return {
            "readings": 0,
            "avg_temp": None,
            "min_temp": None,
            "max_temp": None,
            "avg_humidity": None,
            "door_events": 0,
            "excursions": 0,
        }
    row = rows[0]
    excursions = await db.alerts.count_documents(
        {"shipment_id": shipment_id, "type": {"$in": ["temperature_low", "temperature_high"]}}
    )
    return {
        "readings": row["readings"],
        "avg_temp": round(row["avg_temp"], 1) if row["avg_temp"] is not None else None,
        "min_temp": row["min_temp"],
        "max_temp": row["max_temp"],
        "avg_humidity": round(row["avg_humidity"], 1) if row["avg_humidity"] is not None else None,
        "door_events": row["door_events"],
        "excursions": excursions,
    }
