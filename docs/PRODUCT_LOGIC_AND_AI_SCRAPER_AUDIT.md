# MyProjectory (CareerStack AI) — Product Logic & AI/Scraper Audit

> Generated: 2026-09-12 — Read-only audit. No code changes made.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What Already Exists](#2-what-already-exists)
3. [What Is Incomplete](#3-what-is-incomplete)
4. [What Is Broken](#4-what-is-broken)
5. [SerpAPI & Scraper Architecture](#5-serpapi--scraper-architecture)
6. [AI Provider & AI Services](#6-ai-provider--ai-services)
7. [Resume Parsing & Analysis Flow](#7-resume-parsing--analysis-flow)
8. [Job Description Parsing Flow](#8-job-description-parsing-flow)
9. [Resume-to-Job Matching Logic](#9-resume-to-job-matching-logic)
10. [Score & Readiness Calculation Logic](#10-score--readiness-calculation-logic)
11. [Roadmap Generation Flow](#11-roadmap-generation-flow)
12. [Environment Variables](#12-environment-variables)
13. [Database Tables Involved](#13-database-tables-involved)
14. [API Endpoints Involved](#14-api-endpoints-involved)
15. [Frontend Pages Consuming Scraper/AI Data](#15-frontend-pages-consumingscraperai-data)
16. [Current Data Flow](#16-current-data-flow)
17. [Current API Flow](#17-current-api-flow)
18. [Current Database Flow](#18-current-database-flow)
19. [Missing Pieces](#19-missing-pieces)
20. [Recommended Implementation Order](#20-recommended-implementation-order)
21. [Risks](#21-risks)
22. [Files Reference](#22-files-reference)

---

## 1. Executive Summary

MyProjectory (branded "CareerStack AI") is a monorepo with:

- **Backend**: Express + Drizzle ORM + MySQL (Aiven)
- **Frontend**: React + Vite + TailwindCSS + React Query
- **Auth**: Clerk
- **Scraping**: SerpAPI + Playwright (Naukri) + axios/cheerio (Greenhouse/Lever/Generic) + Adzuna REST API
- **AI/LLM**: **Not implemented.** Zero LLM SDK imports, zero API calls, zero prompt templates exist. The "AI" label is marketing copy only.

**Key Finding**: All features marketed as "AI-powered" (roadmap generation, strength insights, career recommendations) are implemented using deterministic algorithms — regex keyword matching, weighted arithmetic formulas, hardcoded templates, and statistical frequency counting.

---

## 2. What Already Exists

### Scraper/Intelligence Pipeline (Fully Implemented)
| Component | File | Status |
|-----------|------|--------|
| SerpAPI Google Jobs search | `src/services/job-intelligence/serpapiSearch.ts` | Working |
| HTML scraper (Greenhouse/Lever/Generic) | `src/services/job-intelligence/scraper.ts` + `parser.ts` | Working |
| Naukri Playwright scraper | `src/services/job-intelligence/naukriScraper.ts` | Working |
| Adzuna REST API fetcher | `src/services/jobFetcher.ts` | Working |
| Tech stack keyword extractor (130+ rules) | `src/services/job-intelligence/techStackExtractor.ts` | Working |
| Trend analyzer (frequency stats) | `src/services/job-intelligence/trendAnalyzer.ts` | Working |
| Cron scheduler (disabled by default) | `src/services/job-intelligence/scheduler.ts` | Working but disabled |
| Job sources config (18 URLs) | `config/job_sources.json` | Working |
| Frontend admin scraping portal | `src/pages/admin/scraping.tsx` | Working |

### Scoring & Analysis Pipeline (Fully Implemented — Algorithmic)
| Component | File | Status |
|-----------|------|--------|
| Dynamic weight calibration | `src/services/scoring.service.ts` | Working |
| Readiness score calculation | `src/services/scoring.service.ts:121` | Working |
| Tech comfort scoring | `src/routes/scores.ts:21` | Working |
| Market demand scoring | `src/routes/scores.ts:68` | Working |
| Strength analysis (top skills/domains) | `src/routes/scores.ts:174` | Working |
| Trend alignment (skill overlap %) | `src/routes/scores.ts:219` | Working |
| 5-dimension strength breakdown | `src/routes/analysis.ts:53` | Working |
| Market alignment analysis | `src/routes/analysis.ts:140` | Working |
| Frontend scores page | `src/pages/scores.tsx` | Working |

### Roadmap System (Implemented — Template-Based)
| Component | File | Status |
|-----------|------|--------|
| Roadmap generation from templates | `src/routes/roadmaps.ts:94` | Working (3 templates + generic) |
| Task toggle + skill sync | `src/routes/roadmaps.ts:229` | Working |
| Milestone/task CRUD | `src/routes/roadmaps.ts` | Working |
| Frontend roadmaps pages | `src/pages/roadmaps/index.tsx`, `[id].tsx` | Working |

### Job Matching (Implemented — Skill-Based)
| Component | File | Status |
|-----------|------|--------|
| Skill-based job matching | `src/routes/jobs.ts:42` | Working |
| Job listing CRUD | `src/routes/jobs.ts`, `job-listings.ts` | Working |
| Frontend jobs page | `src/pages/jobs.tsx` | Working |

### Portfolio System (Implemented — Manual Entry)
| Component | File | Status |
|-----------|------|--------|
| Portfolio CRUD | `src/routes/portfolio.ts` | Working |
| Skills/certifications management | `src/routes/portfolio.ts` | Working |
| Public portfolio sharing | `src/routes/portfolio.ts` | Working |
| PDF generation (output only) | `src/lib/pdf-generator.ts` | Working |
| Frontend portfolio pages | `src/pages/portfolio/`, `public-portfolio.tsx` | Working |

---

## 3. What Is Incomplete

### Missing AI/LLM Integration
| Feature | Expected | Actual | Status |
|---------|----------|--------|--------|
| OpenAI/Anthropic/Gemini SDK | Installed | Not installed | **MISSING** |
| LLM API calls | Present in code | Zero calls | **MISSING** |
| Prompt templates | System/user prompts | None exist | **MISSING** |
| AI roadmap generation | Dynamic, personalized | Hardcoded templates (3 techs only) | **STUBBED** |
| AI strength insights | Intelligent analysis | Rule-based string concatenation | **STUBBED** |
| AI career recommendations | Contextual advice | None | **MISSING** |
| AI skill gap analysis | Role-specific analysis | Basic trend alignment only | **MISSING** |
| AI resume analysis | Parse + analyze resume | No resume system exists | **MISSING** |

### Missing Resume System
| Feature | Status |
|---------|--------|
| Resume upload endpoint | **MISSING** — No multer, no multipart handling |
| PDF text extraction | **MISSING** — No pdf-parse, no pdfjs-dist |
| Resume parsing (sections, skills, experience) | **MISSING** |
| Resume-to-job matching | **MISSING** — Only manual skill matching exists |
| Resume scoring/analysis | **MISSING** |
| Resume database table | **MISSING** |

### Missing Scrapers
| Platform | Status |
|----------|--------|
| LinkedIn | **MISSING** — No code, no routes, no config |
| Indeed | **MISSING** — No code, no routes, no config |
| Glassdoor | **MISSING** — No code, no routes, no config |
| Monster | **MISSING** — No code, no routes, no config |

### Incomplete Features
| Feature | Status |
|---------|--------|
| Manual weight configuration | **DISABLED** — PUT `/analysis/weights` returns 403 |
| `user_score_weights` table | **SCHEMA ONLY** — Never populated, dynamic calc bypasses it |
| `career_goal` field on users | **UNUSED** — Exists in schema, never referenced in scoring/matching |
| Dedicated skill gap analysis endpoint | **MISSING** — Only `trend-alignment` shows missing skills |
| Career path generation | **MISSING** |
| Learning path optimization | **MISSING** — Templates are static, not personalized |

---

## 4. What Is Broken

### Dashboard Score Inconsistency
- **File**: `src/routes/dashboard.ts:56-66`
- **Issue**: Dashboard uses a simplified hardcoded formula: `comfort*0.35 + roadmap*0.25 + portfolio*0.15`
- **File**: `src/routes/scores.ts:98-172`
- **Expected**: Should use `calculateReadinessScore()` from `scoring.service.ts` with dynamic weights
- **Impact**: Dashboard readiness score differs from Scores page readiness score for the same user

### Duplicated Tech Comfort Scoring
- **File 1**: `src/routes/portfolio.ts:94-136` — `computeTechScores()`
- **File 2**: `src/routes/scores.ts:21-66` — Inline logic
- **Issue**: Identical logic duplicated across two files
- **Impact**: Maintenance risk if one is updated without the other

### Missing `logger` Import in `roadmaps.ts` (Production Bug)
- **File**: `src/routes/roadmaps.ts:3`
- **Issue**: `logger` was used on lines 183, 191 but not imported from `../lib/db/index.js`
- **Impact**: `GET /api/roadmaps/:id` throws ReferenceError → 500 → Frontend shows "Roadmap not found"
- **Fix**: Add `logger` to import statement (applied in current session)

---

## 5. SerpAPI & Scraper Architecture

### SerpAPI Integration
- **File**: `src/services/job-intelligence/serpapiSearch.ts` (220 lines)
- **Package**: `serpapi` npm package (dynamic import)
- **Engine**: `google_jobs`
- **Normalization**: Results → `ScrapedJobData` via `normalizeGoogleJob()`
- **Tech extraction**: `extractTechStack()` from `techStackExtractor.ts`
- **Rate limiting**: 1-second delay between batch queries
- **Error handling**: 429 (rate limit) and auth errors caught gracefully

### HTML Scraper (Greenhouse/Lever/Generic)
- **File**: `src/services/job-intelligence/scraper.ts` (173 lines) + `parser.ts` (275 lines)
- **Technology**: axios + cheerio
- **Platform detection**: URL pattern matching (Greenhouse, Lever, generic)
- **Greenhouse**: JSON API from `boards-api.greenhouse.io`, HTML-stripped
- **Lever**: JSON API from `api.lever.co`, plain text extraction
- **Generic**: Tries 8 CSS selectors, falls back to full body text
- **Config**: `config/job_sources.json` (18 hardcoded URLs: 11 Greenhouse, 3 Naukri, 2 generic, 1 Amazon, 1 AgileCube)

### Naukri Scraper
- **File**: `src/services/job-intelligence/naukriScraper.ts` (367 lines)
- **Technology**: Playwright (headless Chromium)
- **Anti-detection**: Custom User-Agent, disabled webdriver flag, realistic viewport
- **Pagination**: URL suffixes (`-2`, `-3`, etc.) up to 20 pages
- **Sleep**: Random 2-4.5s between pages

### Adzuna API Fetcher
- **File**: `src/services/jobFetcher.ts` (73 lines)
- **Technology**: axios REST API
- **Cron**: Daily at midnight (`JOBS_SYNC_INTERVAL`)
- **Skill extraction**: Heuristic parsing from job descriptions

### Tech Stack Extractor
- **File**: `src/services/job-intelligence/techStackExtractor.ts` (321 lines)
- **Technology**: Regex/keyword matching (NOT AI)
- **Normalization map**: 130+ entries covering JS ecosystem, databases, Python, AI/ML, Java, cloud, mobile, frontend, data/BI
- **Stack combos**: Detects MERN, MEAN, LAMP, etc. via `detectStackCombinations()`

### Trend Analyzer
- **File**: `src/services/job-intelligence/trendAnalyzer.ts` (148 lines)
- **Technology**: Statistical frequency counting (NOT AI)
- **Output**: Top technologies, stack combinations, percentage shares
- **Persistence**: Writes to `tech_trends` table

---

## 6. AI Provider & AI Services

### Current State: NO AI/LLM INTEGRATION EXISTS

**Confirmed via exhaustive search:**
- Zero imports of `openai`, `anthropic`, `@google/generative-ai`, `langchain`, or any LLM SDK
- Zero `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or similar env vars in project config
- Zero prompt templates, system prompts, or LLM message formatting
- Zero AI-related npm packages in `package.json`

**The "AI" branding is marketing only.** All "intelligence" features use:
- **Keyword matching** for tech extraction (not NLP)
- **Weighted arithmetic** for scoring (not ML)
- **Hardcoded templates** for roadmaps (not generation)
- **Rule-based strings** for insights (not LLM)

### What Would Be Needed for AI Integration
| Component | Current | Required |
|-----------|---------|----------|
| LLM Provider SDK | None | `openai`, `anthropic`, or `@google/generative-ai` |
| API Key | None | `OPENAI_API_KEY` or equivalent |
| Prompt templates | None | System/user prompts for each use case |
| Token management | None | Rate limiting, cost tracking, context window handling |
| Response parsing | None | Structured output parsing from LLM responses |
| Fallback logic | None | Graceful degradation when LLM unavailable |

---

## 7. Resume Parsing & Analysis Flow

### Current State: DOES NOT EXIST

There is **zero resume-related code** in the entire codebase:
- No "resume" or "cv" string appears in any source file
- No file upload endpoints exist (no multer, no multipart)
- No PDF parsing libraries (no `pdf-parse`, `pdfjs-dist`, `pdf2json`)
- No OCR or text extraction from documents
- No resume database tables
- No resume API routes
- No resume frontend pages

### What Exists Instead: Portfolio-Based Career System
Users manually build their profile through:
1. **Projects** (with technologies, difficulty, completion status)
2. **Skills** (name + proficiency level: beginner/intermediate/advanced/expert)
3. **Certifications** (name, issuer, date)
4. **Learning Roadmaps** (milestones + tasks)

The system scores users against job market data based on this manually-entered portfolio data.

### What Would Be Needed for Resume System
| Component | Required |
|-----------|----------|
| File upload endpoint | multer/multipart middleware |
| PDF parsing | `pdf-parse` or `pdfjs-dist` |
| Section extraction | AI or regex-based section detection (education, experience, skills, etc.) |
| Skill extraction | NLP or keyword matching from resume text |
| Experience parsing | Date ranges, role titles, company names |
| Resume DB table | `resumes` table with parsed data |
| Resume-to-job matching | Skill overlap analysis from parsed resume |
| Resume scoring | Analysis of resume completeness and quality |

---

## 8. Job Description Parsing Flow

### Current State: IMPLEMENTED (Algorithmic)

**Entry point**: `src/routes/job-intelligence.ts` → `POST /api/jobs/scrape`

**Flow**:
```
1. Admin triggers scrape → GET /api/jobs/scrape
2. scraper.ts loads job_sources.json (18 URLs)
3. For each URL:
   a. parser.ts auto-detects platform (Greenhouse/Lever/Generic)
   b. Fetches page content (JSON API or HTML)
   c. Extracts: title, company, description, location, URL
   d. techStackExtractor.ts extracts tech keywords (130+ rules)
   e. Stores in scraped_job_postings table (upsert by URL)
4. trendAnalyzer.ts aggregates tech frequencies
5. Results stored in tech_trends table
```

**Platform-specific parsing**:
- **Greenhouse**: `boards-api.greenhouse.io` → JSON `content` field → cheerio HTML strip
- **Lever**: `api.lever.co` → JSON `descriptionPlain` + `lists[].text`
- **Generic**: axios + cheerio → tries 8 CSS selectors → falls back to body text
- **Naukri**: Playwright → `.srp-jobtuple-wrapper` selectors → skill tags from `li.dot-gt`
- **SerpAPI**: `google_jobs` engine → `description` field (max 4096 chars)

**Tech extraction**: Regex word-boundary matching sorted by length (longest first) to avoid false positives. Stack combination detection (MERN, MEAN, LAMP, etc.).

---

## 9. Resume-to-Job Matching Logic

### Current State: SKILL-BASED MATCHING (No Resume Involved)

**File**: `src/routes/jobs.ts:42-81` — `GET /api/jobs/matches`

**Algorithm**:
```typescript
// User skills sourced from:
// 1. Completed project technologies
// 2. user.skills JSON field

const matchingSkills = job.requiredSkills.filter(s =>
  [...userSkills].some(us => us.toLowerCase() === s.toLowerCase())
);
const missingSkills = job.requiredSkills.filter(s =>
  ![...userSkills].some(us => us.toLowerCase() === s.toLowerCase())
);
const matchScore = matchingSkills.length / job.requiredSkills.length * 100;
```

**Output**: `{ job, matchScore, matchingSkills, missingSkills }`
**Filtering**: Only jobs with matchScore > 0, sorted descending, top 20

**Limitations**:
- No semantic matching (exact string comparison only)
- No skill proficiency weighting
- No experience level matching
- No location/salary preference matching
- User skills must be manually entered (no resume extraction)

---

## 10. Score & Readiness Calculation Logic

### Current State: FULLY IMPLEMENTED (Algorithmic)

**Scoring Service**: `src/services/scoring.service.ts`

**Dynamic Weight Calibration** (`calculateDynamicWeights`):
- Base: Projects=15%, Skills=35%, Certs=0%, Trend=25%, Roadmap=25%
- Adjusts based on portfolio depth:
  - Certifications present → shifts up to 15% from skills/projects
  - Project-heavy (p>2, p>s) → shifts up to 10% from skills
  - Skill-heavy (s>10, s>p*3) → shifts up to 5% from projects
- Trend and Roadmap fixed at 25% each (market anchors)

**Readiness Score** (`calculateReadinessScore`):
```
score = (portfolioScore × projectsWeight +
         comfortScore × skillsWeight +
         marketDemandScore × trendAlignmentWeight +
         roadmapScore × roadmapCompletionWeight) / 100
```

**Component Scores**:
| Component | Calculation | Range |
|-----------|-------------|-------|
| Tech Comfort | (complexitySum / maxPossible) × 100 | 0-100 |
| Market Demand | (skillCount / maxJobs) × 100 | 0-100 |
| Roadmap Completion | completedTasks / totalTasks × 100 | 0-100 |
| Portfolio | min(100, completedProjects × 25) | 0-100 |

**Status Thresholds**:
- ≥80: `job_ready`
- ≥60: `interview_ready`
- ≥30: `needs_improvement`
- <30: `not_ready`

**5-Dimension Strength Breakdown**:
1. Projects: `min(100, completedProjects × 25)`
2. Skills: Average of proficiency levels (beginner=20, intermediate=50, advanced=80, expert=100)
3. Certifications: `min(100, certs.length × 33)`
4. Trend Alignment: User skills ÷ top 20 demanded skills
5. Roadmap Completion: completedTasks ÷ totalTasks

**Insight Generation**: Rule-based string concatenation identifying strongest/weakest dimensions.

---

## 11. Roadmap Generation Flow

### Current State: TEMPLATE-BASED (Not AI-Generated)

**File**: `src/routes/roadmaps.ts:94-174` — `POST /api/roadmaps`

**Templates** (hardcoded):
```typescript
const ROADMAP_TEMPLATES = {
  python: { milestones: [/* 4 milestones, 5 tasks each */] },
  react:  { milestones: [/* 4 milestones, 5 tasks each */] },
  javascript: { milestones: [/* 4 milestones, 5 tasks each */] },
};
```

**Generic Fallback** (lines 48-57):
- For any technology not in templates
- Creates 4 generic milestones with 5 tasks each
- Task titles are boilerplate ("Learn [Technology] Basics", "Build a Project", etc.)

**Generation Flow**:
```
1. User submits technology name
2. Check ROADMAP_TEMPLATES for match (case-insensitive)
3. If match found → use template
4. If no match → use generic template
5. Create roadmap record (roadmaps table)
6. Create milestones (milestones table) with order_index
7. Create tasks (tasks table) under each milestone
8. Log activity as "roadmap_created"
9. Return full roadmap with milestones/tasks
```

**Skill Sync on Task Toggle** (lines 271-338):
- 100% complete → skill level "expert"
- ≥70% → "advanced"
- ≥40% → "intermediate"
- ≥15% → "beginner"
- <15% → remove skill from user_skills

**Limitations**:
- Only 3 technologies have meaningful templates
- All other techs get identical generic content
- No personalization based on user's current skill level
- No market demand integration into roadmap content
- No difficulty progression based on user history

---

## 12. Environment Variables

### All Environment Variables Referenced in Codebase

| Variable | File(s) | Default | Purpose |
|----------|---------|---------|---------|
| `DATABASE_URL` | `db/index.ts`, `.env.example` | (required) | MySQL connection string |
| `PORT` | `server.ts` | `3001` | API server port |
| `NODE_ENV` | `db/index.ts` | `development` | Environment mode |
| `LOG_LEVEL` | `db/index.ts` | `info` | Pino log level |
| `CLERK_SECRET_KEY` | `middlewares/requireAuth.ts` | (required) | Clerk backend auth |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend `.env` | (required) | Clerk frontend auth |
| `SERPAPI_API_KEY` | `serpapiSearch.ts` | (none) | SerpAPI authentication |
| `ADZUNA_APP_ID` | `jobFetcher.ts` | `PLACEHOLDER_APP_ID` | Adzuna API app ID |
| `ADZUNA_API_KEY` | `jobFetcher.ts` | `PLACEHOLDER_API_KEY` | Adzuna API key |
| `ADZUNA_REGION` | `jobFetcher.ts` | `in` | Adzuna region code |
| `JOBS_SYNC_INTERVAL` | `jobsSync.ts` | `0 0 * * *` | Cron for Adzuna sync |
| `JOB_INTEL_SCHEDULER_ENABLED` | `scheduler.ts` | `false` | Enable scraping cron |
| `JOB_INTEL_SYNC_INTERVAL` | `scheduler.ts` | `0 */6 * * *` | Cron for scraping |
| `RUN_SYNC_ON_STARTUP` | `jobsSync.ts` | (none) | Dev: sync on boot |
| `VITE_API_URL` | Frontend `.env` | (empty) | Backend URL for frontend |
| `VITE_API_TARGET` | Frontend `.env` | `http://localhost:3001` | Dev proxy target |
| `CORS_ORIGIN` | `server.ts` | (dev: all) | CORS allowed origins |
| `SKIP_ADMIN_CHECK` | `middlewares/admin.ts` | `true` | Dev: skip admin auth |
| `MYSQL_ROOT_PASSWORD` | `docker-compose.yml` | (required) | Docker MySQL root |
| `MYSQL_DATABASE` | `docker-compose.yml` | `careerstack` | Docker MySQL database |
| `MYSQL_USER` | `docker-compose.yml` | `careerstack` | Docker MySQL user |
| `MYSQL_PASSWORD` | `docker-compose.yml` | `careerstack` | Docker MySQL password |

### Missing (Would Be Needed for AI Integration)
| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API authentication |
| `ANTHROPIC_API_KEY` | Anthropic API authentication |
| `GOOGLE_AI_API_KEY` | Google Gemini API authentication |
| `AI_MODEL` | Which model to use (gpt-4, claude-3, etc.) |
| `AI_MAX_TOKENS` | Token limit per request |
| `AI_TEMPERATURE` | Generation temperature |

---

## 13. Database Tables Involved

### Core Tables

| Table | Schema File | Columns | Purpose |
|-------|-------------|---------|---------|
| `users` | `schema/users.ts` | id, clerk_id, name, email, college, degree, graduation_year, career_goal, preferred_domain, interests (JSON), skills (JSON), profile_photo_url | User profiles |
| `projects` | `schema/projects.ts` | id, user_id, title, description, technologies (JSON), difficulty_level, completion_status, category | User projects |
| `roadmaps` | `schema/roadmaps.ts` | id, user_id, technology, created_at | Learning roadmaps |
| `milestones` | `schema/roadmaps.ts` | id, roadmap_id, title, description, order_index, estimated_duration, industry_relevance, status | Roadmap milestones |
| `tasks` | `schema/roadmaps.ts` | id, milestone_id, title, completed | Roadmap tasks |
| `jobs` | `schema/jobs.ts` | id, title, company, location, experience, required_skills (JSON), salary, apply_link, source, posted_at | Job listings |
| `user_skills` | `schema/portfolio.ts` | id, user_id, name, proficiency_level | User skills |
| `user_certifications` | `schema/portfolio.ts` | id, user_id, name, issuing_body, date_obtained, url | User certifications |

### Scraping/Intelligence Tables

| Table | Schema File | Columns | Purpose |
|-------|-------------|---------|---------|
| `scraped_job_postings` | `schema/scraped_jobs.ts` | id, url, title, company, description, location, salary, source_platform, technologies (JSON), scraped_at, created_at | Scraped job data |
| `tech_trends` | `schema/scraped_jobs.ts` | id, technology, count, percentage, period, analyzed_at | Aggregated tech trends |
| `tech_trends` | `schema/trends.ts` | id, name, demand_count, last_seen_at | Trend tracking (duplicate) |

### Portfolio/Analysis Tables

| Table | Schema File | Columns | Purpose |
|-------|-------------|---------|---------|
| `portfolios` | `schema/portfolio.ts` | id, student_id, title, bio, avatar_url, theme, visibility, slug, share_token, published_at | Portfolio container |
| `portfolio_projects` | `schema/portfolio.ts` | id, portfolio_id, project_id, display_order, is_featured | Portfolio-project links |
| `project_stack_tags` | `schema/portfolio.ts` | id, project_id, stack_id, tagged_at | Project-roadmap links |
| `analysis_config` | `schema/analysis_config.ts` | id, projects_weight, skills_weight, certifications_weight, trend_alignment_weight, roadmap_completion_weight, execution_progress_weight | Scoring weights |
| `user_score_weights` | `schema/scoring.ts` | id, user_id, dimension, weight | Per-user weights (UNUSED) |

### Domain/Tech Tables

| Table | Schema File | Columns | Purpose |
|-------|-------------|---------|---------|
| `domains` | `schema/domains.ts` | id, name, description, priority, is_visible | Career domains |
| `domain_categories` | `schema/domains.ts` | id, domain_id, name | Domain categories |
| `domain_role_map` | `schema/domains.ts` | id, domain_id, role | Domain-role mapping |
| `domain_skill_map` | `schema/domains.ts` | id, domain_id, skill | Domain-skill mapping |
| `stack_roadmap_map` | `schema/stack_map.ts` | id, stack_id, roadmap_id | Domain-roadmap links |

### Job Listing Tables

| Table | Schema File | Columns | Purpose |
|-------|-------------|---------|---------|
| `job_listings` | `schema/job_listings.ts` | id, title, company, location, description, salary_min, salary_max, employment_type, source, source_url, source_id, skills (JSON), is_active, posted_at, fetched_at, created_at | Adzuna job listings |
| `user_saved_jobs` | `schema/user_saved_jobs.ts` | id, user_id, job_listing_id, saved_at | Saved jobs |

### Activity Table

| Table | Schema File | Columns | Purpose |
|-------|-------------|---------|---------|
| `activity` | `schema/activity.ts` | id, user_id, type, details (JSON), created_at | Activity log |

---

## 14. API Endpoints Involved

### Scoring & Analysis
| Method | Endpoint | Auth | File | Purpose |
|--------|----------|------|------|---------|
| GET | `/api/scores/tech-comfort` | Auth | `scores.ts:21` | Tech comfort from projects |
| GET | `/api/scores/market-demand` | Auth | `scores.ts:68` | Market demand from jobs |
| GET | `/api/scores/job-readiness` | Auth | `scores.ts:98` | Overall readiness score |
| GET | `/api/scores/strengths` | Auth | `scores.ts:174` | Top skills/domains |
| GET | `/api/scores/trend-alignment` | Auth | `scores.ts:219` | Skills vs. trending |
| GET | `/api/analysis/weights` | Auth | `analysis.ts:27` | Get scoring weights |
| PUT | `/api/analysis/weights` | Auth | `analysis.ts:47` | **DISABLED** (403) |
| GET | `/api/analysis/strength-breakdown` | Auth | `analysis.ts:53` | 5-dimension breakdown |
| GET | `/api/analysis/market-alignment` | Auth | `analysis.ts:140` | Market alignment |

### Roadmaps
| Method | Endpoint | Auth | File | Purpose |
|--------|----------|------|------|---------|
| GET | `/api/roadmaps` | Auth | `roadmaps.ts:59` | List roadmaps |
| POST | `/api/roadmaps` | Auth | `roadmaps.ts:94` | Generate roadmap |
| GET | `/api/roadmaps/:id` | Auth | `roadmaps.ts:176` | Roadmap detail |
| PATCH | `/api/roadmaps/:rid/tasks/:tid/toggle` | Auth | `roadmaps.ts:229` | Toggle task |
| DELETE | `/api/roadmaps/:id` | Auth | `roadmaps.ts:343` | Delete roadmap |

### Jobs & Scraping
| Method | Endpoint | Auth | File | Purpose |
|--------|----------|------|------|---------|
| GET | `/api/jobs` | Auth | `jobs.ts:18` | List jobs |
| GET | `/api/jobs/matches` | Auth | `jobs.ts:42` | Matched jobs |
| GET | `/api/jobs/scrape` | Admin | `job-intelligence.ts:22` | Trigger scrape |
| POST | `/api/jobs/scrape-naukri` | Admin | `job-intelligence.ts:74` | Scrape Naukri |
| GET | `/api/jobs/trending-stacks` | Auth | `job-intelligence.ts:100` | Trend analysis |
| GET | `/api/jobs/top-3-stacks` | Auth | `job-intelligence.ts:111` | Top 3 stacks |
| GET | `/api/jobs/scraped` | Auth | `job-intelligence.ts:127` | Scraped postings |
| POST | `/api/jobs/search-serpapi` | Auth | `job-intelligence.ts:166` | SerpAPI search |
| POST | `/api/jobs/search-batch` | Admin | `job-intelligence.ts:201` | Batch search |
| GET | `/api/jobs/serpapi-status` | Auth | `job-intelligence.ts:234` | API key status |
| GET | `/api/job-listings` | Auth | `job-listings.ts:25` | Adzuna listings |
| GET | `/api/job-listings/:id` | Auth | `job-listings.ts:69` | Single listing |
| POST | `/api/job-listings/:id/save` | Auth | `job-listings.ts:91` | Save listing |
| GET | `/api/job-listings/saved` | Auth | `job-listings.ts:111` | Saved listings |

### Portfolio
| Method | Endpoint | Auth | File | Purpose |
|--------|----------|------|------|---------|
| GET | `/api/portfolio` | Auth | `portfolio.ts` | Get portfolio |
| POST | `/api/portfolio` | Auth | `portfolio.ts` | Create portfolio |
| GET | `/api/portfolio/public/:slug` | Public | `portfolio.ts` | Public view |
| POST | `/api/portfolio/skills` | Auth | `portfolio.ts` | Add skill |
| POST | `/api/portfolio/certifications` | Auth | `portfolio.ts` | Add certification |

### Dashboard
| Method | Endpoint | Auth | File | Purpose |
|--------|----------|------|------|---------|
| GET | `/api/dashboard/summary` | Auth | `dashboard.ts:17` | Aggregated stats |
| GET | `/api/dashboard/recent-activity` | Auth | `dashboard.ts:81` | Activity feed |

---

## 15. Frontend Pages Consuming Scraper/AI Data

| Page | File | Data Sources | Purpose |
|------|------|--------------|---------|
| **Scores & Readiness** | `src/pages/scores.tsx` (560 lines) | `/scores/*`, `/analysis/*` | Readiness score, radar chart, strength breakdown, market alignment, trends |
| **Roadmaps** | `src/pages/roadmaps/index.tsx` (524 lines) | `/roadmaps`, `/jobs/trending-stacks` | Generate roadmaps, trending roadmaps, my roadmaps |
| **Roadmap Detail** | `src/pages/roadmaps/[id].tsx` (248 lines) | `/roadmaps/:id` | Milestone timeline, task checklist, progress |
| **Market Intelligence** | `src/pages/market-intelligence.tsx` (394 lines) | `/jobs/trending-stacks`, `/jobs/scraped` | Tech frequency chart, top stacks, job stats |
| **Jobs** | `src/pages/jobs.tsx` | `/jobs/matches`, `/job-listings` | Matched jobs, saved jobs |
| **Dashboard** | `src/pages/dashboard.tsx` (129 lines) | `/dashboard/summary` | Readiness score, stats, activity |
| **Admin Scraping** | `src/pages/admin/scraping.tsx` (719 lines) | `/jobs/scrape`, `/jobs/scrape-naukri`, `/jobs/sources`, `/jobs/search-serpapi` | Trigger scraping, manage sources, view results |
| **Portfolio** | `src/pages/portfolio/index.tsx` | `/portfolio` | Manage portfolio |
| **Public Portfolio** | `src/pages/public-portfolio.tsx` | `/portfolio/public/:slug` | Public view + PDF download |
| **Student Portfolios** | `src/pages/student-portfolios.tsx` | `/portfolio/public/*` | Browse public portfolios |

---

## 16. Current Data Flow

### Job Scraping Flow
```
Admin triggers scrape
  → GET /api/jobs/scrape
    → scraper.ts loads job_sources.json
      → parser.ts detects platform → fetches content
        → techStackExtractor.ts extracts tech keywords
          → Stores in scraped_job_postings table
            → trendAnalyzer.ts aggregates frequencies
              → Stores in tech_trends table
                → GET /api/jobs/trending-stacks returns trends
                  → Frontend market-intelligence.tsx displays chart
```

### Scoring Flow
```
User has projects, skills, certifications, roadmap progress
  → GET /api/scores/job-readiness
    → scoring.service.ts calculates dynamic weights
      → Computes: comfort, marketDemand, roadmap, portfolio scores
        → Weighted composite → readinessScore
          → Frontend scores.tsx displays radar chart + breakdown
```

### Roadmap Flow
```
User submits technology name
  → POST /api/roadmaps
    → Matches template (python/react/javascript) or generic
      → Creates roadmap → milestones → tasks in DB
        → Frontend roadmaps/index.tsx shows roadmap
          → User toggles tasks → PATCH /api/roadmaps/:rid/tasks/:tid/toggle
            → Skill level synced to user_skills table
```

### Job Matching Flow
```
User has projects + skills
  → GET /api/jobs/matches
    → Collects user skills from projects + profile
      → Compares against job.requiredSkills (exact match)
        → Calculates matchScore per job
          → Returns top 20 matched jobs
            → Frontend jobs.tsx displays matches
```

---

## 17. Current API Flow

### Request → Response Chain for Key Features

**Readiness Score**:
```
Frontend scores.tsx
  → GET /api/scores/job-readiness (React Query)
    → scores.ts handler
      → Queries: projects, jobs, roadmaps, milestones, tasks
      → scoring.service.ts: calculateDynamicWeights()
      → scoring.service.ts: calculateReadinessScore()
    → Returns: { readinessScore, readinessStatus, components, suggestions }
  → Frontend renders: animated circle chart, status badge
```

**Roadmap Generation**:
```
Frontend roadmaps/index.tsx
  → POST /api/roadmaps (React Query mutation)
    → roadmaps.ts handler
      → Matches template or uses generic
      → DB INSERT: roadmaps, milestones, tasks
    → Returns: full roadmap with milestones/tasks
  → Frontend redirects to /roadmaps/:id
```

**Market Intelligence**:
```
Frontend market-intelligence.tsx
  → GET /api/jobs/trending-stacks (React Query)
    → job-intelligence.ts handler
      → trendAnalyzer.ts: analyzeTrends()
      → Queries: scraped_job_postings, tech_trends
    → Returns: { top_technologies, top_stack_combinations, stats }
  → Frontend renders: bar chart, ranked list, stats cards
```

---

## 18. Current Database Flow

### Write Operations
| Operation | Tables Written | Trigger |
|-----------|----------------|---------|
| Scrape jobs | `scraped_job_postings` | `POST /api/jobs/scrape` |
| Analyze trends | `tech_trends` | `GET /api/jobs/trending-stacks` |
| Generate roadmap | `roadmaps`, `milestones`, `tasks` | `POST /api/roadmaps` |
| Toggle task | `tasks`, `user_skills` | `PATCH /api/roadmaps/:rid/tasks/:tid/toggle` |
| Add project | `projects` | `POST /api/projects` |
| Add skill | `user_skills` | `POST /api/portfolio/skills` |
| Add certification | `user_certifications` | `POST /api/portfolio/certifications` |
| Save job | `user_saved_jobs` | `POST /api/job-listings/:id/save` |
| Fetch Adzuna jobs | `job_listings` | `GET /api/job-listings` (triggers sync) |

### Read Operations (Scoring)
| Score Component | Tables Read | Calculation |
|-----------------|-------------|-------------|
| Tech Comfort | `projects` | complexity × completion weighting |
| Market Demand | `jobs` | skill frequency across job listings |
| Roadmap Completion | `milestones`, `tasks` | completedTasks / totalTasks |
| Portfolio | `projects` | min(100, completedProjects × 25) |
| Trend Alignment | `jobs`, `user_skills`, `projects` | overlap with top 20 demanded skills |

---

## 19. Missing Pieces

### Critical Missing
1. **LLM/AI Integration** — No OpenAI, Anthropic, or Gemini SDK installed or configured
2. **Resume System** — No upload, parsing, extraction, or analysis
3. **Dynamic Roadmap Generation** — Only 3 hardcoded templates + generic fallback
4. **Skill Gap Analysis** — No role-specific "learn X, Y, Z for role R" recommendations
5. **Career Path Generation** — No career progression recommendations

### Important Missing
6. **LinkedIn/Indeed/Glassdoor Scrapers** — Only Greenhouse/Lever/Generic/Naukri/SerpAPI
7. **Semantic Job Matching** — Only exact string comparison, no NLP/embeddings
8. **Personalized Learning Paths** — Templates are static, not adapted to user level
9. **AI-Powered Insights** — Rule-based strings, not intelligent analysis
10. **Resume-to-Job Matching** — No resume parsing means no resume-based matching

### Nice-to-Have Missing
11. **Weight Configuration UI** — PUT endpoint disabled (403)
12. **Skill Level Weighting** — All skills treated equally regardless of proficiency
13. **Experience Level Matching** — Jobs matched without considering user experience
14. **Location/Salary Preferences** — Not factored into job matching
15. **Activity Analytics** — Activity table exists but no analytics dashboard

---

## 20. Recommended Implementation Order

### Phase 1: Foundation (Weeks 1-2)
1. Install and configure LLM provider SDK (e.g., OpenAI)
2. Create `OPENAI_API_KEY` env var and configuration
3. Build prompt template system (reusable across features)
4. Create AI service abstraction layer (provider-agnostic)

### Phase 2: Resume System (Weeks 3-4)
5. Add PDF parsing library (`pdf-parse` or `pdfjs-dist`)
6. Create resume upload endpoint with multer
7. Build resume section extraction (education, experience, skills)
8. Create `resumes` database table
9. Build resume skill extraction (AI-powered)
10. Create resume-to-job matching endpoint

### Phase 3: AI Roadmaps (Weeks 5-6)
11. Replace template-based roadmap generation with LLM
12. Create personalized roadmap prompts (user level + market demand)
13. Add dynamic milestone/task generation
14. Integrate roadmap with user's career goal and current skills

### Phase 4: AI Insights (Weeks 7-8)
15. Replace rule-based strength insights with LLM analysis
16. Create skill gap analysis endpoint (AI-powered)
17. Add career path recommendations
18. Create personalized learning suggestions

### Phase 5: Enhanced Matching (Weeks 9-10)
19. Add semantic job matching (embeddings or LLM)
20. Factor in skill proficiency levels
21. Add experience level matching
22. Create job recommendation engine

### Phase 6: Scraper Expansion (Weeks 11-12)
23. Add LinkedIn scraper (if permitted by ToS)
24. Add Indeed scraper
25. Expand SerpAPI integration for more platforms
26. Add job deduplication across sources

---

## 21. Risks

### SerpAPI Limits
- **Free tier**: 100 searches/month
- **Rate limiting**: 429 errors if exceeded
- **Mitigation**: Cache results, batch queries, use Adzuna for volume
- **Risk**: Production searches could exhaust quota quickly

### AI Reliability
- **LLM hallucinations**: Generated roadmaps/insights may contain inaccuracies
- **Response consistency**: Same prompt may produce different outputs
- **Token limits**: Large resumes or complex prompts may exceed context window
- **Mitigation**: Validate LLM output against schema, use fallback to algorithmic scoring
- **Risk**: Users may trust incorrect AI-generated recommendations

### Inconsistent Scoring
- **Dashboard vs. Scores page**: Different formulas produce different numbers (known bug)
- **Portfolio.ts vs. scores.ts**: Duplicated tech comfort logic (maintenance risk)
- **Dynamic weights**: Auto-calibration may produce unexpected weight distributions
- **Mitigation**: Consolidate scoring logic, use single source of truth
- **Risk**: Users see contradictory readiness scores across pages

### Data Quality
- **Scraped job data**: May contain duplicates, outdated listings, or incorrect tech extraction
- **Keyword matching**: 130+ rules may miss emerging technologies or produce false positives
- **Adzuna data**: Placeholder API keys in defaults may cause silent failures
- **Mitigation**: Deduplication pipeline, regular rule updates, validate API keys
- **Risk**: Trend analysis based on poor data leads to bad recommendations

### Infrastructure
- **Playwright scraper**: Resource-intensive, may fail in constrained environments
- **MySQL connection**: Aiven free tier has connection limits
- **Cron jobs**: Disabled by default, may not run in serverless environments
- **Mitigation**: Monitor resource usage, use connection pooling, test cron in production
- **Risk**: Scraping may cause performance degradation or downtime

### Security
- **File upload**: Resume upload would introduce new attack surface
- **API key exposure**: LLM API keys must not be exposed to frontend
- **Prompt injection**: User input in prompts could manipulate LLM output
- **Mitigation**: Validate/sanitize all inputs, server-side only LLM calls, output filtering
- **Risk**: Malicious users could exploit AI features or steal API keys

---

## 22. Files Reference

### Backend — Scraping/Intelligence
- `artifacts/api-server/src/services/job-intelligence/serpapiSearch.ts` (220 lines)
- `artifacts/api-server/src/services/job-intelligence/scraper.ts` (173 lines)
- `artifacts/api-server/src/services/job-intelligence/parser.ts` (275 lines)
- `artifacts/api-server/src/services/job-intelligence/naukriScraper.ts` (367 lines)
- `artifacts/api-server/src/services/job-intelligence/techStackExtractor.ts` (321 lines)
- `artifacts/api-server/src/services/job-intelligence/trendAnalyzer.ts` (148 lines)
- `artifacts/api-server/src/services/job-intelligence/scheduler.ts` (51 lines)
- `artifacts/api-server/src/services/jobFetcher.ts` (73 lines)
- `artifacts/api-server/src/services/jobsSync.ts` (27 lines)
- `artifacts/api-server/src/routes/job-intelligence.ts` (242 lines)
- `artifacts/api-server/config/job_sources.json` (33 lines)

### Backend — Scoring/Analysis
- `artifacts/api-server/src/services/scoring.service.ts` (140 lines)
- `artifacts/api-server/src/routes/scores.ts` (266 lines)
- `artifacts/api-server/src/routes/analysis.ts` (203 lines)

### Backend — Roadmaps
- `artifacts/api-server/src/routes/roadmaps.ts` (432 lines)

### Backend — Jobs
- `artifacts/api-server/src/routes/jobs.ts` (83 lines)
- `artifacts/api-server/src/routes/job-listings.ts` (140+ lines)

### Backend — Portfolio
- `artifacts/api-server/src/routes/portfolio.ts` (1000 lines)

### Backend — Database Schema
- `artifacts/api-server/src/lib/db/schema/scraped_jobs.ts`
- `artifacts/api-server/src/lib/db/schema/trends.ts`
- `artifacts/api-server/src/lib/db/schema/roadmaps.ts`
- `artifacts/api-server/src/lib/db/schema/jobs.ts`
- `artifacts/api-server/src/lib/db/schema/portfolio.ts`
- `artifacts/api-server/src/lib/db/schema/scoring.ts`
- `artifacts/api-server/src/lib/db/schema/analysis_config.ts`
- `artifacts/api-server/src/lib/db/schema/domains.ts`
- `artifacts/api-server/src/lib/db/schema/stack_map.ts`
- `artifacts/api-server/src/lib/db/schema/users.ts`
- `artifacts/api-server/src/lib/db/schema/projects.ts`
- `artifacts/api-server/src/lib/db/schema/job_listings.ts`
- `artifacts/api-server/src/lib/db/schema/user_saved_jobs.ts`

### Backend — Middleware/Auth
- `artifacts/api-server/src/middlewares/requireAuth.ts`
- `artifacts/api-server/src/middlewares/admin.ts`

### Frontend — Pages
- `artifacts/careerstack/src/pages/scores.tsx` (560 lines)
- `artifacts/careerstack/src/pages/roadmaps/index.tsx` (524 lines)
- `artifacts/careerstack/src/pages/roadmaps/[id].tsx` (248 lines)
- `artifacts/careerstack/src/pages/market-intelligence.tsx` (394 lines)
- `artifacts/careerstack/src/pages/jobs.tsx`
- `artifacts/careerstack/src/pages/dashboard.tsx` (129 lines)
- `artifacts/careerstack/src/pages/admin/scraping.tsx` (719 lines)
- `artifacts/careerstack/src/pages/portfolio/index.tsx`
- `artifacts/careerstack/src/pages/public-portfolio.tsx`
- `artifacts/careerstack/src/pages/student-portfolios.tsx`

### Frontend — Hooks
- `artifacts/careerstack/src/hooks/use-analysis-api.ts` (94 lines)
- `artifacts/careerstack/src/hooks/use-jobs-api.ts`
- `artifacts/careerstack/src/hooks/use-stack-api.ts`
- `artifacts/careerstack/src/hooks/use-portfolio-api.ts`

### Frontend — Components
- `artifacts/careerstack/src/components/layout/Sidebar.tsx` (navigation)
- `artifacts/careerstack/src/lib/pdf-generator.ts` (PDF output only)

### Config
- `.env.example` (95 lines)
- `artifacts/api-server/config/job_sources.json` (33 lines)

### Scripts
- `scripts/naukri_scraper.ts` (384 lines) — standalone Naukri scraper
- `scripts/run_scrape.ts` (42 lines) — manual scrape verification
