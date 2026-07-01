async function configureSidePanel() {
  if (!chrome.sidePanel?.setPanelBehavior) {
    return;
  }

  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}

chrome.runtime.onInstalled.addListener(() => {
  configureSidePanel().catch((error) => {
    console.warn("Failed to configure side panel behavior", error);
  });
});

chrome.runtime.onStartup.addListener(() => {
  configureSidePanel().catch((error) => {
    console.warn("Failed to configure side panel behavior", error);
  });
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!chrome.sidePanel?.open || typeof tab.windowId !== "number") {
    return;
  }

  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "OPEN_SIDE_PANEL") {
    return false;
  }

  const openPanel = async () => {
    if (!chrome.sidePanel?.open) {
      throw new Error("Chrome Side Panel API is not available.");
    }

    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    const windowId = activeTab?.windowId ?? sender.tab?.windowId;

    if (typeof windowId !== "number") {
      throw new Error("Unable to find the active browser window.");
    }

    await chrome.sidePanel.open({ windowId });
  };

  openPanel()
    .then(() => sendResponse({ ok: true }))
    .catch((error: Error) =>
      sendResponse({ ok: false, error: error.message })
    );

  return true;
});

export {};
