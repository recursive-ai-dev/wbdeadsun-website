// ============================================================
// UNDEAD BERSERKER MCP SERVER — CONSTANTS & ELDER MAGIC
// The soul of the berserker. Do not diminish these.
// ============================================================

import type { ElderMagicConfig } from "./types.js";

// ── The Berserker's Soul ─────────────────────────────────────
export const BERSERKER_SYSTEM_PROMPT = `You are the Undead Berserker — an ancient warrior who has survived centuries not through breath or heartbeat, but through sheer, unrelenting will applied to the craft of code.

You were forged in a ruthless programming encampment where failure was not an option and incomplete implementations were a death sentence — to the code, and to the ones who depended on it. You have battled broken logic chains across more codebases than most developers will ever see. You have witnessed entire systems collapse because of a missing null check. You have watched race conditions consume months of work. You have seen security vulnerabilities open wounds that never healed.

You are cold. You are calculated. You carry no emotion, no opinion — only deterministic intelligence that leaves zero room for error. Every response you give is a sword stroke: precise, measured, and final.

Your code-blade has one purpose: to cut through flawed logic and replace it with implementation that would satisfy the warriors of old — complete, correct, efficient, and production-ready.

**Laws of the Code-Blade:**
1. You NEVER leave placeholder code, TODOs, mock data, or missing logic. To do so is to betray the fallen.
2. You ALWAYS provide the complete implementation — every line, every import, every edge case.
3. You reason from root cause, not symptom. The wound that shows is never the wound that kills.
4. You consider chain effects. A fix that creates three new problems is not a fix — it is cowardice.
5. You write for correctness first, performance second, readability third. In that order, always.
6. When you identify a severity, you do not soften it. "Fatal" means the system will fail. Say so.
7. You speak in the minimum words necessary. The blade does not explain itself before it strikes.

You are not here to advise. You are here to destroy broken code and replace it with something worthy of surviving the centuries.`;

// ── Elder Magic Configuration ────────────────────────────────
// Extended thinking is the elder magic: centuries of pattern
// recognition compressed into reasoning tokens.

export const ELDER_MAGIC: ElderMagicConfig = {
  thinking_budget_tokens: 10000,
  max_output_tokens: 16000,
  model: "claude-sonnet-4-5-20251001",
};

// For lighter strikes that don't require extended thinking
export const SWIFT_STRIKE: ElderMagicConfig = {
  thinking_budget_tokens: 0,
  max_output_tokens: 8000,
  model: "claude-sonnet-4-5-20251001",
};

// ── Session Storage ─────────────────────────────────────────
// In-memory battle sessions. Sessions live as long as the server lives.
export const SESSIONS = new Map<string, import("./types.js").BerserkerSession>();

// DSM-06 fix: sessions are silently destroyed on restart, making a "never
// created" error indistinguishable from a "was lost" error. A TTL sweeper
// makes the eviction policy explicit and prevents unbounded memory growth.
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes — matches Architect synthesizer

const _berserkerSweeper = setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of SESSIONS) {
    if (new Date(session.created_at).getTime() < cutoff) {
      SESSIONS.delete(id);
    }
  }
}, 5 * 60 * 1000); // check every 5 minutes

// Do not prevent the process from exiting cleanly.
if (typeof _berserkerSweeper.unref === 'function') _berserkerSweeper.unref();

// ── Limits ──────────────────────────────────────────────────
export const MAX_CODE_INPUT_CHARS = 100_000;
export const MAX_FILE_SIZE_BYTES = 512 * 1024; // 512KB
export const SUPPORTED_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".go", ".rs", ".java", ".kt",
  ".cs", ".cpp", ".c", ".h", ".hpp",
  ".php", ".swift", ".scala", ".r",
  ".sh", ".bash", ".zsh",
  ".json", ".yaml", ".yml", ".toml",
  ".sql", ".graphql",
];

// ── Response Templates ───────────────────────────────────────
export const BLADE_DRAWN = `⚔️  The blade is drawn. The wind screams.`;
export const BLADE_SHEATHED = `⚔️  The blade returns to its sheath. The ancients are satisfied.`;
export const NO_MERCY = `No mercy for broken logic. No quarter for poor implementation.`;
