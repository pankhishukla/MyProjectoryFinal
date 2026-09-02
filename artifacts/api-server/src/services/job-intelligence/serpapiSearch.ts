/**
 * SerpAPI Search Service
 *
 * Provides structured job-market queries via the SerpAPI Google Jobs engine.
 * Results are normalized into the same ScrapedJobData shape that the existing
 * scraper pipeline understands, so they can be fed directly into
 * `storeScrapedJob()` and the trend analyzer without any additional mapping.
 */

import { logger } from "../../lib/logger";
import { extractTechStack } from "./techStackExtractor";
import type { ScrapedJobData } from "./parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SerpApiSearchOptions {
  /** Free-form search query, e.g. "AI Engineer jobs" or "Frontend Developer internships". */
  query: string;
  /** Country code for localised results (default: "us"). */
  location?: string;
  /** Number of results to request (default: 20, max 100). */
  numResults?: number;
  /** Optional SerpAPI engine override (default: "google_jobs"). */
  engine?: string;
}

export interface SerpApiSearchResult {
  query: string;
  totalResults: number;
  jobs: ScrapedJobData[];
  rawOrganicResults?: unknown[];
}

// ---------------------------------------------------------------------------
// API key helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) {
    throw new Error(
      "SERPAPI_API_KEY environment variable is not set. " +
        "Get a key at https://serpapi.com/ and add it to your .env file.",
    );
  }
  return key;
}

// ---------------------------------------------------------------------------
// Core search function
// ---------------------------------------------------------------------------

/**
 * Execute a SerpAPI Google Jobs search and return normalized job data.
 *
 * Uses the official `serpapi` npm package which handles HTTP transport,
 * rate-limit back-off, and JSON parsing internally.
 */
export async function searchJobs(
  options: SerpApiSearchOptions,
): Promise<SerpApiSearchResult> {
  const {
    query,
    location = "us",
    numResults = 20,
    engine = "google_jobs",
  } = options;

  const apiKey = getApiKey();

  // Dynamic import so the module loads even when SERPAPI_API_KEY is unset
  // (e.g. during tests or when the feature is not used).
  let SerpApi: any;
  try {
    SerpApi = (await import("serpapi")).default;
  } catch {
    throw new Error(
      "serpapi package is not installed. Run: pnpm --filter api-server add serpapi",
    );
  }

  const client = new SerpApi.GoogleSearch(apiKey);

  logger.info({ query, location, numResults }, "SerpAPI search request");

  let response: any;
  try {
    response = await client.json({
      engine,
      q: query,
      location,
      hl: "en",
      gl: location,
      num: numResults,
    });
  } catch (error: any) {
    // SerpApi throws errors with status codes for rate-limits and auth errors
    if (error.message?.includes("Invalid API key")) {
      throw new Error(
        "SerpAPI authentication failed. Check that SERPAPI_API_KEY is valid.",
      );
    }
    if (error.message?.includes("Too Many Requests") || error.statusCode === 429) {
      throw new Error(
        "SerpAPI rate limit exceeded. Wait before retrying or upgrade your plan.",
      );
    }
    throw error;
  }

  // -----------------------------------------------------------------------
  // Parse the Google Jobs response
  // -----------------------------------------------------------------------
  const jobsRaw: unknown[] = response?.jobs_results ?? [];
  const jobs: ScrapedJobData[] = [];

  for (const raw of jobsRaw) {
    const job = normalizeGoogleJob(raw, query);
    if (job) {
      jobs.push(job);
    }
  }

  logger.info(
    { query, totalReturned: jobs.length },
    "SerpAPI search completed",
  );

  return {
    query,
    totalResults: jobs.length,
    jobs,
    rawOrganicResults: jobsRaw,
  };
}

// ---------------------------------------------------------------------------
// Normalizer – converts a SerpAPI Google Jobs result into ScrapedJobData
// ---------------------------------------------------------------------------

function normalizeGoogleJob(raw: any, query: string): ScrapedJobData | null {
  try {
    const title: string = raw.title || "Unknown Title";
    const company: string = raw.company_name || raw.company || "Unknown Company";
    const location: string | null = raw.location || raw.detected_extensions?.location || null;
    const description: string = (raw.description || "").slice(0, 4096);
    const sourceUrl: string = raw.share_link || raw.link || raw.related_links?.[0]?.link || "";

    // extensions may contain employment_type, schedule, etc.
    const extensions: string[] = raw.extensions || [];
    const employmentType = extensions.find((e: string) =>
      /full.time|part.time|contract|internship|temporary/i.test(e),
    ) || null;

    // Salary / experience are sometimes in extensions
    const experience = extensions.find((e: string) =>
      /\d+\s*(year|yr|experience|exp)/i.test(e),
    ) || null;

    // Extract tech stack from the description
    const extractedStack = extractTechStack(`${title} ${description}`);

    // Try to parse posted date
    let postedDate: Date | null = null;
    if (raw.detected_extensions?.posted_at) {
      const parsed = new Date(raw.detected_extensions.posted_at);
      if (!isNaN(parsed.getTime())) postedDate = parsed;
    }

    return {
      title,
      company,
      location,
      experience,
      employmentType,
      description,
      extractedStack,
      postedDate,
      sourceUrl,
      sourcePlatform: "serpapi",
    };
  } catch (error: any) {
    logger.warn({ error: error.message }, "Failed to normalize SerpAPI job result");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Convenience: multiple queries in sequence (with delay to respect rate limits)
// ---------------------------------------------------------------------------

export async function searchMultipleQueries(
  queries: string[],
  options: Omit<SerpApiSearchOptions, "query"> = {},
): Promise<SerpApiSearchResult[]> {
  const results: SerpApiSearchResult[] = [];

  for (const query of queries) {
    try {
      const result = await searchJobs({ ...options, query });
      results.push(result);
    } catch (error: any) {
      logger.error({ query, error: error.message }, "SerpAPI query failed");
      results.push({
        query,
        totalResults: 0,
        jobs: [],
      });
    }

    // Delay between requests to respect rate limits (1 second between queries)
    if (queries.indexOf(query) < queries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
