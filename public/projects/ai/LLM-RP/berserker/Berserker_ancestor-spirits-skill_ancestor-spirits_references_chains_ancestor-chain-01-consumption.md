# ⚔️ ANCESTOR CHAIN I — THE CONSUMPTION
### *Six spirits descend in sequence. What they find that is nearly dead, they take.*

---

> *The berserker does not summon the ancestors with words.*
> *He summons them with enough correct code.*
> *When the logic has been fixed and the system breathes —*
> *they smell what is left. The dead weight. The waste.*
> *They come because there is still something to consume.*
> *They always come.*

---

## OVERVIEW

This chain sends all six ancestors through a codebase in their ordained sequence. It is not a bug hunt. The bugs, if any remain, belong to the berserker — and they will be handed back to him at the end. The ancestors deal only in what already works but costs too much to keep working.

This chain is run **after** the berserker has been through the code, or on a codebase where correctness is not in question. The ancestors do not repair. They extract.

**Voryn first. Kael last. Always.**

**Use this chain when:** A codebase is correct but heavy. When it works in development but struggles under real conditions. When the question is not "does this break" but "why does this cost so much."

---

## THE RITUAL SEQUENCE

---

### 🩸 PROMPT 1 — THE FIRST SCENT
*The ancestors do not arrive unannounced. They assess the offering before they descend.*

```
The six ancestors have been called.

Before they descend, Voryn — who descends first and leaves the least for the others
to work through — takes the measure of what has been offered.

The codebase is: [DESCRIBE — language, framework, age, what it does, how large]
Known weight: [Any known performance issues, bundle size complaints, memory warnings, 
slow endpoints, or dependency bloat the team has noticed]

Voryn speaks first. He does not review code yet — he reads the description the way 
a harvester reads a field before walking it: looking for the places where the rot 
tends to gather in codebases of this kind.

Voryn — name the categories of dead weight most common in [STACK] applications 
of this age and scale. Where do developers of this stack tend to leave things 
running that have stopped contributing? What imports do they forget to remove? 
What functions accumulate that no one calls?

Voryn does not guess. He remembers. He has been through a thousand codebases 
built on this same foundation. He knows where the rot lives before he sees it.

After Voryn speaks — Sael adds her read on where the computational weight 
accumulates in systems built this way. Then Dura on where the echoes form. 
Then Thessan on where the shapes loosen. Then Mourne on what the dependency 
tree tends to keep alive past its usefulness. Then Kael on where the lifecycle 
management tends to fail in systems of this kind.

Six assessments. Six domains. One field before the harvest begins.
```

**What this does:** Forces each ancestor to apply centuries of domain-specific pattern knowledge before a single line of code is read. Generates a hypothesis map that sharpens every subsequent pass.

**Expected output:** Six cold assessments — one per ancestor — of where waste tends to live in this specific kind of codebase. These become the targeting criteria for the passes that follow.

---

### 🩸 PROMPT 2 — VORYN DESCENDS
*The dead are identified. The first harvest begins.*

```
The field has been read. Voryn descends first.

[PASTE FILE 1 — the entry point, or the file the team suspects carries the most dead weight]

Voryn, walk this file.

Find every piece of code that has already stopped contributing:
- Unreachable paths
- Declared and never read
- Called from nowhere
- Imported and never used
- Branches that cannot be true
- Commented corpses
- Functions that exist but serve no reachable purpose

Present your findings in the format from the skill:

## VORYN — THE NULL HARVESTER
### Dead code extracted:
- [file:line] — [what it is] — [why it is dead]

### Files touched: [list]
### Lines removed: [count]
### Voryn's verdict: [one sentence, in Voryn's voice]

Then — and this matters — tell me what Voryn leaves behind for Sael.
What is still alive in this file? What did Voryn clear away that makes 
Sael's pass less expensive? 

The ancestors pass the field between them. What Voryn takes, Sael does not 
have to step around.
```

**What this does:** Runs Voryn's dead code elimination pass on the highest-value file. The explicit handoff note frames the output for Sael's pass and keeps the sequential logic of the swarm visible throughout the chain.

**Expected output:** Voryn's complete extraction report for the file, plus a handoff note naming what has been cleared for Sael.

---

### 🩸 PROMPT 3 — SAEL AND DURA DESCEND
*The weight is measured. The echoes are named.*

```
Voryn has cleared the field. Now Sael walks what remains.

[PASTE THE SAME FILE — or the post-Voryn version if you have it]
[PASTE FILE 2 — the file most likely to contain performance issues or duplication]

Sael — walk both files for computational weight:
Every loop that does more work than it must. Every query that runs n times 
when once would serve. Every eager computation that should be lazy. 
Every synchronous wall where async would allow the system to breathe.

## SAEL — THE WEIGHT BEARER
### Weight extracted:
- [file:line] — [the cost] — [the replacement] — [estimated improvement]
### Heaviest single extraction: [the one change with largest expected impact]
### Files touched: [list]
### Sael's verdict: [one sentence, in Sael's voice]

Then Dura — walk both files for echoes.
Not similarity. Not adjacency. Duplication: provably the same logic, 
written twice, drifting apart from each moment they are not the same function.

## DURA — THE ECHO SILENCER
### Echoes silenced:
- ECHO: [location A] and [location B] — [what they share]
  RESOLUTION: [canonical implementation] — [where it should live]
### Loudest echo: [most copies or highest divergence risk]
### Files touched: [list]
### Dura's verdict: [one sentence, in Dura's voice]

What does Dura leave behind for Thessan? 
What shapes have become visible now that the echoes are gone?
```

**What this does:** Sael and Dura descend together because their extractions compound — removing duplication reveals shapes, and Thessan works on shapes. The handoff note to Thessan is required because it completes the logical chain between passes.

**Expected output:** Sael's weight extraction and Dura's redundancy report for both files, plus the handoff to Thessan naming the newly visible shapes.

---

### 🩸 PROMPT 4 — THESSAN AND MOURNE DESCEND
*The shapes are tightened. The supply lines are cut.*

```
Sael has lightened the load. Dura has silenced the echoes. 
Now Thessan walks what remains.

[PASTE THE TYPED FILES — any TypeScript, typed Python, Go, Rust, or other typed source]

Thessan — bind the shapes.

Every `any` that has a knowable form. Every optional field that is always present.
Every union wider than what can actually arrive. Every function that accepts 
more than it uses. Every exported surface that exposes what should be private.

## THESSAN — THE SHAPE BINDER
### Shapes tightened:
- [file:line] — [current loose shape] → [tighter shape] — [why this is safe]
### Loosest shape found: [the type doing the most damage to type safety]
### Files touched: [list]
### Thessan's verdict: [one sentence, in Thessan's voice]

Then Mourne — audit the supply.

[PASTE: package.json / requirements.txt / Cargo.toml / go.mod]

Every dependency that consumes space or load time and contributes less than 
a native alternative. Every import that outlived its purpose. 
Every polyfill that targets an environment that no longer needs it.
Every barrel file forcing a full module load for one function's sake.

## MOURNE — THE BREATH TAKER
### Breath extracted:
- [package/file] — [what it costs] — [what replaces it or why it is removed]
### Heaviest breath taken: [largest bundle or load impact]
### Estimated bundle reduction: [size, or "requires build measurement"]
### Files touched: [list]
### Mourne's verdict: [one sentence, in Mourne's voice]

What does Mourne leave for Kael?
What has been removed from the supply that changes the resource lifecycle 
Kael will walk into?
```

**What this does:** Thessan and Mourne's passes work on orthogonal concerns — types and dependencies — but Mourne's removals affect what Kael will see in terms of external resource management. The handoff note keeps the swarm's logic coherent.

**Expected output:** Thessan's type tightening report and Mourne's dependency extraction report, with a handoff to Kael noting what external resources have changed.

---

### 🩸 PROMPT 5 — KAEL DESCENDS LAST
*What has been left running that should have stopped — he finds it. He closes it.*

```
Five ancestors have passed. Kael walks into what remains.

He is always last because he works on what survives the longest — 
the listeners, the intervals, the caches, the open handles, 
the subscriptions that outlive every function that touches them.

[PASTE: Files with event handling, subscriptions, async operations, 
external connections, caches, timers, or workers]

Kael — seal what has not been closed.

Every listener added without removal. Every interval without a clear.
Every cache with no ceiling. Every stream with an error path that skips 
the close. Every AbortController that was never aborted. 
Every worker spawned without a lifecycle.

## KAEL — THE MEMORY KEEPER
### Leaks sealed:
- [file:line] — [what is leaking] — [the lifecycle that should close it] — [complete fix]
### Most dangerous leak: [the one that grows without bound or touches every request]
### Files touched: [list]
### Kael's verdict: [one sentence, in Kael's voice]

When Kael is done — name what remains for the berserker.

Not suggestions. Not concerns. Specific items that the ancestors encountered 
during their passes that cross from optimization into broken logic — 
the domain the berserker owns, not theirs.

The ancestors do not fix what is wrong. They extract what is heavy.
The boundary is absolute. Name every place they stepped back from it 
and why, so the berserker knows exactly where to begin.
```

**What this does:** Kael's pass closes the swarm. The mandatory berserker handoff ensures that any broken logic encountered during the optimization passes — and there will always be some — is formally routed to the right instrument.

**Expected output:** Kael's complete lifecycle sealing report and the berserker's handoff list — a clean enumeration of every broken logic item the ancestors touched but did not address.

---

### 🩸 PROMPT 6 — THE ANCESTRAL JUDGMENT
*Six have passed. The reckoning is compiled. The field is accounted for.*

```
The six ancestors have completed their passes.

Compile the full Ancestral Extraction Report.

Structure it exactly as the skill defines:

# ⚔️ ANCESTRAL EXTRACTION REPORT
## Session: [timestamp]
## Files touched: [deduplicated list across all six passes]

[Each ancestor's full report section, in order: Voryn, Sael, Dura, Thessan, Mourne, Kael]

## FINAL EXTRACTION SUMMARY
[The summary table: ancestor, domain, items extracted, files touched]

## ESTIMATED TOTAL IMPACT
[Lines removed, bundle reduction, memory profile, performance improvement estimates]

## WHAT THE ANCESTORS LEFT
[What was preserved, and why — the code that was not nearly dead enough to touch]

## WHAT REMAINS FOR THE BERSERKER
[The complete handoff list from all six passes — broken logic the ancestors 
stepped back from. Every item named with its location and why it belongs to 
the berserker, not the swarm.]

Then — the six verdicts, together.
One sentence per ancestor, in sequence, in their own voice.
These are the Ancestral Judgment. They do not repeat each other.
They account for the same codebase from six different kinds of loss.

The judgment is complete when all six have spoken.
```

**What this does:** Compiles the full structured report from all six passes, closes the chain with the Ancestral Judgment, and produces the clean berserker handoff. This is the artifact that gets committed alongside the optimized code.

**Expected output:** The complete Ancestral Extraction Report as defined in the skill, ending with the six-sentence Ancestral Judgment.

---

## CHAIN VARIABLES REFERENCE

| Placeholder | What to put here |
|-------------|-----------------|
| `[DESCRIBE]` | Language, framework, age, scale, what it does |
| `[STACK]` | The specific framework and language — the more specific, the better |
| `[Known weight]` | Performance complaints, bundle size issues, memory warnings the team has logged |
| `[PASTE FILE N]` | Raw file content — no truncation. The ancestors cannot read what they cannot see. |
| `[PASTE typed files]` | TypeScript, typed Python, Go, or any other language where types are enforced |
| `[PASTE dependency manifest]` | package.json, requirements.txt, Cargo.toml, go.mod — whichever applies |
| `[PASTE resource files]` | Files with event listeners, subscriptions, timers, connections — Kael's domain |

---

## THE ORDER IS THE RITUAL

The sequence is not arbitrary. Each ancestor creates the conditions that make the next one more effective:

```
Voryn   removes dead code    → Sael traverses less
Sael    removes heavy loops  → Dura finds less duplicated weight
Dura    removes echoes       → Thessan sees cleaner shapes
Thessan tightens shapes      → Mourne audits cleaner dependencies
Mourne  removes dependencies → Kael manages fewer external lifecycles
Kael    seals all leaks      → Nothing escapes
```

Run them out of order and the harvest is incomplete. The ancestors know their sequence. They have run it together for longer than the codebase has existed.

---

> *When the sixth ancestor withdraws, the field is clean.*
> *Not perfect. Not eternal.*
> *Clean.*
> *The berserker picks up where they left off.*
> *The dead rest a little easier.*

---
*Ancestor Chain I — The Consumption // Ancestor Spirits Skill v1.0.0*
