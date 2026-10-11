# Cura project audit

**Audit date:** 2026-10-11  
**Scope:** Read-only audit of the React/Vite frontend and Express/MongoDB backend. The only file created for this audit is this report. No write HTTP requests, seed scripts, cleanup scripts, signups, or MongoDB writes were run.

## Executive summary

**Estimated overall completion: 73%.** These are rubric estimates, not test-coverage percentages: DONE = 1 point, PARTIAL = 0.5, MISSING/BROKEN = 0, UNVERIFIED excluded; each area's applicable code requirements are equally weighted. The overall estimate is the unweighted mean of the seven areas below (73%). Runtime/build and repository-history evidence is incomplete, so this is not a release certification.

| Area | Estimate | Basis |
|---|---:|---|
| Part A — foundation/auth/patients | 86% | Main Express/auth/patient paths are implemented; live health and unauthenticated protection were checked. Build, full authenticated database flow, and git membership are unverified. |
| Part B — tests/review | 78% | Test creation, listing, lookup, batch lookup, and review are implemented, but test/stat async routes lack the common wrapper and full workflow was not exercised. |
| Part C — seed/stats/frontend bridge | 75% | Idempotent seeding and database-derived stats exist; frontend adapter works by inspection, but documentation and API-mode demo-data behavior are imperfect. |
| Frontend bridge | 87% | All 15 service methods exist and mostly match; review method’s accepted metadata differs intentionally, and complete live workflow is unverified. |
| Frontend features | 72% | Most requested UI features are present; signup has a role toggle and draft autosave is absent. |
| Security/hygiene | 55% | Password hashing and auth protections exist; permissive CORS, plaintext demo fixtures, unresolved tracked-secret/history checks, and localStorage tokens remain concerns. |
| Docs/demo | 58% | Setup scripts and server README exist, but root README is stale and demo data/state is not safely verified. |

## Top blockers for Monday

| Rank | Severity | Blocker | Evidence | Owner | Effort |
|---:|---|---|---|---|---|
| 1 | High | Build, lint, syntax, git state, and historical-secret checks could not be executed in this environment. Do not treat the project as verified until a teammate runs these locally. | [RAN] CLI audit agent reported PowerShell unavailable; no build/lint/node-check/git output. | Surbhi | S |
| 2 | High | The backend seeds demo users, patients, and tests into MongoDB, so the live API can show fixtures rather than only institution-entered records. Current database contents were not inspected under the read-only audit rules. | [READ] `server/seed/seedRunner.js:7-60`; it upserts fixtures from `src/services/seedData.js`. | Surbhi | M |
| 3 | High | A real 10/14-panel submit → report → clinician review → counts path was not exercised; async test/stat route handlers are not wrapped in `asyncHandler`. | [READ] `server/routes/testRoutes.js:14-27`, `server/routes/statRoutes.js:7`; POST test and review are protected/role-guarded, but direct async handlers are registered. | Rimjhim | M |
| 4 | Medium | Signup permits a self-selected Technician or Clinician role, contrary to a fixed-role/no-toggle requirement. | [READ] `src/pages/SignupPage.jsx:47-71`. | Surbhi | S |
| 5 | Medium | Root README still describes a localStorage mock backend and instructs users to replace mockApi; that no longer describes the default API mode. | [READ] root `README.md` sections “Architecture & Mock Data Layer” and “Swapping for a Real Backend API”. | Surbhi | S |
| 6 | Medium | Git tracking/branch status and committed secret exposure are unknown. | [UNVERIFIED] Git commands unavailable; see Step 1 and Step 7. | Surbhi | S |

## Step 1 — Project state

| Item | Status | Evidence | Owner | Effort |
|---|---|---|---|---|
| `git status` (modified/untracked files) | UNVERIFIED | [UNVERIFIED] Could not run Git commands: PowerShell executable was unavailable. No claim is made about cleanliness. | Surbhi | S |
| `git branch -a`, unmerged branches, current-branch work parts | UNVERIFIED | [UNVERIFIED] Branch/merge state unavailable. Source in the working directory contains A, B, and C work (auth/patients, test/review, seeding/stats), but branch inclusion cannot be established without Git. | Surbhi | S |
| `git log --oneline --graph -n 40` | UNVERIFIED | [UNVERIFIED] History command unavailable. | Surbhi | S |
| `git ls-files` names for `server/` and `src/services/` | UNVERIFIED | [UNVERIFIED] Tracked-file list unavailable. | Surbhi | S |
| Worktree inventory | PARTIAL | [READ] Repository folder contains `.git`, `server/`, `src/`, `dist/`, `node_modules/`, and a `vite.config.js.timestamp-...mjs` file. These are filesystem observations, not tracked/untracked classification. | Surbhi | S |

## Step 2 — Build and syntax health

| Item | Status | Evidence | Owner | Effort |
|---|---|---|---|---|
| `npm run build` | UNVERIFIED | [UNVERIFIED] Not run: command runner was unavailable. | Surbhi | S |
| `npm run lint` | UNVERIFIED | [READ] Root `package.json` defines `lint: eslint .`; [UNVERIFIED] execution unavailable. | Surbhi | S |
| `node --check` for every server `.js` file | UNVERIFIED | [UNVERIFIED] Could not execute Node CLI checks. | Surbhi | S |
| Server startup without seeding/writes | UNVERIFIED | [READ] `server/server.js:41-49` always calls `connectDB()` then `seedIfEmpty()` before listening. Server was not started because that could write to MongoDB, which the audit forbids. | Surbhi | S |
| `GET /api/health` | DONE | [RAN] `GET http://localhost:5000/api/health` returned `200 {"status":"ok"}`. | Nidhi | S |
| Unauthenticated protected GET | DONE | [RAN] `GET http://localhost:5000/api/patients` returned `401 {"message":"Not authenticated."}`. No token or data was sent. | Nidhi | S |

## Step 3 — Backend contract audit

| Rule | Status | Evidence | Owner | Effort |
|---|---|---|---|---|
| Top-level JSON transforms expose string `id` and remove `_id`, `__v`, `password` | PARTIAL | [READ] `server/utils/jsonTransform.js:1-11`; plugins on User, Patient, Test at `server/models/User.js:46`, `Patient.js:40`, `Test.js:186`. `clinicianReviewSchema` at `Test.js:44-73` retains Mongoose’s default subdocument `_id`, so nested test JSON may still contain `_id`. | Rimjhim | S |
| Patient display code; test patient reference/code/name; lookup by id or code; malformed patient id is 404 | DONE | [READ] `Patient.js:5-9`; `Test.js:107-120`; `testController.js:55-68,182-208`; `patientController.js:57-68`. | Nidhi | S |
| Error JSON/status and requested exact auth/expiry messages | DONE | [READ] `errorHandler.js:1-18`; `authController.js:31,57,73,78,115,145,172`; `validation.js:86-90`. Login errors use 400; duplicate email uses 409; expiry uses 400. | Nidhi | S |
| JWT `protect` / `restrictTo`; `/me` protected; no default user | PARTIAL | [READ] `middleware/auth.js:5-41`; `authRoutes.js:8-14`; `AuthContext.jsx:6-19`. Offline `localApi.getCurrentUser()` can return the stored session if its account is missing (`localApi.js:91-104`), a stale-session fallback. | Nidhi | S |
| Test submit/reviewer identity comes from authenticated user | DONE | [READ] `testController.js:88-89,305-306,312-322`; submitted identity is set from `req.user`, not request-body identity fields. | Rimjhim | S |
| Immutable roles; self-only profile update; role/password stripped; bcrypt | DONE | [READ] `User.js:16-29`; `authController.js:16-20,102-180`; signup/password bcrypt calls at `authController.js:42,120`. | Nidhi | S |
| Analyte schema fields/IDs and optional RGB data | PARTIAL | [READ] `Test.js:4-42,75-98`; analyte and audit sub-schemas disable generated `_id`/`id`. `clinicianReviewSchema` still has default generated subdocument `_id`. `rgbInput` is not required. | Rimjhim | S |
| Server recomputes analytes/status from RGB using shared prediction engine | DONE | [READ] `testController.js:70-72`; `validation.js:199-273` imports and calls `predictAnalytes` from `src/services/predictionEngine.js`. | Rimjhim | S |
| Batch/date validation; expired strip blocked; IST today | DONE | [READ] `validation.js:14-22,57-100`; exact expiry message at line 89; brand/panel check at `validation.js:107-135`; create route calls validators at `testController.js:52-55`. | Rimjhim | S |
| Atomic readable identifiers; no random code generation | DONE | [READ] `server/utils/codes.js:3-10` uses `Counter.findOneAndUpdate` with `$inc`, `upsert`, and returns prefix/year/sequence. | Nidhi | S |
| 10 MB JSON; escaped regex searches | DONE | [READ] `server/server.js:23`; patient search `patientController.js:8-10`; test search `testController.js:142-149`; batch lookup `testController.js:223-226`. | Nidhi | S |
| Batch route precedes `/:id`; unmatched batch returns 200 null | DONE | [READ] `testRoutes.js:19-24`; `testController.js:215-233`. | Rimjhim | S |
| Seed idempotence/password hashing/id mapping/traceability defaults | PARTIAL | [READ] `seedRunner.js:7-60` upserts users, reuses patients, maps fixture patient ids, inserts only missing test codes, hashes new fixture-user passwords, and supplies traceability defaults to inserted tests. Existing tests are not updated to backfill missing fields. | Surbhi | M |
| `.env` ignore/commit and exact `.gitignore` contents | PARTIAL | [READ] `.gitignore` contains `node_modules`, `.env`, `server/.env`, `.vite/`, `*.timestamp-*.mjs`, and `dist`. [UNVERIFIED] Whether only examples are tracked requires `git ls-files`; not established. | Surbhi | S |
| Async handlers cannot escape Express error handling | PARTIAL | [READ] `asyncHandler.js:1-3`; auth and patient routes wrap their async handlers. Test routes `testRoutes.js:14-27` and stats route `statRoutes.js:7` register raw async controllers. Those controllers currently contain try/catch, but the common rejection wrapper is not applied. | Rimjhim | S |
| DNS override and required environment refusal | DONE | [READ] `config/db.js:5-13` applies `DNS_SERVERS`; `server.js:14-17` exits when `MONGO_URI` or `JWT_SECRET` is missing. | Surbhi | S |

## Step 4 — Endpoint inventory

| Method + path | Guard | Handler | Status | Owner | Effort |
|---|---|---|---|---|---|
| `GET /api/health` | Public | Inline in `server/server.js:29-31` | Implemented; [RAN] 200 | Surbhi | S |
| `POST /api/auth/signup` | Public | `signup` | Implemented (`authRoutes.js:8`) | Nidhi | S |
| `POST /api/auth/login` | Public | `login` | Implemented (`authRoutes.js:9`) | Nidhi | S |
| `GET /api/auth/me` | `protect` | `getMe` | Implemented (`authRoutes.js:10`) | Nidhi | S |
| `PATCH /api/auth/password` | `protect` | `updatePassword` | Implemented (`authRoutes.js:11`) | Nidhi | S |
| `PATCH /api/users/:id` | `protect`; self-only in controller | `updateProfile` | Implemented (`authRoutes.js:13-14`) | Nidhi | S |
| `GET /api/patients` | `protect` | `getPatients` | Implemented (`patientRoutes.js:8-10`) | Nidhi | S |
| `POST /api/patients` | `protect` | `createPatient` | Implemented (`patientRoutes.js:8,11`) | Nidhi | S |
| `GET /api/patients/:id` | `protect` | `getPatientById` | Implemented (`patientRoutes.js:8,12`) | Nidhi | S |
| `GET /api/tests` | `protect` | `listTests` | Implemented (`testRoutes.js:14`) | Rimjhim | S |
| `POST /api/tests` | `protect`, Technician only | `createTest` | Implemented (`testRoutes.js:17`) | Rimjhim | S |
| `GET /api/tests/batches/:batchNumber` | `protect` | `batchLookup` | Implemented (`testRoutes.js:21`) | Rimjhim | S |
| `GET /api/tests/:id` | `protect` | `getTest` | Implemented (`testRoutes.js:24`) | Rimjhim | S |
| `PATCH /api/tests/:id/review` | `protect`, Clinician only | `reviewTest` | Implemented (`testRoutes.js:27`) | Rimjhim | S |
| `GET /api/stats/dashboard` | `protect` | `getDashboardStats` | Implemented (`statRoutes.js:7`) | Surbhi | S |

No required route was found missing or still wired to a 501 stub. Protected GET behavior was checked without credentials; authenticated route behavior was not exercised in this audit.

## Step 5 — Frontend/backend integration

`mockApi.js` selects `localApi` only when `VITE_USE_MOCK === 'true'`, otherwise `api` (`src/services/mockApi.js:1-4`). Vite proxies `/api` to `http://localhost:5000` and keeps port 3000 (`vite.config.js:6-14`). No root frontend `.env` or `.env.local` was found; `server/.env` exists but does not control Vite mock mode. Root `.env.example` says `VITE_USE_MOCK=false` (`.env.example:1`). Auth API uses `cura_token`, attaches Bearer credentials, clears on 401, and throws `Error(data.message || 'Request failed')` (`src/services/api.js:1,14-35,63-75`). Code stores the token in localStorage, but refresh survival was not manually tested in this audit.

| `mockApi` method | API implementation / endpoint | Status and shape | Owner | Effort |
|---|---|---|---|---|
| `login(email,password)` | `POST /api/auth/login` | DONE — User-only return matches AuthContext; server responds `{token,user}`. | Surbhi | S |
| `signup(userData)` | `POST /api/auth/signup` | DONE — User-only return matches AuthContext; server responds `{token,user}`. | Surbhi | S |
| `logout()` | No request; clears token | DONE — Matches local API session-clear intent. | Surbhi | S |
| `getCurrentUser()` | `GET /api/auth/me` with token | DONE — Null with no token or after 401; otherwise user object. | Surbhi | S |
| `updateProfile(userId,updates)` | `PATCH /api/users/:id` | DONE — User response matches profile fields; backend only accepts allowed fields and self id. | Surbhi | S |
| `changePassword(userId,currentPassword,newPassword)` | `PATCH /api/auth/password` | DONE — Backend uses token identity and ignores `userId`; returns transformed user. | Surbhi | S |
| `getTests(filters)` | `GET /api/tests?...` | DONE — Test array fields/ids align with report pages. | Surbhi | S |
| `getTestById(id)` | `GET /api/tests/:id` | DONE — Test JSON; `patientId` is Mongo id and code/name are separate fields. | Surbhi | S |
| `createTest(data)` | `POST /api/tests` | DONE — Created Test with transformed id and ISO dates; server recomputes analytes. | Surbhi | S |
| `updateClinicianReview(id,{status,notes})` | `PATCH /api/tests/:id/review` | PARTIAL — LocalApi also names optional reviewer identity arguments; server correctly derives identity from `req.user`, so UI status/notes work. | Surbhi | S |
| `getBatchSummary(batch)` | `GET /api/tests/batches/:batch` | DONE — Returns summary with `tests`, or null; dashboard handles null. | Surbhi | S |
| `getPatients(filters)` | `GET /api/patients?...` | DONE — Array of transformed patient objects. | Surbhi | S |
| `getPatientById(id)` | `GET /api/patients/:id` | DONE — Patient object plus `tests`; UI reads both. | Surbhi | S |
| `createPatient(data)` | `POST /api/patients` | DONE — 201 transformed patient. | Surbhi | S |
| `getDashboardStats()` | `GET /api/stats/dashboard` | DONE — Dashboard fields align with reads. | Surbhi | S |

Additional integration findings:

- [READ] All core route consumers import `mockApi`; search found no component/page `fetch()` or axios bypass. `localStorage` outside service code is the persisted theme preference (`src/context/ThemeContext.jsx:7,19`), not record storage.
- [READ] Static `PATHOLOGY_DESTINATIONS` and `STRIP_BRANDS` are used as UI option lists. These are configuration, not patient/test rows. `seedData.js` also contains fixture users/patients/tests; `seedRunner.js` writes those fixtures to MongoDB on startup. Therefore API mode can show seeded demo records, not exclusively real user-entered records.
- [READ] `StepReviewSubmit.jsx:47` has a fallback submitter name, but server `createTest` replaces that identity with `req.user.name` (`testController.js:88`). No identity leak to persisted API records from that fallback was found.
- [UNVERIFIED] Browser refresh, live token/session reload, all 15 authenticated endpoints, and current real-vs-seeded MongoDB rows were not tested because writes/authenticated actions are prohibited.

## Step 6 — Feature inventory

| Feature | Status | Evidence | Owner | Effort |
|---|---|---|---|---|
| Login/signup with fixed roles and no signup role toggle | PARTIAL | Login page/auth flow exist (`LoginPage.jsx:8-29`); signup toggles Technician/Clinician (`SignupPage.jsx:47-71`). | Surbhi | S |
| Technician-only New Test | DONE | [READ] `App.jsx:68`; API POST guard `testRoutes.js:16-17`. | Rimjhim | S |
| Clinician-only Review Queue, route-level | DONE | [READ] `App.jsx:72`; API review guard `testRoutes.js:26-27`. | Rimjhim | S |
| 10-panel and 14-panel strips | DONE | [READ] `StepStripSelection.jsx`; `predictionEngine.js:304-305`. | Rimjhim | S |
| Strip brands compatible with panel | DONE | [READ] `StepStripSelection.jsx:17-30,175-186`; `validation.js:107-135`. | Rimjhim | S |
| Pathology report destination | DONE | [READ] UI static options; server requires destination (`testController.js:47-49`). | Rimjhim | S |
| Batch/manufacture/expiry and expired blocking | PARTIAL | [READ] Client uses UTC (`StepStripSelection.jsx:9-14,80`), server uses IST (`validation.js:14-22,86-100`). | Rimjhim | S |
| Dashboard batch lookup | DONE | [READ] `DashboardPage.jsx:25-32`; `testRoutes.js:19-21`; `testController.js:215-257`. | Surbhi | S |
| RGB entry, swatches/sample loading | PARTIAL | [READ] RGB entry/sample selector (`StepPadReading.jsx:17,90-100,151-175`); distinct named quick-load buttons not found. | Rimjhim | S |
| Draft autosave | MISSING | [READ] No persistence implementation found in wizard sources. | Rimjhim | M |
| Prediction and confidence | DONE | [READ] `predictionEngine.js:28-39,304-328`; server recomputes (`validation.js:199-273`). | Rimjhim | S |
| Reports list/search/filters | DONE | [READ] `ReportsPage.jsx`; server list (`testController.js:129-180`). | Rimjhim | S |
| Report detail, audit trail, print | DONE | [READ] `ReportDetailPage.jsx`; `Test.js:75-98`. | Rimjhim | S |
| Patient list/history/trend/re-test shortcut | DONE | [READ] `PatientsPage.jsx`; `PatientDetailPage.jsx:43,57-75,151-200`. | Nidhi | S |
| Clinician approve/flag with notes | DONE | [READ] `ReviewModal.jsx:10-35,67-101`; server `testController.js:267-322`. | Rimjhim | S |
| Profile edit/avatar placeholder/remove | DONE | [READ] `ProfilePage.jsx:25-44,99-115`; `Avatar.jsx:4-8`. | Nidhi | S |
| Password absent from profile display; separate change flow | DONE | [READ] `ProfilePage.jsx:20-22,67-80,193-200`. | Nidhi | S |
| Persisted dark/light mode | DONE | [READ] `ThemeContext.jsx:6-20`. | Surbhi | S |
| Toasts | DONE | [READ] `LoginPage.jsx:20-26` and related pages. | Surbhi | S |

Optional extras (not required): critical-analyte safeguard/notification — **Not built (optional)**; AI-style report summary — **Not built (optional; report summary is rule-based text)**; validation dashboard — **Not built (optional)**; compliance page — **Not built (optional)**; colourblind mode — **Not built (optional)**; administrator approval of Clinician signup — **Not built (optional)**.

## Step 7 — Security and hygiene

| Check | Status | Evidence | Owner | Effort |
|---|---|---|---|---|
| Tracked env files / committed secrets / history search | UNVERIFIED | [UNVERIFIED] Git tracked-file/history searches unavailable; no `.env` values were displayed. | Surbhi | S |
| `server/.env` key presence (values withheld) | DONE | [RAN] MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, DNS_SERVERS all set; values withheld. | Surbhi | S |
| Plaintext demo passwords in source/seed | PARTIAL | [READ] `seedData.js:5-24`; localApi stores fixture credentials (`localApi.js:43-56,60-81`); backend hashes inserted users (`seedRunner.js:8-18`). | Surbhi | M |
| Password response leakage | DONE | [READ] `jsonTransform.js:3-10`; User `select:false` (`User.js:16-19`). | Nidhi | S |
| CORS policy | PARTIAL | [READ] Unrestricted `cors()` (`server.js:22`); inappropriate for production without origin policy. | Surbhi | S |
| Tokens in browser storage | PARTIAL | [READ] `api.js:1,15,29,45,54,59` uses localStorage; XSS exposure risk. | Surbhi | M |
| Smoke script/data | PARTIAL | [READ] Smoke script absent; cleanup script intentionally remains. Prior dry-run results do not establish current DB state; no authenticated data query was made. | Surbhi | S |
| Counter preservation | DONE | [READ] Cleanup script uses only User, Patient, Test; no counter operation. | Surbhi | S |

## Step 8 — Docs and demo readiness

| Item | Status | Evidence | Owner | Effort |
|---|---|---|---|---|
| Root scripts and concurrently | DONE | [READ] root `package.json` defines server/dev:all/install:all and lists concurrently. | Surbhi | S |
| Server scripts/dependencies | DONE | [READ] `server/package.json` defines dev/start and backend dependencies. | Surbhi | S |
| Environment examples | PARTIAL | [READ] root `.env.example` sets VITE_USE_MOCK=false; server example documents PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, optional DNS_SERVERS. | Surbhi | S |
| README accuracy | PARTIAL | [READ] root README describes localStorage mock as default and advises replacing mockApi; server README's seed description is stale. | Surbhi | S |
| Fresh clone / node_modules tracking | UNVERIFIED | [UNVERIFIED] Install/build/tracked-file inspection not run; local node_modules exists. | Surbhi | S |
| Demo data source | PARTIAL | [READ] Seeder imports fixtures and writes them to Mongo; API returns those rows. | Surbhi | M |

### Demo path and risks

| Demo step | Likely failure point / fallback |
|---|---|
| Technician login | Requires reachable MongoDB and seeded/created user. Seeder adds missing demo users but does not reset an existing account’s password (`seedRunner.js:8-20`). Login screen pre-fills demo credentials (`LoginPage.jsx:13-14`). |
| Patients | Requires API and DB. A prior dry run listed smoke records; whether a teammate later ran confirmation and the current patient rows are unverified. |
| New Test, both panels | Client and server validate dates/brand/panel; UI computes date using UTC while server uses IST. |
| Submit and report | Requires valid patient, RGB entries, supported strip brand and traceability data. Server recalculates from RGB. Build/runtime path unverified. |
| Logout / Clinician login / Review Queue | Clinician signup is self-selectable; otherwise requires a user with Clinician role and valid password. Review writes need functioning DB/network. |
| Dashboard counts / batch lookup | Both use protected API calls and Mongo data. Stats uses IST day boundaries; no authenticated live check was made. |
| Profile/avatar | Profile requests need a valid token; avatar is read as a data URL and can make user documents large. |
| Dark mode | Local preference persists in browser localStorage; this is not Mongo data. |

**Wi-Fi/Atlas/DNS risk:** health and unauthenticated protection succeeded against the already-running local server, but Atlas connectivity and authenticated DB requests were not checked in this audit. Server boot runs the seeder, so avoid starting it during a strict read-only evaluation unless database writes are explicitly acceptable. For demo fallback, `VITE_USE_MOCK=true` selects a localStorage fixture API and therefore is not a real-data fallback. Keep it false for the Mongo-backed demo.

## What remains unverified; human checks

1. On a safe shell in the repo, run `git status`, `git branch -a`, `git log --oneline --graph -n 40`, the requested `git ls-files` filters, and the history secret searches. Do not print `.env` contents.
2. Run `npm run build`, `npm run lint`, and `node --check` on all server JS files; capture first errors and fix them.
3. With explicit approval for database writes, verify seeded/current users and records, then walk the complete authenticated demo workflow using the accounts actually present in MongoDB.
4. Verify browser refresh/session restoration and compare UI date boundary behavior around midnight IST.
5. Decide whether Monday’s demo should include seeded fixture rows or only records explicitly entered by the institution; do not promise “real data only” while automatic fixture seeding is enabled.
6. Confirm with the team whether the signup role selector and absent draft autosave are accepted scope, and update stale root README before presenting setup instructions.
