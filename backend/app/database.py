"""MongoDB (Motor) connection, collection access and index management."""

from __future__ import annotations

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import PyMongoError

from .config import settings

logger = logging.getLogger("coldchain.db")

_client: AsyncIOMotorClient | None = None


def connect() -> AsyncIOMotorClient:
    """Create the shared Motor client (idempotent)."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=15000,
            uuidRepresentation="standard",
        )
    return _client


def get_client() -> AsyncIOMotorClient:
    return connect()


def get_db() -> AsyncIOMotorDatabase:
    return get_client()[settings.mongodb_db]


def close() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ping() -> bool:
    try:
        await get_client().admin.command("ping")
        return True
    except PyMongoError as exc:  # pragma: no cover - network dependent
        logger.warning("MongoDB ping failed: %s", exc)
        return False


async def ensure_indexes() -> bool:
    """Create the indexes the API relies on. Safe to run on every boot.

    Returns False instead of raising when the cluster refuses to create the
    collections (for example an Atlas tier that has hit its collection limit),
    so the API can still start and surface the problem through /api/health.
    """
    db = get_db()
    try:
        await db.users.create_index([("email", ASCENDING)], unique=True)
        await db.facilities.create_index([("code", ASCENDING)], unique=True)
        await db.products.create_index([("sku", ASCENDING)], unique=True)
        await db.shipments.create_index([("code", ASCENDING)], unique=True)
        await db.shipments.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        await db.telemetry.create_index([("shipment_id", ASCENDING), ("ts", DESCENDING)])
        await db.alerts.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
        await db.uploads.create_index([("created_at", DESCENDING)])
        return True
    except PyMongoError as exc:  # pragma: no cover - network/cluster dependent
        logger.error(
            "Could not create indexes in database '%s': %s", settings.mongodb_db, exc
        )
        return False
