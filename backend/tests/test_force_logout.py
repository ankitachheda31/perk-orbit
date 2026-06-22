"""Force-logout endpoint + token_version invalidation."""
from __future__ import annotations

import re
import pytest
import requests

with open("/app/frontend/.env", "r", encoding="utf-8") as f:
    m = re.search(r"REACT_APP_BACKEND_URL=(.+)", f.read())
API = m.group(1).strip() if m else "http://localhost:8001"

ADMIN_EMAIL = "test@perkorbit.app"
ADMIN_PASS = "Perk@1234"
REVIEWER_EMAIL = "reviewer@perkworth.com"
REVIEWER_PASS = "PerkReview@2026"


def _login(email: str, password: str) -> str:
    r = requests.post(f"{API}/api/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        pytest.skip(f"Login failed for {email}: {r.status_code}")
    return r.json()["access_token"]


def test_force_logout_requires_auth():
    r = requests.post(f"{API}/api/admin/force-logout", json={"email": REVIEWER_EMAIL})
    assert r.status_code == 401


def test_force_logout_requires_admin():
    rt = _login(REVIEWER_EMAIL, REVIEWER_PASS)
    r = requests.post(
        f"{API}/api/admin/force-logout",
        json={"email": ADMIN_EMAIL},
        headers={"Authorization": f"Bearer {rt}"},
    )
    assert r.status_code == 403


def test_force_logout_validates_email():
    at = _login(ADMIN_EMAIL, ADMIN_PASS)
    h = {"Authorization": f"Bearer {at}"}
    r = requests.post(f"{API}/api/admin/force-logout", json={}, headers=h)
    assert r.status_code == 400
    r = requests.post(
        f"{API}/api/admin/force-logout",
        json={"email": "nobody@example.com"},
        headers=h,
    )
    assert r.status_code == 404


def test_force_logout_invalidates_old_token_then_fresh_login_works():
    # 1. reviewer gets a token
    rt_old = _login(REVIEWER_EMAIL, REVIEWER_PASS)
    me = requests.get(f"{API}/api/auth/me", headers={"Authorization": f"Bearer {rt_old}"})
    assert me.status_code == 200, "old token should work before force-logout"

    # 2. admin force-logs-out the reviewer
    at = _login(ADMIN_EMAIL, ADMIN_PASS)
    fl = requests.post(
        f"{API}/api/admin/force-logout",
        json={"email": REVIEWER_EMAIL},
        headers={"Authorization": f"Bearer {at}"},
    )
    assert fl.status_code == 200, fl.text
    body = fl.json()
    assert body["ok"] is True
    assert body["new_token_version"] == body["previous_token_version"] + 1
    assert body["users_updated"] == 1

    # 3. old token now rejected
    me2 = requests.get(f"{API}/api/auth/me", headers={"Authorization": f"Bearer {rt_old}"})
    assert me2.status_code == 401, "old token must be invalid after force-logout"
    assert "revoked" in me2.json()["detail"].lower()

    # 4. fresh login still works (and gets the new tv)
    rt_new = _login(REVIEWER_EMAIL, REVIEWER_PASS)
    assert rt_new != rt_old
    me3 = requests.get(f"{API}/api/auth/me", headers={"Authorization": f"Bearer {rt_new}"})
    assert me3.status_code == 200, "fresh token must work"
