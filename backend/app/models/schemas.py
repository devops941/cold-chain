"""Pydantic schemas shared across the API."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["admin", "manager", "operator", "viewer"]
ShipmentStatus = Literal["planned", "in_transit", "delivered", "delayed", "cancelled"]
Priority = Literal["low", "normal", "high", "critical"]
AlertSeverity = Literal["info", "warning", "critical"]
AlertStatus = Literal["open", "acknowledged", "resolved"]


# ---------------------------------------------------------------- auth
class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    role: Role = "operator"
    org: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role
    org: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ------------------------------------------------------------ facilities
class FacilityIn(BaseModel):
    name: str
    code: str
    type: Literal["warehouse", "hub", "retail", "cold_store", "port"] = "warehouse"
    city: str | None = None
    country: str | None = None
    lat: float | None = None
    lng: float | None = None
    capacity_pallets: int | None = None
    temp_min_c: float | None = None
    temp_max_c: float | None = None
    active: bool = True


class FacilityOut(FacilityIn):
    id: str
    created_at: datetime | None = None


# -------------------------------------------------------------- products
class ProductIn(BaseModel):
    sku: str
    name: str
    category: str = "general"
    unit: str = "box"
    min_c: float = 2.0
    max_c: float = 8.0
    shelf_life_days: int | None = None
    active: bool = True


class ProductOut(ProductIn):
    id: str
    created_at: datetime | None = None


# ------------------------------------------------------------- shipments
class ShipmentIn(BaseModel):
    code: str | None = None
    origin_code: str
    destination_code: str
    product_sku: str | None = None
    carrier: str | None = None
    vehicle_no: str | None = None
    driver: str | None = None
    status: ShipmentStatus = "planned"
    priority: Priority = "normal"
    min_c: float = 2.0
    max_c: float = 8.0
    quantity: int | None = None
    distance_km: float | None = None
    departed_at: datetime | None = None
    eta: datetime | None = None
    notes: str | None = None


class ShipmentUpdate(BaseModel):
    status: ShipmentStatus | None = None
    priority: Priority | None = None
    carrier: str | None = None
    vehicle_no: str | None = None
    driver: str | None = None
    eta: datetime | None = None
    delivered_at: datetime | None = None
    notes: str | None = None


class ShipmentOut(BaseModel):
    id: str
    code: str
    origin_code: str
    destination_code: str
    product_sku: str | None = None
    carrier: str | None = None
    vehicle_no: str | None = None
    driver: str | None = None
    status: ShipmentStatus
    priority: Priority
    min_c: float
    max_c: float
    quantity: int | None = None
    distance_km: float | None = None
    departed_at: datetime | None = None
    eta: datetime | None = None
    delivered_at: datetime | None = None
    notes: str | None = None
    latest_temp_c: float | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# ------------------------------------------------------------- telemetry
class TelemetryIn(BaseModel):
    shipment_code: str | None = None
    shipment_id: str | None = None
    ts: datetime | None = None
    temperature_c: float
    humidity_pct: float | None = None
    door_open: bool = False
    battery_pct: int | None = None
    lat: float | None = None
    lng: float | None = None
    source: str = "sensor"


class TelemetryOut(BaseModel):
    id: str
    shipment_id: str
    ts: datetime
    temperature_c: float
    humidity_pct: float | None = None
    door_open: bool = False
    battery_pct: int | None = None
    lat: float | None = None
    lng: float | None = None
    source: str = "sensor"


# ---------------------------------------------------------------- alerts
class AlertOut(BaseModel):
    id: str
    shipment_id: str
    shipment_code: str | None = None
    type: str
    severity: AlertSeverity
    message: str
    value: float | None = None
    threshold: float | None = None
    status: AlertStatus
    created_at: datetime


class AlertUpdate(BaseModel):
    status: AlertStatus


# --------------------------------------------------------------- uploads
class UploadOut(BaseModel):
    id: str
    filename: str
    kind: str
    rows: int
    inserted: int
    failed: int
    status: str
    uploaded_by: str | None = None
    errors: list[dict] = []
    created_at: datetime


# ------------------------------------------------------------ dashboard
class DashboardOut(BaseModel):
    shipments_total: int
    shipments_in_transit: int
    shipments_delivered: int
    shipments_delayed: int
    facilities_total: int
    products_total: int
    alerts_open: int
    alerts_critical: int
    compliance_rate: float
    avg_temp_c: float | None = None
    telemetry_24h: int
    status_breakdown: list[dict]
    temp_trend: list[dict]
    recent_alerts: list[dict]
    top_lanes: list[dict]
