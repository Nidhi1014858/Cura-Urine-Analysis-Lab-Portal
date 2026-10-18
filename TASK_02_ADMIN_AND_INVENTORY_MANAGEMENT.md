# Person 2 — Admin Login, Authorization, and Inventory Management UI

**Assigned to: Nidhi**

## Goal

Add a secure third user role, `Admin`. Only Admin users may add, update, or delete inventory. Technician and Clinician accounts must retain their current permissions and must not gain inventory mutation access.

## Ownership

This person owns:

- Role/authentication changes in `server/models/User.js` and `server/controllers/authController.js`
- Admin seed/provisioning in `server/seed/seedRunner.js` and `src/services/seedData.js`
- Admin session helpers in `src/context/AuthContext.jsx`
- Admin quick login in `src/pages/LoginPage.jsx`
- Admin-only route in `src/App.jsx`
- Inventory navigation in `src/components/layout/Sidebar.jsx` and `src/components/layout/MobileNav.jsx`
- `src/pages/InventoryPage.jsx` (new) and its add/edit/delete dialogs
- Admin-specific dashboard behavior where necessary
- Authorization on Person 1's inventory mutation routes and local/mock mutation methods
- Login documentation in `README.md` and `server/README.md`

Person 1 owns the inventory model, controllers, API payloads, stock decrement, and technician strip-selection behavior.

## Security Decisions

- Add `Admin` to the persisted `User.role` enum.
- Keep public signup limited to `Technician` and `Clinician`. **Do not add Admin to `SignupPage.jsx` and do not accept `role: "Admin"` at public `POST /api/auth/signup`**, because that would allow anyone to grant themselves inventory-control privileges.
- Provision the first Admin through the idempotent seed runner. Suggested demo account: `admin@cura.lab` / `password123` for development only.
- Keep roles immutable and ignore/reject role changes in profile updates.
- JWT login can remain role-agnostic because the existing auth middleware reloads the user from the database for each protected request.

## Authorization Rules

For the `/api/inventory` contract defined in `TASK_01_INVENTORY_AND_STOCK.md`:

- All endpoints require `protect`.
- `GET` endpoints allow Admin, Technician, and Clinician.
- `POST`, `PATCH`, and `DELETE` require `restrictTo('Admin')`.
- Technician/Clinician mutation attempts must return `403` without changing data.
- Unauthenticated requests must return `401`.

Hiding buttons or routes is not security. Verify permissions using direct API requests. Apply the same role checks in `src/services/localApi.js`, where there is no Express middleware.

## Frontend Work

1. Expose `isAdmin: user?.role === 'Admin'` from `AuthContext`.
2. Add `/inventory` behind `RoleRoute allowed={['Admin']}`.
3. Show Inventory navigation only to Admin in both desktop and mobile navigation.
4. Add an Admin quick-login choice without changing the standard email/password login flow.
5. Ensure the dashboard does not fall through to “Technician Mode” or show “Start New Test” for Admin. Give Admin an inventory-management call to action or neutral admin summary.
6. Create an Inventory page that:
   - lists brand, manufacturer, compatible panel(s), batch number, manufacture date, expiry date, quantity, and computed status;
   - supports add and edit with client-side validation;
   - asks for confirmation before delete;
   - distinguishes `In stock`, `Out of stock`, and `Expired`;
   - reports API errors through the existing toast system;
   - refetches after successful mutations.

Use Person 1's `/api/inventory` payload and `src/services/api.js` methods; do not create a second inventory data shape.

## Validation in the Admin Form

- Brand/catalog choice and at least one compatible panel are required.
- Batch number is required and normalized consistently with the server.
- Quantity is an integer greater than or equal to zero.
- Manufacture date cannot be in the future.
- Expiry date cannot precede manufacture date.
- The server remains authoritative even when client validation passes.

## Acceptance Criteria

- Seeded Admin credentials work in Mongo/API mode and local demo mode; `/api/auth/me` returns role `Admin`.
- Public signup rejects `role: "Admin"` with `400`.
- Admin sees the Inventory link on desktop and mobile and can open `/inventory`.
- Technician and Clinician do not see the link; manual navigation to `/inventory` redirects them.
- Admin can create, update, and delete inventory from the page.
- Technician/Clinician direct `POST`, `PATCH`, or `DELETE` inventory requests receive `403` and make no change.
- All unauthenticated inventory requests receive `401`.
- Technician and Clinician existing login, new-test, and review permissions remain unchanged.
- Admin is not shown Technician-only actions or labels.
- Seed execution remains idempotent and never duplicates the Admin account.
- Development credentials are documented and `npm run build` succeeds.

## Coordination Notes

- Agree with Person 1 on `/api/inventory` request/response shapes before building forms.
- Person 1 may initially create the inventory router. Person 2 is responsible for reviewing and verifying the final Admin-only mutation middleware.
- Do not make email or phone unique in the patient model; Person 3's duplicate rule deliberately permits reuse in some cases.
