# LOCAL_DEVELOPMENT.md — MyProjectory Local Development Guide

> **Living document** — updated whenever a new setup requirement or common error
> is discovered. If something breaks, check this file first.

---

## Quick Start

For experienced developers who already have the prerequisites installed:

```bash
# 1. Clone
git clone https://github.com/pankhishukla/MyProjectoryFinal.git
cd MyProjectoryFinal

# 2. Install dependencies
pnpm install

# 3. Start MySQL (Docker)
docker compose up -d mysql
# Wait for healthy status: docker compose ps

# 4. Push database schema
pnpm --filter @workspace/db run push

# 5. Start backend (Terminal 1)
pnpm --filter api-server run dev

# 6. Start frontend (Terminal 2)
pnpm --filter @workspace/careerstack run dev

# 7. Open
# http://localhost:5173
```

---

## Prerequisites

| Tool | Version | How to check | How to install |
|------|---------|-------------|---------------|
| **Node.js** | 22+ (24+ recommended) | `node --version` | `brew install node` or [nodejs.org](https://nodejs.org/) |
| **pnpm** | **10.6.5** (exact, pinned) | `pnpm --version` | `npm install -g pnpm@10.6.5` |
| **Docker Desktop** | Latest (daemon must be running) | `docker version` | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| **Docker Compose** | v2+ (bundled with Docker Desktop) | `docker compose version` | Included with Docker Desktop |
| **Git** | Latest | `git --version` | `brew install git` |
| **Playwright** | 1.42.1 (for scrapers only) | `npx playwright --version` | `npx playwright install chromium` |

### Why pnpm 10.6.5 exactly?

The root `package.json` declares `"packageManager": "pnpm@10.6.5+sha512..."` and the
`preinstall` script runs `npx only-allow pnpm`. Using npm or yarn will fail. Using a
different pnpm version may cause lockfile conflicts.

### Why Node 22+?

The API server uses `node --env-file=.env` (available since Node 20.6) and the codebase
targets ES2022+. Node 22 LTS is the minimum recommended version.

---

## Repository Structure

```
MyProjectoryFinal/
├── package.json                  # Root: preinstall enforces pnpm, build/typecheck scripts
├── pnpm-workspace.yaml           # Workspace packages + catalog versions
├── docker-compose.yml            # MySQL 8.0 on host port 3307
├── .env                          # Root env (Vite, Drizzle, scripts read this)
├── .env.example                  # Template — STALE, see §Environment Variables
│
├── artifacts/
│   ├── api-server/               # Express 5 API (package name: "api-server")
│   │   ├── src/index.ts          # Entry point (dotenv/config, PORT || 3000)
│   │   ├── src/app.ts            # Express app: CORS, JSON, /api router, dev proxy
│   │   ├── src/routes/           # All API route handlers (15 files)
│   │   ├── src/middlewares/      # requireAuth, requireAdmin
│   │   ├── src/services/         # Scoring, job fetcher, job-intelligence (scrapers)
│   │   ├── build.mjs             # esbuild CJS bundler → dist/index.js
│   │   ├── .env                  # Backend-specific env (loaded via --env-file)
│   │   └── config/job_sources.json
│   │
│   ├── careerstack/              # React 19 + Vite 7 frontend (package: @workspace/careerstack)
│   │   ├── src/main.tsx          # React entry → ErrorBoundary → App
│   │   ├── src/App.tsx           # ClerkProvider, routes, auth gates
│   │   ├── src/lib/fakeClerk.tsx # Clerk SDK re-export + dev-without-clerk fallback
│   │   ├── src/pages/            # Page components (dashboard, jobs, scores, etc.)
│   │   ├── src/components/       # UI components (shadcn/Radix, layout, ErrorBoundary)
│   │   ├── src/hooks/            # API hooks (use-portfolio-api, use-jobs-api, etc.)
│   │   └── vite.config.ts        # Vite config: proxy /api → localhost:3001
│   │
│   └── mockup-sandbox/           # Component preview sandbox (optional, port 5174)
│
├── lib/
│   ├── db/                       # Drizzle ORM schema + MySQL connection (package: @workspace/db)
│   │   ├── src/index.ts          # MySQL pool + Drizzle instance
│   │   ├── src/schema/           # All table schemas (users, projects, roadmaps, etc.)
│   │   └── drizzle.config.ts     # Drizzle Kit config
│   ├── api-zod/                  # Generated Zod schemas (from OpenAPI spec)
│   ├── api-spec/                 # OpenAPI spec + Orval codegen config
│   └── api-client-react/         # Generated TanStack Query hooks + custom-fetch
│
├── scripts/                      # Playwright scrapers (run_scrape.ts, naukri_scraper.ts)
├── deployment/                   # Production cPanel bundle (NOT for local dev)
└── attached_assets/              # Static assets (referenced by @assets alias)
```

### Key facts

- **Database is MySQL** (NOT PostgreSQL — the README is wrong).
- **Package name** for the API server is `api-server` (NOT `@workspace/api-server`).
- **Two `.env` files** are required: root `.env` (Vite/Drizzle) and `artifacts/api-server/.env` (backend).
- **Port 3307** for MySQL (not 3306) — the Docker mapping is `3307:3306`.

---

## Installation from a Fresh Clone

### Step 1: Start Docker

```bash
docker version          # verify Docker is running
docker compose version  # verify Compose v2
```

If Docker is not running, start Docker Desktop and wait for the menu bar icon to
show "Docker Desktop is running".

### Step 2: Clone and install

```bash
git clone https://github.com/pankhishukla/MyProjectoryFinal.git
cd MyProjectoryFinal
pnpm install            # installs all workspace packages
```

### Step 3: Start MySQL

```bash
docker compose up -d mysql
docker compose ps       # wait until STATUS shows "(healthy)"
```

Verify the port is open:

```bash
nc -z localhost 3307 && echo "MySQL port open"
```

### Step 4: Configure environment variables

The `.env.example` at the repo root is **incomplete**. You need two `.env` files:

**File 1: Root `.env`** (used by Vite via `envDir: "../../"`, Drizzle, scripts):

```bash
cp .env.example .env
```

Then ensure these values are present:

```env
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=careerstack
MYSQL_USER=careerstack
MYSQL_PASSWORD=careerstack
DATABASE_URL=mysql://careerstack:careerstack@localhost:3307/careerstack

NODE_ENV=development
PORT=3001
FRONTEND_PORT=5173
SKIP_ADMIN_CHECK=true
LOG_LEVEL=info
```

**File 2: `artifacts/api-server/.env`** (loaded by `node --env-file=.env`):

```bash
cp .env.example artifacts/api-server/.env
```

Then ensure these values are present:

```env
DATABASE_URL=mysql://careerstack:careerstack@localhost:3307/careerstack
NODE_ENV=development
PORT=3001
FRONTEND_PORT=5173
SKIP_ADMIN_CHECK=true
CLERK_SECRET_KEY=sk_test_...
LOG_LEVEL=info
```

> **Port note**: `PORT=3001` is critical. The Vite dev proxy (`vite.config.ts:38`)
> targets `http://localhost:3001`. If the backend runs on a different port, API
> calls from the frontend will fail with `ECONNREFUSED`.

### Step 5: Push database schema

```bash
pnpm --filter @workspace/db run push
```

This runs `drizzle-kit push` which syncs the schema to MySQL. It uses `DATABASE_URL`
from the root `.env`.

### Step 6: Start the backend

```bash
pnpm --filter api-server run dev
# or: pnpm --filter api-server run build && pnpm --filter api-server run start
```

Verify:

```bash
curl -s http://localhost:3001/api/healthz
# Expected: {"status":"ok"}
```

### Step 7: Start the frontend

In a separate terminal:

```bash
pnpm --filter @workspace/careerstack run dev
```

Open **http://localhost:5173** in your browser.

---

## Environment Variables

### Required variables

| Variable | Used by | Purpose | Where to set |
|----------|---------|---------|-------------|
| `DATABASE_URL` | Backend + Drizzle | MySQL connection string | Root `.env` + `artifacts/api-server/.env` |
| `NODE_ENV` | Backend | `development` or `production` | Both `.env` files |
| `PORT` | Backend | Express listen port (must be `3001`) | Both `.env` files |
| `SKIP_ADMIN_CHECK` | Backend auth middleware | Bypasses Clerk in dev when `true` | Both `.env` files |
| `CLERK_SECRET_KEY` | Backend | Clerk authentication secret | `artifacts/api-server/.env` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend (Vite) | Clerk publishable key | Root `.env` |

### Optional variables

| Variable | Used by | Purpose | Default |
|----------|---------|---------|---------|
| `FRONTEND_PORT` | Backend dev proxy | Frontend port for proxy target | `5173` |
| `LOG_LEVEL` | Backend logger | Pino log level | `info` |
| `SERPAPI_API_KEY` | Backend scraper | SerpAPI key for market intel | empty |
| `ADZUNA_APP_ID` | Backend job sync | Adzuna API app ID | empty |
| `ADZUNA_API_KEY` | Backend job sync | Adzuna API key | empty |
| `VITE_API_URL` | Frontend | Production API base URL | empty |
| `VITE_API_TARGET` | Frontend vite proxy | Dev proxy target | `http://localhost:3001` |
| `BASE_PATH` | Frontend | Vite base path | `/` |

### About VITE_CLERK_PUBLISHABLE_KEY

The frontend uses Clerk for authentication. When this key is **missing** in
development mode, the app now shows a yellow banner and renders all routes
without auth (dev-without-clerk mode). The backend must still run with
`SKIP_ADMIN_CHECK=true` for API calls to succeed.

To use real Clerk authentication:
1. Create an account at https://dashboard.clerk.com
2. Create an application
3. Copy the **Publishable Key** (`pk_test_...`)
4. Add `VITE_CLERK_PUBLISHABLE_KEY=pk_test_...` to the root `.env`
5. Copy the **Secret Key** (`sk_test_...`)
6. Add `CLERK_SECRET_KEY=sk_test_...` to `artifacts/api-server/.env`

---

## Database Setup

### Starting MySQL

```bash
docker compose up -d mysql
```

This starts MySQL 8.0 in a container named `careerstack_mysql`:
- Host port: **3307** (mapped to container port 3306)
- Database: `careerstack`
- User: `careerstack` / Password: `careerstack`
- Root password: `rootpassword`

### Verifying MySQL is running

```bash
docker compose ps                          # should show "(healthy)"
nc -z localhost 3307                       # "MySQL port open"
mysql -h127.0.0.1 -P3307 -ucareerstack -pcareerstack careerstack -e "SELECT 1"
```

### Creating the database schema

```bash
pnpm --filter @workspace/db run push
```

This runs Drizzle Kit's `push` command which:
- Reads the schema from `lib/db/src/schema/`
- Compares it to the existing database
- Creates/alters tables to match

To force-recreate all tables (destructive):

```bash
pnpm --filter @workspace/db run push-force
```

### Resetting the database

```bash
docker compose down -v    # stops MySQL AND deletes the data volume
docker compose up -d mysql
pnpm --filter @workspace/db run push
```

### Common database errors

| Error | Cause | Fix |
|-------|-------|-----|
| `DATABASE_URL must be set` | Missing `DATABASE_URL` in `.env` | Add it to both `.env` files |
| `Connection refused` on port 3307 | MySQL container not running | `docker compose up -d mysql` |
| `Access denied for user` | Wrong credentials | Check `MYSQL_USER`/`MYSQL_PASSWORD` in `.env` |
| `Table doesn't exist` | Schema not pushed | Run `pnpm --filter @workspace/db run push` |

---

## Running the Application

### Terminal layout

```
Terminal 1 → Backend API    (port 3001)
Terminal 2 → Frontend       (port 5173)
Terminal 3 → (optional) DB logs, scrapers, etc.
```

### Terminal 1 — Backend API

```bash
cd MyProjectoryFinal
pnpm --filter api-server run dev
```

This runs `node ./build.mjs && node --env-file=.env ./dist/index.js`.

Expected output:

```
Server listening port: "3001"
```

### Terminal 2 — Frontend

```bash
cd MyProjectoryFinal
pnpm --filter @workspace/careerstack run dev
```

Expected output:

```
VITE v7.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Open in browser

- **http://localhost:5173** — Frontend (Vite proxies `/api` → backend on 3001)
- **http://localhost:3001/api/healthz** — Backend health check directly

### Stopping services

```bash
# Stop backend: Ctrl+C in Terminal 1
# Stop frontend: Ctrl+C in Terminal 2
# Stop MySQL: docker compose down
# Stop MySQL and delete data: docker compose down -v
```

---

## API Routes

All routes are under the `/api` prefix.

### Public routes (no auth)

- `GET /api/healthz` — Health check
- `POST /api/waitlist` — Join waitlist
- `GET /api/portfolio/public` — List public portfolios
- `GET /api/p/:slug` — Public portfolio by slug
- `GET /api/p/private/:token` — Portfolio by share token

### Authenticated routes (require `X-User-Id` header, or bypassed with `SKIP_ADMIN_CHECK=true`)

- `GET/POST/PATCH /api/profile` — User profile CRUD
- `GET/POST/GET:id/PATCH:id/DELETE:id /api/projects` — Project CRUD
- `GET /api/scores/*` — Tech comfort, market demand, job readiness scores
- `GET/POST/GET:id/DELETE:id /api/roadmaps` — Roadmap CRUD + task toggle
- `GET /api/jobs` — Job listings
- `GET /api/jobs/matches` — Job matches for user
- `GET /api/dashboard/summary` — Dashboard stats
- `GET /api/dashboard/recent-activity` — Recent activity
- `GET/POST /api/domains` — Domain management
- `GET/POST /api/portfolio/*` — Portfolio, skills, certifications
- `GET /api/analysis/*` — Weight analysis, strength breakdown
- `GET /api/stacks/*` — Stack details, domain suggestions

### Admin routes (require `X-User-Role: admin` header)

- `GET /api/jobs/scrape` — Trigger job scraping
- `GET /api/jobs/sources` — List scrape sources
- `POST /api/jobs/add-source` — Add scrape source
- `POST /api/jobs/scrape-naukri` — Scrape Naukri
- `POST /api/domains` — Create domain
- `PATCH /api/domains/:id` — Update domain
- `DELETE /api/domains/:id` — Delete domain

---

## Authentication Architecture

### How it works

1. **Frontend** uses `@clerk/clerk-react` for sign-in/sign-up UI
2. **Frontend** sends Clerk session tokens as `Authorization: Bearer <token>` headers
3. **Backend** `requireAuth` middleware verifies the token via `@clerk/backend`
4. **Backend** `requireAdmin` middleware additionally checks `user.publicMetadata.role === "admin"`

### Development bypass

When `NODE_ENV=development` AND `SKIP_ADMIN_CHECK=true`:

- Backend middleware skips Clerk verification
- Returns fake `dev_user_id` (or `mock_admin_id` for admin routes)
- Frontend renders without Clerk when `VITE_CLERK_PUBLISHABLE_KEY` is missing

### Without Clerk keys

If you don't have Clerk keys:
- The frontend shows a yellow "Dev mode (no Clerk)" banner
- All routes are accessible without sign-in
- API calls work because the backend skips auth with `SKIP_ADMIN_CHECK=true`
- You cannot test actual sign-in/sign-up flows

---

## Troubleshooting

### Blank screen

**Symptoms**: Page loads but shows nothing (white/blank screen).

**Likely causes**:
1. `VITE_CLERK_PUBLISHABLE_KEY` missing → app threw at module load (FIXED: now shows dev banner)
2. Backend not running → API calls fail, components may not render
3. Port mismatch → Vite proxy can't reach backend

**Diagnostic commands**:
```bash
# Check if backend is running
curl -s http://localhost:3001/api/healthz

# Check Vite is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173

# Check for JS errors — open browser DevTools (F12) → Console tab
```

**Fix**: Start the backend first (`pnpm --filter api-server run dev`), then the frontend.

### Backend won't start

**Symptoms**: `pnpm --filter api-server run dev` exits immediately or shows errors.

**Checks**:
```bash
# Is port 3001 already in use?
lsof -i :3001

# Is .env present in the api-server directory?
cat artifacts/api-server/.env | head -5

# Can it connect to MySQL?
nc -z localhost 3307
```

**Common causes**:
- Port 3001 already in use → kill the other process: `lsof -ti :3001 | xargs kill -9`
- Missing `artifacts/api-server/.env` → copy from root: `cp .env artifacts/api-server/.env`
- Missing `DATABASE_URL` → add to both `.env` files
- MySQL not running → `docker compose up -d mysql`

### Database connection failure

**Symptoms**: `Error: DATABASE_URL must be set` or `Connection refused`.

**Fix**:
```bash
# 1. Ensure MySQL is running
docker compose ps

# 2. Verify DATABASE_URL in both .env files
grep DATABASE_URL .env artifacts/api-server/.env

# 3. Test connection manually
mysql -h127.0.0.1 -P3307 -ucareerstack -pcareerstack careerstack -e "SHOW TABLES"
```

### Clerk authentication failure

**Symptoms**: "Authentication failed to load" or sign-in page shows error.

**Fix**:
- Ensure `VITE_CLERK_PUBLISHABLE_KEY` is in the root `.env` (starts with `pk_test_`)
- Ensure `CLERK_SECRET_KEY` is in `artifacts/api-server/.env` (starts with `sk_test_`)
- Both keys must be from the same Clerk application
- Get keys from https://dashboard.clerk.com

### CORS error

**Symptoms**: Browser console shows "Access-Control-Allow-Origin" error.

**Fix**: In development, CORS allows all origins. If you see this:
- Make sure `NODE_ENV=development` in both `.env` files
- Make sure you're accessing the frontend via `http://localhost:5173` (not the backend directly)

### Missing environment variable

**Symptoms**: App shows error about missing env var.

**How to identify**: The error message will name the variable.

**Fix**: Add the variable to the appropriate `.env` file and restart the service.

### Port already in use

**Symptoms**: `Error: listen EADDRINUSE: address already in use :::PORT`

**Fix**:
```bash
# Find what's using the port
lsof -i :3001     # for backend
lsof -i :5173     # for frontend

# Kill it
lsof -ti :3001 | xargs kill -9
```

### pnpm version mismatch

**Symptoms**: `This project is not configured with pnpm` or lockfile errors.

**Fix**:
```bash
npm install -g pnpm@10.6.5
pnpm --version    # should show 10.6.5
```

### "only-allow pnpm" error

**Symptoms**: `这不是使用 pnpm 的项目` or similar.

**Fix**: You're using npm or yarn. Use pnpm:
```bash
pnpm install      # not npm install
```

---

## Common Development Tasks

### Rebuild the API server after code changes

```bash
pnpm --filter api-server run build    # esbuild → dist/index.js
pnpm --filter api-server run start    # restart with new build
```

Or use `dev` which does both:

```bash
pnpm --filter api-server run dev
```

### Run Playwright scrapers

```bash
# Install Chromium first (one-time)
npx playwright install chromium

# Run scrapers
pnpm --filter @workspace/scripts run scrape
pnpm --filter @workspace/scripts run naukri
```

### Typecheck the project

```bash
pnpm run typecheck:libs    # libs only (always passes)
pnpm run typecheck         # full project (may fail due to known [id].tsx issue)
```

### Known issue: [id].tsx syntax error

`artifacts/careerstack/src/pages/roadmaps/[id].tsx:19` has:

```ts
async <T>(url: string, init: RequestInit = {}): Promise<T> => {
```

In `.tsx` files, `<T>` is parsed as a JSX tag. Fix by adding a trailing comma:

```ts
async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
```

---

## Notes for Future Developers

- **Read before trusting the README**: `README.md` documents PostgreSQL and
  `@workspace/api-server` filter — both are wrong. Trust this document instead.
- **The `.env.example` is stale**: it's missing most variables. Use the template in
  this document.
- **Two `.env` files**: root `.env` (Vite/Drizzle/scripts) AND
  `artifacts/api-server/.env` (backend).
- **MySQL port is 3307**, not 3306.
- **API package name** is `api-server`, not `@workspace/api-server`.
- **Auth bypass**: `SKIP_ADMIN_CHECK=true` + `NODE_ENV=development` skips all auth.
- **No Python/ML**: everything is Node.js/TypeScript.
- **Deployment** lives in `deployment/` — it's a separate bundle for cPanel, not
  part of local development.
