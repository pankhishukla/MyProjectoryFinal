# Production Bug Audit — Portfolio Module

**Date:** 2026-09-12
**Status:** Read-only diagnostic audit (no code changes made)
**Production URLs:** Frontend `https://myprojectory.com` · Backend `https://api.myprojectory.com` · DB: Aiven MySQL

---

## Executive Summary

The Portfolio page shows **"Unable to load portfolio."** because the frontend hooks use bare `fetch()` with relative URLs (e.g., `/api/portfolios/my`) that resolve to the **frontend origin** (`https://myprojectory.com`), not the backend origin (`https://api.myprojectory.com`). The backend lives on a separate subdomain with no reverse proxy configured on the frontend server. This is the same root cause affecting roadmaps (0 milestones, delete failure), stacks, jobs, and analysis hooks — any hook built with the manual `useAuthedFetch` pattern.

**Root cause category:** Frontend (incorrect API URL in production)
**Smallest safe fix:** Make `useAuthedFetch` prepend the `VITE_API_URL` base URL, matching what `customFetch` does.

---

## 1. Complete Request Trace

### What the frontend sends

| Step | Detail |
|------|--------|
| **File** | `artifacts/careerstack/src/hooks/use-portfolio-api.ts:343-359` |
| **Hook** | `useMyPortfolio()` |
| **Call** | `apiFetch<PortfolioResponse>("/api/portfolios/my")` |
| **Fetch helper** | `useAuthedFetch()` at line 133, which calls `fetch(url, ...)` (line 146) |
| **Resulting URL** | `https://myprojectory.com/api/portfolios/my` (browser resolves relative URL to current origin) |

### What the backend expects

| Step | Detail |
|------|--------|
| **File** | `artifacts/api-server/src/routes/portfolio.ts:672-692` |
| **Route** | `GET /api/portfolios/my` (mounted under `/api` by `app.ts:69`) |
| **Expected URL** | `https://api.myprojectory.com/api/portfolios/my` |

### Where it fails

The request to `https://myprojectory.com/api/portfolios/my` hits the **frontend's web server** (Apache/cPanel serving static files). There is no reverse proxy configured (no `.htaccess`, `nginx.conf`, or similar exists in the repo). The server returns either:

- **404 HTML page** → `response.json()` fails → `FetchError("HTTP 404", 404)` → `useMyPortfolio` catches 404 and returns `null` → shows "Generate your portfolio" (NOT "Unable to load portfolio.")
- **SPA catch-all returns 200 with HTML** (if the hosting platform has SPA routing) → `response.text()` returns HTML → `JSON.parse(html)` throws `SyntaxError` → NOT a 404 error → propagates to React Query → `error` is truthy → shows **"Unable to load portfolio."**

The second scenario (SPA catch-all) is what produces the observed "Unable to load portfolio." message.

---

## 2. Why Profile Works But Portfolio Doesn't

| Aspect | Profile (works) | Portfolio (broken) |
|--------|-----------------|-------------------|
| **Hook source** | Orval-generated `useGetProfile` | Manual `useMyPortfolio` |
| **Fetch mechanism** | `customFetch` from `@workspace/api-client-react` | Local `useAuthedFetch` with bare `fetch()` |
| **Base URL** | `setBaseUrl("https://api.myprojectory.com")` applied (App.tsx:46-48) | **No base URL** — relative path resolves to frontend origin |
| **Production URL** | `https://api.myprojectory.com/api/profile` ✅ | `https://myprojectory.com/api/portfolios/my` ❌ |
| **Auth token** | `setAuthTokenGetter()` via module config | `useAuth().getToken()` per-hook (works correctly) |

**Key files:**
- `App.tsx:46-48` — sets base URL for Orval only
- `lib/api-client-react/src/custom-fetch.ts:63-73` — `applyBaseUrl()` prepends base URL
- `artifacts/careerstack/src/hooks/use-portfolio-api.ts:146` — bare `fetch(url)` ignores base URL

---

## 3. All Affected Hooks (Same Root Cause)

Every hook that uses the manual `useAuthedFetch` pattern with bare `fetch()` is affected:

| Hook File | Hooks Affected | Backend Endpoints |
|-----------|---------------|-------------------|
| `use-portfolio-api.ts` | `useMyPortfolio`, `useGeneratePortfolio`, `useUpdatePortfolio`, `useUpdatePortfolioProjects`, `usePublishPortfolio`, `useListSkills`, `useAddSkill`, `useDeleteSkill`, `useListCertifications`, `useAddCertification`, `useDeleteCertification`, `useListProjectStackTags`, `useTagProjectToStack`, `useRemoveProjectStackTag`, `usePublicPortfolios`, `usePublicPortfolioBySlug`, `usePublicPortfolioByToken` | `/api/portfolios/*`, `/api/portfolio/*`, `/api/p/*` |
| `use-stack-api.ts` | `useStackDetail`, `useLinkDomainToStack`, `useDomainSuggestions` | `/api/stacks/*` |
| `use-jobs-api.ts` | `useListJobs`, `useJobDetail`, `useSaveJob`, `useListSavedJobs` | `/api/job-listings/*` |
| `use-analysis-api.ts` | `useGetWeights`, `useSaveWeights`, `useStrengthBreakdown`, `useMarketAlignment` | `/api/analysis/*` |
| `roadmaps/[id].tsx` | `useRoadmapDetail`, `useToggleRoadmapTask` (inline) | `/api/roadmaps/*` |
| `roadmaps/index.tsx` | `fetchTrendingStacks`, delete roadmap (raw fetch) | `/api/jobs/trending-stacks`, `/api/roadmaps/:id` |

---

## 4. Backend Route Analysis

### GET /api/portfolios/my

**File:** `artifacts/api-server/src/routes/portfolio.ts:672-692`

```
1. requireAuth middleware verifies Clerk JWT → sets req.clerkUserId
2. getUserId(clerkId) → SELECT id FROM users WHERE clerk_id = ?
3. If userId is null → 404 "Portfolio not found"
4. getPortfolioRows(WHERE student_id = userId) → complex 4-table JOIN query
5. buildPortfolioResponse(rows) → transforms flat rows into nested JSON
6. If response is null → 404 "Portfolio not found"
7. Return JSON response
```

**Potential secondary issue:** `getUserId` (line 23-26) is used instead of `getOrCreateUserId`. If the authenticated Clerk user has no row in the `users` table, this returns `null` and the route returns 404. The profile route uses `getOrCreateUserId` which auto-creates the user. However, the frontend handles 404 by returning `null` (showing "Generate your portfolio"), NOT "Unable to load portfolio." So this is not the primary cause.

### Authentication Middleware

**File:** `artifacts/api-server/src/middlewares/requireAuth.ts:46-80`

- Production path: extracts Bearer token → `verifyToken(token, { secretKey })` → sets `req.clerkUserId = session.sub`
- The middleware itself is correct and working (profile uses the same middleware)

### User Lookup

**File:** `artifacts/api-server/src/routes/portfolio.ts:23-26`

```sql
SELECT id FROM users WHERE clerk_id = ?
```

**Must verify in production:** Does the authenticated Clerk user have a matching row in the `users` table? If not, `getUserId` returns null → 404. This is a data issue, not a code issue.

---

## 5. Database Schema

**File:** `artifacts/api-server/src/lib/db/schema/portfolio.ts`

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | `id`, `clerk_id` (UNIQUE), `name`, `email` |
| `portfolios` | Portfolio metadata | `id`, `student_id` (FK→users), `slug` (UNIQUE), `share_token` |
| `portfolio_projects` | Join table | `portfolio_id`, `project_id`, `display_order`, `is_featured` |
| `projects` | User projects | `id`, `user_id` (FK→users), `title`, `technologies` (JSON) |
| `user_skills` | User skills | `user_id`, `name`, `proficiency_level` |
| `user_certifications` | User certs | `user_id`, `name`, `issuing_body` |
| `project_stack_tags` | Project→stack links | `project_id`, `stack_id` |

**Portfolio query joins:** `portfolios` INNER JOIN `users` LEFT JOIN `portfolio_projects` LEFT JOIN `projects`

---

## 6. API Response Shape Expected by Frontend

**File:** `artifacts/careerstack/src/hooks/use-portfolio-api.ts:67-90`

```json
{
  "id": 1,
  "studentId": 1,
  "title": "Portfolio Title",
  "bio": "...",
  "avatarUrl": "...",
  "theme": "default",
  "visibility": "public|private",
  "slug": "...",
  "shareToken": "...",
  "publishedAt": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "student": { "id": 1, "name": "...", "email": "...", "avatarUrl": "..." },
  "projects": [{ "id": 1, "title": "...", "technologies": [...], ... }],
  "projectsCount": 3,
  "techScores": [{ "technology": "React", "projectCount": 3, "comfortScore": 85, "confidenceLevel": "high" }],
  "topTechs": ["React", "Node.js"]
}
```

The backend `buildPortfolioResponse` (portfolio.ts:183-237) produces this exact shape.

---

## 7. Error Handling Chain

```
Browser fetch("https://myprojectory.com/api/portfolios/my")
  → Returns HTML (200 SPA catch-all or 404)
  → useAuthedFetch: response.json() fails (HTML not JSON)
  → FetchError thrown (statusCode undefined or 404)
  → useMyPortfolio queryFn catch block:
      if statusCode === 404 → return null (shows "Generate your portfolio")
      else → throw error (React Query sets error = truthy)
  → Portfolio page renders "Unable to load portfolio."
```

---

## 8. Configuration Analysis

### Frontend Environment

**File:** `.env`

| Variable | Value | Impact |
|----------|-------|--------|
| `VITE_API_URL` | `https://api.myprojectory.com` | Only used by Orval `customFetch` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Test key in what should be production |
| `CORS_ORIGIN` | `https://myprojectory.com,https://www.myprojectory.com` | Backend CORS whitelist |

### Backend Environment

**File:** `artifacts/api-server/.env`

| Variable | Value | Impact |
|----------|-------|--------|
| `NODE_ENV` | `development` | **Mismatch** — should be `production` on the server |
| `SKIP_ADMIN_CHECK` | `true` | **Bypasses all auth** in development mode |
| `CLERK_SECRET_KEY` | `sk_test_...` | Test key — should be `sk_live_...` in production |
| `DATABASE_URL` | Local MySQL | Should be Aiven URL in production |

### Domain Mismatch

- `deployment/README.md:9` says production domain is `https://projectory.com`
- `.env:76` sets `VITE_API_URL=https://api.myprojectory.com`
- `.env:84` sets `CORS_ORIGIN=https://myprojectory.com`
- User reports frontend at `https://myprojectory.com`

**Note:** These are local `.env` values. Production `.env.production` on the server may differ. The local `.env` appears to contain development/test credentials.

---

## 9. Differences Between Local and Production

| Aspect | Local Development | Production |
|--------|-------------------|------------|
| API proxy | Vite dev proxy forwards `/api/*` → `localhost:3001` | No proxy — manual fetch hits frontend origin |
| Auth bypass | `SKIP_ADMIN_CHECK=true` → mock user | `SKIP_ADMIN_CHECK=false` → real Clerk JWT |
| Database | Local Docker MySQL | Aiven MySQL (cloud) |
| Clerk keys | Test keys (`sk_test_`, `pk_test_`) | Should be live keys (`sk_live_`, `pk_live_`) |
| `NODE_ENV` | `development` | Should be `production` |

The Vite dev proxy (`vite.config.ts:38-42`) masks the URL problem in development. All `/api/*` requests are forwarded to the backend, so both Orval and manual hooks work identically.

---

## 10. Whether Frontend Calls Correct Production API URL

**Orval-generated hooks:** YES — `setBaseUrl("https://api.myprojectory.com")` is applied.

**Manual `useAuthedFetch` hooks:** NO — bare `fetch("/api/...")` resolves to `https://myprojectory.com/api/...`.

---

## 11. Whether Authenticated Clerk User Has Matching DB Row

**Must be verified in production database.** The query would be:

```sql
SELECT id, clerk_id, name, email FROM users WHERE clerk_id = '<clerk_user_sub>';
```

If no row exists, `getUserId` returns null → 404. However, this produces "Generate your portfolio" (not "Unable to load portfolio."), so this is NOT the primary issue. It could be a secondary issue if the user also can't generate a portfolio.

---

## 12. Issues Categorized

| # | Issue | Category | Severity | Primary/Secondary |
|---|-------|----------|----------|-------------------|
| 1 | Manual `useAuthedFetch` hooks use bare `fetch()` without base URL | **Frontend** | **Critical** | **Primary** |
| 2 | No reverse proxy configured on frontend server for `/api/*` | **Deployment** | High | Primary (alternative fix) |
| 3 | `getUserId` used instead of `getOrCreateUserId` in portfolio routes | **Backend** | Medium | Secondary |
| 4 | `NODE_ENV=development` and `SKIP_ADMIN_CHECK=true` in local `.env` | **Configuration** | Low | Informational |
| 5 | Test Clerk keys in local `.env` | **Configuration** | Low | Informational |
| 6 | Domain mismatch (`projectory.com` vs `myprojectory.com`) | **Configuration** | Medium | Must verify |
| 7 | Skills/certifications routes lack try/catch error handling | **Backend** | Low | Secondary |

---

## 13. The Smallest Safe Fix

### Option A (Recommended): Fix the frontend fetch helper

Modify `useAuthedFetch` in all four hook files (+ two inline definitions) to prepend `import.meta.env.VITE_API_URL` when available, matching what `customFetch` does.

**Files to modify:**
1. `artifacts/careerstack/src/hooks/use-portfolio-api.ts` — `useAuthedFetch()` (line 133) and `usePublicFetch()` (line 165)
2. `artifacts/careerstack/src/hooks/use-stack-api.ts` — `useAuthedFetch()` (line 52)
3. `artifacts/careerstack/src/hooks/use-jobs-api.ts` — `useAuthedFetch()` (line 39)
4. `artifacts/careerstack/src/hooks/use-analysis-api.ts` — `useAuthedFetch()` (line 39)
5. `artifacts/careerstack/src/pages/roadmaps/index.tsx` — inline `fetchTrendingStacks` and delete handler
6. `artifacts/careerstack/src/pages/roadmaps/[id].tsx` — inline `useAuthedFetch()` and `useRoadmapDetail`

**The change:** In each `useAuthedFetch`, read the base URL and prepend it:

```typescript
function useAuthedFetch() {
  const { getToken } = useAuth();
  const baseUrl = import.meta.env.VITE_API_URL || "";

  return useCallback(
    async <T>(url: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Prepend base URL to relative paths (same as customFetch)
      const fullUrl = url.startsWith("/") && baseUrl ? `${baseUrl}${url}` : url;
      const response = await fetch(fullUrl, { ...init, headers });
      // ... rest unchanged
    },
    [getToken, baseUrl],
  );
}
```

### Option B (Alternative): Add Apache reverse proxy

Add `.htaccess` to the frontend's `public_html/` to proxy `/api/*` to the backend:

```apache
RewriteEngine On
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule /api/(.*) ws://127.0.0.1:3001/$1 [P,L]
RewriteCond %{HTTP:Upgrade} !=websocket [NC]
RewriteRule /api/(.*) http://127.0.0.1:3001/$1 [P,L]
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
```

**Drawback:** Requires server access and couples frontend/backend deployment. Option A is cleaner.

### Option C (Most aligned with existing architecture): Migrate all hooks to Orval

Replace all manual `useAuthedFetch` hooks with Orval-generated hooks. This is the largest change but aligns with the existing pattern used by profile, dashboard, and scores.

---

## 14. How to Verify the Fix in Production

### Step 1: Pre-fix verification (confirm the issue)

1. Open browser DevTools → Network tab
2. Navigate to Portfolio page
3. Check the failed request: should show `GET https://myprojectory.com/api/portfolios/my` (wrong URL)
4. The request should return HTML (not JSON)

### Step 2: After deploying the fix

1. Open browser DevTools → Network tab
2. Navigate to Portfolio page
3. Check the request: should now show `GET https://api.myprojectory.com/api/portfolios/my` (correct URL)
4. The response should be JSON with portfolio data (or 404 if no portfolio exists yet)
5. The Portfolio page should show either:
   - "Generate your portfolio" (if 404 — no portfolio exists yet) ✅
   - The full portfolio view (if portfolio exists) ✅

### Step 3: Regression testing

1. Profile page — should still work (Orval hooks unaffected)
2. Dashboard — should still work (Orval hooks)
3. Scores — Orval hooks should still work; analysis sub-sections should now work
4. Roadmaps — list should still work; detail page and delete should now work
5. Portfolio — all operations (generate, edit, publish, skills, certifications) should work

### Step 4: Verify other affected modules

1. Stack detail page (`/stacks/:id`) — should load
2. Job listings — should load
3. Analysis (weights, strength breakdown, market alignment) — should load

---

## 15. Additional Production Data Checks Required

These cannot be verified via code audit alone:

1. **Does the `users` table have a row for the authenticated Clerk user?**
   ```sql
   SELECT id, clerk_id, name, email FROM users WHERE clerk_id = '<clerk_sub>';
   ```

2. **Does the `portfolios` table have a row for this user?**
   ```sql
   SELECT * FROM portfolios WHERE student_id = <user_id>;
   ```

3. **Does the `portfolio_projects` table have links?**
   ```sql
   SELECT * FROM portfolio_projects WHERE portfolio_id = <portfolio_id>;
   ```

4. **Is the production `.env.production` on the server configured correctly?**
   - `NODE_ENV=production`
   - `SKIP_ADMIN_CHECK=false`
   - `CLERK_SECRET_KEY` starts with `sk_live_`
   - `DATABASE_URL` points to Aiven MySQL

5. **Is the Clerk production instance configured with `myprojectory.com` as an allowed origin?**

6. **Is the Apache server on cPanel running and configured to serve the frontend?**

---

## 17. Implementation Details

### Fix applied: 2026-09-12

**Root cause confirmed:** Manual `useAuthedFetch` hooks used bare `fetch(url)` with relative paths, resolving to the frontend origin instead of the backend origin.

### Files changed

| # | File | Change |
|---|------|--------|
| 1 | `artifacts/careerstack/src/lib/api-fetch.ts` | **NEW** — Shared `resolveApiUrl`, `useAuthedFetch`, `usePublicFetch`, `FetchError` |
| 2 | `artifacts/careerstack/src/hooks/use-portfolio-api.ts` | Removed local `useAuthedFetch`, `usePublicFetch`, `FetchError`. Imports from shared module. |
| 3 | `artifacts/careerstack/src/hooks/use-stack-api.ts` | Removed local `useAuthedFetch`. Imports from shared module. |
| 4 | `artifacts/careerstack/src/hooks/use-jobs-api.ts` | Removed local `useAuthedFetch`. Imports from shared module. |
| 5 | `artifacts/careerstack/src/hooks/use-analysis-api.ts` | Removed local `useAuthedFetch`. Imports from shared module. |
| 6 | `artifacts/careerstack/src/pages/roadmaps/index.tsx` | Replaced raw `fetch()` calls with `useAuthedFetch` (adds auth + base URL). |
| 7 | `artifacts/careerstack/src/pages/roadmaps/[id].tsx` | Removed inline `useAuthedFetch`. Imports from shared module. |

### Exact logic

```typescript
// lib/api-fetch.ts — core resolution
const API_BASE_URL: string = import.meta.env.VITE_API_URL || "";

export function resolveApiUrl(url: string): string {
  if (!API_BASE_URL) return url;          // local dev: no-op (Vite proxy handles /api)
  if (!url.startsWith("/")) return url;   // absolute URLs pass through
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${url}`;                 // "/api/portfolios/my" → "https://api.myprojectory.com/api/portfolios/my"
}
```

Each `useAuthedFetch` hook calls `resolveApiUrl(url)` before passing the URL to `fetch()`. In production, `VITE_API_URL=https://api.myprojectory.com` is baked into the bundle at build time. In local development, it's empty and paths pass through to the Vite dev proxy.

### Commands executed

```bash
# Typecheck (5 pre-existing errors, 0 new)
npx tsc --noEmit --project artifacts/careerstack/tsconfig.json

# Production build (success)
VITE_API_URL=https://api.myprojectory.com VITE_CLERK_PUBLISHABLE_KEY=pk_test_... \
  pnpm --filter @workspace/careerstack run build
```

### Typecheck results

| Error | File | Pre-existing? |
|-------|------|:---:|
| TS7030: Not all code paths return a value | `duration-roller.tsx:58` | Yes |
| TS2339: Property 'startDate' does not exist on type 'Project' | `portfolio/[id].tsx:138` | Yes |
| TS2339: Property 'endDate' does not exist on type 'Project' | `portfolio/[id].tsx:139` | Yes |
| TS2339: Property 'startDate' does not exist on type 'Project' | `portfolio/[id].tsx:138` | Yes |
| TS2339: Property 'endDate' does not exist on type 'Project' | `portfolio/[id].tsx:139` | Yes |

**0 new errors introduced by this change.**

### Build output verification

The bundled JS contains the resolved base URL constant:
```
const _1e="https://api.myprojectory.com";
function VY(e){return e.startsWith("/")?`${_1e.replace(/\/+$/,"")}${e}`:e}
```

This confirms `resolveApiUrl` is included and the `VITE_API_URL` is correctly baked in.

### Production verification steps

1. Deploy the updated build to production
2. Open browser DevTools → Network tab
3. Navigate to Portfolio page
4. Verify the request URL is now `https://api.myprojectory.com/api/portfolios/my` (not `https://myprojectory.com/api/portfolios/my`)
5. Verify the response is JSON (not HTML)
6. Test these flows:
   - Portfolio loading and generation
   - Roadmap detail page loading
   - Roadmap deletion
   - Stack detail page
   - Job listings
   - Analysis (weights, strength breakdown, market alignment)

---

## 16. Summary

| Question | Answer |
|----------|--------|
| **Is the issue frontend, backend, auth, DB, or deployment?** | **Frontend** (primary) — wrong URL in manual fetch hooks. Also **deployment** — no reverse proxy. |
| **What is the root cause?** | Manual `useAuthedFetch` hooks call `fetch("/api/...")` which resolves to the frontend origin, not the API server origin. |
| **Why does profile work?** | Profile uses Orval-generated `customFetch` which prepends `VITE_API_URL`. |
| **What is the smallest safe fix?** | Created shared `api-fetch.ts` module with `resolveApiUrl` + `useAuthedFetch` + `usePublicFetch`. Updated 6 consumer files to import from it. |
| **What could go wrong?** | If `VITE_API_URL` is not set at build time, requests would still go to the frontend origin. Build verification confirmed the URL is baked in. |
| **What must be checked in production?** | User existence in `users` table, portfolio existence, `.env.production` configuration, Clerk live keys. |
| **Status** | Fix implemented and verified locally. Ready to commit, deploy, and test in production. |
