"""Tests for Credit Card Optimizer endpoints (cards.py)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to reading from frontend env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- /api/cards (list) ----
class TestCardsList:
    def test_list_cards_returns_arrays(self, s):
        r = s.get(f"{BASE_URL}/api/cards", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "cards" in data and isinstance(data["cards"], list)
        assert "categories" in data and isinstance(data["categories"], list)
        assert len(data["cards"]) >= 5
        assert len(data["categories"]) >= 5

    def test_card_required_fields(self, s):
        r = s.get(f"{BASE_URL}/api/cards", timeout=15)
        cards = r.json()["cards"]
        required = {"id", "name", "issuer", "annual_fee_inr", "tagline", "category_rates", "apply_url"}
        for c in cards:
            missing = required - set(c.keys())
            assert not missing, f"Card {c.get('id')} missing {missing}"

    def test_category_required_fields(self, s):
        r = s.get(f"{BASE_URL}/api/cards", timeout=15)
        cats = r.json()["categories"]
        required = {"id", "label", "emoji"}
        for c in cats:
            assert required.issubset(set(c.keys()))


# ---- /api/cards/best ----
class TestCardsBest:
    def test_best_fuel_returns_ranked(self, s):
        r = s.get(f"{BASE_URL}/api/cards/best", params={
            "category": "fuel", "monthly_spend_inr": 8000, "limit": 3
        }, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["category"] == "fuel"
        assert d["monthly_spend_inr"] == 8000
        results = d["results"]
        assert len(results) == 3
        # Top should be BPCL SBI Octane (7.25% fuel rate)
        assert results[0]["id"] == "icici-coral-fuel"
        # Sorted descending by net_annual_value_inr
        vals = [c["net_annual_value_inr"] for c in results]
        assert vals == sorted(vals, reverse=True)
        # Required score fields
        for c in results:
            for k in ("category_rate_pct", "estimated_annual_reward_inr", "fee_waived", "net_annual_value_inr"):
                assert k in c

    @pytest.mark.parametrize("category", ["online_shopping", "food_delivery", "groceries", "travel"])
    def test_best_other_categories(self, s, category):
        r = s.get(f"{BASE_URL}/api/cards/best", params={
            "category": category, "monthly_spend_inr": 10000, "limit": 3
        }, timeout=15)
        assert r.status_code == 200, r.text
        results = r.json()["results"]
        assert len(results) == 3
        # No empty score fields
        for c in results:
            assert isinstance(c["category_rate_pct"], (int, float))
            assert isinstance(c["estimated_annual_reward_inr"], int)
            assert isinstance(c["fee_waived"], bool)
            assert isinstance(c["net_annual_value_inr"], int)

    def test_best_zero_spend_does_not_crash(self, s):
        r = s.get(f"{BASE_URL}/api/cards/best", params={
            "category": "fuel", "monthly_spend_inr": 0, "limit": 3
        }, timeout=15)
        assert r.status_code == 200

    def test_best_missing_category_returns_422(self, s):
        r = s.get(f"{BASE_URL}/api/cards/best", timeout=15)
        assert r.status_code == 422


# ---- /api/cards/click ----
class TestCardsClick:
    def test_click_basic(self, s):
        r = s.post(f"{BASE_URL}/api/cards/click", json={
            "card_id": "hdfc-millennia", "source": "best"
        }, timeout=15)
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_click_with_pin_and_category(self, s):
        r = s.post(f"{BASE_URL}/api/cards/click", json={
            "card_id": "amazon-pay-icici", "user_pin": "1234",
            "category": "online_shopping", "source": "list"
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_click_missing_card_id_422(self, s):
        r = s.post(f"{BASE_URL}/api/cards/click", json={}, timeout=15)
        assert r.status_code == 422


# ---- Regression: /api/membership/status still has referral_code ----
class TestMembershipReferralRegression:
    def test_membership_status_has_referral_code(self, s):
        r = s.get(f"{BASE_URL}/api/membership/status",
                  params={"user_pin": "1234"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "referral_code" in data, f"referral_code missing: keys={list(data.keys())}"
