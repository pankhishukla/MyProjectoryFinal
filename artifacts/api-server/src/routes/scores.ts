import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable, projectsTable, jobsTable, roadmapsTable, milestonesTable, tasksTable } from "../lib/db/index.js";
import {
  GetTechComfortScoresResponse,
  GetMarketDemandScoresResponse,
  GetJobReadinessScoreResponse,
  GetStrengthsResponse,
  GetTrendAlignmentResponse,
} from "../lib/api-zod/index.js";
import { requireAuth } from "../middlewares/requireAuth";
import {
  getAnalysisWeights,
  getUserScoringWeights,
  calculateReadinessScore,
  computeTechScores,
  computeComfortComponent,
  computeMarketDemandComponent,
  computeRoadmapComponent,
  computePortfolioComponent,
} from "../services/scoring.service";

const router: IRouter = Router();

async function getUserId(clerkId: string): Promise<number | null> {
  const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.clerkId, clerkId));
  return user?.id ?? null;
}

router.get("/scores/tech-comfort", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));

  // Use shared scoring function from scoring.service.ts
  const scores = computeTechScores(projects);

  res.json(GetTechComfortScoresResponse.parse(scores));
});

router.get("/scores/market-demand", requireAuth, async (req, res): Promise<void> => {
  const allJobs = await db.select().from(jobsTable);

  const techJobCount: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      techJobCount[skill] = (techJobCount[skill] || 0) + 1;
    }
  }

  const maxJobs = Math.max(...Object.values(techJobCount), 1);

  const scores = Object.entries(techJobCount).map(([tech, count]) => {
    const demandScore = Math.round((count / maxJobs) * 100);
    let trendDirection: "rising" | "stable" | "declining" = "stable";
    if (demandScore > 70) trendDirection = "rising";
    else if (demandScore < 30) trendDirection = "declining";

    return {
      technology: tech,
      totalJobs: count,
      demandScore,
      trendDirection,
      growthRate: Math.round((demandScore / 100) * 15 * 10) / 10,
    };
  }).sort((a, b) => b.demandScore - a.demandScore);

  res.json(GetMarketDemandScoresResponse.parse(scores));
});

router.get("/scores/job-readiness", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json(GetJobReadinessScoreResponse.parse({
      overallScore: 0,
      comfortComponent: 0,
      marketDemandComponent: 0,
      roadmapComponent: 0,
      portfolioComponent: 0,
      readinessStatus: "not_ready",
      suggestions: ["Create your profile to get started", "Add your first project"],
    }));
    return;
  }

  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  const completedProjects = projects.filter(p => p.completionStatus === "completed");

  // ─── Calculate component scores using shared functions ───────────────────
  // comfortComponent: How comfortable with technologies (based on project count)
  const comfortComponent = computeComfortComponent(completedProjects.length);

  // marketDemandComponent: How many user skills are in top 20 market skills
  const allJobs = await db.select().from(jobsTable);
  const userSkills = new Set(projects.flatMap(p => p.technologies));
  const demandedSkills: Record<string, number> = {};
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      const s = skill.toLowerCase();
      demandedSkills[s] = (demandedSkills[s] || 0) + 1;
    }
  }
  const topDemanded = Object.entries(demandedSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([skill]) => skill);
  const marketDemandComponent = computeMarketDemandComponent(
    new Set([...userSkills].map(s => s.toLowerCase())),
    topDemanded
  );

  // roadmapComponent: Percentage of roadmap tasks completed
  const roadmaps = await db.select().from(roadmapsTable).where(eq(roadmapsTable.userId, userId));
  let totalTasks = 0;
  let completedTasks = 0;
  for (const rm of roadmaps) {
    const milestones = await db.select().from(milestonesTable).where(eq(milestonesTable.roadmapId, rm.id));
    for (const ms of milestones) {
      const tasks = await db.select().from(tasksTable).where(eq(tasksTable.milestoneId, ms.id));
      totalTasks += tasks.length;
      completedTasks += tasks.filter(t => t.completed).length;
    }
  }
  const roadmapComponent = computeRoadmapComponent(completedTasks, totalTasks);

  // portfolioComponent: Portfolio strength based on completed projects
  const portfolioComponent = computePortfolioComponent(completedProjects.length);

  // ─── Calculate overall readiness score using canonical formula ────────────
  const weights = await getUserScoringWeights(userId);
  const overallScore = calculateReadinessScore(
    comfortComponent,
    marketDemandComponent,
    roadmapComponent,
    portfolioComponent,
    weights
  );

  // Determine readiness status based on score thresholds
  let readinessStatus: "not_ready" | "needs_improvement" | "interview_ready" | "job_ready" = "not_ready";
  if (overallScore >= 80) readinessStatus = "job_ready";
  else if (overallScore >= 60) readinessStatus = "interview_ready";
  else if (overallScore >= 30) readinessStatus = "needs_improvement";

  // Generate actionable suggestions based on current state
  const suggestions: string[] = [];
  if (projects.length < 3) suggestions.push("Add more projects to strengthen your portfolio");
  if (completedProjects.length < 2) suggestions.push("Complete more projects to boost your score");
  if (roadmaps.length === 0) suggestions.push("Generate a learning roadmap to track your progress");
  if (roadmapComponent < 50 && roadmaps.length > 0) suggestions.push("Complete more roadmap tasks to improve readiness");
  if (marketDemandComponent < 30) suggestions.push("Learn technologies that are in high demand");

  res.json(GetJobReadinessScoreResponse.parse({
    overallScore,
    comfortComponent,
    marketDemandComponent,
    roadmapComponent,
    portfolioComponent,
    readinessStatus,
    suggestions,
  }));
});

router.get("/scores/strengths", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json(GetStrengthsResponse.parse({ strengths: [], strongDomains: [], confidenceLevel: "low" }));
    return;
  }

  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  
  const techMap: Record<string, number> = {};
  const domainMap: Record<string, number> = {};

  for (const project of projects) {
    for (const tech of project.technologies) {
      techMap[tech] = (techMap[tech] || 0) + 1;
    }
    if (project.category) {
      domainMap[project.category] = (domainMap[project.category] || 0) + 1;
    }
  }

  const strengths = Object.entries(techMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);

  const strongDomains = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  let confidenceLevel: "low" | "medium" | "high" = "low";
  if (projects.filter(p => p.completionStatus === "completed").length >= 3) {
    confidenceLevel = "high";
  } else if (projects.length >= 2) {
    confidenceLevel = "medium";
  }

  res.json(GetStrengthsResponse.parse({
    strengths,
    strongDomains,
    confidenceLevel,
  }));
});

router.get("/scores/trend-alignment", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json(GetTrendAlignmentResponse.parse({ matchPercentage: 0, missingHighDemandSkills: [] }));
    return;
  }

  const projects = await db.select().from(projectsTable).where(and(eq(projectsTable.userId, userId), eq(projectsTable.completionStatus, "completed")));
  const userSkills = new Set(projects.flatMap(p => p.technologies.map(t => t.toLowerCase())));

  const allJobs = await db.select().from(jobsTable);
  const demandedSkills: Record<string, number> = {};
  
  for (const job of allJobs) {
    for (const skill of job.requiredSkills) {
      const s = skill.toLowerCase();
      demandedSkills[s] = (demandedSkills[s] || 0) + 1;
    }
  }

  const topDemanded = Object.entries(demandedSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20); // Top 20 skills in market

  let matchCount = 0;
  const missingHighDemandSkills: string[] = [];

  for (const [skill, count] of topDemanded) {
    if (userSkills.has(skill)) {
      matchCount++;
    } else {
      missingHighDemandSkills.push(skill);
    }
  }

  const matchPercentage = topDemanded.length > 0 ? Math.round((matchCount / topDemanded.length) * 100) : 0;

  // Format skills back to proper case slightly by retaining topDemanded string? 
  // Actually topDemanded has lowercase. We'll just return the lowercase for now, or format it.
  const formattedMissing = missingHighDemandSkills.slice(0, 5).map(s => s.charAt(0).toUpperCase() + s.slice(1));

  res.json(GetTrendAlignmentResponse.parse({
    matchPercentage,
    missingHighDemandSkills: formattedMissing,
  }));
});

export default router;
