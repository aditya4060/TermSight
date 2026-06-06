import { isMockMode, config } from "./env.js";
import { extractionSchema, extractionPrompt } from "./extractionSchema.js";
import { getMockMapResult, getMockScrapeResult } from "./mockData.js";
import type { PolicyExtraction } from "./types.js";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

interface FirecrawlMapResponse {
  success: boolean;
  links?: string[];
  error?: string;
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    extract?: Partial<PolicyExtraction>;
  };
  error?: string;
}

async function firecrawlFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${FIRECRAWL_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firecrawl ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

/** Discover all links on a domain's homepage. */
export async function firecrawlMap(homepageUrl: string): Promise<string[]> {
  const domain = new URL(homepageUrl).hostname.replace(/^www\./, "");

  if (isMockMode) {
    console.log(`[firecrawl] MOCK map for ${domain}`);
    await new Promise((r) => setTimeout(r, 200)); // simulate latency
    return getMockMapResult(domain).links;
  }

  console.log(`[firecrawl] map ${homepageUrl}`);
  const result = await firecrawlFetch<FirecrawlMapResponse>("/map", {
    url: homepageUrl,
    search: "privacy terms legal data policy cookies",
    includeSubdomains: false,
    ignoreQueryParameters: true,
    limit: 100,
    timeout: 30000,
  });

  if (!result.success) {
    throw new Error(`Firecrawl map error: ${result.error ?? "unknown"}`);
  }

  return result.links ?? [];
}

/** Scrape a policy page and extract structured JSON. */
export async function firecrawlScrapePolicy(
  url: string
): Promise<{ markdown: string; extraction: PolicyExtraction }> {
  let domain: string;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = url;
  }

  if (isMockMode) {
    console.log(`[firecrawl] MOCK scrape (full extraction) for ${domain}`);
    await new Promise((r) => setTimeout(r, 300));
    return getMockScrapeResult(domain);
  }

  console.log(`[firecrawl] scrape (full extraction) ${url}`);
  const result = await firecrawlFetch<FirecrawlScrapeResponse>("/scrape", {
    url,
    formats: [
      "markdown",
      {
        type: "json",
        schema: extractionSchema,
        prompt: extractionPrompt,
      },
    ],
    onlyMainContent: true,
    onlyCleanContent: true,
    timeout: 120000,
    blockAds: true,
    removeBase64Images: true,
    storeInCache: true,
  });

  if (!result.success || !result.data) {
    throw new Error(`Firecrawl scrape error: ${result.error ?? "no data"}`);
  }

  const markdown = result.data.markdown ?? "";
  const extraction = result.data.extract as PolicyExtraction;
  if (!extraction) {
    throw new Error("Firecrawl scrape returned no JSON extraction");
  }

  return { markdown, extraction };
}

/** Scrape a policy page for markdown only (used for change detection). */
export async function firecrawlScrapeMarkdown(url: string): Promise<string> {
  let domain: string;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = url;
  }

  if (isMockMode) {
    console.log(`[firecrawl] MOCK scrape (markdown only) for ${domain}`);
    await new Promise((r) => setTimeout(r, 150));
    return getMockScrapeResult(domain).markdown;
  }

  console.log(`[firecrawl] scrape (markdown) ${url}`);
  const result = await firecrawlFetch<FirecrawlScrapeResponse>("/scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
    onlyCleanContent: true,
    maxAge: 0, // bypass Firecrawl cache for freshness checks
    timeout: 60000,
    blockAds: true,
    removeBase64Images: true,
    storeInCache: true,
  });

  if (!result.success || !result.data) {
    throw new Error(`Firecrawl markdown scrape error: ${result.error ?? "no data"}`);
  }

  return result.data.markdown ?? "";
}
