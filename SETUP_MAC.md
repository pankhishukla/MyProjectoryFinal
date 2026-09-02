# SETUP_MAC.md — Fresh macOS Setup Guide

Complete, verified guide to clone and run **CareerStack AI** on a fresh macOS machine.
This guide was produced by auditing the actual repository (commit `913808c`) — where the
repo disagrees with its own README, this document reflects what the code actually does.

---

## 1. Project Overview

A full-stack web platform that helps fresh graduates build, track, and showcase project
portfolios and measure job-readiness based on current market demand.

- **Monorepo**: pnpm workspaces (`artifacts/*`, `lib/*`, `scripts`)
- **Frontend**: React 19 + Vite 7 + Tailwind CSS + shadcn/Radix UI + Framer Motion + Recharts + TanStack Query + Wouter
- **Backend**: Express 5 + Node.js, compiled to a CJS bundle with esbuild
- **Database**: **MySQL 8.0** + Drizzle ORM (NOTE: README says PostgreSQL — that is **wrong**; the whole repo uses MySQL/mysql2)
- **Authentication**: Header-based lightweight auth (Clerk removed)
- **Validation**: Zod + drizzle-zod (generated from the DB schema)
- **API Codegen**: Orval from OpenAPI spec (`lib/api-spec/openapi.yaml`)
- **Scraping**: Playwright (Chromium) + Cheerio + Adzuna API (optional)
- **Auth bypass for local dev**: `SKIP_ADMIN_CHECK=true` + `NODE_ENV=development` skips Clerk entirely (fake `dev_user_id`)

---

## 2. Requirements

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | 22+ (24+ recommended) | `brew install node` or [nodejs.org](https://nodejs.org/) |
| **pnpm** | **10.6.5** (exact — `packageManager` field + `only-allow`) | `npm install -g pnpm@10.6.5` |
| **Docker Desktop + Docker Compose** | Latest (daemon must be running) | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Latest | `brew install git` |

- The API server uses `node --env-file=.env` (Node ≥ 20.6) — Node 22+ required.
- pnpm version is pinned: the root package declares `packageManager: pnpm@10.6.5`
  and `.npmrc`/`preinstall` runs `npx only-allow pnpm`. Do **not** use npm/yarn for this repo.
- Docker is used for the MySQL dependency in this repo (see `docker-compose.yml`). The rest of the toolchain is still installed on the host.
- Optional: Playwright Chromium browser for the job scrapers. You can install it on the host with `npx playwright install chromium` or run the scrapers inside a Docker container with Playwright and Chromium preinstalled.

---

## 3. Installation

### 3.1 Docker-managed dependency setup (MySQL)

```bash
# Docker Desktop must be installed and running first.
docker version
docker compose version

# Pull the MySQL image used by the project
docker pull mysql:8.0

# Start the MySQL container defined in docker-compose.yml
docker compose up -d mysql
docker compose ps
```

### 3.2 Host tools still required

```bash
# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node + Git
brew install node git

# pnpm (exact pinned version)
npm install -g pnpm@10.6.5
```

### 3.2 Clone & install dependencies

```bash
git clone https://github.com/pankhishukla/MyProjectoryFinal.git
cd MyProjectoryFinal
pnpm install          # installs all workspace packages
npx playwright install chromium   # only needed for scrapers
```

### 3.3 Playwright and Chromium in Docker

The repo uses `playwright@1.42.1`. If you want Chromium and Playwright inside Docker instead of on the host, use the official Playwright image, which already includes Chromium:

```bash
# Pull the image that matches the repo's Playwright version
docker pull mcr.microsoft.com/playwright:v1.42.1-jammy

# Start a shell with the repo mounted in the container
docker run --rm -it \
  -v "$PWD":/work \
  -w /work \
  mcr.microsoft.com/playwright:v1.42.1-jammy \
  bash
```

Inside the container, run:

```bash
corepack enable
pnpm install
pnpm --filter @workspace/scripts run scrape
```

If you specifically want to install the browser binaries in a container based on Node instead of using the Playwright image, run:

```bash
docker run --rm -it \
  -v "$PWD":/work \
  -w /work \
  node:22-bookworm-slim \
  bash -lc "corepack enable pnpm && pnpm install && pnpm --filter @workspace/scripts exec playwright install chromium"
```

> **Known repo bug**: `pnpm run typecheck` / `pnpm run build` at the root currently fail
> because `artifacts/careerstack/src/pages/roadmaps/[id].tsx:19` contains `async <T>(...)`,
> which is a syntax error in a `.tsx` file (TSX parses `<T>` as a JSX tag). Verified fix:
> change `<T>` to `<T,>` on that line. See **§8 Common Errors** for the exact patch.
> (`pnpm run typecheck:libs` passes fine.)

---

## 4. Environment Variables

`.env.example` at the repo root is **incomplete/stale** (only MySQL container vars + PORT).
It is missing the variables the code actually requires. Create **two** `.env` files:

### 4.1 Repo root `.env` — used by Vite (envDir `../../`), Drizzle (`../../.env`), and the scrape scripts (`--env-file=../.env`)

```bash
cp .env.example .env
```

Then add/verify these keys:

```env
# ─── MySQL container (docker-compose.yml defaults — must match) ───────────────
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=careerstack
MYSQL_USER=careerstack
MYSQL_PASSWORD=careerstack

# ─── Database connection (REQUIRED — missing from .env.example) ───────────────
# mysql://user:password@host:port/database  (host port 3307, not 3306!)
DATABASE_URL=mysql://careerstack:careerstack@localhost:3307/careerstack

# ─── Server ────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000            # see §5.2 — must match vite.config.ts proxy target (3001)
FRONTEND_PORT=5173
SKIP_ADMIN_CHECK=true    # dev only: bypass Clerk auth on the backend
LOG_LEVEL=info

# Clerk removed: no Clerk env keys required. For local development you can still
# set `SKIP_ADMIN_CHECK=true` and provide `X-User-Id` / `X-User-Role` headers to
# simulate authenticated requests.

# ─── Optional integrations ─────────────────────────────────────────────────────
ADZUNA_APP_ID=        # optional; placeholders skip the sync
ADZUNA_API_KEY=
ADZUNA_REGION=in
JOBS_SYNC_INTERVAL=   # job feed sync (scheduler currently disabled in app.ts)
JOB_INTEL_SCHEDULER_ENABLED=false  # job-intelligence scheduler, off by default
JOB_INTEL_SYNC_INTERVAL=
```

### 4.2 `artifacts/api-server/.env` — required for the API server itself

The backend's `start`/`dev` scripts run `node --env-file=.env` **from the
`artifacts/api-server` directory** (and `index.ts` loads `dotenv/config` from there),
so a copy must exist in that folder:

```bash
cp ../../.env.example artifacts/api-server/.env
```

Then add the same server-side keys used by the backend:

```env
DATABASE_URL=mysql://careerstack:careerstack@localhost:3307/careerstack
NODE_ENV=development
PORT=3001             # ← MUST match the vite proxy target (see §5.2)
FRONTEND_PORT=5173
SKIP_ADMIN_CHECK=true
CLERK_SECRET_KEY=sk_test_xxx
LOG_LEVEL=info
```

> If you prefer to keep one file, symlink it: `ln -s ../../.env artifacts/api-server/.env`.
> Do not commit `.env` files (already in `.gitignore`).

---

## 5. Running the Project

### 5.1 Start MySQL (Docker)

```bash
docker compose pull mysql      # optional, downloads the image before starting
docker compose up -d mysql     # container: careerstack_mysql, host port 3307 → 3306
docker compose ps              # wait until healthcheck shows "healthy" (10s x 10 retries)
```

Verify connectivity:

```bash
nc -z localhost 3307 && echo "MySQL port open"     # or: mysql -h127.0.0.1 -P3307 -ucareerstack -pcareerstack careerstack
```

### 5.2 Create the database schema

```bash
pnpm --filter @workspace/db run push
# (drizzle-kit push; uses DATABASE_URL from the root .env)
```

> **IMPORTANT port note**: the vite dev proxy is hardcoded to `http://localhost:3001`
> (`artifacts/careerstack/vite.config.ts:38`) but `.env.example` sets the API on `3000`.
> Pick **one** and stick to it:
> - **Option A (recommended)**: set `PORT=3001` in `artifacts/api-server/.env` so the
>   API listens on 3001 and the vite proxy works — browse `http://localhost:5173`.
> - **Option B**: leave the API on `3000` and change the vite proxy target to `3000`,
>   then browse `http://localhost:5173`.
> - **Option C**: don't use vite proxy — browse `http://localhost:3000` directly
>   (in dev the backend proxies `/` to the frontend on `FRONTEND_PORT`). API on 3000.

### 5.3 Run the app (two or three terminals)

**Terminal 1 — Backend API** (from repo root):

```bash
pnpm --filter api-server run build    # esbuild → dist/index.js
pnpm --filter api-server run dev      # build + start; reads artifacts/api-server/.env
# or: pnpm --filter api-server run start
```

**Terminal 2 — Frontend dev server**:

```bash
pnpm --filter @workspace/careerstack run dev     # vite on 5173, proxies /api → 3001
```

**Terminal 3 (optional) — mockup-sandbox** (component previews on 5174):

```bash
pnpm --filter @workspace/mockup-sandbox run dev
```

URLs:
- API: `http://localhost:3001/api` (health: `http://localhost:3001/api/healthz`)
- Frontend: `http://localhost:5173` (or `http://localhost:3000` if using Option C)
- Mockup sandbox: `http://localhost:5174`

---

## 6. Project Architecture

```
MyProjectoryFinal/
├── package.json               # root: preinstall only-allow pnpm, build/typecheck scripts
├── pnpm-workspace.yaml        # packages: artifacts/*, lib/*, lib/integrations/*, scripts
├── docker-compose.yml         # MySQL 8.0 (port 3307)
├── .env.example               # STALE — use the template in §4 instead
├── README.md                  # STALE — says PostgreSQL, says @workspace/api-server
├── artifacts/
│   ├── api-server/            # Express 5 API (package name: "api-server", NOT @workspace/api-server)
│   │   ├── src/index.ts       # entry: dotenv/config, PORT || 3000
│   │   ├── src/app.ts         # /api router, /api/healthz, Clerk proxy, dev proxy
│   │   ├── src/routes/        # health, profile, projects, scores, roadmaps, jobs, portfolio, dashboard, etc.
│   │   ├── src/services/      # scoring, job fetcher, job-intelligence (Playwright scrapers)
│   │   ├── build.mjs          # esbuild CJS bundler
│   │   ├── create_waitlist_table.cjs
│   │   └── config/job_sources.json
│   ├── careerstack/           # React 19 + Vite frontend (package: @workspace/careerstack)
│   │   └── src/App.tsx        # ClerkProvider, routes, protected routes
│   └── mockup-sandbox/        # component preview sandbox (5174)
├── lib/
│   ├── db/                    # Drizzle schema + drizzle.config.ts (MySQL dialect)
│   ├── api-zod/               # generated Zod schemas
│   ├── api-spec/              # OpenAPI spec + Orval codegen
│   └── api-client-react/      # generated TanStack Query hooks
├── scripts/                   # run_scrape.ts, naukri_scraper.ts (Playwright)
├── deployment/                # PRODUCTION (cPanel) bundle — not for local dev
└── attached_assets/           # referenced by vite alias @assets
```

Key routes (`/api`): `GET /healthz` · profile CRUD · projects CRUD · scores (tech-comfort,
market-demand, job-readiness) · roadmaps + task toggle · jobs (list, matches, top-3-stacks,
trending-stacks, scrape, sources, add-source, scraped) · dashboard (summary, recent-activity) ·
domains · portfolio + public `/p/:slug` and `/p/private/:token` · analysis · waitlist.

Auth: `requireAuth`/`requireAdmin` are bypassed when `NODE_ENV=development && SKIP_ADMIN_CHECK=true`
(they return a fake `dev_user_id`). With `SKIP_ADMIN_CHECK=true` the Clerk middleware is not even
mounted, so no valid Clerk keys are needed on the backend.

---

## 7. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Docker "Cannot connect to the Docker daemon" | Start Docker Desktop (menu bar icon → wait for "Docker Desktop is running") |
| `pnpm --filter @workspace/api-server ...` → nothing matched | Package name is `api-server` (README is wrong). Use `pnpm --filter api-server ...` |
| `node: .env: not found` (exit 9) when starting API | `artifacts/api-server/.env` is missing — see §4.2 |
| `Error: DATABASE_URL must be set.` on boot | Missing `DATABASE_URL` in `artifacts/api-server/.env` and root `.env` |
| Frontend shows "Missing VITE_CLERK_PUBLISHABLE_KEY" | `App.tsx` throws if the var is absent — add it to the **root** `.env` (vite reads root via `envDir: "../../"`) |
| API 502/ECONNREFUSED on the frontend | vite proxy targets `localhost:3001` but API is on 3000 — see §5.2 |
| DB connection refused on `3307` | MySQL container not healthy; check `docker compose ps` and logs |
| `pnpm run typecheck` / `pnpm run build` fails | Known bug in `[id].tsx` — see §8 |
| Playwright "Executable doesn't exist" | Run `npx playwright install chromium` |

---

## 8. Common Errors

### 8.1 Root typecheck/build fails — `[id].tsx` TSX generic syntax error

`artifacts/careerstack/src/pages/roadmaps/[id].tsx:19`:

```ts
async <T>(url: string, init: RequestInit = {}): Promise<T> => {
```

In a `.tsx` file `<T>` is parsed as a JSX tag. **Verified fix** (trailing comma forces generic parse):

```ts
async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
```

After this change the frontend builds and the root typecheck passes. The file is the only
`.tsx` affected (the `.ts` hooks files using `<T>` are fine). Note: `git status` should be
clean otherwise — nothing else blocks the build.

### 8.2 Stale package/filter names (README vs reality)

| README says | Actual |
|---|---|
| `pnpm --filter @workspace/api-server run dev` | `pnpm --filter api-server run dev` |
| PostgreSQL | MySQL (mysql2 + drizzle MySQL dialect) |
| Docker postgres on 5432 | MySQL on host port **3307** |

### 8.3 `.env.example` is stale

It lacks `DATABASE_URL`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`,
`SKIP_ADMIN_CHECK`, Adzuna, and scheduler vars. Use the full template in §4.

### 8.4 Port mismatch (3000 vs 3001)

`vite.config.ts` proxies `/api` → `http://localhost:3001`, but the default API port is 3000.
Set `PORT=3001` in `artifacts/api-server/.env` (Option A) or change the proxy target (Option B).
The commit that changed the proxy (7e8bea8) introduced this drift.

### 8.5 Two `.env` files are required

Root `.env` (Vite/Drizzle/scripts) **and** `artifacts/api-server/.env` (backend `--env-file=.env`).

---

## 9. Verification Checklist

```bash
# 1. Dependencies
pnpm --version                      # 10.6.5
node --version                      # v22+ / v24+

# 2. Database
docker compose ps                   # careerstack_mysql "Up ... (healthy)"
nc -z localhost 3307                # success

# 3. Schema
pnpm --filter @workspace/db run push   # completes without errors

# 4. Backend
pnpm --filter api-server run build  # dist/index.js produced
pnpm --filter api-server run start  # logs "Server listening port: 3001"
curl -s http://localhost:3001/api/healthz   # {"status":"ok"}

# 5. Frontend
pnpm --filter @workspace/careerstack run dev
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173   # 200

# 6. Full typecheck (after applying the §8.1 fix)
pnpm run typecheck
```

If the public pages don't need login, hit the app at `http://localhost:5173`; sign-in/sign-up
require real Clerk keys (or keep the backend on `SKIP_ADMIN_CHECK=true` and note that frontend
Clerk UI won't authenticate without real keys).

---

## 10. Useful Commands

```bash
pnpm install                              # install workspace deps
pnpm run typecheck:libs                   # tsc --build for libs (passes)
pnpm run typecheck                        # full typecheck (blocked until §8.1 fix)
pnpm run build                            # typecheck + build all packages
pnpm --filter api-server run build        # esbuild backend bundle
pnpm --filter api-server run dev          # build + start backend (needs artifacts/api-server/.env)
pnpm --filter @workspace/careerstack run dev   # vite frontend (5173)
pnpm --filter @workspace/db run push      # push Drizzle schema to MySQL
pnpm --filter @workspace/db run push-force
pnpm --filter @workspace/scripts run scrape    # Playwright job scrape (needs root .env + chromium)
pnpm --filter @workspace/scripts run naukri    # Naukri scraper
node artifacts/api-server/create_waitlist_table.cjs   # standalone waitlist table creation
docker compose up -d                      # MySQL
docker compose down                       # stop MySQL
docker compose logs mysql                 # MySQL logs
npx playwright install chromium           # scraper browser
```

Database URL format used throughout: `mysql://user:pass@host:port/db`
(no `mysql2://` prefix in `DATABASE_URL` for local drizzle/mysql2; the deployment README
shows `mysql2://` for its own compiled entry point — local dev uses `mysql://`).

---

## 11. Notes for Future Developers

- **Read before trusting the README**: `README.md` documents PostgreSQL and an
  `@workspace/api-server` filter that do not exist. The authoritative references are
  `docker-compose.yml`, the package scripts, `vite.config.ts`, and this document.
- **Missing/needed credentials** (not committed anywhere):
  - Clerk API keys (`CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`) from https://dashboard.clerk.com
  - Adzuna app id/key (optional, job-fetch only)
- **Do not commit `.env`** files (gitignored).
- **Deployment** lives in `deployment/` (compiled `index.mjs` bundle for cPanel). It is a
  separate package (also named `@workspace/api-server`) with its own `deployment/README.md`;
  it is NOT part of the pnpm workspace and needs `.env.production`. Its `package.json` build
  script references `./build.mjs`, which is missing from the repo — production is updated by
  copying the fresh esbuild output, not by running `build` there.
- `initializeJobsSync()` is commented out in `app.ts` (line 15) — job feed sync only runs
  when re-enabled / via explicit scrape scripts. Job-intelligence scheduler is off by default.
- MySQL-specific fixes are documented in `DEPLOYMENT_SUMMARY.md` (e.g. Drizzle `insertId`
  array format, `onDuplicateKeyUpdate` instead of `onConflictDoUpdate`, Zod `.strict()`).
- Root `index.html` is a static coming-soon page (myProjectory) unrelated to the React app.
- No AI/ML models or Python tooling is used; everything is Node/TS.
