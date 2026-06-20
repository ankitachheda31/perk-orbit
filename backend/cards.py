"""PerkWorth — Credit Card Optimizer.

Curated catalog of India's best-value reward cards, plus a recommendation engine
that picks the right card for a given spend category. Affiliate-ready: every card
has an `apply_url` field that can be swapped for a tracked deeplink later.

Endpoint surface (mounted at /api/cards):
- GET  /api/cards                 → full list (all categories)
- GET  /api/cards/best?category=X → ranked top picks for one category
- POST /api/cards/click           → log a click for affiliate attribution
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

log = logging.getLogger("perk_orbit.cards")


# ---------------------------------------------------------------------------
# Curated card catalog.
# Reward rates reflect publicly-listed program terms as of 2026-Q1; these
# are conservative and should not include capped accelerators.
# ---------------------------------------------------------------------------
CARDS: List[dict] = [
    {
        "id": "hdfc-millennia",
        "name": "HDFC Millennia",
        "issuer": "HDFC Bank",
        "annual_fee_inr": 1000,
        "fee_waiver_spend_inr": 100000,
        "tagline": "5% cashback on Amazon, Flipkart, Swiggy, Zomato, Cult.fit",
        "category_rates": {
            "online_shopping": 5.0,
            "food_delivery": 5.0,
            "fitness": 5.0,
            "fuel": 1.0,
            "groceries": 1.0,
            "default": 1.0,
        },
        "highlights": [
            "5% cashback on 10 partner brands",
            "1000 CashPoints welcome benefit",
            "Annual fee waived at ₹1L spend",
        ],
        "best_for": ["Online shoppers", "Swiggy/Zomato regulars", "Cult.fit users"],
        "apply_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/millennia-credit-card",
    },
    {
        "id": "axis-flipkart",
        "name": "Axis Bank Flipkart",
        "issuer": "Axis Bank",
        "annual_fee_inr": 500,
        "fee_waiver_spend_inr": 350000,
        "tagline": "5% on Flipkart, 4% on partners, 1.5% everywhere",
        "category_rates": {
            "online_shopping": 5.0,
            "food_delivery": 4.0,
            "travel": 4.0,
            "fuel": 1.5,
            "groceries": 1.5,
            "default": 1.5,
        },
        "highlights": [
            "5% unlimited cashback on Flipkart",
            "4% on Cleartrip, Swiggy, Uber, Curefit",
            "Flat 1.5% on every other spend",
        ],
        "best_for": ["Flipkart loyalists", "Travel + food spenders"],
        "apply_url": "https://www.axisbank.com/retail/cards/credit-card/flipkart-axis-bank-credit-card",
    },
    {
        "id": "sbi-cashback",
        "name": "SBI Cashback Card",
        "issuer": "SBI Card",
        "annual_fee_inr": 999,
        "fee_waiver_spend_inr": 200000,
        "tagline": "5% cashback on all online spends, no partner restrictions",
        "category_rates": {
            "online_shopping": 5.0,
            "food_delivery": 5.0,
            "travel": 5.0,
            "entertainment": 5.0,
            "fuel": 0.0,
            "groceries": 5.0,
            "default": 1.0,
        },
        "highlights": [
            "5% on every online merchant (no list)",
            "1% on offline spends",
            "₹5000 monthly cashback cap (generous)",
        ],
        "best_for": ["Heavy online spenders", "People who hate brand restrictions"],
        "apply_url": "https://www.sbicard.com/en/personal/credit-cards/cashback/cashback-sbi-card.page",
    },
    {
        "id": "tataneu-hdfc-infinity",
        "name": "Tata Neu Infinity HDFC",
        "issuer": "HDFC Bank",
        "annual_fee_inr": 1499,
        "fee_waiver_spend_inr": 300000,
        "tagline": "5% NeuCoins on Tata Brands + 1.5% everywhere else",
        "category_rates": {
            "groceries": 5.0,  # BigBasket
            "food_delivery": 1.5,
            "online_shopping": 1.5,
            "fuel": 1.5,
            "default": 1.5,
        },
        "highlights": [
            "5% on Tata Neu, BigBasket, Croma, 1mg, AirAsia",
            "Free Adani Lounge access (8/yr)",
            "1 NeuCoin = ₹1 redeemable",
        ],
        "best_for": ["BigBasket regulars", "Tata ecosystem loyalists"],
        "apply_url": "https://www.hdfcbank.com/personal/pay/cards/credit-cards/tata-neu-infinity",
    },
    {
        "id": "amazon-pay-icici",
        "name": "Amazon Pay ICICI",
        "issuer": "ICICI Bank",
        "annual_fee_inr": 0,
        "fee_waiver_spend_inr": 0,
        "tagline": "5% on Amazon for Prime, 2% on 100+ partner merchants",
        "category_rates": {
            "online_shopping": 5.0,
            "food_delivery": 2.0,
            "travel": 2.0,
            "fuel": 1.0,
            "groceries": 1.0,
            "default": 1.0,
        },
        "highlights": [
            "Lifetime FREE — no annual fee",
            "5% on Amazon (Prime), 3% non-Prime",
            "Cashback as Amazon Pay balance",
        ],
        "best_for": ["Amazon shoppers", "Anyone wanting zero-fee card"],
        "apply_url": "https://www.icicibank.com/personal-banking/cards/credit-card/amazon-pay-credit-card",
    },
    {
        "id": "idfc-first-select",
        "name": "IDFC FIRST Select",
        "issuer": "IDFC FIRST Bank",
        "annual_fee_inr": 0,
        "fee_waiver_spend_inr": 0,
        "tagline": "Lifetime FREE · 10X rewards on incremental spend > ₹20K/mo",
        "category_rates": {
            "online_shopping": 2.5,
            "food_delivery": 2.5,
            "travel": 2.5,
            "fuel": 1.0,
            "groceries": 2.5,
            "default": 1.0,
        },
        "highlights": [
            "Lifetime FREE",
            "10X rewards above ₹20K/month spend",
            "4 complimentary domestic lounge visits / qtr",
        ],
        "best_for": ["Mid-spend users", "First credit card seekers"],
        "apply_url": "https://www.idfcfirstbank.com/credit-card/select-credit-card",
    },
    {
        "id": "icici-coral-fuel",
        "name": "BPCL SBI Octane",
        "issuer": "SBI Card",
        "annual_fee_inr": 1499,
        "fee_waiver_spend_inr": 200000,
        "tagline": "7.25% value-back on BPCL fuel — best fuel card in India",
        "category_rates": {
            "fuel": 7.25,
            "online_shopping": 1.0,
            "groceries": 1.25,
            "food_delivery": 1.25,
            "default": 1.0,
        },
        "highlights": [
            "7.25% on BPCL fuel (incl. surcharge waiver)",
            "5% on dining, groceries, departmental stores",
            "1% fuel surcharge waiver upto ₹100/mo",
        ],
        "best_for": ["BPCL fuel users", "Family with one car+"],
        "apply_url": "https://www.sbicard.com/en/personal/credit-cards/travel/bpcl-sbi-card-octane.page",
    },
]


CATEGORIES = [
    {"id": "online_shopping", "label": "Online Shopping", "emoji": "🛒"},
    {"id": "food_delivery", "label": "Food Delivery", "emoji": "🍔"},
    {"id": "fuel", "label": "Fuel", "emoji": "⛽"},
    {"id": "groceries", "label": "Groceries", "emoji": "🥬"},
    {"id": "travel", "label": "Travel", "emoji": "✈️"},
    {"id": "entertainment", "label": "Entertainment", "emoji": "🎬"},
    {"id": "fitness", "label": "Fitness", "emoji": "💪"},
]


def _score_card(card: dict, category: str, monthly_spend_inr: int) -> dict:
    rate = card["category_rates"].get(category, card["category_rates"].get("default", 1.0))
    annual_reward = (monthly_spend_inr * 12) * (rate / 100.0)
    fee = card["annual_fee_inr"]
    waiver_at = card.get("fee_waiver_spend_inr", 0)
    waived = waiver_at > 0 and (monthly_spend_inr * 12) >= waiver_at
    net_value = annual_reward - (0 if waived else fee)
    return {
        **card,
        "category_rate_pct": rate,
        "estimated_annual_reward_inr": round(annual_reward),
        "fee_waived": bool(waived),
        "net_annual_value_inr": round(net_value),
    }


class CardClickBody(BaseModel):
    card_id: str
    user_pin: Optional[str] = None
    category: Optional[str] = None
    source: Optional[str] = None  # 'best', 'list', 'voucher_widget'
    current_card_id: Optional[str] = None  # what they were using before — for affiliate analytics
    monthly_spend_inr: Optional[int] = None
    delta_inr: Optional[int] = None  # projected extra annual savings vs their current card


def build_cards_router(db) -> APIRouter:
    router = APIRouter(prefix="/api/cards", tags=["cards"])

    @router.get("")
    async def list_cards():
        return {
            "cards": CARDS,
            "categories": CATEGORIES,
        }

    @router.get("/best")
    async def best_cards(
        category: str = Query(..., description="Spend category id (see /api/cards categories)"),
        monthly_spend_inr: int = Query(10000, ge=0, le=10000000),
        limit: int = Query(3, ge=1, le=7),
        current_card_id: Optional[str] = Query(
            None,
            description=(
                "Card id the user currently uses (or 'none' / null if no card). "
                "When provided, only recommendations with HIGHER net annual value "
                "than the current card are returned, with a delta_inr field showing "
                "the extra savings vs the current card."
            ),
        ),
    ):
        scored = [_score_card(c, category, monthly_spend_inr) for c in CARDS]
        scored.sort(key=lambda c: (c["net_annual_value_inr"], c["category_rate_pct"]), reverse=True)

        current_card_obj = None
        current_net = None
        if current_card_id and current_card_id != "none":
            current = next((c for c in CARDS if c["id"] == current_card_id), None)
            if current:
                current_card_obj = _score_card(current, category, monthly_spend_inr)
                current_net = current_card_obj["net_annual_value_inr"]

        # Filter to "user benefits" only — be a Savings Assistant, not a sales channel.
        if current_net is not None:
            scored = [
                {**c, "delta_inr": c["net_annual_value_inr"] - current_net}
                for c in scored
                if c["id"] != current_card_id and c["net_annual_value_inr"] > current_net
            ]
        else:
            scored = [{**c, "delta_inr": None} for c in scored]

        return {
            "category": category,
            "monthly_spend_inr": monthly_spend_inr,
            "current_card": current_card_obj,
            "current_card_net_value_inr": current_net,
            "you_are_already_optimal": current_net is not None and len(scored) == 0,
            "results": scored[:limit],
        }

    @router.post("/click")
    async def log_click(body: CardClickBody):
        """Persist click for future affiliate attribution. Best-effort, never errors out."""
        try:
            await db.card_clicks.insert_one({
                "_id": secrets.token_hex(8),
                "card_id": body.card_id,
                "user_pin": body.user_pin,
                "category": body.category,
                "source": body.source,
                "current_card_id": body.current_card_id,
                "monthly_spend_inr": body.monthly_spend_inr,
                "delta_inr": body.delta_inr,
                "at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            log.warning("card_click log failed: %s", e)
        return {"ok": True}

    return router
