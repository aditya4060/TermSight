import { query } from "./db.js";
import { config } from "./env.js";
import { normalizeExternalDomain } from "./normalize.js";
import { analyzeDomain, getDomainProfile } from "./analyzeDomain.js";
import type { ThirdPartyService, DependencyProfile, RiskCategory } from "./types.js";

/** Categories worth analyzing as dependencies (high privacy impact). */
const IMPORTANT_CATEGORIES: RiskCategory[] = [
  "payments",
  "analytics",
  "advertising",
  "identity_verification",
  "data_storage",
  "ai_processing",
  "email_marketing",
  "customer_support",
];

/** Social/utility domains to skip during dependency analysis. */
const SKIP_DOMAINS = new Set([
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "pinterest.com",
  "reddit.com",
  "wikipedia.org",
  "w3.org",
  "ietf.org",
]);

/**
 * Analyze up to MAX_DEPENDENCIES third-party services found in a policy.
 * Returns saved dependency profiles.
 */
export async function analyzeDependencies(
  parentDomain: string,
  services: ThirdPartyService[],
  depth: number
): Promise<DependencyProfile[]> {
  if (depth >= config.MAX_DEPENDENCY_DEPTH) return [];

  // Filter to important categories only
  const important = services.filter((s) =>
    IMPORTANT_CATEGORIES.includes(s.risk_category)
  );

  // If no important ones, fall back to anything
  const candidates = important.length > 0 ? important : services;

  const results: DependencyProfile[] = [];
  const seenDomains = new Set<string>();

  for (const service of candidates) {
    if (results.length >= config.MAX_DEPENDENCIES) break;

    const depDomain = normalizeExternalDomain(
      service.domain,
      service.policy_url ?? service.terms_url
    );

    if (!depDomain) continue;
    if (depDomain === parentDomain) continue;
    if (SKIP_DOMAINS.has(depDomain)) continue;
    if (seenDomains.has(depDomain)) continue;
    seenDomains.add(depDomain);

    console.log(`[deps] Analyzing dependency ${depDomain} for ${parentDomain}`);

    try {
      // Get or trigger analysis of the dependency domain
      let depProfile = await getDomainProfile(depDomain);

      if (!depProfile || depProfile.status === "error") {
        // Run analysis synchronously for dependencies (depth=1, max 30s)
        await Promise.race([
          analyzeDomain(depDomain, depth + 1),
          new Promise<void>((resolve) => setTimeout(resolve, 30_000)),
        ]);
        depProfile = await getDomainProfile(depDomain);
      }

      const dep: DependencyProfile = {
        dependency_domain: depDomain,
        service_name: service.name,
        purpose: service.purpose,
        risk_category: service.risk_category,
        policy_url: service.policy_url ?? null,
        terms_url: service.terms_url ?? null,
        dependency_score: depProfile?.score ?? null,
        dependency_grade: depProfile?.grade ?? null,
      };

      // Persist the relationship
      await saveDependency(parentDomain, dep);
      results.push(dep);
    } catch (err) {
      console.warn(
        `[deps] Failed to analyze ${depDomain}:`,
        (err as Error).message
      );

      // Still record the relationship even without a score
      const dep: DependencyProfile = {
        dependency_domain: depDomain,
        service_name: service.name,
        purpose: service.purpose,
        risk_category: service.risk_category,
        policy_url: service.policy_url ?? null,
        terms_url: service.terms_url ?? null,
        dependency_score: null,
        dependency_grade: null,
      };
      await saveDependency(parentDomain, dep).catch(() => {});
      results.push(dep);
    }
  }

  return results;
}

async function saveDependency(
  parentDomain: string,
  dep: DependencyProfile
): Promise<void> {
  await query(
    `INSERT INTO domain_dependencies
       (parent_domain, dependency_domain, service_name, purpose, risk_category,
        policy_url, terms_url, dependency_score, dependency_grade)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (parent_domain, dependency_domain, service_name) DO UPDATE
       SET purpose = $4, risk_category = $5, policy_url = $6, terms_url = $7,
           dependency_score = $8, dependency_grade = $9`,
    [
      parentDomain,
      dep.dependency_domain,
      dep.service_name,
      dep.purpose,
      dep.risk_category,
      dep.policy_url,
      dep.terms_url,
      dep.dependency_score,
      dep.dependency_grade,
    ]
  );
}

/** Load saved dependencies for a domain from DB. */
export async function loadDependencies(domain: string): Promise<DependencyProfile[]> {
  const result = await query<DependencyProfile>(
    `SELECT dependency_domain, service_name, purpose, risk_category,
            policy_url, terms_url, dependency_score, dependency_grade
     FROM domain_dependencies
     WHERE parent_domain = $1
     ORDER BY created_at ASC`,
    [domain]
  );
  return result.rows;
}
