import React from "react";

interface UnavailableStateProps {
  domain: string;
  message?: string | null;
  onRetry?: () => void;
}

export default function UnavailableState({ domain, message, onRetry }: UnavailableStateProps) {
  return (
    <div className="privacy-card">
      <div className="px-3 pt-3 pb-2">
        <h1 className="text-2xl font-black tracking-tight leading-none">Privacy Facts</h1>
      </div>
      <div className="divider-thick" />

      <div className="px-4 py-5 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-white font-black text-sm mb-1">Policy Not Available</p>
        <p className="text-gray-300 text-xs mb-3 font-bold">{domain}</p>
        <p className="text-gray-500 text-xs leading-relaxed mb-4">
          {message ?? "We could not retrieve or parse the privacy policy for this website."}
        </p>
        <p className="text-gray-600 text-xs italic">
          The policy may be behind a login, use a non-standard format, or require a Firecrawl API key to access.
        </p>
      </div>

      <div className="divider-thin" />
      <div className="px-3 py-2 flex justify-between items-center bg-gray-900">
        <span className="text-gray-400 text-xs">{domain}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-gray-400 text-xs hover:text-white transition-colors underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
