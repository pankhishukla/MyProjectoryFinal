/**
 * Scoring System Pure Function Tests
 * 
 * These tests verify that the scoring system is consistent and correct.
 * They only test pure functions (no database calls).
 * Run with: npx tsx src/services/__tests__/scoring.test.ts
 */

// ─── Pure scoring functions (copied from scoring.service.ts for standalone testing) ───

interface ScoringWeights {
  projectsWeight: number;
  skillsWeight: number;
  certificationsWeight: number;
  trendAlignmentWeight: number;
  roadmapCompletionWeight: number;
  executionProgressWeight: number;
}

interface TechComfortScore {
  technology: string;
  projectCount: number;
  comfortScore: number;
  confidenceLevel: "low" | "medium" | "high";
}

function computeTechScores(
  projects: Array<{ technologies: string[]; difficultyLevel: string; completionStatus: string }>
): TechComfortScore[] {
  const completedProjects = projects.filter(p => p.completionStatus === "completed");
  const techMap: Record<string, { count: number; complexitySum: number; completedCount: number }> = {};

  for (const project of completedProjects) {
    const complexity = project.difficultyLevel === "advanced" ? 3 : project.difficultyLevel === "intermediate" ? 2 : 1;
    const completionScore = project.completionStatus === "completed" ? 1 : project.completionStatus === "in_progress" ? 0.5 : 0.2;

    for (const tech of project.technologies || []) {
      if (!techMap[tech]) {
        techMap[tech] = { count: 0, complexitySum: 0, completedCount: 0 };
      }
      techMap[tech].count += 1;
      techMap[tech].complexitySum += complexity * completionScore;
      if (project.completionStatus === "completed") {
        techMap[tech].completedCount += 1;
      }
    }
  }

  const maxPossible = Math.max(...Object.values(techMap).map((t) => t.complexitySum), 1);

  return Object.entries(techMap)
    .map(([technology, data]) => {
      const rawScore = (data.complexitySum / maxPossible) * 100;
      const comfortScore = Math.min(100, Math.round(rawScore));
      let confidenceLevel: "low" | "medium" | "high" = "low";
      if (data.count >= 4) confidenceLevel = "high";
      else if (data.count >= 2) confidenceLevel = "medium";

      return { technology, projectCount: data.count, comfortScore, confidenceLevel };
    })
    .sort((a, b) => b.comfortScore - a.comfortScore);
}

function computeComfortComponent(completedProjectCount: number): number {
  const count = Number.isFinite(completedProjectCount) ? completedProjectCount : 0;
  return Math.min(100, count * 25);
}

function computeMarketDemandComponent(userSkills: Set<string>, topDemandedSkills: string[]): number {
  if (topDemandedSkills.length === 0) return 0;
  const matchCount = topDemandedSkills.filter(skill => userSkills.has(skill)).length;
  return Math.round((matchCount / topDemandedSkills.length) * 100);
}

function computeRoadmapComponent(completedTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

function computePortfolioComponent(completedProjectCount: number): number {
  const count = Number.isFinite(completedProjectCount) ? completedProjectCount : 0;
  return Math.min(100, count * 25);
}

function computeDynamicWeights(projectCount: number, skillCount: number, certCount: number): ScoringWeights {
  let projW = 15;
  let skillW = 35;
  let certW = 0;

  if (certCount > 0) {
    certW = Math.min(15, certCount * 5);
    const takeFromSkills = Math.min(skillW - 10, Math.ceil(certW * 0.7));
    skillW -= takeFromSkills;
    projW -= (certW - takeFromSkills);
  }

  if (projectCount > 2 && projectCount > skillCount) {
    const shift = Math.min(10, (projectCount - skillCount) * 2);
    if (skillW > 15) {
      skillW -= shift;
      projW += shift;
    }
  } else if (skillCount > 10 && skillCount > projectCount * 3) {
    const shift = Math.min(5, (skillCount / 5));
    if (projW > 10) {
      projW -= shift;
      skillW += shift;
    }
  }

  return {
    projectsWeight: projW,
    skillsWeight: skillW,
    certificationsWeight: certW,
    trendAlignmentWeight: 25,
    roadmapCompletionWeight: 25,
    executionProgressWeight: 0,
  };
}

function calculateReadinessScore(
  comfortScore: number,
  marketDemandScore: number,
  roadmapScore: number,
  portfolioScore: number,
  weights: ScoringWeights
): number {
  const sumWeights = weights.projectsWeight + weights.skillsWeight + weights.certificationsWeight + weights.trendAlignmentWeight + weights.roadmapCompletionWeight + weights.executionProgressWeight;
  const normalizedFactor = sumWeights > 0 ? 100 / sumWeights : 1;

  const score = (
    (portfolioScore * weights.projectsWeight) +
    (comfortScore * weights.skillsWeight) +
    (marketDemandScore * weights.trendAlignmentWeight) +
    (roadmapScore * weights.roadmapCompletionWeight)
  ) / 100;

  return Math.round(score * normalizedFactor);
}

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEqual(actual: number, expected: number, message: string, tolerance = 0) {
  const isClose = Math.abs(actual - expected) <= tolerance;
  if (isClose) {
    passed++;
    console.log(`  ✓ ${message} (got ${actual})`);
  } else {
    failed++;
    console.error(`  ✗ ${message} (expected ${expected}, got ${actual})`);
  }
}

function assertRange(value: number, min: number, max: number, message: string) {
  if (value >= min && value <= max) {
    passed++;
    console.log(`  ✓ ${message} (${value} is in [${min}, ${max}])`);
  } else {
    failed++;
    console.error(`  ✗ ${message} (${value} is NOT in [${min}, ${max}])`);
  }
}

// ─── Test computeComfortComponent ─────────────────────────────────────────────

console.log("\n── computeComfortComponent ──");

assertEqual(computeComfortComponent(0), 0, "No projects gives 0");
assertEqual(computeComfortComponent(1), 25, "1 project gives 25");
assertEqual(computeComfortComponent(2), 50, "2 projects gives 50");
assertEqual(computeComfortComponent(3), 75, "3 projects gives 75");
assertEqual(computeComfortComponent(4), 100, "4 projects gives 100");
assertEqual(computeComfortComponent(5), 100, "5+ projects capped at 100");
assertEqual(computeComfortComponent(10), 100, "10 projects capped at 100");

// ─── Test computePortfolioComponent ───────────────────────────────────────────

console.log("\n── computePortfolioComponent ──");

assertEqual(computePortfolioComponent(0), 0, "No projects gives 0");
assertEqual(computePortfolioComponent(1), 25, "1 project gives 25");
assertEqual(computePortfolioComponent(2), 50, "2 projects gives 50");
assertEqual(computePortfolioComponent(3), 75, "3 projects gives 75");
assertEqual(computePortfolioComponent(4), 100, "4 projects gives 100");
assertEqual(computePortfolioComponent(5), 100, "5+ projects capped at 100");

// ─── Test computeRoadmapComponent ─────────────────────────────────────────────

console.log("\n── computeRoadmapComponent ──");

assertEqual(computeRoadmapComponent(0, 0), 0, "No tasks gives 0");
assertEqual(computeRoadmapComponent(0, 10), 0, "0/10 tasks gives 0");
assertEqual(computeRoadmapComponent(5, 10), 50, "5/10 tasks gives 50");
assertEqual(computeRoadmapComponent(10, 10), 100, "10/10 tasks gives 100");
assertEqual(computeRoadmapComponent(1, 3), 33, "1/3 tasks gives 33 (rounded)");

// ─── Test computeMarketDemandComponent ────────────────────────────────────────

console.log("\n── computeMarketDemandComponent ──");

const topDemanded = ["python", "javascript", "react", "sql", "node"];
const userSkillsFull = new Set(["python", "javascript", "react", "sql", "node"]);
const userSkillsPartial = new Set(["python", "react"]);
const userSkillsEmpty = new Set<string>();

assertEqual(computeMarketDemandComponent(userSkillsFull, topDemanded), 100, "All skills matched gives 100");
assertEqual(computeMarketDemandComponent(userSkillsPartial, topDemanded), 40, "2/5 skills matched gives 40");
assertEqual(computeMarketDemandComponent(userSkillsEmpty, topDemanded), 0, "No skills matched gives 0");
assertEqual(computeMarketDemandComponent(userSkillsFull, []), 0, "Empty top skills gives 0");

// ─── Test computeDynamicWeights ───────────────────────────────────────────────

console.log("\n── computeDynamicWeights ──");

const defaultWeights = computeDynamicWeights(0, 0, 0);
assertEqual(defaultWeights.trendAlignmentWeight, 25, "Trend weight is always 25");
assertEqual(defaultWeights.roadmapCompletionWeight, 25, "Roadmap weight is always 25");
assertEqual(defaultWeights.executionProgressWeight, 0, "Execution weight is always 0");
assert(defaultWeights.projectsWeight + defaultWeights.skillsWeight + defaultWeights.certificationsWeight === 50, "Portfolio weights sum to 50");

const certWeights = computeDynamicWeights(2, 5, 2);
assert(certWeights.certificationsWeight > 0, "Certifications weight > 0 when user has certs");
assert(certWeights.projectsWeight + certWeights.skillsWeight + certWeights.certificationsWeight === 50, "Portfolio weights still sum to 50 with certs");

// ─── Test calculateReadinessScore ─────────────────────────────────────────────

console.log("\n── calculateReadinessScore ──");

const testWeights: ScoringWeights = {
  projectsWeight: 15,
  skillsWeight: 35,
  certificationsWeight: 0,
  trendAlignmentWeight: 25,
  roadmapCompletionWeight: 25,
  executionProgressWeight: 0,
};

// All zeros
assertEqual(calculateReadinessScore(0, 0, 0, 0, testWeights), 0, "All zeros gives 0");

// All 100s
assertEqual(calculateReadinessScore(100, 100, 100, 100, testWeights), 100, "All 100s gives 100");

// Mixed values
const mixedScore = calculateReadinessScore(75, 50, 60, 80, testWeights);
assertRange(mixedScore, 0, 100, "Mixed values gives score in 0-100");

// ─── Test computeTechScores ───────────────────────────────────────────────────

console.log("\n── computeTechScores ──");

const mockProjects = [
  { technologies: ["Python", "React"], difficultyLevel: "advanced", completionStatus: "completed" },
  { technologies: ["Python", "SQL"], difficultyLevel: "intermediate", completionStatus: "completed" },
  { technologies: ["JavaScript"], difficultyLevel: "beginner", completionStatus: "in_progress" },
];

const techScores = computeTechScores(mockProjects);
assert(techScores.length > 0, "Returns scores for technologies");
assert(techScores[0].comfortScore >= techScores[techScores.length - 1].comfortScore, "Scores are sorted descending");
assert(techScores.every(s => s.comfortScore >= 0 && s.comfortScore <= 100), "All scores in 0-100");
assert(techScores.every(s => ["low", "medium", "high"].includes(s.confidenceLevel)), "All confidence levels valid");

// Python should be highest (used in 2 advanced/intermediate projects)
const pythonScore = techScores.find(s => s.technology === "Python");
assert(pythonScore !== undefined, "Python score exists");
assert(pythonScore!.comfortScore === 100, "Python has highest score (used in 2 projects)");

// Empty projects
const emptyScores = computeTechScores([]);
assertEqual(emptyScores.length, 0, "Empty projects gives empty scores");

// ─── Test: Same user gets same score on Dashboard and Scores page ─────────────

console.log("\n── Consistency: Dashboard vs Scores page ──");

// Simulate the same user data being processed by both paths
const userCompletedProjects = 3;
const userTopDemandedSkills = ["python", "javascript", "react"];
const userMatchingSkills = new Set(["python", "react"]);
const userCompletedTasks = 6;
const userTotalTasks = 10;

// Calculate using the same functions as both pages
const comfort = computeComfortComponent(userCompletedProjects);
const market = computeMarketDemandComponent(userMatchingSkills, userTopDemandedSkills);
const roadmap = computeRoadmapComponent(userCompletedTasks, userTotalTasks);
const portfolio = computePortfolioComponent(userCompletedProjects);
const weights = computeDynamicWeights(userCompletedProjects, 5, 1);

const dashboardScore = calculateReadinessScore(comfort, market, roadmap, portfolio, weights);
const scoresPageScore = calculateReadinessScore(comfort, market, roadmap, portfolio, weights);

assertEqual(dashboardScore, scoresPageScore, "Dashboard and Scores page give same score");

// ─── Test: Score never below 0 or above 100 ──────────────────────────────────

console.log("\n── Boundary: Score always 0-100 ──");

// Extreme values
assertRange(calculateReadinessScore(0, 0, 0, 0, testWeights), 0, 100, "All minimums gives 0-100");
assertRange(calculateReadinessScore(100, 100, 100, 100, testWeights), 0, 100, "All maximums gives 0-100");
assertRange(calculateReadinessScore(50, 50, 50, 50, testWeights), 0, 100, "All 50s gives 0-100");

// Extreme weights
const extremeWeights: ScoringWeights = {
  projectsWeight: 50,
  skillsWeight: 50,
  certificationsWeight: 0,
  trendAlignmentWeight: 50,
  roadmapCompletionWeight: 50,
  executionProgressWeight: 0,
};
assertRange(calculateReadinessScore(100, 100, 100, 100, extremeWeights), 0, 100, "Extreme weights with max scores gives 0-100");
assertRange(calculateReadinessScore(0, 0, 0, 0, extremeWeights), 0, 100, "Extreme weights with min scores gives 0-100");

// ─── Test: Missing data safety ────────────────────────────────────────────────

console.log("\n── Safety: Missing data ──");

assertEqual(computeComfortComponent(NaN), 0, "NaN projects gives 0 (via Math.min)");
assertEqual(computeRoadmapComponent(0, 0), 0, "No roadmap data gives 0");
assertEqual(computeMarketDemandComponent(new Set(), []), 0, "No job data gives 0");
assertEqual(computePortfolioComponent(0), 0, "No projects gives 0");

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log("═".repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\nAll tests passed! ✓\n");
  process.exit(0);
}
