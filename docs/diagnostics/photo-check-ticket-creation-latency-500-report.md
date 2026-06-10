# ChargerDoc Photo Check and Ticket Creation Diagnosis

Date: 2026-06-10  
Scope: customer `/customer/new-ticket` Step 4, photo checking, ticket creation, Gemini/VLM usage, and `Request failed: 500` behavior.  
Status: diagnosis only. No runtime code was changed for this report.

## Executive Diagnosis

The visible `Request failed: 500` is not strong evidence that the Gemini API key failed.

The clearest confirmed 500 is in ticket creation after triage, not in the photo/VLM step. Earlier Cloud Run logs showed:

- `/api/v1/intake/preview` returned `200 OK`.
- `/api/v1/triage` returned `200 OK`.
- `/api/v1/tickets/from-triage` returned `500 Internal Server Error`.
- The backend traceback was a Postgres unique constraint failure:
  - `duplicate key value violates unique constraint "tickets_ticket_id_key"`
  - duplicate key: `ticket_id = RXT-20260609-0001`

That means Gemini/VLM was working for that request path because preview and triage completed before ticket creation failed.

The primary performance issue is separate: the current Check Photo flow can call Gemini multiple times before the user sees a diagnosis. The frontend first calls intake preview, and the backend preview path runs image quality assessment plus Theme 2 follow-up generation. Follow-up generation calls Theme 2 perception. Then the frontend calls the real triage endpoint, which runs Theme 2 perception again. In some cases perception can also run secondary Gemini checks.

## Current User Flow

### Step 4: Check Photo

Source: `frontend/app/customer/new-ticket/page.tsx`

Function: `runTriageOnly`, starting around line 155.

Current order:

1. Set UI state to `checking`.
2. Fetch sites through `fetchSites()`.
3. Compress and upload the main issue photo through `uploadIncidentPhoto(file)`.
4. Call `fetchPreview(...)`.
5. Call `fetchTriage(...)`.
6. Extract charger identity suggestion from the returned triage result.
7. Store uploaded evidence, triage result, identity suggestion, and detected charger identity values.
8. Set UI state to `ready`.

Relevant evidence:

- `frontend/app/customer/new-ticket/page.tsx:155` defines `runTriageOnly`.
- `frontend/app/customer/new-ticket/page.tsx:173` calls `fetchPreview`.
- `frontend/app/customer/new-ticket/page.tsx:182` calls `fetchTriage`.
- `frontend/lib/api.ts:511` compresses and uploads the photo in `uploadIncidentPhoto`.
- `frontend/lib/api.ts:481` sends preview to `/api/intake/preview`.
- `frontend/lib/api.ts:496` sends triage to `/api/triage`.

### Step 4: Create Support Ticket

Source: `frontend/app/customer/new-ticket/page.tsx`

Function: `createTicketAfterIdentityReview`, starting around line 208.

Current order:

1. Require an existing `triageResult`.
2. Set UI state to `creating`.
3. Call `createTicketFromTriage(...)`.
4. If an optional label photo exists:
   - upload the label photo,
   - attach it through `addTicketEvidence(...)`.
5. Save demo customer profile.
6. Redirect to `/customer/tickets/{ticket_id}`.

Relevant evidence:

- `frontend/app/customer/new-ticket/page.tsx:208` defines `createTicketAfterIdentityReview`.
- `frontend/app/customer/new-ticket/page.tsx:214` calls `createTicketFromTriage`.
- `frontend/app/customer/new-ticket/page.tsx:225` calls `addTicketEvidence` for the optional label photo.
- `frontend/app/api/tickets/from-triage/route.ts` proxies to `/api/v1/tickets/from-triage`.
- `backend/app/main.py` defines `POST /api/v1/tickets/from-triage`.
- `backend/app/services/tickets.py` maps triage output into ticket values.
- `backend/app/db/persistence.py` persists the ticket.

## Why Check Photo Is Slow

The Check Photo action currently does more than one vision pass.

### Pass 1: Intake Preview

Source: `backend/app/main.py` and `backend/app/services/intake.py`

`POST /api/v1/intake/preview` runs:

1. `assess_image_quality(...)`.
2. `build_follow_up_questions(...)`.
3. incident persistence.
4. audit persistence.

The issue is that both preview helper paths can touch Gemini/perception:

- `backend/app/services/intake.py:159` calls Gemini intake quality assessment when a Gemini client exists.
- `backend/app/services/intake.py:225` calls `assess_theme2_perception(incident)` to build follow-up questions.

So preview is not just a cheap incident initialization endpoint. It can run image analysis before triage.

### Pass 2: Triage

Source: `backend/app/main.py` and `backend/app/services/theme2_triage.py`

`POST /api/v1/triage` runs:

1. incident persistence/update.
2. `run_theme2_triage_with_debug(...)`.
3. perception audit persistence.
4. mapping audit persistence.
5. full triage audit persistence.

`run_theme2_triage_with_debug(...)` calls `assess_theme2_perception(incident)` again.

### Extra Perception Work

Source: `backend/app/services/theme2_perception.py`

The main Gemini path is configured with:

- `_GEMINI_PARSE_ATTEMPTS = 3`.
- large JSON output budget.
- retry loops that can sleep between failed parse attempts.

Relevant evidence:

- `backend/app/services/theme2_perception.py:13` sets `_GEMINI_PARSE_ATTEMPTS = 3`.
- `backend/app/services/theme2_perception.py:1174` defines the main perception call.
- `backend/app/services/theme2_perception.py:1390` defines EVDB trip secondary merge.
- `backend/app/services/theme2_perception.py:1481` defines isolator secondary merge.
- `backend/app/services/theme2_perception.py:1571` defines app screenshot merge.

This improves robustness, but it also means some photos can trigger more than one Gemini call.

### Current Timing Evidence

There is no frontend stage timing or backend per-substep timing yet, so exact performance cannot be claimed.

Observed Cloud Run request timestamps from earlier debugging showed approximate backend durations of:

- intake preview: about 12 to 13 seconds.
- triage: about 8 seconds.

Those are log-derived estimates, not instrumented averages. They are enough to explain why a user may experience a 20 to 40 second Check Photo action after adding upload/compression/network time.

## Why `Request failed: 500` Appears

Source: `frontend/lib/api.ts`

The frontend generic fetch helpers discard backend error details:

- `frontend/lib/api.ts:372` throws `Request failed: ${response.status}` for POST.
- `frontend/lib/api.ts:382` throws the same pattern for PATCH.
- `frontend/lib/api.ts:388` throws the same pattern for GET.

The Next.js proxy preserves backend response JSON, but the frontend helper does not read it when `response.ok` is false.

Result:

- The browser shows `Request failed: 500`.
- The actual backend cause is hidden from the customer and from quick browser inspection.
- For the known ticket creation case, the real cause was a duplicate ticket ID, not Gemini.

## Confirmed Ticket Creation Bug

Source: `backend/app/db/persistence.py`

The ticket ID generator is currently unsafe:

```python
def _next_ticket_id(cur: Any) -> str:
    from app.services.tickets import generate_ticket_id

    prefix = generate_ticket_id(sequence=0)[:13]
    cur.execute("SELECT COUNT(*) AS count FROM tickets WHERE ticket_id LIKE %s", (f"{prefix}-%",))
    row = cur.fetchone()
    sequence = int(row["count"]) + 1
    return generate_ticket_id(sequence=sequence)
```

Problem:

- `generate_ticket_id(sequence=0)` returns a value shaped like `RXT-YYYYMMDD-0000`.
- `[:13]` produces `RXT-YYYYMMDD-`, including the trailing hyphen.
- The query then uses `f"{prefix}-%"`, producing `RXT-YYYYMMDD--%` with a double hyphen.
- That pattern does not match existing tickets like `RXT-YYYYMMDD-0001`.
- The count returns zero.
- The next ticket ID becomes `RXT-YYYYMMDD-0001` again.
- Postgres rejects the duplicate because `tickets.ticket_id` is unique.

Relevant evidence:

- `backend/app/db/persistence.py:393` defines `_next_ticket_id`.
- `backend/app/db/persistence.py:396` creates the prefix.
- `backend/app/db/persistence.py:397` queries with the broken `LIKE` pattern.
- `backend/app/db/persistence.py:403` starts `create_ticket_record`.
- `backend/app/db/persistence.py:409` inserts into `tickets`.

This is the most likely reason users can complete photo checking but fail at `Create Support Ticket`.

## Is Preview Necessary?

Currently, yes, but only because of the present API flow.

In the current frontend, preview is used mainly to obtain `preview.incident_id`, which is then passed to triage. The preview response itself is not otherwise used in Step 4 UI.

In the backend, triage can persist an incident too, because `POST /api/v1/triage` calls `_persist_incident(incident)`. If `incident_id` is absent, it creates a new incident.

Therefore, for the customer Step 4 flow, preview is not fundamentally required for the final diagnosis. It currently adds:

- incident ID allocation before triage,
- image quality audit,
- follow-up question generation.

But because the customer Step 4 immediately runs full triage after preview, the preview vision work is mostly duplicated. A safer future design would either:

- skip preview for customer Step 4 and let triage create the incident, or
- change preview into a lightweight incident creation/quality-only endpoint that does not call Theme 2 perception.

This should be treated as a performance refactor, not a bug fix, because other legacy routes may still depend on preview semantics.

## Stuck State Diagnosis

The UI has basic duplicate-click guards, but it does not have request timeouts or detailed stages.

Current state model:

- `idle`
- `checking`
- `ready`
- `creating`
- `error`

Failure behavior:

- If a request returns an error, state becomes `error`.
- If a request hangs, state stays `checking` or `creating`.
- The user sees only a broad loading label such as `Checking photo...` or `Creating ticket...`.

This is why slow backend or network behavior can feel like a stuck page even if the backend eventually returns.

Recommended improvement:

- Add request-level timeout with `AbortController`.
- Add stage labels:
  - compressing image,
  - uploading image,
  - checking photo,
  - creating ticket,
  - attaching optional label photo,
  - redirecting.
- Always surface backend `detail` if present.

## API Key Assessment

For the known failure sequence, the API key was likely working.

Reason:

- Gemini-backed preview and triage completed with `200 OK`.
- The observed 500 happened later at ticket creation.
- Ticket creation does not call Gemini.

What would suggest API key failure instead:

- backend logs showing `gemini_client_unavailable`,
- `GEMINI_API_KEY missing or empty`,
- Gemini SDK import failure,
- triage returning fallback with `perception.fallback_used = true`,
- preview/triage failing before ticket creation.

The current frontend error message is too generic to distinguish these from the browser alone.

## Prioritized Patch Plan

### P0: Fix the Confirmed 500

Fix `_next_ticket_id` in `backend/app/db/persistence.py`.

Safer approach:

- Build prefix as `RXT-YYYYMMDD-`.
- Query matching IDs with `LIKE '{prefix}%'`, not `'{prefix}-%'` when prefix already ends in hyphen.
- Prefer parsing `MAX(ticket_id)` for the current date instead of `COUNT(*)`.
- Add a short retry on unique constraint violation to handle concurrent ticket creation.

Expected result:

- `Create Support Ticket` no longer fails after the first same-day ticket.

### P0: Show Real Backend Errors

Update `frontend/lib/api.ts` helpers to read response body on non-OK status.

Recommended behavior:

- If JSON body has `detail`, show it.
- If JSON body has `message`, show it.
- Otherwise show status and short raw body.
- Keep generic fallback for empty responses.

Expected result:

- Users and developers see `duplicate ticket_id...` or backend-specific detail instead of only `Request failed: 500`.

### P0: Add Timeout Protection

Add fetch timeout support in frontend API helpers.

Recommended defaults:

- upload: 45 to 60 seconds.
- preview/triage: 90 to 120 seconds.
- ticket creation: 30 seconds.

Expected result:

- UI exits loading state with a clear retryable error instead of waiting forever.

### P1: Add Timing Instrumentation

Add frontend and backend timing logs before claiming performance improvements.

Frontend:

- time compression,
- upload,
- preview,
- triage,
- ticket creation,
- optional label upload,
- label evidence attach.

Backend:

- `/api/v1/intake/preview`: quality assessment, follow-up generation, persistence.
- `/api/v1/triage`: perception, mapping, audit persistence.
- `/api/v1/tickets/from-triage`: ID generation, insert, child event creation.

Expected result:

- Future slowdowns can be attributed to a specific stage.

### P1: Remove Duplicate Vision Work From Customer Step 4

Recommended low-risk direction:

- For `/customer/new-ticket`, skip `fetchPreview` and call `fetchTriage` directly.
- Let triage create the incident when `incident_id` is absent.
- Keep legacy `/upload` and `/questions` flows unchanged.

Alternative:

- Keep preview call but make it lightweight for this workflow.
- Do not call `build_follow_up_questions` from preview when full triage is about to run.

Expected result:

- One fewer perception pass in the common customer flow.

### P1: Make Gemini Work Conditional

Review secondary checks so they only run when clearly needed:

- app screenshot check only when app screenshot evidence exists,
- EVDB trip secondary only when EVDB evidence is visible and the primary result is uncertain or phase-only,
- isolator secondary only when isolator state is relevant and not contradicted by powered charger evidence.

Expected result:

- Lower latency without removing the reliability guardrails.

## Recommended Tests

Backend:

- Ticket creation after existing same-day ticket should generate `RXT-YYYYMMDD-0002`, not duplicate `0001`.
- Multiple same-day tickets should not violate `tickets_ticket_id_key`.
- Ticket creation should not call Gemini.
- Triage without preview should create or update an incident correctly if that flow is adopted.

Frontend:

- Non-OK API responses display backend `detail`.
- Check Photo exits loading state on timeout.
- Create Support Ticket exits loading state on timeout.
- Optional label photo failure does not block an already-created ticket.
- Step 4 still requires Check Photo before Create Support Ticket.

Manual smoke:

- Create first ticket of the day.
- Create second ticket of the day.
- Create ticket with optional label photo.
- Create ticket without optional label photo.
- Temporarily unset Gemini key in a test environment and confirm fallback messaging is explicit.

## Bottom Line

The app is doing too much work during Check Photo, and the frontend hides the real backend error when ticket creation fails.

The biggest confirmed functional bug is not the API key. It is duplicate ticket ID generation in `backend/app/db/persistence.py`. The biggest confirmed UX/performance problem is duplicate vision analysis in preview plus triage, with no stage timing or timeout handling.

