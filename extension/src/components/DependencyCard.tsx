import React from "react";
import type { DependencyProfile } from "../lib/api.js";
import { gradeLetterColor } from "../lib/grade.js";

interface DependencyCardProps {
  dep: DependencyProfile;
}

const CATEGORY_LABELS: Record<string, string> = {
  payments: "Payments",
  analytics: "Analytics",
  advertising: "Advertising",
  cloud_hosting: "Cloud Hosting",
  customer_support: "Support",
  email_marketing: "Email Marketing",
  identity_verification: "Identity",
  data_storage: "Data Storage",
  ai_processing: "AI Processing",
  other: "Other",
};

export default function DependencyCard({ dep }: DependencyCardProps) {
  const gradeColor = gradeLetterColor(dep.dependency_grade);
  const categoryLabel = CATEGORY_LABELS[dep.risk_category] ?? dep.risk_category;

  return (
    <div className="dep-card">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-white truncate">
              {dep.service_name}
            </span>
            <span className="text-gray-500 text-xs shrink-0">{categoryLabel}</span>
          </div>
          <div className="text-gray-400 text-xs mt-0.5 truncate">{dep.dependency_domain}</div>
          <div className="text-gray-500 text-xs mt-0.5 truncate">{dep.purpose}</div>
        </div>
        <div className="ml-2 text-right shrink-0">
          {dep.dependency_grade ? (
            <span className={`font-black text-lg leading-none ${gradeColor}`}>
              {dep.dependency_grade}
            </span>
          ) : (
            <span className="font-black text-sm text-gray-500">N/A</span>
          )}
          {dep.dependency_score != null && (
            <div className="text-gray-500 text-xs">{dep.dependency_score}/100</div>
          )}
        </div>
      </div>
    </div>
  );
}
