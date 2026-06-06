import React from "react";

export type RiskStatus = "CRITICAL" | "WARNING" | "GOOD" | "LIMITED" | "DISABLED";

interface RiskRowProps {
  label: string;
  status: RiskStatus;
}

const statusConfig: Record<RiskStatus, { label: string; className: string }> = {
  CRITICAL: { label: "CRITICAL", className: "status-critical" },
  WARNING: { label: "WARNING", className: "status-warning" },
  GOOD: { label: "GOOD", className: "status-good" },
  LIMITED: { label: "LIMITED", className: "status-limited" },
  DISABLED: { label: "DISABLED", className: "status-disabled" },
};

export default function RiskRow({ label, status }: RiskRowProps) {
  const config = statusConfig[status];
  return (
    <div className="risk-row">
      <span className="text-gray-200 font-bold uppercase tracking-wide text-xs">
        {label}
      </span>
      <span className={`status-badge ${config.className}`}>{config.label}</span>
    </div>
  );
}

/** Determine Data Monetization status from extraction */
export function getDataMonetizationStatus(ext: {
  sells_user_data: boolean;
  shares_with_advertisers: boolean;
  shares_with_affiliates: boolean;
  shares_with_analytics_providers: boolean;
}): RiskStatus {
  if (ext.sells_user_data || ext.shares_with_advertisers) return "CRITICAL";
  if (ext.shares_with_affiliates || ext.shares_with_analytics_providers) return "WARNING";
  return "GOOD";
}

/** Determine Precision Tracking status */
export function getPrecisionTrackingStatus(ext: {
  tracks_precise_location: boolean;
  device_fingerprinting: boolean;
  uses_device_fingerprinting: boolean;
  behavioral_profiling: boolean;
  cross_site_tracking: boolean;
}): RiskStatus {
  if (ext.tracks_precise_location || ext.device_fingerprinting || ext.uses_device_fingerprinting)
    return "CRITICAL";
  if (ext.behavioral_profiling || ext.cross_site_tracking) return "WARNING";
  return "GOOD";
}

/** Determine Account Autonomy status */
export function getAccountAutonomyStatus(ext: {
  account_deletion_available: boolean;
  data_export_available: boolean;
}): RiskStatus {
  if (ext.account_deletion_available && ext.data_export_available) return "GOOD";
  if (ext.account_deletion_available || ext.data_export_available) return "LIMITED";
  return "DISABLED";
}

/** Determine Legal Restrictions status */
export function getLegalRestrictionsStatus(ext: {
  forced_arbitration: boolean;
  perpetual_content_license: boolean;
  class_action_waiver: boolean;
  unilateral_terms_changes: boolean;
}): RiskStatus {
  if (ext.forced_arbitration || ext.perpetual_content_license) return "CRITICAL";
  if (ext.class_action_waiver || ext.unilateral_terms_changes) return "WARNING";
  return "GOOD";
}

/** Determine Tracking Surveillance status */
export function getTrackingSurveillanceStatus(ext: {
  cross_site_tracking: boolean;
  session_replay: boolean;
  advertising_tracking: boolean;
  cookies_only: boolean;
  behavioral_profiling: boolean;
}): RiskStatus {
  if (ext.cross_site_tracking || ext.session_replay || ext.advertising_tracking) return "CRITICAL";
  if (ext.cookies_only || ext.behavioral_profiling) return "WARNING";
  return "GOOD";
}

/** Determine Security Practices status */
export function getSecurityPracticesStatus(ext: {
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  soc2_certification: boolean;
  bug_bounty_program: boolean;
}): RiskStatus {
  if (ext.encryption_at_rest && ext.encryption_in_transit) return "GOOD";
  if (ext.encryption_at_rest || ext.encryption_in_transit || ext.soc2_certification || ext.bug_bounty_program)
    return "LIMITED";
  return "WARNING";
}
