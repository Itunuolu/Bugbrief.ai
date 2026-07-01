import type { Handler, HandlerEvent } from "@netlify/functions";
import { generateReport } from "../../../server/src/lib/aiClient.js";
import {
  GenerateBugReportRequestSchema,
  GenerateBugReportResponseSchema
} from "../../../server/src/lib/schemas.js";

const headers = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

function getRoutePath(event: HandlerEvent) {
  const rawPath = event.rawUrl
    ? new URL(event.rawUrl).pathname
    : event.path;

  const withoutFunctionPrefix = rawPath.replace(
    /^\/\.netlify\/functions\/api/,
    ""
  );

  return withoutFunctionPrefix || "/";
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: ""
    };
  }

  const routePath = getRoutePath(event);

  if (event.httpMethod === "GET" && routePath === "/health") {
    return json(200, {
      ok: true,
      service: "bugbrief-ai",
      runtime: "netlify-functions",
      mockMode: !process.env.AI_PROVIDER_API_KEY
    });
  }

  const isGenerateRoute =
    event.httpMethod === "POST" &&
    (routePath === "/generate-bug-report" ||
      routePath === "/api/generate-bug-report");

  if (!isGenerateRoute) {
    return json(404, {
      error: "Route not found."
    });
  }

  let body: unknown;

  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return json(400, {
      error: "Request body must be valid JSON."
    });
  }

  const parsedRequest = GenerateBugReportRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return json(400, {
      error: "Invalid bug report request payload.",
      details: parsedRequest.error.flatten()
    });
  }

  try {
    const report = await generateReport(parsedRequest.data);
    return json(200, GenerateBugReportResponseSchema.parse(report));
  } catch (error) {
    console.error(error);
    return json(500, {
      error: "Unexpected server error while generating the bug report."
    });
  }
};
