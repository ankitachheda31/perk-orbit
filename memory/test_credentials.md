# Perk Orbit — Test Credentials

## App PIN (local-only, per-device)
- Test PIN: `1234`
- The PIN is created on first launch (Set PIN flow) and verified on each session.
- PIN is stored in `localStorage` under key `perk_orbit_pin` (no server-side auth).

## Backend
- No login required (PIN is local-only). Backend endpoints scope data by `user_pin` query param.
- Use `user_pin=1234` as the test identifier in API calls.

## Mocked Razorpay Membership
- Activation endpoint: `POST /api/membership/activate?user_pin=1234`
- Issues a 6-month ₹99 plan with a random referral code (`PERK-XXXXXX`).

## API quick-test
```
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
curl -s "$API_URL/api/health"
curl -s "$API_URL/api/vouchers?user_pin=1234"
```
