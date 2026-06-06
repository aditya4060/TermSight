import { createHash } from "crypto";

/**
 * Normalize policy markdown before hashing.
 * Strips last-updated headers, collapses whitespace, lowercases, etc.
 */
export function normalizePolicyText(markdown: string): string {
  return markdown
    // Remove "Last Updated / Last Revised / Effective Date" lines
    .replace(/^.*?(last\s+updated|last\s+revised|effective\s+date|updated\s+on)[^\n]*\n?/gim, "")
    // Collapse consecutive blank lines
    .replace(/\n{3,}/g, "\n\n")
    // Trim each line
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim()
    .toLowerCase();
}

/** SHA-256 hash of a string, returned as a hex digest. */
export function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Normalize and hash a policy markdown document. */
export function hashPolicyMarkdown(markdown: string): string {
  return sha256(normalizePolicyText(markdown));
}
