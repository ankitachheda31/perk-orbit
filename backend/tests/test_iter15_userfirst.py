"""Iteration 15 — User-First tests:
- Push Trust: dynamic notifications fire only at days_left==3 and 0<=days_left<=1
- Idempotency: repeated /api/notifications calls do not duplicate
- Redeemed vouchers do NOT generate expiry notifications
- Cards Savings Assistant: current_card_id filter + you_are_already_optimal
- Affiliate Tracking: new card_click fields persisted
- Regressions: membership referral_code, /api/cards/best without current_card_id
"""
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

USER_PIN = f"99{int(time.time()) % 100:02d}"  # unique test pin per run


@pytest.fixture(scope="module")
def s():
    return requests.Session()


def _mk_voucher(s, pin, days_offset, brand_suffix, status=None):
    today = datetime.now(timezone.utc).date()
    expiry = (today + timedelta(days=days_offset)).strftime("%Y-%m-%d")
    body = {
        "user_pin": pin,
        "category": "vouchers",
        "brand": f"TESTBRAND_{brand_suffix}",
        "title": f"TEST voucher {brand_suffix}",
        "code": f"TEST{uuid.uuid4().hex[:6].upper()}",
        "expiry": expiry,
        "value_inr": 100,
    }
    r = s.post(f"{BASE_URL}/api/vouchers", json=body, timeout=15)
    assert r.status_code in (200, 201), f"Voucher create failed: {r.status_code} {r.text}"
    data = r.json()
    if status == "redeemed":
        vid = data.get("id") or data.get("_id")
        rr = s.post(f"{BASE_URL}/api/vouchers/{vid}/redeem",
                    json={"user_pin": pin}, timeout=15)
        # Allow either 200 or 404 if endpoint signature differs — best-effort
        assert rr.status_code in (200, 204), f"redeem failed: {rr.status_code} {rr.text}"
    return data


# ---------- Push Trust ----------
class TestPushNotificationsTrust:

    @classmethod
    def setup_class(cls):
        """Create 4 fresh test vouchers + 1 redeemed (5 days)."""
        cls.s = requests.Session()
        # Clear all vouchers for this user_pin so the test is deterministic
        try:
            cls.s.delete(f"{BASE_URL}/api/vouchers", params={"user_pin": USER_PIN}, timeout=15)
        except Exception:
            pass

        cls.v3 = _mk_voucher(cls.s, USER_PIN, 3, "DAYS3")     # ending_soon expected
        cls.v1 = _mk_voucher(cls.s, USER_PIN, 1, "DAYS1")     # urgent_expiry expected
        cls.v0 = _mk_voucher(cls.s, USER_PIN, 0, "DAYS0")     # urgent_expiry expected (today)
        cls.v2 = _mk_voucher(cls.s, USER_PIN, 2, "DAYS2")     # NO notification (in between)
        cls.v5 = _mk_voucher(cls.s, USER_PIN, 5, "DAYS5")     # NO notification
        cls.v_redeem = _mk_voucher(cls.s, USER_PIN, 1, "REDEEMED", status="redeemed")  # excluded

    def _get_notifs(self):
        r = self.s.get(f"{BASE_URL}/api/notifications",
                       params={"user_pin": USER_PIN}, timeout=20)
        assert r.status_code == 200, f"GET /api/notifications -> {r.status_code} {r.text}"
        data = r.json()
        # API may return either {items: [...]} or [...] — handle both
        return data.get("items") if isinstance(data, dict) else data

    def _voucher_id(self, v):
        return v.get("id") or v.get("_id")

    def test_3day_voucher_creates_ending_soon(self):
        notifs = self._get_notifs()
        target = self._voucher_id(self.v3)
        match = [n for n in notifs if n.get("ref_voucher_id") == target]
        assert match, f"No notif for 3-day voucher {target}. Got: {[(n.get('kind'), n.get('ref_voucher_id')) for n in notifs]}"
        assert any(n.get("kind") == "ending_soon" for n in match), \
            f"Expected kind=ending_soon for 3-day voucher, got {[n.get('kind') for n in match]}"

    def test_1day_voucher_creates_urgent(self):
        notifs = self._get_notifs()
        target = self._voucher_id(self.v1)
        match = [n for n in notifs if n.get("ref_voucher_id") == target]
        assert match, f"No notif for 1-day voucher {target}"
        assert any(n.get("kind") == "urgent_expiry" for n in match)

    def test_today_voucher_creates_urgent(self):
        notifs = self._get_notifs()
        target = self._voucher_id(self.v0)
        match = [n for n in notifs if n.get("ref_voucher_id") == target]
        assert match, f"No notif for today voucher {target}"
        assert any(n.get("kind") == "urgent_expiry" for n in match)

    def test_2day_voucher_no_notification(self):
        """Days_left=2 is between heads-up (3) and urgent (0-1) — must NOT trigger."""
        notifs = self._get_notifs()
        target = self._voucher_id(self.v2)
        match = [n for n in notifs if n.get("ref_voucher_id") == target
                 and n.get("kind") in ("ending_soon", "urgent_expiry")]
        assert not match, f"2-day voucher should NOT have expiry notif, got: {match}"

    def test_5day_voucher_no_notification(self):
        notifs = self._get_notifs()
        target = self._voucher_id(self.v5)
        match = [n for n in notifs if n.get("ref_voucher_id") == target
                 and n.get("kind") in ("ending_soon", "urgent_expiry")]
        assert not match, f"5-day voucher should NOT have expiry notif"

    def test_redeemed_voucher_no_notification(self):
        notifs = self._get_notifs()
        target = self._voucher_id(self.v_redeem)
        match = [n for n in notifs if n.get("ref_voucher_id") == target
                 and n.get("kind") in ("ending_soon", "urgent_expiry")]
        assert not match, f"Redeemed voucher must NOT generate expiry notif, got: {match}"

    def test_idempotency_no_duplicates(self):
        """Calling /api/notifications twice must NOT create duplicate docs."""
        notifs1 = self._get_notifs()
        time.sleep(0.5)
        notifs2 = self._get_notifs()
        # Count expiry notifs by (kind, ref_voucher_id)
        def key(n):
            return (n.get("kind"), n.get("ref_voucher_id"))
        exp_kinds = ("ending_soon", "urgent_expiry")
        keys1 = [key(n) for n in notifs1 if n.get("kind") in exp_kinds]
        keys2 = [key(n) for n in notifs2 if n.get("kind") in exp_kinds]
        # Same number of unique keys, no duplicates introduced
        assert len(keys2) == len(set(keys2)), f"Duplicates detected in 2nd call: {keys2}"
        assert sorted(keys1) == sorted(keys2), f"Notifs differ across calls: {keys1} vs {keys2}"


# ---------- Cards Savings Assistant ----------
class TestSavingsAssistant:

    def test_already_optimal_on_bpcl_fuel(self, s):
        """User on BPCL SBI Octane (best fuel card) → already optimal."""
        r = s.get(f"{BASE_URL}/api/cards/best", params={
            "category": "fuel",
            "monthly_spend_inr": 8000,
            "current_card_id": "icici-coral-fuel",
        }, timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["you_are_already_optimal"] is True, f"Expected already_optimal=True, got {d.get('you_are_already_optimal')}"
        assert d["results"] == [], f"Expected empty results, got {d['results']}"
        assert d["current_card_net_value_inr"] is not None
        assert isinstance(d["current_card_net_value_inr"], (int, float))

    def test_amazon_card_user_sees_bpcl_recommended(self, s):
        """User on Amazon Pay ICICI for fuel → should see BPCL SBI Octane with delta_inr>0."""
        r = s.get(f"{BASE_URL}/api/cards/best", params={
            "category": "fuel",
            "monthly_spend_inr": 8000,
            "current_card_id": "amazon-pay-icici",
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["you_are_already_optimal"] is False
        assert d["current_card_net_value_inr"] is not None
        assert len(d["results"]) > 0
        # BPCL SBI Octane must be in results
        bpcl = next((c for c in d["results"] if c["id"] == "icici-coral-fuel"), None)
        assert bpcl is not None, f"Expected BPCL in results, got {[c['id'] for c in d['results']]}"
        assert bpcl["delta_inr"] > 0, f"Expected positive delta_inr, got {bpcl['delta_inr']}"
        # Every recommended card must beat the current one
        for c in d["results"]:
            assert c["delta_inr"] > 0, f"Card {c['id']} has non-positive delta {c['delta_inr']}"
            assert c["id"] != "amazon-pay-icici", "Current card must not be in recommendations"

    def test_no_current_card_returns_delta_null(self, s):
        """No current_card_id → delta_inr is null on each result."""
        r = s.get(f"{BASE_URL}/api/cards/best", params={
            "category": "fuel",
            "monthly_spend_inr": 8000,
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["current_card_net_value_inr"] is None
        assert d["you_are_already_optimal"] is False
        assert len(d["results"]) > 0
        for c in d["results"]:
            assert c["delta_inr"] is None, f"Expected delta_inr=null without current_card_id, got {c['delta_inr']}"


# ---------- Affiliate Tracking ----------
class TestAffiliateTracking:

    def test_click_persists_new_fields(self, s):
        body = {
            "card_id": "icici-coral-fuel",
            "user_pin": USER_PIN,
            "category": "fuel",
            "source": "best",
            "current_card_id": "amazon-pay-icici",
            "monthly_spend_inr": 8000,
            "delta_inr": 5800,
        }
        r = s.post(f"{BASE_URL}/api/cards/click", json=body, timeout=15)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

        # Verify persistence via direct mongo
        import pymongo
        with open("/app/backend/.env") as f:
            envs = {l.split("=", 1)[0]: l.split("=", 1)[1].strip().strip('"') for l in f if "=" in l}
        mongo_url = envs.get("MONGO_URL")
        db_name = envs.get("DB_NAME")
        cli = pymongo.MongoClient(mongo_url)
        col = cli[db_name].card_clicks
        doc = col.find_one({
            "card_id": "icici-coral-fuel",
            "user_pin": USER_PIN,
            "current_card_id": "amazon-pay-icici",
        }, sort=[("at", -1)])
        assert doc is not None, "card_click doc not persisted"
        assert doc["category"] == "fuel"
        assert doc["source"] == "best"
        assert doc["monthly_spend_inr"] == 8000
        assert doc["delta_inr"] == 5800


# ---------- Regressions ----------
class TestRegressions:

    def test_membership_status_has_referral_code(self, s):
        r = s.get(f"{BASE_URL}/api/membership/status",
                  params={"user_pin": "1234"}, timeout=15)
        assert r.status_code == 200
        assert "referral_code" in r.json()
