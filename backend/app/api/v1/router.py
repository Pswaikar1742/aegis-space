"""
AegiSpace — API v1 Router Aggregator

Collects all v1 endpoint routers into a single router
that the main application mounts at /api/v1.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.bookings import router as bookings_router
from app.api.v1.endpoints.leads import router as leads_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.nexus import router as nexus_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.tickets import router as tickets_router
from app.api.v1.endpoints.members import router as members_router
from app.api.v1.endpoints.crm import router as crm_router
from app.api.v1.endpoints.billing import router as billing_router
from app.api.v1.endpoints.visitors import router as visitors_router
from app.api.v1.endpoints.facility import router as facility_router

router = APIRouter(prefix="/api/v1")

router.include_router(inventory_router)
router.include_router(bookings_router)
router.include_router(leads_router)
router.include_router(nexus_router)
router.include_router(analytics_router)
router.include_router(tickets_router)
router.include_router(members_router)
router.include_router(crm_router)
router.include_router(billing_router)
router.include_router(visitors_router)
router.include_router(facility_router)

