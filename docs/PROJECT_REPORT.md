# MahaKaushalya — Complete Professional Project Report

> **Project:** MahaKaushalya — Post-Training Outcome Tracking System
> **Owner / Context:** Government of Maharashtra — Skill, Employment, Entrepreneurship & Innovation Department (SDED) / Maharashtra State Skill Development Society (MSSDS)
> **Report basis:** Full inspection of the merged backend (`server/`), database schema (`schema.sql`), Trainee Portal frontend, Government/Admin Portal frontend, shared modules, tests, and configuration. Every statement below is grounded in the inspected code; anything not verifiable is explicitly marked **"Not verified in the current implementation."**

---

## 1. Executive Summary

- **App name:** MahaKaushalya ("MahaKaushal" Admin Portal / "MahaKaushalya" Trainee Portal)
- **One-line description:** A web system where skilled-training graduates report what they did after training (job, own business, higher studies, or still searching), and government officers verify and analyze those reports.
- **Main problem it solves:** After a government-funded training program ends, the department currently has no reliable, structured way to know whether trainees actually got jobs or continued studying — the single number that decides whether public training money worked.
- **Why the problem matters:** Skilling budgets, provider payments, and future program design all depend on verified post-training placement data. Without it, funding decisions rely on unverifiable paper claims.
- **Main solution provided:** Two linked portals on one backend — a **Trainee Portal** where graduates register, submit placement outcomes, respond to follow-ups, and manage their profile; and a **Government/Admin Portal** where officers browse all records, verify submitted outcomes, track non-responders, and analyze placement analytics by trade, center, and partner.
- **Key features (actually implemented):**
  - Trainee registration with auto-generated Permanent Registration Number (PRN, format `MK-YYYY-MH-NNNNN`)
  - Email + password login for both portals, JWT-based sessions
  - Trainee dashboard (profile + latest outcome + pending follow-ups)
  - Profile editing (name, email, phone, DOB, gender, address, district, photo URL)
  - Outcome submission in 4 categories: `employed`, `self_employed`, `higher_studies`, `unemployed`
  - Outcome history for each trainee
  - Follow-up question lifecycle (pending → responded) over SMS/WhatsApp channels
  - Admin dashboard, overview KPIs, filterable trainee/outcome listings
  - Outcome verification workflow (verify/reject with remarks, one-time decision)
  - Analytics: placement rate by trade / training center / partner, salary distribution (min/max/avg/median), status distribution
  - Non-responder queue (pending follow-ups joined with trainee info)
  - Role-based access: trainee tokens cannot touch admin routes and vice versa (enforced in middleware, not just UI)
  - Rate limiting on auth routes; CORS restricted to configured frontend origins
- **Overall workflow:** Trainee registers → logs in → submits outcome → admin lists/verifies it → analytics update → follow-ups track retention.

---

## 2. Problem Statement

**What problem currently exists.** Government skilling programs train thousands of candidates, but once training completes, the department loses structured contact with them. Whether a trainee got placed, started a business, joined higher studies, or is still unemployed is known today only through scattered, unverifiable channels.

**Who faces the problem.**
- **The government department (SDED/MSSDS):** cannot measure true placement rates, cannot compare training providers, and cannot justify or target budgets.
- **Trainees:** have no portal where their post-training progress is recorded and acknowledged; follow-ups happen (or don't) through disconnected channels.
- **District Skill Officers / analysts:** have no single dashboard to audit claimed placements or spot non-responding graduates.

**Why existing processes are insufficient.** Paper/manual or informal tracking is unverifiable, unsearchable, not role-controlled, and produces no aggregate analytics. There is no common trainee identity (like the PRN) or a one-time verification workflow that keeps an audit trail (who verified what, when).

**Difficulties users currently experience.** Trainees cannot see their own submitted status or pending follow-ups in one place; officers cannot filter trainees by district/trade/center or immediately see which outcomes are still pending verification and which trainees never responded to follow-ups.

**How this application addresses those difficulties.** One merged backend issues a PRN to every trainee at registration, stores outcomes with a mandatory verification status, exposes officer-only filtered listings/analytics, and tracks follow-up prompts and responses — with role checks so trainee and government data are isolated from each other.

---

## 3. Target Audience

The application has **three real user types** (per the code), plus two groups the codebase *represents in UI screens* but for which **no backend support exists** (clearly flagged).

### 3.1 Trainees (registered users) — implemented
- **Who they are:** Graduates of a Maharashtra skilling program (e.g., a trade at a Govt ITI center).
- **Purpose:** Register once, report what they did after training, respond to follow-ups, keep profile current.
- **Information they provide at registration:** fullName, email, phone (10-digit Indian mobile), password (min 6 chars); optional: dob, gender, address, district, batchName/batchId, trade, courseName, trainingCenter, trainingPartner, completionMonth/Year.
- **What they can see:** Their own dashboard — profile, PRN, course, latest outcome status/employer/wage, outcome count, pending follow-up questions; their full outcome history.
- **Actions they can perform:** register, login, view dashboard, update profile, submit outcome, view outcome history, respond to a follow-up.
- **Benefits:** A single official record of their post-training status, a permanent registration number (PRN), and visibility of pending follow-ups.

### 3.2 Government / Admin users — implemented
- **Who they are:** District Skill Officers, divisional commissioners, analysts — accounts with role `admin` or `government` (schema also defines `officer`, `analyst`).
- **Purpose:** Monitor the skilling program through verified outcome data.
- **Information they provide:** Just credentials (email + password) for login. No public admin self-registration: in development there is a dev-only seed endpoint (`POST /api/admin/dev/seed-admin`), and Supabase deployments would create officers directly in the DB — **a production officer-provisioning flow is not implemented**.
- **What they can see:** Dashboard KPIs (total trainees/outcomes, outcomes by status, pending/verified/rejected verification counts, placement rate, follow-up counts), the filterable trainee register, all outcomes, analytics by trade/center/partner, salary distribution, follow-up list, non-responder queue.
- **Actions they can perform:** login, view dashboard/overview, list & filter trainees, list & filter outcomes, **verify or reject an outcome (one-time)**, view analytics, view follow-ups, view non-responder queue.
- **Benefits:** One verified source of truth, per-trade/center/partner performance comparisons, and a non-responder worklist.

### 3.3 Public / general visitors — partially implemented
- **What exists:** A public launcher page at the project root of both portals (`Trainee Dashboard Frontend/index.html`, `Governnent Dashboard Frontend/index.html` in its nav) plus a footer reference to a "State Skill Mission Portal" (`href="#"` placeholder).
- **What does NOT exist:** No public landing page content beyond the launcher, no public statistics, no public API.
- **Verdict:** Public-facing features beyond navigation are **not implemented**.

### 3.4 Employers — NOT implemented (UI screens only)
- **What exists:** A complete-looking **Employer Validation portal UI** (`employer_validation.html` + `js/validation.js`) with token-based candidate confirmation, approve/flag actions.
- **What does NOT exist:** The frontend calls `GET /api/public/employers/verify-token` and `POST /api/public/employers/validate` — **neither route exists in the merged backend** (the code itself comments "no backend route yet (known gap)"). Employer accounts, tokens, and this validation workflow have **no server-side implementation**.
- **Verdict:** UI mockup only. Employers are **not** functional users today.

### 3.5 Training providers — NOT implemented (UI screens only)
- **What exists:** A **Provider Performance ranking UI** (`provider_performance.html` + `js/provider.js`) with grades, stars, retention, wage-growth columns.
- **What does NOT exist:** There is no provider login, no provider-facing API, and the ranking page's richer columns (retention, wage growth, head name, grades like "Show-Cause") come from a **hardcoded static dataset** in `provider.js`; live data from `/api/admin/analytics` only fills name/count/placement% for real centers. Provider grades/statuses are derived client-side from placement percentage, not a real provider-management module.
- **Verdict:** Not a user type with its own access. Officers *view* provider comparisons; providers themselves cannot use the app.

### Roles in the schema vs roles enforced by the API
Schema enum: `trainee | officer | admin | analyst`. API enforces: `trainee` on `/api/trainee/*` (protected part), and `admin | government` on `/api/admin/*` (protected part). **`officer` and `analyst` exist in the schema/DB vocabulary but are NOT accepted by the admin routes middleware** (only `admin`/`government`), and the frontend `adminLogin` helper additionally accepts `officer`/`analyst` roles client-side — a mismatch worth flagging: an officer/analyst account would be blocked by the backend middleware even though the schema defines them.

---

## 4. Complete Feature List

Categories with no real features (AI, employer tools, notifications) are marked as such rather than padded.

### 4.1 Core features (implemented, backend-verified)
| Feature | What it does | Who | Input | Output | Why useful |
|---|---|---|---|---|---|
| Unified auth (JWT) | Issues a signed token on register/login for both portals | All logged-in users | email + password | `{ token, user:{id,email,role} }` | One session mechanism across portals |
| Role-restricted route access | `authorize('trainee')` / `authorize('admin','government')` middleware blocks wrong-role tokens with **403** | enforced server-side | JWT | 403 on role mismatch | Trainee/admin data isolation |
| PRN generation | Every trainee gets `MK-YYYY-MH-NNNNN` at registration | Trainee | — | Unique PRN | Single official identity across reports |
| Health check | `GET /health` returns provider/env status | public | — | JSON status | Ops monitoring / load balancers |
| Consistent API envelope | All responses `{ success, data, message }` via ApiResponse/ApiError utilities | — | — | uniform JSON | Predictable frontend handling |
| Centralized error handling | 404 + error middleware returns structured errors | — | — | JSON errors, no stack leaks | Robustness |
| Dev seeding endpoints | `POST /api/trainee/dev/followups/seed`, `POST /api/admin/dev/seed-admin` (auto-disabled in production) | dev only | role-specific payloads | seeded records | E2E testing without SMS gateway/DB access |
| E2E test suite | `server/test-flow.js`, 28 checks over real HTTP | developers | — | pass/fail per check | Verified working flows |

### 4.2 Trainee features (implemented)
| Feature | What it does | Input | Output |
|---|---|---|---|
| Registration | Creates user (role=trainee) + trainee profile, returns token + PRN | fullName, email, phone, password (+ optional profile/training fields) | 201, token, PRN; 409 on duplicate email/phone |
| Login | Email+password → token | email, password | token + user (role check: non-trainee tokens rejected in UI) |
| Dashboard | Aggregated view of profile, latest outcome, outcome count, pending follow-ups | JWT | trainee object, latestOutcome, pendingFollowups |
| Profile update | Edit name/email/phone/dob/gender/address/district/photo URL | JWT + fields | updated profile (validated email/phone) |
| Outcome submission | Records placement status | status ∈ {employed, self_employer_note, higher_studies, unemployed} + employer/salary/joining date/work location/proof URL/remarks | 201 outcome, status `pending` verification |
| Outcome history | Lists own submissions newest-first | JWT | history array + count |
| Follow-up response | Answers a pending prompt | followupId + response | 200, status becomes `responded`; 409 on repeat response; 403 if prompt belongs to another trainee |

Notes:
- The outcome form UI offers an "apprenticeship/higher-education" branch (`panel-apprenticeship`); the JS maps that branch to `status: 'higher_studies'`, `outcomeType: 'higher_education'` (see `Trainee Dashboard Frontend/js/outcomes.js` statusMap/typeMap). So from the API's perspective there are exactly **4 outcome statuses**; "apprenticeship" is a UI label for the higher-studies path.
- `proofDocumentUrl` is accepted and stored; **there is no file-upload feature** — the trainee must paste a URL. (In the UI, the proof field is labeled "Government-verified EPFO / UAN trail" etc.; the backend stores the URL string only, no document storage service is present.)

### 4.3 Government/Admin features (implemented)
| Feature | What it does | Input | Output |
|---|---|---|---|
| Admin login | Email+password → token (role admin/government) | credentials | token |
| Dashboard | Totals, outcomes by status, verification counts, placement rate, follow-up counts | JWT | KPI payload |
| Overview | KPIs shaped for the admin overview page (totalEnrolled, certifiedTrainees, reportedPlacements, avgWage, placementDistribution) | JWT | KPI payload |
| Trainee register | Filterable list: trade, trainingCenter, batchName, district, search (name/PRN), status | JWT + query params | trainees + count |
| Outcome listing | Filter by status, verificationStatus, traineeId | JWT + query | outcomes + count |
| **Outcome verification** | Verify or reject a *pending* outcome, records verifier + timestamp | outcomeId + verificationStatus('verified'/'rejected') + remarks | updated outcome; 409 if already decided; invalid status → 400 |
| Analytics | Placement rate by **trade / training center / partner**; salary distribution (min/max/avg/median); status distribution | JWT | analytics payload |
| Follow-up listing | All follow-ups, filter by status/traineeId/channel | JWT + query | followups + count |
| Non-responder queue | Pending follow-ups joined with trainee profile; days-overdue, channel, "6-Month Retention" stage | JWT | queue array |

### 4.4 Analytics features (implemented)
- Placement rate aggregated by trade, by training center, and by training partner (count-based: placed = employed + self_employed outcomes ÷ total outcomes in that group).
- Salary distribution: count, min, max, average, median (employed/self_employed only, `monthlySalary` present).
- Outcome status distribution across the 4 statuses.
- Overview "placementDistribution" renders status categories as distribution rows (backend sends `month` = status label, `percent`, `statsText`).

### 4.5 Analytics features NOT implemented (UI pages exist, backend does not)
- **Skill Gap Analysis page** (`skill_gap_analysis.html`): renders a supply-vs-demand sector matrix with Critical/High Deficit badges **only from a static benchmark matrix**. The code calls `/api/admin/analytics` and only renders if the response contains `data.sectors` — which the backend never returns. The JS itself notes "dedicated skill-gap endpoint is a known gap".
- **Retention rate** — `getOverview` returns `retentionRate: null`; the UI shows "—" / static content. **Not implemented.**
- **3/6/12-month retention tracking** — follow-ups carry a generic question; the non-responder queue hardcodes `stage: '6-Month Retention'`. No scheduled job or retention windows exist in the backend. **Not implemented.**
- **Report export (PDF/Excel/CSV)** — buttons on the analytics page trigger *toasts only* ("Generating encrypted .xlsx…"); no backend export routes exist. **Not implemented.**

### 4.6 AI features
- **None.** There is no AI/ML code anywhere in the repository — no model files, no inference calls, no prediction or recommendation logic. All "analytics" are deterministic aggregations (count, average, median, percentage). Any AI claim would be unsupported by the code.

### 4.7 Security features (implemented — details in §10)
- bcrypt password hashing (10 rounds), JWT (7-day expiry default), role authorization middleware, rate limiting (global API + stricter on auth routes), CORS allow-list, ownership check on follow-up responses, one-time verification with 409 on re-decision, dev-only seed endpoints disabled in production.

### 4.8 Supporting features (implemented)
- Shared auth module (`shared/auth.js`) used by both portals: single token key `mahakaushalya_token`, single `API_BASE_URL`, `apiFetch` wrapper (auto Bearer header, JSON encoding, 401 → redirect to portal login).
- Zero-dependency preview server (`preview-server.js`) serving both portals on :5500 for local viewing.
- E2E test suite (`server/test-flow.js`).
- `.env.example` documenting every environment variable.

### 4.9 Feature categories that do NOT exist
- Employer/self-service features: none implemented.
- Notifications (email/SMS sending): the schema/channel field exists (`sms`/`whatsapp`) and the UI references gateways, but **no gateway integration exists**; prompts are created via a dev seed endpoint only.
- File/document uploads, PDF generation, email verification, password reset flow (the UI has a forgot-password modal that is **simulation only** — it never calls an API), audit-log table, batch verify — none implemented.

---

## 5. How the App Works — Overall Workflow (actual)

```
Trainee                                Government/Admin
────────                               ────────────────
1. Opens portal (launcher/login page)
2. Registers (email+phone+password)
   └─ backend creates user(role=trainee)
      + trainee profile, issues PRN
   └─ JWT returned & stored
3. Logs in → Trainee Dashboard
   (profile, latest outcome, follow-ups)
4. Submits OUTCOME
   (employed / self_employed /
    higher_studies / unemployed)
   └─ stored with verificationStatus
      = 'pending'                    →   5. Officer logs into Admin Portal
                                       6. Dashboard/Overview KPIs
                                       7. Trainee register (filter/search)
                                       8. Outcomes list (filter pending)
9. Receives follow-up prompt           →   9'. Creates/seeds follow-up (dev)
   (SMS/WhatsApp in production)             10. Reviews non-responder queue
11. Responds to follow-up                  11'. Follow-up list shows response
        │
        ▼
   OUTCOME VERIFIED/REJECTED  ←────  12. Officer verifies/rejects outcome
        │                                (one-time; records verifier+time)
        ▼
   Analytics refresh
(placement by trade/center/partner,
 salary distribution)              →   13. Analytics inform program
                                        & provider decisions
```

**Detailed steps:**

1. **Enter the app.** A browser opens the launcher (or directly `trainee_login.html` / admin `login.html`). The frontend is static; all data comes from the Express API on port 5000.
2. **Registration.** `POST /api/trainee/auth/register` validates email format, 10-digit phone, ≥6-char password, checks email/phone uniqueness (409 otherwise), hashes the password with bcrypt, creates `users` row (role `trainee`) + `trainees` profile row, generates the PRN, links them, and returns a JWT (7 days).
3. **Login.** `POST .../auth/login` verifies credentials, returns token. Frontend stores it under `mahakaushalya_token` in localStorage and redirects to the dashboard. Wrong-portal tokens are rejected (UI role check + backend `authorize()`).
4. **Outcome submission.** The trainee picks a branch; the frontend maps it to the API's status vocabulary and posts to `/outcomes/submit`. Backend validates status against the enum, normalizes salary aliases (`monthlyWage`/`monthlyRevenue` → `monthlySalary`), stores it with `verificationStatus: 'pending'`.
5. **Admin review.** Officers authenticate, browse KPIs, then list outcomes (filter `verificationStatus=pending`), open the trainee register, and either verify or reject. The decision is one-time (409 on re-attempt) and records `verifiedBy` + `verifiedAt` in the schema.
6. **Follow-ups.** A pending prompt is created (dev seed endpoint today; a gateway/cron in production). The trainee sees it on the dashboard and responds; the response is stored and the prompt closes. Officers monitor pending items through the follow-up list and non-responder queue (with days-overdue computed from `sentAt`).
7. **Analytics.** Every dashboard/analytics call recomputes aggregates from the store — placement rates by trade/center/partner, salary stats, status distribution — which feed the admin overview and analytics pages.
8. **Decision support.** Officers compare providers/centers/trades to steer budgets and flag low performers (a manual decision; the system presents data, it does not make decisions).

---

## 6. Step-by-Step User Guide (Trainee)

> Verified against the actual pages: `trainee_login.html`, `trainee_registration.html`, `trainee_dashboard.html`, `update_outcome_status.html`, `follow_up.html`, `profile_settings.html`.

### Step 1 — Open the application
Open the launcher (`index.html` of the Trainee Dashboard Frontend, or the root preview page) and click **TRAINEE PORTAL**, or go directly to `trainee_login.html`. You see the "Candidate Portal Authentication" screen with a **Password Access** tab and an **OTP Access** tab. **Use Password Access** — the OTP tab is a UI simulation only (it shows alerts, no API calls; **Not verified in the current implementation** as a real flow).

### Step 2 — Registration / Login
**New trainee:** click *Candidate Registration* (button on the login page navigates to `trainee_registration.html`). Required: Full name, email, 10-digit mobile, password + confirm (min 6 chars). Optional: age band, social category, gender, district, training scheme, course, batch ID, completion month/year, statutory consent checkbox. On submit, the frontend posts to `/api/trainee/auth/register`; on success a success modal shows your **PRN** (e.g., `MK-2026-MH-00001`) and you are redirected to the dashboard already logged in (token stored automatically).
**Existing trainee:** enter email + password on the Password tab → token stored → redirected to `trainee_dashboard.html`. Wrong credentials show an error banner; if you paste an admin account here, the UI rejects it ("not a trainee account").
*Note: the "Find ID?" lookup and "Forgot Password?" modals are UI simulations — no backend endpoints exist for them (Not verified/Not implemented).*

### Step 3 — Complete profile
Go to **Profile & Settings** (`profile_settings.html`). The API supports editing: full name, email, phone, DOB, gender, address, district, profile photo URL (via `PUT /api/trainee/profile`). **Caveat honestly noted:** the profile settings page's own save/OTP/download buttons are wired to local UI simulations (`profile.js` shows toasts like "All changes saved to CIDR"); the *working* path is the API, and the dashboard/profile data displayed comes from it. The registration-time training fields (trade, batch, center) are displayed but not editable via any implemented endpoint.

### Step 4 — Use the main features
- **Dashboard** (`trainee_dashboard.html`): shows name, PRN ("enrollment id"), course, placement status, employer name, monthly wage, and an alerts strip fed by pending follow-ups. If you open it without a token you are bounced to login.
- **Update Outcome Status** (`update_outcome_status.html`): the outcome form with four branches — Employed (employer, job title, monthly wage, date of joining, work location, industry, UAN), Self-Employed (enterprise name, monthly revenue, Udyam/license, workers), Apprenticeship/Higher Education (institution, program, stipend, duration), Unemployed (primary reason, assistance requested). You must tick the **statutory declaration** checkbox; the submit button ("Submitting to ledger…") posts to `/api/trainee/outcomes/submit`.
- **Follow-up page** (`follow_up.html`): a 6-month follow-up questionnaire UI with star rating and conditional panels (same company / changed job / self-employed / seeking). **Caveat:** this page's submit handler is a **local simulation** (setTimeout + success notice) — it does **not** call `/api/trainee/followups/respond`. Follow-up *response* works via the API (dashboard shows pending prompts; the endpoint is live and E2E-tested), but this particular page is not yet wired to it.

### Step 5 — Submit / update information
Submittable: outcome reports (Step 4) and profile edits (Step 3). Each outcome is stored as a new record; there is no edit/delete of submitted outcomes via any implemented endpoint.

### Step 6 — Track progress
The dashboard shows your latest outcome (status/employer/wage) and how many outcomes you've submitted (outcomeCount). The full list is available via `GET /api/trainee/outcomes/history` (exposed in the frontend `api.js` layer). Pending follow-ups appear in the dashboard alerts strip until answered.

### Step 7 — Follow-up
The system model supports SMS/WhatsApp prompts (schema enum) and the dashboard surfaces pending questions. **In the current implementation there is no automatic scheduler or gateway**: prompts are created via the dev-only seed endpoint (`POST /api/trainee/dev/followups/seed`, disabled in production). No 3/6/12-month automatic windows are implemented — "Not verified in the current implementation."

### Step 8 — Logout / security
There is **no logout button** in the trainee UI, and no server-side session to destroy (JWTs are stateless until they expire, default 7 days). To end a session on a shared computer, clear the site's localStorage (the token key is `mahakaushalya_token`). The auth module clears the token automatically whenever the API returns 401 and redirects to login.

---

## 7. Government/Admin Workflow (actual)

```
Admin Login (login.html → POST /api/admin/auth/login)
      ↓
Dashboard / Overview (index.html — KPIs from /api/admin/dashboard + /overview)
      ↓
View collected data
   ├── Trainee Records (records_audit.html → /api/admin/trainees
   │      filters: search, district, status; rows clickable)
   ├── Outcomes list (/api/admin/outcomes?verificationStatus=pending)
   └── Non-Responder Queue (non_responder_queue.html → /api/admin/queue/non-responders)
      ↓
Monitor training outcomes (pending vs verified vs rejected counts)
      ↓
Analyze employment results (analytics_reports.html → /api/admin/analytics:
   placement by trade, status distribution, salary stats)
      ↓
Identify skill gaps (skill_gap_analysis.html — STATIC data only;
   no sector endpoint exists — flagged, not live)
      ↓
Compare providers/programs (provider_performance.html — live data only fills
   center name/count/placement%; richer columns are STATIC benchmark data)
      ↓
Verify claims (records_audit.html buttons → PUT /api/admin/outcomes/:id/verify)
      ↓
Generate insights/reports (Export/Schedule buttons show toasts ONLY —
   no export endpoints exist)
      ↓
Make policy/program decisions (offline, informed by the above)
```

**What administrators can see:** All trainees (PRN, name, district, trade, batch, center, partner), all outcomes with verification status, all follow-ups with responses, aggregate KPIs, and the non-responder worklist with overdue days.

**Data access controls:** Admin endpoints require role `admin` or `government`; trainee tokens get 403.

**Filters available (server-side, actually implemented):** trainees — trade, trainingCenter, batchName, district, search (name or PRN), status; outcomes — status, verificationStatus, traineeId; followups — status, traineeId, channel.

**Reports that can be generated:** none downloadable — the export/schedule/CSV buttons trigger UI toasts only. **Not implemented.**

**Decisions the system can support:** provider/center/trade comparison via live placement analytics; identifying unverifiable claims via the verification queue; prioritizing outreach via the non-responder queue. Formal policy reports are not produced by the system.

**Admin-portal caveats (from code):**
- Admin pages do **not** enforce an auth guard on load — pages render static content even without a token; API calls then fail gracefully (banners). Only the login page enforces role checking at login time. (Contrast: trainee dashboard *does* redirect when no token.)
- The queue page's "Trigger Campaign / WhatsApp-SMS Blast" calls `POST /api/admin/queue/trigger-campaign` — **no such backend route exists** (self-flagged TODO in code).
- The overview page's "Batch Authorize Placements" calls `POST /api/admin/outcomes/batch-verify` — **no such backend route exists** (self-flagged TODO).
- The Employer Validation page calls two `/api/public/employers/*` routes — **no such routes exist**.

---

## 8. Data Flow

```
                    ┌──────────────────────────────┐
                    │        TRAINEE (browser)     │
                    │  register/login/outcome/     │
                    │  respond/profile             │
                    └──────────────┬───────────────┘
                     HTTPS JSON    │  Bearer JWT
                                   ▼
        ┌──────────────────────────────────────────────┐
        │   EXPRESS API (server/, port 5000)           │
        │  /api/trainee/*   /api/admin/*               │
        │  CORS allow-list · rate limits · JWT+role    │
        │  validation (email/phone/password/status)    │
        └──────────────┬───────────────────────────────┘
                       │ repository layer (server/data/*)
         ┌─────────────┴─────────────┐
         ▼                           ▼
  DATA_PROVIDER=memory        DATA_PROVIDER=supabase
  in-memory JS store          Supabase Postgres (schema.sql):
  (resets on restart)         users · trainees · outcomes ·
                              followups · batches
                       │
                       ▼
        ┌──────────────────────────────────────────────┐
        │      GOVERNMENT/ADMIN (browser)              │
        │  dashboards · listings · verification ·      │
        │  analytics · queue                           │
        └──────────────────────────────────────────────┘
```

- **Data collected:** identity & contact (name, email, phone, dob, gender, address, district), training metadata (batch, trade, course, center, partner, completion), outcome facts (status, employer/enterprise, salary/revenue, joining date, work location, proof URL, remarks), follow-up Q&A (question, channel, response, timestamps), verification decisions (status, remarks, verifier, time).
- **Where stored:** single Postgres (Supabase) schema — 5 tables (`users`, `trainees`, `outcomes`, `followups`, `batches`) with FKs (trainee→user cascade, outcome→trainee cascade, followup→outcome set-null), enums for role/completion/outcome/verification/follow-up, check constraints (income non-negative, PRN/phone/pincode/IFSC formats, verification consistency). When `DATA_PROVIDER=memory` (current default), the same shapes live in an in-memory store and **reset on every restart**.
- **How processed:** controllers validate + normalize (e.g., alias salary fields), repositories map camelCase↔snake_case; aggregates computed at request time (no caching layer, no materialized views).
- **Who sees what:** trainees see only their own records (traineeId is taken from the JWT, never from user input — ownership enforced, e.g., follow-up 403 on foreign IDs); admins see everything via `/api/admin/*`.

---

## 9. Technical Architecture

| Layer | Technology (as used in code) |
|---|---|
| Frontend | Vanilla HTML/CSS/JS (ES modules), Tailwind CSS via CDN, Material Symbols, Google Fonts (Noto Sans/Inter) |
| Shared client module | `shared/auth.js` — one `API_BASE_URL` (`http://localhost:5000`), one token key, `apiFetch` wrapper for every request |
| Backend | Node.js + Express 4 (CommonJS), single app, port 5000 |
| Auth | `jsonwebtoken` (HS256 default, 7d), `bcryptjs` (10 rounds) |
| Middleware | custom `authenticate`/`authorize`, `express-rate-limit` (global 150/15min, auth 20/15min via env), central error/404 handlers |
| Database | Supabase (Postgres) via `@supabase/supabase-js`; fallback in-memory store (`DATA_PROVIDER=memory` default) |
| Config | `dotenv`; validated in `server/config/env.js` (PORT, CORS_ORIGIN, JWT_SECRET, JWT_EXPIRES_IN, rate limits, SUPABASE_URL/KEY, DATA_PROVIDER) |
| Dev tooling | nodemon, zero-dep static preview server (port 5500), E2E suite (Node built-in http) |
| AI/ML | None |
| Deployment/hosting | **Not configured** — no Dockerfile/CI/cloud config in the repo ("Not verified in the current implementation"). Runs locally with `npm start`. |

```
Browser (static HTML/JS, 2 portals)
        │  fetch (apiFetch wrapper, Bearer JWT, JSON)
        ▼
Express API (single process, port 5000)
  ├── CORS allow-list → /health → /api/trainee/* → /api/admin/*
  ├── rate limiters → JWT authenticate → role authorize
  ├── controllers (validate, normalize)
  └── repositories (camelCase ↔ snake_case)
        │ DATA_PROVIDER switch
        ├──► in-memory store (default; resets on restart)
        └──► Supabase Postgres (schema.sql: users/trainees/
             outcomes/followups/batches, enums, constraints)
```

**Route inventory (exact, from routes files):**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | public | health/provider/env status |
| POST | `/api/trainee/auth/register` | public (strict rate limit) | create trainee + PRN, return JWT |
| POST | `/api/trainee/auth/login` | public (strict rate limit) | trainee login |
| GET | `/api/trainee/dashboard` | trainee | profile + latest outcome + pending follow-ups |
| PUT | `/api/trainee/profile` | trainee | update editable profile fields |
| POST | `/api/trainee/outcomes/submit` | trainee | submit placement outcome |
| GET | `/api/trainee/outcomes/history` | trainee | own outcome history |
| POST | `/api/trainee/followups/respond` | trainee | respond to a pending follow-up |
| POST | `/api/trainee/dev/followups/seed` | trainee (dev only) | seed a pending follow-up (non-prod) |
| POST | `/api/admin/auth/login` | public (strict rate limit) | admin/government login |
| POST | `/api/admin/dev/seed-admin` | public (dev only) | create first admin (non-prod) |
| GET | `/api/admin/dashboard` | admin/government | aggregate KPIs |
| GET | `/api/admin/overview` | admin/government | overview-page KPI payload |
| GET | `/api/admin/trainees` | admin/government | filterable trainee register |
| GET | `/api/admin/outcomes` | admin/government | filterable outcome list |
| PUT | `/api/admin/outcomes/:outcomeId/verify` | admin/government | verify/reject (one-time) |
| GET | `/api/admin/analytics` | admin/government | trade/center/partner placement + salary stats |
| GET | `/api/admin/followups` | admin/government | follow-up list w/ filters |
| GET | `/api/admin/queue/non-responders` | admin/government | pending follow-ups + trainee info |

**Merged-backend conflict decisions** (from the merge task, documented in schema/controller comments):
- `trainees`: kept both portals' field sets (gov schema's district/course_name/completion_status + trainee repo's batch_name/trade/training_partner/profile_photo_url); completion_status normalized to a lowercase enum; email/phone nullable in DB but required at API registration.
- `outcomes`: kept both `status` (API enum: employed/self_employed/higher_studies/unemployed) and `outcome_type` (statutory category: wage_employment/self_employment/higher_education/apprenticeship); kept both employer/salary naming variants as columns.
- `followups`: kept both `question/response` (portal flow) and `response_text` (survey mirror); channel as enum sms/whatsapp.
- Registration unified on email+password with auto-PRN (the government portal's PRN-based registration was not carried as a separate flow).
- One JWT middleware with role `authorize()` replaces the two portals' separate auth middlewares.

---

## 10. Security & Privacy

### Implemented (verified in code)
| Mechanism | Where / Detail |
|---|---|
| Password hashing | bcryptjs, 10 salt rounds (`auth.controller.js`, `dev.controller.js`) |
| JWT sessions | HS256-signed, `JWT_EXPIRES_IN` (default 7d); verified on every protected request |
| Server-side role authorization | `authenticate` (validates token AND user still exists in DB) + `authorize('trainee')` / `authorize('admin','government')` → **403** for wrong roles; ownership checks (follow-up belongs to caller's traineeId → 403 otherwise) |
| Rate limiting | express-rate-limit: global API 150 req/15min, auth routes 20 req/15min (configurable) |
| CORS allow-list | explicit origin list from `CORS_ORIGIN`; no wildcard by default |
| Input validation | email regex, Indian 10-digit mobile regex, min-6 password, outcome status enum, non-empty strings; JSON body limit 2 MB |
| Enum + DB constraints | Postgres enums + CHECK constraints (income ≥ 0, URL format, PRN/phone/pincode/IFSC formats, verification consistency) |
| One-time verification | re-deciding an outcome returns 409; schema requires verifier+timestamp when verified |
| Dev-endpoint gating | seed routes auto-disabled when NODE_ENV=production |
| Unified session storage | single token key; 401 auto-clears token + redirects |
| Data minimization (schema level) | `aadhaar_hash` (sha-256 hex, unique), bank last-4 + IFSC instead of full account numbers |

### Limitations / risks (honest)
- **JWT secret default:** falls back to `dev_only_insecure_secret_change_me` with only a console warning in production.
- **No refresh tokens / logout invalidation:** a stolen token is valid until expiry.
- **localStorage token storage:** XSS-vulnerable by design tradeoff; no HttpOnly cookies.
- **No HTTPS enforcement** at the app level (depends on deployment).
- **No audit log** of officer actions beyond `verifiedBy/verifiedAt` on outcomes.
- **No consent artifact:** a `consent` boolean is sent at registration but **not stored** server-side.
- **Phone/email changes are not OTP-verified** (UI simulates OTP; no backend flow).
- **Password reset / email verification: not implemented.**
- **Trainee profile page** save/OTP flows are UI simulations, not secured flows.
- **Supabase RLS:** schema defines tables but the merged backend uses the service-role key server-side; no RLS policies are included in schema.sql, so authorization rests entirely on the Express middleware.

### Recommended future improvements (Future Scope — not implemented)
Rotate JWT secret policy + refresh-token rotation; HttpOnly cookie sessions; per-row audit log; consent artifact storage; OTP-verified contact changes; production officer provisioning; RLS policies; HTTPS/HSTS at proxy; field-level encryption for PII at rest.

---

## 11. AI & Analytics

- **AI:** **None implemented.** No ML models, inference, prediction, or recommendation code exists anywhere in the repo. Any "AI" label on a screen would be unsupported.
- **Rule-based logic (implemented):** client-side grade/status derivation for provider rankings (A+/A/B/C and Clean/Review thresholds from placement %), and deficit badge rules in the skill-gap UI (Critical >50%, High 25–50%) — but the skill-gap page never receives live sector data, so this logic only ever runs on the static demo matrix.
- **Statistical analytics (implemented, server-side):** counts, percentage placement rates by trade/center/partner, salary min/max/average/median, status distribution, follow-up pending/responded counts, days-overdue computation. All computed at request time.
- **Future/planned (not implemented):** sector demand-vs-supply skill-gap endpoint, retention/3-6-12-month cohort tracking, predictive placement models — none exist in code.

---

## 12. Real-World Use Case (actual flow, with actual endpoints)

**Priya completes a 3-month CNC Operator course at a Govt ITI in Pune.**

1. **Registers** on the Trainee Portal → `POST /api/trainee/auth/register` → receives PRN `MK-2026-MH-00042` and is logged in automatically.
2. **Gets a job** at a Pune auto-components firm three weeks later, at ₹21,000/month.
3. **Logs in** and opens **Update Outcome Status** → selects the *Employed* branch, enters employer, title "CNC Operator", wage 21000, joining date, work location, ticks the statutory declaration → `POST /api/trainee/outcomes/submit` → record stored with `verificationStatus: 'pending'`, reference ID shown.
4. **Officer review:** A District Skill Officer logs into the Admin Portal → Dashboard shows Pending Verifications count → **Trainee Records** → filters district=Pune, finds Priya's row (search by PRN) → clicks **Approve Subsidy Tranche** → `PUT /api/admin/outcomes/:id/verify` with `verificationStatus: 'verified'` + remarks → outcome is now verified with the officer's ID and timestamp recorded.
5. **Retention follow-up:** months later, a pending follow-up exists for Priya ("Are you still employed at your reported organization?", channel sms) — created by the state's outreach process (in dev: seeded via the dev endpoint). It appears in her **dashboard alerts**; she responds → `POST /api/trainee/followups/respond` → stored, prompt closes. If she never responds, she appears in the officer's **Non-Responder Queue** with days-overdue.
6. **Analytics:** the officer's **Analytics & Reports** page now reflects Priya in the *CNC Operator* trade's placement rate and in the salary distribution (avg/median update automatically).

**What the government learns:** verified placement counts and rates per trade/center/partner, real wage levels, and which graduates need re-outreach — the inputs for funding and provider reviews.

---

## 13. Benefits

### For Trainees
- One official post-training record with a permanent PRN; a dashboard showing their latest status and pending follow-ups; simple, mobile-friendly forms in English (with Marathi labels in places); no paperwork to prove placement.

### For Government (SDED/MSSDS)
- Verified, filterable register of every trainee and outcome; one-time verification with accountability (who verified, when); live placement/salary analytics by trade/center/partner; a non-responder worklist; role-isolated portals with rate-limited auth.

### For Training Providers
- **Not applicable as users** (no provider login/API). Indirect benefit: their performance (placement rate by center) is visible to officers — used in program decisions, not visible to providers themselves.

### For Employers
- **Not applicable** — the employer-validation screens have no backend; employers cannot actually use the system today.

### For the Public
- No public dashboard exists. Indirect benefit only: public training funds are (internally) tracked to verified outcomes.

---

## 14. Existing System vs This Application

> "Existing process" column describes typical manual/paper processes the app replaces; it is contextual, not from a benchmarked system in the repo.

| Aspect | Existing Process/System | This Application |
|---|---|---|
| Data collection | Paper forms, phone calls, unstructured spreadsheets | Structured validated API forms (email/phone/password rules, enums) |
| Trainee identity | Ad-hoc (name/phone duplicates) | Auto PRN (`MK-YYYY-MH-NNNNN`), unique email/phone constraints |
| Training tracking | Separate registers per provider | Single trainees table w/ trade, batch, center, partner, completion status |
| Employment tracking | Self-declared claims, hard to audit | Outcome submissions with mandatory verification workflow (pending→verified/rejected, one-time) |
| Follow-up | Manual calls, no record | Follow-up records with channel, question, response, timestamps; non-responder queue with overdue days |
| Analytics | Manual tallying | Live aggregates: placement by trade/center/partner, salary min/max/avg/median, status distribution |
| Skill-gap identification | Not systematic | **Page exists with static data only — live sector endpoint not implemented** |
| Government monitoring | Periodic manual reports | KPI dashboards updated on every request |
| User accessibility | Office hours / paperwork | 24×7 web portals, role-separated, rate-limited |
| Security | Physical files / shared sheets | bcrypt, JWT + role auth, CORS allow-list, rate limits, DB constraints |

---

## 15. Complete User Journeys

### Trainee Journey (implemented)
Registration (PRN issued) → auto-login → Dashboard (profile + alerts) → Profile & Settings (edit personal fields) → Update Outcome Status (4 branches, declaration) → submission pending verification → receives follow-up → responds → history/dashboard reflects submissions → token persists 7 days (no logout button; 401 auto-logout).

### Government Journey (implemented)
Login → Dashboard/Overview KPIs → Trainee Records (search/filter, select dossier) → Outcomes (filter pending) → Verify/Reject (one-time) → Analytics & Reports (trade/center/partner + salary stats) → Non-Responder Queue (overdue outreach worklist) → (static) Skill Gap & Provider benchmarking pages → decisions offline.

### Employer Journey — **not implemented**
Page exists (`employer_validation.html`) but its two API routes do not exist. A real journey is impossible today.

### Provider Journey — **not implemented**
No provider login or provider-owned views exist; providers appear only as aggregated rows in the officer's ranking page.

---

## 16. Frequently Asked Questions

**Q1. What is MahaKaushalya?**
A two-portal web system for tracking what trainees do after government skilling programs: trainees report outcomes; officers verify and analyze them.

**Q2. Who can use it?**
Trainees (role `trainee`) and government officers with `admin`/`government` roles. (`officer`/`analyst` exist in the schema but are not accepted by the API's admin middleware.) Employers and providers have UI screens but no backend access.

**Q3. How do I register?**
Trainee Portal → Candidate Registration → full name, email, 10-digit mobile, password (≥6 chars) + optional training details → PRN issued, auto-logged-in.

**Q4. What information is required at registration?**
Only fullName, email, phone, password are mandatory; batch/trade/course/center/partner/district and completion month/year are optional.

**Q5. How is my data used?**
To record and verify your post-training status and compute program analytics for the department. There is no data-selling or third-party integration in the code.

**Q6. How is employment verified?**
A government officer reviews the submitted outcome in the admin portal and marks it verified or rejected with remarks; the decision is one-time and records the officer's ID and timestamp.

**Q7. What happens after training / I submit an outcome?**
Your submission sits with status `pending`. Officers see it in their filtered lists; once verified it counts toward placement analytics.

**Q8. How does follow-up work?**
A pending question (SMS/WhatsApp channel field exists) appears in your dashboard alerts; you respond once; it closes. In the current build, prompts are created via a dev-only endpoint — no automatic scheduler or SMS gateway is implemented.

**Q9. What can government administrators see?**
All trainees, outcomes, follow-ups, aggregate KPIs, and the non-responder queue. They cannot see your password (only its bcrypt hash) and cannot act as trainees (role checks).

**Q10. What if I change my phone/email?**
You can update both via the profile API (`PUT /api/trainee/profile`) with validation. The profile *page's* OTP-change modal is a UI simulation — there is no OTP verification flow (Not implemented).

**Q11. How does the system identify skill gaps?**
It currently doesn't, beyond trade-level placement rates in analytics. The Skill Gap Analysis page shows a static demo matrix; no live sector demand data exists (Not implemented).

**Q12. How do I update my information / outcome?**
Profile fields via the profile API. Submitted outcomes cannot be edited or deleted — submit a new outcome if your status changed (history keeps all versions).

**Q13. Is there an app or offline mode?**
No. It is a browser-based web application; the frontend requires the backend running on port 5000.

**Q14. Is my data deleted when I ask?**
No deletion/account-removal feature is implemented (Not implemented).

**Q15. Does it use AI?**
No. All analytics are deterministic statistics computed in the API.

---

## 17. Current Limitations

**Technical**
- In-memory data provider by default: **all data is lost on restart**; Supabase mode requires filling real credentials and running schema.sql.
- Single process, single port; no clustering, no caching layer; aggregates recomputed per request.
- `API_BASE_URL` is hardcoded to `http://localhost:5000` in `shared/auth.js` — deployment to any other host requires a code edit (no env-based override for the frontend).
- CORS origins, JWT secret, rate limits all env-dependent; insecure JWT default with only a warning.

**Feature gaps (pages/UI without backend)**
- Employer validation: no routes.
- Skill-gap live data: no endpoint; static matrix only.
- Provider ranking: only center/count/placement% live; grades, retention, wage growth, head names are hardcoded demo data.
- Report export/schedule buttons: toasts only.
- Trigger Campaign (queue) & Batch Authorize (overview): routes don't exist.
- Follow-up page UI not wired to the live respond endpoint (dashboard alerts path works).
- Profile-settings page save/OTP/download buttons: local simulations.
- OTP login, forgot-password, find-ID: simulations only.
- No logout button; no email verification; no password reset; no notification dispatch (no SMS/WhatsApp/email gateway).
- No admin UI for creating officers in production.

**Data**
- Retention rate is always `null` from the API; the overview's "placement distribution" rows are status categories, not months.
- No audit-log table; consent boolean not persisted; no data-retention/deletion workflows.
- Memory provider makes PRN sequence reset to 00001 after restarts (Supabase mode uses a timestamp-based sequence).

**Security**
- Listed in §10 (JWT default secret, no refresh/logout invalidation, localStorage tokens, no RLS, no audit trail beyond verify fields).

**Scalability**
- In-memory store caps horizontal scaling by definition; Supabase mode does one query per repository call with no pagination on list endpoints (`page`/`limit` params sent by the audit page are ignored by the backend — it returns everything matching the filter).

**User experience**
- Admin pages render without an auth guard (data silently fails instead of redirecting); several visible features are intentionally static (dead footer links, "Policy Reports" placeholder, cohort/district header selects not wired to queries); trainee OTP flows mislead visually.

---

## 18. Future Scope *(proposals — none implemented)*

1. **Persistent Supabase deployment** — fill real credentials, run schema.sql, switch `DATA_PROVIDER=supabase`; add pagination + indexes review for large cohorts.
2. **Sector skill-gap endpoint** — serve `sectors`/`kpis` the existing UI already expects, turning the static matrix live.
3. **Follow-up automation** — scheduled job to create 3/6/12-month prompts per outcome + SMS/WhatsApp gateway integration + campaign-trigger route (the queue UI is ready).
4. **Employer validation backend** — signed-token routes (`/api/public/employers/*`) to make the existing page real.
5. **Provider portal** — provider accounts (schema role vocabulary already includes `officer`/`analyst`; add `provider`), self-service outcome dashboards.
6. **Exports** — CSV/PDF endpoints behind the existing export buttons; scheduled email reports.
7. **Auth hardening** — refresh tokens, logout invalidation, OTP-verified contact changes, password reset, production officer provisioning, HttpOnly cookies.
8. **Retention analytics** — real cohort retention from follow-up history (API currently returns `null`).
9. **Audit log + consent storage** — record every officer action and persist the registration consent.
10. **Frontend config** — move `API_BASE_URL` to a per-environment setting (window config or build step).

---

## 19. 60-Second Explanation

- **What is it?** MahaKaushalya — a government web system (two portals, one backend) that tracks what trainees do after finishing a Maharashtra skilling course.
- **What problem does it solve?** The department had no reliable way to know if trainees actually got jobs — now every outcome is reported, verified, and counted.
- **Who uses it?** Trainees (register, report outcomes, answer follow-ups) and government officers (verify outcomes, view analytics). Employers/providers have demo screens only.
- **How does it work?** Static web pages call one Express API (JWT-secured, role-separated). Trainees post outcomes; officers verify them; analytics compute placement rates and salary stats live.
- **What happens to the data?** Stored in a single schema (users, trainees, outcomes, followups, batches) — currently in an in-memory demo store that resets on restart, or Supabase Postgres when configured.
- **What does the government get?** Verified placement counts and rates by trade/center/partner, salary distributions, and a non-responder outreach queue.
- **What does the user get?** A permanent registration number (PRN), an official record of their outcome, and visibility of pending follow-ups.
- **Why is it useful?** It turns unverifiable placement claims into a verified, searchable, measurable dataset that can justify and steer public skilling budgets.

---

## 20. Final System Summary

MahaKaushalya is a **merged, single-backend two-portal outcome-tracking system** for Maharashtra's skilling programs. The **trainee side** delivers registration with auto-issued PRN, JWT login, dashboard, profile editing, 4-category outcome submission, outcome history, and follow-up response. The **government side** delivers login, KPI dashboards, a filterable trainee register, outcome verification (one-time, attributed), analytics by trade/center/partner with salary statistics, follow-up monitoring, and a non-responder queue. Both portals share one auth module, one token store, one API base, and one Express server with strict role separation, rate limiting, CORS allow-listing, and a documented Postgres schema with enums and constraints.

Its **verified strengths** are a clean unified architecture (one server, one schema, one auth path), an E2E-tested API surface (28/28 checks), a real verification workflow with accountability, and live server-side analytics. Its **verified gaps** are equally clear: persistence defaults to volatile memory, several polished UI pages (employer validation, skill-gap, exports, campaign trigger, OTP flows, profile-save simulations) lack backend routes, retention tracking is null, there is no AI component, and production concerns (officer provisioning, secrets, HTTPS, RLS, audit logs) remain open. The system is best understood as a **working, tested core outcome-tracking engine wrapped in an ambitious presentation layer** — the core is real and demonstrated; the remaining pages are the roadmap.
