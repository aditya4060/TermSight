export type ProfileStatus = "processing" | "ready" | "error" | "unavailable" | "not_found";
export type FreshnessStatus = "fresh" | "stale" | "checking_for_updates" | "updated" | "unchanged";

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

export interface EvidenceItem {
  flag_key: string;
  title: string;
  evidence: string;
  source_url: string;
}

export type RiskCategory =
  | "payments"
  | "analytics"
  | "advertising"
  | "cloud_hosting"
  | "customer_support"
  | "email_marketing"
  | "identity_verification"
  | "data_storage"
  | "ai_processing"
  | "other";

export type DataRetentionCategory =
  | "less_than_6_months"
  | "less_than_12_months"
  | "between_1_and_3_years"
  | "between_3_and_5_years"
  | "more_than_5_years"
  | "indefinite"
  | "unknown";

export interface ThirdPartyService {
  name: string;
  purpose: string;
  domain?: string | null;
  policy_url?: string | null;
  terms_url?: string | null;
  risk_category: RiskCategory;
}

export interface PolicyExtraction {
  // Data collection
  collects_email: boolean;
  collects_phone_number: boolean;
  tracks_precise_location: boolean;
  accesses_contact_list: boolean;
  collects_photos_videos: boolean;
  collects_biometrics: boolean;
  collects_health_data: boolean;
  collects_financial_data: boolean;
  uses_device_fingerprinting: boolean;

  // Data sharing
  shares_with_affiliates: boolean;
  shares_with_analytics_providers: boolean;
  shares_with_advertisers: boolean;
  sells_user_data: boolean;
  shares_sensitive_data: boolean;
  unrestricted_third_party_sharing: boolean;

  // User rights
  account_deletion_available: boolean;
  data_export_available: boolean;
  data_correction_available: boolean;
  consent_withdrawal_available: boolean;
  right_to_object_available: boolean;
  child_privacy_protections: boolean;

  // Data retention
  data_retention_category: DataRetentionCategory;

  // Tracking
  cookies_only: boolean;
  behavioral_profiling: boolean;
  cross_site_tracking: boolean;
  advertising_tracking: boolean;
  session_replay: boolean;
  device_fingerprinting: boolean;

  // Legal
  forced_arbitration: boolean;
  class_action_waiver: boolean;
  broad_liability_waiver: boolean;
  unilateral_terms_changes: boolean;
  perpetual_content_license: boolean;

  // Security
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  soc2_certification: boolean;
  iso_27001_certification: boolean;
  bug_bounty_program: boolean;

  // Transparency
  policy_readability_score: number;
  retention_disclosed: boolean;
  data_sharing_disclosed: boolean;
  user_rights_explained: boolean;
  security_practices_disclosed: boolean;

  // Third parties
  third_party_services: ThirdPartyService[];

  // Other
  summary: string;
  evidence: EvidenceItem[];
}

export interface ScoringResult {
  privacy_score: number;
  privacy_grade: string;
  transparency_score: number;
  data_sensitivity_score: number;
  red_flags_count: number;
  amber_flags_count: number;
  green_flags_count: number;
  category_breakdown: CategoryBreakdown;
  flags: Flags;
}

export interface DependencyProfile {
  dependency_domain: string;
  service_name: string;
  purpose: string;
  risk_category: RiskCategory;
  policy_url?: string | null;
  terms_url?: string | null;
  dependency_score?: number | null;
  dependency_grade?: string | null;
}

export interface DomainProfileRow {
  domain: string;
  status: ProfileStatus;
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
  evidence: EvidenceItem[];
  error_message?: string | null;
  freshness_status?: FreshnessStatus | null;
  is_stale: boolean;
  last_checked_at?: Date | null;
  next_check_at?: Date | null;
  policy_changed_at?: Date | null;
  current_version: number;
  analyzed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiProfileResponse {
  domain: string;
  status: ProfileStatus;
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
  evidence: EvidenceItem[];
  is_stale: boolean;
  freshness_status?: FreshnessStatus | null;
  last_checked_at?: Date | null;
  policy_changed_at?: Date | null;
  error_message?: string | null;
}
