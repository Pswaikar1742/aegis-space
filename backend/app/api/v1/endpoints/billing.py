import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import SQLiteWrapper as Client  # SQLite-backed

from app.core.db import get_supabase_client
from app.models.billing import BillingCompileRequest, InvoiceOut
from app.core.auth import require_role
from app.core.pubsub import publish_event

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Automated Invoicing Engine"])


@router.get(
    "/receivables",
    response_model=list[InvoiceOut],
    summary="List open accounts receivable",
)
async def list_receivables(
    branch_id: str | None = None,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["cfo", "manager"])),
) -> list[InvoiceOut]:
    try:
        query = db.table("invoices").select("*").neq("status", "paid")
        if branch_id:
            query = query.eq("branch_id", branch_id)
        response = query.order("created_at", desc=True).execute()
        return [InvoiceOut(**row) for row in (getattr(response, "data", None) or [])]
    except Exception as exc:
        logger.exception("Failed to fetch receivables")
        raise HTTPException(status_code=500, detail=str(exc))

@router.post(
    "/compile",
    response_model=InvoiceOut,
    status_code=status.HTTP_201_CREATED,
    summary="Compile Billing (CFO / Manager)",
)
async def compile_billing(
    payload: BillingCompileRequest,
    db: Client = Depends(get_supabase_client),
    user_auth: dict = Depends(require_role(["cfo", "manager"])),
):
    try:
        # 1. Fetch leads for this company to find associated bookings
        leads_res = db.table("leads").select("id").eq("company_name", payload.company_name).eq("branch_id", payload.branch_id).execute()
        leads_data = getattr(leads_res, "data", None) or []
        lead_ids = [lead["id"] for lead in leads_data if lead.get("id")]

        base_rent = 0.0
        incidentals = 0.0

        if lead_ids:
            # 2. Calculate active lease rent (base rent from bookings that are confirmed)
            bookings_res = db.table("bookings").select("monthly_rate_locked").in_("lead_id", lead_ids).eq("status", "confirmed").execute()
            bookings_data = getattr(bookings_res, "data", None) or []
            base_rent = sum(float(b.get("monthly_rate_locked") or 0) for b in bookings_data)

        # 3. Calculate incidentals from member_perks (e.g. over-quota printing, negative credits)
        # We need member IDs associated with this company
        members_res = db.table("members").select("id").eq("company_name", payload.company_name).eq("branch_id", payload.branch_id).execute()
        members_data = getattr(members_res, "data", None) or []
        member_ids = [m["id"] for m in members_data if m.get("id")]

        if member_ids:
            perks_res = db.table("member_perks").select("monthly_credits, printing_quota").in_("member_id", member_ids).execute()
            perks_data = getattr(perks_res, "data", None) or []
            for perk in perks_data:
                credits = int(perk.get("monthly_credits") or 0)
                printing = int(perk.get("printing_quota") or 0)
                # Just arbitrary mock incidental logic: if negative credits (overdraft), charge $10 per credit
                if credits < 0:
                    incidentals += abs(credits) * 10.0
                # If printing quota < 0, charge $0.10 per page
                if printing < 0:
                    incidentals += abs(printing) * 0.10

        total_due = base_rent + incidentals

        # 4. Insert into invoices table
        invoice_row = {
            "company_name": payload.company_name,
            "branch_id": payload.branch_id,
            "base_rent": base_rent,
            "incidentals": incidentals,
            "total_due": total_due,
            "status": "draft"
        }
        try:
            invoice_res = db.table("invoices").insert(invoice_row).execute()
            invoice_data = getattr(invoice_res, "data", None)
            if not invoice_data:
                try:
                    await publish_event({
                        "type": "invoice_create_failed",
                        "branch_id": payload.branch_id,
                        "error": "insert_returned_no_data",
                        "payload": invoice_row,
                    })
                except Exception:
                    logger.exception("Failed to publish invoice_create_failed event")
                raise HTTPException(status_code=500, detail="Failed to create invoice")
            return InvoiceOut(**invoice_data[0])
        except HTTPException:
            raise
        except Exception as e:
            logger.exception("Failed to insert invoice")
            try:
                await publish_event({
                    "type": "invoice_create_failed",
                    "branch_id": payload.branch_id,
                    "error": str(e),
                })
            except Exception:
                logger.exception("Failed to publish invoice_create_failed event")
            raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to compile billing")
        raise HTTPException(status_code=500, detail=str(e))
