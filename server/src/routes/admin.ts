/**
 * Admin routes — protected by ADMIN_SECRET env var.
 * Used to run migrations and seed data remotely (e.g. on Vercel after first deploy).
 *
 * POST /admin/migrate   — runs 001_init.sql against the connected database
 * POST /admin/seed      — inserts mock demo data
 */
import { Router, Request, Response } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { pool } from "../db.js";
import { mockScrapeResults } from "../mockData.js";
import { scorePrivacy, calculateAdjustedScore } from "../scoring.js";
import { hashPolicyMarkdown } from "../hash.js";

const router = Router();

function checkSecret(req: Request, res: Response): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ error: "ADMIN_SECRET not configured" });
    return false;
  }
  const provided =
    req.headers["x-admin-secret"] ?? req.body?.admin_secret;
  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// POST /admin/migrate
router.post("/migrate", async (req: Request, res: Response) => {
  if (!checkSecret(req, res)) return;

  try {
    // Try reading the SQL file; on Vercel it's bundled via includeFiles
    let sql: string;
    try {
      sql = readFileSync(join(process.cwd(), "migrations/001_init.sql"), "utf8");
    } catch {
      // Fallback path when running from the api/ directory on Vercel
      sql = readFileSync(
        join(process.cwd(), "../migrations/001_init.sql"),
        "utf8"
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      res.json({ ok: true, message: "Migration completed" });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /admin/seed
router.post("/seed", async (req: Request, res: Response) => {
  if (!checkSecret(req, res)) return;

  const DEMO_DOMAINS: Record<string, { policyUrl: string }> = {
    "example.com": { policyUrl: "https://example.com/privacy" },
    "randomshop.com": { policyUrl: "https://randomshop.com/privacy-policy" },
    "notion.so": { policyUrl: "https://www.notion.so/Privacy-Policy" },
    "stripe.com": { policyUrl: "https://stripe.com/privacy" },
    "google.com": { policyUrl: "https://policies.google.com/privacy" },
  };

  const DEMO_DEPENDENCIES: Record<string, Array<{
    dep: string; name: string; purpose: string; category: string;
    policy_url: string | null; terms_url: string | null;
  }>> = {
    "randomshop.com": [
      { dep: "stripe.com", name: "Stripe", purpose: "Payment processing", category: "payments", policy_url: "https://stripe.com/privacy", terms_url: "https://stripe.com/ssa" },
      { dep: "google.com", name: "Google Analytics", purpose: "Website analytics", category: "analytics", policy_url: "https://policies.google.com/privacy", terms_url: null },
    ],
  };

  try {
    const client = await pool.connect();
    const seeded: string[] = [];

    try {
      for (const [domain, { policyUrl }] of Object.entries(DEMO_DOMAINS)) {
        const mock = mockScrapeResults[domain];
        if (!mock) continue;

        const scored = scorePrivacy(mock.extraction);
        const depsConfig = DEMO_DEPENDENCIES[domain] ?? [];
        const depGrades = depsConfig
          .map((d) => {
            const dm = mockScrapeResults[d.dep];
            return dm
              ? { risk_category: d.category, dependency_grade: scorePrivacy(dm.extraction).privacy_grade }
              : null;
          })
          .filter(Boolean) as Array<{ risk_category: string; dependency_grade: string }>;

        const { adjusted_score, adjusted_grade } = calculateAdjustedScore(
          scored.privacy_score,
          depGrades
        );
        const contentHash = hashPolicyMarkdown(mock.markdown);
        const nextCheck = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await client.query(
          `INSERT INTO domain_profiles (
             domain, status, score, grade, adjusted_score, adjusted_grade,
             transparency_score, data_sensitivity_score,
             red_flags_count, amber_flags_count, green_flags_count,
             summary, policy_urls, extraction, category_breakdown, flags, evidence,
             freshness_status, is_stale, last_checked_at, next_check_at, analyzed_at
           ) VALUES (
             $1, 'ready', $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, $15, $16,
             'fresh', false, now(), $17, now()
           )
           ON CONFLICT (domain) DO UPDATE SET
             status='ready', score=$2, grade=$3, adjusted_score=$4, adjusted_grade=$5,
             transparency_score=$6, data_sensitivity_score=$7,
             red_flags_count=$8, amber_flags_count=$9, green_flags_count=$10,
             summary=$11, policy_urls=$12, extraction=$13, category_breakdown=$14,
             flags=$15, evidence=$16,
             freshness_status='fresh', is_stale=false,
             last_checked_at=now(), next_check_at=$17, analyzed_at=now(), updated_at=now()`,
          [
            domain,
            scored.privacy_score, scored.privacy_grade,
            adjusted_score, adjusted_grade,
            scored.transparency_score, scored.data_sensitivity_score,
            scored.red_flags_count, scored.amber_flags_count, scored.green_flags_count,
            mock.extraction.summary,
            JSON.stringify([policyUrl]),
            JSON.stringify(mock.extraction),
            JSON.stringify(scored.category_breakdown),
            JSON.stringify(scored.flags),
            JSON.stringify(mock.extraction.evidence),
            nextCheck.toISOString(),
          ]
        );

        await client.query(
          `INSERT INTO policy_documents (domain, policy_url, policy_type, content_hash, last_scraped_at, last_changed_at)
           VALUES ($1, $2, 'privacy_terms', $3, now(), now())
           ON CONFLICT (domain, policy_url) DO UPDATE SET content_hash=$3, last_scraped_at=now(), updated_at=now()`,
          [domain, policyUrl, contentHash]
        );

        seeded.push(domain);
      }

      // Dependencies
      for (const [parent, deps] of Object.entries(DEMO_DEPENDENCIES)) {
        for (const d of deps) {
          const dm = mockScrapeResults[d.dep];
          const depScore = dm ? scorePrivacy(dm.extraction) : null;
          await client.query(
            `INSERT INTO domain_dependencies
               (parent_domain, dependency_domain, service_name, purpose, risk_category,
                policy_url, terms_url, dependency_score, dependency_grade)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT (parent_domain, dependency_domain, service_name) DO UPDATE
               SET dependency_score=$8, dependency_grade=$9`,
            [parent, d.dep, d.name, d.purpose, d.category, d.policy_url, d.terms_url,
             depScore?.privacy_score ?? null, depScore?.privacy_grade ?? null]
          );
        }
      }
    } finally {
      client.release();
    }

    res.json({ ok: true, seeded });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
