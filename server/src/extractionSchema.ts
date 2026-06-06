export const extractionSchema = {
  type: "object",
  properties: {
    // Data collection
    collects_email: { type: "boolean" },
    collects_phone_number: { type: "boolean" },
    tracks_precise_location: { type: "boolean" },
    accesses_contact_list: { type: "boolean" },
    collects_photos_videos: { type: "boolean" },
    collects_biometrics: { type: "boolean" },
    collects_health_data: { type: "boolean" },
    collects_financial_data: { type: "boolean" },
    uses_device_fingerprinting: { type: "boolean" },

    // Data sharing
    shares_with_affiliates: { type: "boolean" },
    shares_with_analytics_providers: { type: "boolean" },
    shares_with_advertisers: { type: "boolean" },
    sells_user_data: { type: "boolean" },
    shares_sensitive_data: { type: "boolean" },
    unrestricted_third_party_sharing: { type: "boolean" },

    // User rights
    account_deletion_available: { type: "boolean" },
    data_export_available: { type: "boolean" },
    data_correction_available: { type: "boolean" },
    consent_withdrawal_available: { type: "boolean" },
    right_to_object_available: { type: "boolean" },
    child_privacy_protections: { type: "boolean" },

    // Retention
    data_retention_category: {
      type: "string",
      enum: [
        "less_than_6_months",
        "less_than_12_months",
        "between_1_and_3_years",
        "between_3_and_5_years",
        "more_than_5_years",
        "indefinite",
        "unknown",
      ],
    },

    // Tracking
    cookies_only: { type: "boolean" },
    behavioral_profiling: { type: "boolean" },
    cross_site_tracking: { type: "boolean" },
    advertising_tracking: { type: "boolean" },
    session_replay: { type: "boolean" },
    device_fingerprinting: { type: "boolean" },

    // Legal
    forced_arbitration: { type: "boolean" },
    class_action_waiver: { type: "boolean" },
    broad_liability_waiver: { type: "boolean" },
    unilateral_terms_changes: { type: "boolean" },
    perpetual_content_license: { type: "boolean" },

    // Security
    encryption_at_rest: { type: "boolean" },
    encryption_in_transit: { type: "boolean" },
    soc2_certification: { type: "boolean" },
    iso_27001_certification: { type: "boolean" },
    bug_bounty_program: { type: "boolean" },

    // Transparency
    policy_readability_score: { type: "number", minimum: 0, maximum: 20 },
    retention_disclosed: { type: "boolean" },
    data_sharing_disclosed: { type: "boolean" },
    user_rights_explained: { type: "boolean" },
    security_practices_disclosed: { type: "boolean" },

    // Third parties
    third_party_services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          purpose: { type: "string" },
          domain: { type: ["string", "null"] },
          policy_url: { type: ["string", "null"] },
          terms_url: { type: ["string", "null"] },
          risk_category: {
            type: "string",
            enum: [
              "payments",
              "analytics",
              "advertising",
              "cloud_hosting",
              "customer_support",
              "email_marketing",
              "identity_verification",
              "data_storage",
              "ai_processing",
              "other",
            ],
          },
        },
        required: ["name", "purpose", "risk_category"],
      },
    },

    // Summary
    summary: { type: "string" },
    evidence: {
      type: "array",
      items: {
        type: "object",
        properties: {
          flag_key: { type: "string" },
          title: { type: "string" },
          evidence: { type: "string" },
          source_url: { type: "string" },
        },
        required: ["flag_key", "title", "evidence", "source_url"],
      },
    },
  },
  required: [
    "collects_email",
    "collects_phone_number",
    "tracks_precise_location",
    "accesses_contact_list",
    "collects_photos_videos",
    "collects_biometrics",
    "collects_health_data",
    "collects_financial_data",
    "uses_device_fingerprinting",
    "shares_with_affiliates",
    "shares_with_analytics_providers",
    "shares_with_advertisers",
    "sells_user_data",
    "shares_sensitive_data",
    "unrestricted_third_party_sharing",
    "account_deletion_available",
    "data_export_available",
    "data_correction_available",
    "consent_withdrawal_available",
    "right_to_object_available",
    "child_privacy_protections",
    "data_retention_category",
    "cookies_only",
    "behavioral_profiling",
    "cross_site_tracking",
    "advertising_tracking",
    "session_replay",
    "device_fingerprinting",
    "forced_arbitration",
    "class_action_waiver",
    "broad_liability_waiver",
    "unilateral_terms_changes",
    "perpetual_content_license",
    "encryption_at_rest",
    "encryption_in_transit",
    "soc2_certification",
    "iso_27001_certification",
    "bug_bounty_program",
    "policy_readability_score",
    "retention_disclosed",
    "data_sharing_disclosed",
    "user_rights_explained",
    "security_practices_disclosed",
    "third_party_services",
    "summary",
    "evidence",
  ],
};

export const extractionPrompt = `
You are a privacy policy analyst. Carefully analyze the provided privacy policy and/or terms of service document.

Your task is to extract structured privacy risk information.

Instructions:
- Be conservative: only mark something true if the policy language clearly or strongly implies it.
- If the policy is vague or silent on a topic, default to false (except for data_retention_category which should be "unknown").
- For third_party_services: extract only platforms that actually process or receive user data (e.g. Google Analytics, Stripe, AWS, Twilio). Do NOT include generic social media links, help links, or navigation links.
- evidence items should be SHORT (1-3 sentences max) and quote directly from the policy.
- policy_readability_score (0-20): 0 = incomprehensible legal jargon, 20 = extremely clear and plain language.
- summary should be 2-3 sentences explaining the overall privacy stance of this service.
- For data_retention_category: choose the bucket that best describes how long they store your personal data after account deletion or last activity.
`.trim();
