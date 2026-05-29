# HAQMS — Engineering Assignment Submission

Audit and remediation of the deliberately-imperfect **Hospital Appointment & Queue Management System** (Next.js + Express + Prisma/PostgreSQL).

- **Stack:** Next.js (App Router) · Node.js/Express · PostgreSQL + Prisma ORM
- **Result:** 52 issues identified across 6 categories; all fixed and verified locally.
- **Full per-issue detail (with reproduction steps and applied fixes):** see `ISSUES_REPORT.html`.

---

## 1. Approach & reasoning (how the work was done)

1. **Read everything first.** Went through every backend route, the Prisma schema, the seed, and all frontend pages before touching code — to confirm the annotated bugs and, more importantly, find the *non-annotated* ones.
2. **Audited systematically by category** (security, performance/concurrency, database, frontend, API design, incomplete features) and ran a completeness pass to catch issues the in-code comments never mentioned (e.g. a missing `Link` import, a Rules-of-Hooks violation, a delete that 500s on patients with history).
3. **Prioritised by blast radius:** stop active security compromise → protect data integrity → fix crashes/broken flows → performance → hardening & consistency.
4. **Fixed at the right layer.** Preferred database-enforced guarantees (unique constraints, transactions) over fragile in-code checks, and centralised cross-cutting concerns (config, validation, error handling, API response shape) instead of patching each route.
5. **Verified, not assumed.** Ran the migration + seed against PostgreSQL and tested the critical fixes live (see §5).

**Key decisions:**
- **Database enforces invariants.** Double-booking and duplicate queue tokens are blocked by `@@unique` constraints, not just JS checks — the only way to be correct under concurrency.
- **One shared `PrismaClient`** instead of one per route file, to avoid connection-pool exhaustion.
- **One API response envelope** (`{ status, data, message?, pagination? }`) so the frontend stops branching on per-endpoint shapes.
- **Secrets are required, never defaulted.** The server refuses to boot without `JWT_SECRET`.
- **No comments added** to the code (per request); the code is self-documenting and this file carries the narrative.

---

## 2. Issues identified

52 issues total. Highlights by category:

**Security (15)** — hardcoded JWT secret with public fallback; expiry ignored + 365-day tokens; plaintext passwords logged; bypassed admin authorization; SQL injection in doctor search; password hash returned in responses; stack/DB-error leakage; privilege escalation via client-supplied `role` on register; permissive CORS; no rate limiting; weak/absent input validation; secret committed in `.env.example`.

**Backend performance & concurrency (5)** — N+1 queries in appointments; sequential awaits in doctor stats; nested-loop report with artificial sleeps; **race condition** producing duplicate queue tokens; new `PrismaClient` per route.

**Database & schema (10)** — missing unique constraints (double-booking, duplicate tokens); missing indexes (FKs, status, doctor filters); in-memory pagination loading the whole table; useless exact-millisecond duplicate check; patient delete failing for patients with related rows (no cascade).

**Frontend / React (14)** — `setInterval` memory leak on the queue board; missing `Link` import (crash); null `medicalHistory` crash; hooks called after an early return; check-in always assigned to the first doctor; crash when no doctor maps to the user; queue crash on null relations / non-array responses; per-keystroke refetch; uncontrolled walk-in form; missing array guards; no error boundaries; weak login validation; stale list with no error UI; unsafe default-tab fallthrough.

**API design & consistency (5)** — inconsistent response shapes; stack-trace leak in the global handler; no security headers; inconsistent HTTP status codes; no centralised validation.

**Incomplete features (3)** — missing `/patients/[id]/history-records` page (Challenge 5); no `/register` UI; no patient detail page.

---

## 3. Fixes implemented

**Security**
- `JWT_SECRET` is required at startup (no fallback); tokens now expire (15m) instead of the previous 365 days / no-expiry.
- Removed all credential/body logging.
- Restored real admin authorization (`authorize('ADMIN')`); patient delete now returns 403 for non-admins.
- Replaced `$queryRawUnsafe` string-building with Prisma's parameterised query builder — SQL injection closed.
- Responses expose only a whitelisted user object (no password hash); a central error handler returns generic messages, logging detail server-side only.
- `role` is no longer accepted from the client on register (forced to `RECEPTIONIST`).
- CORS locked to the frontend origin; `helmet` enabled; `express-rate-limit` on auth + global; `zod` validation on all inputs; placeholder-only `.env.example` + `.gitignore`.

**Performance & concurrency**
- Appointments use a single `include` query (N+1 → 1); doctor stats run via `Promise.all`; the report uses `groupBy` aggregations (sleeps removed).
- Queue check-in computes the token number inside a `$transaction`, backed by a unique constraint with bounded retry — no duplicate tokens under concurrency.
- A single shared `PrismaClient`.

**Database**
- Added `@@unique([doctorId, appointmentDate])` and `@@unique([doctorId, queueDate, tokenNumber])`; added indexes on FKs, status, and doctor filter columns; added a `queueDate` column.
- Real SQL pagination (`where` + `skip`/`take` + parallel `count`).
- `onDelete: Cascade` on relations + transactional delete.

**Frontend**
- Interval cleanup via `useEffect` return + `isMounted` ref; all hooks hoisted above the guard.
- Optional chaining + fallbacks for null data; added `Link` import; route error boundaries (`error.js` + shared fallback).
- Debounced search (350ms); explicit physician selector for check-in; controlled walk-in inputs; `Array.isArray` guards; safer login validation and role-based default tab.
- Centralised config (`NEXT_PUBLIC_API_BASE_URL`) and a single `apiFetch` client that unwraps the response envelope.
- Built the three missing pages: `/patients/[id]/history-records`, `/patients/[id]`, `/register`.

---

## 4. Optimizations performed

- **N+1 elimination:** appointments list went from `1 + 2N` queries to **1**.
- **Aggregation report:** nested per-doctor loops + artificial delays → a few `groupBy` queries; measured **~60ms** response.
- **Parallelism:** independent stat queries run concurrently with `Promise.all`.
- **SQL pagination:** the patients list returns only the requested page instead of loading the whole table into memory.
- **Indexes** on the hot filter/lookup columns to avoid full table scans at scale.
- **Single connection pool** via the shared Prisma client.
- **Frontend:** debounced search (fewer requests), memoised grouping, and a polling timer that is properly torn down.

---

## 5. Verification

Run against the Dockerised PostgreSQL (`docker compose up -d` → `prisma migrate dev` → `node prisma/seed.js`):

- Login returns the standard envelope with a short-lived token. ✔
- `register` with `role: "ADMIN"` creates a **RECEPTIONIST**. ✔
- SQL-injection payload in doctor search returns an empty, safe result. ✔
- No `password` field in any user response. ✔
- **8 concurrent check-ins → zero duplicate token numbers.** ✔
- Receptionist `DELETE /patients/:id` → **403**. ✔
- Appointments response carries embedded patient & doctor objects (N+1 gone). ✔
- Invalid email / weak password → **400** with field details. ✔
- `npm run build` (frontend) passes with all routes, including the three new pages. ✔

---

## 6. Remaining known issues / next steps

- **Token storage:** JWT is still kept in `localStorage` (workable for an SPA, but XSS-readable). The recommended next step is HttpOnly + Secure + SameSite cookies; CORS lockdown and `helmet` already reduce the surface.
- **Token refresh:** tokens are short-lived (15m) with no refresh flow, so users re-login when a token expires. A `/auth/refresh` rotation endpoint could be added if longer sessions are needed.
- **Patient edit/admin management UI:** the patient detail page is read-only; edit/update is not built.
- **Automated tests:** fixes were verified manually/with live calls; no unit/integration test suite was added.
- **Observability/HTTPS:** structured logging, request IDs, and TLS termination are deployment-time concerns not configured here.
- **React 19 lint:** a few `set-state-in-effect` advisories remain on standard data-fetching effects; they are idiomatic and do not affect the passing build.

---

## 7. Run locally

**Prerequisites:** Node.js 18+, Docker (for PostgreSQL).

```bash
# 1. Install dependencies
npm install --prefix backend
npm install --prefix frontend

# 2. Start PostgreSQL (port 5432)
docker compose up -d

# 3. Configure backend env
cp backend/.env.example backend/.env
#   then set a real secret in backend/.env, e.g.:
#   JWT_SECRET=$(openssl rand -base64 48)

# 4. Apply schema + seed demo data
npx prisma migrate dev --prefix backend   # or: cd backend && npx prisma migrate dev
node backend/prisma/seed.js

# 5. (Frontend) point at the API
cp frontend/.env.local.example frontend/.env.local

# 6. Run both servers
npm run dev          # backend :5000  +  frontend :3000  (from repo root)
```

Open **http://localhost:3000**. Seeded logins (password `password123`):

| Role | Email |
|---|---|
| Admin | `admin@haqms.com` |
| Receptionist | `reception1@haqms.com` |
| Doctor | `doctor1@haqms.com` |
