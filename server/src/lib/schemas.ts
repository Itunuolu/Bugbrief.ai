import { z } from "zod";

export const SeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);

export const GenerateBugReportRequestSchema = z
  .object({
    url: z.string().min(1),
    pageTitle: z.string(),
    timestamp: z.string().min(1),
    browser: z.string().min(1),
    screenshotBase64: z.string().min(20),
    userGoal: z.string().min(3),
    actualProblem: z.string().min(3),
    extraNotes: z.string().optional().default("")
  })
  .strict();

export const BugReportContentSchema = z
  .object({
    title: z.string().min(3),
    summary: z.string().min(3),
    environment: z.object({
      url: z.string().min(1),
      pageTitle: z.string(),
      browser: z.string().min(1),
      timestamp: z.string().min(1)
    }),
    stepsToReproduce: z.array(z.string().min(1)).min(1),
    expectedResult: z.string().min(3),
    actualResult: z.string().min(3),
    severity: SeveritySchema,
    evidence: z.string().min(3),
    suggestedLabels: z.array(z.string().min(1)).min(1),
    notesAssumptions: z.array(z.string().min(1)).default([])
  })
  .strict();

export const GenerateBugReportResponseSchema = BugReportContentSchema.extend({
  markdown: z.string().min(3)
}).strict();

export type GenerateBugReportRequest = z.infer<
  typeof GenerateBugReportRequestSchema
>;
export type BugReportContent = z.infer<typeof BugReportContentSchema>;
export type GenerateBugReportResponse = z.infer<
  typeof GenerateBugReportResponseSchema
>;
export type Severity = z.infer<typeof SeveritySchema>;
