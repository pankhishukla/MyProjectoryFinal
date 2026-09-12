/**
 * Manual React Query hooks for the Analysis extension APIs (S3.4, S3.6, S3.8).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthedFetch } from "../lib/api-fetch";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeightEntry {
  dimension: string;
  weight: number;
}

export interface WeightsResponse {
  weights: WeightEntry[];
}

export interface StrengthDimension {
  dimension: string;
  label: string;
  score: number;
  weight: number;
}

export interface StrengthBreakdownResponse {
  dimensions: StrengthDimension[];
  insight: string;
}

export interface MarketAlignmentResponse {
  matchPercentage: number;
  userMatchedSkills: string[];
  trendDataAvailable: boolean;
}



// ─── Query Keys ───────────────────────────────────────────────────────────────

export const analysisKeys = {
  weights: () => ["/api/analysis/weights"] as const,
  strengthBreakdown: () => ["/api/analysis/strength-breakdown"] as const,
  marketAlignment: () => ["/api/analysis/market-alignment"] as const,
};

// ─── S3.4: Weights Hooks ──────────────────────────────────────────────────────

export function useGetWeights() {
  const apiFetch = useAuthedFetch();
  return useQuery<WeightsResponse>({
    queryKey: analysisKeys.weights(),
    queryFn: () => apiFetch<WeightsResponse>("/api/analysis/weights"),
  });
}

export function useSaveWeights() {
  const queryClient = useQueryClient();
  const apiFetch = useAuthedFetch();
  return useMutation<{ success: boolean; weights: WeightEntry[] }, Error, WeightEntry[]>({
    mutationKey: ["saveWeights"],
    mutationFn: (weights) =>
      apiFetch("/api/analysis/weights", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: analysisKeys.weights() });
      queryClient.invalidateQueries({ queryKey: analysisKeys.strengthBreakdown() });
      // Also invalidate job readiness since it uses these weights
      queryClient.invalidateQueries({ queryKey: ["/api/scores/job-readiness"] });
    },
  });
}

// ─── S3.6: Strength Breakdown Hook ───────────────────────────────────────────

export function useStrengthBreakdown() {
  const apiFetch = useAuthedFetch();
  return useQuery<StrengthBreakdownResponse>({
    queryKey: analysisKeys.strengthBreakdown(),
    queryFn: () => apiFetch<StrengthBreakdownResponse>("/api/analysis/strength-breakdown"),
  });
}

// ─── S3.8: Market Alignment Hook ─────────────────────────────────────────────

export function useMarketAlignment() {
  const apiFetch = useAuthedFetch();
  return useQuery<MarketAlignmentResponse>({
    queryKey: analysisKeys.marketAlignment(),
    queryFn: () => apiFetch<MarketAlignmentResponse>("/api/analysis/market-alignment"),
  });
}
