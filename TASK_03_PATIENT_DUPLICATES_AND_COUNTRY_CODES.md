# Person 3 — Exact Patient Duplicate Check and Phone Country Code Dropdown

**Assigned to: Surbhi**

## Goal

Reject a new patient only when all patient details match an existing patient after normalization. A shared name alone must be allowed, and a different name with the same email and phone must also be allowed. Add a country-code dropdown to patient registration and store a normalized international phone number.

## Ownership

This person owns:

- Duplicate detection in `server/controllers/patientController.js`
- Patient normalization/schema support in `server/models/Patient.js` and a focused utility if useful
- Patient-create errors in `src/components/wizard/StepPatientDestination.jsx`
- Country-code data/component(s) used by the patient form
- Equivalent duplicate and phone behavior in `src/services/localApi.js`
- Patient-related API methods only if an interface change is required

Avoid unrelated edits to inventory, Admin routing, and authentication files.

## Exact Duplicate Rule

Compare these user-entered patient fields, excluding generated/system fields such as `_id`, `id`, `patientId`, and `registeredAt`:

- `name`
- `age`
- `gender`
- `phone`
- `email`
- `bloodGroup`
- `address`

A create request is a duplicate only when **every field above** matches one existing patient after normalization. There must be no unique index on `name`, `email`, or `phone` individually.

Required examples:

| Existing vs new data | Expected result |
| --- | --- |
| All seven fields match | Reject with `409` |
| Same name, any other field differs | Allow |
| Different name, same email and phone, other fields otherwise same | Allow |
| Same name/email/phone, but age differs | Allow |

## Normalization Contract

Use one shared normalization strategy before comparison:

- trim all strings;
- compare `name`, `email`, and `address` case-insensitively;
- lowercase email;
- collapse repeated internal whitespace in name/address;
- convert age to a number;
- normalize phone to E.164-style `+<country code><national digits>` with spaces, hyphens, and parentheses removed;
- treat missing optional values consistently as empty strings.

The stored values may keep user-friendly casing for name/address, but the duplicate query must use normalized values reliably. Prefer explicit normalized fields (for example a `duplicateFingerprint`) with an index over fragile case-insensitive multi-field queries. If using a fingerprint, compute it on every create/update path and handle race-condition duplicate-key errors as HTTP `409`.

Return a clear error such as `A patient with all the same details already exists.` Do not consume a patient ID/counter for a rejected duplicate: perform the duplicate check before `nextCode('PAT')`.

## Country Code Dropdown

Update the Add New Patient modal in `src/components/wizard/StepPatientDestination.jsx`:

- Render email and address controls; they already exist in component state but are currently missing from the modal, and both participate in the all-details duplicate comparison.
- Split phone entry into a searchable/select dropdown for country calling code and a national-number input.
- Default to India (`IN`, `+91`) because the app and sample data are India-based.
- Each option should show country name/ISO code and dial code; dial codes are not unique, so store the selected country ISO separately in component state.
- On submit, combine the selected dial code and national digits into the normalized phone value sent to the API.
- Accept common pasted formatting, remove formatting characters, and prevent letters.
- Show an inline validation message for an invalid or empty required phone number. Do not silently replace missing age with `30`; honor the existing required field.
- Keep the form usable by keyboard and give the select/input accessible labels.

Use a local, reviewed country-code dataset or a suitable existing dependency; do not fetch country codes from the network at runtime. If `countryCode`/`phoneCountry` is added to the Patient schema, keep `phone` as the complete normalized number so current search and display code continues to work.

## UI Error Handling

- Wrap patient creation in `try/catch`.
- On `409`, keep the modal open, preserve all entered data, and display the duplicate message inline and/or through the existing toast system.
- Disable the submit button while saving to prevent accidental double submission.
- On success, prepend and select the new patient exactly as the current flow does.
- Other API errors must also be visible to the user; do not only log them.

## Local/Mock Mode

Implement the same normalization, exact-all-fields check, `409`-equivalent error, and stored phone format in `src/services/localApi.js`. The UI must behave consistently whether `VITE_USE_MOCK` is true or false.

## Acceptance Criteria

- Creating a patient whose seven compared fields all match an existing record returns `409` and creates no patient.
- Same name with at least one different detail is accepted.
- Different name with the same phone and email is accepted.
- Case/spacing/phone-format variations of an otherwise exact duplicate are rejected.
- A rejected duplicate does not advance the patient-code counter.
- Concurrent identical create requests cannot create two exact duplicates.
- The modal defaults to `+91`, lets the user choose another country code, and stores a normalized complete phone number.
- Duplicate/API errors remain visible while the modal stays open with its values intact.
- Patient search by phone still works with normalized stored numbers.
- Mongo/API mode and local demo mode implement the same behavior.
- Existing patient selection and successful registration behavior are preserved.
- `npm run build` succeeds.

## Suggested Verification Matrix

Test the exact same payload twice; then repeat with only name, age, email, phone, and address changed one at a time. Also test differently formatted equivalents such as `+91 98200 12345`, `+91-98200-12345`, and `(+91) 9820012345` to confirm that only a complete normalized match is rejected.
