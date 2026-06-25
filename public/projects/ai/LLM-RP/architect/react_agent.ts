// ============================================================
// STRATEGIC REACT AGENT WITH ToT BACKTRACKING
//
// Implements the Reasoning-Acting-Observing (ReAct) paradigm
// grounded in verifiable tool observations, enhanced with a
// Tree-of-Thought (ToT) backtracking mechanism.
//
// Architecture:
//   Thought  — Model reasons about the current state
//   Act      — Model interacts with a synthesis tool/phase
//   Observe  — Model receives environmental feedback
//   Backtrack — If observation reveals failure or contradiction,
//               prune the failed branch and explore an
//               alternative path from the previous node.
//
// This faithfulness guarantee prevents hallucinated reasoning:
// every conclusion is anchored to a verifiable observation.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import {
  SkeletonGenerator,
  SectionExpander,
  DensityOptimizer,
  MetricsComparator,
  createSynthesizerSession,
  type SynthesizerSession,
} from './synthesizer.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NodeStatus = 'success' | 'failed' | 'backtracked';

/**
 * A single node in the ToT reasoning tree.
 * Each node records one Thought-Act-Observation triple.
 */
export interface ReActNode {
  id: string;
  parentId: string | null;
  depth: number;
  thought: string;
  action: string;
  actionParams: Record<string, unknown>;
  observation: string;
  status: NodeStatus;
  createdAt: string;
}

/**
 * The full reasoning trace produced by one agent run.
 */
export interface ReActTrace {
  sessionId: string;
  inputText: string;
  maxPoints: number;
  nodes: ReActNode[];
  backtrackCount: number;
  finalOutput: string | null;
  status: 'complete' | 'failed';
  createdAt: string;
  completedAt: string;
}

// ─── Input Validation ────────────────────────────────────────────────────────

/**
 * Validate inputs before starting a ReAct session.
 * Throws a descriptive error if any input is invalid.
 *
 * @param inputText - must be a non-empty string
 * @param maxPoints - must be an integer in [3, 10]
 */
export function validateReActInputs(inputText: string, maxPoints: number): void {
  if (!inputText || inputText.trim().length === 0) {
    throw new Error('inputText must be a non-empty string.');
  }
  if (!Number.isInteger(maxPoints) || maxPoints < 3 || maxPoints > 10) {
    throw new Error(
      `maxPoints must be an integer between 3 and 10 (received ${maxPoints}).`
    );
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

const MAX_BACKTRACKS = 3;

function makeNode(
  nodes: ReActNode[],
  parentId: string | null,
  depth: number,
  thought: string,
  action: string,
  actionParams: Record<string, unknown>,
  observation: string,
  status: NodeStatus
): ReActNode {
  const node: ReActNode = {
    id: uuidv4(),
    parentId,
    depth,
    thought,
    action,
    actionParams,
    observation,
    status,
    createdAt: new Date().toISOString(),
  };
  nodes.push(node);
  return node;
}

// ─── Phase 1: Skeleton Generation with Backtracking ─────────────────────────

function runSkeletonPhase(
  nodes: ReActNode[],
  inputText: string,
  initialMaxPoints: number,
  backtrackRef: { count: number }
): { session: SynthesizerSession; node: ReActNode } | null {
  const expander = new SectionExpander();

  for (let attempt = 0; attempt <= MAX_BACKTRACKS; attempt++) {
    // On each backtrack reduce points toward the valid minimum (3).
    const currentMaxPoints = Math.max(3, initialMaxPoints - attempt);

    const thought =
      attempt === 0
        ? `I will generate a skeleton outline using up to ${currentMaxPoints} key points ` +
          `to structure the synthesis of the provided text.`
        : `The previous skeleton attempt failed. I will backtrack and retry with ` +
          `${currentMaxPoints} skeleton points (attempt ${attempt + 1}).`;

    let session: SynthesizerSession;
    let observation: string;
    let status: NodeStatus;

    try {
      session = createSynthesizerSession(inputText, currentMaxPoints);
      const generator = new SkeletonGenerator();
      session.skeleton = generator.generate(session.inputText, session.maxPoints);
      session.status = 'skeleton_complete';

      if (session.skeleton.length === 0) {
        throw new Error('Skeleton generation produced zero points.');
      }

      // Validate that at least half the points have usable keyword + brief.
      const emptyPoints = session.skeleton.filter(p => !p.keyword || !p.brief);
      if (emptyPoints.length > session.skeleton.length / 2) {
        throw new Error(
          `${emptyPoints.length} of ${session.skeleton.length} skeleton points ` +
            `have empty keyword or brief — skeleton quality insufficient.`
        );
      }

      observation =
        `Skeleton generated with ${session.skeleton.length} point(s): ` +
        `[${session.skeleton.map(p => p.keyword).join(', ')}].`;
      status = 'success';

      const node = makeNode(
        nodes,
        null,
        attempt,
        thought,
        'generate_skeleton',
        { maxPoints: currentMaxPoints },
        observation,
        status
      );
      return { session, node };
    } catch (err) {
      observation =
        `Skeleton generation failed: ${err instanceof Error ? err.message : String(err)}. ` +
        `Backtracking.`;
      status = attempt < MAX_BACKTRACKS ? 'backtracked' : 'failed';
      backtrackRef.count++;

      makeNode(
        nodes,
        null,
        attempt,
        thought,
        'generate_skeleton',
        { maxPoints: currentMaxPoints },
        observation,
        status
      );
    }
  }

  return null;
}

// ─── Phase 2: Parallel Expansion with Backtracking ───────────────────────────

function runExpansionPhase(
  nodes: ReActNode[],
  session: SynthesizerSession,
  skeletonNodeId: string,
  backtrackRef: { count: number }
): boolean {
  const expander = new SectionExpander();
  let allSucceeded = true;

  for (const point of session.skeleton) {
    const thought =
      `I will expand skeleton point [${point.index}] "${point.keyword}" ` +
      `into a full section grounded in the source text.`;

    let observation: string;
    let status: NodeStatus;

    try {
      const section = expander.expand(point, session.inputText);
      session.expandedSections[point.index] = section;

      if (!section.content || section.content.trim().length < 10) {
        throw new Error(
          `Expanded content for "${point.keyword}" is too short (< 10 chars).`
        );
      }

      observation =
        `Point "${point.keyword}" expanded: ${section.tokenCount} tokens, ` +
        `${section.entities.length} entities, ` +
        `density ${section.entityDensity.toFixed(4)}.`;
      status = 'success';
    } catch (err) {
      observation =
        `Expansion failed for "${point.keyword}": ` +
        `${err instanceof Error ? err.message : String(err)}.`;
      status = 'backtracked';
      allSucceeded = false;
      backtrackRef.count++;
    }

    makeNode(
      nodes,
      skeletonNodeId,
      1,
      thought,
      'expand_point',
      { pointIndex: point.index, keyword: point.keyword },
      observation,
      status
    );

    if (!allSucceeded) break;
  }

  if (allSucceeded) {
    session.status = 'expansion_complete';
  }
  return allSucceeded;
}

// ─── Fallback: Minimal Skeleton + Expansion ──────────────────────────────────

function runFallbackExpansion(
  nodes: ReActNode[],
  inputText: string,
  skeletonNodeId: string,
  backtrackRef: { count: number }
): SynthesizerSession | null {
  const thought =
    `Expansion phase failed on the primary skeleton. ` +
    `Backtracking to Phase 1 — retrying with a minimal 3-point skeleton ` +
    `to find a viable synthesis path.`;

  const expander = new SectionExpander();

  try {
    const fallback = createSynthesizerSession(inputText, 3);
    const generator = new SkeletonGenerator();
    fallback.skeleton = generator.generate(fallback.inputText, 3);
    fallback.status = 'skeleton_complete';

    for (const point of fallback.skeleton) {
      const section = expander.expand(point, fallback.inputText);
      fallback.expandedSections[point.index] = section;
    }
    fallback.status = 'expansion_complete';

    makeNode(
      nodes,
      skeletonNodeId,
      2,
      thought,
      'backtrack_and_retry_skeleton',
      { fallbackMaxPoints: 3 },
      `Fallback 3-point skeleton generated and fully expanded successfully.`,
      'success'
    );

    return fallback;
  } catch (err) {
    backtrackRef.count++;
    makeNode(
      nodes,
      skeletonNodeId,
      2,
      thought,
      'backtrack_and_retry_skeleton',
      { fallbackMaxPoints: 3 },
      `Fallback expansion also failed: ${err instanceof Error ? err.message : String(err)}.`,
      'failed'
    );
    return null;
  }
}

// ─── Phase 3: Chain-of-Density Pass ──────────────────────────────────────────

function runDensityPhase(
  nodes: ReActNode[],
  session: SynthesizerSession,
  parentNodeId: string,
  backtrackRef: { count: number }
): ReActNode | null {
  const thought =
    `All skeleton points are expanded. I will run the Chain-of-Density pass ` +
    `to identify missing entities and compress the summary toward a target ` +
    `entity density of ~0.15 entities/token.`;

  const expandedCount = Object.keys(session.expandedSections).length;

  try {
    if (expandedCount < session.skeleton.length) {
      throw new Error(
        `Only ${expandedCount}/${session.skeleton.length} points are expanded ` +
          `before the density pass.`
      );
    }

    const optimizer = new DensityOptimizer();
    session.densityResult = optimizer.optimize(
      session.expandedSections,
      session.inputText
    );
    session.status = 'density_complete';

    const r = session.densityResult;
    const observation =
      `Density pass complete. ` +
      `Density: ${r.originalDensity.toFixed(4)} → ${r.finalDensity.toFixed(4)} ` +
      `(target 0.15). Iterations: ${r.iterations.length}. ` +
      `Lead bias: ${(r.leadBias * 100).toFixed(1)}%.`;

    return makeNode(
      nodes,
      parentNodeId,
      2,
      thought,
      'density_pass',
      {},
      observation,
      'success'
    );
  } catch (err) {
    backtrackRef.count++;
    makeNode(
      nodes,
      parentNodeId,
      2,
      thought,
      'density_pass',
      {},
      `Density pass failed: ${err instanceof Error ? err.message : String(err)}.`,
      'failed'
    );
    return null;
  }
}

// ─── Final Synthesis + Metrics ───────────────────────────────────────────────

function runFinalization(
  nodes: ReActNode[],
  session: SynthesizerSession,
  densityNodeId: string,
  backtrackRef: { count: number }
): string | null {
  const thought =
    `The density pass succeeded. I will compute comparative metrics and ` +
    `produce the final synthesized output.`;

  try {
    const comparator = new MetricsComparator();
    session.metrics = comparator.compare(session);

    const r = session.densityResult!;
    const m = session.metrics;

    const finalOutput = [
      `── SKELETON (${session.skeleton.length} points) ` +
        `───────────────────────────────────────────────────`,
      session.skeleton
        .map(p => `  [${p.index}] ${p.keyword.padEnd(28)} ${p.brief}`)
        .join('\n'),
      '',
      `── CHAIN-OF-DENSITY FINAL SUMMARY ` +
        `────────────────────────────────────────────`,
      r.finalSummary,
      '',
      `── METRICS ` +
        `─────────────────────────────────────────────────────────────────────`,
      `Entity Density : ${r.finalDensity.toFixed(4)} (target ~0.15)`,
      `Lead Bias      : ${(r.leadBias * 100).toFixed(1)}% (lower = more distributed)`,
      `CoD Iterations : ${r.iterations.length}`,
      `SoT Speedup    : ${m.skeleton.speedupFactor}×`,
    ].join('\n');

    const observation =
      `Final synthesis complete. ` +
      `Entity density: ${r.finalDensity.toFixed(4)}, ` +
      `lead bias: ${(r.leadBias * 100).toFixed(1)}%, ` +
      `speedup: ${m.skeleton.speedupFactor}×.`;

    makeNode(
      nodes,
      densityNodeId,
      3,
      thought,
      'compute_metrics_and_finalize',
      {},
      observation,
      'success'
    );

    return finalOutput;
  } catch (err) {
    backtrackRef.count++;
    makeNode(
      nodes,
      densityNodeId,
      3,
      thought,
      'compute_metrics_and_finalize',
      {},
      `Finalization failed: ${err instanceof Error ? err.message : String(err)}.`,
      'failed'
    );
    return null;
  }
}

// ─── Public Entry Point ───────────────────────────────────────────────────────

/**
 * Run the Strategic ReAct Agent with ToT Backtracking.
 *
 * The agent executes a Thought-Act-Observation loop over the SoT+CoD
 * synthesis pipeline.  When any phase fails, the agent backtracks to the
 * previous successful node, prunes the failed branch, and attempts an
 * alternative path (e.g. reduced skeleton size, fallback expansion).
 *
 * @param inputText - Source text to synthesize (must be non-empty).
 * @param maxPoints - Maximum skeleton points (integer in [3, 10]).
 * @returns A full ReActTrace containing the reasoning tree and final output.
 */
export function runReActSynthesis(
  inputText: string,
  maxPoints: number
): ReActTrace {
  validateReActInputs(inputText, maxPoints);

  const traceId = uuidv4();
  const nodes: ReActNode[] = [];
  const backtrackRef = { count: 0 };
  const createdAt = new Date().toISOString();

  // ── Phase 1: Skeleton ─────────────────────────────────────────────────────
  const skeletonResult = runSkeletonPhase(
    nodes,
    inputText,
    maxPoints,
    backtrackRef
  );

  if (!skeletonResult) {
    return {
      sessionId: traceId,
      inputText,
      maxPoints,
      nodes,
      backtrackCount: backtrackRef.count,
      finalOutput: null,
      status: 'failed',
      createdAt,
      completedAt: new Date().toISOString(),
    };
  }

  let { session, node: skeletonNode } = skeletonResult;

  // ── Phase 2: Expansion ────────────────────────────────────────────────────
  const expansionOk = runExpansionPhase(
    nodes,
    session,
    skeletonNode.id,
    backtrackRef
  );

  if (!expansionOk) {
    // Backtrack: attempt a simpler 3-point skeleton + expansion.
    const fallbackSession = runFallbackExpansion(
      nodes,
      inputText,
      skeletonNode.id,
      backtrackRef
    );

    if (!fallbackSession) {
      return {
        sessionId: traceId,
        inputText,
        maxPoints,
        nodes,
        backtrackCount: backtrackRef.count,
        finalOutput: null,
        status: 'failed',
        createdAt,
        completedAt: new Date().toISOString(),
      };
    }

    session = fallbackSession;
  }

  // ── Phase 3: Chain-of-Density ─────────────────────────────────────────────
  // The last expansion node is the parent of the density node.
  const lastExpansionNode = [...nodes]
    .reverse()
    .find(n => n.action === 'expand_point' || n.action === 'backtrack_and_retry_skeleton');
  const densityParentId = lastExpansionNode?.id ?? skeletonNode.id;

  const densityNode = runDensityPhase(
    nodes,
    session,
    densityParentId,
    backtrackRef
  );

  if (!densityNode) {
    return {
      sessionId: traceId,
      inputText,
      maxPoints,
      nodes,
      backtrackCount: backtrackRef.count,
      finalOutput: null,
      status: 'failed',
      createdAt,
      completedAt: new Date().toISOString(),
    };
  }

  // ── Finalization ──────────────────────────────────────────────────────────
  const finalOutput = runFinalization(
    nodes,
    session,
    densityNode.id,
    backtrackRef
  );

  return {
    sessionId: traceId,
    inputText,
    maxPoints,
    nodes,
    backtrackCount: backtrackRef.count,
    finalOutput,
    status: finalOutput !== null ? 'complete' : 'failed',
    createdAt,
    completedAt: new Date().toISOString(),
  };
}
