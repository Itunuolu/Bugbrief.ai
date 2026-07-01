import { useEffect, useMemo, useState } from "react";
import { Camera, WandSparkles } from "lucide-react";
import { Button } from "../components/Button";
import { BugReportView } from "../components/BugReportView";
import { HistoryList } from "../components/HistoryList";
import { ScreenshotPreview } from "../components/ScreenshotPreview";
import { TextArea } from "../components/TextArea";
import { generateBugReport } from "../lib/apiClient";
import {
  dataUrlToBase64,
  getCurrentPageContext
} from "../lib/chromeApi";
import { downloadReportPdf } from "../lib/pdf";
import { getReportHistory, saveReportHistory } from "../lib/storage";
import type {
  BugReportFormValues,
  BugReportResponse,
  CapturedPageContext,
  ReportHistoryItem
} from "../lib/types";

const emptyForm: BugReportFormValues = {
  userGoal: "",
  actualProblem: "",
  extraNotes: ""
};

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not captured yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(value));
}

export function SidePanel() {
  const [capturedPage, setCapturedPage] =
    useState<CapturedPageContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [report, setReport] = useState<BugReportResponse | null>(null);

  useEffect(() => {
    getReportHistory()
      .then(setHistory)
      .catch(() => setError("Unable to load local report history."));
  }, []);

  const canGenerate = useMemo(
    () =>
      Boolean(capturedPage) &&
      formValues.userGoal.trim().length > 0 &&
      formValues.actualProblem.trim().length > 0 &&
      !isGenerating,
    [capturedPage, formValues.actualProblem, formValues.userGoal, isGenerating]
  );

  const updateField =
    (field: keyof BugReportFormValues) =>
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormValues((current) => ({
        ...current,
        [field]: event.target.value
      }));
    };

  const captureBug = async () => {
    setError(null);
    setIsCapturing(true);
    setPdfStatus(null);
    setReport(null);

    try {
      const pageContext = await getCurrentPageContext();
      setCapturedPage(pageContext);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to capture this tab."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const generateReport = async () => {
    if (!capturedPage) {
      setError("Capture the bug before generating a report.");
      return;
    }

    if (!formValues.userGoal.trim() || !formValues.actualProblem.trim()) {
      setError("Describe what you were trying to do and what happened instead.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setPdfStatus(null);

    try {
      const generatedReport = await generateBugReport({
        url: capturedPage.url,
        pageTitle: capturedPage.pageTitle,
        timestamp: capturedPage.timestamp,
        browser: capturedPage.browser,
        screenshotBase64: dataUrlToBase64(capturedPage.screenshotDataUrl),
        userGoal: formValues.userGoal.trim(),
        actualProblem: formValues.actualProblem.trim(),
        extraNotes: formValues.extraNotes.trim()
      });

      const savedItem = await saveReportHistory({
        pageContext: capturedPage,
        report: generatedReport,
        userInput: {
          userGoal: formValues.userGoal.trim(),
          actualProblem: formValues.actualProblem.trim(),
          extraNotes: formValues.extraNotes.trim()
        }
      });

      setReport(generatedReport);
      setHistory((current) => [savedItem, ...current].slice(0, 25));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to generate the bug report."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPdf = async () => {
    if (!report || !capturedPage) {
      return;
    }

    setError(null);
    setIsDownloadingPdf(true);
    setPdfStatus(null);

    try {
      await downloadReportPdf({
        pageContext: capturedPage,
        report
      });
      setPdfStatus("PDF downloaded with the captured screenshot.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to download the PDF."
      );
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const selectHistoryItem = (item: ReportHistoryItem) => {
    setCapturedPage(item.pageContext);
    setFormValues(item.userInput);
    setReport(item.report);
    setError(null);
    setPdfStatus(null);
  };

  return (
    <main className="min-h-screen px-4 py-5 text-slate-900">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            BugBrief AI
          </p>
          <h1 className="text-2xl font-semibold text-slate-950">
            Turn a browser bug into a developer-ready report.
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Capture the visible tab, add what you expected, and generate a
            report without exposing any AI key in the extension.
          </p>
        </header>

        <section className="space-y-4">
          <Button
            className="w-full"
            icon={<Camera size={18} />}
            isLoading={isCapturing}
            onClick={captureBug}
          >
            Capture Bug
          </Button>

          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            When you capture a bug, BugBrief sends the visible screenshot, page
            URL, page title, timestamp, browser details, and your notes to the
            configured backend to generate the report.
          </p>

          <ScreenshotPreview screenshotDataUrl={capturedPage?.screenshotDataUrl} />

          <dl className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm">
            <div>
              <dt className="font-semibold text-slate-700">Page URL</dt>
              <dd className="mt-1 break-words text-slate-600">
                {capturedPage?.url ?? "Not captured yet"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-700">Page title</dt>
              <dd className="mt-1 break-words text-slate-600">
                {capturedPage?.pageTitle ?? "Not captured yet"}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-slate-700">Timestamp</dt>
                <dd className="mt-1 text-slate-600">
                  {formatTimestamp(capturedPage?.timestamp)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Browser</dt>
                <dd className="mt-1 text-slate-600">
                  {capturedPage?.browser ?? "Not captured yet"}
                </dd>
              </div>
            </div>
          </dl>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-5">
          <TextArea
            label="What were you trying to do?"
            onChange={updateField("userGoal")}
            placeholder="Example: Submit the checkout form after entering a valid card."
            value={formValues.userGoal}
          />
          <TextArea
            label="What happened instead?"
            onChange={updateField("actualProblem")}
            placeholder="Example: The submit button showed a spinner and the page never advanced."
            value={formValues.actualProblem}
          />
          <TextArea
            helperText="Optional details like account state, test data, or frequency."
            label="Extra notes"
            onChange={updateField("extraNotes")}
            placeholder="Example: Reproduced twice on a staging account."
            value={formValues.extraNotes}
          />

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          <Button
            className="w-full"
            disabled={!canGenerate}
            icon={<WandSparkles size={18} />}
            isLoading={isGenerating}
            onClick={generateReport}
          >
            Generate Bug Report
          </Button>
        </section>

        {report ? (
          <BugReportView
            isDownloadingPdf={isDownloadingPdf}
            onDownloadPdf={downloadPdf}
            pdfStatus={pdfStatus}
            report={report}
          />
        ) : null}

        <HistoryList items={history} onSelect={selectHistoryItem} />
      </div>
    </main>
  );
}
