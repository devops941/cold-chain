"""Seed the database with demo data: users, facilities, products, shipments, telemetry, alerts.

Usage:
    python seed.py            # seed if empty
    python seed.py --reset    # wipe collections first
"""

from __future__ import annotations

import asyncio
import random
import sys
from datetime import timedelta

from app.database import close, ensure_indexes, get_db, ping
from app.security import hash_password
from app.services.ingest import record_telemetry
from app.utils import now_utc

FACILITIES = [
    {"name": "Bengaluru Cold Hub", "code": "FAC-BLR-01", "type": "warehouse", "city": "Bengaluru", "country": "India", "lat": 12.9716, "lng": 77.5946, "capacity_pallets": 5200, "temp_min_c": 2, "temp_max_c": 8},
    {"name": "Chennai Port Store", "code": "FAC-CHN-02", "type": "port", "city": "Chennai", "country": "India", "lat": 13.0827, "lng": 80.2707, "capacity_pallets": 3800, "temp_min_c": -20, "temp_max_c": -12},
    {"name": "Mumbai Distribution Center", "code": "FAC-BOM-03", "type": "hub", "city": "Mumbai", "country": "India", "lat": 19.0760, "lng": 72.8777, "capacity_pallets": 6100, "temp_min_c": 2, "temp_max_c": 8},
    {"name": "Delhi Retail Cold Store", "code": "FAC-DEL-04", "type": "retail", "city": "Delhi", "country": "India", "lat": 28.6139, "lng": 77.2090, "capacity_pallets": 2100, "temp_min_c": 0, "temp_max_c": 6},
    {"name": "Hyderabad Frozen Vault", "code": "FAC-HYD-05", "type": "cold_store", "city": "Hyderabad", "country": "India", "lat": 17.3850, "lng": 78.4867, "capacity_pallets": 4400, "temp_min_c": -25, "temp_max_c": -18},
]

PRODUCTS = [
    {"sku": "SKU-VAC-001", "name": "mRNA Vaccine Vial", "category": "pharma", "unit": "vial", "min_c": 2, "max_c": 8, "shelf_life_days": 180},
    {"sku": "SKU-INS-002", "name": "Insulin Cartridge", "category": "pharma", "unit": "box", "min_c": 2, "max_c": 8, "shelf_life_days": 365},
    {"sku": "SKU-DRY-003", "name": "Pasteurised Milk 1L", "category": "dairy", "unit": "crate", "min_c": 1, "max_c": 4, "shelf_life_days": 21},
    {"sku": "SKU-FRZ-004", "name": "Frozen Peas 1kg", "category": "frozen", "unit": "bag", "min_c": -22, "max_c": -16, "shelf_life_days": 540},
    {"sku": "SKU-SEA-005", "name": "Chilled Salmon Fillet", "category": "seafood", "unit": "kg", "min_c": 0, "max_c": 2, "shelf_life_days": 7},
    {"sku": "SKU-VEG-006", "name": "Leafy Greens Pack", "category": "produce", "unit": "crate", "min_c": 2, "max_c": 6, "shelf_life_days": 10},
]

CARRIERS = ["ThermoMove", "ColdLane Logistics", "PolarFreight", "ChillChain", "IceRoad"]
DRIVERS = ["Arun Kumar", "Meena Raj", "Vikram Singh", "Priya Nair", "Suresh Babu", "Anita Das"]


def _code(index: int) -> str:
    return f"CC-{now_utc().year}-{index:04d}"


async def seed(reset: bool) -> None:
    db = get_db()
    if reset:
        for name in ("users", "facilities", "products", "shipments", "telemetry", "alerts", "uploads"):
            await db[name].delete_many({})
        print("Cleared existing collections")

    await ensure_indexes()

    if await db.users.count_documents({}) == 0:
        await db.users.insert_many(
            [
                {"name": "Admin User", "email": "admin@coldchain.io", "password_hash": hash_password("admin123"), "role": "admin", "org": "ColdChain", "created_at": now_utc()},
                {"name": "Meena Manager", "email": "manager@coldchain.io", "password_hash": hash_password("manager123"), "role": "manager", "org": "ColdChain", "created_at": now_utc()},
                {"name": "Omar Operator", "email": "operator@coldchain.io", "password_hash": hash_password("operator123"), "role": "operator", "org": "ColdChain", "created_at": now_utc()},
            ]
        )
        print("Seeded 3 users")

    if await db.facilities.count_documents({}) == 0:
        await db.facilities.insert_many([{**f, "active": True, "created_at": now_utc()} for f in FACILITIES])
        print(f"Seeded {len(FACILITIES)} facilities")

    if await db.products.count_documents({}) == 0:
        await db.products.insert_many([{**p, "active": True, "created_at": now_utc()} for p in PRODUCTS])
        print(f"Seeded {len(PRODUCTS)} products")

    shipment_count = await db.shipments.count_documents({})
    if shipment_count == 0:
        random.seed(7)
        shipments = []
        statuses = ["in_transit", "in_transit", "in_transit", "delivered", "delayed", "planned"]
        priorities = ["normal", "high", "critical", "low"]
        for i in range(1, 25):
            origin = random.choice(FACILITIES)
            destination = random.choice([f for f in FACILITIES if f["code"] != origin["code"]])
            product = random.choice(PRODUCTS)
            status = random.choice(statuses)
            departed = now_utc() - timedelta(hours=random.randint(2, 120))
            shipments.append(
                {
                    "code": _code(i),
                    "origin_code": origin["code"],
                    "destination_code": destination["code"],
                    "product_sku": product["sku"],
                    "carrier": random.choice(CARRIERS),
                    "vehicle_no": f"KA{random.randint(10, 99)}AB{random.randint(1000, 9999)}",
                    "driver": random.choice(DRIVERS),
                    "status": status,
                    "priority": random.choice(priorities),
                    "min_c": product["min_c"],
                    "max_c": product["max_c"],
                    "quantity": random.randint(200, 3000),
                    "distance_km": random.randint(120, 1800),
                    "departed_at": departed,
                    "eta": departed + timedelta(hours=random.randint(6, 48)),
                    "delivered_at": now_utc() if status == "delivered" else None,
                    "notes": None,
                    "created_at": departed,
                    "updated_at": now_utc(),
                }
            )
        await db.shipments.insert_many(shipments)
        print(f"Seeded {len(shipments)} shipments")

    if await db.telemetry.count_documents({}) == 0:
        random.seed(11)
        shipments = await db.shipments.find({}).to_list(100)
        readings = 0
        for shipment in shipments:
            mid = (shipment["min_c"] + shipment["max_c"]) / 2
            span = max((shipment["max_c"] - shipment["min_c"]) / 2, 0.5)
            for step in range(24):
                ts = now_utc() - timedelta(hours=24 - step)
                # Occasionally push a reading out of band to generate alerts.
                drift = random.uniform(-span * 0.7, span * 0.7)
                if random.random() < 0.08:
                    drift = span * random.uniform(1.4, 2.6)
                await record_telemetry(
                    shipment,
                    {
                        "ts": ts,
                        "temperature_c": round(mid + drift, 1),
                        "humidity_pct": round(random.uniform(45, 75), 1),
                        "door_open": random.random() < 0.05,
                        "battery_pct": random.randint(60, 100),
                        "lat": 12.9 + random.uniform(-1, 1),
                        "lng": 77.6 + random.uniform(-1, 1),
                        "source": "seed",
                    },
                )
                readings += 1
        print(f"Seeded {readings} telemetry readings")

    print("Seed complete.")
    print("Logins: admin@coldchain.io / admin123 · manager@coldchain.io / manager123 · operator@coldchain.io / operator123")


async def main() -> None:
    if not await ping():
        print("ERROR: cannot reach MongoDB. Check MONGODB_URI in .env")
        sys.exit(1)
    reset = "--reset" in sys.argv
    await seed(reset)
    close()


if __name__ == "__main__":
    asyncio.run(main())
