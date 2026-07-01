import type { BugReportResponse, CapturedPageContext, ReportHistoryItem, BugReportFormValues } from "./types";

const HISTORY_KEY = "bugbriefReportHistory";
const MAX_HISTORY_ITEMS = 25;

function canUseChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

async function getFromStorage<T>(key: string, fallback: T): Promise<T> {
  if (!canUseChromeStorage()) {
    const localValue = window.localStorage.getItem(key);
    return localValue ? (JSON.parse(localValue) as T) : fallback;
  }

  const result = await chrome.storage.local.get(key);
  return (result[key] as T | undefined) ?? fallback;
}

async function setInStorage<T>(key: string, value: T): Promise<void> {
  if (!canUseChromeStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
    return;
  }

  await chrome.storage.local.set({ [key]: value });
}

export async function getReportHistory() {
  return getFromStorage<ReportHistoryItem[]>(HISTORY_KEY, []);
}

export async function saveReportHistory(input: {
  pageContext: CapturedPageContext;
  userInput: BugReportFormValues;
  report: BugReportResponse;
}) {
  const history = await getReportHistory();
  const item: ReportHistoryItem = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input
  };

  const nextHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
  await setInStorage(HISTORY_KEY, nextHistory);
  return item;
}
