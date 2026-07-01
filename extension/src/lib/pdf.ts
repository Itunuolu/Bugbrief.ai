import { jsPDF } from "jspdf";
import type { BugReportResponse, CapturedPageContext } from "./types";

interface DownloadReportPdfInput {
  pageContext: CapturedPageContext;
  report: BugReportResponse;
}

function fileSafeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function loadImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        height: image.naturalHeight || image.height,
        width: image.naturalWidth || image.width
      });
    };

    image.onerror = () => reject(new Error("Unable to load screenshot."));
    image.src = src;
  });
}

function formatList(items: string[], fallback: string) {
  return items.length > 0 ? items : [fallback];
}

export async function downloadReportPdf({
  pageContext,
  report
}: DownloadReportPdfInput) {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const margin = 16;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 18;

  const ensureSpace = (height: number) => {
    if (cursorY + height <= pageHeight - margin) {
      return;
    }

    doc.addPage();
    cursorY = margin;
  };

  const addText = (
    text: string,
    options: {
      color?: [number, number, number];
      fontSize?: number;
      gapAfter?: number;
      lineHeight?: number;
      style?: "normal" | "bold";
      x?: number;
      width?: number;
    } = {}
  ) => {
    const {
      color = [15, 23, 42],
      fontSize = 10.5,
      gapAfter = 3,
      lineHeight = 5,
      style = "normal",
      x = margin,
      width = contentWidth
    } = options;
    const lines = doc.splitTextToSize(text || "Not provided.", width);

    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);

    ensureSpace(lines.length * lineHeight + gapAfter);
    doc.text(lines, x, cursorY);
    cursorY += lines.length * lineHeight + gapAfter;
  };

  const addSectionTitle = (title: string) => {
    ensureSpace(11);
    cursorY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 184, 166);
    doc.text(title, margin, cursorY);
    cursorY += 6;
  };

  const addKeyValue = (label: string, value: string) => {
    addText(`${label}: ${value || "Not provided."}`, {
      color: [71, 85, 105],
      gapAfter: 2,
      lineHeight: 4.8
    });
  };

  doc.setProperties({
    creator: "BugBrief AI",
    subject: "Developer-ready bug report",
    title: report.title
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("BUGBRIEF AI", margin, cursorY);
  cursorY += 9;

  addText(report.title, {
    fontSize: 18,
    gapAfter: 5,
    lineHeight: 7,
    style: "bold"
  });

  addSectionTitle("Summary");
  addText(report.summary);

  addSectionTitle("Environment");
  addKeyValue("URL", report.environment.url || pageContext.url);
  addKeyValue("Page title", report.environment.pageTitle || pageContext.pageTitle);
  addKeyValue("Browser", report.environment.browser || pageContext.browser);
  addKeyValue("Timestamp", report.environment.timestamp || pageContext.timestamp);

  addSectionTitle("Steps to Reproduce");
  formatList(report.stepsToReproduce, "Steps were not provided.").forEach(
    (step, index) => {
      addText(`${index + 1}. ${step}`, {
        color: [51, 65, 85],
        gapAfter: 2,
        lineHeight: 4.8
      });
    }
  );

  addSectionTitle("Expected Result");
  addText(report.expectedResult);

  addSectionTitle("Actual Result");
  addText(report.actualResult);

  addSectionTitle("Severity");
  addText(report.severity, { style: "bold" });

  addSectionTitle("Evidence");
  addText(report.evidence || "Screenshot captured from the affected page.");

  const dimensions = await loadImageDimensions(pageContext.screenshotDataUrl);
  const maxImageHeight = 96;
  let imageWidth = contentWidth;
  let imageHeight = imageWidth * (dimensions.height / dimensions.width);

  if (imageHeight > maxImageHeight) {
    imageHeight = maxImageHeight;
    imageWidth = imageHeight * (dimensions.width / dimensions.height);
  }

  ensureSpace(imageHeight + 8);
  doc.addImage(
    pageContext.screenshotDataUrl,
    "PNG",
    margin,
    cursorY,
    imageWidth,
    imageHeight
  );
  cursorY += imageHeight + 5;

  addSectionTitle("Suggested Labels");
  addText(formatList(report.suggestedLabels, "No labels suggested.").join(", "));

  addSectionTitle("Notes / Assumptions");
  formatList(report.notesAssumptions, "No additional notes.").forEach((note) => {
    addText(`- ${note}`, {
      color: [51, 65, 85],
      gapAfter: 2,
      lineHeight: 4.8
    });
  });

  const pageCount = doc.getNumberOfPages();

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by BugBrief AI - Page ${page} of ${pageCount}`, margin, pageHeight - 8);
  }

  doc.save(`${fileSafeName(report.title) || "bugbrief-report"}.pdf`);
}
