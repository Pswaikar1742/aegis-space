"""
AegiSpace — API v1 Router Aggregator

Collects all v1 endpoint routers into a single router
that the main application mounts at /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.bookings import router as bookings_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.nexus import router as nexus_router

router = APIRouter(prefix="/api/v1")

router.include_router(inventory_router)
router.include_router(bookings_router)
router.include_router(nexus_router)
