-- Privacy Facts Database Schema
-- Migration: 001_init

-- ── Domain Profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domain_profiles (
  domain                  TEXT PRIMARY KEY,
  status                  TEXT NOT NULL DEFAULT 'processing',
  score                   INTEGER,
  grade                   TEXT,
  adjusted_score          INTEGER,
  adjusted_grade          TEXT,
  transparency_score      INTEGER,
  data_sensitivity_score  INTEGER,
  red_flags_count         INTEGER DEFAULT 0,
  amber_flags_count       INTEGER DEFAULT 0,
  green_flags_count       INTEGER DEFAULT 0,
  summary                 TEXT,
  policy_urls             JSONB DEFAULT '[]',
  extraction              JSONB,
  category_breakdown      JSONB DEFAULT '{}',
  flags                   JSONB DEFAULT '{"red":[],"amber":[],"green":[]}',
  evidence                JSONB DEFAULT '[]',
  error_message           TEXT,
  freshness_status        TEXT,
  is_stale                BOOLEAN DEFAULT FALSE,
  last_checked_at         TIMESTAMPTZ,
  next_check_at           TIMESTAMPTZ,
  policy_changed_at       TIMESTAMPTZ,
  current_version         INTEGER DEFAULT 1,
  analyzed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domain_profiles_status ON domain_profiles(status);
CREATE INDEX IF NOT EXISTS idx_domain_profiles_next_check ON domain_profiles(next_check_at);

-- ── Domain Dependencies ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domain_dependencies (
  id                  BIGSERIAL PRIMARY KEY,
  parent_domain       TEXT NOT NULL,
  dependency_domain   TEXT NOT NULL,
  service_name        TEXT,
  purpose             TEXT,
  risk_category       TEXT,
  policy_url          TEXT,
  terms_url           TEXT,
  dependency_score    INTEGER,
  dependency_grade    TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_domain, dependency_domain, service_name)
);

CREATE INDEX IF NOT EXISTS idx_deps_parent ON domain_dependencies(parent_domain);

-- ── Policy Documents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_documents (
  id               BIGSERIAL PRIMARY KEY,
  domain           TEXT NOT NULL,
  policy_url       TEXT NOT NULL,
  policy_type      TEXT,
  content_hash     TEXT,
  extracted_hash   TEXT,
  last_scraped_at  TIMESTAMPTZ,
  last_changed_at  TIMESTAMPTZ,
  status           TEXT DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, policy_url)
);

CREATE INDEX IF NOT EXISTS idx_policy_docs_domain ON policy_documents(domain);

-- ── Policy Versions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_versions (
  id                   BIGSERIAL PRIMARY KEY,
  policy_document_id   BIGINT REFERENCES policy_documents(id),
  domain               TEXT NOT NULL,
  policy_url           TEXT NOT NULL,
  version_number       INTEGER NOT NULL,
  content_hash         TEXT NOT NULL,
  extracted_hash       TEXT,
  markdown_snapshot    TEXT,
  extraction           JSONB,
  score                INTEGER,
  grade                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_domain ON policy_versions(domain);
