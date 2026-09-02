/**
 * Job Intelligence API Routes
 *
 * Routes for scraping, managing sources, and accessing trend analytics.
 */

import { Router, type IRouter } from "express";
import { requireAuth, requireAdmin } from "../middlewares/requireAuth";
import { scrapeAllSources, addJobSource, loadJobSources } from "../services/job-intelligence/scraper";
import { scrapeNaukriListingPage } from "../services/job-intelligence/naukriScraper";
import { analyzeTrends, getTop3Stacks } from "../services/job-intelligence/trendAnalyzer";
import { searchJobs, searchMultipleQueries } from "../services/job-intelligence/serpapiSearch";
import { db, scrapedJobPostingsTable } from "../lib/db/index.js";
import { desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ─── GET /jobs/scrape — Trigger scraping of all configured URLs ─────────────
// Admin-only to prevent abuse

router.get("/jobs/scrape", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const result = await scrapeAllSources();

    // After scraping, automatically run trend analysis
    const trends = await analyzeTrends();

    res.json({
      scrape: result,
      trends: {
        top_technologies: trends.top_technologies,
        top_stack_combinations: trends.top_stack_combinations,
        total_jobs_analyzed: trends.total_jobs_analyzed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: `Scraping failed: ${error.message}` });
  }
});

// ─── POST /jobs/add-source — Add a new URL to job_sources.json ──────────────

const AddSourceBody = z.object({
  url: z.string().url("Must be a valid URL"),
});

router.post("/jobs/add-source", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AddSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = addJobSource(parsed.data.url);
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

// ─── POST /jobs/scrape-naukri — Scrape a Naukri listing page ────────────────
// Admin-only. Accepts a Naukri search/listing URL, scrapes all pages,
// stores every job, then re-runs trend analysis.

const ScrapeNaukriBody = z.object({
  url: z
    .string()
    .url("Must be a valid URL")
    .refine(u => u.includes("naukri.com"), { message: "URL must be from naukri.com" }),
});

router.post("/jobs/scrape-naukri", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ScrapeNaukriBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  try {
    const scrape = await scrapeNaukriListingPage(parsed.data.url);
    const trends = await analyzeTrends();

    res.json({
      scrape,
      trends: {
        top_technologies: trends.top_technologies,
        top_stack_combinations: trends.top_stack_combinations,
        total_jobs_analyzed: trends.total_jobs_analyzed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: `Naukri scraping failed: ${error.message}` });
  }
});

// ─── GET /jobs/trending-stacks — Full trending data ─────────────────────────

router.get("/jobs/trending-stacks", requireAuth, async (_req, res): Promise<void> => {
  try {
    const trends = await analyzeTrends();
    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: `Trend analysis failed: ${error.message}` });
  }
});

// ─── GET /jobs/top-3-stacks — Just the top 3 for dashboard card ─────────────

router.get("/jobs/top-3-stacks", requireAuth, async (_req, res): Promise<void> => {
  try {
    const trends = await getTop3Stacks();
    res.json({
      top_technologies: trends.top_technologies,
      top_stack_combinations: trends.top_stack_combinations,
      total_jobs_analyzed: trends.total_jobs_analyzed,
      analyzed_at: trends.analyzed_at,
    });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to get top stacks: ${error.message}` });
  }
});

// ─── GET /jobs/scraped — List all scraped job postings ──────────────────────

router.get("/jobs/scraped", requireAuth, async (req, res): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = await db
      .select()
      .from(scrapedJobPostingsTable)
      .orderBy(desc(scrapedJobPostingsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ jobs, limit, offset });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to list scraped jobs: ${error.message}` });
  }
});

// ─── GET /jobs/sources — List configured source URLs ────────────────────────
// Admin-only as this is part of source management

router.get("/jobs/sources", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const config = loadJobSources();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: `Failed to load sources: ${error.message}` });
  }
});

// ─── POST /jobs/search-serpapi — Search jobs via SerpAPI ────────────────────
// Authenticated users can run market-intelligence searches.

const SerpApiSearchBody = z.object({
  query: z.string().min(1, "Search query is required").max(500),
  location: z.string().optional().default("us"),
  numResults: z.number().int().min(1).max(100).optional().default(20),
});

router.post("/jobs/search-serpapi", requireAuth, async (req, res): Promise<void> => {
  const parsed = SerpApiSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const result = await searchJobs(parsed.data);
    res.json({
      query: result.query,
      totalResults: result.totalResults,
      jobs: result.jobs,
    });
  } catch (error: any) {
    // Distinguish between configuration errors and transient failures
    if (error.message?.includes("SERPAPI_API_KEY")) {
      res.status(503).json({ error: error.message });
    } else if (error.message?.includes("rate limit")) {
      res.status(429).json({ error: error.message });
    } else {
      res.status(500).json({ error: `SerpAPI search failed: ${error.message}` });
    }
  }
});

// ─── POST /jobs/search-batch — Run multiple SerpAPI queries ─────────────────
// Admin-only to prevent abuse of API quota.

const SerpApiBatchBody = z.object({
  queries: z.array(z.string().min(1).max(500)).min(1).max(10),
  location: z.string().optional().default("us"),
  numResults: z.number().int().min(1).max(100).optional().default(10),
});

router.post("/jobs/search-batch", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SerpApiBatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const results = await searchMultipleQueries(parsed.data.queries, {
      location: parsed.data.location,
      numResults: parsed.data.numResults,
    });

    const totalJobs = results.reduce((sum, r) => sum + r.jobs.length, 0);
    res.json({
      queries: results.map((r) => ({
        query: r.query,
        totalResults: r.totalResults,
      })),
      totalJobs,
      jobs: results.flatMap((r) => r.jobs),
    });
  } catch (error: any) {
    if (error.message?.includes("SERPAPI_API_KEY")) {
      res.status(503).json({ error: error.message });
    } else {
      res.status(500).json({ error: `Batch search failed: ${error.message}` });
    }
  }
});

// ─── GET /jobs/serpapi-status — Check SerpAPI key configuration ─────────────

router.get("/jobs/serpapi-status", requireAuth, async (_req, res): Promise<void> => {
  const key = process.env.SERPAPI_API_KEY;
  res.json({
    configured: !!key && key !== "PLACEHOLDER",
    // Never expose the actual key
  });
});

export default router;
