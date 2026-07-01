import type { BugReportRequest, BugReportResponse } from "./types";

const LOCAL_BACKEND_URL = "http://localhost:8787";
const BACKEND_STORAGE_KEY = "bugbriefBackendUrl";

async function getStoredBackendUrl() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }

  const result = await chrome.storage.local.get(BACKEND_STORAGE_KEY);
  return typeof result[BACKEND_STORAGE_KEY] === "string"
    ? result[BACKEND_STORAGE_KEY]
    : null;
}

export async function getBackendUrl() {
  const storedUrl = await getStoredBackendUrl();
  const backendUrl =
    storedUrl ??
    import.meta.env.VITE_BUGBRIEF_API_URL ??
    (import.meta.env.DEV ? LOCAL_BACKEND_URL : "");

  if (!backendUrl) {
    throw new Error(
      "BugBrief backend URL is not configured. Set VITE_BUGBRIEF_API_URL to your deployed HTTPS backend URL before building the extension."
    );
  }

  return backendUrl.replace(/\/$/, "");
}

export async function generateBugReport(
  payload: BugReportRequest
): Promise<BugReportResponse> {
  const backendUrl = await getBackendUrl();

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/api/generate-bug-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error(
      `Could not reach the BugBrief backend at ${backendUrl}. Make sure the server is running.`
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error ??
      data?.message ??
      `Bug report generation failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  return data as BugReportResponse;
}
