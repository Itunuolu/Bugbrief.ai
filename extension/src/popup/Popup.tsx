import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { PanelRightOpen } from "lucide-react";
import { Button } from "../components/Button";
import { hasChromeExtensionRuntime } from "../lib/chromeApi";
import "../styles/index.css";

function PopupView() {
  const [error, setError] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const openSidePanel = async () => {
    setError(null);
    setIsOpening(true);

    try {
      if (!hasChromeExtensionRuntime()) {
        window.location.assign(new URL("/sidepanel.html", window.location.origin));
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: "OPEN_SIDE_PANEL"
      });

      if (!response?.ok) {
        throw new Error(response?.error ?? "Unable to open BugBrief.");
      }

      window.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to open panel.");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <main className="w-80 bg-white p-4 text-slate-900">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          BugBrief AI
        </p>
        <h1 className="mt-1 text-lg font-semibold">Capture cleaner bug reports</h1>
        <p className="mt-2 text-sm leading-5 text-slate-600">
          Open the side panel to capture the current tab and turn your notes into
          a developer-ready bug report.
        </p>
      </div>

      <Button
        className="w-full"
        icon={<PanelRightOpen size={18} />}
        isLoading={isOpening}
        onClick={openSidePanel}
      >
        Open BugBrief
      </Button>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PopupView />
  </React.StrictMode>
);

export function Popup() {
  return <PopupView />;
}
