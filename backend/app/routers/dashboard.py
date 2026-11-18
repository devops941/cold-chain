"""Dashboard aggregate route."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models.schemas import DashboardOut
from ..services import analytics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
async def get_dashboard(user: dict = Depends(get_current_user)) -> DashboardOut:
    return DashboardOut(**await analytics.dashboard())
