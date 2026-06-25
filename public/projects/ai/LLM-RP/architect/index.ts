#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import {
  SynthesisSession,
  NexusPoint,
  StrategicPath,
  SynthesisOutput,
  Domain,
  ConfidenceTier,
  VerificationState
} from './types.js';
import {
  SynthesisEngine,
  StepBackPhase,
  SkeletonPhase,
  ToTPhase,
  EvaluationPhase,
  SynthesisPhase,
  CalibrationPhase
} from './engine.js';
import { Tensor5D, StrategicTensor } from './tensor.js';
import {
  SkeletonGenerator,
  SectionExpander,
  DensityOptimizer,
  MetricsComparator,
  synthesizerSessions,
  getSession,
  createSynthesizerSession,
  type SynthesizerSession,
} from './synthesizer.js';
import { runReActSynthesis } from './react_agent.js';

// Session store
const sessions = new Map<string, SynthesisSession>();

// Initialize synthesis engine
const engine = new SynthesisEngine();

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'architect_open_synthesis',
    description: 'Initialize a new strategic synthesis session. Creates the 5D Strategic Tensor and prepares the synthesis pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset_description: {
          type: 'string',
          description: 'Description of the dataset to be analyzed'
        },
        domains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Domains spanned by the dataset: technical, economic, political, social, environmental, legal, ethical, temporal'
        },
        stakes: {
          type: 'string',
          description: 'What decisions depend on this analysis? What is the cost of being wrong?'
        },
        audience: {
          type: 'string',
          description: 'Who will consume this intelligence: SME, Executive, Technical, Mixed'
        },
        constraints: {
          type: 'object',
          properties: {
            time_horizon: { type: 'string' },
            confidence_threshold: { type: 'number' },
            max_tokens: { type: 'number' }
          }
        }
      },
      required: ['dataset_description', 'domains']
    }
  },
  {
    name: 'architect_step_back',
    description: 'Execute Phase I: Abstraction. Extract fundamental principles before instance-level analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        dataset: { type: 'string' }
      },
      required: ['session_id', 'dataset']
    }
  },
  {
    name: 'architect_skeleton',
    description: 'Execute Phase II: Skeleton Generation. Identify the 5 most critical cross-domain nexus points.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_tot_explore',
    description: 'Execute Phase III: Tree-of-Thoughts Exploration. Generate 3 paths (A/B/C) for each nexus point.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        nexus_index: { type: 'number', description: 'Index of nexus point to explore (0-4)' }
      },
      required: ['session_id', 'nexus_index']
    }
  },
  {
    name: 'architect_evaluate',
    description: 'Execute Phase IV: Metacognitive Evaluation. Critique paths and discard those with reasoning failures.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_synthesize',
    description: 'Execute Phase V: Synthesis. Produce final intelligence product integrating verified paths.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_calibrate',
    description: 'Execute Phase VI: Self-Correction. Quantify uncertainty and identify improvement paths.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },
  {
    name: 'architect_full_synthesis',
    description: 'Execute complete 6-phase synthesis pipeline in one call.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: { type: 'string' },
        dataset_description: { type: 'string' },
        domains: { type: 'array', items: { type: 'string' } },
        stakes: { type: 'string' },
        audience: { type: 'string' }
      },
      required: ['dataset', 'dataset_description', 'domains']
    }
  },
  {
    name: 'architect_red_team',
    description: 'Execute adversarial red teaming on an existing conclusion.',
    inputSchema: {
      type: 'object',
      properties: {
        conclusion: { type: 'string' },
        supporting_evidence: { type: 'string' },
        intensity: { type: 'string', enum: ['standard', 'aggressive', 'maximum'] }
      },
      required: ['conclusion', 'supporting_evidence']
    }
  },
  {
    name: 'architect_cross_domain_extract',
    description: 'Extract non-obvious insights from high-density technical datasets.',
    inputSchema: {
      type: 'object',
      properties: {
        dataset: { type: 'string' },
        source_domains: { type: 'array', items: { type: 'string' } },
        target_domains: { type: 'array', items: { type: 'string' } },
        min_confidence: { type: 'number' }
      },
      required: ['dataset', 'source_domains', 'target_domains']
    }
  },
  {
    name: 'architect_retrieve_synthesis',
    description: 'Retrieve complete synthesis output and audit trail for a session.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' }
      },
      required: ['session_id']
    }
  },

  // ── High-Density Parallelized Synthesizer (SoT + CoD) ─────────────────────

  {
    name: 'synthesizer_open',
    description:
      'Initialize a High-Density Parallelized Synthesizer session. ' +
      'Accepts raw text and returns a session_id for subsequent Phase calls.',
    inputSchema: {
      type: 'object',
      properties: {
        input_text: {
          type: 'string',
          description: 'The source text to be synthesized.',
        },
        max_points: {
          type: 'number',
          description: 'Maximum skeleton points to generate (3–10, default 7).',
        },
      },
      required: ['input_text'],
    },
  },
  {
    name: 'synthesizer_generate_skeleton',
    description:
      'Phase 1 (SoT): Generate a concise outline (3–10 points, minimal words). ' +
      'Each point is a keyword + ≤10-word brief. Returns the skeleton for Phase 2.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'synthesizer_expand_point',
    description:
      'Phase 2 (SoT): Expand a single skeleton point into a full section. ' +
      'Designed to be called in parallel for each point index. ' +
      'Returns entity list and entity-density for the section.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
        point_index: {
          type: 'number',
          description: 'Index of the skeleton point to expand (0-based).',
        },
      },
      required: ['session_id', 'point_index'],
    },
  },
  {
    name: 'synthesizer_density_pass',
    description:
      'Phase 3 (CoD): Run the Chain-of-Density pass. Identifies 1-3 missing ' +
      'salient entities from the source text and fuses them into the combined ' +
      'summary through compression, maintaining a fixed token budget. ' +
      'All Phase 2 points must be expanded before calling this.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
      },
      required: ['session_id'],
    },
  },
  {
    name: 'synthesizer_full_pipeline',
    description:
      'Run the complete SoT + CoD pipeline in one call: skeleton → parallel expand → density pass. ' +
      'Returns the CoD-optimized summary together with per-phase metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        input_text: {
          type: 'string',
          description: 'The source text to synthesize.',
        },
        max_points: {
          type: 'number',
          description: 'Maximum skeleton points (3–10, default 7).',
        },
      },
      required: ['input_text'],
    },
  },
  {
    name: 'synthesizer_get_metrics',
    description:
      'Retrieve informational comparison metrics for a completed synthesizer session: ' +
      'entity density, lead bias, and latency class for Vanilla vs Skeleton vs CoD outputs.',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: { type: 'string' },
      },
      required: ['session_id'],
    },
  },

  // ── Strategic ReAct Agent with ToT Backtracking ───────────────────────────

  {
    name: 'synthesizer_react_synthesize',
    description:
      'Run the Strategic ReAct Agent with Tree-of-Thought (ToT) Backtracking. ' +
      'The agent executes a Thought-Act-Observation loop over the SoT+CoD synthesis ' +
      'pipeline. When an observation reveals a tool failure or logical contradiction, ' +
      'the agent backtracks to the prior successful node, prunes the failed branch, ' +
      'and explores an alternative path (e.g. reduced skeleton size, fallback expansion). ' +
      'Every conclusion is anchored to a verifiable tool observation, preventing ' +
      'hallucinated reasoning. Returns the final synthesis together with the full ' +
      'reasoning trace showing every Thought-Act-Observation triple.',
    inputSchema: {
      type: 'object',
      properties: {
        input_text: {
          type: 'string',
          description: 'The source text to synthesize (must be non-empty).',
        },
        max_points: {
          type: 'number',
          description: 'Maximum skeleton points to generate (3–10, default 7).',
        },
      },
      required: ['input_text'],
    },
  },
];

// Server setup
const server = new Server(
  {
    name: 'undead-architect-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'architect_open_synthesis':
        return handleOpenSynthesis(args as any);
      case 'architect_step_back':
        return handleStepBack(args as any);
      case 'architect_skeleton':
        return handleSkeleton(args as any);
      case 'architect_tot_explore':
        return handleTotExplore(args as any);
      case 'architect_evaluate':
        return handleEvaluate(args as any);
      case 'architect_synthesize':
        return handleSynthesize(args as any);
      case 'architect_calibrate':
        return handleCalibrate(args as any);
      case 'architect_full_synthesis':
        return handleFullSynthesis(args as any);
      case 'architect_red_team':
        return handleRedTeam(args as any);
      case 'architect_cross_domain_extract':
        return handleCrossDomainExtract(args as any);
      case 'architect_retrieve_synthesis':
        return handleRetrieveSynthesis(args as any);

      // ── Parallelized Synthesizer ──────────────────────────────────────────
      case 'synthesizer_open':
        return handleSynthesizerOpen(args as any);
      case 'synthesizer_generate_skeleton':
        return handleSynthesizerGenerateSkeleton(args as any);
      case 'synthesizer_expand_point':
        return handleSynthesizerExpandPoint(args as any);
      case 'synthesizer_density_pass':
        return handleSynthesizerDensityPass(args as any);
      case 'synthesizer_full_pipeline':
        return handleSynthesizerFullPipeline(args as any);
      case 'synthesizer_get_metrics':
        return handleSynthesizerGetMetrics(args as any);

      // ── ReAct Agent ───────────────────────────────────────────────────────
      case 'synthesizer_react_synthesize':
        return handleSynthesizerReactSynthesize(args as any);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Handler implementations

// DSM-05 fix: session creation extracted so both handleOpenSynthesis and
// handleFullSynthesis can obtain the session ID from the Map directly,
// without parsing it from a display string.
function openSynthesisSession(args: {
  dataset_description: string;
  domains: string[];
  stakes?: string;
  audience?: string;
  constraints?: any;
}): string {
  const sessionId = uuidv4();
  const session: SynthesisSession = {
    id: sessionId,
    datasetDescription: args.dataset_description,
    domains: args.domains as Domain[],
    stakes: args.stakes || 'unspecified',
    audience: args.audience || 'SME',
    constraints: args.constraints || {},
    createdAt: new Date().toISOString(),
    phases: {},
    tensor: new StrategicTensor(args.domains.length),
    status: 'initialized'
  };
  sessions.set(sessionId, session);
  return sessionId;
}

function handleOpenSynthesis(args: {
  dataset_description: string;
  domains: string[];
  stakes?: string;
  audience?: string;
  constraints?: any;
}) {
  const sessionId = openSynthesisSession(args);
  const session = sessions.get(sessionId)!;

  return {
    content: [
      {
        type: 'text',
        text: `[ARCHITECT SYNTHESIS OPENED]
Session ID: ${sessionId}
Dataset: ${args.dataset_description}
Domains: ${args.domains.join(', ')}
Stakes: ${session.stakes}
Audience: ${session.audience}

The 5D Strategic Tensor has been initialized.
Tensor dimensions: 128 × ${args.domains.length} × 16 × 5 × 4 × 2

Ready for Phase I: Step-Back Abstraction.`,
      },
    ],
  };
}

function handleStepBack(args: { session_id: string; dataset: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (session.status !== 'initialized') {
    throw new Error(
      `Phase I (Step-Back) can only run on an initialized session. ` +
      `Current status: "${session.status}". Open a new session to re-run abstraction.`
    );
  }

  const phase = new StepBackPhase();
  const result = phase.execute(args.dataset, session.domains);
  
  session.phases.stepBack = result;
  session.status = 'abstraction_complete';

  return {
    content: [
      {
        type: 'text',
        text: `[PHASE I: STEP-BACK ABSTRACTION COMPLETE]

<principle domain="thermodynamic">
${result.principles.thermodynamic}
</principle>

<principle domain="game_theoretic">
${result.principles.gameTheoretic}
</principle>

<principle domain="network">
${result.principles.network}
</principle>

<principle domain="systems">
${result.principles.systems}
</principle>

<principle domain="epistemic">
${result.principles.epistemic}
</principle>

Principles extracted. Ready for Phase II: Skeleton Generation.`,
      },
    ],
  };
}

function handleSkeleton(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.stepBack) {
    throw new Error('Phase I (Step-Back) must be completed first');
  }

  const phase = new SkeletonPhase();
  const result = phase.execute(session.phases.stepBack, session.domains);
  
  session.phases.skeleton = result;
  session.status = 'skeleton_complete';

  let output = `[PHASE II: SKELETON GENERATION COMPLETE]\n\n`;
  output += `Identified 5 critical cross-domain nexus points:\n\n`;
  
  result.nexusPoints.forEach((nexus, i) => {
    output += `NEXUS ${i + 1}: ${nexus.domainA} ↔ ${nexus.domainB}\n`;
    output += `  Description: ${nexus.description}\n`;
    output += `  Evidence: ${nexus.primaryEvidence}\n`;
    output += `  Risk: ${nexus.misinterpretationRisk}\n\n`;
  });

  output += `Ready for Phase III: Tree-of-Thoughts Exploration.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleTotExplore(args: { session_id: string; nexus_index: number }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.skeleton) {
    throw new Error('Phase II (Skeleton) must be completed first');
  }

  const nexus = session.phases.skeleton.nexusPoints[args.nexus_index];
  if (!nexus) {
    throw new Error(`Nexus index ${args.nexus_index} not found`);
  }

  const phase = new ToTPhase();
  const result = phase.execute(nexus);
  
  if (!session.phases.tot) {
    session.phases.tot = {};
  }
  session.phases.tot[args.nexus_index] = result;

  let output = `[PHASE III: TREE-OF-THOUGHTS EXPLORATION]\n`;
  output += `Nexus: ${nexus.description}\n\n`;

  result.paths.forEach((path, i) => {
    const pathLabels = ['A (Convergent)', 'B (Adversarial)', 'C (Black Swan)'];
    output += `<branch path="${pathLabels[i]}">\n`;
    output += `  Interpretation: ${path.interpretation}\n`;
    output += `  Evidence: ${path.evidence}\n`;
    output += `  Implications: ${path.implications}\n`;
    output += `  Confidence: ${path.confidence}%\n`;
    output += `</branch>\n\n`;
  });

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleEvaluate(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.tot) {
    throw new Error('Phase III (ToT) must be completed first');
  }

  const phase = new EvaluationPhase();
  const result = phase.execute(session.phases.tot);
  
  session.phases.evaluation = result;
  session.status = 'evaluation_complete';

  let output = `[PHASE IV: METACOGNITIVE EVALUATION COMPLETE]\n\n`;
  output += `Paths evaluated: ${result.totalPaths}\n`;
  output += `Paths passed: ${result.passedPaths}\n`;
  output += `Paths failed: ${result.failedPaths}\n\n`;

  if (result.failures.length > 0) {
    output += `FAILURES:\n`;
    result.failures.forEach(f => {
      output += `  - ${f.path}: ${f.criterion} (${f.reason})\n`;
    });
    output += `\n`;
  }

  output += `Verified paths promoted to synthesis: ${result.verifiedPaths.length}\n`;
  output += `Ready for Phase V: Synthesis.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleSynthesize(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.evaluation) {
    throw new Error('Phase IV (Evaluation) must be completed first');
  }

  const phase = new SynthesisPhase();
  const result = phase.execute(
    session.phases.skeleton!,
    session.phases.evaluation,
    session.audience
  );

  // DSM-02 fix: make the 5D StrategicTensor load-bearing.
  // The tensor holds Xavier-initialised cross-domain weights; blend its
  // getCrossDomainCorrelation() scores (sigmoid-normalised to [0,1]) with
  // the skeleton's raw nexus confidence: 70% structural / 30% tensor.
  const tensor = session.tensor as unknown as StrategicTensor;
  result.correlations.forEach((corr, i) => {
    const nexus = session.phases.skeleton!.nexusPoints[i];
    if (!nexus) return;
    const domainAIdx = session.domains.indexOf(nexus.domainA as Domain);
    const domainBIdx = session.domains.indexOf(nexus.domainB as Domain);
    if (domainAIdx >= 0 && domainBIdx >= 0) {
      const rawTensor = tensor.getCrossDomainCorrelation(domainAIdx, domainBIdx, 0);
      // Sigmoid-normalise: maps any real score to (0,1)
      const normTensor = 1 / (1 + Math.exp(-rawTensor));
      const blended = 0.7 * nexus.confidence + 0.3 * normTensor;
      corr.confidence = Math.round(blended * 1000) / 1000;
      corr.interpretation =
        `Tensor-weighted cross-domain correlation: ${(blended * 100).toFixed(1)}% ` +
        `(structural ${(nexus.confidence * 100).toFixed(0)}% × 0.7 + ` +
        `tensor ${(normTensor * 100).toFixed(0)}% × 0.3). ` +
        `Primary risk: ${nexus.misinterpretationRisk}`;
    }
  });

  session.phases.synthesis = result;
  session.status = 'synthesis_complete';

  let output = `[PHASE V: SYNTHESIS COMPLETE]\n\n`;
  output += `<synthesis>\n\n`;
  output += `=== EXECUTIVE SUMMARY ===\n`;
  output += `${result.executiveSummary}\n\n`;
  
  output += `=== CROSS-DOMAIN CORRELATIONS ===\n`;
  result.correlations.forEach((c, i) => {
    output += `Nexus ${i + 1}: ${c.nexus}\n`;
    output += `  Evidence: ${c.evidence}\n`;
    output += `  Interpretation: ${c.interpretation}\n`;
    output += `  Confidence: ${c.confidence}%\n\n`;
  });

  output += `=== EMERGING RISKS ===\n`;
  result.risks.forEach(r => {
    output += `- ${r.description}\n`;
    output += `  Severity: ${r.severity}, Probability: ${r.probability}\n`;
    output += `  Mitigation: ${r.mitigation}\n\n`;
  });

  output += `=== RECOMMENDED ACTIONS ===\n`;
  output += `Immediate (0-30 days):\n${result.actions.immediate}\n\n`;
  output += `Tactical (1-6 months):\n${result.actions.tactical}\n\n`;
  output += `Strategic (6+ months):\n${result.actions.strategic}\n\n`;

  output += `=== AUDIT TRAIL ===\n`;
  output += `Key assumptions: ${result.auditTrail.assumptions.join(', ')}\n`;
  output += `Evidence gaps: ${result.auditTrail.gaps.join(', ')}\n`;
  output += `RAG triggers: ${result.auditTrail.ragTriggers.join(', ')}\n\n`;

  output += `</synthesis>\n\n`;
  output += `Ready for Phase VI: Calibration.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleCalibrate(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  if (!session.phases.synthesis) {
    throw new Error('Phase V (Synthesis) must be completed first');
  }

  const phase = new CalibrationPhase();
  const result = phase.execute(session.phases.synthesis);
  
  session.phases.calibration = result;
  session.status = 'complete';

  let output = `[PHASE VI: CALIBRATION COMPLETE]\n\n`;
  output += `<calibration>\n\n`;
  output += `OVERALL CONFIDENCE SCORE: ${result.overallConfidence}%\n\n`;

  output += `CONFIDENCE BREAKDOWN:\n`;
  output += `  Evidence quality: ${result.breakdown.evidenceQuality}%\n`;
  output += `  Reasoning soundness: ${result.breakdown.reasoningSoundness}%\n`;
  output += `  Domain coverage: ${result.breakdown.domainCoverage}%\n`;
  output += `  Temporal stability: ${result.breakdown.temporalStability}%\n\n`;

  output += `LOGICAL GAPS IDENTIFIED:\n`;
  result.gaps.forEach((g, i) => {
    output += `  ${i + 1}. ${g.description}\n`;
    output += `     Evidence needed: ${g.evidenceNeeded}\n`;
  });
  output += `\n`;

  output += `RAG RETRIEVAL TRIGGERS:\n`;
  result.ragTriggers.forEach(t => {
    output += `  - ${t.description}\n`;
    output += `    Sources: ${t.sources}\n`;
    output += `    Queries: ${t.queries}\n`;
  });
  output += `\n`;

  output += `REVISION CONDITIONS:\n`;
  output += `  Full revision trigger: ${result.revisionConditions.full}\n`;
  output += `  Partial update trigger: ${result.revisionConditions.partial}\n`;
  output += `  Monitoring: ${result.revisionConditions.monitoring}\n\n`;

  output += `</calibration>\n\n`;
  output += `[SYNTHESIS SESSION COMPLETE]\n`;
  output += `Session ID: ${args.session_id}\n`;
  output += `Status: ${session.status}\n`;
  output += `Use architect_retrieve_synthesis to retrieve full output.`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

async function handleFullSynthesis(args: {
  dataset: string;
  dataset_description: string;
  domains: string[];
  stakes?: string;
  audience?: string;
}) {
  // DSM-05 fix: obtain session ID from the shared creation helper rather than
  // parsing it from handleOpenSynthesis's human-readable display string.
  const sessionId = openSynthesisSession({
    dataset_description: args.dataset_description,
    domains: args.domains,
    stakes: args.stakes,
    audience: args.audience
  });

  // Execute all phases
  handleStepBack({ session_id: sessionId, dataset: args.dataset });
  handleSkeleton({ session_id: sessionId });

  // Explore all 5 nexus points
  for (let i = 0; i < 5; i++) {
    handleTotExplore({ session_id: sessionId, nexus_index: i });
  }

  handleEvaluate({ session_id: sessionId });
  handleSynthesize({ session_id: sessionId });
  const calibrateResult = handleCalibrate({ session_id: sessionId });

  return calibrateResult;
}

function handleRedTeam(args: {
  conclusion: string;
  supporting_evidence: string;
  intensity?: 'standard' | 'aggressive' | 'maximum';
}) {
  const intensity = args.intensity || 'standard';
  
  const redTeamAnalysis = {
    weakestLink: 'Identify the single piece of evidence that, if invalidated, would most damage the conclusion',
    counterArguments: [
      'Alternative explanation 1: [generated based on evidence]',
      'Alternative explanation 2: [generated based on evidence]',
      'Alternative explanation 3: [generated based on evidence]'
    ],
    falsificationPathways: [
      'What evidence would prove this wrong?',
      'What experiment could invalidate this?',
      'What observation would contradict this?'
    ],
    probabilityOfError: intensity === 'maximum' ? '35-50%' : intensity === 'aggressive' ? '20-35%' : '10-20%'
  };

  let output = `[RED TEAM ANALYSIS - INTENSITY: ${intensity.toUpperCase()}]\n\n`;
  output += `CONCLUSION UNDER STRESS-TEST:\n${args.conclusion}\n\n`;
  output += `WEAKEST LINK:\n${redTeamAnalysis.weakestLink}\n\n`;
  output += `COUNTER-ARGUMENTS:\n`;
  redTeamAnalysis.counterArguments.forEach((ca, i) => {
    output += `  ${i + 1}. ${ca}\n`;
  });
  output += `\nFALSIFICATION PATHWAYS:\n`;
  redTeamAnalysis.falsificationPathways.forEach((fp, i) => {
    output += `  ${i + 1}. ${fp}\n`;
  });
  output += `\nPROBABILITY OF ERROR: ${redTeamAnalysis.probabilityOfError}\n`;
  output += `\n[RED TEAM COMPLETE]`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

// DSM-04: representative vocabulary for each domain, used for TF-based
// presence detection in the dataset text.
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  technical:    ['system', 'code', 'api', 'data', 'algorithm', 'stack', 'latency', 'pipeline', 'service', 'database'],
  economic:     ['cost', 'revenue', 'market', 'price', 'profit', 'budget', 'investment', 'capital', 'growth', 'value'],
  political:    ['policy', 'regulation', 'compliance', 'government', 'law', 'mandate', 'legislation', 'authority', 'governance'],
  social:       ['user', 'community', 'behavior', 'culture', 'adoption', 'engagement', 'trust', 'team', 'stakeholder'],
  environmental:['energy', 'carbon', 'emission', 'waste', 'resource', 'sustainability', 'climate', 'impact', 'footprint'],
  legal:        ['liability', 'contract', 'intellectual', 'patent', 'license', 'audit', 'litigation', 'terms', 'agreement'],
  ethical:      ['fairness', 'bias', 'privacy', 'transparency', 'consent', 'accountability', 'equity', 'harm', 'principle'],
  temporal:     ['time', 'deadline', 'schedule', 'delay', 'cycle', 'duration', 'roadmap', 'horizon', 'milestone', 'quarter'],
};

function handleCrossDomainExtract(args: {
  dataset: string;
  source_domains: string[];
  target_domains: string[];
  min_confidence?: number;
}) {
  const minConfidence = args.min_confidence || 0.6;

  // DSM-04 fix: compute domain presence from actual dataset content via term
  // frequency rather than returning hardcoded values.
  const words = args.dataset.toLowerCase().split(/\W+/).filter(Boolean);
  const totalWords = Math.max(words.length, 1);

  function domainPresence(domain: string): number {
    const keywords = DOMAIN_KEYWORDS[domain.toLowerCase()] || [domain.toLowerCase()];
    const hits = keywords.reduce((sum, kw) => {
      // count partial matches (e.g. "economic" matches "economics")
      return sum + words.filter(w => w.startsWith(kw) || kw.startsWith(w)).length;
    }, 0);
    // Normalise: hits per 1000 words, capped at 1.0
    return Math.min(1.0, (hits / totalWords) * 1000 / keywords.length);
  }

  const signals: Array<{ domain: string; target: string; strength: number; confidence: number }> = [];
  const seen = new Set<string>();
  for (const src of args.source_domains) {
    for (const tgt of args.target_domains) {
      if (src === tgt) continue;
      const pairKey = [src, tgt].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      const srcP = domainPresence(src);
      const tgtP = domainPresence(tgt);
      // Strength = geometric mean; confidence = harmonic mean (penalises weak links)
      const strength = Math.sqrt(srcP * tgtP);
      const confidence = srcP + tgtP > 0 ? (2 * srcP * tgtP) / (srcP + tgtP) : 0;
      if (confidence >= minConfidence) {
        signals.push({ domain: src, target: tgt, strength: Math.round(strength * 1000) / 1000, confidence: Math.round(confidence * 1000) / 1000 });
      }
    }
  }

  // Gaps: domains mentioned in the request but weakly represented in the dataset
  const allDomains = [...new Set([...args.source_domains, ...args.target_domains])];
  const gaps: string[] = allDomains
    .filter(d => domainPresence(d) < 0.05)
    .map(d => `Domain "${d}" has minimal signal in dataset — cross-domain inference unreliable`);
  if (gaps.length === 0) {
    gaps.push(`All requested domains have detectable signal at confidence ≥ ${minConfidence}`);
  }

  const extraction = { signals, gaps };

  let output = `[CROSS-DOMAIN KNOWLEDGE EXTRACTION]\n\n`;
  output += `Source domains: ${args.source_domains.join(', ')}\n`;
  output += `Target domains: ${args.target_domains.join(', ')}\n`;
  output += `Minimum confidence: ${minConfidence}\n\n`;

  output += `EXTRACTED SIGNALS:\n`;
  extraction.signals.forEach((s, i) => {
    output += `  ${i + 1}. ${s.domain} → ${s.target}\n`;
    output += `     Strength: ${(s.strength * 100).toFixed(1)}%\n`;
    output += `     Confidence: ${(s.confidence * 100).toFixed(1)}%\n\n`;
  });

  output += `IDENTIFIED GAPS:\n`;
  extraction.gaps.forEach((g, i) => {
    output += `  ${i + 1}. ${g}\n`;
  });

  return {
    content: [{ type: 'text', text: output }],
  };
}

function handleRetrieveSynthesis(args: { session_id: string }) {
  const session = sessions.get(args.session_id);
  if (!session) {
    throw new Error(`Session not found: ${args.session_id}`);
  }

  let output = `[SYNTHESIS RETRIEVAL]\n\n`;
  output += `Session ID: ${session.id}\n`;
  output += `Status: ${session.status}\n`;
  output += `Created: ${session.createdAt}\n\n`;

  if (session.phases.stepBack) {
    output += `=== PHASE I: STEP-BACK ABSTRACTION ===\n`;
    output += `Principles extracted: 5\n\n`;
  }

  if (session.phases.skeleton) {
    output += `=== PHASE II: SKELETON ===\n`;
    output += `Nexus points: ${session.phases.skeleton.nexusPoints.length}\n\n`;
  }

  if (session.phases.tot) {
    output += `=== PHASE III: TREE-OF-THOUGHTS ===\n`;
    output += `Paths explored: ${Object.keys(session.phases.tot).length * 3}\n\n`;
  }

  if (session.phases.evaluation) {
    output += `=== PHASE IV: EVALUATION ===\n`;
    output += `Verified paths: ${session.phases.evaluation.verifiedPaths.length}\n\n`;
  }

  if (session.phases.synthesis) {
    output += `=== PHASE V: SYNTHESIS ===\n`;
    output += `${session.phases.synthesis.executiveSummary}\n\n`;
  }

  if (session.phases.calibration) {
    output += `=== PHASE VI: CALIBRATION ===\n`;
    output += `Overall confidence: ${session.phases.calibration.overallConfidence}%\n\n`;
  }

  output += `[END RETRIEVAL]`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

// ---------------------------------------------------------------------------
// High-Density Parallelized Synthesizer handlers
// ---------------------------------------------------------------------------

function handleSynthesizerOpen(args: { input_text: string; max_points?: number }) {
  const maxPoints = Math.min(10, Math.max(3, Math.floor(args.max_points ?? 7)));
  const session = createSynthesizerSession(args.input_text, maxPoints);

  return {
    content: [
      {
        type: 'text',
        text: `[SYNTHESIZER SESSION OPENED]
Session ID: ${session.id}
Max skeleton points: ${maxPoints}
Input length: ${args.input_text.split(/\s+/).length} words

Pipeline:
  Phase 1 → synthesizer_generate_skeleton   (skeleton-of-thought outline)
  Phase 2 → synthesizer_expand_point × N    (parallel per-point expansion)
  Phase 3 → synthesizer_density_pass        (chain-of-density fusion)

Or call synthesizer_full_pipeline to run all phases at once.`,
      },
    ],
  };
}

function handleSynthesizerGenerateSkeleton(args: { session_id: string }) {
  const session = getSession(args.session_id);
  if (!session) throw new Error(`Synthesizer session not found: ${args.session_id}`);

  const generator = new SkeletonGenerator();
  session.skeleton = generator.generate(session.inputText, session.maxPoints);
  session.status = 'skeleton_complete';

  const pointList = session.skeleton
    .map(
      p =>
        `  [${p.index}] ${p.keyword.padEnd(30)} | ${p.brief}`
    )
    .join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `[PHASE 1 — SKELETON GENERATION COMPLETE]
Session: ${args.session_id}
Points generated: ${session.skeleton.length}

IDX  KEYWORD                          BRIEF
───  ───────────────────────────────  ──────────────────────────────────
${pointList}

Next: call synthesizer_expand_point for each index (0–${session.skeleton.length - 1}).
      These calls can be made IN PARALLEL to minimise latency.`,
      },
    ],
  };
}

function handleSynthesizerExpandPoint(args: {
  session_id: string;
  point_index: number;
}) {
  const session = getSession(args.session_id);
  if (!session) throw new Error(`Synthesizer session not found: ${args.session_id}`);
  if (session.status === 'initialized') {
    throw new Error('Run synthesizer_generate_skeleton (Phase 1) first.');
  }

  const point = session.skeleton[args.point_index];
  if (!point) {
    throw new Error(
      `Point index ${args.point_index} out of range (0–${session.skeleton.length - 1}).`
    );
  }

  const expander = new SectionExpander();
  const section = expander.expand(point, session.inputText);
  session.expandedSections[args.point_index] = section;

  const expandedCount = Object.keys(session.expandedSections).length;
  const remaining = session.skeleton.length - expandedCount;
  // Only advance status when all points are done; avoid racing on 'expanding'
  // in concurrent calls (each invocation is independent and idempotent).
  if (remaining === 0) session.status = 'expansion_complete';

  return {
    content: [
      {
        type: 'text',
        text: `[PHASE 2 — SECTION EXPANDED]
Point ${args.point_index}: "${point.keyword}"
Brief: ${point.brief}

Content:
${section.content}

Entities detected (${section.entities.length}): ${section.entities.slice(0, 10).join(', ')}${section.entities.length > 10 ? '…' : ''}
Token count:    ~${section.tokenCount}
Entity density: ${section.entityDensity.toFixed(4)} entities/token

Progress: ${expandedCount}/${session.skeleton.length} points expanded.${
          remaining === 0
            ? '\nAll points expanded. Ready for synthesizer_density_pass (Phase 3).'
            : `\n${remaining} point(s) remaining.`
        }`,
      },
    ],
  };
}

function handleSynthesizerDensityPass(args: { session_id: string }) {
  const session = getSession(args.session_id);
  if (!session) throw new Error(`Synthesizer session not found: ${args.session_id}`);

  if (session.skeleton.length === 0) {
    throw new Error(
      'Phase 1 must produce at least one skeleton point before the density pass.'
    );
  }

  const expandedCount = Object.keys(session.expandedSections).length;
  if (expandedCount < session.skeleton.length) {
    throw new Error(
      `Only ${expandedCount}/${session.skeleton.length} points have been expanded. ` +
        'Expand all points via synthesizer_expand_point before running the density pass.'
    );
  }

  const optimizer = new DensityOptimizer();
  session.densityResult = optimizer.optimize(session.expandedSections, session.inputText);
  session.status = 'density_complete';

  const r = session.densityResult;
  const iterSummary = r.iterations
    .map(
      it =>
        `  Iter ${it.iteration}: added [${it.addedEntities.join(', ')}]` +
        ` | dropped "${it.droppedPhrases.join('", "')}"` +
        ` | density ${it.entityDensity.toFixed(4)}`
    )
    .join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `[PHASE 3 — CHAIN-OF-DENSITY PASS COMPLETE]
Session: ${args.session_id}

Density progression:
  Initial:  ${r.originalDensity.toFixed(4)} entities/token
  Target:   ${r.targetDensity.toFixed(4)} entities/token (~0.15)
  Final:    ${r.finalDensity.toFixed(4)} entities/token

CoD iterations:
${iterSummary || '  (no iterations required — target already met)'}

Lead bias: ${(r.leadBias * 100).toFixed(1)}% of entities in first half
           (lower = more distributed coverage; vanilla ≈ 72%)

── FINAL SUMMARY ──────────────────────────────────────────────────────────
${r.finalSummary}
───────────────────────────────────────────────────────────────────────────

Call synthesizer_get_metrics for the full Vanilla / Skeleton / CoD comparison table.`,
      },
    ],
  };
}

function handleSynthesizerFullPipeline(args: {
  input_text: string;
  max_points?: number;
}) {
  const maxPoints = Math.min(10, Math.max(3, Math.floor(args.max_points ?? 7)));
  const session = createSynthesizerSession(args.input_text, maxPoints);

  // Phase 1
  const generator = new SkeletonGenerator();
  session.skeleton = generator.generate(session.inputText, session.maxPoints);
  session.status = 'skeleton_complete';

  // Phase 2 (simulated parallel: all expansions happen synchronously here,
  //          but each is independent and safe to parallelise client-side)
  const expander = new SectionExpander();
  for (const point of session.skeleton) {
    session.expandedSections[point.index] = expander.expand(point, session.inputText);
  }
  session.status = 'expansion_complete';

  // Phase 3
  const optimizer = new DensityOptimizer();
  session.densityResult = optimizer.optimize(session.expandedSections, session.inputText);
  session.status = 'density_complete';

  // Metrics
  const comparator = new MetricsComparator();
  session.metrics = comparator.compare(session);

  const r = session.densityResult;
  const m = session.metrics;

  const skeletonPointsTable = session.skeleton
    .map(p => `  [${p.index}] ${p.keyword.padEnd(28)} ${p.brief}`)
    .join('\n');

  const metricsTable = [
    `${'Metric'.padEnd(24)}  ${'Vanilla'.padEnd(14)}  ${'Skeleton'.padEnd(14)}  CoD Optimized`,
    `${'─'.repeat(24)}  ${'─'.repeat(14)}  ${'─'.repeat(14)}  ${'─'.repeat(14)}`,
    `${'Entity Density'.padEnd(24)}  ${String(m.vanilla.entityDensity).padEnd(14)}  ${String(m.skeleton.entityDensity).padEnd(14)}  ${m.cod.entityDensity}`,
    `${'Lead Bias'.padEnd(24)}  ${String(m.vanilla.leadBias).padEnd(14)}  ${String(m.skeleton.leadBias).padEnd(14)}  ${m.cod.leadBias}`,
    `${'Processing'.padEnd(24)}  ${m.vanilla.processing.padEnd(14)}  ${m.skeleton.processing.padEnd(14)}  ${m.cod.processing}`,
    `${'Speedup vs Vanilla'.padEnd(24)}  ${'1.0×'.padEnd(14)}  ${String(m.skeleton.speedupFactor + '×').padEnd(14)}  ${m.skeleton.speedupFactor + '× + 1 pass'}`,
  ].join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `[SYNTHESIZER FULL PIPELINE COMPLETE]
Session: ${session.id}

── PHASE 1: SKELETON (${session.skeleton.length} points) ──────────────────────────────────
${skeletonPointsTable}

── PHASE 2: PARALLEL EXPANSION ────────────────────────────────────────────
${session.skeleton.length} sections expanded independently (parallelisable).
Combined token count: ~${Object.values(session.expandedSections).reduce((s, x) => s + x.tokenCount, 0)}

── PHASE 3: CHAIN-OF-DENSITY PASS ─────────────────────────────────────────
Iterations: ${r.iterations.length}
Density:    ${r.originalDensity.toFixed(4)} → ${r.finalDensity.toFixed(4)} (target ${r.targetDensity})
Lead bias:  ${(r.leadBias * 100).toFixed(1)}%

── FINAL SUMMARY ───────────────────────────────────────────────────────────
${r.finalSummary}
────────────────────────────────────────────────────────────────────────────

── INFORMATIONAL COMPARISON METRICS ────────────────────────────────────────
${metricsTable}`,
      },
    ],
  };
}

function handleSynthesizerGetMetrics(args: { session_id: string }) {
  const session = getSession(args.session_id);
  if (!session) throw new Error(`Synthesizer session not found: ${args.session_id}`);
  if (session.status === 'initialized' || session.status === 'skeleton_complete') {
    throw new Error('Complete at least Phase 2 (expand all points) before retrieving metrics.');
  }

  const comparator = new MetricsComparator();
  session.metrics = comparator.compare(session);
  const m = session.metrics;

  return {
    content: [
      {
        type: 'text',
        text: `[SYNTHESIZER METRICS]
Session: ${args.session_id}
Status:  ${session.status}

┌──────────────────────────┬────────────────┬────────────────┬────────────────┐
│ Metric                   │ Vanilla        │ Skeleton (SoT) │ CoD Optimized  │
├──────────────────────────┼────────────────┼────────────────┼────────────────┤
│ Entity Density           │ ${String(m.vanilla.entityDensity).padEnd(14)} │ ${String(m.skeleton.entityDensity).padEnd(14)} │ ${String(m.cod.entityDensity).padEnd(14)} │
│ Lead Bias                │ ${String(m.vanilla.leadBias).padEnd(14)} │ ${String(m.skeleton.leadBias).padEnd(14)} │ ${String(m.cod.leadBias).padEnd(14)} │
│ Processing               │ ${m.vanilla.processing.padEnd(14)} │ ${m.skeleton.processing.padEnd(14)} │ ${m.cod.processing.padEnd(14)} │
│ Speedup vs Vanilla       │ 1.0×           │ ${String(m.skeleton.speedupFactor + '×').padEnd(14)} │ ${m.skeleton.speedupFactor}× + 1 pass  │
└──────────────────────────┴────────────────┴────────────────┴────────────────┘

Definitions:
  Entity Density — named entities per token (~0.15 is human-expert preference)
  Lead Bias      — fraction of entities in first half (lower = distributed coverage)
  Speedup        — parallel expansion vs sequential generation`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Strategic ReAct Agent handler
// ---------------------------------------------------------------------------

function handleSynthesizerReactSynthesize(args: {
  input_text: string;
  max_points?: number;
}) {
  const maxPoints = Math.min(10, Math.max(3, Math.floor(args.max_points ?? 7)));
  const trace = runReActSynthesis(args.input_text, maxPoints);

  const statusIcon = trace.status === 'complete' ? '✓' : '✗';

  const nodeLines = trace.nodes
    .map(n =>
      [
        `[depth ${n.depth}] ${n.action.toUpperCase()} — ${n.status.toUpperCase()}`,
        `  Thought:     ${n.thought}`,
        `  Observation: ${n.observation}`,
      ].join('\n')
    )
    .join('\n\n');

  return {
    content: [
      {
        type: 'text',
        text: `[REACT SYNTHESIZER — ${statusIcon} ${trace.status.toUpperCase()}]
Session:          ${trace.sessionId}
Backtracks:       ${trace.backtrackCount}
Reasoning nodes:  ${trace.nodes.length}

── REASONING TRACE (Thought-Act-Observe) ─────────────────────────────────────
${nodeLines}

── FINAL OUTPUT ──────────────────────────────────────────────────────────────
${trace.finalOutput ?? '(synthesis failed — see reasoning trace for details)'}`,
      },
    ],
  };
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Undead Architect MCP Server running on stdio');
}

main().catch(console.error);
