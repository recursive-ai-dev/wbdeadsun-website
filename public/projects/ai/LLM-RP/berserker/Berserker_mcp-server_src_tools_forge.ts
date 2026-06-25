// ============================================================
// UNDEAD BERSERKER — STEP 3: FORGE THE FIX
// The blade descends. Broken code is cut away.
// In its place — code worthy of the warriors of old.
// No placeholders. No TODOs. No half-measures.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { elderStrike, swiftStrike, parseBladeJson } from "../services/blade.js";
import { getSession, getIssuesForAnalysis, addFixesToSession } from "../services/session.js";
import { ForgeFixInputSchema } from "../schemas/index.js";
import type { BattleIssue, BattleAnalysis, ForgedFix, ToolResponse } from "../types.js";

const FORGE_PROMPT = (
  issues: BattleIssue[],
  analyses: BattleAnalysis[]
): string => `
You are forging fixes for battle-identified and analyzed issues. Your fixes must be:
- COMPLETE: No placeholders, no TODOs, no mock data, no missing logic
- CORRECT: The fix must resolve the root cause, not just mask the symptom
- PRODUCTION-READY: Code that could be merged into a production codebase immediately
- SAFE: Must not introduce new issues or break adjacent logic

ISSUES:
${JSON.stringify(issues, null, 2)}

ANALYSES (root causes and strategies):
${JSON.stringify(analyses, null, 2)}

For each issue, produce a fix object matching this schema exactly:
{
  "issue_id": "<the issue ID being fixed>",
  "file": "<filename>",
  "original_code": "<the exact broken code snippet from the issue>",
  "fixed_code": "<the complete, production-ready replacement code — NO placeholders>",
  "explanation": "<brief but complete explanation of what was changed and why>",
  "confidence": <integer 0-100, your confidence that this fix fully resolves the issue>
}

Return ONLY the JSON array. No preamble, no markdown outside the JSON.

CRITICAL: The fixed_code must be the COMPLETE replacement — not a diff, not a partial, not pseudocode. If the fix requires adding imports or changing surrounding code, note this in explanation and make fixed_code a complete, self-contained unit that can be directly dropped in.
`;

export function registerForgeTool(server: McpServer): void {
  server.registerTool(
    "berserker_forge_fix",
    {
      title: "Forge Fix — Code-Blade Strike (Step 3 of 5)",
      description: `The Undead Berserker brings his code-blade down. Broken logic is severed and replaced with production-ready implementation. This is Step 3. Requires a session_id from berserker_analyze_issues.

Every fix is:
- Complete — no placeholders, no TODOs, no missing logic
- Correct — resolves root cause, not just symptom
- Production-ready — deployable immediately

Elder magic depth uses extended thinking for complex reconstructions where the fix requires understanding deep system interactions.

Args:
  - session_id (string): From berserker_analyze_issues
  - issue_ids (string[], optional): Specific issues to fix. Omit to fix all analyzed issues.
  - depth ('standard' | 'elder_magic'): elder_magic for complex logic reconstruction

Returns:
{
  "session_id": string,
  "fixes_forged": number,
  "fixes": ForgedFix[]
}

Where ForgedFix contains: issue_id, file, original_code, fixed_code, explanation, confidence`,
      inputSchema: ForgeFixInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (params): Promise<ToolResponse> => {
      const { session_id, issue_ids, depth } = params;

      const session = getSession(session_id);

      if (session.issues.length === 0) {
        return {
          content: [{
            type: "text",
            text: `⚔️  Session '${session_id}' contains no issues. Run berserker_scan_codebase first.`,
          }],
          structuredContent: { session_id, fixes_forged: 0, fixes: [] },
        };
      }

      // Determine which issues to fix
      const targetIssues = getIssuesForAnalysis(session, issue_ids);

      // Get matching analyses (for issues that have been analyzed)
      const analyses = session.analyses.filter((a) =>
        targetIssues.some((i) => i.id === a.issue_id)
      );

      // Warn about issues without analysis
      const unanalyzed = targetIssues.filter(
        (i) => !analyses.some((a) => a.issue_id === i.id)
      );
      if (unanalyzed.length > 0) {
        // We can still forge fixes without analysis, but warn
        console.error(
          `[BERSERKER] Warning: Forging fixes for ${unanalyzed.length} issue(s) without prior analysis. ` +
          `Consider running berserker_analyze_issues first for maximum precision.`
        );
      }

      const strikeFunc = depth === "elder_magic" ? elderStrike : swiftStrike;
      const elderContext = depth === "elder_magic"
        ? "ELDER MAGIC IS ACTIVE. You are forging code that must survive centuries of use. " +
          "Think deeply about each fix. Consider all edge cases. Consider what breaks if you change this. " +
          "The code you produce must be complete and production-ready. The ancients demand nothing less."
        : undefined;

      const raw = await strikeFunc(FORGE_PROMPT(targetIssues, analyses), elderContext);
      const fixes = parseBladeJson<ForgedFix[]>(raw, "forge");

      // Validate
      const validatedFixes: ForgedFix[] = fixes.map((f) => ({
        issue_id: f.issue_id,
        file: f.file || targetIssues.find((i) => i.id === f.issue_id)?.file || "unknown",
        original_code: f.original_code || "",
        fixed_code: f.fixed_code || "",
        explanation: f.explanation || "No explanation provided",
        confidence: Math.min(100, Math.max(0, Number(f.confidence) || 0)),
      }));

      addFixesToSession(session_id, validatedFixes);

      const avgConfidence = validatedFixes.length > 0
        ? Math.round(validatedFixes.reduce((s, f) => s + f.confidence, 0) / validatedFixes.length)
        : 0;

      const summary = [
        `⚔️  The blade has struck. ${validatedFixes.length} fix(es) forged.`,
        `Session: ${session_id}`,
        `Average confidence: ${avgConfidence}%`,
        ``,
        ...validatedFixes.map((f) => [
          `► ${f.issue_id} — ${f.file} [${f.confidence}% confidence]`,
          `  ${f.explanation}`,
        ].join("\n")),
        ``,
        `Next step: berserker_test_strike with session_id="${session_id}"`,
      ].join("\n");

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { session_id, fixes_forged: validatedFixes.length, fixes: validatedFixes },
      };
    }
  );
}
