"""Shared helpers for serialising MongoDB documents and parsing values."""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Iterable

from bson import ObjectId


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "open"}


def parse_dt(value: Any) -> datetime | None:
    """Parse ISO-8601 strings (with or without a trailing Z) into aware datetimes."""
    if value in (None, "", "null"):
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    text = str(value).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                parsed = datetime.strptime(text, fmt)
                break
            except ValueError:
                continue
        else:
            return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def parse_float(value: Any) -> float | None:
    if value in (None, "", "null"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def parse_int(value: Any) -> int | None:
    number = parse_float(value)
    return int(number) if number is not None else None


def _convert(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_convert(v) for v in value]
    if isinstance(value, dict):
        return serialize(value)
    return value


def serialize(document: dict | None) -> dict | None:
    """Recursively convert ObjectId / datetime values to JSON-friendly types."""
    if document is None:
        return None
    result: dict = {}
    for key, value in document.items():
        if key == "_id":
            result["id"] = str(value)
        else:
            result[key] = _convert(value)
    return result


def serialize_many(documents: Iterable[dict]) -> list[dict]:
    return [serialize(d) for d in documents]
