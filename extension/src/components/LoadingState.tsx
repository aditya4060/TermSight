import React from "react";

export default function LoadingState() {
  return (
    <div className="privacy-card">
      {/* Header skeleton */}
      <div className="px-3 pt-3 pb-2">
        <div className="h-8 w-40 bg-gray-700 rounded animate-pulse mb-1" />
        <div className="h-3 w-32 bg-gray-800 rounded animate-pulse" />
      </div>

      <div className="divider-thick" />

      {/* Rating skeleton */}
      <div className="px-3 py-3">
        <div className="h-3 w-36 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-20 bg-gray-700 rounded animate-pulse" />
          <div className="h-16 w-12 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      <div className="divider-thin" />

      {/* Row skeletons */}
      {[...Array(6)].map((_, i) => (
        <div key={i} className="risk-row">
          <div className="h-3 w-32 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
        </div>
      ))}

      {/* Status */}
      <div className="px-3 py-3 border-t border-gray-800">
        <p className="text-gray-400 text-xs text-center animate-pulse">
          Firecrawl is parsing legal documents…
        </p>
      </div>
    </div>
  );
}
