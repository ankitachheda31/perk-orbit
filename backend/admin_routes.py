"""PerkWorth — Admin API routes.

Thin HTTP layer over registry_service.py. All endpoints require role='admin'
on the authenticated user (set by ensure_admins on startup).

Endpoints (mounted at /api/admin/registry):
  GET    /pending                 list pending (high-impact pinned first)
  GET    /changelog               approval/rejection audit log
  GET    /runs                    cron-run history
  GET    /stats                   counts for dashboard
  POST   /run-now                 manual trigger of the scrape+classify cycle
  POST   /pending/{pid}/approve   single-item approve
  POST   /pending/{pid}/reject    single-item reject
  POST   /pending/bulk-approve    bulk approve: { ids: string[], note?: string }
  POST   /pending/bulk-reject     bulk reject:  { ids: string[], note?: string }
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from registry_service import (
    run_registry_intel_once,
    apply_approval,
    apply_rejection,
)

log = logging.getLogger("perk_orbit.admin_routes")


class ApproveBody(BaseModel):
    note: Optional[str] = Field(default=None, max_length=400)


class BulkBody(BaseModel):
    ids: List[str] = Field(..., min_length=1, max_length=200)
    note: Optional[str] = Field(default=None, max_length=400)


def _admin_required(get_current_user):
    async def _dep(user=Depends(get_current_user)):
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    return _dep


def build_admin_router(db, emergent_llm_key: str, get_current_user) -> APIRouter:
    router = APIRouter(prefix="/api/admin/registry", tags=["admin"])
    admin_only = _admin_required(get_current_user)

    @router.get("/pending")
    async def list_pending(
        status: str = Query("pending", pattern="^(pending|approved|rejected|all)$"),
        limit: int = Query(50, ge=1, le=200),
        _admin=Depends(admin_only),
    ):
        q = {} if status == "all" else {"status": status}
        cursor = db.registry_pending.find(q).sort([("high_impact", -1), ("detected_at", -1)]).limit(limit)
        items = await cursor.to_list(length=limit)
        return {"items": items, "count": len(items)}

    @router.get("/changelog")
    async def get_changelog(limit: int = Query(100, ge=1, le=500), _admin=Depends(admin_only)):
        items = await db.registry_changelog.find().sort([("at", -1)]).limit(limit).to_list(length=limit)
        return {"items": items, "count": len(items)}

    @router.get("/runs")
    async def get_runs(limit: int = Query(20, ge=1, le=100), _admin=Depends(admin_only)):
        items = await db.registry_runs.find().sort([("started_at", -1)]).limit(limit).to_list(length=limit)
        return {"items": items, "count": len(items)}

    @router.get("/stats")
    async def get_stats(_admin=Depends(admin_only)):
        return {
            "pending": await db.registry_pending.count_documents({"status": "pending"}),
            "high_impact_pending": await db.registry_pending.count_documents({"status": "pending", "high_impact": True}),
            "approved_total": await db.registry_pending.count_documents({"status": "approved"}),
            "rejected_total": await db.registry_pending.count_documents({"status": "rejected"}),
        }

    @router.post("/run-now")
    async def trigger_run_now(_admin=Depends(admin_only)):
        return await run_registry_intel_once(db, emergent_llm_key)

    @router.post("/pending/{pid}/approve")
    async def approve(pid: str, body: ApproveBody, admin=Depends(admin_only)):
        item = await db.registry_pending.find_one({"_id": pid})
        if not item:
            raise HTTPException(status_code=404, detail="Pending item not found")
        if item["status"] != "pending":
            raise HTTPException(status_code=409, detail=f"Already {item['status']}")
        await apply_approval(db, item, admin.get("email"), body.note)
        return {"ok": True}

    @router.post("/pending/{pid}/reject")
    async def reject(pid: str, body: ApproveBody, admin=Depends(admin_only)):
        item = await db.registry_pending.find_one({"_id": pid})
        if not item:
            raise HTTPException(status_code=404, detail="Pending item not found")
        if item["status"] != "pending":
            raise HTTPException(status_code=409, detail=f"Already {item['status']}")
        await apply_rejection(db, item, admin.get("email"), body.note)
        return {"ok": True}

    @router.post("/pending/bulk-approve")
    async def bulk_approve(body: BulkBody, admin=Depends(admin_only)):
        """Approve up to 200 pending items at once. Returns per-id outcome."""
        results: list[dict] = []
        items = await db.registry_pending.find({"_id": {"$in": body.ids}, "status": "pending"}).to_list(length=len(body.ids))
        found_ids = {it["_id"] for it in items}
        for it in items:
            try:
                await apply_approval(db, it, admin.get("email"), body.note)
                results.append({"id": it["_id"], "ok": True})
            except Exception as e:
                results.append({"id": it["_id"], "ok": False, "error": str(e)})
        for missing_id in [i for i in body.ids if i not in found_ids]:
            results.append({"id": missing_id, "ok": False, "error": "not_pending_or_not_found"})
        return {"approved": sum(1 for r in results if r["ok"]), "failed": sum(1 for r in results if not r["ok"]), "results": results}

    @router.post("/pending/bulk-reject")
    async def bulk_reject(body: BulkBody, admin=Depends(admin_only)):
        results: list[dict] = []
        items = await db.registry_pending.find({"_id": {"$in": body.ids}, "status": "pending"}).to_list(length=len(body.ids))
        found_ids = {it["_id"] for it in items}
        for it in items:
            try:
                await apply_rejection(db, it, admin.get("email"), body.note)
                results.append({"id": it["_id"], "ok": True})
            except Exception as e:
                results.append({"id": it["_id"], "ok": False, "error": str(e)})
        for missing_id in [i for i in body.ids if i not in found_ids]:
            results.append({"id": missing_id, "ok": False, "error": "not_pending_or_not_found"})
        return {"rejected": sum(1 for r in results if r["ok"]), "failed": sum(1 for r in results if not r["ok"]), "results": results}

    return router
