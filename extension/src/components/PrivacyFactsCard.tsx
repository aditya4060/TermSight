import React, { useState } from "react";
import type { DomainProfile } from "../lib/api.js";
import { gradeLetterColor } from "../lib/grade.js";
import RiskRow, {
  getDataMonetizationStatus,
  getPrecisionTrackingStatus,
  getAccountAutonomyStatus,
  getLegalRestrictionsStatus,
  getTrackingSurveillanceStatus,
  getSecurityPracticesStatus,
} from "./RiskRow.js";
import FlagList from "./FlagList.js";
import DependencyCard from "./DependencyCard.js";

interface PrivacyFactsCardProps {
  profile: DomainProfile;
}

type Tab = "overview" | "flags" | "dependencies";

export default function PrivacyFactsCard({ profile }: PrivacyFactsCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const ext = profile.extraction;
  const hasAdjusted =
    profile.adjusted_score != null &&
    profile.adjusted_score !== profile.score;

  const mainGradeColor = gradeLetterColor(profile.grade);
  const adjustedGradeColor = gradeLetterColor(profile.adjusted_grade);

  const lastChecked = profile.last_checked_at
    ? new Date(profile.last_checked_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown";

  const isStale = profile.is_stale;
  const policyChanged = profile.policy_changed_at;

  const tabButtonClass = (tab: Tab) =>
    `flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
      activeTab === tab
        ? "bg-white text-black"
        : "text-gray-400 hover:text-gray-200"
    }`;

  return (
    <div className="privacy-card" style={{ maxHeight: "580px", overflowY: "auto" }}>
      {/* ── Header ── */}
      <div className="px-3 pt-3 pb-1">
        <h1 className="text-3xl font-black tracking-tight leading-none">
          Privacy Facts
        </h1>
        {profile.is_stale && (
          <div className="text-yellow-500 text-xs mt-1">
            ⟳ Checking for policy updates…
          </div>
        )}
        {policyChanged && (
          <div className="text-orange-400 text-xs mt-1">
            ⚡ Policy changed{" "}
            {new Date(policyChanged).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        )}
      </div>

      <div className="divider-thick" />

      {/* ── Rating ── */}
      <div className="px-3 py-3">
        <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">
          Overall Privacy Rating
        </div>
        <div className="flex items-center gap-4">
          <div>
            <div className="text-white font-black text-xl leading-none">
              {profile.score ?? "—"} / 100
            </div>
            {profile.transparency_score != null && (
              <div className="text-gray-500 text-xs mt-0.5">
                Transparency: {profile.transparency_score}/100
              </div>
            )}
          </div>
          <div
            className={`font-black leading-none ${mainGradeColor}`}
            style={{ fontSize: "4rem", lineHeight: 1 }}
          >
            {profile.grade ?? "—"}
          </div>
        </div>

        {hasAdjusted && (
          <div className="mt-2 pt-2 border-t border-gray-800">
            <div className="text-gray-500 text-xs italic mb-1">
              * Adjusted for third-party dependencies
            </div>
            <div className="flex items-center gap-3">
              <div className="text-gray-300 font-bold text-base">
                {profile.adjusted_score} / 100
              </div>
              <div className={`font-black text-2xl leading-none ${adjustedGradeColor}`}>
                {profile.adjusted_grade}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="divider-thin" />

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-800">
        <button className={tabButtonClass("overview")} onClick={() => setActiveTab("overview")}>
          Overview
        </button>
        <button className={tabButtonClass("flags")} onClick={() => setActiveTab("flags")}>
          Flags{" "}
          {(profile.red_flags_count + profile.amber_flags_count + profile.green_flags_count) > 0 && (
            <span className="text-gray-500">
              ({profile.red_flags_count + profile.amber_flags_count + profile.green_flags_count})
            </span>
          )}
        </button>
        {profile.dependencies.length > 0 && (
          <button className={tabButtonClass("dependencies")} onClick={() => setActiveTab("dependencies")}>
            3rd Party ({profile.dependencies.length})
          </button>
        )}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === "overview" && (
        <>
          {ext ? (
            <>
              <RiskRow
                label="Data Monetization"
                status={getDataMonetizationStatus(ext)}
              />
              <RiskRow
                label="Precision Tracking"
                status={getPrecisionTrackingStatus(ext)}
              />
              <RiskRow
                label="Account Autonomy"
                status={getAccountAutonomyStatus(ext)}
              />
              <RiskRow
                label="Legal Restrictions"
                status={getLegalRestrictionsStatus(ext)}
              />
              <RiskRow
                label="Tracking Surveillance"
                status={getTrackingSurveillanceStatus(ext)}
              />
              <RiskRow
                label="Security Practices"
                status={getSecurityPracticesStatus(ext)}
              />
            </>
          ) : (
            <div className="px-3 py-4 text-gray-500 text-xs">
              Detailed extraction not available.
            </div>
          )}

          {profile.summary && (
            <div className="px-3 py-2 border-t border-gray-800">
              <p className="text-gray-400 text-xs leading-relaxed">
                {profile.summary}
              </p>
            </div>
          )}

          <div className="px-3 py-1.5 border-t border-gray-800">
            <p className="text-gray-600 text-xs italic">
              * Privacy rating based on policy disclosures, data control, user
              rights, and third-party dependencies.
            </p>
          </div>
        </>
      )}

      {/* ── Flags Tab ── */}
      {activeTab === "flags" && (
        <div>
          {profile.flags.red.length === 0 &&
          profile.flags.amber.length === 0 &&
          profile.flags.green.length === 0 ? (
            <div className="px-3 py-4 text-gray-500 text-xs text-center">
              No flags detected.
            </div>
          ) : (
            <FlagList flags={profile.flags} />
          )}
        </div>
      )}

      {/* ── Dependencies Tab ── */}
      {activeTab === "dependencies" && (
        <div className="py-1">
          {profile.dependencies.length === 0 ? (
            <div className="px-3 py-4 text-gray-500 text-xs text-center">
              No third-party dependencies analyzed.
            </div>
          ) : (
            profile.dependencies.map((dep, i) => (
              <DependencyCard key={i} dep={dep} />
            ))
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="divider-thin" />
      <div className="px-3 py-2 flex justify-between items-center bg-gray-900">
        <span className="text-gray-300 text-xs font-bold">{profile.domain}</span>
        <span className="text-gray-600 text-xs">Checked {lastChecked}</span>
      </div>
    </div>
  );
}
