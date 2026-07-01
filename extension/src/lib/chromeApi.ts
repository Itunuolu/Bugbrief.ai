import type { CapturedPageContext } from "./types";

export function hasChromeExtensionRuntime() {
  return (
    typeof chrome !== "undefined" &&
    Boolean(chrome.runtime?.id && chrome.runtime?.sendMessage)
  );
}

function hasChromeTabCaptureApi() {
  const tabs =
    typeof chrome !== "undefined"
      ? (chrome.tabs as Partial<typeof chrome.tabs> | undefined)
      : undefined;

  return (
    typeof chrome !== "undefined" &&
    Boolean(
      chrome.runtime?.id &&
        tabs &&
        "query" in tabs &&
        "captureVisibleTab" in tabs
    )
  );
}

function ensureChromeApi() {
  if (!hasChromeTabCaptureApi()) {
    throw new Error("Chrome extension APIs are only available inside Chrome.");
  }
}

function getBrowserName() {
  const userAgent = navigator.userAgent;
  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  const edgeMatch = userAgent.match(/Edg\/([\d.]+)/);
  const userAgentData = navigator as Navigator & {
    userAgentData?: { brands?: Array<{ brand: string }> };
  };

  if (edgeMatch) {
    return `Microsoft Edge ${edgeMatch[1]}`;
  }

  if (chromeMatch) {
    return `Chrome ${chromeMatch[1]}`;
  }

  return userAgentData.userAgentData?.brands?.[0]?.brand ?? "Unknown browser";
}

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  ensureChromeApi();

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!activeTab) {
    throw new Error("No active tab found.");
  }

  return activeTab;
}

function createLocalPreviewScreenshot() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;

  const context = canvas.getContext("2d");

  if (!context) {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
  }

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, canvas.width, 96);
  context.fillStyle = "#14b8a6";
  context.fillRect(0, 94, canvas.width, 6);

  context.fillStyle = "#ffffff";
  context.font = "700 34px Inter, Arial, sans-serif";
  context.fillText("BugBrief AI local preview capture", 48, 61);

  context.fillStyle = "#0f172a";
  context.font = "700 42px Inter, Arial, sans-serif";
  context.fillText(document.title || "Local preview page", 64, 190);

  context.fillStyle = "#475569";
  context.font = "28px Inter, Arial, sans-serif";
  context.fillText(window.location.href, 64, 248);

  context.fillStyle = "#e2e8f0";
  context.fillRect(64, 310, 1152, 250);
  context.fillStyle = "#334155";
  context.font = "26px Inter, Arial, sans-serif";
  context.fillText(
    "Chrome extension APIs are not exposed on localhost pages.",
    104,
    398
  );
  context.fillText(
    "Load extension/dist as an unpacked extension for real tab capture.",
    104,
    448
  );

  return canvas.toDataURL("image/png");
}

function getLocalPreviewPageContext(): CapturedPageContext {
  return {
    url: window.location.href,
    pageTitle: document.title || "BugBrief AI local preview",
    timestamp: new Date().toISOString(),
    browser: `${getBrowserName()} (local preview)`,
    screenshotDataUrl: createLocalPreviewScreenshot()
  };
}

export async function captureVisibleTab(windowId?: number): Promise<string> {
  ensureChromeApi();

  try {
    return await new Promise<string>((resolve, reject) => {
      const onCaptured = (dataUrl: string) => {
        const error = chrome.runtime.lastError;

        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(dataUrl);
      };

      if (typeof windowId === "number") {
        chrome.tabs.captureVisibleTab(windowId, { format: "png" }, onCaptured);
        return;
      }

      chrome.tabs.captureVisibleTab({ format: "png" }, onCaptured);
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to capture screenshot.";
    throw new Error(
      `${message} Try opening BugBrief from the extension icon on the page you want to capture.`
    );
  }
}

export async function getCurrentPageContext(): Promise<CapturedPageContext> {
  if (!hasChromeTabCaptureApi()) {
    return getLocalPreviewPageContext();
  }

  const activeTab = await getActiveTab();
  const screenshotDataUrl = await captureVisibleTab(activeTab.windowId);

  return {
    url: activeTab.url ?? "Unknown URL",
    pageTitle: activeTab.title ?? "Untitled page",
    timestamp: new Date().toISOString(),
    browser: getBrowserName(),
    screenshotDataUrl
  };
}

export function dataUrlToBase64(dataUrl: string) {
  return dataUrl.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
}
