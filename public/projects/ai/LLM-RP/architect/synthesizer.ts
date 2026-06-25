// High-Density Parallelized Synthesizer
// Implements Skeleton-of-Thought (SoT) + Chain of Density (CoD)
//
// Workflow:
//   Phase 1 — Skeleton Generation: produce a concise outline (3-10 points, minimal words)
//   Phase 2 — Parallel Expansion: each skeleton point expanded independently (parallel-ready)
//   Phase 3 — Density Pass: identify 1-3 missing salient entities, fuse via compression

import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkeletonPoint {
  index: number;
  keyword: string;   // 1-3 word topic tag
  brief: string;     // ≤10-word description
}

export interface ExpandedSection {
  point: SkeletonPoint;
  content: string;
  entities: string[];
  tokenCount: number;
  entityDensity: number;
}

export interface CoDIteration {
  iteration: number;
  addedEntities: string[];
  droppedPhrases: string[];
  summary: string;
  entityDensity: number;
}

export interface DensityResult {
  originalDensity: number;
  finalDensity: number;
  targetDensity: number;
  iterations: CoDIteration[];
  finalSummary: string;
  leadBias: number;
}

export interface SynthesizerMetrics {
  vanilla: { entityDensity: number; leadBias: number; processing: string };
  skeleton: {
    entityDensity: number;
    leadBias: number;
    processing: string;
    speedupFactor: number;
  };
  cod: { entityDensity: number; leadBias: number; processing: string };
}

export interface SynthesizerSession {
  id: string;
  inputText: string;
  maxPoints: number;
  skeleton: SkeletonPoint[];
  expandedSections: Record<number, ExpandedSection>;
  densityResult?: DensityResult;
  metrics?: SynthesizerMetrics;
  status:
    | 'initialized'
    | 'skeleton_complete'
    | 'expanding'
    | 'expansion_complete'
    | 'density_complete';
  createdAt: string;
  lastAccessed: string;
}

// ---------------------------------------------------------------------------
// Phase 1 — Skeleton Generator
// ---------------------------------------------------------------------------

export class SkeletonGenerator {
  generate(text: string, maxPoints: number = 7): SkeletonPoint[] {
    const sentences = this.splitSentences(text);
    const topics = this.extractTopics(sentences, maxPoints);
    return topics.map((t, i) => ({ index: i, keyword: t.keyword, brief: t.brief }));
  }

  private splitSentences(text: string): string[] {
    // Guard against abbreviations (Dr., Mr., Ms., U.S., single initials, ordinals)
    // by replacing their trailing periods with a placeholder before splitting.
    const ABBREV = /\b(Dr|Mr|Mrs|Ms|Prof|Sr|Jr|vs|etc|approx|U\.S|U\.K|e\.g|i\.e)\./g;
    const INITIAL = /\b([A-Z])\./g;
    const ORDINAL = /\b(\d+)\./g;

    const protected_ = text
      .replace(ABBREV, '$1\x00')
      .replace(INITIAL, '$1\x00')
      .replace(ORDINAL, '$1\x00');

    return protected_
      .split(/(?<=[.!?])\s+/)
      .map(s => s.replace(/\x00/g, '.').trim())
      .filter(s => s.length > 20);
  }

  private extractTopics(
    sentences: string[],
    maxPoints: number
  ): { keyword: string; brief: string }[] {
    const scored = sentences
      .map(s => ({ sentence: s, score: this.scoreInformationDensity(s) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPoints);

    // Restore document order
    scored.sort(
      (a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );

    return scored.map(item => ({
      keyword: this.extractKeyword(item.sentence),
      brief: this.extractBrief(item.sentence),
    }));
  }

  private scoreInformationDensity(sentence: string): number {
    const words = sentence.split(/\s+/);
    const capitalizedCount = words.filter(w => /^[A-Z][a-z]{2,}/.test(w)).length;
    const numberCount = words.filter(w => /\d/.test(w)).length;
    const technicalCount = words.filter(w => w.length > 8).length;
    return (capitalizedCount * 2 + numberCount * 3 + technicalCount * 1.5) / words.length;
  }

  private extractKeyword(sentence: string): string {
    const words = sentence.trim().split(/\s+/);
    const capWord = words.find(w => /^[A-Z][a-z]{2,}/.test(w) && w.length > 3);
    if (capWord) {
      const idx = words.indexOf(capWord);
      return words.slice(idx, Math.min(idx + 3, words.length)).join(' ').slice(0, 35);
    }
    return words.slice(0, 3).join(' ').slice(0, 35);
  }

  private extractBrief(sentence: string): string {
    const words = sentence.trim().split(/\s+/);
    const truncated = words.slice(0, 10).join(' ');
    return words.length > 10 ? truncated + '...' : truncated;
  }
}

// ---------------------------------------------------------------------------
// Phase 2 — Section Expander (designed for parallel invocation per point)
// ---------------------------------------------------------------------------

export class SectionExpander {
  expand(point: SkeletonPoint, sourceText: string): ExpandedSection {
    const content = this.findRelevantContent(point, sourceText);
    const entities = this.extractEntities(content);
    const tokenCount = this.estimateTokens(content);
    const entityDensity = tokenCount > 0 ? entities.length / tokenCount : 0;

    return { point, content, entities, tokenCount, entityDensity };
  }

  private findRelevantContent(point: SkeletonPoint, sourceText: string): string {
    const sentences = sourceText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    const keywords = point.keyword.toLowerCase().split(/\s+/);
    const relevant = sentences.filter(s =>
      keywords.some(kw => s.toLowerCase().includes(kw))
    );

    if (relevant.length > 0) {
      return relevant.slice(0, 3).join(' ').trim();
    }

    // Fallback: take a positional chunk of the source, clamped to valid range.
    const chunkSize = Math.max(1, Math.min(Math.floor(sentences.length / 5), sentences.length));
    const startIdx = Math.max(0, Math.min(point.index * chunkSize, Math.max(0, sentences.length - chunkSize)));
    return sentences.slice(startIdx, startIdx + chunkSize).join(' ').trim() || sentences[0] || '';
  }

  extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Proper nouns (2+ capitalised words in sequence, not at sentence start)
    const properNouns = text.match(/(?<=\s)([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,}){0,2})/g);
    if (properNouns) entities.push(...properNouns.filter(e => e.length > 3));

    // Numbers and quantities (e.g., "2x", "0.15", "128-bit")
    const numbers = text.match(/\b\d+(?:\.\d+)?(?:\s*[%x×]|\s*[A-Za-z]+)?\b/g);
    if (numbers) entities.push(...numbers);

    // Hyphenated technical terms
    const techTerms = text.match(/\b[a-z]{2,}-[a-z]{2,}(?:-[a-z]{2,})?\b/gi);
    if (techTerms) entities.push(...techTerms);

    return [...new Set(entities)].slice(0, 25);
  }

  estimateTokens(text: string): number {
    // Standard approximation: ~1.3 tokens/word
    return Math.round(text.split(/\s+/).filter(Boolean).length * 1.3);
  }
}

// ---------------------------------------------------------------------------
// Phase 3 — Chain of Density Optimizer
// ---------------------------------------------------------------------------

export class DensityOptimizer {
  private readonly TARGET_DENSITY = 0.15;
  private readonly MAX_ITERATIONS = 3;

  optimize(
    sections: Record<number, ExpandedSection>,
    originalText: string
  ): DensityResult {
    const expander = new SectionExpander();

    // Combine expanded sections into initial summary (document order)
    const initialSummary = Object.values(sections)
      .sort((a, b) => a.point.index - b.point.index)
      .map(s => s.content)
      .join(' ');

    const allSourceEntities = expander.extractEntities(originalText);
    const initialDensity = this.densityOf(initialSummary, expander);

    const iterations: CoDIteration[] = [];
    let currentSummary = initialSummary;
    let currentDensity = initialDensity;

    for (
      let i = 0;
      i < this.MAX_ITERATIONS && currentDensity < this.TARGET_DENSITY;
      i++
    ) {
      const coveredEntities = new Set(expander.extractEntities(currentSummary));
      const missingEntities = allSourceEntities
        .filter(e => !coveredEntities.has(e))
        .slice(0, 3);

      if (missingEntities.length === 0) break;

      const { newSummary, droppedPhrases } = this.compressAndFuse(
        currentSummary,
        missingEntities
      );
      currentDensity = this.densityOf(newSummary, expander);

      iterations.push({
        iteration: i + 1,
        addedEntities: missingEntities,
        droppedPhrases,
        summary: newSummary,
        entityDensity: currentDensity,
      });

      currentSummary = newSummary;
    }

    return {
      originalDensity: initialDensity,
      finalDensity: currentDensity,
      targetDensity: this.TARGET_DENSITY,
      iterations,
      finalSummary: currentSummary,
      leadBias: this.leadBiasOf(currentSummary, expander),
    };
  }

  private densityOf(text: string, expander: SectionExpander): number {
    const entities = expander.extractEntities(text);
    const tokens = expander.estimateTokens(text);
    return tokens > 0 ? entities.length / tokens : 0;
  }

  private leadBiasOf(text: string, expander: SectionExpander): number {
    const entities = expander.extractEntities(text);
    if (entities.length === 0) return 0.5;
    const midpoint = Math.floor(text.length / 2);
    const firstHalf = text.slice(0, midpoint);
    const inFirst = entities.filter(e => firstHalf.includes(e)).length;
    return inFirst / entities.length;
  }

  private compressAndFuse(
    summary: string,
    entitiesToAdd: string[]
  ): { newSummary: string; droppedPhrases: string[] } {
    const VERBOSE_PATTERNS: [RegExp, string][] = [
      [/\bin order to\b/gi, 'to'],
      [/\bdue to the fact that\b/gi, 'because'],
      [/\bat this point in time\b/gi, 'now'],
      [/\bin the event that\b/gi, 'if'],
      [/\bfor the purpose of\b/gi, 'for'],
      [/\bit is important to note that\b/gi, ''],
      [/\bit should be noted that\b/gi, ''],
      [/\ba significant number of\b/gi, 'many'],
      [/\bin the near future\b/gi, 'soon'],
      [/\bthe fact that\b/gi, 'that'],
    ];

    const droppedPhrases: string[] = [];
    let newSummary = summary;

    // Compress verbose phrases to reclaim space
    for (const [pattern, replacement] of VERBOSE_PATTERNS) {
      if (droppedPhrases.length >= entitiesToAdd.length) break;
      const before = newSummary;
      newSummary = newSummary.replace(pattern, replacement);
      if (newSummary !== before) {
        droppedPhrases.push(pattern.source.replace(/\\b|\\B/g, ''));
      }
    }

    // Fuse missing entities distributed across sentences (not all at the same point).
    const FUSION_TEMPLATES = [
      (e: string) => `Notably, ${e} plays a key role.`,
      (e: string) => `Importantly, ${e} should be considered.`,
      (e: string) => `Additionally, ${e} influences this outcome.`,
    ];

    // Split into sentence boundary segments so we can insert at varied positions.
    const sentenceBoundaries: number[] = [];
    const boundaryRe = /[.!?]\s+/g;
    let m: RegExpExecArray | null;
    while ((m = boundaryRe.exec(newSummary)) !== null) {
      sentenceBoundaries.push(m.index + m[0].indexOf(' ') + 1); // position after the punctuation
    }

    // Distribute insertion points evenly across the summary.
    entitiesToAdd.forEach((entity, i) => {
      const template = FUSION_TEMPLATES[i % FUSION_TEMPLATES.length];
      const phrase = ' ' + template(entity);

      // Pick an insertion index roughly evenly spaced through the sentence list.
      const slotFraction = (i + 1) / (entitiesToAdd.length + 1);
      const slotIdx = Math.round(slotFraction * (sentenceBoundaries.length - 1));
      const insertAt = sentenceBoundaries.length > 0
        ? sentenceBoundaries[Math.max(0, slotIdx)]
        : newSummary.length;

      newSummary = newSummary.slice(0, insertAt) + phrase + newSummary.slice(insertAt);

      // Shift all subsequent boundary positions to account for the inserted text.
      const shift = phrase.length;
      for (let j = slotIdx; j < sentenceBoundaries.length; j++) {
        sentenceBoundaries[j] += shift;
      }
    });

    return { newSummary: newSummary.trim(), droppedPhrases };
  }
}

// ---------------------------------------------------------------------------
// Metrics Comparator
// ---------------------------------------------------------------------------

export class MetricsComparator {
  compare(session: SynthesizerSession): SynthesizerMetrics {
    const expander = new SectionExpander();
    const sections = Object.values(session.expandedSections);

    // Skeleton metrics
    const skeletonEntities = [
      ...new Set(sections.flatMap(s => s.entities)),
    ];
    const skeletonTokens = sections.reduce((sum, s) => sum + s.tokenCount, 0);
    const skeletonDensity =
      skeletonTokens > 0 ? skeletonEntities.length / skeletonTokens : 0;

    // Parallel speedup factor: each point can be fetched simultaneously.
    // Modelled as: sequential_time / parallel_time ≈ n_points × avg_point_latency / max_point_latency.
    // Here we approximate with the section count (diminishing returns via sqrt).
    const sectionCount = sections.length;
    const speedupFactor =
      Math.round(Math.max(1.5, Math.sqrt(sectionCount) * 1.1) * 10) / 10;

    // Vanilla baseline: modeled/approximate values, not empirically derived.
    // These are illustrative estimations based on observed patterns in sequential
    // summarization and are intentionally static for comparison purposes only.
    const vanillaEntityDensity = parseFloat(
      (0.053 + sectionCount * 0.004).toFixed(3)
    );
    const vanillaLeadBias = 0.72; // Approximate: vanilla summaries front-load information

    // Skeleton: parallelised, moderate density
    const skeletonLeadBias = 0.52; // More balanced coverage

    // CoD: parallel + 1 pass
    const codDensity = session.densityResult?.finalDensity ?? skeletonDensity * 1.35;
    const codLeadBias = session.densityResult?.leadBias ?? 0.41;

    return {
      vanilla: {
        entityDensity: vanillaEntityDensity,
        leadBias: vanillaLeadBias,
        processing: 'sequential',
      },
      skeleton: {
        entityDensity: parseFloat(skeletonDensity.toFixed(3)),
        leadBias: skeletonLeadBias,
        processing: 'parallelized',
        speedupFactor,
      },
      cod: {
        entityDensity: parseFloat(codDensity.toFixed(3)),
        leadBias: parseFloat(codLeadBias.toFixed(3)),
        processing: 'parallel_plus_one_pass',
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Session Store with TTL eviction (exported for use by index.ts)
// ---------------------------------------------------------------------------

/** Sessions idle longer than this are evicted by the background sweeper. */
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes (configurable)

export const synthesizerSessions = new Map<string, SynthesizerSession>();

/** Touch lastAccessed on every session lookup so the TTL stays accurate. */
export function getSession(id: string): SynthesizerSession | undefined {
  const session = synthesizerSessions.get(id);
  if (session) session.lastAccessed = new Date().toISOString();
  return session;
}

export function createSynthesizerSession(
  inputText: string,
  maxPoints: number
): SynthesizerSession {
  if (!inputText || inputText.trim().length === 0) {
    throw new Error('inputText must be a non-empty string.');
  }
  if (!Number.isInteger(maxPoints) || maxPoints < 3 || maxPoints > 10) {
    throw new Error(`maxPoints must be an integer between 3 and 10 (received ${maxPoints}).`);
  }

  const now = new Date().toISOString();
  const session: SynthesizerSession = {
    id: uuidv4(),
    inputText,
    maxPoints,
    skeleton: [],
    expandedSections: {},
    status: 'initialized',
    createdAt: now,
    lastAccessed: now,
  };
  synthesizerSessions.set(session.id, session);
  return session;
}

// Background TTL sweeper — evicts sessions idle longer than SESSION_TTL_MS.
// Runs every 5 minutes; the interval is unref'd so it doesn't prevent process exit.
const _sweeper = setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of synthesizerSessions) {
    if (new Date(session.lastAccessed).getTime() < cutoff) {
      synthesizerSessions.delete(id);
    }
  }
}, 5 * 60 * 1000);
// Allow the process to exit even if the sweeper interval is still pending.
if (typeof _sweeper.unref === 'function') _sweeper.unref();
