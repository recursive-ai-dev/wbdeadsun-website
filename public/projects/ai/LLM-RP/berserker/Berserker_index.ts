#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE UNDEAD BERSERKER — MCP SERVER
 *  "The forge never sleeps. Neither does the debugger."
 *
 *  Model Context Protocol server exposing the Berserker's complete weapon rack.
 *  Each tool is a named ritual from the Black Codex.
 *  The Berserker speaks through every response — terse, certain, violent in precision.
 *
 *  Transport: STDIO (default) — suitable for Kilo Code, Claude Desktop, Cursor
 *  Protocol: MCP v1 (JSON-RPC 2.0)
 *  Tools: 6 weapons + 1 forge
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';

import { createDualTensor, serializeTensor, deserializeTensor, type DualTensor } from './core/dual-tensor.js';
import {
  directStrike,
  exceptionHarvest,
  temporalBacktrack,
  dependencySeverance,
  councilOfBlades,
  chainVerify,
  forgeSemantic,
  type DirectStrikeInput,
  type ExceptionHarvestInput,
  type TemporalBacktrackInput,
  type DependencySeveranceInput,
  type CouncilInput,
  type ChainVerifyInput,
  type ForgeSemanticInput,
} from './tools/berserker-tools.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Tensor State Persistence ─────────────────────────────────────────────
// The Berserker's dual tensor improves with use.
// State is persisted to disk between sessions.

const TENSOR_STATE_PATH = join(process.env.HOME ?? '.', '.berserker-tensor-state.json');

function loadOrCreateTensor(): DualTensor {
  if (existsSync(TENSOR_STATE_PATH)) {
    try {
      const raw = readFileSync(TENSOR_STATE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.version === '1.0.0') {
        return deserializeTensor(parsed);
      }
    } catch {
      // Corrupted state — forge a new tensor
    }
  }
  return createDualTensor(0x1A_DEAD_BE_EFn as unknown as number);
}

function persistTensor(dt: DualTensor): void {
  try {
    writeFileSync(TENSOR_STATE_PATH, JSON.stringify(serializeTensor(dt)));
  } catch {
    // Non-fatal — tensor state is best-effort
  }
}

// ─── Tool Definitions ─────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: 'berserker_direct_strike',
    description: [
      'THE LOGIC SHARD SEQUENCE. Primary debugging ritual.',
      'Receives a bug, a curse, a failing test — and shatters it into ordered shards.',
      'Each shard is a discrete investigation step with required evidence and terminal conditions.',
      'Includes: primary hypothesis, negative exemplar, minimal patch sketch, verification ritual, and postmortem.',
      'Powered by the 4D dual tensor + semantic forge — the analysis is not generic. It reads your code.',
      'Use when: you have a bug with a stack trace, failing test, or error message.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        code:          { type: 'string', description: 'The code containing or related to the bug' },
        error_message: { type: 'string', description: 'The error message or exception text' },
        stack_trace:   { type: 'string', description: 'Full stack trace' },
        test_name:     { type: 'string', description: 'Name of the failing test' },
        language:      { type: 'string', enum: ['python', 'javascript', 'kotlin', 'rust', 'c'], description: 'Programming language (auto-detected if omitted)' },
      },
      required: ['code'],
    },
  },
  {
    name: 'berserker_exception_harvest',
    description: [
      'EXCEPTION HARVESTING. Parses a raw stack trace into structured frames.',
      'Identifies the root cause frame (deepest user-code frame), builds the causal chain,',
      'names the necrotic source (the true origin of the exception), and provides fix direction.',
      'Supports Python, JavaScript/TypeScript, Kotlin/JVM, Rust, and C (GDB-style) traces.',
      'Use when: you have a stack trace and need it dissected.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        stack_trace:  { type: 'string', description: 'The full stack trace text' },
        language:     { type: 'string', description: 'Language of the stack trace (optional)' },
        context_code: { type: 'string', description: 'Code context for better analysis (optional)' },
      },
      required: ['stack_trace'],
    },
  },
  {
    name: 'berserker_temporal_backtrack',
    description: [
      'TEMPORAL BACKTRACKING. Finds when corruption was introduced.',
      'Analyzes a git diff, changelog, or commit summary for corruption signals:',
      'deleted error handlers, added null patterns, removed assertions, dependency changes.',
      'Ranks each signal by risk score and connection to your symptom description.',
      'Use when: you have a regression and want to find when and where the curse was introduced.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        diff_or_changelog:   { type: 'string', description: 'git diff output, changelog, or commit summary' },
        symptom_description: { type: 'string', description: 'Description of the observed bug/symptom' },
        language:            { type: 'string', description: 'Primary language of the codebase (optional)' },
      },
      required: ['diff_or_changelog', 'symptom_description'],
    },
  },
  {
    name: 'berserker_dependency_severance',
    description: [
      'DEPENDENCY SEVERANCE. Audits every dependency for dead weight.',
      'Accepts package.json, Cargo.toml, requirements.txt, or build.gradle.',
      'Scores each dependency: unused, native-replaceable, deprecated, or high-risk.',
      'Names native alternatives where they exist. Identifies severance targets.',
      'Use when: bundle size is bloated, you suspect unused deps, or pre-release audit.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        package_json_or_cargo_toml: { type: 'string', description: 'Contents of package.json, Cargo.toml, requirements.txt, or build.gradle' },
        language:                   { type: 'string', enum: ['javascript', 'rust', 'kotlin', 'python', 'c'], description: 'Language/ecosystem' },
        code_using_deps:            { type: 'string', description: 'Code that uses the dependencies (for usage detection, optional)' },
      },
      required: ['package_json_or_cargo_toml', 'language'],
    },
  },
  {
    name: 'berserker_council_of_blades',
    description: [
      'COUNCIL OF BLADES — Tree-of-Thought / Graph-of-Thought.',
      'Forms multiple competing hypotheses about a problem. Each hypothesis is a "blade".',
      'Blades debate: evidence for vs evidence against, confidence scores, verdicts.',
      'The council produces a winner and captures dissent from the second-place blade.',
      'Returns a consensus path: ordered steps to confirm or refute the winning hypothesis.',
      'Use when: the cause is uncertain, multiple theories exist, or you need to think before striking.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        problem_statement: { type: 'string', description: 'Description of the problem or symptom' },
        code:              { type: 'string', description: 'Relevant code (optional but improves analysis)' },
        language:          { type: 'string', description: 'Programming language (optional)' },
        max_hypotheses:    { type: 'number', description: 'Maximum number of competing hypotheses to generate (2-6, default 4)' },
      },
      required: ['problem_statement'],
    },
  },
  {
    name: 'berserker_chain_verify',
    description: [
      'CHAIN-OF-VERIFICATION GAUNTLET. For high-stakes fixes only.',
      'Takes a claim (a proposed fix, root cause, or architectural decision)',
      'and runs it through a structured verification protocol:',
      '  1. Draft the claim',
      '  2. Generate independent verification questions',
      '  3. Answer each question independently (no confirmation bias)',
      '  4. Revise the claim based on answers',
      '  5. Produce a final verdict: verified / refuted / partial / insufficient',
      'Use when: touching security, payments, identity, or shared persistent state.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        claim:              { type: 'string', description: 'The claim to verify (e.g. "the bug is caused by X" or "this fix is safe because Y")' },
        code:               { type: 'string', description: 'Code context (optional)' },
        verification_tests: { type: 'array', items: { type: 'string' }, description: 'Existing tests that should cover this claim (optional)' },
      },
      required: ['claim'],
    },
  },
  {
    name: 'berserker_forge_semantic',
    description: [
      'THE SEMANTIC FORGE — 4D Dual Tensor Analysis + Symbolic Algebra Compression.',
      'Runs the full mathematical analysis pipeline on source code:',
      '  • Domain detection + confidence score',
      '  • Feature extraction (cyclomatic complexity, nesting, entropy, pattern flags)',
      '  • 4D dual tensor scoring across language × reasoning × temporal dimensions',
      '  • Symbolic algebra compression — token priority scores, synonym triads',
      '  • Top hypotheses from code structure alone',
      'Use when: you want to understand the true shape of code before striking,',
      'or when you need a compressed semantic representation for further analysis.',
    ].join('\n'),
    inputSchema: {
      type: 'object',
      properties: {
        code:     { type: 'string', description: 'Source code to analyze' },
        language: { type: 'string', description: 'Language hint (optional, auto-detected)' },
        task:     { type: 'string', enum: ['analyze', 'compress', 'embed', 'full'], description: 'Analysis mode (default: full)' },
      },
      required: ['code'],
    },
  },
];

// ─── Server Construction ──────────────────────────────────────────────────

const server = new Server(
  {
    name:    'undead-berserker',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── List Tools Handler ───────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// ─── Call Tool Handler ────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  // Load tensor state for this invocation
  const dt = loadOrCreateTensor();

  try {
    let result: unknown;

    switch (name) {
      case 'berserker_direct_strike': {
        const input = args as DirectStrikeInput;
        if (!input.code) throw new BerserkerError('MISSING_CODE', 'No code provided. The shard sequence cannot begin without a cursed artifact.');
        result = directStrike(input, dt);
        break;
      }

      case 'berserker_exception_harvest': {
        const input = args as ExceptionHarvestInput;
        if (!input.stack_trace) throw new BerserkerError('MISSING_STACK', 'No stack trace provided. There are no bones to harvest from emptiness.');
        result = exceptionHarvest(input);
        break;
      }

      case 'berserker_temporal_backtrack': {
        const input = args as TemporalBacktrackInput;
        if (!input.diff_or_changelog) throw new BerserkerError('MISSING_DIFF', 'No diff provided. The timeline cannot be retraced without the record of changes.');
        if (!input.symptom_description) throw new BerserkerError('MISSING_SYMPTOM', 'No symptom described. I cannot search for a corruption that has no name.');
        result = temporalBacktrack(input);
        break;
      }

      case 'berserker_dependency_severance': {
        const input = args as DependencySeveranceInput;
        if (!input.package_json_or_cargo_toml) throw new BerserkerError('MISSING_DEPS', 'No dependency file provided. The severance cannot begin without knowing what is attached.');
        result = dependencySeverance(input);
        break;
      }

      case 'berserker_council_of_blades': {
        const input = args as CouncilInput;
        if (!input.problem_statement) throw new BerserkerError('MISSING_PROBLEM', 'No problem stated. The council does not convene without a curse to debate.');
        result = councilOfBlades(input, dt);
        break;
      }

      case 'berserker_chain_verify': {
        const input = args as ChainVerifyInput;
        if (!input.claim) throw new BerserkerError('MISSING_CLAIM', 'No claim provided. The verification gauntlet requires a claim to test. Do not waste the ritual on nothing.');
        result = chainVerify(input);
        break;
      }

      case 'berserker_forge_semantic': {
        const input = args as ForgeSemanticInput;
        if (!input.code) throw new BerserkerError('MISSING_CODE', 'No code provided. The forge needs material. It cannot analyze an empty crucible.');
        result = forgeSemantic(input, dt);
        break;
      }

      default:
        throw new BerserkerError('UNKNOWN_TOOL', `Unknown tool: "${name}". This weapon is not in the rack. Check the manifest.`);
    }

    // Persist tensor after each use (lightweight, best-effort)
    persistTensor(dt);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };

  } catch (error) {
    if (error instanceof BerserkerError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error:           error.code,
              message:         error.message,
              berserker_voice: `The ritual failed before it could begin.\n[${error.code}] ${error.message}\nFix the invocation. Then return.`,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Unexpected error — never expose internals
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error:           'INTERNAL_FORGE_FAILURE',
            message:         'The forge encountered an unexpected failure. The tensor remains intact.',
            detail:          msg,
            berserker_voice: 'Something in the forge shattered. This should not happen.\nReport this to the forge-keeper with the full invocation.',
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ─── Typed Error ──────────────────────────────────────────────────────────

class BerserkerError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'BerserkerError';
  }
}

// ─── Server Startup ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Server is now listening on STDIO
  // The Berserker watches. Waiting for the next curse to be named.
}

main().catch(err => {
  process.stderr.write(`[BERSERKER MCP] Fatal startup failure: ${err?.message ?? err}\n`);
  process.exit(1);
});
