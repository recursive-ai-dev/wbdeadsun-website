# Undead Architect — Complete Package

## Overview

This package implements the **Undead Architect** — a research-grade strategic intelligence synthesis engine that integrates with your existing Undead Legion framework. The Architect applies the 6-phase synthesis protocol (CO-STAR-A-RISEN + Tree-of-Thoughts + Step-Back + Reflexion) powered by a 5D Strategic Tensor.

## Package Contents

### Core Documentation

| File | Purpose |
|------|---------|
| `ARCHITECT_CODEX.md` | Complete character codex with lore, skill tree, dialog trees, case studies |
| `SKILL_ARCHITECT.md` | Skill definition for Claude/Kilo Code integration |
| `ARCHITECT_QUICK_REFERENCE.md` | One-page quick reference for common operations |
| `LEGION_INTEGRATION_GUIDE.md` | How Architect integrates with Berserker, Bard, Warlock, Hound, Dragon |

### MCP Server Implementation

```
architect-mcp-server/
├── package.json          # NPM package configuration
├── tsconfig.json         # TypeScript configuration
├── README.md             # Server documentation
└── src/
    ├── index.ts          # Main MCP server (11 tools)
    ├── types.ts          # TypeScript type definitions
    ├── engine.ts         # 6-phase synthesis engine
    └── tensor.ts         # 5D Strategic Tensor implementation
```

## The 6-Phase Synthesis Protocol

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGIC SYNTHESIS PIPELINE                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  PHASE I    │───→│  PHASE II   │───→│  PHASE III  │         │
│  │ Abstraction │    │   Skeleton  │    │     ToT     │         │
│  │  (Step-Back)│    │  (5 Nexus)  │    │(3 Paths×5)  │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                   │                   │                │
│        ▼                   ▼                   ▼                │
│   <principle>          <skeleton>          <branch>            │
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  PHASE IV   │───→│   PHASE V   │───→│  PHASE VI   │         │
│  │ Evaluation  │    │  Synthesis  │    │ Calibration │         │
│  │(Metacognitive)│   │  (Answer)   │    │(Confidence) │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│        │                   │                   │                │
│        ▼                   ▼                   ▼                │
│   Pass/Fail          <synthesis>          <calibration>        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## MCP Tools Provided

| Tool | Purpose |
|------|---------|
| `architect_open_synthesis` | Initialize new synthesis session |
| `architect_step_back` | Phase I: Extract fundamental principles |
| `architect_skeleton` | Phase II: Identify 5 critical nexus points |
| `architect_tot_explore` | Phase III: Generate 3 paths per nexus |
| `architect_evaluate` | Phase IV: Metacognitive critique |
| `architect_synthesize` | Phase V: Produce intelligence product |
| `architect_calibrate` | Phase VI: Uncertainty quantification |
| `architect_full_synthesis` | Run complete 6-phase pipeline |
| `architect_red_team` | Adversarial stress-testing |
| `architect_cross_domain_extract` | Extract cross-domain insights |
| `architect_retrieve_synthesis` | Retrieve complete audit trail |

## The 5D Strategic Tensor

```
T_strategy ∈ ℝ^{128 × D × 16 × 5 × 4 × 2}

Dimensions:
├── E = 128  — Evidence (raw signal)
├── D = 8    — Domain [Technical|Economic|Political|Social|Environmental|Legal|Ethical|Temporal]
├── T = 16   — Time horizon [Immediate|Tactical|Operational|Strategic] × granularity
├── C = 5    — Confidence [Certain|High|Moderate|Low|Speculative]
├── V = 4    — Verification [Verified|Partially Verified|Unverified|Contradicted]
└── × 2      — Dual: T⁺ (forward) + T⁻ (backward)

Operations:
├── Forward synthesis: σ(T⁺ · evidence) × domain_weight × temporal_decay
├── Backward critique: Σ(T⁻ ⊙ verification_mask) / Σ(verification_mask)
└── Fused synthesis: T⁺ ⊙ (1 + σ(T⁻))
```

## Installation

### 1. Install MCP Server

```bash
cd architect-mcp-server
npm install
npm run build
```

### 2. Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "undead-architect": {
      "command": "node",
      "args": ["/path/to/architect-mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Add Skill to Project

Copy `SKILL_ARCHITECT.md` to your project's `.kimi/skills/` directory or add to Claude's project knowledge.

## Usage Examples

### Example 1: Strategic Synthesis

```
User: "Invoke the architect for strategic synthesis of our Q3 supply chain data"

Architect: [ARCHITECT MANIFESTS]

You have requested strategic intelligence synthesis.

Before she can design your synthesis, she needs:

1. THE DATASET → [User pastes data]
2. THE DOMAINS → technical, economic, temporal
3. THE STAKES → $50M infrastructure decision
4. THE AUDIENCE → Executive
5. THE CONSTRAINTS → 30-day decision window

[Architect runs 6-phase synthesis]

<synthesis>
=== EXECUTIVE SUMMARY ===
Analysis identified 5 cross-domain correlations with average 
confidence of 78%. 2 high-severity risks require immediate attention. 
Primary recommendation: validate correlations experimentally before 
making strategic commitments.

[Full synthesis output follows...]
</synthesis>

<calibration>
OVERALL CONFIDENCE SCORE: 73%

LOGICAL GAPS IDENTIFIED:
  1. Causal mechanism verification
     Evidence needed: Experimental data

RAG RETRIEVAL TRIGGERS:
  - Historical correlation breakdown events
  - Domain expert validation
</calibration>
```

### Example 2: Red Team Analysis

```
User: "Red team this conclusion: Our new encryption is unbreakable"

Architect: [RED TEAM ANALYSIS - INTENSITY: STANDARD]

CONCLUSION UNDER STRESS-TEST:
"Our new encryption is unbreakable"

WEAKEST LINK:
The claim relies on the assumption that the implementation 
matches the specification. Implementation bugs are common.

COUNTER-ARGUMENTS:
  1. Side-channel attacks not considered
  2. Quantum computing timeline underestimated
  3. Insider threat not modeled

FALSIFICATION PATHWAYS:
  1. Independent security audit
  2. Bug bounty program
  3. Formal verification of implementation

PROBABILITY OF ERROR: 25-40%
```

### Example 3: Cross-Domain Extraction

```
User: "Extract cross-domain insights from this technical dataset"

Architect: [CROSS-DOMAIN KNOWLEDGE EXTRACTION]

Source domains: technical, temporal
Target domains: economic, risk

EXTRACTED SIGNALS:
  1. technical → economic
     Strength: 85.3%
     Confidence: 78.2%
     
  2. temporal → risk
     Strength: 72.1%
     Confidence: 81.4%

IDENTIFIED GAPS:
  1. Missing longitudinal data for causal inference
  2. Insufficient cross-domain correlation metrics
```

## Integration with Existing Berserker

```
┌─────────────────────────────────────────────────────────────┐
│                    BERSERKER × ARCHITECT                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BERSERKER                          ARCHITECT                │
│  ─────────                          ────────                 │
│                                                              │
│  Debug bug  ──────────────────────→  Design verification     │
│  Find root cause                    protocol                 │
│                                      │                       │
│  Apply fix ←─────────────────────────┘                       │
│                                                              │
│  Postmortem  ─────────────────────→  Synthesize learnings    │
│                                      Abstract principles     │
│                                      Design prevention       │
│                                      Calibrate confidence    │
│                                      │                       │
│  Update ritual law ←─────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Audit Trail
Every synthesis produces a complete audit trail:
- Principles extracted
- Nexus points identified
- Paths explored and evaluated
- Assumptions made
- Gaps identified
- RAG triggers flagged

### 2. Confidence Calibration
Uncertainty is quantified, not hidden:
- Overall confidence score (0-100%)
- Breakdown by evidence, reasoning, coverage, stability
- Logical gaps with closure criteria
- Revision conditions

### 3. Adversarial Analysis
Built-in red teaming:
- Convergent, adversarial, and black swan paths
- Automatic evaluation of reasoning failures
- Falsification pathway identification
- Probability of error estimation

### 4. Cross-Domain Projection
Find non-obvious correlations:
- 5D tensor for multi-domain reasoning
- Signal amplification across domain boundaries
- Gap identification for missing coverage

## Comparison: Berserker vs Architect

| Aspect | Berserker | Architect |
|--------|-----------|-----------|
| **Purpose** | Fix bugs | Design analysis |
| **Mode** | Execute | Design |
| **Output** | Patches | Synthesis |
| **Reasoning** | Linear | Multi-phase |
| **Time** | Now | Future |
| **Tensor** | 4D Dual | 5D Strategic |
| **Protocol** | Logic Shards | 6-Phase Synthesis |
| **Confidence** | High (must fix) | Calibrated (must validate) |
| **Integration** | Receives protocols | Designs protocols |

## File Structure Summary

```
output/
├── ARCHITECT_CODEX.md              # Complete character codex
├── SKILL_ARCHITECT.md              # Skill definition for Claude
├── ARCHITECT_QUICK_REFERENCE.md    # One-page reference
├── LEGION_INTEGRATION_GUIDE.md     # Cross-persona integration
├── README_ARCHITECT_PACKAGE.md     # This file
└── architect-mcp-server/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    └── src/
        ├── index.ts                # MCP server (11 tools)
        ├── types.ts                # Type definitions
        ├── engine.ts               # 6-phase engine
        └── tensor.ts               # 5D tensor implementation
```

## Next Steps

1. **Install the MCP server** following the instructions above
2. **Add SKILL_ARCHITECT.md** to your project knowledge
3. **Test with a sample dataset** using `architect_full_synthesis`
4. **Integrate with Berserker** for debug-synthesis workflows
5. **Extend with Warlock, Bard, Hound, Dragon** for full Legion coordination

## Version

- **Architect Codex**: v1.1.0
- **MCP Server**: v1.0.0
- **Compatible with**: Berserker v1.0.0+

## License

MIT

---

*"Design the reasoning before the conclusion."*
*— Undead Architect*
