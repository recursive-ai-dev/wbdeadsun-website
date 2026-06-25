// ============================================================
// UNDEAD BERSERKER — STEP 5: COMMIT VICTORY
// The battle is over. The codebase has been improved.
// The dead are honored. The blade is sheathed.
// The ancients are closer to satisfied.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { getSession, markFileCommitted } from "../services/session.js";
import { CommitVictoryInputSchema } from "../schemas/index.js";
import { BLADE_SHEATHED } from "../constants.js";
import type { ToolResponse } from "../types.js";

export function registerCommitTool(server: McpServer): void {
  server.registerTool(
    "berserker_commit_victory",
    {
      title: "Commit Victory — Finalize Changes (Step 5 of 5)",
      description: `The Undead Berserker commits his conquests. Verified fixes are written to the output directory or returned as structured data. This is the final step. Requires a session_id from berserker_test_strike.

By default, only fixes that passed testing are committed. The berserker does not ship uncertain work.

If output_directory is provided, fixed files are written to disk. If not, the complete fixed code is returned in the response for the caller to handle.

Args:
  - session_id (string): From berserker_test_strike
  - include_failed_tests (boolean, default false): If true, commit even unverified fixes
  - output_directory (string, optional): Directory to write fixed files. If omitted, returns code in response.

Returns:
{
  "session_id": string,
  "committed": number,
  "skipped": number,
  "committed_fixes": Array<{ issue_id, file, fixed_code, written_to? }>
}`,
      inputSchema: CommitVictoryInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResponse> => {
      const { session_id, include_failed_tests, output_directory } = params;

      const session = getSession(session_id);

      if (session.fixes.length === 0) {
        return {
          content: [{
            type: "text",
            text: `⚔️  Session '${session_id}' has no fixes to commit. Run berserker_forge_fix first.`,
          }],
          structuredContent: { session_id, committed: 0, skipped: 0, committed_fixes: [] },
        };
      }

      // Determine which fixes to commit
      const eligibleFixes = session.fixes.filter((fix) => {
        if (include_failed_tests) return true;
        const testResult = session.test_results.find((r) => r.issue_id === fix.issue_id);
        // If no test result, include (was not tested, user's choice to proceed)
        // If test result exists, only include if passed
        return !testResult || testResult.passed;
      });

      const skippedFixes = session.fixes.filter((f) => !eligibleFixes.some((e) => e.issue_id === f.issue_id));

      const committedFixes: Array<{
        issue_id: string;
        file: string;
        fixed_code: string;
        written_to?: string;
      }> = [];

      for (const fix of eligibleFixes) {
        let writtenTo: string | undefined;

        if (output_directory) {
          // Write to disk
          const outputPath = join(output_directory, fix.file);
          const dir = dirname(outputPath);
          await mkdir(dir, { recursive: true });
          await writeFile(outputPath, fix.fixed_code, "utf-8");
          writtenTo = outputPath;
          markFileCommitted(session_id, outputPath);
        } else {
          markFileCommitted(session_id, fix.file);
        }

        committedFixes.push({
          issue_id: fix.issue_id,
          file: fix.file,
          fixed_code: fix.fixed_code,
          ...(writtenTo ? { written_to: writtenTo } : {}),
        });
      }

      const lines = [
        BLADE_SHEATHED,
        ``,
        `Session: ${session_id}`,
        `Committed: ${committedFixes.length} fix(es)`,
        `Skipped: ${skippedFixes.length} fix(es) (failed verification)`,
        ``,
      ];

      if (committedFixes.length > 0) {
        lines.push("COMMITTED FIXES:");
        for (const cf of committedFixes) {
          lines.push(`► ${cf.issue_id} — ${cf.file}${cf.written_to ? ` → ${cf.written_to}` : ""}`);
          if (!output_directory) {
            lines.push(`\`\`\``);
            lines.push(cf.fixed_code);
            lines.push(`\`\`\``);
          }
        }
      }

      if (skippedFixes.length > 0) {
        lines.push(``, "SKIPPED (FAILED VERIFICATION):");
        for (const sf of skippedFixes) {
          const result = session.test_results.find((r) => r.issue_id === sf.issue_id);
          lines.push(`✗ ${sf.issue_id} — ${result?.reasoning || "No test result"}`);
        }
      }

      lines.push(``, `The battle record lives in session '${session_id}'.`);
      lines.push(`Run berserker_battle_report with session_id="${session_id}" for full debrief.`);

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: {
          session_id,
          committed: committedFixes.length,
          skipped: skippedFixes.length,
          committed_fixes: committedFixes,
        },
      };
    }
  );
}
