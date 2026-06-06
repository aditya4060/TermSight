import dotenv from "dotenv";
dotenv.config();

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

function getEnvInt(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const config = {
  PORT: getEnvInt("PORT", 4000),
  DATABASE_URL: getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/privacy_facts"),
  FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY ?? "",
  EXTENSION_ORIGIN: getEnv("EXTENSION_ORIGIN", "*"),
  CACHE_TTL_DAYS: getEnvInt("CACHE_TTL_DAYS", 7),
  MAX_DEPENDENCIES: getEnvInt("MAX_DEPENDENCIES", 3),
  MAX_DEPENDENCY_DEPTH: getEnvInt("MAX_DEPENDENCY_DEPTH", 1),
  MOCK_MODE: getEnvBool("MOCK_MODE", false),
} as const;

// Treat missing API key the same as MOCK_MODE=true
export const isMockMode = config.MOCK_MODE || config.FIRECRAWL_API_KEY === "";
