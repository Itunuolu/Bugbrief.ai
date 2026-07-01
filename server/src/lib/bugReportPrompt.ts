import type {
  BugReportContent,
  GenerateBugReportRequest
} from "./schemas.js";

export function buildBugReportPrompt(input: GenerateBugReportRequest) {
  return `You generate practical, developer-ready bug reports from provided browser context.

Rules:
- Do not invent facts.
- Do not invent technical implementation details.
- Use only the provided screenshot, URL, page title, timestamp, browser, and user notes.
- If steps are inferred, mark them as "Likely steps — needs confirmation."
- Severity options: Critical, High, Medium, Low.
- Critical means data loss, security issue, financial loss, or total outage.
- High means a major user/business flow is blocked.
- Medium means a feature is partially broken.
- Low means minor UI/content issue.
- Output must be practical for developers.

Return only valid JSON. Do not include Markdown or code fences.

JSON shape:
{
  "title": "Short bug title",
  "summary": "Concise summary",
  "environment": {
    "url": "${input.url}",
    "pageTitle": "${input.pageTitle}",
    "browser": "${input.browser}",
    "timestamp": "${input.timestamp}"
  },
  "stepsToReproduce": ["Likely steps — needs confirmation.", "..."],
  "expectedResult": "...",
  "actualResult": "...",
  "severity": "Critical | High | Medium | Low",
  "evidence": "Screenshot captured from the affected page.",
  "suggestedLabels": ["bug", "..."],
  "notesAssumptions": ["..."]
}

Provided context:
- URL: ${input.url}
- Page title: ${input.pageTitle}
- Browser: ${input.browser}
- Timestamp: ${input.timestamp}
- User goal: ${input.userGoal}
- Actual problem: ${input.actualProblem}
- Extra notes: ${input.extraNotes || "None provided"}
- Screenshot: attached as an image input.`;
}

export function renderBugReportMarkdown(report: BugReportContent) {
  return `# ${report.title}

## Summary
${report.summary}

## Environment
- URL: ${report.environment.url}
- Page title: ${report.environment.pageTitle}
- Browser: ${report.environment.browser}
- Timestamp: ${report.environment.timestamp}

## Steps to Reproduce
${report.stepsToReproduce.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Expected Result
${report.expectedResult}

## Actual Result
${report.actualResult}

## Severity
${report.severity}

## Evidence
${report.evidence}

## Suggested Labels
${report.suggestedLabels.join(", ")}

## Notes / Assumptions
${report.notesAssumptions.length > 0 ? report.notesAssumptions.map((note) => `- ${note}`).join("\n") : "- None provided."}
`;
}
