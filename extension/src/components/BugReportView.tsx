import { FileDown } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import type { BugReportResponse } from "../lib/types";

interface BugReportViewProps {
  isDownloadingPdf?: boolean;
  onDownloadPdf: () => void;
  pdfStatus: string | null;
  report: BugReportResponse;
}

function FieldList({
  items
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid gap-2 text-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-semibold text-slate-700">{item.label}</dt>
          <dd className="mt-1 break-words text-slate-600">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReportSection({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

export function BugReportView({
  isDownloadingPdf = false,
  onDownloadPdf,
  pdfStatus,
  report
}: BugReportViewProps) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Generated report
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">
          {report.title}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          icon={<FileDown size={17} />}
          isLoading={isDownloadingPdf}
          onClick={onDownloadPdf}
          variant="secondary"
        >
          Download PDF
        </Button>
      </div>

      {pdfStatus ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
          {pdfStatus}
        </p>
      ) : null}

      <article className="space-y-4 rounded-md border border-slate-200 bg-white p-4">
        <ReportSection title="Summary">
          <p className="text-sm leading-6 text-slate-600">{report.summary}</p>
        </ReportSection>

        <ReportSection title="Environment">
          <FieldList
            items={[
              { label: "URL", value: report.environment.url },
              { label: "Page title", value: report.environment.pageTitle },
              { label: "Browser", value: report.environment.browser },
              { label: "Timestamp", value: report.environment.timestamp }
            ]}
          />
        </ReportSection>

        <ReportSection title="Steps to Reproduce">
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-600">
            {report.stepsToReproduce.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </ReportSection>

        <ReportSection title="Expected Result">
          <p className="text-sm leading-6 text-slate-600">
            {report.expectedResult}
          </p>
        </ReportSection>

        <ReportSection title="Actual Result">
          <p className="text-sm leading-6 text-slate-600">
            {report.actualResult}
          </p>
        </ReportSection>

        <ReportSection title="Severity">
          <p className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
            {report.severity}
          </p>
        </ReportSection>

        <ReportSection title="Evidence">
          <p className="text-sm leading-6 text-slate-600">{report.evidence}</p>
          <p className="text-xs leading-5 text-slate-500">
            The downloaded PDF includes the captured screenshot.
          </p>
        </ReportSection>

        <ReportSection title="Suggested Labels">
          <div className="flex flex-wrap gap-2">
            {report.suggestedLabels.map((label) => (
              <span
                className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Notes / Assumptions">
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            {report.notesAssumptions.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </ReportSection>
      </article>
    </section>
  );
}
