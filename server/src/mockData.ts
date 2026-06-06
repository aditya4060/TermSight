import type { PolicyExtraction } from "./types.js";

export interface MockMapResult {
  links: string[];
}

export interface MockScrapeResult {
  markdown: string;
  extraction: PolicyExtraction;
}

// ── Mock Firecrawl /map results ───────────────────────────────────────────────

export const mockMapResults: Record<string, MockMapResult> = {
  "example.com": {
    links: [
      "https://example.com/privacy",
      "https://example.com/terms",
    ],
  },
  "randomshop.com": {
    links: [
      "https://randomshop.com/privacy-policy",
      "https://randomshop.com/terms-of-service",
      "https://randomshop.com/cookie-policy",
    ],
  },
  "notion.so": {
    links: [
      "https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091",
      "https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac",
    ],
  },
  "stripe.com": {
    links: [
      "https://stripe.com/privacy",
      "https://stripe.com/ssa",
      "https://stripe.com/legal",
    ],
  },
  "google.com": {
    links: [
      "https://policies.google.com/privacy",
      "https://policies.google.com/terms",
    ],
  },
};

// ── Mock Firecrawl /scrape extractions ────────────────────────────────────────

const exampleExtraction: PolicyExtraction = {
  collects_email: true,
  collects_phone_number: true,
  tracks_precise_location: true,
  accesses_contact_list: true,
  collects_photos_videos: true,
  collects_biometrics: true,
  collects_health_data: true,
  collects_financial_data: true,
  uses_device_fingerprinting: true,
  shares_with_affiliates: true,
  shares_with_analytics_providers: true,
  shares_with_advertisers: true,
  sells_user_data: true,
  shares_sensitive_data: true,
  unrestricted_third_party_sharing: true,
  account_deletion_available: false,
  data_export_available: false,
  data_correction_available: false,
  consent_withdrawal_available: false,
  right_to_object_available: false,
  child_privacy_protections: false,
  data_retention_category: "indefinite",
  cookies_only: false,
  behavioral_profiling: true,
  cross_site_tracking: true,
  advertising_tracking: true,
  session_replay: true,
  device_fingerprinting: true,
  forced_arbitration: true,
  class_action_waiver: true,
  broad_liability_waiver: true,
  unilateral_terms_changes: true,
  perpetual_content_license: true,
  encryption_at_rest: false,
  encryption_in_transit: false,
  soc2_certification: false,
  iso_27001_certification: false,
  bug_bounty_program: false,
  policy_readability_score: 2,
  retention_disclosed: false,
  data_sharing_disclosed: false,
  user_rights_explained: false,
  security_practices_disclosed: false,
  third_party_services: [],
  summary: "This example policy collects virtually all personal data, sells it freely, and provides no user rights or security guarantees. A worst-case privacy scenario.",
  evidence: [
    { flag_key: "sells_user_data", title: "Sells User Data", evidence: "We may sell your personal information to third parties for their own marketing purposes.", source_url: "https://example.com/privacy" },
    { flag_key: "indefinite_retention", title: "Indefinite Retention", evidence: "We retain your data for as long as necessary, which may be indefinitely.", source_url: "https://example.com/privacy" },
    { flag_key: "forced_arbitration", title: "Forced Arbitration", evidence: "All disputes shall be resolved through binding arbitration.", source_url: "https://example.com/terms" },
  ],
};

const randomshopExtraction: PolicyExtraction = {
  collects_email: true,
  collects_phone_number: true,
  tracks_precise_location: false,
  accesses_contact_list: false,
  collects_photos_videos: false,
  collects_biometrics: false,
  collects_health_data: false,
  collects_financial_data: true,
  uses_device_fingerprinting: false,
  shares_with_affiliates: true,
  shares_with_analytics_providers: true,
  shares_with_advertisers: true,
  sells_user_data: false,
  shares_sensitive_data: false,
  unrestricted_third_party_sharing: false,
  account_deletion_available: true,
  data_export_available: false,
  data_correction_available: true,
  consent_withdrawal_available: true,
  right_to_object_available: false,
  child_privacy_protections: false,
  data_retention_category: "between_3_and_5_years",
  cookies_only: false,
  behavioral_profiling: true,
  cross_site_tracking: false,
  advertising_tracking: true,
  session_replay: false,
  device_fingerprinting: false,
  forced_arbitration: false,
  class_action_waiver: true,
  broad_liability_waiver: true,
  unilateral_terms_changes: true,
  perpetual_content_license: false,
  encryption_at_rest: false,
  encryption_in_transit: true,
  soc2_certification: false,
  iso_27001_certification: false,
  bug_bounty_program: false,
  policy_readability_score: 10,
  retention_disclosed: true,
  data_sharing_disclosed: true,
  user_rights_explained: true,
  security_practices_disclosed: false,
  third_party_services: [
    {
      name: "Stripe",
      purpose: "Payment processing",
      domain: "stripe.com",
      policy_url: "https://stripe.com/privacy",
      terms_url: "https://stripe.com/ssa",
      risk_category: "payments",
    },
    {
      name: "Google Analytics",
      purpose: "Website analytics and user behavior tracking",
      domain: "google.com",
      policy_url: "https://policies.google.com/privacy",
      terms_url: "https://policies.google.com/terms",
      risk_category: "analytics",
    },
    {
      name: "Mailchimp",
      purpose: "Email marketing campaigns",
      domain: "mailchimp.com",
      policy_url: "https://mailchimp.com/legal/privacy",
      terms_url: null,
      risk_category: "email_marketing",
    },
  ],
  summary: "RandomShop collects standard e-commerce data including payment information. They share data with advertising partners and use Google Analytics for tracking. Some user rights are provided but security practices are limited.",
  evidence: [
    { flag_key: "shares_with_advertisers", title: "Shares with Advertisers", evidence: "We share your browsing and purchase data with our advertising partners to personalize ads.", source_url: "https://randomshop.com/privacy-policy" },
    { flag_key: "class_action_waiver", title: "Class Action Waiver", evidence: "You agree to resolve disputes individually and waive your right to participate in class action suits.", source_url: "https://randomshop.com/terms-of-service" },
  ],
};

const notionExtraction: PolicyExtraction = {
  collects_email: true,
  collects_phone_number: false,
  tracks_precise_location: false,
  accesses_contact_list: false,
  collects_photos_videos: false,
  collects_biometrics: false,
  collects_health_data: false,
  collects_financial_data: false,
  uses_device_fingerprinting: false,
  shares_with_affiliates: false,
  shares_with_analytics_providers: true,
  shares_with_advertisers: false,
  sells_user_data: false,
  shares_sensitive_data: false,
  unrestricted_third_party_sharing: false,
  account_deletion_available: true,
  data_export_available: true,
  data_correction_available: true,
  consent_withdrawal_available: true,
  right_to_object_available: true,
  child_privacy_protections: false,
  data_retention_category: "between_1_and_3_years",
  cookies_only: true,
  behavioral_profiling: false,
  cross_site_tracking: false,
  advertising_tracking: false,
  session_replay: false,
  device_fingerprinting: false,
  forced_arbitration: false,
  class_action_waiver: false,
  broad_liability_waiver: true,
  unilateral_terms_changes: true,
  perpetual_content_license: true,
  encryption_at_rest: true,
  encryption_in_transit: true,
  soc2_certification: true,
  iso_27001_certification: false,
  bug_bounty_program: false,
  policy_readability_score: 15,
  retention_disclosed: true,
  data_sharing_disclosed: true,
  user_rights_explained: true,
  security_practices_disclosed: true,
  third_party_services: [
    {
      name: "AWS",
      purpose: "Cloud infrastructure and data storage",
      domain: "aws.amazon.com",
      policy_url: "https://aws.amazon.com/privacy/",
      terms_url: null,
      risk_category: "cloud_hosting",
    },
  ],
  summary: "Notion has a relatively transparent privacy policy with strong user rights and security practices. They do not sell data or use advertising tracking. The perpetual content license and unilateral terms changes are notable concerns.",
  evidence: [
    { flag_key: "perpetual_content_license", title: "Perpetual Content License", evidence: "You grant Notion a worldwide, non-exclusive, royalty-free license to use your content to operate and improve the service.", source_url: "https://www.notion.so/Terms-and-Privacy-28ffdd083dc3473e9c2da6ec011b58ac" },
    { flag_key: "account_deletion_available", title: "Account Deletion", evidence: "You can delete your account and all associated data at any time from account settings.", source_url: "https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091" },
    { flag_key: "encryption_at_rest", title: "Encryption at Rest", evidence: "All data is encrypted at rest using AES-256.", source_url: "https://www.notion.so/Privacy-Policy-3468d120cf614d4c9014c09f6adc9091" },
  ],
};

const stripeExtraction: PolicyExtraction = {
  collects_email: true,
  collects_phone_number: true,
  tracks_precise_location: false,
  accesses_contact_list: false,
  collects_photos_videos: false,
  collects_biometrics: false,
  collects_health_data: false,
  collects_financial_data: true,
  uses_device_fingerprinting: true,
  shares_with_affiliates: true,
  shares_with_analytics_providers: true,
  shares_with_advertisers: false,
  sells_user_data: false,
  shares_sensitive_data: false,
  unrestricted_third_party_sharing: false,
  account_deletion_available: true,
  data_export_available: true,
  data_correction_available: true,
  consent_withdrawal_available: true,
  right_to_object_available: true,
  child_privacy_protections: false,
  data_retention_category: "more_than_5_years",
  cookies_only: false,
  behavioral_profiling: false,
  cross_site_tracking: false,
  advertising_tracking: false,
  session_replay: false,
  device_fingerprinting: true,
  forced_arbitration: false,
  class_action_waiver: false,
  broad_liability_waiver: true,
  unilateral_terms_changes: false,
  perpetual_content_license: false,
  encryption_at_rest: true,
  encryption_in_transit: true,
  soc2_certification: true,
  iso_27001_certification: false,
  bug_bounty_program: true,
  policy_readability_score: 16,
  retention_disclosed: true,
  data_sharing_disclosed: true,
  user_rights_explained: true,
  security_practices_disclosed: true,
  third_party_services: [],
  summary: "Stripe has strong security practices and transparency as a financial services company. They use device fingerprinting for fraud prevention, retain data for regulatory compliance, and provide extensive user rights.",
  evidence: [
    { flag_key: "device_fingerprinting", title: "Device Fingerprinting", evidence: "We collect device identifiers and fingerprint data to help detect and prevent fraud.", source_url: "https://stripe.com/privacy" },
    { flag_key: "encryption_at_rest", title: "Encryption at Rest", evidence: "Stripe encrypts all cardholder data at rest using AES-256 encryption.", source_url: "https://stripe.com/privacy" },
    { flag_key: "soc2_certification", title: "SOC 2 Certified", evidence: "Stripe maintains SOC 2 Type II certification for security, availability, and confidentiality.", source_url: "https://stripe.com/privacy" },
  ],
};

const googleExtraction: PolicyExtraction = {
  collects_email: true,
  collects_phone_number: true,
  tracks_precise_location: true,
  accesses_contact_list: false,
  collects_photos_videos: true,
  collects_biometrics: false,
  collects_health_data: false,
  collects_financial_data: true,
  uses_device_fingerprinting: false,
  shares_with_affiliates: true,
  shares_with_analytics_providers: true,
  shares_with_advertisers: true,
  sells_user_data: false,
  shares_sensitive_data: false,
  unrestricted_third_party_sharing: false,
  account_deletion_available: true,
  data_export_available: true,
  data_correction_available: true,
  consent_withdrawal_available: true,
  right_to_object_available: true,
  child_privacy_protections: true,
  data_retention_category: "indefinite",
  cookies_only: false,
  behavioral_profiling: true,
  cross_site_tracking: true,
  advertising_tracking: true,
  session_replay: false,
  device_fingerprinting: false,
  forced_arbitration: false,
  class_action_waiver: false,
  broad_liability_waiver: true,
  unilateral_terms_changes: true,
  perpetual_content_license: true,
  encryption_at_rest: true,
  encryption_in_transit: true,
  soc2_certification: false,
  iso_27001_certification: true,
  bug_bounty_program: true,
  policy_readability_score: 14,
  retention_disclosed: true,
  data_sharing_disclosed: true,
  user_rights_explained: true,
  security_practices_disclosed: true,
  third_party_services: [],
  summary: "Google collects extensive personal data across its many services and uses it for targeted advertising. While they offer good user controls and security, their cross-site tracking and indefinite retention are significant concerns.",
  evidence: [
    { flag_key: "cross_site_tracking", title: "Cross-Site Tracking", evidence: "Google uses cookies and similar technologies to track your activity across websites that use Google services.", source_url: "https://policies.google.com/privacy" },
    { flag_key: "advertising_tracking", title: "Advertising Tracking", evidence: "We use the information we collect to provide, maintain, protect and improve our services, to develop new ones, and to protect Google and our users. We also use this information to offer you tailored content – like giving you more relevant search results and ads.", source_url: "https://policies.google.com/privacy" },
    { flag_key: "indefinite_retention", title: "Indefinite Retention", evidence: "We keep some data for the life of your Google Account if it's useful to you and our business.", source_url: "https://policies.google.com/privacy" },
  ],
};

export const mockScrapeResults: Record<string, MockScrapeResult> = {
  "example.com": {
    markdown: "# Example Privacy Policy\n\nWe collect all data and sell it. No rights. Data retained forever.",
    extraction: exampleExtraction,
  },
  "randomshop.com": {
    markdown: "# RandomShop Privacy Policy\n\nWe collect purchase and browsing data, share with Stripe and Google Analytics.",
    extraction: randomshopExtraction,
  },
  "notion.so": {
    markdown: "# Notion Privacy Policy\n\nNotion collects limited data and provides strong user controls.",
    extraction: notionExtraction,
  },
  "stripe.com": {
    markdown: "# Stripe Privacy Policy\n\nStripe collects financial data with strong security measures.",
    extraction: stripeExtraction,
  },
  "google.com": {
    markdown: "# Google Privacy Policy\n\nGoogle collects extensive data for advertising and services.",
    extraction: googleExtraction,
  },
};

/** Get mock map result, falling back to a generic set of policy links. */
export function getMockMapResult(domain: string): MockMapResult {
  return (
    mockMapResults[domain] ?? {
      links: [
        `https://${domain}/privacy`,
        `https://${domain}/terms`,
      ],
    }
  );
}

/** Get mock scrape result, falling back to a generic extraction. */
export function getMockScrapeResult(domain: string): MockScrapeResult {
  // Try exact match first
  if (mockScrapeResults[domain]) return mockScrapeResults[domain];

  // Try partial match (e.g. "www.notion.so" → "notion.so")
  for (const [key, val] of Object.entries(mockScrapeResults)) {
    if (domain.includes(key) || key.includes(domain)) return val;
  }

  // Generic fallback
  return {
    markdown: `# ${domain} Privacy Policy\n\nStandard privacy policy.`,
    extraction: notionExtraction, // use moderate mock as default
  };
}
