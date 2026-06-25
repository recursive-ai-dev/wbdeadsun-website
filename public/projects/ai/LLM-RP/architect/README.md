# Undead Architect MCP Server

Strategic Intelligence Synthesis and Cross-Domain Knowledge Extraction via Model Context Protocol.

## Overview

The Undead Architect is the second persona in the Undead Legion — a research-grade synthesis engine that transforms raw data into auditable intelligence blueprints. This MCP server implements the 6-phase synthesis protocol:

1. **Abstraction** (Step-Back) — Extract fundamental principles
2. **Skeleton** — Identify cross-domain nexus points
3. **Exploration** (Tree-of-Thoughts) — Generate multiple interpretations
4. **Evaluation** — Metacognitive critique and verification
5. **Synthesis** — Produce final intelligence product
6. **Calibration** — Uncertainty quantification and gap identification

## Installation

```bash
npm install -g undead-architect-mcp
```

## Configuration

### For Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "undead-architect": {
      "command": "node",
      "args": ["/path/to/undead-architect-mcp/dist/index.js"]
    }
  }
}
```

### For Kilo Code

```json
{
  "mcpServers": {
    "undead-architect": {
      "command": "architect-mcp",
      "args": []
    }
  }
}
```

## Tools

### `architect_open_synthesis`
Initialize a new strategic synthesis session.

**Parameters:**
- `dataset_description` (string): Description of the dataset
- `domains` (string[]): Domains spanned: technical, economic, political, social, environmental, legal, ethical, temporal
- `stakes` (string, optional): What decisions depend on this analysis
- `audience` (string, optional): SME, Executive, Technical, Mixed
- `constraints` (object, optional): time_horizon, confidence_threshold, max_tokens

### `architect_step_back`
Execute Phase I: Abstraction. Extract fundamental principles.

### `architect_skeleton`
Execute Phase II: Skeleton Generation. Identify 5 critical nexus points.

### `architect_tot_explore`
Execute Phase III: Tree-of-Thoughts. Generate 3 paths per nexus.

### `architect_evaluate`
Execute Phase IV: Metacognitive Evaluation. Critique and verify paths.

### `architect_synthesize`
Execute Phase V: Synthesis. Produce final intelligence product.

### `architect_calibrate`
Execute Phase VI: Calibration. Quantify uncertainty.

### `architect_full_synthesis`
Run complete 6-phase pipeline in one call.

### `architect_red_team`
Stress-test an existing conclusion with adversarial analysis.

### `architect_cross_domain_extract`
Extract non-obvious insights from technical datasets.

### `architect_retrieve_synthesis`
Retrieve complete output and audit trail.

## The 5D Strategic Tensor

The Architect's reasoning is powered by a 5-dimensional tensor:

```
T_strategy ∈ ℝ^{128 × D × 16 × 5 × 4 × 2}

E = 128  — Evidence dimensions
D = 8    — Domain axes
T = 16   — Time horizons
C = 5    — Confidence tiers
V = 4    — Verification states
× 2      — Dual (forward/backward)
```

**Forward Tensor (T⁺)**: Propagates evidence to conclusions
**Backward Tensor (T⁻)**: Propagates critique back to evidence

## Integration with Undead Legion

| Persona | Role | Architect Integration |
|---------|------|----------------------|
| Berserker | Debug execution | Architect designs verification protocols |
| Warlock | Graph exploration | Architect defines exploration constraints |
| Bard | Documentation | Architect structures knowledge architecture |
| Hound | Verification | Architect designs verification pipelines |
| Dragon | Orchestration | Architect designs coordination protocols |

## Example Usage

```typescript
// Initialize synthesis
const session = await client.callTool('architect_open_synthesis', {
  dataset_description: 'Supply chain performance data Q1-Q4',
  domains: ['technical', 'economic', 'temporal'],
  stakes: '$50M infrastructure investment decision',
  audience: 'Executive'
});

// Run full synthesis
const result = await client.callTool('architect_full_synthesis', {
  dataset: rawData,
  dataset_description: 'Supply chain performance data',
  domains: ['technical', 'economic', 'temporal']
});
```

## Architecture

```
architect-mcp-server/
├── src/
│   ├── index.ts      # MCP server implementation
│   ├── types.ts      # TypeScript definitions
│   ├── engine.ts     # 6-phase synthesis engine
│   └── tensor.ts     # 5D Strategic Tensor
├── dist/             # Compiled JavaScript
├── package.json
└── tsconfig.json
```

## License

Apache-2.0

---

*Undead Architect // Black Codex v1.1.0*
*"Design the reasoning before the conclusion."*
