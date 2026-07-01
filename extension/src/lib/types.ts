export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface CapturedPageContext {
  url: string;
  pageTitle: string;
  timestamp: string;
  browser: string;
  screenshotDataUrl: string;
}

export interface BugReportRequest {
  url: string;
  pageTitle: string;
  timestamp: string;
  browser: string;
  screenshotBase64: string;
  userGoal: string;
  actualProblem: string;
  extraNotes?: string;
}

export interface BugReportResponse {
  title: string;
  summary: string;
  environment: {
    url: string;
    pageTitle: string;
    browser: string;
    timestamp: string;
  };
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: Severity;
  evidence: string;
  suggestedLabels: string[];
  notesAssumptions: string[];
  markdown: string;
}

export interface BugReportFormValues {
  userGoal: string;
  actualProblem: string;
  extraNotes: string;
}

export interface ReportHistoryItem {
  id: string;
  createdAt: string;
  pageContext: CapturedPageContext;
  userInput: BugReportFormValues;
  report: BugReportResponse;
}
