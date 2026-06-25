// Type definitions for the Undead Architect MCP Server

export type Domain = 
  | 'technical' 
  | 'economic' 
  | 'political' 
  | 'social' 
  | 'environmental' 
  | 'legal' 
  | 'ethical' 
  | 'temporal';

export type ConfidenceTier = 'certain' | 'high' | 'moderate' | 'low' | 'speculative';
export type VerificationState = 'verified' | 'partially_verified' | 'unverified' | 'contradicted';
export type TimeHorizon = 'immediate' | 'tactical' | 'operational' | 'strategic';

export interface SynthesisSession {
  id: string;
  datasetDescription: string;
  domains: Domain[];
  stakes: string;
  audience: string;
  constraints: {
    time_horizon?: string;
    confidence_threshold?: number;
    max_tokens?: number;
  };
  createdAt: string;
  phases: {
    stepBack?: StepBackResult;
    skeleton?: SkeletonResult;
    tot?: Record<number, ToTResult>;
    evaluation?: EvaluationResult;
    synthesis?: SynthesisResult;
    calibration?: CalibrationResult;
  };
  tensor: StrategicTensor;
  status: SessionStatus;
}

export type SessionStatus = 
  | 'initialized' 
  | 'abstraction_complete' 
  | 'skeleton_complete' 
  | 'evaluation_complete' 
  | 'synthesis_complete' 
  | 'complete';

export interface StrategicTensor {
  dimensions: {
    evidence: number;      // 128
    domains: number;       // 8
    time: number;          // 16
    confidence: number;    // 5
    verification: number;  // 4
    dual: number;          // 2
  };
  forward: Float32Array;  // T⁺ tensor
  backward: Float32Array; // T⁻ tensor
}

export interface StepBackResult {
  principles: {
    thermodynamic: string;
    gameTheoretic: string;
    network: string;
    systems: string;
    epistemic: string;
  };
  timestamp: string;
}

export interface NexusPoint {
  domainA: Domain;
  domainB: Domain;
  description: string;
  primaryEvidence: string;
  misinterpretationRisk: string;
  confidence: number;
}

export interface SkeletonResult {
  nexusPoints: NexusPoint[];
  timestamp: string;
}

export interface StrategicPath {
  type: 'convergent' | 'adversarial' | 'black_swan';
  interpretation: string;
  evidence: string;
  implications: string;
  confidence: number;
}

export interface ToTResult {
  nexus: NexusPoint;
  paths: StrategicPath[];
  timestamp: string;
}

export interface PathFailure {
  path: string;
  criterion: string;
  reason: string;
}

export interface EvaluationResult {
  totalPaths: number;
  passedPaths: number;
  failedPaths: number;
  failures: PathFailure[];
  verifiedPaths: StrategicPath[];
  timestamp: string;
}

export interface Risk {
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: 'certain' | 'likely' | 'possible' | 'unlikely';
  mitigation: string;
}

export interface SynthesisResult {
  executiveSummary: string;
  correlations: Array<{
    nexus: string;
    evidence: string;
    interpretation: string;
    confidence: number;
  }>;
  risks: Risk[];
  actions: {
    immediate: string;
    tactical: string;
    strategic: string;
  };
  auditTrail: {
    assumptions: string[];
    gaps: string[];
    ragTriggers: string[];
  };
  timestamp: string;
}

export interface LogicalGap {
  description: string;
  evidenceNeeded: string;
}

export interface RAGTrigger {
  description: string;
  sources: string;
  queries: string;
}

export interface CalibrationResult {
  overallConfidence: number;
  breakdown: {
    evidenceQuality: number;
    reasoningSoundness: number;
    domainCoverage: number;
    temporalStability: number;
  };
  gaps: LogicalGap[];
  ragTriggers: RAGTrigger[];
  revisionConditions: {
    full: string;
    partial: string;
    monitoring: string;
  };
  timestamp: string;
}

export interface CrossDomainSignal {
  sourceDomain: Domain;
  targetDomain: Domain;
  strength: number;
  confidence: number;
  mechanism?: string;
}

export interface RedTeamResult {
  weakestLink: string;
  counterArguments: string[];
  falsificationPathways: string[];
  probabilityOfError: string;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// High-Density Parallelized Synthesizer (SoT + CoD) — re-exported for consumers
// ---------------------------------------------------------------------------
export type {
  SkeletonPoint,
  ExpandedSection,
  CoDIteration,
  DensityResult,
  SynthesizerMetrics,
  SynthesizerSession,
} from './synthesizer.js';
