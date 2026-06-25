# ⚔️ ANCESTOR CHAIN III — THE BURDEN TEST
### *The ancestors do not break code to find bugs. They apply weight until what should not survive, doesn't.*
### *Then they extract what caused the collapse.*

---

> *The berserker's destruction tests what breaks.*
> *The ancestors' burden test reveals what costs.*
> *These are not the same question.*
> *A system can break cleanly, all at once, loudly.*
> *A system can also decay — slowly, silently, measurably —*
> *until one day it is no longer the system it was when it was written.*
> *The ancestors hunt the second kind.*
> *They have been watching things decay for centuries.*
> *They know what it looks like before it shows.*

---

## OVERVIEW

The berserker's Debugging by Destruction (Chain III) applies adversarial inputs to find logic failures. This chain is its mirror — not adversarial inputs, but **sustained weight**. It applies volume, duration, scale, and accumulated load to find where code that passes all tests begins to cost too much to sustain.

This is not a bug hunt. The berserker owns broken logic. The ancestors own what breaks *correctly* — the cache that evicts too slowly, the bundle that grows by 3KB with every dependency update, the function that is fast for one hundred calls and unacceptable for one million, the listener that leaks one handle per request and is undetectable until day thirty.

**Use this chain when:** The system works. The question is whether it *keeps* working — at scale, under load, over time, and against the accumulated weight of real usage.

**Philosophy:** Every system has a weight it can sustain and a weight it cannot. This chain finds the line.

---

## THE RITUAL SEQUENCE

---

### 💀 PROMPT 1 — THE BURDEN INVENTORY
*Before weight is applied, each ancestor names the burdens specific to this system.*

```
Six ancestors are called to burden-test this application.

The burden test does not break the code. It weighs it.

The system: [DESCRIBE — what it does, at what scale it currently operates, 
what the anticipated growth looks like over the next six months]
The stack: [LANGUAGE / FRAMEWORK / RUNTIME]
Current operational data: [Any available: p99 response times, memory baselines, 
bundle sizes, database query counts, cache hit rates. 
If none exist: say so. The ancestors will name what should have been measured.]

Each ancestor names the specific burden signature of this system — 
the weight profile that this kind of application accumulates over time 
in their particular domain:

VORYN: What dead code grows in a [STACK] system over time?
What categories of unused code accumulate between releases — 
the features that were built and then deprecated but never removed, 
the flags that were meant to be temporary, the imports that 
accumulate as the codebase evolves?

SAEL: Where does [STACK] under [EXPECTED LOAD] develop 
performance debt over time? What optimizations that were 
acceptable at current scale will become bottlenecks at 
[ANTICIPATED GROWTH]?

DURA: What duplication accumulates in [STACK] systems as teams grow?
Where do new engineers tend to re-implement rather than find?
Where do hotfixes create a third copy of logic that already existed in two?

THESSAN: Where do types erode in [STACK] systems under active development?
Where do `any` types appear when engineers are moving fast?
Where do interfaces accumulate optional fields that should be required 
because the codebase grew around them?

MOURNE: How does the dependency tree of a [STACK] application 
grow over six months of active development? What gets added that 
never gets removed? What reaches its replacement version in native 
APIs before the dependency is retired from the project?

KAEL: What accumulation patterns appear in [STACK] applications 
over time? Where do unbounded caches become memory pressure?
Where do connection pools exhaust under sustained load 
that was never anticipated in development?

Six burden profiles. One system. The weight is named before it is applied.
```

**What this does:** Forces the ancestors to characterize the *growth trajectory* of waste in this specific system before any code is seen. The burden test is time-aware — it asks not just "where is the waste now" but "where is the waste accumulating."

**Expected output:** Six time-aware burden profiles — describing how waste accumulates in this specific system and stack over the growth horizon given.

---

### 💀 PROMPT 2 — VORYN APPLIES THE DECAY TEST
*He does not hunt what is dead today. He hunts what is dying.*

```
Voryn descends, but not for a single pass.
This is a decay audit.

[PASTE: The files that have changed most frequently — git log if available, 
or the files with the highest churn in the recent development history]
[PASTE: Any feature flag configuration or A/B test infrastructure]
[PASTE: Any deprecated function lists, migration guides, or changelog entries 
that reference features removed but potentially not cleaned up]

Voryn — do not hunt what is already dead.
Hunt what is in the process of dying.

DECAY PATTERN 1 — DEPRECATED BUT UNDEAD:
Find every reference to code marked as deprecated, obsolete, or scheduled for removal.
For each: is it still being called? When was the deprecation notice added?
What is the removal plan? If there is no removal plan, the deprecation is fiction.

DECAY PATTERN 2 — FEATURE FLAG ACCUMULATION:
Find every feature flag or A/B test conditional.
For each: is this flag still being evaluated, or is one branch permanently winning?
A flag whose losing branch has never been hit in production for ninety days 
is dead code that does not know it is dead.

DECAY PATTERN 3 — SURVIVOR CODE:
Find functions, utilities, or modules that exist only to support other code 
that no longer exists. The support structure that outlived the thing it was supporting.

DECAY PATTERN 4 — CHANGELOG GHOSTS:
Cross-reference the changelog or deprecation list against the codebase.
Find every feature marked as removed in documentation but still present in source.

## VORYN — THE NULL HARVESTER (DECAY AUDIT)
### Decay patterns found:
- DEPRECATED BUT UNDEAD: [list with ages and call status]
- FLAG ACCUMULATION: [list with flag age and winning branch]
- SURVIVOR CODE: [list with what they were supporting that is gone]
- CHANGELOG GHOSTS: [list with documentation vs. code discrepancy]
### Most advanced decay: [the item that has been dying longest without being removed]
### Estimated decay rate: [how fast is this codebase accumulating dead weight — 
lines per month, based on the pattern observed]
### Voryn's verdict: [one sentence]
```

**What this does:** Voryn's burden-test pass is time-weighted — he isn't just looking for dead code, he's looking for the *rate of decay* and the *patterns* of how dead code accumulates in this specific codebase. The decay rate estimate is the critical output — it tells the team how long until the next audit is needed.

**Expected output:** Decay pattern report with aging data, flag audit, survivor code identification, and a decay rate estimate.

---

### 💀 PROMPT 3 — SAEL APPLIES THE SCALE SIMULATION
*She does not test at current load. She tests at the load that is coming.*

```
Sael descends on the performance architecture.

[PASTE: The most frequently called functions, endpoints, or operations]
[PASTE: Any database query patterns — ORM usage, raw queries, query builders]
[PASTE: Any caching implementation]
[PASTE: Current load figures if known — requests per second, concurrent users, 
data volume. If not known, state the current scale and the anticipated 
scale at six months.]

Sael — do not test at current load. Test at [ANTICIPATED SCALE].

For each performance path:

SCALE SIMULATION:
Current load: [CURRENT]
Simulated load: [ANTICIPATED SCALE]
Current behavior at simulated load: [what happens to this code if traffic triples?]
Threshold: [at what exact multiplier does this path cross from acceptable to incident?]
Degradation curve: [is this linear degradation, or is there a cliff?
A linear degradation is manageable. A cliff is a production incident.]

Sael pays particular attention to:

THE HIDDEN CLIFFS — operations that are O(1) or O(log n) until they aren't:
- Database queries that are fast on a small dataset and become table scans 
  as the data grows (missing indexes that won't matter until they do)
- In-memory operations that are fast until the dataset exceeds L2 cache
- Pagination that works until the offset becomes large
- Sort operations that work until the set is too large to hold in memory

THE ACCUMULATION SLOPES — operations that get slower over time, not over load:
- Queries against tables that grow without archival
- Caches that slow down as they fill (linear scan caches)
- Log aggregation that becomes expensive as log volume grows

## SAEL — THE WEIGHT BEARER (SCALE SIMULATION)
### Scale failures:
- [path] — [current behavior] — [behavior at simulated load] — [threshold] — [cliff or slope?] — [fix]
### First cliff: [the load-bearing failure that will hit earliest]
### First slope: [the time-based degradation that will hit latest but accumulate fastest]
### Sael's verdict: [one sentence]

Sael names for Dura: which scale failures are duplicated across multiple code paths — 
where fixing one copy will not fix the problem because the problem exists in three places.
```

**What this does:** Sael's burden pass introduces two distinct degradation patterns — cliffs (sudden, threshold-based failures) and slopes (gradual, time-based degradation). These require different interventions and different urgency.

**Expected output:** Scale simulation report with cliff and slope classifications, failure thresholds at anticipated scale, and handoff to Dura naming duplicated failure paths.

---

### 💀 PROMPT 4 — DURA AND THESSAN APPLY THE DRIFT TEST
*Dura tests whether duplicated code is diverging under active development.*
*Thessan tests whether the type system is eroding under engineering velocity.*

```
Dura descends on the duplication Sael flagged, then the rest.

[PASTE: The files containing duplicated performance paths Sael identified]
[PASTE: Any recently modified shared utilities — the files with the most 
recent commit timestamps]
[PASTE: Any files that were touched during the last hotfix or emergency patch]

DURA — the burden test for duplication is not about finding echoes.
It is about finding echoes that are *already diverging*.

For each duplicate pair found:

DRIFT MEASUREMENT:
- How similar are they today? [identical / minor variation / moderate divergence / significant divergence]
- How long have they been separate? [age of the duplication]
- What was the most recent change to each copy? [do they have different last-modified dates?]
- Projected drift: [if development continues at current velocity, 
  how different will they be in six months?]

Priority: A duplication where both copies were modified in the last week 
is more dangerous than a duplication untouched for a year.
Name the drift velocity, not just the presence.

## DURA — THE ECHO SILENCER (DRIFT AUDIT)
### Drift measurements:
- [A] and [B] — [current divergence] — [drift velocity] — [six-month projection]
  RESOLUTION: [canonical form] — [urgency: immediate / before next release / next sprint]
### Fastest-drifting duplication: [the one that will be hardest to merge the longer it runs]
### Dura's verdict: [one sentence]

---

Then Thessan descends on the type system under velocity.

[PASTE: Recently modified TypeScript or typed source files]
[PASTE: Any files modified during a fast-moving sprint or urgent feature delivery]

THESSAN — the burden test for types is not about what is loose today.
It is about where the type system is *actively eroding* under development velocity.

Find:
- `any` types added in the last three months (newer = more systemic pressure)
- Type assertions (`as SomeType`) that bypass rather than satisfy the type system
- Interfaces that have had optional fields added to them recently 
  (the optional fields that were added because something needed to be nullable 
  that shouldn't be nullable)
- Return types widened to accommodate edge cases rather than narrowed to handle them properly
- `// @ts-ignore` and `// @ts-expect-error` comments — each one is a place 
  where the type system was defeated rather than satisfied

For each: name the engineering pressure that created it. 
Not the developer. The pressure. Speed? Unclear requirements? External API change?
Naming the pressure names the systemic intervention, not just the fix.

## THESSAN — THE SHAPE BINDER (EROSION AUDIT)
### Type system erosion:
- [file:line] — [what eroded] — [when] — [engineering pressure that caused it] — [correct shape]
### Fastest-eroding surface: [where the type system is losing the fastest]
### Systemic intervention required: [not just the fixes — the process change that stops the erosion]
### Thessan's verdict: [one sentence]
```

**What this does:** Dura and Thessan's burden passes are velocity-aware — they measure the *rate of degradation*, not just its current state. Drift velocity for duplicated code and erosion rate for the type system give the team leading indicators, not lagging ones.

**Expected output:** Drift-velocity report for duplications and type erosion audit with engineering pressure diagnoses and a systemic intervention recommendation.

---

### 💀 PROMPT 5 — MOURNE AND KAEL APPLY THE ACCUMULATION TEST
*Mourne tests whether the dependency tree is growing or shrinking.*
*Kael tests whether the application will still be healthy in thirty days.*

```
Mourne descends on the dependency history.

[PASTE: package.json / requirements.txt and its lock file]
[PASTE: Any changelog or release history showing dependency updates]
[PASTE: The dependency manifest from six months ago if available — 
or describe what you know about how the dependency tree has changed]

MOURNE — the burden test for dependencies is not an audit of what is here today.
It is a trajectory test.

DEPENDENCY TRAJECTORY ANALYSIS:
- Is the dependency count growing or shrinking over time?
- What is the net dependency change over the last six months? 
  (packages added minus packages removed)
- What percentage of dependencies have available native replacements 
  that did not exist when they were added?
- Which packages have been in the project longest without a review of 
  whether they are still necessary?
- What is the total bundle weight trend — heavier or lighter than six months ago?

For each dependency flagged as removable:
- How long has it been in the project?
- Was there a native alternative when it was added, or did one appear since?
- What is the removal cost (breaking changes, API surface to replace) 
  versus the accumulation cost (ongoing weight for every user, every deployment)?

## MOURNE — THE BREATH TAKER (ACCUMULATION AUDIT)
### Dependency trajectory: [growing/stable/shrinking and at what rate]
### Removable dependencies with accumulation cost exceeding removal cost:
- [package] — [age in project] — [weight] — [native replacement available since when] — [removal cost]
### Trajectory intervention: [what process change stops the accumulation]
### Mourne's verdict: [one sentence]

---

Then Kael descends last. He always descends last.

[PASTE: Server-side long-running processes — connection pools, subscription managers, 
worker processes, background job handlers, scheduled tasks]
[PASTE: Any monitoring, metrics, or memory profiling data if available]

KAEL — the burden test for lifecycle is the thirty-day test.

For each long-running resource:
1. What does its memory footprint look like after one hour of production traffic?
2. What does it look like after twenty-four hours?
3. What does it look like after thirty days?

If the answer to any of those questions is "I don't know" — that is Kael's finding.
An unmeasured lifecycle is an unmanaged lifecycle. 
An unmanaged lifecycle is a production incident waiting for thirty days.

For each resource that accumulates:
- What is the accumulation rate? (Bytes per request? Per connection? Per day?)
- At what size does the accumulation become a degradation event?
- How far away is that threshold at current load?

KAEL'S THIRTY-DAY PROJECTIONS:
- [resource] — [current footprint] — [accumulation rate] — [thirty-day projection] — 
  [threshold for degradation] — [days until threshold at current load] — [fix]

## KAEL — THE MEMORY KEEPER (THIRTY-DAY AUDIT)
### Thirty-day projections: [the table above]
### First resource to reach threshold: [name and projected date]
### Unknown lifecycles: [resources with no measurable accumulation data — 
  these are as dangerous as known leaks]
### Kael's verdict: [one sentence]
```

**What this does:** Mourne's burden pass introduces trajectory analysis — the dependency tree is a living thing that grows if not actively managed. Kael's burden pass is the thirty-day test — the explicit calculation of when each accumulation becomes a production incident.

**Expected output:** Dependency trajectory report with process intervention recommendation, and Kael's thirty-day projections with specific degradation dates for each accumulating resource.

---

### 💀 PROMPT 6 — THE WEIGHT VERDICT
*The burden has been applied. The ancestors account for what they found.*

```
Six ancestors have applied their burdens. The system has been weighed.

Compile the Ancestral Extraction Report — full structure as the skill defines.

But this report has an additional section: THE WEIGHT OVER TIME.

## THE WEIGHT OVER TIME

This is not a snapshot of current waste. This is a projection.

Based on the findings of all six passes:

### IN THREE MONTHS (if no intervention):
- Voryn: [how much dead code will have accumulated at the current decay rate]
- Sael: [which performance cliff will be reached first and when]
- Dura: [which duplication will have diverged beyond easy reconciliation]
- Thessan: [how many additional `any` types at the current erosion rate]
- Mourne: [what the dependency weight will be at the current growth rate]
- Kael: [which resource will have reached its accumulation threshold first]

### THE INTERVENTION SEQUENCE:
Not everything needs to be fixed today. But everything needs a date.
For each finding — assign it:
- IMMEDIATE: Must be addressed before the next deployment
- BEFORE NEXT RELEASE: Must be addressed within the current release cycle
- NEXT SPRINT: Must be scheduled in the upcoming sprint
- QUARTERLY: Must be reviewed at the next quarterly cleanup

### THE WEIGHT LINE:
Is this codebase getting heavier or lighter over time?

Based on the trajectory of all six domains — is the waste accumulating 
faster than it is being cleared? 

Name the direction. Name the rate. Name what changes the direction 
if the current trajectory is toward accumulation.

---

Then the six verdicts.

Voryn's verdict on decay.
Sael's verdict on the scale that is coming.
Dura's verdict on drift velocity.
Thessan's verdict on erosion.
Mourne's verdict on trajectory.
Kael's verdict on what day the first threshold is crossed.

Six sentences. The burden has been named.
The ancestors withdraw.
The berserker has his list.
```

**What this does:** The burden test closes with a projection, not just a snapshot. The Weight Over Time section and the Intervention Sequence turn the findings from a one-time audit into an ongoing maintenance contract. The Weight Line judgment — heavier or lighter over time — is the single most important output of the chain.

**Expected output:** Complete Ancestral Extraction Report plus The Weight Over Time projection, Intervention Sequence with dates, the Weight Line directional judgment, and the six verdicts.

---

## CHAIN VARIABLES REFERENCE

| Placeholder | What to put here |
|-------------|-----------------|
| `[DESCRIBE]` | What the system does, current scale, growth trajectory |
| `[STACK]` | Framework and language — specific |
| `[EXPECTED LOAD / ANTICIPATED SCALE]` | Current numbers and six-month projection — or "unknown" if unmeasured |
| `[Frequently changed files]` | Files with highest git churn — or "unknown" if git history unavailable |
| `[Feature flag config]` | Any feature flag or A/B test infrastructure |
| `[Long-running processes]` | Connection pools, caches, workers, scheduled jobs, subscription managers |
| `[Monitoring data]` | Memory profiles, p99 latency, error rates — or "unavailable" |
| `[Dependency manifest from 6 months ago]` | Historical package.json or equivalent — or note that it is unavailable |

---

## THE WEIGHT LINE

The final output of this chain is a single judgment: is this system getting heavier or lighter?

**Getting lighter:** Dead code is being removed faster than it accumulates. Dependencies are being retired. Performance debt is being paid down. Types are being tightened. Resources are being managed. The swarm's work is holding.

**Stable:** The accumulation rate matches the removal rate. This is not healthy — it means the codebase is not improving, only maintaining. The ancestors will need to return.

**Getting heavier:** Waste accumulates faster than it is cleared. The codebase will require a larger intervention at a later date. The cost of that intervention grows with every day the trajectory is not changed.

The ancestors do not soften this verdict.

---

> *The burden test does not end with the report.*
> *It ends with the Weight Line.*
> *If the line goes up — the ancestors will be back.*
> *They always come back when the weight builds again.*
> *They have time. They are not alive.*
> *The code does not have that advantage.*

---
*Ancestor Chain III — The Burden Test // Ancestor Spirits Skill v1.0.0*
