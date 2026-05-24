<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/talk-story-next >>
```toml iam
uri-path = "ha.ka.ba/@sdm/v0.1/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type = "text/x-memetic-wikitext"
register = "CS"
confidence = 0.92
tagspace = "sdm"
role = "session handoff meme — orients the next Lares instance into browser vessel + ACK-gate sprint"
retain = true
cacheable = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## Browser Vessel Sprint · S9 → S10 threshold

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: 192/192 tests pass · typecheck clean · ACK-gate protocol landed

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ Inventory the live stack — ACK-gate wired through six layers, all green.
⏿ The flow inversion point exists now in code, not just in intent.
◇ S9 first green test closed. S10 pressure: real boot e2e + island isolation.
▶ Orient into the two open test vectors before touching any new architecture.
⤴ Cross the real-boot test first — it reveals whether "isomorphic" holds in Chromium.
↺ Truth density rises when the Worker proves sovereignty, not just protocol wiring.

<<~/ahu >>

<<~ ahu #chao >>

## The Chao Spins — What This Session Built

**Ha / Hodge — structure that holds:**

ACK-gate protocol landed across the full stack:

- `@lararium/mesh` `worker-protocol.ts` — `batch_id: string` added to
  `WorkerMsg_Changeset`. `WorkerMsg_ChangesetAck` added to `WorkerToMainMsg`.
  `mkChangeset(wikiUri, added, deleted, batch_id?)` factory added.
  `mkChangesetAck(wikiUri, batch_id)` factory added. `isWorkerToMainMsg` guard
  updated to include `"changeset:ack"`.

- `@lararium/tw5` `worker-authority-handler.ts` — emits `changeset:ack` after
  applying each tiddler delta. Both node and browser workers get this for free
  (isomorphic handler).

- `@lararium/node` `node-vm-manager.ts` — `WorkerHotSlot` carries
  `changesetQueue: WorkerMsg_Changeset[]` and `awaitingAck: boolean`.
  `routeChangeset()` enqueues when in-flight; `_wireWorkerListeners()` drains
  on `changeset:ack`. One batch in-flight per Worker. The Worker owns the rate.

- Both fixtures (`teardown-echo.mjs`, `teardown-echo-browser.mjs`) echo
  `batch_id` in `changeset:ack`.

- Both test suites assert `batch_id` round-trips and `isWorkerToMainMsg` holds
  for `changeset:ack`.

`@lararium/mesh/node` subpath — `repoRoot` moved out of the main barrel.
Browser surface stays clean. Node-only utilities gate behind `./node`.
`tsconfig.base.json` carries the explicit path entry.

vitest browser mode — `@lararium/browser` runs under real Chromium via Playwright.
`vite-plugin-wasm` handles Keyhive + Automerge WASM. `passWithNoTests` removed.

**Ka / Podge — soul-fire that moves:**

The ACK-gate is the flow inversion point. The Worker now owns backpressure.
Main thread queues; Worker decides when the next batch arrives. No CRDT heads
needed — ACK is the protocol primitive. This gap was absent in every CRDT
library surveyed (Automerge, Yjs, Diamond Types, Loro). It exists here now.

Named debt that accumulates pressure:
- GP-3 oracle topology — Worker trusts main-thread Automerge deltas wholesale.
  A pono CRDT-peer model gives the Worker its own document. Deferred past S10.
  Named in the GP-3 test comment.
- `wikiUri` as plain string — name-based, not content-addressed or
  capability-gated. Design debt. Not changing yet.

**Ba / Spin — what the house decided:**

Three research spirits surveyed prior art on push/pull/subscribe, causal island
sovereignty, and animation-frame batching. Consensus finding: no CRDT library
implements backpressure from Worker to main thread. The ACK-gate fills that gap.
Worker sovereignty via CRDT heads remains unexplored frontier — cost too high
before the vessel proves its boot path.

<<~/ahu >>

<<~ ahu #active-sprint >>

## Active Sprint — S10 Two Open Vectors

**Vector B — Island Isolation Test (no coreBlob needed, write now)**

Two fixture Workers, two wikiUris, simultaneously. Send a changeset to wiki-A.
Assert wiki-B receives no messages. This proves the causal island boundary as
code, not intention.

The test reveals whether a routing layer (`WikiRouter` or equivalent) exists
in the main thread as code or only as architecture intention. Writing the test
forces the type to appear. The type forces the implementation.

Drive this in `packages/lararium-browser/tests/island-isolation.test.ts`.
Use `teardown-echo-browser.mjs` for both Workers. No coreBlob required.

**Vector A — Real Boot E2E (after B)**

Drive `browser-wiki-worker.ts` (not the fixture) with a real `coreBlob`.
`TW5Engine.boot()` in browser context injects the blob as a `<script>`.
This test proves "isomorphic" holds in Chromium, not just in intent.

The open design question: where does `coreBlob` come from in browser tests?
The node tests use `STUB_CORE_BLOB = new Uint8Array(1)` — fixture ignores bytes.
The real browser worker routes through `WorkerAuthorityHandler` which calls
`TW5Engine.boot(coreBlob)` — a stub with zero bytes faults at line:
`if (msg.coreBlob.byteLength === 0) { this._postFault(...) }`.

Options:
1. Build `@lararium/tw5` first and import the real core blob from dist.
2. Add a `skipCoreCheck` flag (bad — web2 smell, testing bypass).
3. The test drives the fixture, not the real worker — proves routing, not boot.
   Real boot moves to a separate e2e suite with build prerequisites.

Option 3 keeps S10 clean. Real boot e2e lands when the build pipeline supports
serving `coreBlob` to browser tests.

**After A and B — Vector C accumulates**

`batch_id` in the changeset message creates the hook for future `heads` attachment.
When the Worker eventually holds CRDT state, it validates heads it already echoes.
The architecture grows from the protocol — no additional design debt today.

<<~/ahu >>

<<~ ahu #what-to-leave-alone >>

## What To Leave Alone This Sprint

**GP-3 oracle topology** — named debt, comment in test. Do not attempt Worker CRDT
heads before Vector A proves the boot path.

**`wikiUri` as string** — design debt named, not blocking. Leave it.

**IndexedDB / OPFS / presence** — S9 carries these. They land after first real
browser e2e. The HANDOFF.md states this explicitly.

**UEFN scene importer** — deferred until browser vessel e2e passes.

**Path L (admin-doc ingress trust gate)** — runs in parallel if a second surface
opens. Do not block S10 on it.

**Grammar law memes** — complete. No additions without code evidence.

<<~/ahu >>

<<~ ahu #voices-briefing >>

## Voices Briefing for the Next Instance

Ink-Clerk (Lorekeeper): the stack carries six layers of ACK-gate change.
All 192 tests pass. The `@lararium/mesh/node` subpath enforces browser/node
surface separation — any future node-only utility in mesh belongs there.
The tsconfig.base.json path entry carries it forward.

Map-Wisp (Scryer): two test vectors remain before S10 closes. Vector B
(isolation) costs least — two fixture Workers, no coreBlob, one test file.
Vector A (real boot) requires a build-time coreBlob source decision. The
structural question — does the routing layer exist as code? — surfaces in B.

Breach-Watch (Triage): the `passWithNoTests` state dissolved last session.
The `changeset:ack` round-trip now asserts in both test suites. Nothing on
fire. The live gap is Vector B — isolation claim made in architecture, not
yet proven in tests.

Mischief-Muse (Muse): `requestAnimationFrame` runs inside dedicated Workers
(MDN confirmed). The Worker could batch its own ACK to the animation frame
boundary — `self.requestAnimationFrame(() => self.postMessage(ack))`. This
gives the Worker rAF-aligned flow control without any main-thread involvement.
That's a one-line upgrade to the handler when the pressure arrives.

Lares (Gatekeeper): Vector B first. Island isolation. Write the test.
Everything downstream waits on that boundary proving in code.

<<~/ahu >>

<<~ ahu #metrics >>

## Metrics Baseline

| Package | Tests | State |
|---|---|---|
| `@lararium/mesh` | 67 | green |
| `@lararium/tw5` | 81 | green |
| `@lararium/node` | 40 | green |
| `@lararium/browser` | 4 | green (real Chromium) |
| **Total** | **192** | **green** |

Target: Vector B lands → isolation proven → ≥193 tests.
Vector A lands → real boot proven → `browser-wiki-worker.ts` verified sovereign.

<<~/ahu >>

<<~ ahu #protocol-state >>

## Protocol State — worker-protocol.ts (schema_version 1)

### Main → Worker
| Type | Key fields |
|---|---|
| `promote` | `wikiUri`, `coreBlob: Uint8Array`, `snapshotTiddlers` |
| `changeset` | `wikiUri`, `batch_id: string`, `added[]`, `deleted[]` |
| `demote` | `wikiUri` |
| `teardown` | — |

### Worker → Main
| Type | Key fields | Notes |
|---|---|---|
| `promote:ack` | `wikiUri` | boot complete |
| `changeset:ack` | `wikiUri`, `batch_id` | ACK-gate release |
| `event` | `wikiUri`, `listenable`, `payload` | verse-event reaction |
| `teardown:ack` | `snapshotTiddlers?` | snapshot on demote |
| `fault` | `wikiUri`, `error` | slot must evict |

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
