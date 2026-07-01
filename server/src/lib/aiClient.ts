import {
  buildBugReportPrompt,
  renderBugReportMarkdown
} from "./bugReportPrompt.js";
import {
  BugReportContentSchema,
  GenerateBugReportResponseSchema,
  type BugReportContent,
  type GenerateBugReportRequest,
  type GenerateBugReportResponse,
  type Severity
} from "./schemas.js";

function trimSentence(value: string, fallback: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || fallback;
}

function inferSeverity(input: GenerateBugReportRequest): Severity {
  const combined = `${input.userGoal} ${input.actualProblem} ${input.extraNotes}`.toLowerCase();

  if (
    /\b(data loss|security|breach|payment charged|financial loss|outage|cannot access|lost data)\b/.test(
      combined
    )
  ) {
    return "Critical";
  }

  if (/\b(blocked|cannot complete|unable to submit|checkout|login|sign in|purchase)\b/.test(combined)) {
    return "High";
  }

  if (/\b(partial|sometimes|intermittent|wrong value|broken)\b/.test(combined)) {
    return "Medium";
  }

  return "Low";
}

function createMockReport(
  input: GenerateBugReportRequest
): GenerateBugReportResponse {
  const pageTitle = input.pageTitle || "Untitled page";
  const userGoal = trimSentence(input.userGoal, "complete the intended action");
  const actualProblem = trimSentence(
    input.actualProblem,
    "the page did not behave as expected"
  );
  const severity = inferSeverity(input);

  const content: BugReportContent = {
    title: `${pageTitle}: ${actualProblem.slice(0, 70)}`,
    summary: `While trying to ${userGoal}, the user observed that ${actualProblem}.`,
    environment: {
      url: input.url,
      pageTitle,
      browser: input.browser,
      timestamp: input.timestamp
    },
    stepsToReproduce: [
      "Likely steps — needs confirmation.",
      `Open ${input.url}.`,
      `Attempt to ${userGoal}.`,
      `Observe that ${actualProblem}.`
    ],
    expectedResult: `The user should be able to ${userGoal}.`,
    actualResult: actualProblem,
    severity,
    evidence: "Screenshot captured from the affected page.",
    suggestedLabels: ["bug", "needs-triage", severity.toLowerCase()],
    notesAssumptions: [
      "Generated in mock mode because AI_PROVIDER_API_KEY is not configured.",
      "Steps are inferred from user-provided notes and need confirmation.",
      input.extraNotes
        ? `Extra user notes: ${input.extraNotes}`
        : "No extra user notes were provided."
    ]
  };

  return GenerateBugReportResponseSchema.parse({
    ...content,
    markdown: renderBugReportMarkdown(content)
  });
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  return JSON.parse(withoutFence);
}

async function generateWithProvider(
  input: GenerateBugReportRequest
): Promise<GenerateBugReportResponse> {
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const baseUrl =
    process.env.AI_PROVIDER_BASE_URL ??
    "https://api.openai.com/v1/chat/completions";
  const model = process.env.AI_PROVIDER_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return createMockReport(input);
  }

  const prompt = buildBugReportPrompt(input);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const openRouterSiteUrl = process.env.OPENROUTER_SITE_URL;
  const openRouterAppTitle = process.env.OPENROUTER_APP_TITLE;
  const isOpenRouter = baseUrl.includes("openrouter.ai");

  if (isOpenRouter && openRouterSiteUrl) {
    headers["HTTP-Referer"] = openRouterSiteUrl;
  }

  if (isOpenRouter && openRouterAppTitle) {
    headers["X-OpenRouter-Title"] = openRouterAppTitle;
  }

  const providerResponse = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You produce concise, factual QA bug reports for software teams."
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${input.screenshotBase64}`
              }
            }
          ]
        }
      ]
    })
  });

  if (!providerResponse.ok) {
    const errorText = await providerResponse.text();
    throw new Error(
      `AI provider request failed with HTTP ${providerResponse.status}: ${errorText.slice(0, 300)}`
    );
  }

  const providerJson = (await providerResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = providerJson.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI provider returned an empty response.");
  }

  const rawReport = parseJsonContent(content);
  const parsedContent = BugReportContentSchema.parse({
    ...rawReport,
    environment: {
      url: input.url,
      pageTitle: input.pageTitle,
      browser: input.browser,
      timestamp: input.timestamp
    },
    evidence: "Screenshot captured from the affected page."
  });

  return GenerateBugReportResponseSchema.parse({
    ...parsedContent,
    markdown: renderBugReportMarkdown(parsedContent)
  });
}

export async function generateReport(input: GenerateBugReportRequest) {
  return generateWithProvider(input);
}
