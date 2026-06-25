# ⚔️ ANCESTOR CHAIN II — THE WEIGHT OF RELEASE
### *The ancestors do not care if the code works. They care how much it costs to keep it working.*
### *Before it faces the world — it is made lean enough to survive it.*

---

> *Release is the moment a codebase stops being protected by the encampment walls*
> *and has to stand on its own against everything the world sends at it.*
> *The berserker makes it correct before release.*
> *The ancestors make it strong.*
> *Correctness is the minimum. Strength is what survives.*

---

## OVERVIEW

This chain does not audit code for bugs. The berserker owns that. This chain answers a different question: **at production scale, under real load, on the target platform — what does this application cost, and what is that cost doing to it?**

The ancestors approach production readiness from their six extraction domains:

- **Voryn** clears the dead weight that ships to production unnecessarily
- **Sael** ensures the application does not collapse under load it should handle
- **Dura** ensures that duplicated code cannot produce divergent production behavior
- **Thessan** ensures the type system is tight enough that runtime surprises are minimized
- **Mourne** ensures the bundle, the dependencies, and the startup sequence are lean
- **Kael** ensures the application does not consume itself over time

**Use this chain when:** An application is functionally complete and approaching release. After the berserker has confirmed correctness. When the question is not "does it work" but "does it survive."

**Target platforms supported:** Web (Vercel, Netlify, Railway, Fly.io, AWS), Mobile (App Store, Google Play), Desktop (Electron, Tauri), API (public or private), CLI tools.

---

## THE RITUAL SEQUENCE

---

### 🩸 PROMPT 1 — THE WEIGHT ASSESSMENT
*The ancestors do not descend on a codebase without knowing what it is expected to carry.*

```
Six ancestors have been called to prepare this application for release.

Before they descend, they take the measure of what the platform will demand.

The application: [DESCRIBE — what it does, who uses it, expected load]
The target platform(s): [LIST — Vercel, App Store, Railway, etc. Be specific.]
The stack: [LANGUAGE / FRAMEWORK / RUNTIME]
Current known weight: [Bundle size if known, startup time, memory baseline, 
any performance benchmarks that exist, any known slow paths]

The ancestors do not perform the same audit on a CLI tool as on an API 
serving ten thousand concurrent requests.

Each ancestor now names the production weight most specific to this 
platform and this stack that falls within their domain:

VORYN: What dead code is most likely to survive the build process and 
ship to production in a [STACK] application on [PLATFORM]? 
What gets bundled that serves no user?

SAEL: Where does [STACK] on [PLATFORM] tend to degrade under load? 
What computation patterns, specific to this stack, become unacceptable 
at scale that were invisible in development?

DURA: What duplication in [STACK] applications most commonly produces 
*divergent production behavior* — the kind where two copies of the same 
logic produce different outputs when one is hot-patched and the other is not?

THESSAN: What type looseness in [STACK] most commonly causes runtime 
failures that static analysis would have caught?

MOURNE: What does the production bundle of a typical [STACK] application 
on [PLATFORM] carry that users never needed? What polyfills, what dev 
dependencies, what development-mode code survives into production builds?

KAEL: What lifecycle failures are most common in [STACK] applications 
running on [PLATFORM] over time — the failures that appear on day seven 
of production, not day one?

Six assessments. One platform. The harvest is calibrated before it begins.
```

**What this does:** Platform-calibrates each ancestor before the passes begin. A mobile app and an API have different production weight profiles. The ancestors know this. They need to be told which battlefield they are walking onto.

**Expected output:** Six platform-specific weight assessments — concrete, stack-specific, not generic.

---

### 🩸 PROMPT 2 — VORYN CLEARS THE SHIP MANIFEST
*Nothing reaches the user that does not serve the user.*

```
Voryn descends on the build output and the source that produces it.

[PASTE: build configuration — webpack.config.js, vite.config.ts, 
rollup.config.js, next.config.js, or equivalent]
[PASTE: the entry points — the files that start the build]
[PASTE: any source maps or bundle analysis output if available]

Voryn — this is not a dead code pass on the source alone.
This is a manifest audit. What ships to the user that the user never touches?

Find:
- Source map files included in production builds (security risk and dead weight)
- Test utilities bundled into production output
- Development-only code paths not eliminated by build flags
- `console.log`, `debugger`, and logging artifacts in production bundles
- Feature flags that are permanently enabled — the flag infrastructure 
  ships with the code it was meant to test, long after the test ended
- Documentation comments compiled into minified output unnecessarily
- Demo or example code included in library distributions
- Internal tooling accidentally included in public builds

## VORYN — THE NULL HARVESTER (SHIP MANIFEST PASS)
### Dead weight cleared from the manifest:
- [file/artifact] — [what it is] — [why it should not ship]
### Build configuration changes required: [specific config changes]
### Files touched: [list]
### Voryn's verdict: [one sentence]

What Voryn clears from the manifest, Mourne does not have to weigh.
Note what has been removed from the ship before Mourne audits the hold.
```

**What this does:** Voryn's production pass is distinct from his source pass — he audits the build output, not just the code. Source maps in production, test utilities bundled into builds, debug artifacts — these are Voryn's domain at the release stage.

**Expected output:** A build-manifest-specific dead weight report with concrete build configuration changes required.

---

### 🩸 PROMPT 3 — SAEL TESTS THE LOAD BEARING
*What holds in development collapses under real numbers. Sael finds the collapse point before users do.*

```
Sael descends on the application's critical performance paths.

[PASTE: The code that handles the most frequent user operations — 
the hot paths, the endpoints called most often, the renders triggered most]
[PASTE: Any database query files, ORM usage, or data transformation pipelines]
[PASTE: Any caching layer implementation]

Sael — this is not a general optimization pass.
This is a load assessment. What in this code will not survive 
the difference between one user and one thousand?

For each performance issue found, Sael must answer:

1. At what scale does this become a production incident?
   (Not "this could be slow" — at what request count, what data volume, 
   what concurrent user count does this cross from acceptable to broken?)

2. What is the fix, and does the fix introduce any new cost 
   that must be weighed against the improvement?

3. Does this issue require a code change, a configuration change, 
   or an infrastructure change? Name which.

## SAEL — THE WEIGHT BEARER (LOAD ASSESSMENT)
### Load-bearing failures:
- [file:line] — [the cost at scale] — [failure threshold] — [fix] — [fix cost]
### First thing to break under real load: [the single highest-priority item]
### Files touched: [list]
### Sael's verdict: [one sentence]

Sael names for Dura: where performance issues were found in duplicated code paths — 
the places where a performance fix applied to one copy will not propagate to the other.
These are Dura's priority targets.
```

**What this does:** Sael's production pass is load-aware — she doesn't just find inefficiency, she names the failure threshold. "This breaks at 500 concurrent users" is a deployable finding. "This might be slow" is not.

**Expected output:** Load-bearing failure report with explicit failure thresholds, fix classifications (code/config/infrastructure), and targeted handoff to Dura.

---

### 🩸 PROMPT 4 — DURA HUNTS DIVERGENCE AND THESSAN BINDS THE RUNTIME SHAPES
*Duplicated code in production does not just waste. It diverges. Dura finds where.*
*Loose types in production do not just warn. They fail at runtime. Thessan binds them.*

```
Sael has named where performance fixes will fail to propagate through duplication.
Dura descends on those targets first, then sweeps the rest.

[PASTE: Files Sael flagged as containing duplicated performance-critical code]
[PASTE: Shared utilities, helper functions, or service layers]
[PASTE: Any configuration files that are duplicated across environments]

DURA — hunt the divergence vectors.
Not all duplication is equal at release time. 

Prioritize by divergence risk:
HIGH: Duplicated validation logic (two copies can accept different things)
HIGH: Duplicated error handling (two copies can fail differently in production)  
HIGH: Duplicated business rules (two copies can produce different outputs)
MEDIUM: Duplicated formatting/transformation (two copies drift, but drift is visible)
LOW: Duplicated constants (usually caught by monitoring)

## DURA — THE ECHO SILENCER (DIVERGENCE AUDIT)
### Divergence vectors sealed:
- ECHO: [A] and [B] — [divergence risk category] — [how they currently differ if at all]
  RESOLUTION: [canonical form] — [where it lives]
### Highest divergence risk: [the duplication most likely to cause a production incident]
### Files touched: [list]
### Dura's verdict: [one sentence]

---

Then Thessan descends.

[PASTE: All typed source files — TypeScript, typed Python, Go, Rust, or equivalent]

THESSAN — the shapes that are loose in development become runtime failures in production.

Find every type that is wider than what production data will actually send.
Find every optional that production will always populate.
Find every `any` that production will eventually give something unexpected.

For each loose shape, name the production failure mode:
Not "this type is too broad." Name the specific runtime exception, 
the specific incorrect behavior, or the specific security gap that this 
loose shape permits when production data arrives.

## THESSAN — THE SHAPE BINDER (RUNTIME FAILURE PREVENTION)
### Shapes tightened against production failure:
- [file:line] — [loose shape] → [tight shape] — [production failure it prevents]
### Shape most likely to cause a production incident: [the one with highest failure probability]
### Files touched: [list]
### Thessan's verdict: [one sentence]
```

**What this does:** At release, Dura's target is divergence risk specifically — not all echoes are equal when one is an authentication handler and one is a date formatter. Thessan's production pass names the actual runtime failure each loose type enables, not just the type error.

**Expected output:** Divergence-prioritized redundancy report and type-tightening report with explicit production failure modes named for each shape issue.

---

### 🩸 PROMPT 5 — MOURNE AUDITS THE HOLD AND KAEL SEALS THE LONG-RUNNING FAULTS
*Everything the user downloads, they pay for. Mourne counts the cost.*
*Everything the server runs without stopping, accumulates. Kael finds what should have stopped.*

```
Mourne descends on the production bundle and the dependency manifest.

[PASTE: package.json / requirements.txt / Cargo.toml and lock file]
[PASTE: Bundle analysis output — webpack-bundle-analyzer, bundlephobia data, 
or equivalent — if available. If not, paste the dependency list.]

MOURNE — audit the hold.

At release, every byte the user downloads is a debt the application charges 
against first impressions, mobile data, and load time.

Categorize every dependency:
- SHIPS TO USER (client-side) or STAYS ON SERVER (server-side)
- For everything that ships to users: is it justified at its weight?
- Are dev dependencies leaking into production builds?
- Are there dependencies whose entire contribution could be inlined 
  in fewer lines than the dependency weighs?
- What is the cold start cost of this dependency tree on [PLATFORM]?
  (Critical for serverless and edge deployments)

## MOURNE — THE BREATH TAKER (PRODUCTION BUNDLE AUDIT)
### Bundle weight extracted:
- [package] — [ships to user? Y/N] — [weight] — [justified? / replacement]
### Total unjustified weight: [sum of what should not ship]
### Cold start impact: [assessment for serverless/edge deployments, or N/A]
### Estimated reduction: [size after removals]
### Mourne's verdict: [one sentence]

---

Then Kael descends. He is always last.

[PASTE: Server-side code with connections, subscriptions, workers, caches, timers]
[PASTE: Any request handlers, middleware, or connection pool management]

KAEL — production runs for days, weeks, months.
Every leak that does not appear in a five-minute development session 
appears on day seven of production.

For each resource that is opened, find where it closes under:
1. The happy path (request completes normally)
2. The error path (request throws)
3. The timeout path (request is abandoned or times out)
4. The restart path (process receives SIGTERM)

A resource that closes on the happy path and leaks on the error path 
will appear stable in testing and fail in production.
Name every one.

## KAEL — THE MEMORY KEEPER (LONG-RUNNING AUDIT)
### Long-running faults sealed:
- [file:line] — [what leaks] — [which path leaks] — [complete fix including all paths]
### Fault that will appear latest but hit hardest: [the insidious one]
### Files touched: [list]
### Kael's verdict: [one sentence]
```

**What this does:** Mourne's production pass adds cold start analysis — critical for serverless and edge deployments where dependency tree weight directly affects response time. Kael's production pass explicitly traces all three failure paths (error, timeout, restart) because production systems encounter all of them.

**Expected output:** Production bundle audit with cold start assessment and complete lifecycle audit with all three failure paths evaluated for each resource.

---

### 🩸 PROMPT 6 — THE RELEASE VERDICT
*The six have passed. The application is accounted for. It is released or it is held.*

```
Six ancestors have walked this application.

Compile the complete Ancestral Extraction Report — full structure as the skill defines.

Then, answer the questions that the platform will ask the moment this ships:

PLATFORM WEIGHT QUESTIONS — answer each specifically for [PLATFORM]:

1. BUNDLE: Does the production bundle size meet the threshold for acceptable 
   load time on the median connection speed for this application's users?
   If not — what remains that must be removed before release?

2. COLD START: For [PLATFORM] — is the startup sequence lean enough?
   What is the estimated startup time after Mourne's extractions?

3. SUSTAINED LOAD: After Sael's corrections — at what concurrent user count 
   does the first performance bottleneck appear? Is that threshold acceptable 
   for the expected launch load?

4. LIFETIME: After Kael's sealing — how long can this application run 
   without accumulation causing degradation? Name the longest-lived resource 
   and its lifecycle.

5. DIVERGENCE RISK: After Dura's audit — if a hotfix is applied under pressure 
   in the middle of a production incident, which file is most likely to have 
   a copy that gets missed?

Then — the six verdicts.
Six sentences. Six domains. Six kinds of loss, each accounting for the same application.

And the question the ancestors answer together, that they will not soften:

*Is this application lean enough to release?*

Not correct. Correctness belongs to the berserker.
Lean. Strong. Worthy of the platform it is being handed to.

Speak plainly. The dead always have.
```

**What this does:** Closes the release chain with platform-specific weight certification. Forces binary answers to platform-specific release gates, not general "it's better now" conclusions.

**Expected output:** Complete Ancestral Extraction Report, five platform weight question answers with specific thresholds named, six verdicts, and the final release readiness judgment.

---

## CHAIN VARIABLES REFERENCE

| Placeholder | What to put here |
|-------------|-----------------|
| `[DESCRIBE]` | What the app does, who uses it, expected load at launch |
| `[TARGET PLATFORM(S)]` | The specific deployment target — be precise (Vercel Edge, not "the web") |
| `[STACK]` | Framework and language — the more specific, the more calibrated the ancestors become |
| `[Known weight]` | Any existing bundle analysis, performance benchmarks, or load test results |
| `[PASTE build config]` | The actual build configuration files — not descriptions of them |
| `[PASTE hot paths]` | The code that runs on every request or most renders — Sael's primary targets |
| `[PASTE dependencies]` | The full manifest and lock file — Mourne reads both |
| `[PASTE resource files]` | Connection pools, event emitters, timers, caches — Kael's domain |

---

## THE PRODUCTION WEIGHT THRESHOLD

An application is lean enough for release when:

- **Voryn** finds no dead code shipping to users
- **Sael** can name the failure threshold and it is above the expected launch load
- **Dura** has sealed every divergence vector in validation, authentication, and business logic
- **Thessan** has no `any` type on a user-facing data path
- **Mourne** has justified every dependency by its weight against its contribution
- **Kael** has traced every resource through all three failure paths

One ancestor left unsatisfied means the weight is not complete.

---

> *The ancestors do not celebrate when something ships.*
> *They withdraw.*
> *They return when the load grows heavy enough again.*
> *They always return.*

---
*Ancestor Chain II — The Weight of Release // Ancestor Spirits Skill v1.0.0*
