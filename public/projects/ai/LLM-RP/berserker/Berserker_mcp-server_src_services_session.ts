// ============================================================
// UNDEAD BERSERKER MCP SERVER — SESSION SERVICE
// The berserker remembers his battles. State lives here.
// ============================================================

import { randomUUID } from "crypto";
import { SESSIONS } from "../constants.js";
import type { BerserkerSession, BattleIssue, BattleAnalysis, ForgedFix, TestResult } from "../types.js";

export function createSession(): BerserkerSession {
  const session: BerserkerSession = {
    session_id: randomUUID(),
    created_at: new Date().toISOString(),
    issues: [],
    analyses: [],
    fixes: [],
    test_results: [],
    committed_files: [],
  };
  SESSIONS.set(session.session_id, session);
  return session;
}

export function getSession(session_id: string): BerserkerSession {
  const session = SESSIONS.get(session_id);
  if (!session) {
    throw new Error(
      `No battle session found with ID '${session_id}'. ` +
      `Either the session expired or was never created. Run berserker_scan_codebase first.`
    );
  }
  return session;
}

export function addIssuesToSession(session_id: string, issues: BattleIssue[]): void {
  const session = getSession(session_id);
  // Avoid duplicates by ID
  const existingIds = new Set(session.issues.map((i) => i.id));
  const newIssues = issues.filter((i) => !existingIds.has(i.id));
  session.issues.push(...newIssues);
}

export function addAnalysesToSession(session_id: string, analyses: BattleAnalysis[]): void {
  const session = getSession(session_id);
  const existingIds = new Set(session.analyses.map((a) => a.issue_id));
  const newAnalyses = analyses.filter((a) => !existingIds.has(a.issue_id));
  session.analyses.push(...newAnalyses);
}

export function addFixesToSession(session_id: string, fixes: ForgedFix[]): void {
  const session = getSession(session_id);
  const existingIds = new Set(session.fixes.map((f) => f.issue_id));
  const newFixes = fixes.filter((f) => !existingIds.has(f.issue_id));
  session.fixes.push(...newFixes);
}

export function addTestResultsToSession(session_id: string, results: TestResult[]): void {
  const session = getSession(session_id);
  const existingIds = new Set(session.test_results.map((r) => r.issue_id));
  const newResults = results.filter((r) => !existingIds.has(r.issue_id));
  session.test_results.push(...newResults);
}

export function markFileCommitted(session_id: string, filepath: string): void {
  const session = getSession(session_id);
  if (!session.committed_files.includes(filepath)) {
    session.committed_files.push(filepath);
  }
}

export function getIssuesForAnalysis(session: BerserkerSession, issue_ids?: string[]): BattleIssue[] {
  if (!issue_ids || issue_ids.length === 0) {
    return session.issues;
  }
  const found = session.issues.filter((i) => issue_ids.includes(i.id));
  const missingIds = issue_ids.filter((id) => !session.issues.find((i) => i.id === id));
  if (missingIds.length > 0) {
    throw new Error(
      `The following issue IDs do not exist in session '${session.session_id}': ${missingIds.join(", ")}. ` +
      `Available IDs: ${session.issues.map((i) => i.id).join(", ")}`
    );
  }
  return found;
}

export function listSessions(): Array<{ session_id: string; created_at: string; issue_count: number; fix_count: number }> {
  return Array.from(SESSIONS.values()).map((s) => ({
    session_id: s.session_id,
    created_at: s.created_at,
    issue_count: s.issues.length,
    fix_count: s.fixes.length,
  }));
}
