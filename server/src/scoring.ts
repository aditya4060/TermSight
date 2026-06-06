import { scoringPolicy } from "./scoringPolicy.js";
import type { PolicyExtraction, ScoringResult, Flag, EvidenceItem } from "./types.js";

const { privacy_scoring_framework: fw, grade_mapping, data_sensitivity_score: dss, transparency_score: ts, flag_rules } = scoringPolicy;

/** Map a numeric score (0-100) to a grade letter. */
export function scoreToGrade(score: number): string {
  for (const [grade, { min, max }] of Object.entries(grade_mapping)) {
    if (score >= min && score <= max) return grade;
  }
  return "F";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Find evidence text for a given flag key from the extraction evidence array,
 * or fall back to a generic explanation.
 */
function getEvidence(
  flagKey: string,
  evidenceList: EvidenceItem[],
  fallback: string
): string {
  const match = evidenceList.find((e) => e.flag_key === flagKey);
  return match ? match.evidence : fallback;
}

/** Calculate all scores from a PolicyExtraction object. */
export function scorePrivacy(extraction: PolicyExtraction): ScoringResult {
  const ev = extraction.evidence ?? [];
  let score = 100;

  // ── Data Collection ──────────────────────────────────────────────────────
  const dcWeights = fw.categories.data_collection.weights;
  let dcDeduction = 0;
  for (const [key, weight] of Object.entries(dcWeights)) {
    if (extraction[key as keyof PolicyExtraction] === true) {
      dcDeduction += Math.abs(weight);
    }
  }
  const dcActual = -Math.min(dcDeduction, fw.categories.data_collection.max_deduction);
  score += dcActual;

  // ── Data Sharing ─────────────────────────────────────────────────────────
  const dsWeights = fw.categories.data_sharing.weights;
  let dsDeduction = 0;
  for (const [key, weight] of Object.entries(dsWeights)) {
    if (extraction[key as keyof PolicyExtraction] === true) {
      dsDeduction += Math.abs(weight);
    }
  }
  const dsActual = -Math.min(dsDeduction, fw.categories.data_sharing.max_deduction);
  score += dsActual;

  // ── Data Retention ───────────────────────────────────────────────────────
  const retentionWeight =
    (fw.categories.data_retention.weights as Record<string, number>)[
      extraction.data_retention_category
    ] ?? 0;
  score += retentionWeight;

  // ── Tracking & Surveillance ──────────────────────────────────────────────
  const trackWeights = fw.categories.tracking_surveillance.weights;
  let trackDeduction = 0;
  for (const [key, weight] of Object.entries(trackWeights)) {
    if (extraction[key as keyof PolicyExtraction] === true) {
      trackDeduction += Math.abs(weight);
    }
  }
  const trackActual = -Math.min(trackDeduction, fw.categories.tracking_surveillance.max_deduction);
  score += trackActual;

  // ── Legal Fairness ───────────────────────────────────────────────────────
  const legalWeights = fw.categories.legal_fairness.weights;
  let legalDeduction = 0;
  for (const [key, weight] of Object.entries(legalWeights)) {
    if (extraction[key as keyof PolicyExtraction] === true) {
      legalDeduction += Math.abs(weight);
    }
  }
  const legalActual = -Math.min(legalDeduction, fw.categories.legal_fairness.max_deduction);
  score += legalActual;

  // ── User Rights (bonuses) ────────────────────────────────────────────────
  const urWeights = fw.categories.user_rights.weights;
  let urBonus = 0;
  for (const [key, weight] of Object.entries(urWeights)) {
    if (extraction[key as keyof PolicyExtraction] === true) {
      urBonus += weight;
    }
  }
  const urActual = Math.min(urBonus, fw.categories.user_rights.max_bonus);
  score += urActual;

  // ── Security Practices (bonuses) ─────────────────────────────────────────
  const secWeights = fw.categories.security_practices.weights;
  let secBonus = 0;
  for (const [key, weight] of Object.entries(secWeights)) {
    if (extraction[key as keyof PolicyExtraction] === true) {
      secBonus += weight;
    }
  }
  const secActual = Math.min(secBonus, fw.categories.security_practices.max_bonus);
  score += secActual;

  const privacy_score = clamp(Math.round(score), 0, 100);
  const privacy_grade = scoreToGrade(privacy_score);

  // ── Transparency Score ────────────────────────────────────────────────────
  const readabilityContrib = Math.min(
    extraction.policy_readability_score ?? 0,
    ts.criteria.policy_readability
  );
  const transparencyRaw =
    readabilityContrib +
    (extraction.retention_disclosed ? ts.criteria.retention_disclosed : 0) +
    (extraction.data_sharing_disclosed ? ts.criteria.data_sharing_disclosed : 0) +
    (extraction.user_rights_explained ? ts.criteria.user_rights_explained : 0) +
    (extraction.security_practices_disclosed ? ts.criteria.security_practices_disclosed : 0);
  const transparency_score = clamp(transparencyRaw, 0, 100);

  // ── Data Sensitivity Score ────────────────────────────────────────────────
  let rawSensitivity = 0;
  if (extraction.collects_email) rawSensitivity += dss.weights.email;
  if (extraction.collects_phone_number) rawSensitivity += dss.weights.phone;
  if (extraction.tracks_precise_location) rawSensitivity += dss.weights.location;
  if (extraction.accesses_contact_list) rawSensitivity += dss.weights.contacts;
  if (extraction.collects_financial_data) rawSensitivity += dss.weights.financial;
  if (extraction.collects_health_data) rawSensitivity += dss.weights.health;
  if (extraction.collects_biometrics) rawSensitivity += dss.weights.biometrics;
  const data_sensitivity_score = clamp(
    Math.round((rawSensitivity / dss.max_weight) * 100),
    0,
    100
  );

  // ── Category Breakdown ────────────────────────────────────────────────────
  const category_breakdown = {
    data_collection: dcActual,
    data_sharing: dsActual,
    user_rights: urActual,
    data_retention: retentionWeight,
    tracking_surveillance: trackActual,
    legal_fairness: legalActual,
    security_practices: secActual,
  };

  // ── Flags ─────────────────────────────────────────────────────────────────
  const redFlags: Flag[] = [];
  const amberFlags: Flag[] = [];
  const greenFlags: Flag[] = [];

  // Red flags
  if (extraction.sells_user_data) {
    redFlags.push({
      key: "sells_user_data",
      title: "Sells User Data",
      evidence: getEvidence("sells_user_data", ev, "The policy indicates that user data may be sold to third parties."),
    });
  }
  if (extraction.collects_biometrics) {
    redFlags.push({
      key: "collects_biometrics",
      title: "Collects Biometric Data",
      evidence: getEvidence("collects_biometrics", ev, "The policy states that biometric data is collected."),
    });
  }
  if (extraction.data_retention_category === "indefinite") {
    redFlags.push({
      key: "indefinite_retention",
      title: "Indefinite Data Retention",
      evidence: getEvidence("indefinite_retention", ev, "User data is retained indefinitely with no clear deletion policy."),
    });
  }
  if (extraction.forced_arbitration) {
    redFlags.push({
      key: "forced_arbitration",
      title: "Forced Arbitration",
      evidence: getEvidence("forced_arbitration", ev, "The terms require disputes to be resolved through mandatory arbitration."),
    });
  }
  if (extraction.shares_with_advertisers) {
    redFlags.push({
      key: "shares_with_advertisers",
      title: "Shares Data with Advertisers",
      evidence: getEvidence("shares_with_advertisers", ev, "User data is shared with advertising partners."),
    });
  }
  if (extraction.cross_site_tracking) {
    redFlags.push({
      key: "cross_site_tracking",
      title: "Cross-Site Tracking",
      evidence: getEvidence("cross_site_tracking", ev, "The service tracks users across different websites."),
    });
  }
  if (extraction.device_fingerprinting || extraction.uses_device_fingerprinting) {
    redFlags.push({
      key: "device_fingerprinting",
      title: "Device Fingerprinting",
      evidence: getEvidence("device_fingerprinting", ev, "The service uses device fingerprinting to identify users."),
    });
  }
  if (extraction.perpetual_content_license) {
    redFlags.push({
      key: "perpetual_content_license",
      title: "Perpetual Content License",
      evidence: getEvidence("perpetual_content_license", ev, "The company claims a perpetual, irrevocable license to user-generated content."),
    });
  }

  // Amber flags
  if (extraction.tracks_precise_location) {
    amberFlags.push({
      key: "tracks_precise_location",
      title: "Precise Location Tracking",
      evidence: getEvidence("tracks_precise_location", ev, "The service collects precise GPS or location data."),
    });
  }
  if (extraction.shares_with_analytics_providers) {
    amberFlags.push({
      key: "shares_with_analytics_providers",
      title: "Data Shared with Analytics Providers",
      evidence: getEvidence("shares_with_analytics_providers", ev, "Usage data is shared with third-party analytics services."),
    });
  }
  const longRetention =
    extraction.data_retention_category === "between_3_and_5_years" ||
    extraction.data_retention_category === "more_than_5_years";
  if (longRetention) {
    amberFlags.push({
      key: "long_term_retention",
      title: "Long-Term Data Retention",
      evidence: getEvidence("long_term_retention", ev, `Data is retained for ${extraction.data_retention_category.replace(/_/g, " ")}.`),
    });
  }
  if (extraction.behavioral_profiling) {
    amberFlags.push({
      key: "behavioral_profiling",
      title: "Behavioral Profiling",
      evidence: getEvidence("behavioral_profiling", ev, "The service builds behavioral profiles of users."),
    });
  }
  if (extraction.class_action_waiver) {
    amberFlags.push({
      key: "class_action_waiver",
      title: "Class Action Waiver",
      evidence: getEvidence("class_action_waiver", ev, "Users waive their right to participate in class action lawsuits."),
    });
  }
  if (extraction.unilateral_terms_changes) {
    amberFlags.push({
      key: "unilateral_terms_changes",
      title: "Unilateral Terms Changes",
      evidence: getEvidence("unilateral_terms_changes", ev, "The company can change terms without explicit user consent."),
    });
  }

  // Green flags
  if (extraction.account_deletion_available) {
    greenFlags.push({
      key: "account_deletion_available",
      title: "Account Deletion Available",
      evidence: getEvidence("account_deletion_available", ev, "Users can request full account and data deletion."),
    });
  }
  if (extraction.data_export_available) {
    greenFlags.push({
      key: "data_export_available",
      title: "Data Export Available",
      evidence: getEvidence("data_export_available", ev, "Users can export a copy of their personal data."),
    });
  }
  if (extraction.encryption_at_rest) {
    greenFlags.push({
      key: "encryption_at_rest",
      title: "Encryption at Rest",
      evidence: getEvidence("encryption_at_rest", ev, "Data is encrypted at rest."),
    });
  }
  if (extraction.encryption_in_transit) {
    greenFlags.push({
      key: "encryption_in_transit",
      title: "Encryption in Transit",
      evidence: getEvidence("encryption_in_transit", ev, "Data is encrypted in transit using TLS/HTTPS."),
    });
  }
  const shortRetention =
    extraction.data_retention_category === "less_than_6_months" ||
    extraction.data_retention_category === "less_than_12_months";
  if (shortRetention) {
    greenFlags.push({
      key: "short_retention_period",
      title: "Short Data Retention Period",
      evidence: `Data is retained for ${extraction.data_retention_category.replace(/_/g, " ")}.`,
    });
  }
  if (!extraction.sells_user_data) {
    greenFlags.push({
      key: "does_not_sell_data",
      title: "Does Not Sell User Data",
      evidence: "The policy does not indicate that user data is sold to third parties.",
    });
  }

  return {
    privacy_score,
    privacy_grade,
    transparency_score,
    data_sensitivity_score,
    red_flags_count: redFlags.length,
    amber_flags_count: amberFlags.length,
    green_flags_count: greenFlags.length,
    category_breakdown,
    flags: { red: redFlags, amber: amberFlags, green: greenFlags },
  };
}

/** Calculate adjusted score based on dependency risk. */
export function calculateAdjustedScore(
  baseScore: number,
  dependencies: Array<{
    risk_category: string;
    dependency_grade?: string | null;
  }>
): { adjusted_score: number; adjusted_grade: string } {
  const gradeOrder = ["F", "D", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+"];
  const isGradeAtOrWorseThan = (grade: string | null | undefined, threshold: string) => {
    if (!grade) return false;
    return gradeOrder.indexOf(grade) <= gradeOrder.indexOf(threshold);
  };

  let penalty = 0;
  for (const dep of dependencies) {
    const g = dep.dependency_grade ?? null;
    switch (dep.risk_category) {
      case "advertising":
        if (isGradeAtOrWorseThan(g, "C")) penalty += 5;
        break;
      case "analytics":
        if (isGradeAtOrWorseThan(g, "C")) penalty += 3;
        break;
      case "payments":
        if (isGradeAtOrWorseThan(g, "D")) penalty += 3;
        break;
      case "identity_verification":
        if (isGradeAtOrWorseThan(g, "C")) penalty += 4;
        break;
      case "ai_processing":
        if (isGradeAtOrWorseThan(g, "C")) penalty += 4;
        break;
      case "data_storage":
        if (isGradeAtOrWorseThan(g, "D")) penalty += 2;
        break;
    }
  }

  penalty = Math.min(penalty, 15);
  const adjusted_score = clamp(baseScore - penalty, 0, 100);
  const adjusted_grade = scoreToGrade(adjusted_score);
  return { adjusted_score, adjusted_grade };
}
