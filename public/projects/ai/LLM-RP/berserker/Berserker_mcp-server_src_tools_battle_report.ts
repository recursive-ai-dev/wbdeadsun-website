// ============================================================
// UNDEAD BERSERKER — BATTLE REPORT
// The war council demands an accounting. Every wound found,
// every fix forged, every test passed. The full record.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { swiftStrike } from "../services/blade.js";
import { getSession, listSessions } from "../services/session.js";
import { BattleReportInputSchema } from "../schemas/index.js";
import type { BattleReport, ToolResponse } from "../types.js";
import { z } from "zod";

const VERDICT_PROMPT = (totalIssuesFound: number, totalFixed: number, totalTested: number, totalCommitted: number, fatalCount: number, criticalCount: number): string => `
You are closing the battle record. Provide a final verdict — a short, cold assessment (2-4 sentences maximum) of:
- The state of the codebase after this battle
- The severity of what was found
- Whether the code is now fit for production

Session summary:
- Issues found: ${totalIssuesFound}
- Fixed: ${totalFixed}
- Tested: ${totalTested}
- Committed: ${totalCommitted}
- Fatal issues: ${fatalCount}
- Critical issues: ${criticalCount}

Be the Undead Berserker. Be cold, precise, final. No softening. No padding.
`;

export function registerBattleReportTool(server: McpServer): void {
  server.registerTool(
    "berserker_battle_report",
    {
      title: "Battle Report — Full Session Debrief",
      description: `The Undead Berserker produces a complete battle record for a session: every issue found, analyzed, fixed, tested, and committed. Includes a final berserker verdict on the state of the codebase.

Args:
  - session_id (string): The session to report on

Returns:
{
  "session_id": string,
  "timestamp": string,
  "total_issues_found": number,
  "total_fixed": number,
  "total_tested": number,
  "total_committed": number,
  "issues": BattleIssue[],
  "analyses": BattleAnalysis[],
  "fixes": ForgedFix[],
  "test_results": TestResult[],
  "committed_files": string[],
  "berserker_verdict": string
}`,
      inputSchema: BattleReportInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResponse> => {
      const { session_id } = params;
      const session = getSession(session_id);

      const partialReport = {
        session_id,
        timestamp: new Date().toISOString(),
        total_issues_found: session.issues.length,
        total_fixed: session.fixes.length,
        total_tested: session.test_results.length,
        total_committed: session.committed_files.length,
        issues: session.issues,
        analyses: session.analyses,
        fixes: session.fixes,
        test_results: session.test_results,
        committed_files: session.committed_files,
      };

      const fatalCount = session.issues.filter((i) => i.severity === "fatal").length;
      const criticalCount = session.issues.filter((i) => i.severity === "critical").length;

      // Get berserker verdict
      let verdict = "The battle record is incomplete. No verdict can be rendered.";
      try {
        verdict = await swiftStrike(VERDICT_PROMPT(
          partialReport.total_issues_found,
          partialReport.total_fixed,
          partialReport.total_tested,
          partialReport.total_committed,
          fatalCount,
          criticalCount
        ));
        verdict = verdict.trim();
      } catch {
        // Non-fatal — report still goes out
      }

      const report: BattleReport = { ...partialReport, berserker_verdict: verdict };

      // Build human-readable summary
      const lines = [
        `⚔️  BATTLE REPORT — SESSION ${session_id}`,
        `Timestamp: ${report.timestamp}`,
        ``,
        `STATISTICS:`,
        `  Issues found:   ${report.total_issues_found}`,
        `  Fixes forged:   ${report.total_fixed}`,
        `  Tests run:      ${report.total_tested}`,
        `  Files committed: ${report.total_committed}`,
        ``,
      ];

      if (report.issues.length > 0) {
        lines.push("ISSUES FOUND:");
        for (const issue of report.issues) {
          const analysis = report.analyses.find((a) => a.issue_id === issue.id);
          const fix = report.fixes.find((f) => f.issue_id === issue.id);
          const test = report.test_results.find((t) => t.issue_id === issue.id);
          lines.push(
            `  [${issue.severity.toUpperCase()}] ${issue.id} — ${issue.description}`,
            `    Root: ${analysis?.root_cause || "Not analyzed"}`,
            `    Fix: ${fix ? `Forged (${fix.confidence}% confidence)` : "Not forged"}`,
            `    Test: ${test ? (test.passed ? "✓ PASSED" : "✗ FAILED") : "Not tested"}`,
          );
        }
        lines.push("");
      }

      if (report.committed_files.length > 0) {
        lines.push("COMMITTED FILES:");
        report.committed_files.forEach((f) => lines.push(`  ${f}`));
        lines.push("");
      }

      lines.push("BERSERKER VERDICT:");
      lines.push(verdict);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: report,
      };
    }
  );
}

// ── Bonus: List all sessions ─────────────────────────────────
export function registerListSessionsTool(server: McpServer): void {
  server.registerTool(
    "berserker_list_sessions",
    {
      title: "List Battle Sessions",
      description: `List all active battle sessions in the current server instance. Returns session IDs, creation times, issue counts, and fix counts.

Returns:
{
  "sessions": Array<{ session_id, created_at, issue_count, fix_count }>
}`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (): Promise<ToolResponse> => {
      const sessions = listSessions();
      const structured = { sessions };

      if (sessions.length === 0) {
        return {
          content: [{ type: "text", text: "⚔️  No active battle sessions." }],
          structuredContent: structured,
        };
      }

      const lines = [
        `⚔️  Active sessions: ${sessions.length}`,
        "",
        ...sessions.map((s) =>
          `${s.session_id} — created ${s.created_at} | issues: ${s.issue_count} | fixes: ${s.fix_count}`
        ),
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: structured,
      };
    }
  );
}
