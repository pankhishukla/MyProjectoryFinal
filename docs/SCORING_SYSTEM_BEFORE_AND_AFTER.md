# Scoring System — Before and After Standardization

> Date: September 2026
> Phase 1: Standardize the scoring system

---

## Current Problems

### Problem 1: Dashboard and Scores page use different formulas

**Dashboard** (`dashboard.ts:66`):
```
readinessScore = comfortComponent × 0.35 + roadmapProgress × 0.25 + portfolioComponent × 0.15
```
- Uses hardcoded weights (0.35, 0.25, 0.15)
- Missing: marketDemandComponent (not included at all)
- Only 3 factors instead of 4

**Scores page** (`scores.ts:98` + `scoring.service.ts:121`):
```
overallScore = calculateReadinessScore(comfort, marketDemand, roadmap, portfolio, weights)
```
- Uses dynamic weights from `calculateDynamicWeights()`
- Includes all 4 factors
- Weights change based on user portfolio

**Result**: Same user sees different readiness scores on Dashboard vs Scores page.

### Problem 2: comfortComponent uses duplicated variable

**Both** `dashboard.ts:64` and `scores.ts:116`:
```
comfortComponent = min(100, projects.length * 15 + completedProjects.length * 10)
```

But the query already filters for completed projects:
```typescript
const projects = await db.select().from(projectsTable)
  .where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
const completedProjects = projects.filter(p => p.completionStatus === "completed");
```

Since the query already returns only completed projects, `projects.length === completedProjects.length`. This means:
```
comfortComponent = min(100, N × 15 + N × 10) = min(100, N × 25)
```

This is **identical** to `portfolioComponent = min(100, completedProjects.length × 25)`.

So comfortComponent and portfolioComponent are always the same value.

### Problem 3: Tech comfort scoring is duplicated

`computeTechScores()` in `portfolio.ts:94-136` is identical to the logic in `scores.ts:21-66`.

### Problem 4: Dashboard missing market demand factor

The Dashboard formula does not include marketDemandComponent at all. It only uses:
- comfortComponent (which equals portfolioComponent due to bug)
- roadmapProgress
- portfolioComponent (which equals comfortComponent due to bug)

---

## Where Each Formula Is Used

| Location | File | Line | Formula | Factors |
|----------|------|------|---------|---------|
| Dashboard readiness | `dashboard.ts` | 66 | `comfort×0.35 + roadmap×0.25 + portfolio×0.15` | 3 (missing market) |
| Scores page readiness | `scores.ts` | 98-149 | `calculateReadinessScore()` with dynamic weights | 4 |
| Strength breakdown | `analysis.ts` | 53-136 | 5 separate dimension scores | 5 |
| Tech comfort (per tech) | `scores.ts` | 21-66 | Per-technology comfort scores | N/A (display only) |
| Tech comfort (portfolio) | `portfolio.ts` | 94-136 | DUPLICATE of scores.ts logic | N/A (display only) |
| Market demand (per tech) | `scores.ts` | 68-96 | Per-technology demand scores | N/A (display only) |

---

## Selected Canonical Formula

The canonical formula is `calculateReadinessScore()` from `scoring.service.ts:121`.

### Why this is the right choice:
1. It includes all 4 factors (comfort, market demand, roadmap, portfolio)
2. It uses dynamic weights that adapt to user portfolio
3. It is already used by the Scores page (the detailed view)
4. It normalizes weights to ensure score stays 0-100

### The canonical formula:

```typescript
function calculateReadinessScore(
  comfortScore: number,      // 0-100: How comfortable is user with their technologies
  marketDemandScore: number,  // 0-100: How many of user's skills are in market demand
  roadmapScore: number,       // 0-100: What % of roadmap tasks are completed
  portfolioScore: number,     // 0-100: How many completed projects (capped at 100)
  weights: ScoringWeights     // Dynamic weights based on portfolio content
): number {
  const sumWeights = projectsWeight + skillsWeight + certificationsWeight + 
                     trendAlignmentWeight + roadmapCompletionWeight + executionProgressWeight;
  const normalizedFactor = sumWeights > 0 ? 100 / sumWeights : 1;

  const score = (
    (portfolioScore * weights.projectsWeight) +
    (comfortScore * weights.skillsWeight) +
    (marketDemandScore * weights.trendAlignmentWeight) +
    (roadmapScore * weights.roadmapCompletionWeight)
  ) / 100;

  return Math.round(score * normalizedFactor);
}
```

---

## Every Factor and Weight

### Component Scores (each 0-100)

| Component | Calculation | Range | Source |
|-----------|-------------|-------|--------|
| **comfortScore** | Per-technology: `(complexitySum / maxPossible) × 100` | 0-100 | Project technologies |
| **marketDemandScore** | `(userSkillsInTop20 / 20) × 100` | 0-100 | Jobs table |
| **roadmapScore** | `(completedTasks / totalTasks) × 100` | 0-100 | Roadmaps/tasks |
| **portfolioScore** | `min(100, completedProjects × 25)` | 0-100 | Projects table |

### Dynamic Weights (adjusted per user)

| Weight | Base Value | Adjustments |
|--------|------------|-------------|
| **projectsWeight** | 15 | +10 if project-heavy, -5 if skill-heavy |
| **skillsWeight** | 35 | -10 if project-heavy, +5 if skill-heavy |
| **certificationsWeight** | 0 | +15 if user has certifications |
| **trendAlignmentWeight** | 25 | Fixed (market anchor) |
| **roadmapCompletionWeight** | 25 | Fixed (progress anchor) |
| **executionProgressWeight** | 0 | Reserved for future use |

---

## Simple Numerical Example

**User has:**
- 3 completed projects (Python, React, SQL)
- 5 skills in user_skills
- 1 certification
- 2 roadmaps with 10 tasks total, 6 completed
- 2 of user's skills are in top 20 market skills

### Step 1: Component scores

```
comfortScore = 75  (from per-technology analysis)
marketDemandScore = (2/20) × 100 = 10
roadmapScore = (6/10) × 100 = 60
portfolioScore = min(100, 3 × 25) = 75
```

### Step 2: Dynamic weights (with 1 certification)

```
certW = min(15, 1×5) = 5
takeFromSkills = min(35-10, ceil(5×0.7)) = 4
skillW = 35 - 4 = 31
projW = 15 - 1 = 14

Final weights: projects=14, skills=31, certs=5, trend=25, roadmap=25
sumWeights = 14+31+5+25+25 = 100
normalizedFactor = 100/100 = 1
```

### Step 3: Final score

```
score = (75×14 + 75×31 + 10×25 + 60×25) / 100
      = (1050 + 2325 + 250 + 1500) / 100
      = 5125 / 100
      = 51.25

overallScore = round(51.25 × 1) = 51
status = "needs_improvement" (≥30 but <60)
```

---

## What Changed

| Change | Before | After |
|--------|--------|-------|
| Dashboard formula | `comfort×0.35 + roadmap×0.25 + portfolio×0.15` | Uses `calculateReadinessScore()` with dynamic weights |
| comfortComponent | `projects.length * 15 + completedProjects.length * 10` (duplicated variable) | `min(100, completedProjects.length * 25)` (clear, single factor) |
| marketDemandComponent in Dashboard | Missing | Included via `calculateReadinessScore()` |
| Tech comfort logic | Duplicated in `portfolio.ts` and `scores.ts` | Single function in `scoring.service.ts` |
| Dashboard and Scores consistency | Different scores | Same score |

## What Did Not Change

- The Scores page behavior (already uses canonical formula)
- The strength breakdown logic
- The per-technology tech comfort display
- The per-technology market demand display
- The trend alignment logic
- The database schema
- The API response shapes
- The frontend display components

---

## How Future Resume and AI Scores Can Be Added Safely

The canonical formula is designed to be extensible:

### Adding a resume score:
1. Add a new field to `ScoringWeights`: `resumeWeight: number`
2. Add a new parameter to `calculateReadinessScore()`: `resumeScore: number`
3. Include it in the weighted sum
4. Adjust the normalization factor

### Adding AI insights:
1. AI insights are display-only (text recommendations)
2. They do not affect the numeric score
3. They can be added as a separate field in the API response

### Adding new scoring factors:
1. Add new weight to `ScoringWeights` interface
2. Add new parameter to `calculateReadinessScore()`
3. Include in weighted sum
4. Normalize to 0-100

The key principle: **scoring logic stays in `scoring.service.ts`**, all consumers call the same function.

---

## Files Changed

| File | Change |
|------|--------|
| `src/services/scoring.service.ts` | Added `computeTechScores()`, `computeComfortComponent()`, `computeMarketDemandComponent()`, `computeRoadmapComponent()`, `computePortfolioComponent()` |
| `src/routes/dashboard.ts` | Import and use canonical scoring from `scoring.service.ts` |
| `src/routes/scores.ts` | Import `computeTechScores` from `scoring.service.ts` instead of inline logic |
| `src/routes/portfolio.ts` | Import `computeTechScores` from `scoring.service.ts` instead of local function |
| `src/services/__tests__/scoring.service.test.ts` | New test file |
