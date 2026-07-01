import { Router } from "express";
import { generateReport } from "../lib/aiClient.js";
import {
  GenerateBugReportRequestSchema,
  GenerateBugReportResponseSchema
} from "../lib/schemas.js";

export const generateBugReportRouter = Router();

generateBugReportRouter.post("/", async (request, response, next) => {
  const parsedRequest = GenerateBugReportRequestSchema.safeParse(request.body);

  if (!parsedRequest.success) {
    response.status(400).json({
      error: "Invalid bug report request payload.",
      details: parsedRequest.error.flatten()
    });
    return;
  }

  try {
    const report = await generateReport(parsedRequest.data);
    const parsedResponse = GenerateBugReportResponseSchema.parse(report);
    response.json(parsedResponse);
  } catch (error) {
    next(error);
  }
});
