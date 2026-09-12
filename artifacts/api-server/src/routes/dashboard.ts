import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, usersTable, projectsTable, roadmapsTable, milestonesTable, tasksTable, jobsTable, activityTable } from "../lib/db/index.js";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
} from "../lib/api-zod/index.js";
import { requireAuth } from "../middlewares/requireAuth";
import {
  calculateReadinessScore,
  getUserScoringWeights,
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

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  const profileComplete = userId !== null;

  if (!userId) {
    res.json(GetDashboardSummaryResponse.parse({
      totalProjects: 0,
      completedProjects: 0,
      strongestTech: null,
      readinessScore: 0,
      roadmapProgress: 0,
      totalJobMatches: 0,
      profileComplete: false,
    }));
    return;
  }

  const projects = await db.select().from(projectsTable).where(eq(projectsTable.userId, userId));
  const completedProjects = projects.filter(p => p.completionStatus === "completed");

  const techCount: Record<string, number> = {};
  for (const p of completedProjects) {
    for (const t of p.technologies) {
      techCount[t] = (techCount[t] || 0) + 1;
    }
  }
  const strongestTech = Object.entries(techCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Calculate roadmap progress (percentage of completed tasks)
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

  // Count job matches (jobs where user has at least one required skill)
  const allJobs = await db.select().from(jobsTable);
  const userSkills = new Set(completedProjects.flatMap(p => p.technologies));
  const jobMatches = allJobs.filter(j =>
    j.requiredSkills.some(s => [...userSkills].some(us => us.toLowerCase() === s.toLowerCase()))
  ).length;

  // ─── Canonical scoring (same as Scores page) ──────────────────────────────
  // Use the same scoring functions as the Scores page for consistency.

  // Calculate individual component scores (each 0-100)
  const comfortComponent = computeComfortComponent(completedProjects.length);
  const portfolioComponent = computePortfolioComponent(completedProjects.length);
  const roadmapProgress = computeRoadmapComponent(completedTasks, totalTasks);

  // Market demand: how many of user's skills are in top 20 demanded skills
  const allJobsForDemand = await db.select().from(jobsTable);
  const demandedSkills: Record<string, number> = {};
  for (const job of allJobsForDemand) {
    for (const skill of job.requiredSkills) {
      const s = skill.toLowerCase();
      demandedSkills[s] = (demandedSkills[s] || 0) + 1;
    }
  }
  const topDemanded = Object.entries(demandedSkills)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([skill]) => skill);
  const userSkillSet = new Set(completedProjects.flatMap(p => p.technologies.map(t => t.toLowerCase())));
  const marketDemandComponent = computeMarketDemandComponent(userSkillSet, topDemanded);

  // Get dynamic weights and calculate overall readiness score
  const weights = await getUserScoringWeights(userId);
  const readinessScore = calculateReadinessScore(
    comfortComponent,
    marketDemandComponent,
    roadmapProgress,
    portfolioComponent,
    weights
  );

  res.json(GetDashboardSummaryResponse.parse({
    totalProjects: projects.length,
    completedProjects: completedProjects.length,
    strongestTech,
    readinessScore,
    roadmapProgress,
    totalJobMatches: jobMatches,
    profileComplete,
  }));
});



router.get("/dashboard/recent-activity", requireAuth, async (req, res): Promise<void> => {
  const userId = await getUserId((req as any).clerkUserId);
  if (!userId) {
    res.json([]);
    return;
  }

  const activities = await db.select().from(activityTable)
    .where(eq(activityTable.userId, userId))
    .orderBy(desc(activityTable.timestamp))
    .limit(10);

  res.json(GetRecentActivityResponse.parse(activities));
});

export default router;
