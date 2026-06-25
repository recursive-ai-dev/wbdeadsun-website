// ============================================================
// UNDEAD BERSERKER — STEP 1: SCAN
// The blade is raised. The codebase is surveyed.
// Issues are catalogued with the precision of a warrior
// who has seen the same wounds across centuries.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { swiftStrike, parseBladeJson } from "../services/blade.js";
import { createSession, addIssuesToSession } from "../services/session.js";
import { ScanInputSchema } from "../schemas/index.js";
import { BLADE_DRAWN } from "../constants.js";
import type { BattleIssue, ToolResponse } from "../types.js";

const SCAN_PROMPT = (code: string, filename: string, context?: string): string => `
${BLADE_DRAWN}

You are scanning the following file for broken logic, implementation errors, and quality issues.

FILE: ${filename}
${context ? `CONTEXT: ${context}` : ""}

CODE:
\`\`\`
${code}
\`\`\`

Identify ALL issues in this code. For each issue, produce a JSON object matching this schema exactly.
Return a JSON array of issues. If there are no issues, return an empty array [].

Issue schema:
{
  "id": "issue_<sequential_number>",
  "file": "${filename}",
  "line_start": <integer, 1-based>,
  "line_end": <integer, 1-based>,
  "severity": "fatal" | "critical" | "major" | "minor",
  "category": "logic_error" | "type_error" | "null_dereference" | "dead_code" | "race_condition" | "security" | "performance" | "poor_impl",
  "description": "<concise description of the issue>",
  "code_snippet": "<the exact problematic code, verbatim>"
}

Severity definitions:
- fatal: Will cause a crash, data corruption, or complete system failure
- critical: Will cause incorrect behavior in production, data loss, or security breach
- major: Significant logic errors, poor implementation that will cause bugs under real conditions  
- minor: Code quality issues, dead code, minor inefficiencies

Return ONLY the JSON array. No preamble, no explanation, no markdown outside the JSON.
`;

export function registerScanTool(server: McpServer): void {
  server.registerTool(
    "berserker_scan_codebase",
    {
      title: "Scan Codebase (Step 1 of 5)",
      description: `The Undead Berserker raises his blade and scans the code for broken logic, implementation errors, and vulnerabilities. This is Step 1 of the 5-step battle sequence.

The berserker will identify every issue in the provided code — logic errors, null dereferences, race conditions, security flaws, poor implementations — and return them as a structured list with severity ratings and precise locations.

Returns a session_id that is required for all subsequent steps (analyze, forge fix, test, commit).

Args:
  - code (string): Source code to scan (max 100,000 characters)
  - filename (string): Filename with extension (determines language context)
  - context (string, optional): What this code is supposed to do; known symptoms
  - session_id (string, optional): Attach to an existing session

Returns:
{
  "session_id": string,
  "issues_found": number,
  "issues": BattleIssue[]
}

Where BattleIssue contains: id, file, line_start, line_end, severity, category, description, code_snippet`,
      inputSchema: ScanInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResponse> => {
      const { code, filename, context, session_id: existingSessionId } = params;

      // Create or reuse session
      let sessionId: string;
      if (existingSessionId) {
        // Verify it exists (will throw if not)
        const { getSession } = await import("../services/session.js");
        getSession(existingSessionId);
        sessionId = existingSessionId;
      } else {
        const session = createSession();
        sessionId = session.session_id;
      }

      // Strike with the blade
      const raw = await swiftStrike(SCAN_PROMPT(code, filename, context));
      const issues = parseBladeJson<BattleIssue[]>(raw, "scan");

      // Validate and normalize
      const validatedIssues: BattleIssue[] = issues.map((issue, idx) => ({
        id: issue.id || `issue_${idx + 1}`,
        file: issue.file || filename,
        line_start: Number(issue.line_start) || 1,
        line_end: Number(issue.line_end) || Number(issue.line_start) || 1,
        severity: (["fatal", "critical", "major", "minor"].includes(issue.severity)
          ? issue.severity
          : "major") as BattleIssue["severity"],
        category: (["logic_error", "type_error", "null_dereference", "dead_code", "race_condition", "security", "performance", "poor_impl"].includes(issue.category)
          ? issue.category
          : "poor_impl") as BattleIssue["category"],
        description: issue.description || "Unspecified issue",
        code_snippet: issue.code_snippet || "",
      }));

      // Store in session
      addIssuesToSession(sessionId, validatedIssues);

      const structured = {
        session_id: sessionId,
        issues_found: validatedIssues.length,
        issues: validatedIssues,
      };

      const severityCounts = validatedIssues.reduce(
        (acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; },
        {} as Record<string, number>
      );

      const summary = validatedIssues.length === 0
        ? `⚔️  The blade finds no wounds. The code stands without flaw.`
        : [
            `⚔️  The scan is complete. ${validatedIssues.length} wound(s) found in ${filename}.`,
            `Severity: fatal=${severityCounts.fatal || 0}, critical=${severityCounts.critical || 0}, major=${severityCounts.major || 0}, minor=${severityCounts.minor || 0}`,
            `Session ID: ${sessionId}`,
            ``,
            ...validatedIssues.map((i) =>
              `[${i.severity.toUpperCase()}] ${i.id} — Line ${i.line_start}–${i.line_end}: ${i.description}`
            ),
            ``,
            `Next step: berserker_analyze_issues with session_id="${sessionId}"`,
          ].join("\n");

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: structured,
      };
    }
  );
}
