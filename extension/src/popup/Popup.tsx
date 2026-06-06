import React, { useEffect, useState, useCallback } from "react";
import { analyzeUrl, getProfile } from "../lib/api.js";
import { getDomainFromUrl } from "../lib/domain.js";
import type { DomainProfile } from "../lib/api.js";
import PrivacyFactsCard from "../components/PrivacyFactsCard.js";
import LoadingState from "../components/LoadingState.js";
import ErrorState from "../components/ErrorState.js";
import UnavailableState from "../components/UnavailableState.js";

type PopupState =
  | { phase: "loading" }
  | { phase: "processing"; domain: string }
  | { phase: "ready"; profile: DomainProfile }
  | { phase: "unavailable"; domain: string; message?: string | null }
  | { phase: "error"; message: string }
  | { phase: "no_url" };

const MAX_POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 3000;

export default function Popup() {
  const [state, setState] = useState<PopupState>({ phase: "loading" });

  const run = useCallback(async () => {
    setState({ phase: "loading" });

    // Get current tab URL
    let url: string | undefined;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      url = tab?.url;
    } catch {
      setState({ phase: "error", message: "Could not access current tab." });
      return;
    }

    if (!url || !url.startsWith("http")) {
      setState({ phase: "no_url" });
      return;
    }

    const domain = getDomainFromUrl(url);
    if (!domain) {
      setState({ phase: "no_url" });
      return;
    }

    try {
      // POST to analyze
      const initial = await analyzeUrl(url);

      if (initial.status === "ready") {
        setState({ phase: "ready", profile: initial });
        return;
      }

      if (initial.status === "unavailable") {
        setState({ phase: "unavailable", domain, message: initial.error_message });
        return;
      }

      if (initial.status === "error") {
        setState({
          phase: "error",
          message: initial.error_message ?? "Analysis failed.",
        });
        return;
      }

      // Poll until ready
      setState({ phase: "processing", domain });
      let attempts = 0;

      while (attempts < MAX_POLL_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        attempts++;

        const polled = await getProfile(domain);

        if (polled.status === "ready") {
          setState({ phase: "ready", profile: polled });
          return;
        }
        if (polled.status === "unavailable") {
          setState({ phase: "unavailable", domain, message: polled.error_message });
          return;
        }
        if (polled.status === "error") {
          setState({
            phase: "error",
            message: polled.error_message ?? "Analysis failed.",
          });
          return;
        }
        if (polled.status === "not_found") {
          // Try triggering again
          await analyzeUrl(url);
        }
      }

      setState({
        phase: "error",
        message: "Analysis is taking too long. Please try again.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setState({ phase: "error", message });
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  if (state.phase === "loading" || state.phase === "processing") {
    return <LoadingState />;
  }

  if (state.phase === "no_url") {
    return (
      <div className="privacy-card px-4 py-8 text-center">
        <h1 className="text-2xl font-black tracking-tight mb-3">Privacy Facts</h1>
        <div className="divider-thick mb-4" />
        <p className="text-gray-400 text-sm">
          Navigate to a website to analyze its privacy policy.
        </p>
      </div>
    );
  }

  if (state.phase === "unavailable") {
    return <UnavailableState domain={state.domain} message={state.message} onRetry={run} />;
  }

  if (state.phase === "error") {
    return <ErrorState message={state.message} onRetry={run} />;
  }

  return <PrivacyFactsCard profile={state.profile} />;
}
