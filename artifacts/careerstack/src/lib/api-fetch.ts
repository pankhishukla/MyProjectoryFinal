/**
 * Shared API fetch helpers for manual React Query hooks.
 *
 * These resolve relative API paths (e.g. "/api/portfolios/my") against the
 * configured VITE_API_URL so requests reach the correct backend origin in
 * production.  In local development (where Vite proxies /api/* to the
 * backend), VITE_API_URL is typically unset and paths are used as-is.
 *
 * Orval-generated hooks use their own customFetch with the same base URL;
 * this module provides the equivalent for the hand-written hooks.
 */
import { useAuth } from "./fakeClerk";
import { useCallback } from "react";

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

const API_BASE_URL: string = import.meta.env.VITE_API_URL || "";

/**
 * Resolves an API path against the configured VITE_API_URL.
 *
 * - Relative paths starting with "/" get the base URL prepended.
 * - Absolute URLs (http://…, https://…) are returned unchanged.
 * - When VITE_API_URL is empty (local dev), paths pass through unmodified
 *   so the Vite dev proxy can route them.
 */
export function resolveApiUrl(url: string): string {
  if (!API_BASE_URL) return url;
  if (!url.startsWith("/")) return url;
  const base = API_BASE_URL.replace(/\/+$/, "");
  return `${base}${url}`;
}

// ---------------------------------------------------------------------------
// Error type with status code (used by portfolio 404 handling)
// ---------------------------------------------------------------------------

export class FetchError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = "FetchError";
  }
}

// ---------------------------------------------------------------------------
// Authenticated fetch helper (React hook)
// ---------------------------------------------------------------------------

/**
 * Returns a fetch wrapper that:
 *   1. Resolves relative paths against VITE_API_URL
 *   2. Attaches the current Clerk Bearer token
 *   3. Parses JSON responses and throws FetchError on non-OK status
 */
export function useAuthedFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async <T>(url: string, init: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const headers: Record<string, string> = {
        ...(init.headers as Record<string, string>),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(resolveApiUrl(url), { ...init, headers });

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new FetchError(errorData?.error || `HTTP ${response.status}`, response.status);
      }

      const text = await response.text();
      if (!text) return undefined as unknown as T;
      return JSON.parse(text) as T;
    },
    [getToken],
  );
}

// ---------------------------------------------------------------------------
// Public (unauthenticated) fetch helper (React hook)
// ---------------------------------------------------------------------------

/**
 * Returns a fetch wrapper that resolves relative paths against VITE_API_URL
 * but does NOT attach any auth header.
 */
export function usePublicFetch() {
  return useCallback(
    async <T>(url: string, init: RequestInit = {}): Promise<T> => {
      const response = await fetch(resolveApiUrl(url), init);

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new FetchError(errorData?.error || `HTTP ${response.status}`, response.status);
      }

      const text = await response.text();
      if (!text) return undefined as unknown as T;
      return JSON.parse(text) as T;
    },
    [],
  );
}
