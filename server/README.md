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
