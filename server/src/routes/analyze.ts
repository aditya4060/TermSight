import { Router, Request, Response } from "express";
import { z } from "zod";
import { normalizeDomain } from "../normalize.js";
import { triggerAnalysis, getDomainProfile } from "../analyzeDomain.js";
import { loadDependencies } from "../dependencyAnalyzer.js";
import { isProfileStale, triggerFreshnessCheck } from "../freshness.js";
import type { ApiProfileResponse, DomainProfileRow } from "../types.js";

const router = Router();

const analyzeBodySchema = z.object({
  url: z.string().url("Must be a valid URL"),
});

function buildProfileResponse(
  profile: DomainProfileRow,
  deps: Awaited<ReturnType<typeof loadDependencies>>
): ApiProfileResponse {
  return {
    domain: profile.domain,
    status: profile.status,
    score: profile.score,
    grade: profile.grade,
    adjusted_score: profile.adjusted_score,
    adjusted_grade: profile.adjusted_grade,
    transparency_score: profile.transparency_score,
    data_sensitivity_score: profile.data_sensitivity_score,
    red_flags_count: profile.red_flags_count ?? 0,
    amber_flags_count: profile.amber_flags_count ?? 0,
    green_flags_count: profile.green_flags_count ?? 0,
    summary: profile.summary,
    policy_urls: profile.policy_urls ?? [],
    extraction: profile.extraction,
    category_breakdown: profile.category_breakdown ?? {},
    flags: profile.flags ?? { red: [], amber: [], green: [] },
    dependencies: deps,
    evidence: profile.evidence ?? [],
    is_stale: profile.is_stale ?? false,
    freshness_status: profile.freshness_status,
    last_checked_at: profile.last_checked_at,
    policy_changed_at: profile.policy_changed_at,
    error_message: profile.error_message,
  };
}

// ── POST /api/analyze ─────────────────────────────────────────────────────────
router.post("/analyze", async (req: Request, res: Response) => {
  const parsed = analyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { url } = parsed.data;
  const domain = normalizeDomain(url);

  try {
    const existing = await getDomainProfile(domain);

    if (existing?.status === "ready") {
      const stale = isProfileStale(existing.last_checked_at ?? null);
      if (stale) {
        // Return cached result but kick off background freshness check
        triggerFreshnessCheck(domain);
        const deps = await loadDependencies(domain);
        const response = buildProfileResponse(
          { ...existing, is_stale: true, freshness_status: "checking_for_updates" },
          deps
        );
        res.json(response);
        return;
      }

      const deps = await loadDependencies(domain);
      res.json(buildProfileResponse(existing, deps));
      return;
    }

    if (existing?.status === "processing") {
      const deps = await loadDependencies(domain);
      res.json(buildProfileResponse(existing, deps));
      return;
    }

    // Start analysis
    const { status, profile } = await triggerAnalysis(url);
    const deps = profile ? await loadDependencies(domain) : [];

    if (profile) {
      res.json(buildProfileResponse(profile, deps));
    } else {
      res.json({ domain, status, score: null, grade: null });
    }
  } catch (err) {
    console.error("[route/analyze] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/profile/:domain ─────────────────────────────────────────────────
router.get("/profile/:domain", async (req: Request, res: Response) => {
  const { domain } = req.params;
  if (!domain) {
    res.status(400).json({ error: "Domain required" });
    return;
  }

  try {
    const normalized = normalizeDomain(domain);
    const profile = await getDomainProfile(normalized);

    if (!profile) {
      res.json({ domain: normalized, status: "not_found" });
      return;
    }

    const deps = await loadDependencies(normalized);
    res.json(buildProfileResponse(profile, deps));
  } catch (err) {
    console.error("[route/profile] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
