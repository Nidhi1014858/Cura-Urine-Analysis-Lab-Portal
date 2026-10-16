# Person 1 — Inventory Data, Stock Consumption, and Strip Availability

**Assigned to: Rimjhim**

## Goal

Replace manually entered strip-batch data with database-backed inventory. A technician must only be able to select a compatible batch that is in stock and unexpired. When no usable strips remain for a brand, its card in the test wizard must be grey and unclickable.

## Ownership

This person owns the inventory domain and its integration with test submission:

- `server/models/Inventory.js` (new)
- `server/controllers/inventoryController.js` (new)
- `server/routes/inventoryRoutes.js` (new)
- Inventory reads in `server/server.js`
- Stock validation/consumption in `server/controllers/testController.js`
- Inventory-aware validation in `server/utils/validation.js`
- Inventory API methods in `src/services/api.js` and the equivalent local/mock implementation
- Dynamic brand/batch selection in `src/components/wizard/StepStripSelection.jsx`
- Any shared inventory seed data needed by MongoDB and local demo mode

Person 2 owns the Admin role, the admin-only inventory management screen, navigation, and final mutation-route authorization wiring. Agree on the API contract below before changing shared files.

## Data Model

Create one inventory record per physical strip batch. Recommended fields:

| Field | Rules |
| --- | --- |
| `brandId` | Required; stable ID matching the existing brand catalog |
| `brandName` | Required snapshot/display name |
| `manufacturer` | Required |
| `panels` | Required non-empty array containing `10-panel` and/or `14-panel` |
| `batchNumber` | Required and trimmed; unique case-insensitively within a brand |
| `manufactureDate` | Required `YYYY-MM-DD`; not in the future |
| `expiryDate` | Required `YYYY-MM-DD`; not before manufacture date |
| `quantity` | Required non-negative integer representing strips currently available |
| `createdAt`, `updatedAt` | Mongoose timestamps |

Use a unique compound index on normalized `brandId + batchNumber`; different manufacturers may reuse a batch number. Use the existing IST date helper/validation behavior. Expired batches remain stored for traceability but are not usable. Do not delete or rewrite historical `Test` batch snapshots.

## API Contract

Mount the router at `/api/inventory`.

- `GET /api/inventory`: authenticated users; return inventory records and enough brand-level availability data for the wizard. Support `panelType` and `availableOnly` filters.
- `GET /api/inventory/:id`: authenticated users.
- `POST /api/inventory`: Admin only; create a batch.
- `PATCH /api/inventory/:id`: Admin only; update allowed fields.
- `DELETE /api/inventory/:id`: Admin only; delete a batch after an explicit UI confirmation.

Use HTTP `409` for a duplicate brand/batch combination; `400` for invalid dates, panel values, or quantity; `404` for a missing item. Person 2 will enforce `protect` plus `restrictTo('Admin')` on mutations. Reads must remain available to Technician because the new-test wizard needs them.

## Test Submission and Stock Rules

1. The wizard sends a stable inventory identifier (recommended `inventoryId`) with the test request. Keep `stripBrand`, `stripBatch`, `manufactureDate`, and `expiryDate` in the `Test` document as immutable traceability snapshots.
2. The server, not the browser, reloads the inventory record and verifies:
   - quantity is greater than zero;
   - batch is not expired;
   - manufacture/expiry dates are valid;
   - requested panel is supported;
   - submitted batch/brand data has not been tampered with.
3. One successful test consumes exactly one strip.
4. Consumption must be atomic. Use a conditional update such as `findOneAndUpdate({ _id, quantity: { $gt: 0 } }, { $inc: { quantity: -1 } })` and fail with `409` if another request used the last strip.
5. Avoid losing stock if test creation fails. Prefer a MongoDB transaction for decrement + test creation; if transactions are unavailable in the development topology, implement and clearly document a safe compensating increment on failure.
6. Failed validation or failed test submission must consume zero strips.

## Wizard Behavior

Update `src/components/wizard/StepStripSelection.jsx`:

- Load live inventory instead of treating `STRIP_BRANDS` as stock truth.
- Continue filtering brands by selected panel.
- A brand is available when at least one compatible batch has `quantity > 0` and `expiryDate >= today`.
- Render an unavailable brand grey with an “Out of stock” label, `aria-disabled="true"`, no click handler, and disabled keyboard interaction.
- Never auto-select an unavailable brand. If a panel change invalidates the current choice, select the first available brand or clear the selection.
- After choosing a brand, require selection of a usable batch. Autofill batch number, manufacture date, and expiry date as read-only values from inventory.
- Disable Next when there is no usable brand/batch or inventory is still loading.
- Handle a last-strip race at submission by showing the server error and returning the user to refresh/reselect stock.

Keep static brand metadata only as a catalog if needed; it must not determine availability.

## Local/Mock Mode

The app switches between server and local storage through `src/services/mockApi.js`. Implement equivalent inventory listing, validation, CRUD contract, and decrement behavior in `src/services/localApi.js` so demo mode does not silently behave differently. Person 2 will add the Admin role check to local mutations.

## Acceptance Criteria

- Inventory records persist brand, batch number, manufacture date, expiry date, and quantity in MongoDB.
- Duplicate batch numbers within the same brand are rejected case-insensitively.
- A Technician can read inventory but cannot mutate it.
- Submitting a valid test reduces the selected batch quantity by exactly one.
- Two simultaneous submissions cannot reduce a one-strip batch below zero.
- Expired and zero-quantity batches cannot be selected or consumed.
- A brand with no usable compatible batches is visible but grey and unclickable.
- A brand becomes unavailable immediately after its final strip is consumed and inventory is refreshed.
- Test records retain their batch/brand/date snapshots even after inventory changes or deletion.
- Mongo/API mode and local demo mode follow the same functional rules.
- `npm run build` succeeds.

## Coordination Notes

- Use `batchNumber` in inventory and map it to the existing `stripBatch` test field.
- Person 2 depends on the final route names and item payload shape for the Admin inventory page.
- Person 3 should avoid editing inventory files. If both Person 1 and Person 3 touch `StepPatientDestination.jsx`, keep changes isolated to their respective sections.
