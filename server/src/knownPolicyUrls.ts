/**
 * Known policy URLs for major domains.
 * Using these skips the Firecrawl /map call entirely, saving 10–30 seconds.
 */
export const KNOWN_POLICY_URLS: Record<string, string[]> = {
  "google.com":        ["https://policies.google.com/privacy", "https://policies.google.com/terms"],
  "youtube.com":       ["https://policies.google.com/privacy"],
  "gmail.com":         ["https://policies.google.com/privacy"],
  "amazon.com":        ["https://www.amazon.com/gp/help/customer/display.html?nodeId=468496", "https://www.amazon.com/gp/help/customer/display.html?nodeId=201909010"],
  "apple.com":         ["https://www.apple.com/legal/privacy/", "https://www.apple.com/legal/internet-services/terms/site.html"],
  "icloud.com":        ["https://www.apple.com/legal/privacy/"],
  "facebook.com":      ["https://www.facebook.com/privacy/policy/", "https://www.facebook.com/legal/terms"],
  "instagram.com":     ["https://privacycenter.instagram.com/policies/privacy/", "https://help.instagram.com/519522125107875"],
  "twitter.com":       ["https://twitter.com/en/privacy", "https://twitter.com/en/tos"],
  "x.com":             ["https://twitter.com/en/privacy", "https://twitter.com/en/tos"],
  "microsoft.com":     ["https://privacy.microsoft.com/en-us/privacystatement", "https://www.microsoft.com/en-us/servicesagreement/"],
  "linkedin.com":      ["https://www.linkedin.com/legal/privacy-policy", "https://www.linkedin.com/legal/user-agreement"],
  "tiktok.com":        ["https://www.tiktok.com/legal/page/us/privacy-policy/en", "https://www.tiktok.com/legal/page/us/terms-of-service/en"],
  "snapchat.com":      ["https://snap.com/en-US/privacy/privacy-policy", "https://snap.com/en-US/terms"],
  "reddit.com":        ["https://www.reddit.com/policies/privacy-policy", "https://www.redditinc.com/policies/user-agreement"],
  "netflix.com":       ["https://help.netflix.com/legal/privacy", "https://help.netflix.com/legal/termsofuse"],
  "spotify.com":       ["https://www.spotify.com/legal/privacy-policy/", "https://www.spotify.com/legal/end-user-agreement/"],
  "airbnb.com":        ["https://www.airbnb.com/help/article/2855", "https://www.airbnb.com/help/article/2908"],
  "uber.com":          ["https://www.uber.com/global/en/privacy/overview/", "https://www.uber.com/legal/en/document/?country=united-states&lang=en&name=general-terms-of-use"],
  "paypal.com":        ["https://www.paypal.com/us/legalhub/privacy-full", "https://www.paypal.com/us/legalhub/useragreement-full"],
  "shopify.com":       ["https://www.shopify.com/legal/privacy", "https://www.shopify.com/legal/terms"],
  "github.com":        ["https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement", "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service"],
  "openai.com":        ["https://openai.com/policies/privacy-policy", "https://openai.com/policies/terms-of-use"],
  "notion.so":         ["https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091", "https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac"],
  "stripe.com":        ["https://stripe.com/privacy", "https://stripe.com/ssa"],
  "discord.com":       ["https://discord.com/privacy", "https://discord.com/terms"],
  "slack.com":         ["https://slack.com/intl/en-us/trust/privacy/privacy-policy", "https://slack.com/intl/en-us/terms-of-service"],
  "zoom.us":           ["https://explore.zoom.us/en/privacy/", "https://explore.zoom.us/en/terms/"],
  "dropbox.com":       ["https://www.dropbox.com/privacy", "https://www.dropbox.com/terms"],
  "salesforce.com":    ["https://www.salesforce.com/company/privacy/", "https://www.salesforce.com/company/legal/sfdc-website-terms-of-service/"],
  "hubspot.com":       ["https://legal.hubspot.com/privacy-policy", "https://legal.hubspot.com/terms-of-service"],
  "mailchimp.com":     ["https://mailchimp.com/legal/privacy/", "https://mailchimp.com/legal/terms/"],
  "twilio.com":        ["https://www.twilio.com/en-us/legal/privacy", "https://www.twilio.com/en-us/legal/tos"],
  "cloudflare.com":    ["https://www.cloudflare.com/privacypolicy/", "https://www.cloudflare.com/website-terms/"],
  "pinterest.com":     ["https://policy.pinterest.com/en/privacy-policy", "https://policy.pinterest.com/en/terms-of-service"],
  "whatsapp.com":      ["https://www.whatsapp.com/legal/privacy-policy", "https://www.whatsapp.com/legal/terms-of-service"],
};

/** Common URL path patterns tried when no known URL and map fails. */
export const COMMON_POLICY_PATHS = [
  "/privacy-policy",
  "/privacy",
  "/legal/privacy",
  "/terms",
  "/terms-of-service",
  "/legal/terms",
  "/tos",
  "/legal",
  "/policies/privacy",
  "/cookie-policy",
];

/** Return known policy URLs for a domain, or null if not in the lookup table. */
export function getKnownPolicyUrls(domain: string): string[] | null {
  // Exact match
  if (KNOWN_POLICY_URLS[domain]) return KNOWN_POLICY_URLS[domain];
  // Strip one subdomain level (e.g. "www.google.com" → "google.com")
  const parts = domain.split(".");
  if (parts.length > 2) {
    const parent = parts.slice(-2).join(".");
    if (KNOWN_POLICY_URLS[parent]) return KNOWN_POLICY_URLS[parent];
  }
  return null;
}

/** Build fallback URLs from common path patterns. */
export function buildFallbackUrls(domain: string): string[] {
  return COMMON_POLICY_PATHS.map((path) => `https://${domain}${path}`);
}
