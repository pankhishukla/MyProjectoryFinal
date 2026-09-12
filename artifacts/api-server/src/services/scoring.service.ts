import { eq, and, count } from "drizzle-orm";
import { 
  db, 
  analysisConfigTable, 
  userScoreWeightsTable,
  projectsTable,
  userSkillsTable,
  userCertificationsTable
} from "../lib/db/index.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoringWeights {
  projectsWeight: number;
  skillsWeight: number;
  certificationsWeight: number;
  trendAlignmentWeight: number;
  roadmapCompletionWeight: number;
  executionProgressWeight: number;
}

export interface TechComfortScore {
  technology: string;
  projectCount: number;
  comfortScore: number;
  confidenceLevel: "low" | "medium" | "high";
}

// ─── Default Weights ──────────────────────────────────────────────────────────

// Default fallback weights if nothing is calculated
const DEFAULT_WEIGHTS: ScoringWeights = {
  projectsWeight: 15,
  skillsWeight: 35,
  certificationsWeight: 0,
  trendAlignmentWeight: 25,
  roadmapCompletionWeight: 25,
  executionProgressWeight: 0,
};

// ─── Pure Scoring Functions (no DB calls) ─────────────────────────────────────

/**
 * Compute per-technology comfort scores from a list of projects.
 * 
 * For each technology, calculates a comfort score based on:
 * - How many projects use it (count)
 * - How complex those projects are (difficulty level)
 * - Whether they are completed
 * 
 * The score is normalized so the most-used technology gets 100.
 * 
 * @param projects - Array of projects with technologies, difficultyLevel, completionStatus
 * @returns Array of TechComfortScore sorted by comfortScore descending
 */
export function computeTechScores(
  projects: Array<{ technologies: string[]; difficultyLevel: string; completionStatus: string }>
): TechComfortScore[] {
  const completedProjects = projects.filter(p => p.completionStatus === "completed");
  const techMap: Record<string, { count: number; complexitySum: number; completedCount: number }> = {};

  for (const project of completedProjects) {
    // Map difficulty to numeric complexity: advanced=3, intermediate=2, beginner=1
    const complexity = project.difficultyLevel === "advanced" ? 3 : project.difficultyLevel === "intermediate" ? 2 : 1;
    // Completion status affects the score: completed=1, in_progress=0.5, other=0.2
    const completionScore = project.completionStatus === "completed"
      ? 1
      : project.completionStatus === "in_progress"
      ? 0.5
      : 0.2;

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

  // Normalize scores so the highest complexitySum gets 100
  const maxPossible = Math.max(...Object.values(techMap).map((t) => t.complexitySum), 1);

  return Object.entries(techMap)
    .map(([technology, data]) => {
      const rawScore = (data.complexitySum / maxPossible) * 100;
      const comfortScore = Math.min(100, Math.round(rawScore));
      // Confidence based on how many projects use this technology
      let confidenceLevel: "low" | "medium" | "high" = "low";
      if (data.count >= 4) confidenceLevel = "high";
      else if (data.count >= 2) confidenceLevel = "medium";

      return {
        technology,
        projectCount: data.count,
        comfortScore,
        confidenceLevel,
      };
    })
    .sort((a, b) => b.comfortScore - a.comfortScore);
}

/**
 * Compute the comfort component score (0-100) for readiness calculation.
 * 
 * This is a single aggregate score representing how comfortable the user is
 * with their technologies, based on project complexity and completion.
 * 
 * Formula: min(100, completedProjects × 25)
 * - Each completed project contributes 25 points
 * - Capped at 100 (4+ projects max this out)
 * 
 * @param completedProjectCount - Number of completed projects
 * @returns Score between 0 and 100
 */
export function computeComfortComponent(completedProjectCount: number): number {
  const count = Number.isFinite(completedProjectCount) ? completedProjectCount : 0;
  return Math.min(100, count * 25);
}

/**
 * Compute the market demand component score (0-100) for readiness calculation.
 * 
 * This measures how many of the user's skills appear in the top 20 most
 * demanded skills across all job listings.
 * 
 * Formula: (userSkillsInTop20 / 20) × 100
 * 
 * @param userSkills - Set of user's skill names (lowercase)
 * @param topDemandedSkills - Array of top 20 demanded skill names (lowercase)
 * @returns Score between 0 and 100
 */
export function computeMarketDemandComponent(
  userSkills: Set<string>,
  topDemandedSkills: string[]
): number {
  if (topDemandedSkills.length === 0) return 0;
  const matchCount = topDemandedSkills.filter(skill => userSkills.has(skill)).length;
  return Math.round((matchCount / topDemandedSkills.length) * 100);
}

/**
 * Compute the roadmap completion component score (0-100) for readiness calculation.
 * 
 * This measures what percentage of roadmap tasks the user has completed.
 * 
 * Formula: (completedTasks / totalTasks) × 100
 * 
 * @param completedTasks - Number of completed tasks
 * @param totalTasks - Total number of tasks
 * @returns Score between 0 and 100
 */
export function computeRoadmapComponent(completedTasks: number, totalTasks: number): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

/**
 * Compute the portfolio component score (0-100) for readiness calculation.
 * 
 * This measures portfolio strength based on number of completed projects.
 * 
 * Formula: min(100, completedProjects × 25)
 * - Each completed project contributes 25 points
 * - Capped at 100 (4+ projects max this out)
 * 
 * @param completedProjectCount - Number of completed projects
 * @returns Score between 0 and 100
 */
export function computePortfolioComponent(completedProjectCount: number): number {
  const count = Number.isFinite(completedProjectCount) ? completedProjectCount : 0;
  return Math.min(100, count * 25);
}

// ─── Dynamic Weight Calculation ───────────────────────────────────────────────

/**
 * Automatically calculates scoring weights based on user portfolio content.
 * 
 * The system uses 5 weight dimensions:
 * - projectsWeight (base: 15)
 * - skillsWeight (base: 35)
 * - certificationsWeight (base: 0)
 * - trendAlignmentWeight (fixed: 25)
 * - roadmapCompletionWeight (fixed: 25)
 * 
 * Adjustments:
 * - If user has certifications: shift up to 15% from skills/projects
 * - If project-heavy (p>2, p>s): shift up to 10% from skills to projects
 * - If skill-heavy (s>10, s>p*3): shift up to 5% from projects to skills
 * 
 * @param projectCount - Number of completed projects
 * @param skillCount - Number of skills in user_skills table
 * @param certCount - Number of certifications
 * @returns ScoringWeights with adjusted values
 */
export function computeDynamicWeights(
  projectCount: number,
  skillCount: number,
  certCount: number
): ScoringWeights {
  // Base distribution
  let projW = 15;
  let skillW = 35;
  let certW = 0;

  // Certifications take weight from Skills/Projects if present (max 15%)
  if (certCount > 0) {
    certW = Math.min(15, certCount * 5);
    // Take from skills mostly, then projects
    const takeFromSkills = Math.min(skillW - 10, Math.ceil(certW * 0.7));
    skillW -= takeFromSkills;
    projW -= (certW - takeFromSkills);
  }

  // Volume balance: If user is heavily focused on projects, shift more weight there
  if (projectCount > 2 && projectCount > skillCount) {
    // Project-heavy profile
    const shift = Math.min(10, (projectCount - skillCount) * 2);
    if (skillW > 15) {
      skillW -= shift;
      projW += shift;
    }
  } else if (skillCount > 10 && skillCount > projectCount * 3) {
    // Skill-heavy profile
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
    trendAlignmentWeight: 25, // Fixed market anchor
    roadmapCompletionWeight: 25, // Fixed progress anchor
    executionProgressWeight: 0,
  };
}

// ─── Database-Backed Weight Calculation ───────────────────────────────────────

/**
 * Automatically calculates scoring weights based on user portfolio content.
 * Balanced approach: 50% fixed market/roadmap, 50% dynamic portfolio.
 */
export async function calculateDynamicWeights(userId: number): Promise<ScoringWeights> {
  // 1. Get counts for Projects, Skills, and Certifications
  const [projectCount] = await db
    .select({ val: count() })
    .from(projectsTable)
    .where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  
  const [skillCount] = await db
    .select({ val: count() })
    .from(userSkillsTable)
    .where(eq(userSkillsTable.userId, userId));

  const [certCount] = await db
    .select({ val: count() })
    .from(userCertificationsTable)
    .where(eq(userCertificationsTable.userId, userId));

  return computeDynamicWeights(
    projectCount?.val || 0,
    skillCount?.val || 0,
    certCount?.val || 0
  );
}

/**
 * Get per-user scoring weights.
 * Now defaults to dynamic portfolio-driven calculation.
 */
export async function getUserScoringWeights(userId: number): Promise<ScoringWeights> {
  // The system now automatically adjusts based on portfolio content
  return calculateDynamicWeights(userId);
}

/**
 * Get global analysis weights from the analysis_config table.
 * This is the original function, preserved for backward compatibility.
 */
export async function getAnalysisWeights(): Promise<ScoringWeights> {
  const configs = await db.select().from(analysisConfigTable).limit(1);
  if (configs.length > 0) {
    return configs[0];
  }
  // Fallback defaults if DB is empty matching exactly S3.4 Weightage Configuration
  return { ...DEFAULT_WEIGHTS };
}

// ─── Canonical Readiness Score Calculation ────────────────────────────────────

/**
 * Calculate the overall readiness score (0-100).
 * 
 * This is the CANONICAL scoring function used by both Dashboard and Scores page.
 * 
 * Formula:
 *   score = (
 *     portfolioScore × projectsWeight +
 *     comfortScore × skillsWeight +
 *     marketDemandScore × trendAlignmentWeight +
 *     roadmapScore × roadmapCompletionWeight
 *   ) / 100
 * 
 *   overallScore = round(score × normalizedFactor)
 * 
 * Where normalizedFactor = 100 / sumWeights (ensures result is 0-100)
 * 
 * @param comfortScore - How comfortable with technologies (0-100)
 * @param marketDemandScore - How many skills are in demand (0-100)
 * @param roadmapScore - Roadmap completion percentage (0-100)
 * @param portfolioScore - Portfolio strength (0-100)
 * @param weights - Dynamic weights based on user portfolio
 * @returns Overall readiness score (0-100)
 */
export function calculateReadinessScore(
  comfortScore: number, 
  marketDemandScore: number, 
  roadmapScore: number, 
  portfolioScore: number,
  weights: ScoringWeights
): number {
  // Sum all weights to calculate normalization factor
  const sumWeights = weights.projectsWeight + weights.skillsWeight + weights.certificationsWeight + weights.trendAlignmentWeight + weights.roadmapCompletionWeight + weights.executionProgressWeight;
  // Normalization ensures the final score stays in 0-100 range
  const normalizedFactor = sumWeights > 0 ? 100 / sumWeights : 1;

  // Weighted sum of all components
  // Each component is 0-100, multiplied by its weight, then divided by 100
  const score = (
    (portfolioScore * weights.projectsWeight) +
    (comfortScore * weights.skillsWeight) +
    (marketDemandScore * weights.trendAlignmentWeight) +
    (roadmapScore * weights.roadmapCompletionWeight)
  ) / 100;

  return Math.round(score * normalizedFactor);
}
