/**
 * Score a URL based on how likely it is to be a privacy/legal policy page.
 * Higher = more likely. Returns null if the URL should be ignored entirely.
 */

const POSITIVE_KEYWORDS: { pattern: RegExp; score: number }[] = [
  { pattern: /privacy[-_]policy|privacypolicy/i, score: 20 },
  { pattern: /privacy/i, score: 10 },
  { pattern: /terms[-_]of[-_]service|termsofservice/i, score: 18 },
  { pattern: /terms[-_]and[-_]conditions|termsandconditions/i, score: 17 },
  { pattern: /terms[-_]of[-_]use|termsofuse/i, score: 16 },
  { pattern: /\btos\b/i, score: 15 },
  { pattern: /\bterms\b/i, score: 8 },
  { pattern: /legal/i, score: 7 },
  { pattern: /cookie[-_]policy|cookiepolicy/i, score: 12 },
  { pattern: /cookie/i, score: 6 },
  { pattern: /data[-_]policy|datapolicy/i, score: 14 },
  { pattern: /conditions/i, score: 6 },
  { pattern: /acceptable[-_]use/i, score: 8 },
  { pattern: /gdpr|ccpa|dpa\b/i, score: 10 },
];

const IGNORE_PATTERNS = [
  /blog\//i,
  /careers\//i,
  /press\//i,
  /\/help\//i,
  /\/support\//i,
  /contact/i,
  /app[-_]?store/i,
  /play[-_]?store/i,
  /twitter\.com/i,
  /facebook\.com/i,
  /linkedin\.com/i,
  /instagram\.com/i,
  /youtube\.com/i,
  /github\.com/i,
  /\/(news|media|events|jobs|about\/team)\//i,
];

function scoreUrl(url: string): number {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(url)) return -1;
  }
  let score = 0;
  for (const { pattern, score: s } of POSITIVE_KEYWORDS) {
    if (pattern.test(url)) score += s;
  }
  return score;
}

/**
 * Given a list of URLs from Firecrawl /map, return the top policy URLs
 * sorted by relevance score. Returns at most 5 URLs.
 */
export function pickPolicyUrls(links: string[]): string[] {
  const scored = links
    .map((url) => ({ url, score: scoreUrl(url) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Deduplicate: prefer the higher-scored variant when paths look similar
  const seen = new Set<string>();
  const results: string[] = [];

  for (const { url } of scored) {
    // Use the path without trailing slashes as a dedup key
    try {
      const parsed = new URL(url);
      const key = (parsed.hostname + parsed.pathname)
        .toLowerCase()
        .replace(/\/$/, "");
      if (!seen.has(key)) {
        seen.add(key);
        results.push(url);
      }
    } catch {
      if (!seen.has(url)) {
        seen.add(url);
        results.push(url);
      }
    }

    if (results.length >= 5) break;
  }

  return results;
}
