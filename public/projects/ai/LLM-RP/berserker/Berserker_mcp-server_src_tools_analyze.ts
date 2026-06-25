// ============================================================
// UNDEAD BERSERKER — STEP 2: ANALYZE
// The blade is held still. Centuries of experience flood
// through the ancient mind. Root causes are laid bare.
// This is where elder magic ignites.
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { elderStrike, swiftStrike, parseBladeJson } from "../services/blade.js";
import { getSession, getIssuesForAnalysis, addAnalysesToSession } from "../services/session.js";
import { AnalyzeInputSchema } from "../schemas/index.js";
import type { BattleIssue, BattleAnalysis, ToolResponse } from "../types.js";

const ANALYZE_PROMPT = (issues: BattleIssue[]): string => `
You are performing deep root-cause analysis on the following battle-identified issues.

For each issue, you must determine:
1. The TRUE root cause (not just the symptom)
2. The full impact on the system
3. Your reasoning for the severity rating
4. A concrete fix strategy
5. The estimated complexity to fix
6. Any chain effects that fixing this might trigger

ISSUES TO ANALYZE:
${JSON.stringify(issues, null, 2)}

Return a JSON array of analysis objects. One per issue. Schema:
{
  "issue_id": "<matches the issue id above>",
  "root_cause": "<the fundamental reason this bug exists — not just what it does, but why it's there>",
  "impact": "<concrete description of how this breaks the system — what fails, when, under what conditions>",
  "severity_reasoning": "<your reasoning for the severity classification>",
  "fix_strategy": "<a clear, actionable strategy for fixing this issue — specific, not vague>",
  "estimated_complexity": "trivial" | "low" | "medium" | "high" | "extreme",
  "chain_effects": ["<effect 1>", "<effect 2>"]
}

Return ONLY the JSON array. No preamble, no explanation, no markdown outside the JSON.
`;

export function registerAnalyzeTool(server: McpServer): void {
  server.registerTool(
    "berserker_analyze_issues",
    {
      title: "Analyze Issues — Elder Magic (Step 2 of 5)",
      description: `The Undead Berserker channels centuries of experience into deep root-cause analysis. This is Step 2. Requires a session_id from berserker_scan_codebase.

When 'elder_magic' depth is selected, extended thinking is enabled — the berserker's ancient reasoning processes each issue with maximum cognitive depth, identifying root causes that surface analysis would miss.

Root causes, chain effects, fix strategies, and complexity estimates are all produced for each issue.

Args:
  - session_id (string): From berserker_scan_codebase
  - issue_ids (string[], optional): Specific issues to analyze. Omit to analyze all.
  - depth ('standard' | 'elder_magic'): elder_magic uses extended thinking (recommended for critical issues)

Returns:
{
  "session_id": string,
  "analyses": BattleAnalysis[]
}

Where BattleAnalysis contains: issue_id, root_cause, impact, severity_reasoning, fix_strategy, estimated_complexity, chain_effects`,
      inputSchema: AnalyzeInputSchema,
      annotations: {
        readOnlyHint: true,
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
            text: `⚔️  Session '${session_id}' contains no issues to analyze. Run berserker_scan_codebase first.`,
          }],
          structuredContent: { session_id, analyses: [] },
        };
      }

      const issuesToAnalyze = getIssuesForAnalysis(session, issue_ids);

      // Choose strike type based on depth
      const strikeFunc = depth === "elder_magic" ? elderStrike : swiftStrike;
      const elderContext = depth === "elder_magic"
        ? "ELDER MAGIC IS ACTIVE. Your extended reasoning capabilities are fully engaged. Think through each issue with maximum depth. Consider all possible root causes before settling on the true one. Consider all chain effects. Do not rush."
        : undefined;

      const raw = await strikeFunc(ANALYZE_PROMPT(issuesToAnalyze), elderContext);
      const analyses = parseBladeJson<BattleAnalysis[]>(raw, "analyze");

      // Validate
      const validatedAnalyses: BattleAnalysis[] = analyses.map((a) => ({
        issue_id: a.issue_id,
        root_cause: a.root_cause || "Unknown root cause",
        impact: a.impact || "Unknown impact",
        severity_reasoning: a.severity_reasoning || "Not provided",
        fix_strategy: a.fix_strategy || "No strategy provided",
        estimated_complexity: (["trivial", "low", "medium", "high", "extreme"].includes(a.estimated_complexity)
          ? a.estimated_complexity
          : "medium") as BattleAnalysis["estimated_complexity"],
        chain_effects: Array.isArray(a.chain_effects) ? a.chain_effects : [],
      }));

      addAnalysesToSession(session_id, validatedAnalyses);

      const magicLabel = depth === "elder_magic" ? "⚡ ELDER MAGIC" : "⚔️  STANDARD";
      const summary = [
        `${magicLabel} — Analysis complete for ${validatedAnalyses.length} issue(s).`,
        `Session: ${session_id}`,
        ``,
        ...validatedAnalyses.map((a) => [
          `► ${a.issue_id} [${a.estimated_complexity.toUpperCase()}]`,
          `  Root: ${a.root_cause}`,
          `  Impact: ${a.impact}`,
          `  Fix: ${a.fix_strategy}`,
          a.chain_effects.length > 0 ? `  Chain effects: ${a.chain_effects.join("; ")}` : "",
        ].filter(Boolean).join("\n")),
        ``,
        `Next step: berserker_forge_fix with session_id="${session_id}"`,
      ].join("\n");

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { session_id, analyses: validatedAnalyses },
      };
    }
  );
}
