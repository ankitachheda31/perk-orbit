# Perk Orbit — Test Credentials

## Cloud Account (new in v2 — Cloud Sync)
- **Email**: `test@perkorbit.app`
- **Password**: `Perk@1234`
- Use these to log in on any device → wallet auto-restores

## Admin Account
- **Email**: `admin@perkorbit.app`
- **Password**: `PerkOrbit@2026`
- Seeded via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env (run `/api/auth/signup` once to create on first boot)

## Device-level PIN (per device, set after first cloud login)
- Test PIN: `1234` (legacy local-only wallet that gets migrated via signup's `pin_to_claim`)
- New device: any PIN you set (e.g. `9999`)

## API quick-test
```bash
API=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Signup (creates cloud account + claims local PIN's wallet)
curl -c /tmp/c.txt -X POST "$API/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"new@perkorbit.app","password":"newpass123","name":"New User","pin_to_claim":"1234"}'

# Login (cookie-based)
curl -c /tmp/c.txt -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@perkorbit.app","password":"Perk@1234"}'

# Authenticated /me
curl -b /tmp/c.txt "$API/api/auth/me"

# Run market intelligence on demand
curl -X POST "$API/api/intelligence/run-now"

# List seed program registry
curl "$API/api/intelligence/programs?limit=20"
```

## Razorpay Test Card (for ₹99/quarter checkout)
- **Card**: `4111 1111 1111 1111`
- **Expiry**: any future month / year
- **CVV**: `123`
- **Name**: any
