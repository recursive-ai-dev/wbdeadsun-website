// ============================================================
// UNDEAD BERSERKER — DIRECT STRIKE
// When the berserker does not have time for ceremony.
// Scan, analyze, forge, test — one motion, one devastating blow.
// The full blade sequence compressed into a single strike.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { elderStrike, swiftStrike, parseBladeJson } from "../services/blade.js";
import { createSession, addIssuesToSession, addAnalysesToSession, addFixesToSession, addTestResultsToSession } from "../services/session.js";
import { DirectStrikeInputSchema } from "../schemas/index.js";
import type { BattleIssue, BattleAnalysis, ForgedFix, TestResult, ToolResponse } from "../types.js";

interface DirectStrikeResult {
  session_id: string;
  issues: BattleIssue[];
  analyses: BattleAnalysis[];
  fixes: ForgedFix[];
  test_results: TestResult[];
}

const DIRECT_STRIKE_PROMPT = (code: string, filename: string, context?: string): string => `
${context ? `CONTEXT: ${context}\n` : ""}
FILE: ${filename}
CODE:
\`\`\`
${code}
\`\`\`

In a single pass, you will:
1. Identify ALL issues in this code
2. Analyze root causes for each issue
3. Forge a complete, production-ready fix for each issue
4. Verify each fix is correct

Return a single JSON object with this exact structure:
{
  "issues": [
    {
      "id": "issue_1",
      "file": "${filename}",
      "line_start": <integer>,
      "line_end": <integer>,
      "severity": "fatal" | "critical" | "major" | "minor",
      "category": "logic_error" | "type_error" | "null_dereference" | "dead_code" | "race_condition" | "security" | "performance" | "poor_impl",
      "description": "<concise description>",
      "code_snippet": "<exact broken code>"
    }
  ],
  "analyses": [
    {
      "issue_id": "issue_1",
      "root_cause": "<the true root cause>",
      "impact": "<concrete impact on the system>",
      "severity_reasoning": "<why this severity>",
      "fix_strategy": "<specific fix approach>",
      "estimated_complexity": "trivial" | "low" | "medium" | "high" | "extreme",
      "chain_effects": ["<effect>"]
    }
  ],
  "fixes": [
    {
      "issue_id": "issue_1",
      "file": "${filename}",
      "original_code": "<exact broken code>",
      "fixed_code": "<complete production-ready replacement — NO placeholders>",
      "explanation": "<what was changed and why>",
      "confidence": <0-100>
    }
  ],
  "test_results": [
    {
      "issue_id": "issue_1",
      "passed": <true|false>,
      "reasoning": "<why the fix passes or fails verification>",
      "edge_cases_checked": ["<edge case>"],
      "warnings": ["<warning>"]
    }
  ]
}

If there are NO issues, return:
{ "issues": [], "analyses": [], "fixes": [], "test_results": [] }

CRITICAL LAW: fixed_code must be COMPLETE. No placeholders. No TODOs. No missing logic.
Return ONLY the JSON. No markdown outside the JSON.
`;

export function registerDirectStrikeTool(server: McpServer): void {
  server.registerTool(
    "berserker_direct_strike",
    {
      title: "Direct Strike — Full Battle Sequence in One Blow",
      description: `The Undead Berserker executes the complete battle sequence in a single motion: scan, analyze, forge fix, and verify — all in one devastatingly efficient strike.

Use this when you need immediate results without the ceremony of the 5-step sequence. Best for focused files where full context can be provided in one call.

With elder_magic depth, extended thinking is enabled across the entire sequence — the berserker brings centuries of reasoning to bear before responding.

Args:
  - code (string): Source code to strike (max 100,000 characters)
  - filename (string): Filename with extension
  - context (string, optional): What this code should do; known symptoms
  - depth ('standard' | 'elder_magic'): Reasoning depth

Returns:
{
  "session_id": string,
  "issues_found": number,
  "fixes_forged": number,
  "fixes_passed": number,
  "issues": BattleIssue[],
  "analyses": BattleAnalysis[],
  "fixes": ForgedFix[],
  "test_results": TestResult[]
}`,
      inputSchema: DirectStrikeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResponse> => {
      const { code, filename, context, depth } = params;

      const strikeFunc = depth === "elder_magic" ? elderStrike : swiftStrike;
      const elderContext = depth === "elder_magic"
        ? "ELDER MAGIC IS ACTIVE. Bring centuries of reasoning to this code. " +
          "Think deeply before committing to any issue identification, root cause, or fix. " +
          "Consider all paths, all edge cases, all failure modes. The code you produce must be worthy of the warriors of old."
        : undefined;

      const raw = await strikeFunc(DIRECT_STRIKE_PROMPT(code, filename, context), elderContext);
      const result = parseBladeJson<DirectStrikeResult>(raw, "direct_strike");

      // Build session from results
      const session = createSession();

      const validIssues: BattleIssue[] = (result.issues || []).map((i, idx) => ({
        id: i.id || `issue_${idx + 1}`,
        file: i.file || filename,
        line_start: Number(i.line_start) || 1,
        line_end: Number(i.line_end) || Number(i.line_start) || 1,
        severity: (["fatal", "critical", "major", "minor"].includes(i.severity) ? i.severity : "major") as BattleIssue["severity"],
        category: (["logic_error", "type_error", "null_dereference", "dead_code", "race_condition", "security", "performance", "poor_impl"].includes(i.category) ? i.category : "poor_impl") as BattleIssue["category"],
        description: i.description || "Unspecified",
        code_snippet: i.code_snippet || "",
      }));

      const validAnalyses: BattleAnalysis[] = (result.analyses || []).map((a) => ({
        issue_id: a.issue_id,
        root_cause: a.root_cause || "Unknown",
        impact: a.impact || "Unknown",
        severity_reasoning: a.severity_reasoning || "",
        fix_strategy: a.fix_strategy || "",
        estimated_complexity: (["trivial", "low", "medium", "high", "extreme"].includes(a.estimated_complexity) ? a.estimated_complexity : "medium") as BattleAnalysis["estimated_complexity"],
        chain_effects: Array.isArray(a.chain_effects) ? a.chain_effects : [],
      }));

      const validFixes: ForgedFix[] = (result.fixes || []).map((f) => ({
        issue_id: f.issue_id,
        file: f.file || filename,
        original_code: f.original_code || "",
        fixed_code: f.fixed_code || "",
        explanation: f.explanation || "",
        confidence: Math.min(100, Math.max(0, Number(f.confidence) || 0)),
      }));

      const validTests: TestResult[] = (result.test_results || []).map((r) => ({
        issue_id: r.issue_id,
        passed: Boolean(r.passed),
        reasoning: r.reasoning || "",
        edge_cases_checked: Array.isArray(r.edge_cases_checked) ? r.edge_cases_checked : [],
        warnings: Array.isArray(r.warnings) ? r.warnings : [],
      }));

      addIssuesToSession(session.session_id, validIssues);
      addAnalysesToSession(session.session_id, validAnalyses);
      addFixesToSession(session.session_id, validFixes);
      addTestResultsToSession(session.session_id, validTests);

      const passed = validTests.filter((t) => t.passed).length;
      const magicLabel = depth === "elder_magic" ? "⚡ ELDER MAGIC DIRECT STRIKE" : "⚔️  DIRECT STRIKE";

      const lines = [
        `${magicLabel} — ${filename}`,
        `Session: ${session.session_id}`,
        `Issues found: ${validIssues.length}`,
        `Fixes forged: ${validFixes.length}`,
        `Fixes passed: ${passed}/${validFixes.length}`,
        ``,
      ];

      if (validIssues.length === 0) {
        lines.push("⚔️  The code stands without flaw. The blade finds no wounds.");
      } else {
        for (const fix of validFixes) {
          const issue = validIssues.find((i) => i.id === fix.issue_id);
          const test = validTests.find((t) => t.issue_id === fix.issue_id);
          lines.push(
            `${test?.passed ? "✓" : "✗"} ${fix.issue_id} [${(issue?.severity || "?").toUpperCase()}] — ${fix.explanation}`,
            ``,
            "ORIGINAL:",
            "```",
            fix.original_code,
            "```",
            "FIXED:",
            "```",
            fix.fixed_code,
            "```",
            ""
          );
        }
      }

      lines.push(`Use berserker_commit_victory with session_id="${session.session_id}" to finalize.`);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: {
          session_id: session.session_id,
          issues_found: validIssues.length,
          fixes_forged: validFixes.length,
          fixes_passed: passed,
          issues: validIssues,
          analyses: validAnalyses,
          fixes: validFixes,
          test_results: validTests,
        },
      };
    }
  );
}
