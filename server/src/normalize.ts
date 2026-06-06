/**
 * Normalize a full URL or hostname to a bare domain (no www, lowercase).
 */
export function normalizeDomain(inputUrl: string): string {
  try {
    // Add a protocol if missing so URL() can parse it
    const withProtocol = /^https?:\/\//i.test(inputUrl)
      ? inputUrl
      : `https://${inputUrl}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    // If URL is totally invalid, try a simple string clean-up
    return inputUrl
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase()
      .trim();
  }
}

/** Return the HTTPS homepage for a bare domain. */
export function domainToHomepage(domain: string): string {
  return `https://${domain}`;
}

/**
 * Extract and normalise a domain from an optional explicit domain string or
 * a policy/terms URL. Returns null if nothing useful can be extracted.
 */
export function normalizeExternalDomain(
  domain?: string | null,
  url?: string | null
): string | null {
  if (domain && domain.trim()) {
    try {
      return normalizeDomain(domain.trim());
    } catch {
      // fall through to url
    }
  }
  if (url && url.trim()) {
    try {
      return normalizeDomain(url.trim());
    } catch {
      // fall through
    }
  }
  return null;
}
