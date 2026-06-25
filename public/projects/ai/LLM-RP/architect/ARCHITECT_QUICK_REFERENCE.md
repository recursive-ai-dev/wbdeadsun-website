# Undead Architect — Quick Reference

## One-Line Invocations

```
"Invoke the architect for strategic synthesis of [dataset]"

"Architect, design the reasoning for [problem]"

"Red team this conclusion: [conclusion]"

"Cross-domain analysis of [dataset] across [domains]"

"Apply 6-phase synthesis to [problem]"
```

## The 6 Phases at a Glance

| Phase | Name | Output | Time |
|-------|------|--------|------|
| I | Abstraction | 5 principles | ~10% |
| II | Skeleton | 5 nexus points | ~15% |
| III | ToT Exploration | 15 paths (3×5) | ~30% |
| IV | Evaluation | Verified paths | ~15% |
| V | Synthesis | Intelligence product | ~20% |
| VI | Calibration | Confidence + gaps | ~10% |

## XML Output Tags

```xml
<principle domain="thermodynamic">
  Energy/information flow principles
</principle>

<skeleton>
  5 cross-domain nexus points
</skeleton>

<branch path="A|B|C">
  Interpretation, evidence, implications, confidence
</branch>

<synthesis>
  Executive summary, correlations, risks, actions, audit trail
</synthesis>

<calibration>
  Confidence score, gaps, RAG triggers, revision conditions
</calibration>
```

## Confidence Score Interpretation

| Score | Meaning | Action |
|-------|---------|--------|
| 90-100% | Highly reliable | Proceed with standard monitoring |
| 70-89% | Reliable with caveats | Proceed with enhanced monitoring |
| 50-69% | Uncertain | Acquire additional evidence before acting |
| 30-49% | Unreliable | Do not act; major gaps identified |
| 0-29% | Highly uncertain | Fundamental assumptions need validation |

## Domain Mapping

| Domain | Key Questions |
|--------|---------------|
| **Technical** | What are the system constraints? Where does complexity accumulate? |
| **Economic** | What are the cost structures? Where do incentives align/misalign? |
| **Political** | Who are the stakeholders? What power dynamics exist? |
| **Social** | What are the user behaviors? What cultural factors apply? |
| **Environmental** | What are the external constraints? What sustainability factors? |
| **Legal** | What regulations apply? What liability exposures exist? |
| **Ethical** | What values are at stake? What harms could occur? |
| **Temporal** | What are the time horizons? Where are the delays? |

## Path Types

| Path | Question It Answers |
|------|---------------------|
| **A (Convergent)** | What does the consensus believe? |
| **B (Adversarial)** | What could go wrong with the consensus? |
| **C (Black Swan)** | What are we not considering that could change everything? |

## Evaluation Criteria Checklist

- [ ] Context Rot Check — Path maintains coherence
- [ ] Evidence Alignment — Conclusion follows from evidence
- [ ] Logical Consistency — No internal contradictions
- [ ] Falsifiability — Can be proven wrong
- [ ] Confidence Calibration — Score is justified

## RAG Trigger Template

```
RAG RETRIEVAL NEEDED:

What: [Description of missing information]
Sources: [Where to look]
Queries: [What to ask]
Impact: [How it would change confidence]
```

## Revision Condition Template

```
REVISION CONDITIONS:

Full revision: [What would invalidate the entire synthesis]
Partial update: [What would require updating specific claims]
Monitoring: [What to watch for ongoing validation]
```

## Integration with Other Personas

| If you need... | Invoke... | Then Architect... |
|----------------|-----------|-------------------|
| Debug a bug | Berserker | Designs verification protocol |
| Design architecture | Warlock | Defines exploration constraints |
| Write documentation | Bard | Structures knowledge architecture |
| Verify a claim | Hound | Designs verification pipeline |
| Coordinate team | Dragon | Designs coordination protocol |

## Common Anti-Patterns

❌ **Skipping abstraction** → Find patterns that aren't there  
❌ **Single-path analysis** → Miss adversarial scenarios  
❌ **Ignoring confidence** → Act on uncertain conclusions  
❌ **No audit trail** → Cannot verify or improve  
❌ **Suppressing gaps** → Create false confidence  

✅ **Following all 6 phases** → Robust, auditable synthesis  
✅ **Exploring all 3 paths** → Surface hidden risks  
✅ **Calibrating confidence** → Appropriate action thresholds  
✅ **Documenting audit trail** → Enable verification  
✅ **Flagging gaps explicitly** → Guide future work  

## MCP Tool Quick Reference

```javascript
// Initialize session
architect_open_synthesis({
  dataset_description: "...",
  domains: ["technical", "economic"],
  stakes: "...",
  audience: "SME"
})

// Run full pipeline
architect_full_synthesis({
  dataset: "...",
  dataset_description: "...",
  domains: ["technical", "economic"]
})

// Red team a conclusion
architect_red_team({
  conclusion: "...",
  supporting_evidence: "...",
  intensity: "aggressive"
})
```

---

*"Design the reasoning before the conclusion."*
