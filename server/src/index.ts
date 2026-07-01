import "dotenv/config";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { generateBugReportRouter } from "./routes/generateBugReport.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors({ origin: true }));
app.use(express.json({ limit: "20mb" }));

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "bugbrief-ai",
    mockMode: !process.env.AI_PROVIDER_API_KEY
  });
});

app.use("/api/generate-bug-report", generateBugReportRouter);

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: "Unexpected server error while generating the bug report."
  });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`BugBrief AI server listening on http://localhost:${port}`);
});
