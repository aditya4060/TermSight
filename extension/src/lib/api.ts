// Set VITE_API_BASE in extension/.env.local (or .env.production) to your deployed backend URL.
// Default: localhost for local development.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:4000";

export interface Flag {
  title: string;
  evidence: string;
  key?: string;
}

export interface Flags {
  red: Flag[];
  amber: Flag[];
  green: Flag[];
}

export interface CategoryBreakdown {
  data_collection: number;
  data_sharing: number;
  user_rights: number;
  data_retention: number;
  tracking_surveillance: number;
  legal_fairness: number;
  security_practices: number;
}

export interface DependencyProfile {
  dependency_domain: string;
  service_name: string;
  purpose: string;
  risk_category: string;
  policy_url?: string | null;
  terms_url?: string | null;
  dependency_score?: number | null;
  dependency_grade?: string | null;
}

export interface PolicyExtraction {
  collects_email: boolean;
  collects_phone_number: boolean;
  tracks_precise_location: boolean;
  accesses_contact_list: boolean;
  collects_photos_videos: boolean;
  collects_biometrics: boolean;
  collects_health_data: boolean;
  collects_financial_data: boolean;
  uses_device_fingerprinting: boolean;
  shares_with_affiliates: boolean;
  shares_with_analytics_providers: boolean;
  shares_with_advertisers: boolean;
  sells_user_data: boolean;
  shares_sensitive_data: boolean;
  unrestricted_third_party_sharing: boolean;
  account_deletion_available: boolean;
  data_export_available: boolean;
  data_correction_available: boolean;
  consent_withdrawal_available: boolean;
  right_to_object_available: boolean;
  child_privacy_protections: boolean;
  data_retention_category: string;
  cookies_only: boolean;
  behavioral_profiling: boolean;
  cross_site_tracking: boolean;
  advertising_tracking: boolean;
  session_replay: boolean;
  device_fingerprinting: boolean;
  forced_arbitration: boolean;
  class_action_waiver: boolean;
  broad_liability_waiver: boolean;
  unilateral_terms_changes: boolean;
  perpetual_content_license: boolean;
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  soc2_certification: boolean;
  iso_27001_certification: boolean;
  bug_bounty_program: boolean;
  policy_readability_score: number;
  retention_disclosed: boolean;
  data_sharing_disclosed: boolean;
  user_rights_explained: boolean;
  security_practices_disclosed: boolean;
  third_party_services: Array<{
    name: string;
    purpose: string;
    domain?: string | null;
    risk_category: string;
  }>;
  summary: string;
}

export interface DomainProfile {
  domain: string;
  status: "processing" | "ready" | "error" | "unavailable" | "not_found";
  score?: number | null;
  grade?: string | null;
  adjusted_score?: number | null;
  adjusted_grade?: string | null;
  transparency_score?: number | null;
  data_sensitivity_score?: number | null;
  red_flags_count: number;
  amber_flags_count: number;
  green_flags_count: number;
  summary?: string | null;
  policy_urls: string[];
  extraction?: PolicyExtraction | null;
  category_breakdown: CategoryBreakdown;
  flags: Flags;
  dependencies: DependencyProfile[];
  evidence: Array<{ flag_key: string; title: string; evidence: string; source_url: string }>;
  is_stale: boolean;
  freshness_status?: string | null;
  last_checked_at?: string | null;
  policy_changed_at?: string | null;
  error_message?: string | null;
}

/** POST /api/analyze with a URL. */
export async function analyzeUrl(url: string): Promise<DomainProfile> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Analyze failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<DomainProfile>;
}

/** GET /api/profile/:domain */
export async function getProfile(domain: string): Promise<DomainProfile> {
  const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(domain)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Profile fetch failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<DomainProfile>;
}
