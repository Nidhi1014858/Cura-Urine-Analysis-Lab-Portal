# Cura Backend

Node.js, Express and MongoDB backend for the Cura urinalysis portal.

## Setup

From the project root:

```bash
npm run install:all
```

Create `server/.env`:

```bash
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cura?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d
# Optional, only if Atlas DNS lookup times out:
# DNS_SERVERS=8.8.8.8,1.1.1.1
# Optional: Comma-separated allowed frontend origins (defaults to localhost:3000, 127.0.0.1:3000)
# CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# Optional: Authorization code required to register as Clinician via public signup
# CLINICIAN_INVITE_CODE=your-clinician-invite-code
```

Start the frontend and backend together:

```bash
npm run dev:all
```

The seed runner is idempotent: it creates the demo users, patients, and tests when they are missing without resetting counters.

For the frontend bridge, set this in the root `.env.local` when needed:

```bash
VITE_USE_MOCK=false
```

Use `VITE_USE_MOCK=true` only for the offline localStorage demo fallback.

## Seeded Logins

- Technician: `tech@cura.lab` / `password123`
- Clinician: `clinician@cura.lab` / `password123`
- Admin: `admin@cura.lab` / `password123`

The Admin account is seeded for development and inventory management. Public signup intentionally rejects the `Admin` role.

## Request Examples

Auth:

```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"tech@cura.lab\",\"password\":\"password123\"}"
```

Patients:

```bash
curl http://localhost:5000/api/patients -H "Authorization: Bearer <token>"
```

Tests:

```bash
curl http://localhost:5000/api/tests -H "Authorization: Bearer <token>"
```

Batch lookup:

```bash
curl http://localhost:5000/api/tests/batches/CUR-14-2401 -H "Authorization: Bearer <token>"
```

Dashboard stats:

```bash
curl http://localhost:5000/api/stats/dashboard -H "Authorization: Bearer <token>"
```

Offline demo mode:

```bash
VITE_USE_MOCK=true npm run dev
```

## Security Configuration

### Clinician Role Provisioning & Invite Code
- Public user registration (`POST /api/auth/signup`) defaults to the `Technician` role when no role or `Technician` is requested.
- Clinician privileges grant access to clinical reviews, verification queues, and test sign-offs.
- To permit Clinician registration, specify an invite code in `server/.env`:
  ```bash
  CLINICIAN_INVITE_CODE=your-secret-invite-code
  ```
- Public signups requesting `role: "Clinician"` must supply the matching `clinicianCode`. If missing or invalid, the API rejects the registration with HTTP 403 Forbidden.
- The invite code is never stored in the database, returned in API responses, or logged.
- Pre-seeded evaluation accounts (`clinician@cura.lab`) are already provisioned and do not require invite codes for login.

### CORS Configuration
- By default, the API accepts cross-origin requests from standard local development origins (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`) and headless non-browser tools (`!origin`).
- To authorize additional frontend domains, set a comma-separated list in `server/.env`:
  ```bash
  CORS_ORIGINS=https://portal.example.com,https://staging.example.com
  ```
- Disallowed browser origins are rejected by CORS middleware. Note that CORS is a browser-enforced policy and does not replace endpoint authentication; all protected routes authoritatively require verified JWT Bearer tokens and role checks.
