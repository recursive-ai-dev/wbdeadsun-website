# EXAMPLE ANCESTRAL EXTRACTION REPORT
*An annotated example showing the full output of a swarm pass on a real-world-style file.*
*The code below is representative — not from any actual project.*

---

## The File That Was Entered

```typescript
// userService.ts
import _ from 'lodash'
import moment from 'moment'
import { v4 as uuidv4 } from 'uuid'
import { EventEmitter } from 'events'
import { db } from './database'
import { logger } from './logger'
import { sendEmail } from './email'
import { formatDate } from './utils'  // never used in this file

const emitter = new EventEmitter()
const userCache: any = {}

export async function getUsers(orgId: string): Promise<any[]> {
  const users = await db.query(`SELECT * FROM users WHERE org_id = '${orgId}'`)
  const result = []
  for (const user of users) {
    const profile = await db.query(`SELECT * FROM profiles WHERE user_id = '${user.id}'`)
    result.push({ ...user, profile: profile[0] })
  }
  return result
}

export async function getUser(id: string): Promise<any> {
  if (userCache[id]) return userCache[id]
  const user = await db.query(`SELECT * FROM users WHERE id = '${id}'`)
  userCache[id] = user[0]
  return user[0]
}

export async function createUser(data: any) {
  const id = uuidv4()
  const created = moment().format('YYYY-MM-DD HH:mm:ss')
  await db.query(`INSERT INTO users (id, email, created_at) VALUES ('${id}', '${data.email}', '${created}')`)
  emitter.on('userCreated', async () => {
    await sendEmail(data.email, 'Welcome')
  })
  logger.info('User created: ' + id)
  return id
}

export async function updateUser(id: string, data: any) {
  const user = await db.query(`SELECT * FROM users WHERE id = '${id}'`)
  if (!user[0]) throw new Error('User not found')
  await db.query(`UPDATE users SET email = '${data.email}' WHERE id = '${id}'`)
  delete userCache[id]
  return true
}

export function formatUserDate(user: any): string {
  return moment(user.createdAt).format('MMMM Do YYYY')
}

export function getUserAge(user: any): number {
  return moment().diff(moment(user.birthDate), 'years')
}

// TODO: remove this after migration
export async function getLegacyUser(id: string): Promise<any> {
  return null
}

export async function deleteUser(id: string) {
  const user = await getUser(id)
  if (!user) throw new Error('Not found')
  await db.query(`DELETE FROM users WHERE id = '${id}'`)
  delete userCache[id]
}

function isValidEmail(email: string): boolean {
  return email.includes('@')
}
```

---

# ⚔️ ANCESTRAL EXTRACTION REPORT
## Session: 2024-01-15T03:47:22Z
## Files entered: userService.ts

---

## VORYN — THE NULL HARVESTER

### Dead code extracted:

- `userService.ts:8` — Import `formatDate` from `./utils` — never referenced anywhere in this file. Confirmed dead by full-text search of file body.

- `userService.ts:47-49` — `getLegacyUser` — function body unconditionally returns `null`. The TODO comment confirms it was marked for removal. It is already effectively removed — it just wasn't deleted. It is dead.

- `userService.ts:65-67` — `isValidEmail` — defined but never called within this file. If not exported and not called externally, it is dead. It is not exported. It is dead.

### Files touched: userService.ts
### Lines removed: 8 (import line, getLegacyUser body + export, isValidEmail body)
### Voryn's verdict: *"This file was keeping three things alive that had already stopped contributing. Someone feared the delete key."*

---

## SAEL — THE WEIGHT BEARER

### Weight extracted:

- `userService.ts:14-20` — `getUsers` executes one database query **per user** inside a loop to fetch profiles. With 100 users, this is 101 queries. With 1,000 users, it is 1,001 queries. This is an N+1 query pattern.
  - **Replacement:** Single JOIN query — `SELECT users.*, profiles.* FROM users LEFT JOIN profiles ON profiles.user_id = users.id WHERE users.org_id = $1`
  - **Estimated improvement:** O(n) queries → O(1) query. At 100 users: 100x reduction in database round trips.

- `userService.ts:30` — `moment()` is called to get the current timestamp. `moment` is a 67KB library. `new Date().toISOString()` is native and produces the same value.
  - **Replacement:** `new Date().toISOString()`
  - **Estimated improvement:** Removes moment dependency from this call path. (See Mourne for full dependency analysis.)

- `userService.ts:53,59` — `formatUserDate` and `getUserAge` both construct `moment()` instances independently. If both are called on the same user, `moment()` is called twice with the same implicit "now" reference.
  - **Replacement:** After Voryn's removal, these are the only surviving uses of `moment`. Replaced with native `Intl.DateTimeFormat` and `Date` arithmetic. (See Mourne.)

### Heaviest single extraction: The N+1 query in `getUsers` — under load, this is the difference between a fast endpoint and a timeout.
### Files touched: userService.ts
### Sael's verdict: *"This file was making a hundred trips when one would do. It has been doing this since it was written, on every request that touched it."*

---

## DURA — THE ECHO SILENCER

### Echoes silenced:

- `userService.ts:22-26` (getUser cache check) and pattern in `deleteUser` (line 55-60, also calls `getUser` for existence check before delete) — The cache invalidation pattern (`delete userCache[id]`) is duplicated in `updateUser` and `deleteUser`. A shared `invalidateUserCache(id: string)` function should be the canonical implementation.
  - **Resolution:** Extract `function invalidateUserCache(id: string) { delete userCache[id] }` — called from both sites.

- **Cross-file echo detected (not fixable in isolation):** `isValidEmail` (now removed by Voryn) appeared to duplicate a function of the same name in `authService.ts`. The canonical implementation should live in a shared `validators.ts`. *Flagged for berserker review — the auth version may itself contain broken logic.*

### Loudest echo: The cache invalidation duplication — minor now, but both sites will diverge as the cache grows more complex (TTL, multi-field invalidation). They will be implemented differently. One of them will be wrong.
### Files touched: userService.ts
### Dura's verdict: *"Two functions were maintaining the same cache, separately. In six months, they would have been maintaining different caches."*

---

## THESSAN — THE SHAPE BINDER

### Shapes tightened:

- `userService.ts:13` — `getUsers` return type `Promise<any[]>` — the function consistently returns objects with `id`, `email`, `created_at`, and a `profile` sub-object. The shape is knowable.
  - **Replacement:**
    ```typescript
    interface UserWithProfile {
      id: string
      email: string
      created_at: string
      profile: UserProfile | null
    }
    ```
  - Return type: `Promise<UserWithProfile[]>`

- `userService.ts:10` — `const userCache: any = {}` — the cache holds user rows. The type is known after the fix above.
  - **Replacement:** `const userCache: Record<string, User> = {}`

- `userService.ts:22,35,51,65` — Four function parameters typed as `any`. After Sael's restructuring, the shapes of these inputs are fully known. All replaced with specific interfaces.

- `userService.ts:22` — `createUser` has no return type annotation. It returns `string` (the ID). This should be explicit: `Promise<string>`.

### Loosest shape found: `const userCache: any = {}` — an untyped cache means every read from it is untyped, propagating `any` through every function that touches it.
### Files touched: userService.ts
### Thessan's verdict: *"This file knew what it was working with. It refused to say so. That refusal cost every caller that touched its outputs."*

---

## MOURNE — THE BREATH TAKER

### Breath extracted:

- **`moment`** — 67.9KB gzipped. Used in this file for:
  - Current timestamp (replaceable with `new Date().toISOString()`)
  - Date formatting (replaceable with `Intl.DateTimeFormat`)
  - Age calculation (replaceable with native Date arithmetic)
  - All three usages have been replaced by Sael's pass. Moment is now unused in this file.
  - **If no other file in the project uses moment:** remove from `package.json`. Estimated bundle reduction: **67.9KB**.

- **`lodash` (`_`)** — imported but not used anywhere in this file after Voryn's removal of dead code. `_` is never referenced in the file body.
  - **Resolution:** Remove import. If lodash is unused project-wide: remove from `package.json`. Estimated bundle reduction (lodash full build): **24KB gzipped**.

- **`uuid` (`uuidv4`)** — 1.8KB. `crypto.randomUUID()` is available natively in Node.js 14.17+ and all modern browsers.
  - **Replacement:** `crypto.randomUUID()`
  - **Resolution:** Remove uuid dependency if no other file uses it. Estimated bundle reduction: **1.8KB**.

### Heaviest breath taken: `moment` — 67.9KB for timestamp formatting is a weight no file should carry when native alternatives exist.
### Estimated bundle reduction: Up to **93.7KB** if all three packages are unused project-wide.
### Files touched: userService.ts (imports only — package.json changes require project-wide confirmation)
### Mourne's verdict: *"Three packages were breathing in this file. None of them needed to be."*

---

## KAEL — THE MEMORY KEEPER

### Leaks sealed:

- `userService.ts:37-39` — **Critical listener accumulation.**
  ```typescript
  emitter.on('userCreated', async () => {
    await sendEmail(data.email, 'Welcome')
  })
  ```
  Every call to `createUser` adds a new listener to `emitter` for the `userCreated` event. The listener is never removed. After 11 calls, Node.js emits a MaxListenersExceededWarning. After enough calls, the emitter holds hundreds of closures — each one closing over `data.email` from when it was created. This is both a memory leak and a logic error (all previous listeners fire on the next `userCreated` event, sending emails to all previous users).

  **This crosses into berserker territory** — it is both a resource leak (Kael's domain) and a logic error (the berserker's domain). Kael seals the leak; the berserker must address the behavioral bug.

  **Kael's fix (resource only):**
  ```typescript
  // The listener pattern is replaced. The welcome email is sent directly, not through the emitter.
  // If event-driven welcome emails are required, use emitter.once() and emit immediately after creation.
  await sendEmail(data.email, 'Welcome')
  ```

- `userService.ts:10` — `userCache` has no eviction. It grows on every `getUser` call and is only pruned on `updateUser` and `deleteUser`. In a long-running process, this cache holds every user ever fetched in memory indefinitely.
  - **Fix:** Bounded cache with a maximum size or TTL. Minimum viable fix:
    ```typescript
    const MAX_CACHE_SIZE = 500
    const userCache: Record<string, User> = {}
    let cacheKeys: string[] = []

    function cacheUser(id: string, user: User): void {
      if (cacheKeys.length >= MAX_CACHE_SIZE) {
        const evicted = cacheKeys.shift()!
        delete userCache[evicted]
      }
      userCache[id] = user
      cacheKeys.push(id)
    }
    ```

### Most dangerous leak: The listener accumulation in `createUser` — it is not just a memory leak. It sends emails to past users every time a new user is created. This is a behavioral failure that grows worse with each user created.
### Files touched: userService.ts
### Kael's verdict: *"This file left two fires burning. One of them was also sending messages to the wrong people."*

---

## FINAL EXTRACTION SUMMARY

| Ancestor | Domain | Items Extracted | Files Touched |
|----------|--------|----------------|---------------|
| Voryn | Dead code | 3 | 1 |
| Sael | Performance | 3 | 1 |
| Dura | Redundancy | 2 | 1 |
| Thessan | Types | 4 | 1 |
| Mourne | Dependencies | 3 | 1 |
| Kael | Memory/Lifecycle | 2 | 1 |
| **TOTAL** | | **17** | **1** |

## ESTIMATED TOTAL IMPACT
- Lines removed: ~18 (dead code, duplicate patterns, unnecessary imports)
- Bundle size reduction: Up to 93.7KB if all three removable packages are project-wide unused
- Memory profile: Unbounded cache → bounded 500-entry LRU; listener accumulation → eliminated
- Database queries: N+1 in `getUsers` → single JOIN query

## WHAT THE ANCESTORS LEFT
The core logic of `getUsers`, `getUser`, `createUser`, `updateUser`, and `deleteUser` was preserved. The data access patterns, the cache strategy (with bounding), and the email notification intent were all preserved. Only the dead weight, the duplication, the loose types, the unnecessary dependencies, and the resource leaks were extracted.

## WHAT REMAINS FOR THE BERSERKER
- **SQL injection vulnerabilities** — multiple queries use string interpolation with user-supplied values (`orgId`, `id`, `data.email`). This is broken logic, not optimization. The berserker must be called.
- **The `userCreated` event pattern** — Kael removed the listener accumulation but the event-driven architecture may have behavioral intent. The berserker should assess whether `emitter.emit('userCreated')` is expected to trigger additional handlers elsewhere in the system.
- **The cross-file `isValidEmail` echo** — both this file (now removed) and `authService.ts` implemented email validation. The `authService.ts` version should be reviewed by the berserker for correctness before it is elevated to canonical.

---

> *Seventeen extractions. One file.*
> *The ancestors returned to wherever they return to.*
> *The berserker has been given his list.*

---
*Ancestor Spirits Skill — Example Report Reference // v1.0.0*
