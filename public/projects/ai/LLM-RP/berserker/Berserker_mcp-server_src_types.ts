// ============================================================
// UNDEAD BERSERKER MCP SERVER — TYPE DEFINITIONS
// Centuries of battle, reduced to structure.
// ============================================================

export interface BattleIssue {
  id: string;
  file: string;
  line_start: number;
  line_end: number;
  severity: "fatal" | "critical" | "major" | "minor";
  category: "logic_error" | "type_error" | "null_dereference" | "dead_code" | "race_condition" | "security" | "performance" | "poor_impl";
  description: string;
  code_snippet: string;
}

export interface BattleAnalysis {
  issue_id: string;
  root_cause: string;
  impact: string;
  severity_reasoning: string;
  fix_strategy: string;
  estimated_complexity: "trivial" | "low" | "medium" | "high" | "extreme";
  chain_effects: string[];
}

export interface ForgedFix {
  issue_id: string;
  file: string;
  original_code: string;
  fixed_code: string;
  explanation: string;
  confidence: number; // 0-100
}

export interface TestResult {
  issue_id: string;
  passed: boolean;
  reasoning: string;
  edge_cases_checked: string[];
  warnings: string[];
}

export interface BattleReport {
  session_id: string;
  timestamp: string;
  total_issues_found: number;
  total_fixed: number;
  total_tested: number;
  total_committed: number;
  issues: BattleIssue[];
  analyses: BattleAnalysis[];
  fixes: ForgedFix[];
  test_results: TestResult[];
  committed_files: string[];
  berserker_verdict: string;
}

export interface BerserkerSession {
  session_id: string;
  created_at: string;
  issues: BattleIssue[];
  analyses: BattleAnalysis[];
  fixes: ForgedFix[];
  test_results: TestResult[];
  committed_files: string[];
}

export interface ElderMagicConfig {
  thinking_budget_tokens: number;
  max_output_tokens: number;
  model: string;
}

export type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structuredContent?: Record<string, any>;
};
