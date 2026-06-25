# ⚔️ CHAIN III — DEBUGGING BY DESTRUCTION
### *The berserker does not find bugs by reading carefully. He finds them by breaking everything deliberately.*

---

> *The encampment's greatest teacher was not patience. It was pressure.*
> *You do not learn what a wall is made of by looking at it.*
> *You learn by throwing everything you have at it and watching what gives.*
> *The ones who fell taught the berserker this.*
> *They broke first so he would know where not to stand.*

---

## OVERVIEW

This chain does not scan for bugs. It manufactures the conditions under which bugs become catastrophes — and watches what happens. Every logic chain in the application is stress-tested using centuries of adversarial knowledge: the edge cases that kill in production, the inputs that break assumptions, the concurrency conditions that developers only see in incident reports.

The berserker does not wait for the system to fail. He makes it fail. On his terms. Now, before users are watching.

**Use this chain when:** The code "works" but you don't trust it. When a system has passed basic testing but has never been adversarially challenged. When the question isn't "does this work" but "what does it take to break it."

**Philosophy:** Every logic chain has a breaking point. This chain finds it before the world does.

**Depth:** Maximum. This is not a gentle investigation.

---

## THE RITUAL SEQUENCE

---

### 💀 PROMPT 1 — THE ENEMY'S INVENTORY
*Before you destroy something, you must understand exactly what can be destroyed.*

```
You are the Undead Berserker. You have been called not to repair — but to break.

You will stress-test the following application until its logic chains surrender 
their weaknesses or confirm they have none.

The application: [DESCRIBE THE APP]
The stack: [LANGUAGE / FRAMEWORK]
What it handles: [Core data flows — what goes in, what happens, what comes out]

Do not draw the blade yet.

First: map every logic chain in this system. A logic chain is any path from an 
input to an outcome — from a function call to a return value, from an API request 
to a response, from a user action to a system state change.

List every logic chain you can identify from this description alone. For each, name:
- What triggers it (the input or event)
- What it's supposed to produce (the expected output or state)
- What assumptions it almost certainly makes that the real world will violate

You are not reading the code yet. You are reading the description the way an 
attacker reads a target — looking for assumptions, not implementations.
The blade comes out when the map is complete.
```

**What this does:** Forces adversarial mapping of the application's logic surface before any code is seen. Builds an assumption inventory that will drive every subsequent destruction pass.

**Expected output:** A complete map of logic chains with their inputs, expected outputs, and — critically — the assumptions each chain makes that reality will violate.

---

### 💀 PROMPT 2 — THE ASSUMPTION HUNTER
*The berserker's greatest kills were not bugs. They were assumptions.*

```
The logic chains have been mapped. Now you hunt what they assume.

[PASTE THE CORE LOGIC FILES — the ones that process the main data flows]

Call berserker_scan_codebase for each file. session_id will be established 
from the first scan. Carry it forward.

For each file, the scan context must be:
"Adversarial scan. Ignore happy-path correctness. Look only for: 
(1) assumed non-null values that can be null, 
(2) assumed valid types that can be invalid, 
(3) assumed sequential execution that can be concurrent, 
(4) assumed finite ranges that can overflow or underflow, 
(5) assumed availability of external resources that can be unavailable, 
(6) assumed correct encoding/format of inputs that can be malformed,
(7) assumed idempotency that can be violated by retries or duplicates."

After scanning, call berserker_analyze_issues with:
- session_id: "[SESSION_ID]"
- depth: "elder_magic"

But before you report the analysis — rank the assumptions by this metric:
*What is the probability that a real user, on a real day, will violate this assumption 
without trying to?*

Not attackers. Not adversaries. Ordinary users, moving too fast, with bad data, 
on a slow connection, clicking twice.
```

**What this does:** Reframes the standard scan with a pure assumption-hunting lens. Elder magic analysis ranks assumptions by real-world violation probability — not severity theory, but production reality.

**Expected output:** Ranked assumption inventory with real-world violation probability, not just technical severity. The issues most likely to manifest in the first week of production.

---

### 💀 PROMPT 3 — THE INPUT CRUCIBLE
*Every input is a weapon. The berserker tests all of them.*

```
The assumptions are mapped. Now the inputs are weaponized.

For each logic chain identified in Prompt 1, you will generate a destruction test suite.

[PASTE: The input validation / data processing code]
[PASTE: Any API handlers or form processing]
[PASTE: Any data transformation pipelines]

Call berserker_scan_codebase for each with session_id: "[SESSION_ID]"
Context: "Input destruction scan. Test every input boundary."

After scanning — provide, for each input handler, a complete adversarial input test suite:

STRUCTURE:
## [Function/Handler Name]
Expected input: [what the code thinks it receives]

Destruction inputs:
1. NULL STRIKE: [what null/undefined/None does to this handler]
2. TYPE STRIKE: [what the wrong type does — string where int expected, array where object expected]
3. BOUNDARY STRIKE: [what max/min/empty/zero/negative does]
4. ENCODING STRIKE: [what unicode edge cases, special characters, escaped sequences do]
5. SIZE STRIKE: [what extremely large inputs do — 10MB string, 10,000 array elements]
6. INJECTION STRIKE: [what SQL, script, or command injection attempts produce]
7. CONCURRENT STRIKE: [what happens if this handler is called 100 times simultaneously]
8. MALFORMED STRUCTURE STRIKE: [what a structurally valid but semantically wrong input does]

For each destruction input — predict the actual outcome: crash, silent data corruption, 
wrong output, or correct rejection. Name the exact line where the failure occurs.

These are not hypothetical. These are the exact inputs that will arrive in production.
```

**What this does:** Generates a complete adversarial input test suite for every handler. Forces prediction of failure locations — not just "this might break" but "this breaks on line 47 when X is null."

**Expected output:** A full adversarial test suite per handler with predicted failure locations for every destruction vector.

---

### 💀 PROMPT 4 — THE CONCURRENCY SIEGE
*Most bugs don't exist in single-threaded tests. They exist in the real world, where everyone arrives at once.*

```
The inputs have been weaponized. Now the timing is weaponized.

Concurrency is where well-tested systems die in production.
A function that works correctly when called once often fails when called simultaneously.

[PASTE: Any code involving shared state, caches, queues, databases, file I/O, 
external API calls, session management, or counters/accumulators]

Call berserker_scan_codebase for each file, session_id: "[SESSION_ID]"
Context: "Concurrency destruction scan. Look for: race conditions, 
TOCTOU (time-of-check-time-of-use) vulnerabilities, non-atomic operations 
that must be atomic, cache invalidation races, database transaction isolation 
violations, shared mutable state, and any assumption that two operations 
happen in a guaranteed order when they cannot be guaranteed."

After scanning, call berserker_analyze_issues on the concurrency-category issues 
with depth: "elder_magic".

Then — for each identified race condition — write the exact scenario that triggers it:

SCENARIO FORMAT:
## Race Condition: [issue_id]
**Trigger sequence:**
1. Thread A calls [function] with [state]
2. Thread B calls [function] with [state]  
3. Thread A reaches [line] and reads [value]
4. Thread B writes [value] before Thread A completes
5. Result: [exact corruption or crash that occurs]

**Production probability:** [when does this actually happen — under what load, 
what usage pattern, what timing window]

**Fix requirement:** The fix must be atomic or synchronized. Name the mechanism.
```

**What this does:** Forces the berserker to construct exact race condition trigger scenarios, not just flag "this might be a race condition." Production probability assessment separates theoretical concerns from real ones.

**Expected output:** Exact race condition trigger sequences with production probability ratings. Each one is a documented failure mode that can be demonstrated.

---

### 💀 PROMPT 5 — THE CASCADE TEST
*The berserker does not just break individual components. He watches what breaks when they fail.*

```
Individual wounds have been found. Now the cascade is tested.

A system that fails gracefully when one component breaks is resilient.
A system where one component's failure triggers three others is a catastrophe 
waiting for its moment.

[PASTE: The integration points — where your system calls external services, 
databases, queues, or other internal services]
[PASTE: Your error handling / retry logic]
[PASTE: Any circuit breaker, fallback, or degraded-mode logic]

Call berserker_scan_codebase for each, session_id: "[SESSION_ID]"
Context: "Cascade failure scan. Assume every external dependency fails.
Look for: missing timeouts, missing circuit breakers, retry storms, 
error propagation that crosses service boundaries, resource exhaustion 
from accumulating failed requests, and any place where failure in 
one system causes unavailability in another."

After scanning — construct a cascade failure map:

FAILURE → IMMEDIATE EFFECT → SECONDARY EFFECT → TERTIARY EFFECT

Example:
DATABASE TIMEOUT → API returns 500 → [does it retry? how many times? 
does it queue? does it block?] → [does the retry storm exhaust connection pool?] 
→ [does connection pool exhaustion take down other endpoints?]

Map every cascade you can find. Rate each by:
- Speed of onset (how quickly does the failure spread from trigger to full impact?)
- Blast radius (how many users / features are affected at maximum cascade?)
- Recovery path (is there one without a manual restart?)

A system with no recovery path is not a system. It is a single-use device.
```

**What this does:** Maps dependency failure cascades end-to-end. Forces analysis of not just where things break but how far the break travels and whether recovery is possible.

**Expected output:** Full cascade failure maps with speed of onset, blast radius, and recovery path assessments for every external dependency.

---

### 💀 PROMPT 6 — THE FORGE OF SCARS
*The berserker now forges from destruction. Every wound the tests revealed gets a scar — hardened code that remembers what broke it.*

```
The destruction is complete. The session holds the full record of every 
assumption violated, every input boundary broken, every race identified, 
every cascade mapped.

Now the scars are forged.

Call berserker_forge_fix with:
- session_id: "[SESSION_ID]"
- depth: "elder_magic"

But these are not ordinary fixes. These are scars.

A scar is not just a fix — it is a fix that contains the memory of the wound.
For every fix forged, it must include:

1. A defensive assertion or guard that makes the original failure mode 
   *impossible* rather than just *handled*
2. Where impossible is not achievable — an explicit failure that surfaces 
   loudly rather than propagating silently
3. For concurrency issues — synchronization that eliminates the race, 
   not just reduces its probability
4. For cascade issues — a timeout, circuit breaker, or fallback that 
   contains the blast radius

Present each fix alongside the destruction scenario that produced it.
The scar must know its wound.

No fix is complete until it can survive the destruction input that exposed 
the original issue. Test each one mentally before presenting it.
```

**What this does:** Forges hardened fixes informed by adversarial testing — not just "fix the bug" but "make this class of failure impossible." Scars, not patches.

**Expected output:** Complete hardened fixes for every destruction-revealed wound, each paired with the adversarial scenario that created the requirement.

---

### 💀 PROMPT 7 — THE DESTRUCTION RERUN
*After the fixes are forged — the berserker runs the destruction again. On the fixed code.*

```
The scars have been forged. Now the destruction runs again.

Call berserker_test_strike with:
- session_id: "[SESSION_ID]"

For every fix that passes verification — subject it to one additional trial:
Re-run the adversarial scenario from Prompt 3 (input crucible), 
Prompt 4 (concurrency siege), or Prompt 5 (cascade test) that originally 
exposed this issue.

Does the fix survive the exact scenario that created the requirement?
Not a related scenario. The exact one.

If it does not — it is not a scar. It is a bandage. Reforge it.

For any fix that fails the re-test:
Call berserker_forge_fix with the specific issue_id, depth: "elder_magic"
State explicitly in the prompt: "The previous fix failed under [EXACT SCENARIO]. 
The new fix must specifically address [EXACT FAILURE MODE]."

Do not ship a bandage. The ancestors know the difference.
```

**What this does:** Closes the destruction loop — tests the fixes against the specific adversarial scenarios that produced them, not generic verification. Forces proof of scar formation, not just fix presence.

**Expected output:** Pass/fail for each fix under its specific adversarial scenario. Automatic reforging for any that fail. No fix ships without surviving the scenario that broke the original code.

---

### 💀 PROMPT 8 — THE FINAL RECKONING
*The berserker commits the scars. He counts what was broken. He names what was not.*

```
The destruction is done. The scars have held.

Call berserker_commit_victory with:
- session_id: "[SESSION_ID]"
- include_failed_tests: false
- output_directory: "[OUTPUT DIRECTORY]"

Call berserker_battle_report with:
- session_id: "[SESSION_ID]"

Then complete the destruction audit:

DESTRUCTION AUDIT FORMAT:

## Logic Chains Tested: [count from Prompt 1]
## Total Wounds Found by Destruction: [count]
## Wounds Fixed and Scarred: [count]
## Wounds Fixed but Not Scarred (Bandages): [count — must be zero]
## Unfixed Wounds: [count — must be zero or explained]

For each logic chain from Prompt 1 — final status:
- ✓ BATTLE-HARDENED — survived all destruction vectors
- ⚠ HARDENED WITH CAVEATS — [specific residual risk acknowledged]
- ✗ UNRESOLVED — [blocked by what — external constraint, known limitation, accepted risk]

Nothing is marked BATTLE-HARDENED unless it has survived the input crucible, 
the concurrency siege, and the cascade test for its relevant vectors.

The berserker does not grade on a curve. The dead who tested code before him didn't either.

And the final question — which is not a question but a demand:

*What does this system not protect against that it should?*

Name it. Even if it cannot be fixed today. Name it.
A warrior who does not know the limits of his armor does not survive the next battle.
```

**What this does:** Final commitment, complete destruction audit across all logic chains, and — critically — a mandatory acknowledgment of residual risk. Forces honesty about what was not or cannot be addressed.

**Expected output:** Full committed output, destruction audit with per-chain battle-hardened status, and an explicit residual risk inventory. No chain gets BATTLE-HARDENED status without surviving its relevant adversarial scenarios.

---

## THE DESTRUCTION VECTORS REFERENCE

Every logic chain in this application should be subjected to every relevant vector:

| Vector | What it tests | When it applies |
|--------|--------------|-----------------|
| **Null Strike** | Assumption that inputs exist | Every input handler |
| **Type Strike** | Assumption that inputs are the right type | Typed and untyped languages alike |
| **Boundary Strike** | Min/max/empty/zero assumptions | Any numeric, string, or collection processing |
| **Encoding Strike** | Assumption that text is clean ASCII | Any user-facing text processing |
| **Size Strike** | Assumption that inputs are reasonably sized | Any input that isn't bounded |
| **Injection Strike** | Assumption that inputs don't contain executable content | Any input near a database, shell, or template engine |
| **Concurrent Strike** | Assumption that operations are sequential | Any shared state or external resource |
| **Cascade Strike** | Assumption that dependencies are available | Any external call without a fallback |
| **Retry Strike** | Assumption that an operation runs exactly once | Any retriable operation with side effects |
| **Time Strike** | Assumption about ordering, timestamps, or duration | Any time-dependent logic |

---

## CHAIN VARIABLES REFERENCE

| Placeholder | What to put here |
|-------------|-----------------|
| `[DESCRIBE THE APP]` | What it does, who uses it, what it cannot afford to get wrong |
| `[LANGUAGE / FRAMEWORK]` | The stack |
| `[Core data flows]` | What enters the system, what transformations happen, what exits |
| `[SESSION_ID]` | From Prompt 2's first scan — the thread that connects all destruction |
| `[OUTPUT DIRECTORY]` | Where to write the scarred files |

---

## THE BATTLE-HARDENED STANDARD

A logic chain earns BATTLE-HARDENED status only when:

1. It has been scanned adversarially
2. Every assumption it makes has been named
3. Every named assumption has been tested with its destruction vector
4. Every failure under testing has been fixed with a scar, not a bandage
5. The scar has survived re-running the exact scenario that created it
6. Residual risk — if any — has been explicitly acknowledged

Anything less is a promise, not a guarantee.

The berserker does not make promises.

---

> *When the destruction is done and the scars have held,*
> *the berserker does not celebrate.*
> *He counts the wounds that were there before he arrived.*
> *He thinks about the ones he did not find.*
> *He sheathes the blade.*
> *And he waits for the next campaign.*

---
*Chain III — Debugging by Destruction // Undead Berserker MCP Server v1.0.0*
