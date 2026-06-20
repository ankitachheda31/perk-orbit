"""PerkWorth — Registry Intelligence Service.

Pure business logic: scrape RSS sources, classify articles with GPT-4o,
detect high-impact changes, persist pending updates, fire admin notifications.
No HTTP / routing concerns live here — see admin_routes.py for the API layer.
"""
from __future__ import annotations

import json
import logging
import os
import secrets
from datetime import datetime, timezone
from typing import Optional

import feedparser
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from mailer import send_email

log = logging.getLogger("perk_orbit.registry_service")


# ---------------------------------------------------------------------------
# Curated India loyalty / banking news sources — focused on program changes.
# ---------------------------------------------------------------------------
RSS_SOURCES: list[dict] = [
    {"name": "CardExpert India", "url": "https://www.cardexpert.in/feed/"},
    {"name": "Live From A Lounge", "url": "https://livefromalounge.com/feed/"},
    {"name": "PaisaBazaar Credit Cards", "url": "https://www.paisabazaar.com/credit-card/feed/"},
    {"name": "BankBazaar Blog", "url": "https://www.bankbazaar.com/blog/feed"},
    {"name": "LiveMint Money", "url": "https://www.livemint.com/rss/money"},
    {"name": "Economic Times BFSI", "url": "https://bfsi.economictimes.indiatimes.com/rss"},
    {"name": "Hindu BusinessLine Money", "url": "https://www.thehindubusinessline.com/markets/forex/feeder/default.rss"},
    {"name": "TheTechPanda Travel/Loyalty", "url": "https://www.thetechpanda.com/feed/"},
]

# Heuristic high-impact keywords — fast pre-filter; LLM has final say.
HIGH_IMPACT_KEYWORDS = (
    "devaluation", "devalued", "devalue", "reduce points", "reduced rewards",
    "redemption rule", "redemption change", "downgrade", "discontinu",
    "withdrawn", "closed", "shutdown", "merger", "acquired",
    "fee hike", "fee increase", "fee changed",
    "milestone removed", "cap reduced", "cap lowered",
    "transfer ratio", "miles ratio",
    "lounge access removed", "lounge restricted",
)

ALLOWED_TYPES = {
    "airline", "hotel", "fuel", "retail", "ecommerce", "banking_rewards", "fintech",
    "ott", "music", "telecom", "cab_mobility", "ota_travel", "food_qsr", "entertainment",
    "fitness", "healthcare", "news", "education", "automotive", "insurance", "beauty",
    "lounge", "generic",
}
ALLOWED_CHANGE_TYPES = {"new_program", "program_upgrade", "program_deprecated", "rule_change", "fee_change"}


CLASSIFY_PROMPT = """You are an Indian loyalty / rewards / membership programs analyst.

Given a news article (title + snippet), determine if it describes a CHANGE to an Indian loyalty, rewards, membership, or credit-card rewards program. Return ONLY strict JSON, no prose.

Schema:
{
  "is_change": true|false,
  "change_type": "new_program" | "program_upgrade" | "program_deprecated" | "rule_change" | "fee_change" | null,
  "brand": string|null,
  "program": string|null,
  "type": "airline" | "hotel" | "fuel" | "retail" | "ecommerce" | "banking_rewards" | "fintech" | "ott" | "music" | "telecom" | "cab_mobility" | "ota_travel" | "food_qsr" | "entertainment" | "fitness" | "healthcare" | "news" | "education" | "automotive" | "insurance" | "beauty" | "lounge" | "generic" | null,
  "membership_kind": "asset" | "content" | null,
  "high_impact": true|false,
  "high_impact_reason": string|null,
  "summary": string,
  "id_hint": string|null,
  "aliases": string[]
}

Rules:
- is_change=true only when the article describes a CONCRETE change to a specific program.
- Devaluation, redemption tightening, lounge access removal, or fee hike on existing card/program ⇒ high_impact=true.
- A new card launch with BETTER rewards is NOT high_impact (it's an opportunity, not a loss).
- type and membership_kind must be from the allowed lists.
"""


async def classify_with_gpt4o(api_key: str, title: str, snippet: str) -> Optional[dict]:
    """Call GPT-4o via emergentintegrations and parse a strict-JSON response."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"registry-intel-{secrets.token_hex(4)}",
            system_message=CLASSIFY_PROMPT,
        ).with_model("openai", "gpt-4o")
        prompt = f"Title: {title}\n\nSnippet: {snippet[:1200]}"
        raw = await chat.send_message(UserMessage(text=prompt))
        text = raw if isinstance(raw, str) else str(raw)
        text = text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(text)
        if data.get("type") and data["type"] not in ALLOWED_TYPES:
            data["type"] = "generic"
        if data.get("change_type") and data["change_type"] not in ALLOWED_CHANGE_TYPES:
            data["change_type"] = None
        if data.get("membership_kind") not in (None, "asset", "content"):
            data["membership_kind"] = None
        return data
    except Exception as e:
        log.warning("classify failed: %s", e)
        return None


def heuristic_high_impact(title: str, snippet: str) -> bool:
    blob = (title + " " + snippet).lower()
    return any(k in blob for k in HIGH_IMPACT_KEYWORDS)


async def notify_admins_high_impact(db, item: dict) -> None:
    """Email all admin users + drop a bell notification immediately."""
    admins = await db.users.find({"role": "admin"}).to_list(length=20)
    title = item.get("brand") or "Program"
    body = item.get("high_impact_reason") or item.get("summary") or "Major change detected"
    for a in admins:
        try:
            await db.notifications.update_one(
                {"user_pin": str(a["_id"]), "kind": "registry_high_impact", "ref_pending_id": item["_id"]},
                {
                    "$setOnInsert": {
                        "user_pin": str(a["_id"]),
                        "kind": "registry_high_impact",
                        "ref_pending_id": item["_id"],
                        "ref_screen": "admin",
                        "title": f"🚨 High-impact: {title}",
                        "body": body,
                        "priority": 0,
                        "read": False,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                },
                upsert=True,
            )
        except Exception as e:
            log.warning("bell notify failed: %s", e)
    for a in admins:
        email = a.get("email")
        if not email:
            continue
        try:
            html = f"""
            <h2 style="color:#9f1239">🚨 PerkWorth Registry — High-Impact Alert</h2>
            <p><strong>{title}</strong> &middot; {item.get('program') or ''}</p>
            <p>{body}</p>
            <p style="color:#555;font-size:13px">Detected from: {item.get('source_name') or 'RSS'}<br/>
            <a href="{item.get('source_url') or '#'}">Open source article</a></p>
            <hr/>
            <p>Open the PerkWorth Admin panel to approve or reject this change before the next 2-day cycle.</p>
            """
            await send_email(
                to_email=email,
                subject=f"🚨 PerkWorth · High-impact loyalty change: {title}",
                html=html,
            )
        except Exception as e:
            log.warning("email notify failed: %s", e)


async def run_registry_intel_once(db, emergent_llm_key: str) -> dict:
    """Fetch all sources, classify, persist pending updates. Returns a run summary."""
    started_at = datetime.now(timezone.utc).isoformat()
    fetched_articles = 0
    classified_changes = 0
    new_pending = 0
    high_impact_count = 0
    errors: list[str] = []

    for src in RSS_SOURCES:
        try:
            feed = feedparser.parse(src["url"])
            for entry in (feed.entries or [])[:15]:
                fetched_articles += 1
                title = (entry.get("title") or "").strip()
                snippet = (entry.get("summary") or entry.get("description") or "").strip()
                url = entry.get("link") or ""
                if not title:
                    continue
                if url and await db.registry_pending.find_one({"source_url": url}):
                    continue
                blob = (title + " " + snippet).lower()
                if not any(k in blob for k in ("reward", "loyalty", "program", "card", "miles", "points", "membership", "tier", "lounge", "redemption", "neu", "co-brand")):
                    continue
                data = await classify_with_gpt4o(emergent_llm_key, title, snippet)
                if not data or not data.get("is_change"):
                    continue
                classified_changes += 1
                if not data.get("high_impact"):
                    data["high_impact"] = heuristic_high_impact(title, snippet)
                doc = {
                    "_id": secrets.token_hex(10),
                    "status": "pending",
                    "change_type": data.get("change_type"),
                    "brand": data.get("brand"),
                    "program": data.get("program"),
                    "type": data.get("type"),
                    "membership_kind": data.get("membership_kind"),
                    "high_impact": bool(data.get("high_impact")),
                    "high_impact_reason": data.get("high_impact_reason"),
                    "summary": data.get("summary"),
                    "id_hint": data.get("id_hint"),
                    "aliases": [a.lower() for a in (data.get("aliases") or []) if isinstance(a, str)],
                    "source_name": src["name"],
                    "source_url": url,
                    "source_title": title,
                    "detected_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.registry_pending.insert_one(doc)
                new_pending += 1
                if doc["high_impact"]:
                    high_impact_count += 1
                    await notify_admins_high_impact(db, doc)
        except Exception as e:
            errors.append(f"{src['name']}: {e}")
            log.warning("source %s failed: %s", src["name"], e)

    summary = {
        "started_at": started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "fetched_articles": fetched_articles,
        "classified_changes": classified_changes,
        "new_pending": new_pending,
        "high_impact": high_impact_count,
        "errors": errors[:5],
    }
    await db.registry_runs.insert_one({"_id": secrets.token_hex(10), **summary})
    return summary


def start_registry_intel_cron(db, emergent_llm_key: str) -> AsyncIOScheduler:
    """APScheduler cron — runs Mon/Wed/Fri at 04:00 IST (every 2 days)."""
    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        run_registry_intel_once,
        CronTrigger(day_of_week="mon,wed,fri", hour=4, minute=0),
        kwargs={"db": db, "emergent_llm_key": emergent_llm_key},
        id="perk_registry_intel",
        replace_existing=True,
    )
    scheduler.start()
    log.info("Registry Intelligence cron scheduled (Mon/Wed/Fri 04:00 IST)")
    return scheduler


# ---------------------------------------------------------------------------
# Apply approved / rejected changes to live overlay + changelog
# ---------------------------------------------------------------------------
async def apply_approval(db, pending_item: dict, admin_email: str, note: Optional[str]) -> None:
    """Write the pending change into the live overlay collection + changelog."""
    if pending_item.get("change_type") in {"new_program", "program_upgrade", "rule_change", "fee_change"}:
        overlay_doc = {
            "_id": pending_item["brand"].lower() if pending_item.get("brand") else pending_item["_id"],
            "brand": pending_item.get("brand"),
            "program": pending_item.get("program"),
            "type": pending_item.get("type") or "generic",
            "kind": pending_item.get("membership_kind") or "content",
            "aliases": pending_item.get("aliases") or [],
            "id_hint": pending_item.get("id_hint"),
            "summary": pending_item.get("summary"),
            "source_url": pending_item.get("source_url"),
            "approved_by": admin_email,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "change_type": pending_item.get("change_type"),
        }
        await db.registry_overlay.update_one(
            {"_id": overlay_doc["_id"]}, {"$set": overlay_doc}, upsert=True
        )
    elif pending_item.get("change_type") == "program_deprecated":
        if pending_item.get("brand"):
            await db.registry_overlay.update_one(
                {"_id": pending_item["brand"].lower()},
                {"$set": {"deprecated": True, "deprecated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )

    await db.registry_pending.update_one(
        {"_id": pending_item["_id"]},
        {"$set": {"status": "approved", "approved_by": admin_email, "approved_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.registry_changelog.insert_one({
        "_id": secrets.token_hex(10),
        "action": pending_item.get("change_type") or "approved",
        "brand": pending_item.get("brand"),
        "program": pending_item.get("program"),
        "high_impact": pending_item.get("high_impact", False),
        "actor": admin_email,
        "note": note,
        "ref_pending_id": pending_item["_id"],
        "at": datetime.now(timezone.utc).isoformat(),
    })


async def apply_rejection(db, pending_item: dict, admin_email: str, note: Optional[str]) -> None:
    await db.registry_pending.update_one(
        {"_id": pending_item["_id"]},
        {"$set": {
            "status": "rejected",
            "rejected_by": admin_email,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejection_note": note,
        }},
    )
    await db.registry_changelog.insert_one({
        "_id": secrets.token_hex(10),
        "action": "rejected",
        "brand": pending_item.get("brand"),
        "program": pending_item.get("program"),
        "high_impact": pending_item.get("high_impact", False),
        "actor": admin_email,
        "note": note,
        "ref_pending_id": pending_item["_id"],
        "at": datetime.now(timezone.utc).isoformat(),
    })


# ---------------------------------------------------------------------------
# Admin role seeding — promote owner emails on startup
# ---------------------------------------------------------------------------
ADMIN_OWNER_EMAILS = [
    e.strip().lower()
    for e in (os.environ.get("ADMIN_OWNER_EMAILS") or "ankitachheda31@gmail.com,test@perkorbit.app").split(",")
    if e.strip()
]


async def ensure_admins(db) -> None:
    for email in ADMIN_OWNER_EMAILS:
        try:
            await db.users.update_one({"email": email}, {"$set": {"role": "admin"}}, upsert=False)
        except Exception as e:
            log.warning("ensure_admins for %s failed: %s", email, e)
