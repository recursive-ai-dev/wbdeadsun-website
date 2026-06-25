// ============================================================
// UNDEAD BERSERKER — STEP 4: TEST THE STRIKE
// The blade is cleaned. The work is examined.
// A berserker who does not verify his kills is a berserker
// who will face the same enemy again.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { swiftStrike, parseBladeJson } from "../services/blade.js";
import { getSession, addTestResultsToSession } from "../services/session.js";
import { TestStrikeInputSchema } from "../schemas/index.js";
import type { ForgedFix, BattleIssue, TestResult, ToolResponse } from "../types.js";

const TEST_PROMPT = (fixes: ForgedFix[], issues: BattleIssue[]): string => `
You are verifying that forged fixes correctly resolve the original issues.

For each fix, you must:
1. Confirm the fix actually addresses the root cause of the issue
2. Check that the fixed code does not introduce new bugs
3. Identify edge cases that should be handled
4. Warn about any remaining concerns

ORIGINAL ISSUES:
${JSON.stringify(issues, null, 2)}

FORGED FIXES:
${JSON.stringify(fixes, null, 2)}

For each fix, produce a verification object:
{
  "issue_id": "<the issue ID>",
  "passed": <true if the fix is correct and production-ready, false if it has problems>,
  "reasoning": "<your complete reasoning for the pass/fail verdict>",
  "edge_cases_checked": ["<edge case 1>", "<edge case 2>"],
  "warnings": ["<any warning or concern about the fix that doesn't cause a fail>"]
}

Return ONLY the JSON array. No preamble, no markdown outside the JSON.

Be strict. A fix that masks a problem, introduces a new problem, or is incomplete should FAIL.
The berserker's honor depends on shipping correct code.
`;

export function registerTestTool(server: McpServer): void {
  server.registerTool(
    "berserker_test_strike",
    {
      title: "Test Strike — Verify the Fix (Step 4 of 5)",
      description: `The Undead Berserker examines his work with cold precision. Forged fixes are verified for correctness, completeness, and absence of new issues. This is Step 4. Requires a session_id from berserker_forge_fix.

Each fix is evaluated against the original issue to confirm the root cause is resolved. Edge cases are identified. Any fix that is incomplete, incorrect, or introduces new problems will fail.

Args:
  - session_id (string): From berserker_forge_fix
  - issue_ids (string[], optional): Specific fix IDs to test. Omit to test all.

Returns:
{
  "session_id": string,
  "passed": number,
  "failed": number,
  "results": TestResult[]
}

Where TestResult contains: issue_id, passed, reasoning, edge_cases_checked, warnings`,
      inputSchema: TestStrikeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResponse> => {
      const { session_id, issue_ids } = params;

      const session = getSession(session_id);

      if (session.fixes.length === 0) {
        return {
          content: [{
            type: "text",
            text: `⚔️  Session '${session_id}' has no forged fixes to test. Run berserker_forge_fix first.`,
          }],
          structuredContent: { session_id, passed: 0, failed: 0, results: [] },
        };
      }

      // Filter to requested fixes
      const targetFixes = issue_ids
        ? session.fixes.filter((f) => issue_ids.includes(f.issue_id))
        : session.fixes;

      if (targetFixes.length === 0) {
        const available = session.fixes.map((f) => f.issue_id).join(", ");
        throw new Error(
          `None of the requested issue IDs have forged fixes. ` +
          `Available fix IDs: ${available}`
        );
      }

      // Get corresponding original issues
      const correspondingIssues = session.issues.filter((i) =>
        targetFixes.some((f) => f.issue_id === i.id)
      );

      const raw = await swiftStrike(TEST_PROMPT(targetFixes, correspondingIssues));
      const results = parseBladeJson<TestResult[]>(raw, "test");

      // Validate
      const validatedResults: TestResult[] = results.map((r) => ({
        issue_id: r.issue_id,
        passed: Boolean(r.passed),
        reasoning: r.reasoning || "No reasoning provided",
        edge_cases_checked: Array.isArray(r.edge_cases_checked) ? r.edge_cases_checked : [],
        warnings: Array.isArray(r.warnings) ? r.warnings : [],
      }));

      addTestResultsToSession(session_id, validatedResults);

      const passed = validatedResults.filter((r) => r.passed).length;
      const failed = validatedResults.length - passed;

      const summary = [
        `⚔️  Strike verification complete.`,
        `Session: ${session_id}`,
        `Passed: ${passed} / ${validatedResults.length}`,
        failed > 0 ? `FAILED: ${failed} fix(es) did not pass verification.` : `All fixes verified. The ancients approve.`,
        ``,
        ...validatedResults.map((r) => [
          `${r.passed ? "✓" : "✗"} ${r.issue_id}`,
          `  ${r.reasoning}`,
          r.warnings.length > 0 ? `  Warnings: ${r.warnings.join("; ")}` : "",
          r.edge_cases_checked.length > 0 ? `  Edge cases: ${r.edge_cases_checked.join("; ")}` : "",
        ].filter(Boolean).join("\n")),
        ``,
        `Next step: berserker_commit_victory with session_id="${session_id}"`,
      ].join("\n");

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { session_id, passed, failed, results: validatedResults },
      };
    }
  );
}
