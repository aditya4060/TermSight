import { query } from "./db.js";
import { config } from "./env.js";
import { firecrawlScrapePolicy, firecrawlScrapeMarkdown } from "./firecrawl.js";
import { hashPolicyMarkdown } from "./hash.js";
import { scorePrivacy, calculateAdjustedScore } from "./scoring.js";
import { loadDependencies } from "./dependencyAnalyzer.js";

interface PolicyDocRow {
  id: number;
  domain: string;
  policy_url: string;
  content_hash: string | null;
  last_scraped_at: Date | null;
  last_changed_at: Date | null;
}

/** Returns true if a profile should be refreshed based on CACHE_TTL_DAYS. */
export function isProfileStale(lastCheckedAt: Date | null): boolean {
  if (!lastCheckedAt) return true;
  const ageMs = Date.now() - new Date(lastCheckedAt).getTime();
  const ttlMs = config.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return ageMs > ttlMs;
}

/**
 * Check whether any policy documents for a domain have changed.
 * If changed: re-runs extraction and updates the profile.
 * If unchanged: just bumps last_checked_at.
 */
export async function checkDomainFreshness(domain: string): Promise<{
  changed: boolean;
  urls_checked: number;
}> {
  console.log(`[freshness] Checking ${domain}`);

  const docsResult = await query<PolicyDocRow>(
    `SELECT id, domain, policy_url, content_hash, last_scraped_at, last_changed_at
     FROM policy_documents
     WHERE domain = $1 AND status = 'active'`,
    [domain]
  );
  const docs = docsResult.rows;

  if (docs.length === 0) {
    console.log(`[freshness] No policy documents stored for ${domain}`);
    return { changed: false, urls_checked: 0 };
  }

  let anyChanged = false;
  let newMarkdown = "";
  let changedUrl = "";

  for (const doc of docs) {
    try {
      const markdown = await firecrawlScrapeMarkdown(doc.policy_url);
      const newHash = hashPolicyMarkdown(markdown);

      if (newHash === doc.content_hash) {
        // No change — just bump last_scraped_at
        await query(
          `UPDATE policy_documents SET last_scraped_at = now(), updated_at = now() WHERE id = $1`,
          [doc.id]
        );
        console.log(`[freshness] ${doc.policy_url} → unchanged`);
      } else {
        console.log(`[freshness] ${doc.policy_url} → CHANGED`);
        anyChanged = true;
        newMarkdown = markdown;
        changedUrl = doc.policy_url;

        // Save a version snapshot
        await query(
          `INSERT INTO policy_versions (policy_document_id, domain, policy_url, version_number, content_hash, markdown_snapshot)
           SELECT $1, $2, $3,
                  COALESCE((SELECT MAX(version_number) FROM policy_versions WHERE policy_document_id = $1), 0) + 1,
                  $4, $5`,
          [doc.id, domain, doc.policy_url, newHash, newMarkdown.slice(0, 100_000)]
        );

        // Update document record
        await query(
          `UPDATE policy_documents
           SET content_hash = $2, last_scraped_at = now(), last_changed_at = now(), updated_at = now()
           WHERE id = $1`,
          [doc.id, newHash]
        );
      }
    } catch (err) {
      console.warn(`[freshness] Could not check ${doc.policy_url}:`, (err as Error).message);
    }
  }

  if (anyChanged && changedUrl) {
    // Re-run full extraction on the changed policy
    try {
      const { extraction } = await firecrawlScrapePolicy(changedUrl);
      const scored = scorePrivacy(extraction);

      const deps = await loadDependencies(domain);
      const { adjusted_score, adjusted_grade } = calculateAdjustedScore(
        scored.privacy_score,
        deps
      );

      await query(
        `UPDATE domain_profiles SET
           status = 'ready',
           score = $2, grade = $3,
           adjusted_score = $4, adjusted_grade = $5,
           transparency_score = $6, data_sensitivity_score = $7,
           red_flags_count = $8, amber_flags_count = $9, green_flags_count = $10,
           summary = $11, extraction = $12, category_breakdown = $13, flags = $14, evidence = $15,
           freshness_status = 'updated',
           is_stale = false,
           last_checked_at = now(),
           policy_changed_at = now(),
           analyzed_at = now(),
           updated_at = now(),
           current_version = current_version + 1
         WHERE domain = $1`,
        [
          domain,
          scored.privacy_score, scored.privacy_grade,
          adjusted_score, adjusted_grade,
          scored.transparency_score, scored.data_sensitivity_score,
          scored.red_flags_count, scored.amber_flags_count, scored.green_flags_count,
          extraction.summary,
          JSON.stringify(extraction),
          JSON.stringify(scored.category_breakdown),
          JSON.stringify(scored.flags),
          JSON.stringify(extraction.evidence),
        ]
      );
      console.log(`[freshness] ${domain} re-scored after policy change`);
    } catch (err) {
      console.warn(`[freshness] Re-extraction failed for ${domain}:`, (err as Error).message);
    }
  } else if (!anyChanged) {
    // All docs unchanged — update freshness metadata
    await query(
      `UPDATE domain_profiles
       SET freshness_status = 'unchanged', is_stale = false, last_checked_at = now(), updated_at = now()
       WHERE domain = $1`,
      [domain]
    );
  }

  return { changed: anyChanged, urls_checked: docs.length };
}

/**
 * Mark a domain profile as stale and begin a background freshness check.
 * Returns immediately; the check runs asynchronously.
 */
export function triggerFreshnessCheck(domain: string): void {
  query(
    `UPDATE domain_profiles
     SET freshness_status = 'checking_for_updates', is_stale = true, updated_at = now()
     WHERE domain = $1`,
    [domain]
  )
    .then(() => checkDomainFreshness(domain))
    .catch((err) =>
      console.error(`[freshness] Background check failed for ${domain}:`, err)
    );
}
