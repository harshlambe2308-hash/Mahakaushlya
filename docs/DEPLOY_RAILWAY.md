# Deploying MahaKaushalya on Railway

One Railway service runs everything: the merged Express API **and** both static
portals (the server serves `client/` and `shared/` in production). Total time:
**~10 minutes**.

```
Railway Project
└── mahakaushalya (Node service)   ← Express API + static frontend, one port
    └── (optional) Supabase Postgres, or Railway's Postgres service
```

No CORS headaches: the portals call `/api/...` on the **same origin** they are
served from, because `shared/auth.js` defaults `API_BASE_URL` to `''`.

---

## 0. Prerequisites

- The repo pushed to GitHub (Railway deploys from GitHub), **or** the
  [Railway CLI](https://docs.railway.com/guides/cli) installed locally.
- A [Supabase](https://supabase.com) project **if you want persistent data**
  (recommended). Otherwise the app boots with `DATA_PROVIDER=memory`, where
  data resets on every restart — fine for a quick demo.

## 1. Push the repo to GitHub

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

Railway needs the repo (including `client/`, `shared/`, and the `Procfile` at
the root) to build the service.

## 2. Create the Railway project

1. Go to [railway.app](https://railway.app) → **New Project**.
2. Choose **Deploy from GitHub repo** and pick this repository.
3. Railway auto-detects Node (via Railpack). If it asks for a start command,
   the root [`Procfile`](../Procfile) already provides it:

   ```
   web: cd server && npm install --omit=dev && node server.js
   ```

   (Equivalent manual setting: **Settings → Deploy → Custom Start Command** =
   `cd server && npm install --omit=dev && node server.js`, with
   **Root Directory** left at `/`.)

## 3. Set environment variables

In the service → **Variables** tab, add:

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Disables dev-only seed endpoints |
| `DATA_PROVIDER` | `supabase` | Or `memory` for a throwaway demo |
| `SUPABASE_URL` | `https://xxxx.supabase.co` | From Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Service-role key (server-side only) |
| `JWT_SECRET` | 64+ random chars | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `7d` | |
| `CORS_ORIGIN` | `https://<your-app>.up.railway.app` | Same origin anyway; belt-and-suspenders |

> **Do NOT set `PORT`.** Railway injects it and the app already binds to
> `process.env.PORT` (see `server/config/env.js`).

### Option A — Supabase (recommended)

1. In Supabase: **SQL Editor → New query → paste the entire [`schema.sql`](../schema.sql) → Run.**
   It's idempotent, so re-running is safe.
2. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Railway variables.

### Option B — Railway Postgres (needs a small code change)

The data layer talks to Postgres via the **Supabase JS client** (REST over
PostgREST), so a plain Railway Postgres is *not* a drop-in replacement. If you
want everything on Railway, the cleanest path is adding a `pg`-based provider
(`server/data/`) that reads `${{Postgres.DATABASE_URL}}` and running
`schema.sql` against the database service. Until then, prefer Option A —
Supabase's free tier covers this app comfortably.

## 4. Generate a public domain

Service → **Settings → Networking → Generate Domain** → accept the suggested
`<name>.up.railway.app`. Railway routes HTTPS traffic to the app on the
injected `PORT`.

## 5. Verify the deployment

```bash
curl https://<your-app>.up.railway.app/health
# {"success":true,"data":{"status":"ok","dataProvider":"supabase","environment":"production"},...}
```

Then open:

| What | URL |
|---|---|
| Launcher (both portals) | `https://<your-app>.up.railway.app/` |
| Trainee portal | `https://<your-app>.up.railway.app/trainee-portal/index.html` |
| Trainee portal (legacy prefix) | `https://<your-app>.up.railway.app/client/trainee-portal/index.html` |
| Admin portal | `https://<your-app>.up.railway.app/admin-portal/login.html` |
| Admin portal (legacy prefix) | `https://<your-app>.up.railway.app/client/admin-portal/login.html` |

## 6. Create the first admin (production-safe)

The dev seed endpoint is disabled with `NODE_ENV=production`. Two ways to
bootstrap an officer account:

**Easiest — temporary flip:**

1. Temporarily set `NODE_ENV=development` in Railway variables (service
   redeploys automatically).
2. Create an admin:
   ```bash
   curl -X POST https://<your-app>.up.railway.app/api/admin/dev/seed-admin \
     -H "Content-Type: application/json" \
     -d '{"name":"MSSDS Officer","email":"officer@mssds.gov.in","password":"<strong-password>","role":"admin"}'
   ```
3. **Immediately** set `NODE_ENV=production` back.

**Proper way (later TODO):** a one-time `SETUP_TOKEN`-protected bootstrap
endpoint, or inserting the admin row directly in Supabase (bcrypt-hashed
password — `bcryptjs` hashes only, never reuse a plain hash from elsewhere).

## 7. Logs, metrics, restarts

- **Logs:** service → **Deployments → View Logs** (or the Observables tab).
- **Restart:** service → top-right **⋯ → Restart** (memory provider = data loss).
- **Auto-deploys:** every push to the GitHub branch the service tracks
  (Settings → Source) triggers a new deployment.
- **Crash loops:** if the deploy fails at boot, check logs for a missing env
  var — `SUPABASE_SERVICE_ROLE_KEY` empty + `DATA_PROVIDER=supabase` is the
  usual culprit.

## 8. Costs & limits (as of 2026)

- Railway's **Hobby plan** ($5/mo, includes usage credit) is plenty for this
  single-service app; a trial card is required to generate public domains.
- **Memory provider warning:** Railway **redeploys/restarts** containers on
  every push *and* on infra maintenance → in-memory data is wiped. Use
  Supabase for anything beyond a demo.
- Free Supabase tier pauses after a week of inactivity — the API will start
  erroring until you restore the project from the Supabase dashboard.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| `Application failed to respond` on the domain | Start command didn't bind to `$PORT`. Confirm the Procfile is used and `server.js` listens on `env.PORT` (it does). |
| `502` right after deploy | Container still booting — wait ~30 s, re-check logs. |
| Portal loads but every API call fails | `DATA_PROVIDER=supabase` set but Supabase vars missing/wrong, or Supabase project paused. |
| `CORS` errors in the console | `CORS_ORIGIN` must list the exact origin(s) including scheme. With same-origin serving this shouldn't happen — file an issue if it does. |
| Login works, then 401 everywhere | `JWT_SECRET` changed between deploys → tokens invalidated. Set it once and leave it. |
| Can't create admin in production | Expected — see §6. |
