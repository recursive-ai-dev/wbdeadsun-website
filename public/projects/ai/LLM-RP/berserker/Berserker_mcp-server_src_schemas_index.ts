// ============================================================
// UNDEAD BERSERKER MCP SERVER — ZOD SCHEMAS
// The shape of what the berserker will accept. No more, no less.
// ============================================================

import { z } from "zod";

export const ScanInputSchema = z.object({
  code: z.string()
    .min(1, "Cannot scan empty code. The blade has nothing to strike.")
    .max(100_000, "Code exceeds maximum input size of 100,000 characters.")
    .describe("The source code to scan for broken logic and implementation issues."),
  filename: z.string()
    .min(1, "A filename must be provided so the berserker knows which file he attacks.")
    .describe("The filename including extension (e.g., 'auth.ts', 'parser.py'). Used to determine language context."),
  context: z.string()
    .max(2000, "Context must not exceed 2,000 characters.")
    .optional()
    .describe("Optional surrounding context: what this code is supposed to do, known bugs, relevant system info."),
  session_id: z.string()
    .optional()
    .describe("Optional session ID to attach these scan results to an ongoing battle session."),
}).strict();

export const AnalyzeInputSchema = z.object({
  session_id: z.string()
    .min(1, "A session ID is required to pull battle intelligence from.")
    .describe("The session ID returned from berserker_scan_codebase."),
  issue_ids: z.array(z.string())
    .min(1, "At least one issue ID must be provided for analysis.")
    .max(20, "Cannot analyze more than 20 issues in a single strike.")
    .optional()
    .describe("Specific issue IDs to analyze. If omitted, all issues in the session are analyzed."),
  depth: z.enum(["standard", "elder_magic"])
    .default("elder_magic")
    .describe("'standard' for fast analysis, 'elder_magic' for deep reasoning with extended thinking (centuries of experience brought to bear)."),
}).strict();

export const ForgeFixInputSchema = z.object({
  session_id: z.string()
    .min(1, "A session ID is required.")
    .describe("The session ID from a previous scan and analysis."),
  issue_ids: z.array(z.string())
    .min(1, "At least one issue ID must be provided to forge a fix for.")
    .max(10, "Cannot forge fixes for more than 10 issues in one strike.")
    .optional()
    .describe("Specific issue IDs to forge fixes for. If omitted, fixes all analyzed issues in the session."),
  depth: z.enum(["standard", "elder_magic"])
    .default("elder_magic")
    .describe("'standard' for direct fix, 'elder_magic' enables extended thinking for complex logic reconstruction."),
}).strict();

export const TestStrikeInputSchema = z.object({
  session_id: z.string()
    .min(1, "A session ID is required.")
    .describe("The session ID containing forged fixes to verify."),
  issue_ids: z.array(z.string())
    .min(1, "At least one issue ID must be provided.")
    .max(10, "Cannot test more than 10 fixes in a single verification sweep.")
    .optional()
    .describe("Specific issue IDs to test. If omitted, tests all forged fixes in the session."),
}).strict();

export const CommitVictoryInputSchema = z.object({
  session_id: z.string()
    .min(1, "A session ID is required.")
    .describe("The session ID containing verified fixes to commit to the output."),
  include_failed_tests: z.boolean()
    .default(false)
    .describe("If true, commit fixes even if their tests did not pass. Default is false — the berserker does not commit uncertain work."),
  output_directory: z.string()
    .optional()
    .describe("Optional directory path to write fixed files. If omitted, returns the fixed code in the response."),
}).strict();

export const BattleReportInputSchema = z.object({
  session_id: z.string()
    .min(1, "A session ID is required.")
    .describe("The session ID to generate a full battle report for."),
}).strict();

export const DirectStrikeInputSchema = z.object({
  code: z.string()
    .min(1, "Cannot strike empty code.")
    .max(100_000, "Code exceeds maximum input size.")
    .describe("The source code to strike directly — scan, analyze, fix, and return in one motion."),
  filename: z.string()
    .min(1, "Filename is required.")
    .describe("The filename including extension."),
  context: z.string()
    .max(2000)
    .optional()
    .describe("Optional context about what this code should do."),
  depth: z.enum(["standard", "elder_magic"])
    .default("elder_magic")
    .describe("Reasoning depth. 'elder_magic' uses extended thinking for maximum precision."),
}).strict();

export type ScanInput = z.infer<typeof ScanInputSchema>;
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;
export type ForgeFixInput = z.infer<typeof ForgeFixInputSchema>;
export type TestStrikeInput = z.infer<typeof TestStrikeInputSchema>;
export type CommitVictoryInput = z.infer<typeof CommitVictoryInputSchema>;
export type BattleReportInput = z.infer<typeof BattleReportInputSchema>;
export type DirectStrikeInput = z.infer<typeof DirectStrikeInputSchema>;
