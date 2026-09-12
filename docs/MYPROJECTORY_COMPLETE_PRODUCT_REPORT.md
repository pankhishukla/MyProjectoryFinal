# MyProjectory — Complete Product & Technical Report

> **Date:** September 2026
> **Purpose:** Presentation preparation and viva reference
> **Status:** Documentation only — no application code was changed

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [User Journey](#2-user-journey)
3. [Dashboard](#3-dashboard)
4. [Profile](#4-profile)
5. [Portfolio](#5-portfolio)
6. [Student Portfolios](#6-student-portfolios)
7. [Skills & Stacks](#7-skills--stacks)
8. [Jobs](#8-jobs)
9. [Job Parsing](#9-job-parsing)
10. [Job Matching](#10-job-matching)
11. [Resume System](#11-resume-system)
12. [Resume Gap Mapping](#12-resume-gap-mapping)
13. [Scores](#13-scores)
14. [Readiness](#14-readiness)
15. [Roadmaps](#15-roadmaps)
16. [Market Intelligence](#16-market-intelligence)
17. [Scraper](#17-scraper)
18. [SerpAPI](#18-serpapi)
19. [AI Integration](#19-ai-integration)
20. [Authentication](#20-authentication)
21. [Database](#21-database)
22. [Frontend/Backend Architecture](#22-frontendbackend-architecture)
23. [Deployment](#23-deployment)
24. [Current Bugs](#24-current-bugs)
25. [Security and Reliability Risks](#25-security-and-reliability-risks)
26. [Recommended Development Order](#26-recommended-development-order)
27. [Appendix A: 30-Second Explanation](#appendix-a-how-to-explain-myprojectory-in-30-seconds)
28. [Appendix B: 1-Minute Explanation](#appendix-b-how-to-explain-myprojectory-in-1-minute)
29. [Appendix C: Technical Architecture](#appendix-c-how-to-explain-the-technical-architecture)
30. [Appendix D: Scoring System](#appendix-d-how-to-explain-the-scoring-system)
31. [Appendix E: Role of AI](#appendix-e-how-to-explain-the-role-of-ai)
32. [Appendix F: Role of the Scraper](#appendix-f-how-to-explain-the-role-of-the-scraper)
33. [Appendix G: Likely Viva Questions](#appendix-g-likely-viva-questions-and-simple-answers)
34. [Appendix H: Current Status Table](#appendix-h-current-status-working-partial-broken-not-implemented)
35. [Appendix I: Implementation Roadmap](#appendix-i-recommended-implementation-roadmap)
36. [Appendix J: Glossary](#appendix-j-glossary-of-technical-terms)

---

# 1. Project Overview

## What is MyProjectory?

MyProjectory is a **web-based career readiness platform**. It helps students and job seekers:

1. **Build a portfolio** of projects, skills, and certifications
2. **Measure how ready they are** for their target jobs
3. **Follow learning roadmaps** to learn technologies employers want
4. **Discover trending technologies** from real job market data
5. **Match with jobs** based on their skills

Think of it as a **career mission control center** — a single place where you track everything about your job preparation.

## What problem does it solve?

Students often do not know:
- Which technologies to learn
- How ready they are for a job interview
- What skills are in demand
- How their portfolio compares to what employers want

MyProjectory answers all of these questions using data from real job postings.

## Who are the target users?

- **College students** preparing for their first job
- **Bootcamp graduates** building their portfolio
- **Self-taught developers** who want to know what to learn next
- **Career switchers** who need to identify skill gaps

## Main modules of the system

| Module | What it does |
|--------|--------------|
| Dashboard | Shows overview: readiness score, projects, roadmap progress |
| Profile | User's personal info: name, college, degree, career goal |
| Portfolio | Manages projects, skills, certifications |
| Scores & Readiness | Calculates how ready you are for jobs |
| Roadmaps | Learning paths with milestones and tasks |
| Jobs | Shows job listings and matches your skills |
| Market Intelligence | Shows trending technologies from scraped job data |
| Admin Scraping | Triggers web scraping (admin only) |

## What makes the product useful?

- **Real market data**: Skills are matched against actual job postings
- **Automated scoring**: No guessing — you get a number that says how ready you are
- **Actionable roadmaps**: Step-by-step plans to learn what you need
- **Portfolio sharing**: Share your portfolio with a public link

## Current production architecture

```
Frontend (React)  →  Backend API (Express)  →  Database (MySQL)
                          ↓
                    Scraping Engine
                          ↓
                    SerpAPI / Web Scrapers
```

---

# 2. User Journey

## Complete flow from signup to job-ready

```
1. User signs up (Clerk authentication)
   ↓
2. User fills profile (name, college, degree, career goal)
   ↓
3. User adds projects (title, technologies, difficulty, status)
   ↓
4. User adds skills (name + proficiency level)
   ↓
5. User adds certifications (optional)
   ↓
6. System calculates readiness score
   ↓
7. User generates a roadmap (e.g., "Python", "React")
   ↓
8. User completes tasks in the roadmap
   ↓
9. System updates score automatically
   ↓
10. User browses job matches
   ↓
11. User shares portfolio publicly
```

---

# 3. Dashboard

## Purpose
Shows a quick summary of everything — your score, projects, roadmap progress, and recent activity.

## What the user sees
- **Job Readiness Score** (percentage with progress bar)
- **Portfolio Projects** (completed / total)
- **Roadmap Progress** (percentage)
- **Strongest Technology** (most used in projects)
- **Recent Activity** (last 10 actions with timestamps)

## What the user does
- Views the summary
- Clicks on cards to navigate to detailed sections

## Which API is called
- `GET /api/dashboard/summary`
- `GET /api/dashboard/recent-activity`

## Which database data is involved
- `projects` table (count projects)
- `roadmaps`, `milestones`, `tasks` tables (calculate progress)
- `jobs` table (count matching jobs)
- `activity` table (recent actions)

## Whether scraping is involved
No.

## Whether AI is involved
No.

## How the result is calculated

**Readiness Score on Dashboard (simplified formula):**
```
readinessScore = comfortComponent × 0.35 + roadmapProgress × 0.25 + portfolioComponent × 0.15
```
where:
- `comfortComponent = min(100, completedProjects × 15 + completedProjects × 10)`
- `portfolioComponent = min(100, completedProjects × 25)`

**This is different from the Scores page formula** (see Section 14 for details).

## What happens if something fails
- Shows "Loading dashboard..." spinner
- If no data, shows 0% and "N/A"

## Current limitations
- Dashboard uses a different scoring formula than the Scores page (known bug)
- No resume data used
- No AI insights

## Recommended future improvements
- Use the same scoring formula everywhere
- Add AI-generated insights ("You should focus on X")
- Add skill gap summary

---

# 4. Profile

## Purpose
User's personal information used for identification and basic matching.

## What the user sees
- Name, email, college, degree, graduation year
- Career goal, preferred domain
- Interests (JSON array)
- Skills (JSON array)
- Profile photo

## What the user does
- Fills in personal details
- Sets career goal and preferred domain

## Which API is called
- `GET /api/profile`
- `PUT /api/profile`

## Which database data is involved
- `users` table

## Whether scraping is involved
No.

## Whether AI is involved
No.

## How the result is calculated
Simple CRUD — read and write user data.

## What happens if something fails
- Profile not found → 404
- Validation error → 400

## Current limitations
- `career_goal` field exists but is **never used** in scoring or matching
- `preferred_domain` field exists but is **never used**
- `skills` field is a JSON array but is separate from the `user_skills` table

## Recommended future improvements
- Use career goal to personalize roadmaps
- Use preferred domain to filter job matches
- Consolidate skills into a single source

---

# 5. Portfolio

## Purpose
Manage projects, skills, and certifications. Generate a shareable portfolio.

## What the user sees
- List of projects with technologies, difficulty, status
- List of skills with proficiency levels
- List of certifications
- Portfolio settings (title, bio, visibility)
- Public portfolio page with PDF download

## What the user does
- Adds projects (title, description, technologies, difficulty)
- Adds skills (name, proficiency: beginner/intermediate/advanced/expert)
- Adds certifications (name, issuer, date)
- Publishes portfolio (public/private)
- Downloads portfolio as PDF

## Which API is called
- `GET /api/portfolio`
- `POST /api/portfolio`
- `POST /api/portfolio/skills`
- `POST /api/portfolio/certifications`
- `GET /api/portfolio/public/:slug`

## Which database data is involved
- `projects` table
- `user_skills` table
- `user_certifications` table
- `portfolios` table
- `portfolio_projects` table

## Whether scraping is involved
No.

## Whether AI is involved
No.

## How the result is calculated
Simple CRUD operations. Portfolio rating is calculated as:
```
portfolioRating = sum(project.difficulty × completionScore) / count
```

## What happens if something fails
- Portfolio not found → 404
- Validation error → 400

## Current limitations
- Skills are manually entered (no resume parsing)
- No AI analysis of portfolio quality
- PDF generation is output-only (no resume input)

## Recommended future improvements
- AI-powered portfolio analysis
- Auto-extract skills from project descriptions
- Resume upload that populates portfolio automatically

---

# 6. Student Portfolios

## Purpose
Browse public portfolios of other students. Filter by technology.

## What the user sees
- Grid of public portfolios
- Filter by technology
- Sort by rating, date, etc.
- Click to view individual portfolio

## What the user does
- Browses portfolios
- Filters by technology
- Views individual portfolios

## Which API is called
- `GET /api/portfolio/public` (list public portfolios)

## Which database data is involved
- `portfolios` table
- `portfolio_projects` table
- `projects` table

## Whether scraping is involved
No.

## Whether AI is involved
No.

## How the result is calculated
Filters public portfolios by technology match and sorts by rating.

## What happens if something fails
- No portfolios found → Empty state message

## Current limitations
- No AI-powered recommendations
- No portfolio quality scoring

## Recommended future improvements
- AI analysis of portfolio strength
- Smart recommendations based on career goal

---

# 7. Skills & Stacks

## Purpose
Manage individual skills and link projects to technology stacks.

## What the user sees
- Skills list with proficiency levels
- Ability to add/remove skills
- Skills are used in scoring and job matching

## What the user does
- Adds skills manually
- Sets proficiency level (beginner/intermediate/advanced/expert)
- Skills are auto-synced when roadmap tasks are completed

## Which API is called
- `POST /api/portfolio/skills`
- Skills are also auto-created by roadmap task toggle

## Which database data is involved
- `user_skills` table
- `domains` table (career domains)
- `domain_skill_map` table (skills within domains)

## Whether scraping is involved
No.

## Whether AI is involved
No.

## How the result is calculated
Skills are manually entered. Proficiency levels are mapped to numbers:
- beginner = 20
- intermediate = 50
- advanced = 80
- expert = 100

## What happens if something fails
- Skill not found → 404
- Duplicate skill → handled by upsert

## Current limitations
- Skills must be manually entered
- No skill level assessment
- No resume-based skill extraction

## Recommended future improvements
- AI skill extraction from resume
- Skill level assessment via quizzes
- Auto-suggest skills based on career goal

---

# 8. Jobs

## Purpose
Show job listings and match them with user skills.

## What the user sees
- List of job listings
- Match score for each job (0-100%)
- Matching skills (green)
- Missing skills (red)
- Save/bookmark jobs

## What the user does
- Browses job listings
- Sees match scores
- Saves interesting jobs
- Filters by technology

## Which API is called
- `GET /api/jobs`
- `GET /api/jobs/matches`
- `GET /api/job-listings`
- `POST /api/job-listings/:id/save`
- `GET /api/job-listings/saved`

## Which database data is involved
- `jobs` table
- `job_listings` table
- `user_saved_jobs` table
- `projects` table (for user skills)
- `users` table (for user skills)

## Whether scraping is involved
Yes — job data comes from Adzuna API and web scraping.

## Whether AI is involved
No — matching is exact string comparison.

## How the result is calculated
See Section 10 for detailed matching logic.

## What happens if something fails
- No jobs found → Empty state
- API error → Error message

## Current limitations
- Exact string matching only (no semantic matching)
- No skill proficiency weighting
- No experience level matching
- No location/salary preferences

## Recommended future improvements
- AI-powered semantic matching
- Skill proficiency weighting
- Experience level matching
- Location/salary preferences

---

# 9. Job Parsing

## Purpose
Extract structured data from job postings on various platforms.

## What the user sees
- Admin triggers scraping
- Scraped jobs appear in the system
- Trend data is updated

## What the user does
- Admin clicks "Run Scraper" on admin page
- System scrapes job URLs from config file

## Which API is called
- `GET /api/jobs/scrape` (admin only)
- `POST /api/jobs/scrape-naukri` (admin only)

## Which database data is involved
- `scraped_job_postings` table
- `tech_trends` table
- `job_sources.json` config file

## Whether scraping is involved
Yes — this IS the scraping system.

## Whether AI is involved
No — uses regex/keyword matching, not AI.

## How the result is calculated

**Scraping flow:**
```
1. Load job_sources.json (18 URLs)
2. For each URL:
   a. Detect platform (Greenhouse/Lever/Generic)
   b. Fetch content (JSON API or HTML)
   c. Extract: title, company, description, location
   d. Extract tech keywords (130+ rules)
   e. Store in scraped_job_postings table
3. Aggregate tech frequencies
4. Store in tech_trends table
```

**Platform-specific parsing:**
- **Greenhouse**: Public JSON API → HTML strip with cheerio
- **Lever**: Public JSON API → Plain text extraction
- **Generic**: axios + cheerio → Try 8 CSS selectors → Fallback to body text
- **Naukri**: Playwright (headless browser) → Anti-bot detection

## What happens if something fails
- Individual URL failure → Logged, continues with next URL
- SerpAPI failure → Returns error message
- Playwright failure → May crash if browser unavailable

## Current limitations
- Only 18 hardcoded URLs in config
- No LinkedIn, Indeed, or Glassdoor scrapers
- Cron scheduler is disabled by default
- Adzuna uses placeholder API keys

## Recommended future improvements
- Add LinkedIn/Indeed/Glassdoor scrapers
- Enable cron scheduler
- Add job deduplication
- Add more source URLs

---

# 10. Job Matching

## Purpose
Compare user skills against job requirements and calculate a match score.

## What the user sees
- List of jobs sorted by match score
- For each job: match score, matching skills, missing skills
- Top 20 matches

## What the user does
- Views matched jobs
- Sees which skills they have and which are missing

## Which API is called
- `GET /api/jobs/matches`

## Which database data is involved
- `projects` table (user's project technologies)
- `users` table (user.skills JSON field)
- `jobs` table (job.requiredSkills JSON array)

## Whether scraping is involved
Indirectly — job data comes from scraping.

## Whether AI is involved
No — uses exact string comparison.

## How the result is calculated

**Current algorithm (exact string matching):**
```
User skills = project technologies + user.skills JSON field
For each job:
  matchingSkills = job.requiredSkills where skill exists in userSkills (case-insensitive)
  missingSkills = job.requiredSkills where skill does NOT exist in userSkills
  matchScore = (matchingSkills.length / job.requiredSkills.length) × 100
Return: top 20 jobs with matchScore > 0, sorted descending
```

**Example:**
```
Job requires: ["Python", "SQL", "React", "Machine Learning"]
User has:     ["Python", "React", "OpenCV"]

matchingSkills = ["Python", "React"]  (2 out of 4)
missingSkills = ["SQL", "Machine Learning"]
matchScore = (2/4) × 100 = 50%
```

## What happens if something fails
- No jobs found → Empty array
- No user skills → All jobs show 0% match

## Current limitations
- **Exact string matching only**: "javascript" matches "JavaScript" but "ML" does NOT match "Machine Learning"
- No semantic understanding
- No skill proficiency weighting
- No experience level matching
- User skills must be manually entered

## Recommended future improvements
- AI-powered semantic matching (understand that "ML" = "Machine Learning")
- Skill proficiency weighting (expert > beginner)
- Experience level matching
- Location/salary preferences

---

# 11. Resume System

## Purpose
Upload, parse, and analyze resumes.

## Current Status: DOES NOT EXIST

There is **zero resume-related code** in the entire codebase:
- No "resume" or "cv" string appears in any source file
- No file upload endpoints (no multer, no multipart handling)
- No PDF parsing libraries (no pdf-parse, no pdfjs-dist)
- No resume database tables
- No resume API routes
- No resume frontend pages

## What exists instead

Users manually build their profile through:
1. Projects (with technologies, difficulty, completion status)
2. Skills (name + proficiency level)
3. Certifications (name, issuer, date)

The system scores users based on this manually-entered data.

## What would be needed

| Component | Required |
|-----------|----------|
| File upload | multer/multipart middleware |
| PDF parsing | `pdf-parse` or `pdfjs-dist` |
| Section extraction | AI or regex-based detection |
| Skill extraction | NLP or keyword matching |
| Resume DB table | `resumes` table |
| Resume-to-job matching | Skill overlap analysis |

---

# 12. Resume Gap Mapping

## Purpose
Compare a resume against a job description to find missing skills.

## Current Status: DOES NOT EXIST

No resume parsing means no gap mapping. The closest feature is `trend-alignment` which shows missing high-demand skills.

## How it SHOULD work

**Example:**
```
Job requires:
- Python (Required)
- SQL (Required)
- React (Required)
- Machine Learning (Required)
- Docker (Preferred)

Resume contains:
- Python (3 years experience)
- React (1 year experience)
- OpenCV (personal project)
```

**Analysis:**
| Skill | Status | Evidence |
|-------|--------|----------|
| Python | Strong Match | 3 years experience |
| React | Partial Match | 1 year experience |
| SQL | Missing | No mention |
| Machine Learning | Missing | No mention |
| Docker | Missing | No mention |
| OpenCV | Transferable | Related to ML |

**How gap should influence score:**
- Required skills missing → Major penalty
- Preferred skills missing → Minor penalty
- Partial matches → Partial credit
- Strong matches → Full credit

**How gap should lead to roadmap:**
- Missing required skills → Generate roadmap for that skill
- Partial matches → Generate roadmap to strengthen

## How AI should assist

| Task | AI Role | Backend Role |
|------|---------|--------------|
| Resume parsing | Extract sections, skills, experience | Validate output |
| Skill extraction | Identify skills from text | Normalize names |
| Gap analysis | Compare resume vs job requirements | Calculate scores |
| Roadmap generation | Create personalized learning path | Store in DB |

---

# 13. Scores

## Purpose
Show the user how strong their profile is across multiple dimensions.

## What the user sees
- Tech Comfort scores (per technology)
- Market Demand scores (per technology)
- Strengths (top 5 technologies, top 3 domains)
- Trend Alignment (match percentage with top 20 market skills)

## What the user does
- Views score breakdowns
- Sees which technologies are strongest/weakest

## Which API is called
- `GET /api/scores/tech-comfort`
- `GET /api/scores/market-demand`
- `GET /api/scores/strengths`
- `GET /api/scores/trend-alignment`

## Which database data is involved
- `projects` table (for tech comfort)
- `jobs` table (for market demand and trend alignment)

## Whether scraping is involved
Indirectly — market demand uses job data from scraping.

## Whether AI is involved
No.

## How the result is calculated

### Tech Comfort Score
```
For each technology in completed projects:
  complexity = advanced ? 3 : intermediate ? 2 : 1
  completionScore = completed ? 1 : in_progress ? 0.5 : 0.2
  complexitySum += complexity × completionScore

comfortScore = (complexitySum / maxPossible) × 100
confidenceLevel = count >= 4 ? "high" : count >= 2 ? "medium" : "low"
```

### Market Demand Score
```
For each skill across all jobs:
  count = number of jobs requiring this skill

demandScore = (count / maxJobs) × 100
trendDirection = demandScore > 70 ? "rising" : demandScore < 30 ? "declining" : "stable"
```

### Strengths
```
Top 5 technologies by project count
Top 3 domains by project category
confidenceLevel = completedProjects >= 3 ? "high" : projects >= 2 ? "medium" : "low"
```

### Trend Alignment
```
topDemanded = top 20 skills from all jobs
userSkills = technologies from completed projects
matchCount = userSkills that appear in topDemanded
matchPercentage = (matchCount / 20) × 100
missingHighDemandSkills = top 5 skills in topDemanded NOT in userSkills
```

## What happens if something fails
- No projects → Returns empty arrays or 0 scores
- No jobs → Returns 0 for market-related scores

## Current limitations
- No AI analysis
- No skill proficiency weighting in trend alignment
- Skills from projects only (not from user_skills table for some endpoints)

## Recommended future improvements
- AI-powered insights ("Your Python is strong but you need SQL")
- Include user_skills in all score calculations
- Skill proficiency weighting

---

# 14. Readiness

## Purpose
Calculate a single number (0-100) representing how ready the user is for jobs.

## What the user sees
- Overall readiness score (0-100)
- Status: "job_ready" (≥80), "interview_ready" (≥60), "needs_improvement" (≥30), "not_ready" (<30)
- Component breakdown (comfort, market demand, roadmap, portfolio)
- Actionable suggestions

## What the user does
- Views readiness score on Dashboard and Scores page
- Reads suggestions for improvement

## Which API is called
- `GET /api/scores/job-readiness`
- `GET /api/analysis/strength-breakdown`
- `GET /api/analysis/weights`

## Which database data is involved
- `projects` table
- `jobs` table
- `roadmaps`, `milestones`, `tasks` tables
- `user_skills` table
- `user_certifications` table

## Whether scraping is involved
Indirectly — market demand component uses job data.

## Whether AI is involved
No.

## How the result is calculated

### The Exact Current Formula

**Step 1: Calculate component scores (each 0-100)**

```
comfortComponent = min(100, completedProjects × 15 + completedProjects × 10)
marketDemandComponent = (overlapSkills / demandedSkills.size) × 100
roadmapComponent = (completedTasks / totalTasks) × 100
portfolioComponent = min(100, completedProjects × 25)
```

**Step 2: Calculate dynamic weights**

```
Base weights:
  projectsWeight = 15
  skillsWeight = 35
  certificationsWeight = 0
  trendAlignmentWeight = 25  (fixed)
  roadmapCompletionWeight = 25  (fixed)

Adjustments:
  If certifications > 0:
    certW = min(15, certCount × 5)
    Take 70% from skills, 30% from projects

  If projects > 2 AND projects > skills:
    shift = min(10, (projects - skills) × 2)
    Move from skills to projects

  If skills > 10 AND skills > projects × 3:
    shift = min(5, skills / 5)
    Move from projects to skills
```

**Step 3: Calculate final score**

```
sumWeights = projectsWeight + skillsWeight + certificationsWeight + trendAlignmentWeight + roadmapCompletionWeight
normalizedFactor = 100 / sumWeights

score = (
  portfolioScore × projectsWeight +
  comfortScore × skillsWeight +
  marketDemandScore × trendAlignmentWeight +
  roadmapScore × roadmapCompletionWeight
) / 100

overallScore = round(score × normalizedFactor)
```

### Simple Numerical Example

**User has:**
- 3 completed projects (using Python, React, SQL)
- 5 skills in user_skills
- 1 certification
- 2 roadmaps with 10 tasks total, 6 completed

**Step 1: Component scores**
```
comfortComponent = min(100, 3×15 + 3×10) = min(100, 75) = 75
marketDemandComponent = (2 / 20) × 100 = 10  (assuming 2 of user skills are in top 20)
roadmapComponent = (6 / 10) × 100 = 60
portfolioComponent = min(100, 3×25) = 75
```

**Step 2: Dynamic weights (with 1 certification)**
```
certW = min(15, 1×5) = 5
takeFromSkills = min(35-10, ceil(5×0.7)) = min(25, 4) = 4
skillW = 35 - 4 = 31
projW = 15 - (5-4) = 14

Final weights: projects=14, skills=31, certs=5, trend=25, roadmap=25
sumWeights = 14+31+5+25+25 = 100
normalizedFactor = 100/100 = 1
```

**Step 3: Final score**
```
score = (75×14 + 75×31 + 10×25 + 60×25) / 100
      = (1050 + 2325 + 250 + 1500) / 100
      = 5125 / 100
      = 51.25

overallScore = round(51.25 × 1) = 51
status = "needs_improvement" (≥30 but <60)
```

## Which files calculate it

| File | Line | What it does |
|------|------|--------------|
| `src/services/scoring.service.ts` | 34 | `calculateDynamicWeights()` — calculates weights |
| `src/services/scoring.service.ts` | 121 | `calculateReadinessScore()` — calculates final score |
| `src/routes/scores.ts` | 98 | `GET /scores/job-readiness` — orchestrates calculation |
| `src/routes/dashboard.ts` | 66 | Dashboard uses a DIFFERENT formula (bug) |

## Why the current implementation is inconsistent

**Dashboard formula** (`dashboard.ts:66`):
```
readinessScore = comfortComponent × 0.35 + roadmapProgress × 0.25 + portfolioComponent × 0.15
```

**Scores page formula** (`scores.ts:98` + `scoring.service.ts:121`):
```
Uses calculateReadinessScore() with dynamic weights
```

**The two formulas produce different numbers for the same user.** This is a known bug.

## Whether the score is reliable and explainable

- **Reliable**: Yes — it uses consistent data from the database
- **Explainable**: Partially — the Scores page shows component breakdown, but the Dashboard does not
- **Transparent**: The dynamic weights are shown on the Scores page

## Current problems or weaknesses

1. Dashboard and Scores page show different numbers
2. No AI analysis or explanation
3. No resume data used
4. Skill proficiency not weighted in market demand component
5. comfortComponent formula is unusual: `projects × 15 + projects × 10` (same variable twice)

## How it should be redesigned later

```
Recommended future formula:
  Required Skill Match × 30%  (from resume or manual entry)
  + Preferred Skill Match × 15%
  + Project Evidence × 20%  (from portfolio)
  + Experience Relevance × 15%  (from resume)
  + Roadmap Completion × 10%
  + Certification Bonus × 10%
```

---

# 15. Roadmaps

## Purpose
Generate step-by-step learning paths for technologies.

## What the user sees
- List of their roadmaps with progress
- Roadmap detail with milestones and tasks
- Task checklist with toggle
- Progress bars

## What the user does
- Enters a technology name (e.g., "Python")
- System generates a roadmap
- User completes tasks by checking them off
- Progress is tracked automatically

## Which API is called
- `GET /api/roadmaps` (list)
- `POST /api/roadmaps` (generate)
- `GET /api/roadmaps/:id` (detail)
- `PATCH /api/roadmaps/:rid/tasks/:tid/toggle` (toggle task)
- `DELETE /api/roadmaps/:id` (delete)

## Which database data is involved
- `roadmaps` table
- `milestones` table
- `tasks` table
- `user_skills` table (auto-sync on task completion)
- `activity` table (log creation)

## Whether scraping is involved
No.

## Whether AI is involved
No — uses hardcoded templates.

## How the result is calculated

### Current hardcoded templates

**For Python, React, JavaScript:**
- 4 milestones with 5 tasks each
- Specific, meaningful task titles

**For all other technologies:**
- Generic 4-milestone template
- Boilerplate task titles: "Learn [Technology] Basics", "Build a Project", etc.

### Example Roadmap (Python)

```
Roadmap: Python
├── Milestone 1: Python Fundamentals (2 weeks)
│   ├── Task: Variables, data types, and operators
│   ├── Task: Control flow (if/else, loops)
│   ├── Task: Functions and modules
│   ├── Task: OOP basics (classes, inheritance)
│   └── Task: File handling and I/O
├── Milestone 2: Data Processing (3 weeks)
│   ├── Task: NumPy arrays and operations
│   ├── Task: Pandas DataFrames
│   ├── Task: Data cleaning techniques
│   ├── Task: CSV/JSON processing
│   └── Task: Basic data visualization with Matplotlib
├── Milestone 3: Web Development (3 weeks)
│   ├── Task: Flask/FastAPI basics
│   ├── Task: REST API design
│   ├── Task: Database integration (SQLAlchemy)
│   ├── Task: Authentication and middleware
│   └── Task: API documentation
└── Milestone 4: Industry Project (4 weeks)
    ├── Task: Project planning and architecture
    ├── Task: Testing with pytest
    ├── Task: Docker containerization
    ├── Task: CI/CD pipeline setup
    └── Task: Deployment to cloud
```

### Skill Sync on Task Toggle

When a task is completed:
1. Calculate roadmap progress = completedTasks / totalTasks
2. Map progress to skill level:
   - 100% → "expert"
   - ≥70% → "advanced"
   - ≥40% → "intermediate"
   - ≥15% → "beginner"
   - <15% → remove skill
3. Update or insert into `user_skills` table

## Why a roadmap can currently show 0 milestones or 0 tasks

Possible reasons:
1. **Database query error** — If the `milestones` or `tasks` table query fails silently
2. **Insert failure** — If the milestone insert succeeds but task insert fails (MySQL doesn't support `.returning()`)
3. **Race condition** — If the roadmap is queried before milestones are fully inserted
4. **Bug in select after insert** — The code selects by `userId` and `technology` which could return wrong record if user has multiple roadmaps for same tech

## Current limitations
- Only 3 technologies have meaningful templates
- All other techs get identical generic content
- No personalization based on user's current skill level
- No market demand integration
- No difficulty progression

## Recommended future AI-generated roadmap flow

```
1. User submits technology name + career goal
2. AI generates personalized milestones based on:
   - User's current skill level
   - Market demand data
   - Industry best practices
   - Career goal alignment
3. AI generates specific tasks for each milestone
4. System stores in database
5. User follows the path
6. System tracks progress and adjusts recommendations
```

---

# 16. Market Intelligence

## Purpose
Show trending technologies from real job market data.

## What the user sees
- Top 3 trending stacks
- Technology frequency bar chart
- Top technologies ranked list
- Stats: jobs analyzed, unique techs, stack combinations

## What the user does
- Views trending technologies
- Sees which skills are in demand
- Compares their skills to market trends

## Which API is called
- `GET /api/jobs/trending-stacks`
- `GET /api/jobs/top-3-stacks`
- `GET /api/jobs/scraped`

## Which database data is involved
- `scraped_job_postings` table
- `tech_trends` table

## Whether scraping is involved
Yes — this is the primary consumer of scraped data.

## Whether AI is involved
No — uses statistical frequency counting.

## How the result is calculated

```
1. Count frequency of each technology across all scraped jobs
2. Calculate percentage share for each technology
3. Detect stack combinations (MERN, MEAN, LAMP, etc.)
4. Sort by frequency
5. Return top technologies and combinations
```

## What happens if something fails
- No scraped data → Empty charts
- Scraping fails → Stale data

## Current limitations
- No AI-powered trend analysis
- No predictions or forecasts
- Data may be outdated if scraper not run recently

## Recommended future improvements
- AI-powered trend predictions
- Industry-specific trend analysis
- Skill demand forecasting

---

# 17. Scraper

## Purpose
Collect job data from various sources for market intelligence.

## What the user sees
- Admin scraping portal (admin only)
- Scraped job results
- Trend analysis

## What the user does
- Admin triggers scraping
- Admin manages job sources
- Admin views results

## Which API is called
- `GET /api/jobs/scrape` (admin only)
- `POST /api/jobs/scrape-naukri` (admin only)
- `POST /api/jobs/add-source` (admin only)
- `GET /api/jobs/sources` (admin only)

## Which database data is involved
- `scraped_job_postings` table
- `tech_trends` table
- `job_sources.json` config file

## Whether scraping is involved
Yes — this IS the scraping system.

## Whether AI is involved
No.

## Current scraping sources

| Source | Technology | Status |
|--------|------------|--------|
| Greenhouse | JSON API + cheerio | Working |
| Lever | JSON API + cheerio | Working |
| Generic HTML | axios + cheerio | Working |
| Naukri | Playwright (headless browser) | Working |
| Adzuna | REST API | Working (placeholder keys) |
| SerpAPI | Google Jobs engine | Working |

## What happens if something fails
- Individual source failure → Logged, continues
- Playwright crash → May affect server
- Rate limiting → 429 errors

## Current limitations
- Only 18 hardcoded URLs
- Cron scheduler disabled by default
- No deduplication
- No LinkedIn/Indeed/Glassdoor

## Recommended future improvements
- Enable cron scheduler
- Add more sources
- Add deduplication
- Add LinkedIn scraper (if ToS allows)

---

# 18. SerpAPI

## Purpose
Search Google Jobs for structured job data.

## What the user sees
- SerpAPI search results
- Status check (API key configured or not)

## What the user does
- Admin triggers SerpAPI search
- System returns structured job data

## Which API is called
- `POST /api/jobs/search-serpapi` (auth required)
- `POST /api/jobs/search-batch` (admin only)
- `GET /api/jobs/serpapi-status` (auth required)

## Which database data is involved
- `scraped_job_postings` table (stores results)

## Whether scraping is involved
Yes — SerpAPI IS a scraping service.

## Whether AI is involved
No — SerpAPI is a search API, not an AI model.

## How the result is calculated

```
1. User submits search query
2. System calls SerpAPI with google_jobs engine
3. SerpAPI returns structured job data
4. System normalizes results into ScrapedJobData format
5. Extracts tech keywords using techStackExtractor
6. Stores in scraped_job_postings table
```

## Current limitations
- Free tier: 100 searches/month
- Rate limiting: 429 errors if exceeded
- No caching

## Recommended future improvements
- Cache results
- Batch queries efficiently
- Use Adzuna for volume

---

# 19. AI Integration

## Current Status: NO AI/LLM INTEGRATION EXISTS

**Confirmed via exhaustive search:**
- Zero imports of `openai`, `anthropic`, `@google/generative-ai`, `langchain`
- Zero `OPENAI_API_KEY` or similar env vars
- Zero prompt templates
- Zero AI-related npm packages

**The "AI" branding is marketing only.** All "intelligence" features use:

| Feature | What it claims | What it actually uses |
|---------|---------------|----------------------|
| Roadmap generation | "AI-generated" | Hardcoded templates |
| Strength insights | "Intelligent analysis" | Rule-based strings |
| Tech extraction | "Smart extraction" | Regex/keyword matching |
| Trend analysis | "AI-powered" | Frequency counting |
| Scoring | "Dynamic AI scoring" | Weighted arithmetic |

## What would be needed for AI integration

| Component | Current | Required |
|-----------|---------|----------|
| LLM Provider SDK | None | `openai` or `anthropic` |
| API Key | None | `OPENAI_API_KEY` |
| Prompt templates | None | System/user prompts |
| Token management | None | Rate limiting, cost tracking |
| Response parsing | None | Structured output parsing |
| Fallback logic | None | Graceful degradation |

## Possible AI responsibilities

| Task | AI Role | Backend Role |
|------|---------|--------------|
| Resume parsing | Extract sections, skills | Validate output |
| Skill extraction | Identify skills from text | Normalize names |
| Job description analysis | Extract requirements | Store in DB |
| Resume-to-job matching | Semantic comparison | Calculate scores |
| Gap explanations | Explain what's missing | Generate suggestions |
| Roadmap generation | Create personalized paths | Store in DB |
| Learning recommendations | Suggest resources | Track progress |
| Market intelligence summaries | Summarize trends | Display in UI |

## Reliability risks
- LLM hallucinations (incorrect recommendations)
- Response inconsistency (same prompt, different outputs)
- Token limits (large resumes may exceed context)
- Cost (API calls cost money)

## How to validate AI responses
- Validate against schema
- Use fallback to algorithmic scoring
- Log all AI outputs for review
- Allow user feedback

---

# 20. Authentication

## Purpose
Verify user identity and control access.

## What the user sees
- Sign In page
- Sign Up page
- Loading screen while checking auth
- Error screen if auth fails

## What the user does
- Signs up with email/password
- Signs in with credentials
- Gets auto-redirected based on auth state

## Which API is called
- Clerk handles auth (external service)
- Backend verifies tokens via `requireAuth` middleware

## Which database data is involved
- `users` table (linked by `clerk_id`)

## Whether scraping is involved
No.

## Whether AI is involved
No.

## How it works

```
1. User signs up/in via Clerk
2. Clerk returns a JWT token
3. Frontend stores token
4. Every API request includes token in header
5. Backend middleware verifies token
6. If valid → process request
7. If invalid → return 401
```

## Current limitations
- Dev mode skips auth (for development only)
- No role-based access control beyond admin

## Recommended future improvements
- Add role-based access control
- Add rate limiting per user
- Add audit logging

---

# 21. Database

## Purpose
Store all application data persistently.

## Database type
MySQL (hosted on Aiven)

## All tables

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User profiles | id, clerk_id, name, email, skills (JSON) |
| `projects` | User projects | id, user_id, title, technologies (JSON), difficulty, status |
| `roadmaps` | Learning roadmaps | id, user_id, technology |
| `milestones` | Roadmap milestones | id, roadmap_id, title, description, order_index |
| `tasks` | Roadmap tasks | id, milestone_id, title, completed |
| `jobs` | Job listings | id, title, company, required_skills (JSON) |
| `user_skills` | User skills | id, user_id, name, proficiency_level |
| `user_certifications` | User certifications | id, user_id, name, issuing_body |

### Scraping Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `scraped_job_postings` | Scraped job data | id, url, title, description, technologies (JSON) |
| `tech_trends` | Aggregated trends | id, technology, count, percentage |

### Portfolio Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `portfolios` | Portfolio containers | id, student_id, title, visibility |
| `portfolio_projects` | Portfolio-project links | id, portfolio_id, project_id |

### Analysis Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `analysis_config` | Scoring weights | id, projects_weight, skills_weight |
| `user_score_weights` | Per-user weights (UNUSED) | id, user_id, dimension, weight |

### Job Listing Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `job_listings` | Adzuna job listings | id, title, company, skills (JSON) |
| `user_saved_jobs` | Saved jobs | id, user_id, job_listing_id |

### Domain Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `domains` | Career domains | id, name, description |
| `domain_skill_map` | Domain-skill links | id, domain_id, skill |

### Activity Table

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `activity` | Activity log | id, user_id, type, title, description |

## Simple relationship diagram

```
users ──┬── projects ──── project_stack_tags ──── roadmaps
        ├── user_skills                              │
        ├── user_certifications                      │
        ├── roadmaps ──── milestones ──── tasks      │
        ├── portfolios ──── portfolio_projects ──────┘
        ├── activity
        └── user_saved_jobs ──── job_listings

jobs (standalone)
scraped_job_postings (standalone)
tech_trends (standalone)
domains ──── domain_skill_map
```

---

# 22. Frontend/Backend Architecture

## Frontend

**Technology:** React + Vite + TailwindCSS + React Query

**Key libraries:**
- React (UI framework)
- Vite (build tool)
- TailwindCSS (styling)
- React Query (data fetching)
- Recharts (charts)
- Framer Motion (animations)
- Clerk (authentication)
- Wouter (routing)

## Backend

**Technology:** Express + Drizzle ORM + MySQL

**Key libraries:**
- Express (HTTP server)
- Drizzle ORM (database queries)
- Zod (validation)
- Cheerio (HTML parsing)
- Playwright (browser automation)
- SerpAPI (job search)

## Communication flow

```
Frontend (React)
  ↓ HTTP requests (fetch/axios)
Backend API (Express)
  ↓ SQL queries (Drizzle ORM)
Database (MySQL)
  ↓
External APIs (SerpAPI, Adzuna, Clerk)
```

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Backend | MySQL connection |
| `CLERK_SECRET_KEY` | Backend | Auth verification |
| `SERPAPI_API_KEY` | Backend | Job search |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend | Auth UI |
| `VITE_API_URL` | Frontend | Backend URL |

---

# 23. Deployment

## Current setup
- **Frontend**: Vite build → static files
- **Backend**: Node.js/Express server
- **Database**: Aiven MySQL (cloud)
- **Auth**: Clerk (cloud)
- **Scraping**: SerpAPI + Adzuna (cloud APIs)

## Deployment targets
- Frontend: `myprojectory.com`
- Backend: `api.myprojectory.com`

## Build commands
```bash
# Frontend
cd artifacts/careerstack && pnpm run build

# Backend
cd artifacts/api-server && pnpm run build
```

---

# 24. Current Bugs

| Bug | Where | Impact | Severity |
|-----|-------|--------|----------|
| Dashboard and Scores page show different readiness scores | `dashboard.ts:66` vs `scores.ts:98` | User confusion | High |
| Tech comfort scoring duplicated in `portfolio.ts` and `scores.ts` | `portfolio.ts:94`, `scores.ts:21` | Maintenance risk | Medium |
| `logger` import missing in `roadmaps.ts` (fixed in current session) | `roadmaps.ts:3` | "Roadmap not found" error | High |
| `comfortComponent` formula uses same variable twice | `scores.ts:116` | Unusual calculation | Low |
| `user_score_weights` table never populated | `scoring.ts` | Unused code | Low |
| `career_goal` field unused | `users.ts` | Dead code | Low |
| Manual weight configuration disabled | `analysis.ts:47` | 403 error | Low |

---

# 25. Security and Reliability Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| SerpAPI quota exhaustion | Free tier: 100 searches/month | Cache results, use Adzuna for volume |
| AI hallucinations | If AI added, may give wrong advice | Validate output, use fallback |
| Score inconsistency | Different formulas across pages | Consolidate scoring logic |
| Scraper failure | Playwright may crash | Error handling, graceful degradation |
| Data quality | Scraped data may have duplicates | Add deduplication pipeline |
| API key exposure | Keys must not reach frontend | Server-side only API calls |
| Prompt injection | If AI added, user input could manipulate | Sanitize inputs, validate output |
| Database limits | Aiven free tier has connection limits | Use connection pooling |

---

# 26. Recommended Development Order

## Phase 1: Fix existing bugs (1-2 weeks)
1. Consolidate scoring logic (Dashboard + Scores page)
2. Remove duplicated tech comfort code
3. Fix `logger` import in roadmaps.ts
4. Enable manual weight configuration

## Phase 2: Add resume system (2-3 weeks)
5. Add PDF parsing library
6. Create resume upload endpoint
7. Build resume section extraction
8. Create `resumes` database table
9. Build skill extraction from resume

## Phase 3: Add AI integration (2-3 weeks)
10. Install OpenAI/Anthropic SDK
11. Create AI service abstraction
12. Build prompt template system
13. Add AI-powered insights

## Phase 4: Enhance matching (1-2 weeks)
14. Add semantic job matching
15. Factor in skill proficiency
16. Add experience level matching

## Phase 5: Enhance roadmaps (1-2 weeks)
17. Replace templates with AI generation
18. Add personalization based on skill level
19. Integrate market demand data

## Phase 6: Scraper expansion (1-2 weeks)
20. Add more job sources
21. Enable cron scheduler
22. Add deduplication

---

# Appendix A: How to Explain MyProjectory in 30 Seconds

"MyProjectory is a career readiness platform that helps students prepare for jobs. You add your projects and skills, and the system calculates how ready you are for interviews. It shows you trending technologies from real job data and gives you learning roadmaps to fill your skill gaps. Think of it as a career GPS that tells you where you are and how to get to your dream job."

---

# Appendix B: How to Explain MyProjectory in 1 Minute

"MyProjectory is a web platform that helps students measure and improve their job readiness. Here's how it works:

First, you create a profile and add your projects, skills, and certifications. The system then calculates a readiness score based on how your skills match what employers are looking for in the job market.

The platform scrapes real job postings from websites like Greenhouse, Lever, and Naukri to understand which technologies are trending. It then compares your skills against these trends to show you where you stand.

You can generate learning roadmaps for specific technologies — like Python or React — and track your progress as you complete tasks. The system automatically updates your readiness score as you learn.

Finally, you can browse job listings that match your skills and see exactly which skills you have and which ones you're missing. You can also share your portfolio publicly with a link."

---

# Appendix C: How to Explain the Technical Architecture

"MyProjectory has three main parts:

1. **Frontend** — A React application that users interact with. It's built with Vite and TailwindCSS. It communicates with the backend via API calls.

2. **Backend** — An Express.js server that handles all business logic. It uses Drizzle ORM to talk to the database and Zod for validation.

3. **Database** — A MySQL database hosted on Aiven that stores all user data, projects, jobs, and scraped information.

The system also integrates with external services:
- **Clerk** for authentication
- **SerpAPI** for job search
- **Adzuna** for job listings

Data flows like this: User interacts with frontend → Frontend calls backend API → Backend queries database → Backend returns results → Frontend displays results.

For scraping, the flow is: Admin triggers scraper → Scraper fetches job websites → Extracts tech keywords → Stores in database → Trend analyzer aggregates data → Frontend displays trends."

---

# Appendix D: How to Explain the Scoring System

"The scoring system calculates a readiness score from 0 to 100. It considers four main factors:

1. **Tech Comfort** (35% weight) — How complex are the technologies you've used in your projects?

2. **Market Demand** (25% weight) — How many of your skills appear in the top 20 most demanded skills?

3. **Roadmap Completion** (25% weight) — What percentage of your learning roadmap tasks have you completed?

4. **Portfolio Strength** (15% weight) — How many completed projects do you have?

The system automatically adjusts these weights based on your portfolio. For example, if you have many certifications, it shifts some weight from skills to certifications.

The final score determines your status:
- 80+ = Job Ready
- 60-79 = Interview Ready
- 30-59 = Needs Improvement
- Below 30 = Not Ready

The formula is:
```
Score = (Portfolio × ProjectsWeight + Comfort × SkillsWeight + MarketDemand × TrendWeight + Roadmap × RoadmapWeight) / 100
```"

---

# Appendix E: How to Explain the Role of AI

"Currently, MyProjectory does NOT use any AI or machine learning. All the features that say 'AI-powered' are actually implemented using traditional programming:

- **Roadmap generation** uses hardcoded templates, not AI
- **Strength insights** use rule-based string concatenation, not AI
- **Tech extraction** uses regex pattern matching, not AI
- **Scoring** uses weighted arithmetic formulas, not AI

In the future, AI could be used for:
- Parsing resumes and extracting skills
- Generating personalized learning roadmaps
- Providing intelligent career recommendations
- Understanding the meaning behind skills (semantic matching)
- Summarizing market trends

For AI integration, we would need to add an OpenAI or Anthropic API key and build prompt templates for each feature."

---

# Appendix F: How to Explain the Role of the Scraper

"The scraper collects real job data from the internet to power the Market Intelligence feature. Here's how it works:

1. **Sources**: We scrape from Greenhouse (company career pages), Lever (company career pages), Naukri (Indian job board), and Adzuna (job aggregator).

2. **Process**: The scraper fetches each job page, extracts the job title, company, description, and required skills. It uses a library of 130+ technology keywords to identify which skills each job requires.

3. **Storage**: All scraped jobs are stored in the database. A trend analyzer then counts how often each technology appears across all jobs.

4. **Display**: The Market Intelligence page shows which technologies are trending, what percentage of jobs require each skill, and which tech stacks are most popular.

5. **SerpAPI**: We also use SerpAPI to search Google Jobs for structured job data. This gives us additional job listings beyond what we scrape directly.

The scraper is admin-only and can be triggered manually or on a schedule (currently disabled by default)."

---

# Appendix G: Likely Viva Questions and Simple Answers

**Q: What is MyProjectory?**
A: A career readiness platform that helps students measure job readiness, track skill gaps, and follow learning roadmaps.

**Q: What technology stack does it use?**
A: React + Vite (frontend), Express.js (backend), MySQL (database), Clerk (auth), SerpAPI (job search).

**Q: How does the scoring system work?**
A: It combines four factors — tech comfort, market demand, roadmap completion, and portfolio strength — using weighted arithmetic formulas.

**Q: Is AI used in the project?**
A: Not currently. The "AI" branding is marketing. All features use traditional algorithms — regex matching, weighted formulas, and hardcoded templates.

**Q: How does job matching work?**
A: It compares your skills against job requirements using exact string matching and calculates a match percentage.

**Q: How does the scraper work?**
A: It fetches job postings from Greenhouse, Lever, Naukri, and Adzuna, extracts tech keywords using 130+ rules, and stores the data for trend analysis.

**Q: What are the main limitations?**
A: No AI integration, no resume parsing, only 3 roadmap templates, exact string matching for jobs, and inconsistent scoring between Dashboard and Scores page.

**Q: How would you improve it?**
A: Add AI for resume parsing and roadmap generation, add semantic job matching, consolidate scoring logic, and add more job sources.

**Q: What is the database schema?**
A: Key tables are users, projects, roadmaps, milestones, tasks, jobs, user_skills, and scraped_job_postings.

**Q: How does authentication work?**
A: Clerk handles sign-up/sign-in. The backend verifies JWT tokens via middleware. Every API request requires a valid token.

---

# Appendix H: Current Status: Working, Partial, Broken, Not Implemented

## Working
| Feature | Status |
|---------|--------|
| User authentication (Clerk) | Working |
| Profile management | Working |
| Portfolio management | Working |
| Project CRUD | Working |
| Skills management | Working |
| Certifications management | Working |
| Roadmap generation (3 templates + generic) | Working |
| Roadmap task toggle + skill sync | Working |
| Scoring system (algorithmic) | Working |
| Job listing display | Working |
| Job matching (exact string) | Working |
| Web scraping (Greenhouse/Lever/Generic) | Working |
| Naukri scraping (Playwright) | Working |
| SerpAPI integration | Working |
| Adzuna integration | Working |
| Trend analysis | Working |
| Market Intelligence display | Working |
| Portfolio sharing | Working |
| PDF generation | Working |
| Admin scraping portal | Working |

## Partially Working
| Feature | Issue |
|---------|-------|
| Readiness score | Dashboard uses different formula than Scores page |
| Roadmap templates | Only 3 techs have meaningful templates |
| Job matching | Exact string only, no semantic understanding |
| Weight configuration | Disabled (returns 403) |
| `career_goal` field | Exists but unused |
| `user_score_weights` table | Schema exists but never populated |

## Broken
| Feature | Issue |
|---------|-------|
| Dashboard readiness score | Inconsistent with Scores page |
| Tech comfort scoring | Duplicated in portfolio.ts and scores.ts |
| `logger` import in roadmaps.ts | Fixed in current session |

## Not Implemented
| Feature | Status |
|---------|--------|
| AI/LLM integration | No SDK, no API calls, no prompts |
| Resume upload/parsing | No code exists |
| Resume-to-job matching | No code exists |
| Semantic job matching | No code exists |
| AI roadmap generation | No code exists |
| LinkedIn/Indeed/Glassdoor scrapers | No code exists |
| Skill gap analysis | Basic trend alignment only |

---

# Appendix I: Recommended Implementation Roadmap

## Phase 1: Audit and Fix (Weeks 1-2)
- Consolidate scoring logic
- Remove duplicated code
- Fix known bugs
- Document API contracts

## Phase 2: Scraper Integration (Weeks 3-4)
- Enable cron scheduler
- Add more job sources
- Add deduplication
- Improve error handling

## Phase 3: AI Integration (Weeks 5-7)
- Install OpenAI/Anthropic SDK
- Create AI service layer
- Build prompt templates
- Add AI-powered insights

## Phase 4: Resume Gap Mapping (Weeks 8-10)
- Add PDF parsing
- Create resume upload
- Build skill extraction
- Create gap analysis

## Phase 5: Score and Readiness (Weeks 11-12)
- Redesign scoring formula
- Add resume-based scoring
- Add AI explanations
- Consolidate all scoring logic

## Phase 6: Roadmap Generation (Weeks 13-14)
- Replace templates with AI
- Add personalization
- Integrate market data
- Add difficulty progression

## Phase 7: Visual Redesign (Weeks 15-16)
- Improve UI/UX
- Add mobile responsiveness
- Improve loading states
- Add error states

## Phase 8: Testing (Weeks 17-18)
- Add unit tests
- Add integration tests
- Add end-to-end tests
- Performance testing

## Phase 9: Deployment (Weeks 19-20)
- Production deployment
- Monitoring setup
- Documentation
- User feedback collection

---

# Appendix J: Glossary of Technical Terms

| Term | Simple Explanation |
|------|-------------------|
| **API** | A way for two computer programs to talk to each other. Like a waiter taking your order to the kitchen. |
| **Frontend** | The part of the website you see and interact with (buttons, pages, forms). |
| **Backend** | The part of the website that runs on the server — processes data, talks to the database. |
| **Database** | A structured place where the website stores data (like a spreadsheet in the cloud). |
| **AI model** | A computer program that can understand text, make predictions, or generate content (like ChatGPT). |
| **Prompt** | Instructions you give to an AI model to tell it what to do. |
| **Structured JSON** | Data organized in a specific format that computers can easily read. |
| **Resume parsing** | Extracting information from a resume file (like a PDF) and turning it into structured data. |
| **Skill extraction** | Identifying which skills are mentioned in a text (like a job description or resume). |
| **Web scraping** | Automatically collecting data from websites. |
| **SerpAPI** | A service that lets you search Google and get structured results. |
| **Readiness score** | A number (0-100) showing how prepared you are for job interviews. |
| **Resume gap** | The difference between what a job requires and what your resume shows. |
| **Roadmap** | A step-by-step plan for learning new skills. |
| **Milestone** | A major checkpoint in a learning roadmap (like "Complete Python Basics"). |
| **Task** | A small action item within a milestone (like "Learn about loops"). |
| **Authentication** | Verifying who you are (like signing in with username and password). |
| **Deployment** | Making your website available for people to use on the internet. |
| **Environment variable** | A secret setting that tells the website how to connect to services (like database passwords). |
| **Clerk** | A service that handles user sign-up and sign-in for you. |
| **Drizzle ORM** | A tool that lets JavaScript talk to MySQL databases easily. |
| **React Query** | A tool that makes it easy to fetch and cache data in React apps. |
| **Zod** | A tool that checks if data matches expected format (like validating form inputs). |
| **Playwright** | A tool that controls a web browser automatically (like a robot using Chrome). |
| **Cheerio** | A tool that reads HTML and extracts data from web pages. |
| **Regex** | Patterns used to find and match text (like finding all email addresses in a document). |
| **JWT** | A digital ticket that proves you are who you say you are. |
| **CORS** | A security feature that controls which websites can talk to your API. |
| **Cron job** | A task that runs automatically on a schedule (like every day at midnight). |
| **Rate limiting** | Restricting how many requests someone can make in a time period. |
| **Hallucination** | When an AI model makes up information that sounds confident but is wrong. |

---

# Final Summary

## Exact Current System Flow

```
User signs up → Fills profile → Adds projects/skills/certifications
    ↓
System calculates readiness score (algorithmic, no AI)
    ↓
User generates roadmap (hardcoded templates)
    ↓
User completes tasks → Score updates automatically
    ↓
System shows job matches (exact string matching)
    ↓
System shows market trends (from scraped data)
    ↓
User shares portfolio publicly
```

## Most Urgent Problems

1. **Dashboard vs Scores page scoring inconsistency** — Different formulas show different numbers
2. **No AI integration** — "AI" branding is misleading
3. **No resume system** — Users must enter everything manually
4. **Limited roadmap templates** — Only 3 technologies have good templates
5. **Exact string matching** — Job matching is too simplistic

## What Should Be Fixed First

1. Consolidate scoring logic across Dashboard and Scores page
2. Remove duplicated tech comfort code
3. Fix the `comfortComponent` formula

## What Should Be Integrated Later

1. AI for resume parsing and skill extraction
2. AI for roadmap generation
3. Semantic job matching
4. Resume gap mapping
5. LinkedIn/Indeed scrapers

## What Should Not Be Changed Yet

1. Database schema (until resume system is designed)
2. Authentication flow (Clerk is working fine)
3. Frontend framework (React + Vite is solid)
4. Backend framework (Express is sufficient)

---

> **Report generated:** September 2026
> **No application code was changed during this documentation task.**
