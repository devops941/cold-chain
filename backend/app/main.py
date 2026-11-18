"""FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import settings
from .database import close, ensure_indexes, ping
from .routers import (
    alerts,
    analytics,
    auth,
    dashboard,
    facilities,
    products,
    shipments,
    telemetry,
    uploads,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("coldchain")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if await ping():
        logger.info("Connected to MongoDB database '%s'", settings.mongodb_db)
        if await ensure_indexes():
            logger.info("Indexes ensured")
        else:
            logger.warning(
                "Indexes not created — check the cluster's collection limit and database permissions"
            )
    else:
        logger.warning("MongoDB not reachable at startup — API will retry on demand")
    yield
    close()


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description="Cold chain temperature-controlled logistics API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    dashboard.router,
    facilities.router,
    products.router,
    shipments.router,
    telemetry.router,
    alerts.router,
    uploads.router,
    analytics.router,
):
    app.include_router(router)


@app.get("/api/health", tags=["system"])
async def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": __version__,
        "database": settings.mongodb_db,
        "mongo": await ping(),
    }


@app.get("/", tags=["system"])
async def root() -> dict:
    return {"name": settings.app_name, "version": __version__, "docs": "/docs"}
