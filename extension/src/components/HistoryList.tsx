import { Clock3 } from "lucide-react";
import type { ReportHistoryItem } from "../lib/types";

interface HistoryListProps {
  items: ReportHistoryItem[];
  onSelect: (item: ReportHistoryItem) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function HistoryList({ items, onSelect }: HistoryListProps) {
  return (
    <section className="space-y-3 border-t border-slate-200 pt-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Local history
        </p>
        <h2 className="mt-1 text-base font-semibold text-slate-950">
          Recent bug reports
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
          Generated reports will be saved locally on this browser.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              className="block w-full rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              key={item.id}
              onClick={() => onSelect(item)}
              type="button"
            >
              <span className="line-clamp-2 text-sm font-semibold text-slate-900">
                {item.report.title}
              </span>
              <span className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 size={13} />
                {formatDate(item.createdAt)}
              </span>
              <span className="mt-1 block truncate text-xs text-slate-500">
                {item.pageContext.url}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
