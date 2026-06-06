import { analyzeUrl, getProfile } from "./lib/api.js";
import { getDomainFromUrl } from "./lib/domain.js";
import { gradeBadgeColor } from "./lib/grade.js";

/** Send URL to backend when a tab finishes loading. */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const url = tab.url;
  if (!url || !url.startsWith("http")) return;

  const domain = getDomainFromUrl(url);
  if (!domain) return;

  // Set "..." badge while processing
  chrome.action.setBadgeText({ text: "...", tabId });
  chrome.action.setBadgeBackgroundColor({ color: [100, 100, 100, 255], tabId });

  try {
    const profile = await analyzeUrl(url);

    if (profile.status === "ready" && profile.grade) {
      setBadgeGrade(tabId, profile.grade);
      return;
    }

    if (profile.status === "processing") {
      // Poll until ready
      await pollUntilReady(tabId, domain);
      return;
    }

    if (profile.status === "error") {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({ color: [239, 68, 68, 255], tabId });
    }
  } catch (err) {
    console.error("[bg] Error analyzing", domain, err);
    chrome.action.setBadgeText({ text: "!", tabId });
    chrome.action.setBadgeBackgroundColor({ color: [239, 68, 68, 255], tabId });
  }
});

async function pollUntilReady(
  tabId: number,
  domain: string,
  attempts = 0
): Promise<void> {
  if (attempts > 20) return;

  await new Promise((r) => setTimeout(r, 3000));

  try {
    const profile = await getProfile(domain);
    if (profile.status === "ready" && profile.grade) {
      setBadgeGrade(tabId, profile.grade);
      return;
    }
    if (profile.status === "error") {
      chrome.action.setBadgeText({ text: "!", tabId });
      chrome.action.setBadgeBackgroundColor({ color: [239, 68, 68, 255], tabId });
      return;
    }
    await pollUntilReady(tabId, domain, attempts + 1);
  } catch {
    // Silently fail polling
  }
}

function setBadgeGrade(tabId: number, grade: string): void {
  // Shorten grade to fit badge (A+, A, B, C, D, F)
  const short = grade.length > 2 ? grade.slice(0, 2) : grade;
  chrome.action.setBadgeText({ text: short, tabId });
  chrome.action.setBadgeBackgroundColor({
    color: gradeBadgeColor(grade),
    tabId,
  });
}
