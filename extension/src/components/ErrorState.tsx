import React from "react";

interface ErrorStateProps {
  message?: string | null;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="privacy-card">
      <div className="px-3 pt-3 pb-2">
        <h1 className="text-2xl font-black tracking-tight leading-none">
          Privacy Facts
        </h1>
      </div>
      <div className="divider-thick" />
      <div className="px-4 py-6 text-center">
        <div className="text-red-500 text-3xl mb-3">⚠</div>
        <p className="text-white font-bold text-sm mb-1">Analysis Failed</p>
        <p className="text-gray-400 text-xs mb-4">
          {message ?? "Could not connect to the Privacy Facts backend."}
        </p>
        <p className="text-gray-500 text-xs mb-4">
          Make sure the server is running at{" "}
          <span className="text-gray-300">http://localhost:4000</span>
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-white text-black font-black text-xs px-4 py-2 rounded hover:bg-gray-200 transition-colors"
          >
            RETRY
          </button>
        )}
      </div>
    </div>
  );
}
