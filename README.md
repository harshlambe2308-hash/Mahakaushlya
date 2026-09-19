# MahaKaushalya — Post-Training Outcome Tracking System

**MahaKaushalya** is a two-portal web system for government skilling programs (MSSDS, Government of Maharashtra): trainees report what they did after training — job, own business, higher studies, or still searching — and government officers verify and analyze those reports.

## The Problem

After a government-funded training program ends, the department has no reliable, structured way to know whether trainees actually got placed. Skilling budgets, provider payments, and future program design all depend on verified post-training placement data — yet today that data lives in unverifiable paper claims and scattered spreadsheets. MahaKaushalya turns placement claims into a verified, searchable, measurable dataset: every trainee gets a permanent registration number (PRN, `MK-YYYY-MH-NNNNN`), every outcome goes through a one-time officer verification with an audit trail (who verified, when), and live analytics aggregate placement rates by trade, training center, and partner.

## Tech Stack

- **Backend:** Node.js + Express 4 (single merged API), JWT auth (`jsonwebtoken`), bcrypt password hashing, rate limiting, CORS allow-list
- **Database:** Supabase / PostgreSQL (`schema.sql`: users, trainees, outcomes, followups, batches — enums + check constraints), with a zero-config **in-memory provider as the default** for demos and testing
- **Frontend:** Vanilla HTML/CSS/JS (ES modules) with Tailwind via CDN — no build step
- **Testing:** E2E suite (`server/test-flow.js`, 28 checks over real HTTP, Node built-in `http` module — no test framework needed)

## Folder Structure

```
mahakaushalya/
├── server/                  # Merged Express API (trainee + admin routes, one port)
│   ├── config/              # Centralized, validated env config
│   ├── controllers/         # Request handling + validation
│   ├── data/                # Repository layer (memory <-> Supabase switch)
│   ├── db/                  # Supabase client
│   ├── middleware/          # JWT auth, role authorize(), rate limiter, errors
│   ├── routes/              # /api/trainee/* and /api/admin/*
│   ├── utils/               # Response envelope, ApiError, validators, PRN generator
│   └── test-flow.js         # E2E test suite (npm test)
├── client/
│   ├── trainee-portal/      # Trainee pages (register, login, dashboard, outcomes, follow-ups, profile)
│   └── admin-portal/        # Officer pages (overview, records audit, analytics, non-responder queue, ...)
├── shared/
│   └── auth.js              # Single token store + apiFetch() wrapper used by BOTH portals
├── docs/
│   └── PROJECT_REPORT.md    # Full honest audit: features, gaps, security notes
├── schema.sql               # Single-source-of-truth Postgres schema (idempotent)
├── preview-server.js        # Zero-dependency static server for the two portals (port 5500)
├── .env.example             # Environment template — copy to server/.env
└── package.json             # Convenience scripts
```

## Quick Start

**Prerequisites:** Node.js 18+, npm.

```bash
# 1. Clone
git clone <your-repo-url>
cd mahakaushalya

# 2. Install backend dependencies
npm run install:all        # (= npm install --prefix server)

# 3. Configure environment
cp .env.example server/.env
#    Edit server/.env:
#      - DATA_PROVIDER=memory  -> run instantly, no DB needed (data resets on restart)
#      - DATA_PROVIDER=supabase-> set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
#                                and run schema.sql in your Supabase SQL editor
#      - Set a strong JWT_SECRET

# 4. Run the API (port 5000)
npm start                  # or: npm run dev (nodemon)

# 5. Serve the two portals (port 5500, in a second terminal)
npm run preview

# 6. (Optional) Run the E2E suite against the running API
npm test
```

Then open:
- **Launcher (both portals):** http://localhost:5500
- **Trainee portal:** http://localhost:5500/client/trainee-portal/index.html
- **Admin portal:** http://localhost:5500/client/admin-portal/login.html

In `DATA_PROVIDER=memory` mode there are dev-only seed endpoints to bootstrap demo data: `POST /api/trainee/dev/followups/seed` and `POST /api/admin/dev/seed-admin` (both auto-disabled when `NODE_ENV=production`).

## API Summary

All responses use the envelope `{ success, data, message }`. Auth via `Authorization: Bearer <JWT>`.

### Trainee routes — `/api/trainee/*` (role `trainee`)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register; issues PRN + JWT |
| POST | `/auth/login` | Login |
| GET | `/dashboard` | Profile + latest outcome + pending follow-ups |
| PUT | `/profile` | Update editable profile fields |
| POST | `/outcomes/submit` | Submit placement outcome (employed / self_employed / higher_studies / unemployed) |
| GET | `/outcomes/history` | Own outcome history, newest first |
| POST | `/followups/respond` | Respond to a pending follow-up (ownership-checked) |
| POST | `/dev/followups/seed` | Dev-only: seed a pending follow-up (non-production) |

### Admin routes — `/api/admin/*` (roles `admin`, `government`)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Officer login |
| POST | `/dev/seed-admin` | Dev-only: create first admin (non-production) |
| GET | `/dashboard` | Aggregate KPIs (counts, verification status, placement rate) |
| GET | `/overview` | KPI payload for the overview page |
| GET | `/trainees` | Filterable trainee register (trade, center, batch, district, search) |
| GET | `/outcomes` | Filterable outcome list (status, verificationStatus, traineeId) |
| PUT | `/outcomes/:id/verify` | Verify/reject a pending outcome — one-time, records verifier + timestamp |
| GET | `/analytics` | Placement rate by trade/center/partner + salary distribution (min/max/avg/median) |
| GET | `/followups` | Follow-up list with filters |
| GET | `/queue/non-responders` | Pending follow-ups joined with trainee info, days-overdue |

Role checks are enforced server-side (`authorize()` middleware): a trainee token gets 403 on admin routes and vice versa.

## Current Known Limitations

Honest list — the project is a working, E2E-tested core wrapped in a partially-wired presentation layer:

- **In-memory data provider is the default.** With `DATA_PROVIDER=memory`, all data resets on every server restart. Persistence requires Supabase credentials + `schema.sql`.
- **Some pages are UI-only, pending backend routes:** Employer Validation (`/api/public/employers/*` routes don't exist), Skill Gap Analysis (static benchmark matrix — no live `sectors` endpoint), report Export/Schedule buttons (toasts only), "Trigger Campaign" and "Batch Verify" (no routes), and the trainee profile-settings save/OTP buttons and OTP login tab (local simulations).
- **No notifications:** the follow-up `sms`/`whatsapp` channel field exists in the schema, but no SMS/WhatsApp gateway or scheduler is integrated — prompts are created via the dev seed endpoint.
- **API base is configurable:** the frontend calls the API same-origin by default (empty base in `shared/auth.js`); local dev overrides it to `http://localhost:5000` via the preview server. When the API is hosted at a *different* origin than the static frontend, set `window.MAHAKAUSHALYA_API_BASE_URL` before the portals load.
- **Security is functional but basic:** JWT with a dev-default secret fallback (warns in production), tokens in localStorage (XSS-exposed), no refresh tokens, no logout invalidation, no password reset, no Supabase RLS policies (auth rests entirely on the Express middleware).
- **Retention analytics return `null`** (the 3/6/12-month cohort windows on some screens are not backed by computation).
- **List endpoints are not paginated** — `page`/`limit` params are ignored; everything matching the filter is returned.
- **No AI:** all analytics are deterministic aggregates (counts, percentages, medians).

See [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md) for the full verified feature inventory, data flow, security analysis, and roadmap.

## Deployment

The merged Express app **serves the static frontend too** (same origin — no CORS issues). Deploy `server/` as one Node service and the portals ship with it. See **[docs/DEPLOY_RAILWAY.md](docs/DEPLOY_RAILWAY.md)** for a step-by-step Railway guide.

## License

MIT
