# PerkWorth — Test Credentials

> **Note**: The app rebranded from "Perk Orbit" → "PerkWorth" in Feb 2026. Existing DB user records still hold their original `@perkorbit.app` emails (data continuity). New signups should use `@perkworth.app` going forward.

## Cloud Account (existing DB record)
- **Email**: `test@perkorbit.app` *(legacy email, still works for login)*
- **Password**: `Perk@1234`
- Use these to log in on any device → wallet auto-restores

## Admin Account
- **Email**: `admin@perkorbit.app`
- **Password**: `PerkOrbit@2026`
- Seeded via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env (run `/api/auth/signup` once to create on first boot)

## Device-level PIN (per device, set after first cloud login)
- Test PIN: `1234`
- New device: any PIN you set (e.g. `9999`)

## API quick-test
```bash
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Signup
curl -c /tmp/c.txt -X POST "$API/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@perkworth.app","password":"newpass123","name":"New User","pin_to_claim":"1234"}'

# Login (cookie-based)
curl -c /tmp/c.txt -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@perkorbit.app","password":"Perk@1234"}'

# Authenticated /me
curl -b /tmp/c.txt "$API/api/auth/me"
```

## Production URLs
- App:      https://perkworth.com/
- Landing:  https://perkworth.com/landing.html
- Privacy:  https://perkworth.com/privacy.html
- Terms:    https://perkworth.com/terms.html
- Refund:   https://perkworth.com/refund.html
- Mirror:   https://perkworth.app/

## Razorpay Test Card (for ₹99/quarter checkout)
- **Card**: `4111 1111 1111 1111`
- **Expiry**: any future month / year
- **CVV**: `123`
- **Name**: any
