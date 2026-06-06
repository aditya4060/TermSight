import { query } from "./db.js";
import { normalizeDomain, domainToHomepage } from "./normalize.js";
import { firecrawlMap, firecrawlScrapePolicy } from "./firecrawl.js";
import { pickPolicyUrls } from "./policyPicker.js";
import { scorePrivacy, calculateAdjustedScore } from "./scoring.js";
import { analyzeDependencies } from "./dependencyAnalyzer.js";
import { hashPolicyMarkdown } from "./hash.js";
import { isMockMode } from "./env.js";
import { mockScrapeResults } from "./mockData.js";
import type { DomainProfileRow } from "./types.js";

/** In-memory set of domains currently being analyzed (prevents duplicate jobs). */
const inFlightDomains = new Set<string>();

/** Fetch an existing domain profile from the DB, or null. */
export async function getDomainProfile(domain: string): Promise<DomainProfileRow | null> {
  const result = await query<DomainProfileRow>(
    `SELECT * FROM domain_profiles WHERE domain = $1`,
    [domain]
  );
  return result.rows[0] ?? null;
}

/** Insert a "processing" stub so the extension can poll for it. */
async function insertProcessingStub(domain: string): Promise<void> {
  await query(
    `INSERT INTO domain_profiles (domain, status, flags, category_breakdown, evidence, policy_urls)
     VALUES ($1, 'processing', '{"red":[],"amber":[],"green":[]}', '{}', '[]', '[]')
     ON CONFLICT (domain) DO UPDATE SET status = 'processing', updated_at = now()`,
    [domain]
  );
}

/** Mark profile as unavailable — policy could not be found or scraped. */
async function markUnavailable(domain: string, message: string): Promise<void> {
  await query(
    `UPDATE domain_profiles
     SET status = 'unavailable', error_message = $2, updated_at = now()
     WHERE domain = $1`,
    [domain, message]
  );
}

/** Mark profile as error in DB. */
async function markError(domain: string, message: string): Promise<void> {
  await query(
    `UPDATE domain_profiles
     SET status = 'error', error_message = $2, updated_at = now()
     WHERE domain = $1`,
    [domain, message]
  );
}

/**
 * In mock mode, only return real mock data for the 5 explicitly defined demo
 * domains. Every other domain gets "unavailable" — we never fabricate scores
 * for real websites that haven't been analyzed.
 */
function getMockDataForDomain(domain: string) {
  // Exact match
  if (mockScrapeResults[domain]) return mockScrapeResults[domain];
  // Subdomain / partial match (e.g. "www.notion.so" → "notion.so")
  for (const [key, val] of Object.entries(mockScrapeResults)) {
    if (domain.endsWith(`.${key}`) || key.endsWith(`.${domain}`)) return val;
  }
  return null;
}

/** Run the full analysis pipeline for a domain. */
export async function analyzeDomain(domain: string, depth = 0): Promise<void> {
  if (inFlightDomains.has(domain)) {
    console.log(`[analyze] Already in-flight for ${domain}, skipping`);
    return;
  }
  inFlightDomains.add(domain);

  try {
    await insertProcessingStub(domain);
    console.log(`[analyze] Starting analysis for ${domain} (depth=${depth})`);

    // ── Mock mode: only serve pre-defined demo domains ──────────────────────
    if (isMockMode) {
      const mockData = getMockDataForDomain(domain);
      if (!mockData) {
        await markUnavailable(
          domain,
          "Mock mode is active. Only the 5 demo domains are available. Add a Firecrawl API key to analyze real websites."
        );
        return;
      }
      // Use the pre-defined mock extraction directly
      const scored = scorePrivacy(mockData.extraction);
      const deps = depth === 0
        ? await analyzeDependencies(domain, mockData.extraction.third_party_services, depth)
        : [];
      const { adjusted_score, adjusted_grade } = calculateAdjustedScore(
        scored.privacy_score,
        deps.map((d) => ({ risk_category: d.risk_category, dependency_grade: d.dependency_grade }))
      );
      const nextCheck = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await query(
        `UPDATE domain_profiles SET
           status = 'ready', score = $2, grade = $3, adjusted_score = $4, adjusted_grade = $5,
           transparency_score = $6, data_sensitivity_score = $7,
           red_flags_count = $8, amber_flags_count = $9, green_flags_count = $10,
           summary = $11, policy_urls = $12, extraction = $13,
           category_breakdown = $14, flags = $15, evidence = $16,
           freshness_status = 'fresh', is_stale = false,
           last_checked_at = now(), next_check_at = $17, analyzed_at = now(),
           updated_at = now(), error_message = null
         WHERE domain = $1`,
        [
          domain,
          scored.privacy_score, scored.privacy_grade,
          adjusted_score, adjusted_grade,
          scored.transparency_score, scored.data_sensitivity_score,
          scored.red_flags_count, scored.amber_flags_count, scored.green_flags_count,
          mockData.extraction.summary,
          JSON.stringify([`https://${domain}/privacy`]),
          JSON.stringify(mockData.extraction),
          JSON.stringify(scored.category_breakdown),
          JSON.stringify(scored.flags),
          JSON.stringify(mockData.extraction.evidence),
          nextCheck.toISOString(),
        ]
      );
      console.log(`[analyze] ✅ ${domain} (mock) → ${scored.privacy_grade}`);
      return;
    }

    // ── Real Firecrawl mode ──────────────────────────────────────────────────
    const homepageUrl = domainToHomepage(domain);

    // Step 1: Discover policy URLs
    let links: string[] = [];
    try {
      links = await firecrawlMap(homepageUrl);
    } catch (err) {
      console.warn(`[analyze] firecrawlMap failed for ${domain}:`, (err as Error).message);
    }

    const policyUrls = pickPolicyUrls(links);
    if (policyUrls.length === 0) {
      policyUrls.push(`${homepageUrl}/privacy`, `${homepageUrl}/terms`);
    }
    console.log(`[analyze] Policy URLs for ${domain}:`, policyUrls);

    // Step 2: Scrape + extract
    let markdown = "";
    let extraction = null;
    let successUrl = "";

    for (const url of policyUrls.slice(0, 3)) {
      try {
        const result = await firecrawlScrapePolicy(url);
        markdown = result.markdown;
        extraction = result.extraction;
        successUrl = url;
        break;
      } catch (err) {
        console.warn(`[analyze] scrape failed for ${url}:`, (err as Error).message);
      }
    }

    // If scraping failed entirely, mark as unavailable — never show fabricated data
    if (!extraction) {
      await markUnavailable(
        domain,
        "Could not retrieve or parse the privacy policy for this website. The policy may be behind a login or not publicly accessible."
      );
      return;
    }

    // Step 3: Score
    const scored = scorePrivacy(extraction);

    // Step 4: Dependencies
    let dependencies: Awaited<ReturnType<typeof analyzeDependencies>> = [];
    if (depth === 0) {
      dependencies = await analyzeDependencies(domain, extraction.third_party_services, depth);
    }

    // Step 5: Adjusted score
    const { adjusted_score, adjusted_grade } = calculateAdjustedScore(
      scored.privacy_score,
      dependencies.map((d) => ({ risk_category: d.risk_category, dependency_grade: d.dependency_grade }))
    );

    // Step 6: Store policy document hash for change detection
    const contentHash = hashPolicyMarkdown(markdown);
    if (successUrl) {
      await query(
        `INSERT INTO policy_documents (domain, policy_url, policy_type, content_hash, last_scraped_at, last_changed_at)
         VALUES ($1, $2, 'privacy_terms', $3, now(), now())
         ON CONFLICT (domain, policy_url) DO UPDATE
           SET content_hash = $3, last_scraped_at = now(), updated_at = now()`,
        [domain, successUrl, contentHash]
      );
    }

    // Step 7: Save profile
    const nextCheck = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      `UPDATE domain_profiles SET
         status = 'ready', score = $2, grade = $3, adjusted_score = $4, adjusted_grade = $5,
         transparency_score = $6, data_sensitivity_score = $7,
         red_flags_count = $8, amber_flags_count = $9, green_flags_count = $10,
         summary = $11, policy_urls = $12, extraction = $13,
         category_breakdown = $14, flags = $15, evidence = $16,
         freshness_status = 'fresh', is_stale = false,
         last_checked_at = now(), next_check_at = $17, analyzed_at = now(),
         updated_at = now(), error_message = null
       WHERE domain = $1`,
      [
        domain,
        scored.privacy_score, scored.privacy_grade,
        adjusted_score, adjusted_grade,
        scored.transparency_score, scored.data_sensitivity_score,
        scored.red_flags_count, scored.amber_flags_count, scored.green_flags_count,
        extraction.summary,
        JSON.stringify(policyUrls),
        JSON.stringify(extraction),
        JSON.stringify(scored.category_breakdown),
        JSON.stringify(scored.flags),
        JSON.stringify(extraction.evidence),
        nextCheck.toISOString(),
      ]
    );

    console.log(`[analyze] ✅ ${domain} → ${scored.privacy_grade} (adjusted: ${adjusted_grade})`);
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    console.error(`[analyze] ❌ Failed for ${domain}:`, message);
    await markError(domain, message);
  } finally {
    inFlightDomains.delete(domain);
  }
}

/** Entry point from the POST /api/analyze route. */
export async function triggerAnalysis(inputUrl: string): Promise<{
  domain: string;
  status: string;
  profile: DomainProfileRow | null;
}> {
  const domain = normalizeDomain(inputUrl);

  const existing = await getDomainProfile(domain);
  if (existing && (existing.status === "ready" || existing.status === "unavailable")) {
    return { domain, status: existing.status, profile: existing };
  }
  if (existing && existing.status === "processing") {
    return { domain, status: "processing", profile: existing };
  }

  // Run synchronously — Vercel serverless functions terminate after response,
  // so we must complete analysis within the same request lifecycle.
  await analyzeDomain(domain);
  const profile = await getDomainProfile(domain);
  return { domain, status: profile?.status ?? "error", profile: profile ?? null };
}
