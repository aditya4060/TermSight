import { query } from "./db.js";
import { normalizeDomain, domainToHomepage } from "./normalize.js";
import { firecrawlMap, firecrawlScrapePolicy } from "./firecrawl.js";
import { pickPolicyUrls } from "./policyPicker.js";
import { scorePrivacy, calculateAdjustedScore } from "./scoring.js";
import { analyzeDependencies } from "./dependencyAnalyzer.js";
import { hashPolicyMarkdown } from "./hash.js";
import { isMockMode } from "./env.js";
import { mockScrapeResults } from "./mockData.js";
import { getKnownPolicyUrls, buildFallbackUrls } from "./knownPolicyUrls.js";
import type { DomainProfileRow, PolicyExtraction } from "./types.js";

const inFlightDomains = new Set<string>();

export async function getDomainProfile(domain: string): Promise<DomainProfileRow | null> {
  const result = await query<DomainProfileRow>(
    `SELECT * FROM domain_profiles WHERE domain = $1`,
    [domain]
  );
  return result.rows[0] ?? null;
}

async function insertProcessingStub(domain: string): Promise<void> {
  await query(
    `INSERT INTO domain_profiles (domain, status, flags, category_breakdown, evidence, policy_urls)
     VALUES ($1, 'processing', '{"red":[],"amber":[],"green":[]}', '{}', '[]', '[]')
     ON CONFLICT (domain) DO UPDATE SET status = 'processing', updated_at = now()`,
    [domain]
  );
}

async function markUnavailable(domain: string, message: string): Promise<void> {
  await query(
    `UPDATE domain_profiles SET status = 'unavailable', error_message = $2, updated_at = now()
     WHERE domain = $1`,
    [domain, message]
  );
}

async function markError(domain: string, message: string): Promise<void> {
  await query(
    `UPDATE domain_profiles SET status = 'error', error_message = $2, updated_at = now()
     WHERE domain = $1`,
    [domain, message]
  );
}

/** Only serve pre-defined mock data — never fabricate scores for unknown domains. */
function getMockDataForDomain(domain: string) {
  if (mockScrapeResults[domain]) return mockScrapeResults[domain];
  const parts = domain.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    if (mockScrapeResults[parent]) return mockScrapeResults[parent];
  }
  return null;
}

/**
 * Discover policy URLs for a domain.
 *
 * Priority:
 *   1. Known URL table (instant, no API call)
 *   2. Firecrawl /map with a short timeout (10s)
 *   3. Common path patterns as final fallback
 */
async function discoverPolicyUrls(domain: string): Promise<string[]> {
  // 1. Known URLs — skip map entirely for major sites
  const known = getKnownPolicyUrls(domain);
  if (known && known.length > 0) {
    console.log(`[analyze] Using known policy URLs for ${domain}`);
    return known;
  }

  // 2. Firecrawl map with a tight timeout
  const homepageUrl = domainToHomepage(domain);
  let mapLinks: string[] = [];
  try {
    const mapPromise = firecrawlMap(homepageUrl);
    const timeoutPromise = new Promise<string[]>((_, reject) =>
      setTimeout(() => reject(new Error("map timeout")), 10_000)
    );
    mapLinks = await Promise.race([mapPromise, timeoutPromise]);
    const picked = pickPolicyUrls(mapLinks);
    if (picked.length > 0) {
      console.log(`[analyze] Map discovered ${picked.length} URLs for ${domain}`);
      return picked.slice(0, 2); // max 2 to stay within time budget
    }
  } catch (err) {
    console.warn(`[analyze] Map failed/timed out for ${domain}:`, (err as Error).message);
  }

  // 3. Common path fallback
  console.log(`[analyze] Using common path fallback for ${domain}`);
  return buildFallbackUrls(domain).slice(0, 3);
}

/**
 * Try scraping multiple policy URLs in parallel.
 * Returns the first successful result, or null if all fail.
 * Parallel attempts stay within Vercel's time budget much better than sequential.
 */
async function scrapeFirstSuccess(
  urls: string[]
): Promise<{ markdown: string; extraction: PolicyExtraction; url: string } | null> {
  // Try the first 2 URLs in parallel
  const candidates = urls.slice(0, 2);

  const results = await Promise.allSettled(
    candidates.map(async (url) => {
      const { markdown, extraction } = await firecrawlScrapePolicy(url);
      return { markdown, extraction, url };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      console.log(`[analyze] Scrape succeeded: ${result.value.url}`);
      return result.value;
    }
    if (result.status === "rejected") {
      console.warn(`[analyze] Scrape failed:`, (result.reason as Error).message);
    }
  }

  // If first 2 failed and there's a 3rd, try it alone
  if (urls.length > 2) {
    try {
      const { markdown, extraction } = await firecrawlScrapePolicy(urls[2]);
      return { markdown, extraction, url: urls[2] };
    } catch (err) {
      console.warn(`[analyze] Fallback scrape failed:`, (err as Error).message);
    }
  }

  return null;
}

export async function analyzeDomain(domain: string, depth = 0): Promise<void> {
  if (inFlightDomains.has(domain)) {
    console.log(`[analyze] Already in-flight for ${domain}, skipping`);
    return;
  }
  inFlightDomains.add(domain);

  try {
    await insertProcessingStub(domain);
    console.log(`[analyze] Starting analysis for ${domain} (depth=${depth})`);

    // ── Mock mode: only serve the 5 pre-defined demo domains ────────────────
    if (isMockMode) {
      const mockData = getMockDataForDomain(domain);
      if (!mockData) {
        await markUnavailable(
          domain,
          "Mock mode is active. Only the 5 demo domains are pre-loaded. Add a Firecrawl API key to analyze any website."
        );
        return;
      }
      const scored = scorePrivacy(mockData.extraction);
      // In mock mode also skip dep analysis for speed
      const { adjusted_score, adjusted_grade } = calculateAdjustedScore(scored.privacy_score, []);
      await saveProfile(domain, scored, adjusted_score, adjusted_grade,
        mockData.extraction, [domain + "/privacy"], mockData.markdown, domain + "/privacy");
      console.log(`[analyze] ✅ ${domain} (mock) → ${scored.privacy_grade}`);
      return;
    }

    // ── Real mode ─────────────────────────────────────────────────────────────

    // Step 1: Find policy URLs (fast path for known domains)
    const policyUrls = await discoverPolicyUrls(domain);
    console.log(`[analyze] Trying ${policyUrls.length} URLs for ${domain}:`, policyUrls);

    // Step 2: Scrape in parallel
    const scraped = await scrapeFirstSuccess(policyUrls);

    if (!scraped) {
      await markUnavailable(
        domain,
        "Could not retrieve or parse the privacy policy for this website. The policy may be behind a login, paywalled, or not publicly accessible."
      );
      return;
    }

    const { markdown, extraction, url: successUrl } = scraped;

    // Step 3: Score
    const scored = scorePrivacy(extraction);

    // Step 4: Dependencies — only analyze if already cached, never add new
    // latency by scraping fresh dependency domains (too slow for Vercel's 60s limit).
    // Dependencies will appear once those domains are analyzed independently.
    let dependencies: Awaited<ReturnType<typeof analyzeDependencies>> = [];
    if (depth === 0) {
      dependencies = await loadCachedDependencies(domain, extraction);
    }

    // Step 5: Adjusted score
    const { adjusted_score, adjusted_grade } = calculateAdjustedScore(
      scored.privacy_score,
      dependencies.map((d) => ({ risk_category: d.risk_category, dependency_grade: d.dependency_grade }))
    );

    // Step 6: Save everything
    await saveProfile(domain, scored, adjusted_score, adjusted_grade,
      extraction, policyUrls, markdown, successUrl);

    // Step 7: Store policy document hash
    const contentHash = hashPolicyMarkdown(markdown);
    await query(
      `INSERT INTO policy_documents (domain, policy_url, policy_type, content_hash, last_scraped_at, last_changed_at)
       VALUES ($1, $2, 'privacy_terms', $3, now(), now())
       ON CONFLICT (domain, policy_url) DO UPDATE
         SET content_hash = $3, last_scraped_at = now(), updated_at = now()`,
      [domain, successUrl, contentHash]
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

/**
 * Instead of analyzing new dependencies (too slow), look up any of the
 * third-party services that have already been analyzed and are in our DB.
 * This means dependencies show up over time as sites get analyzed naturally.
 */
async function loadCachedDependencies(
  domain: string,
  extraction: PolicyExtraction
) {
  const services = extraction.third_party_services ?? [];
  const importantCategories = new Set([
    "payments", "analytics", "advertising",
    "identity_verification", "data_storage", "ai_processing",
  ]);

  const relevant = services
    .filter((s) => importantCategories.has(s.risk_category))
    .slice(0, 3);

  const results = [];
  for (const service of relevant) {
    const depDomain = service.domain
      ? service.domain.replace(/^www\./, "").toLowerCase()
      : null;
    if (!depDomain || depDomain === domain) continue;

    try {
      const existing = await getDomainProfile(depDomain);
      if (existing?.status === "ready") {
        // Save the relationship and return it
        await query(
          `INSERT INTO domain_dependencies
             (parent_domain, dependency_domain, service_name, purpose, risk_category,
              policy_url, terms_url, dependency_score, dependency_grade)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (parent_domain, dependency_domain, service_name) DO UPDATE
             SET dependency_score=$8, dependency_grade=$9`,
          [domain, depDomain, service.name, service.purpose, service.risk_category,
           service.policy_url ?? null, service.terms_url ?? null,
           existing.score, existing.grade]
        );
        results.push({
          dependency_domain: depDomain,
          service_name: service.name,
          purpose: service.purpose,
          risk_category: service.risk_category as import("./types.js").RiskCategory,
          policy_url: service.policy_url ?? null,
          terms_url: service.terms_url ?? null,
          dependency_score: existing.score,
          dependency_grade: existing.grade,
        });
      }
    } catch {
      // Non-critical — skip
    }
  }
  return results;
}

async function saveProfile(
  domain: string,
  scored: ReturnType<typeof scorePrivacy>,
  adjusted_score: number,
  adjusted_grade: string,
  extraction: PolicyExtraction,
  policyUrls: string[],
  _markdown: string,
  _successUrl: string
) {
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
      JSON.stringify(extraction.evidence ?? []),
      nextCheck.toISOString(),
    ]
  );
}

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

  await analyzeDomain(domain);
  const profile = await getDomainProfile(domain);
  return { domain, status: profile?.status ?? "error", profile: profile ?? null };
}
