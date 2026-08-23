# Lararium Tick Clock — Unified Event Loop Architecture

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Research spirits: Verse/UEFN execution model + actor model sim tick + distributed multi-clock event streams

---

## The Core Finding

Verse gives us the **shape**, not the engine. The Lararium tick clock should adopt Verse's structured-concurrency interface (`subscribable<T>` / `listenable<T>`, scope-bound task lifetimes via `race`/`branch`) while replacing UEFN's fixed global simulation loop with a **configurable multi-rate scheduler**. Automerge sync time and simulation tick time constitute fundamentally different time bases — they share a subscription interface, not a clock.

---

## Two Time Bases That Must Not Conflate

Automerge operates on **wall-clock async I/O time** — network latency, disk flush, peer sync arrival. Irregular, event-driven, not rate-bounded. A sync patch may arrive 200ms after the last one, or 3 hours later.

The simulation tick operates on a **configurable fixed-rate clock** — regular, predictable, the heartbeat of the node's computational loop. 20–60 Hz for interactive sessions; slower for batch/background work.

These need to be two separate clocks with explicit bridging via ingress adapters, not a single unified tick. The Verse `Sleep(0.0)` pattern (yield to next tick) maps cleanly onto the simulation side but has no analogue for async CRDT merge arrival.

**CRDT merge events are always-commit.** Verse's STM-backed transactional rollback (`race` cancels a branch and rolls back state) does not apply to Automerge documents — a merged op cannot be un-merged. The tick clock treats CRDT merges as feed-in events that cross the ingress boundary, not participants in transactional scope.

---

## Three-Layer Architecture (Nakama + Flecs + Verse synthesis)

### Layer 1 — Ingress Ring per Source

Each event source gets its own bounded ring buffer. Adapters enqueue without blocking the simulation.

```
Source                  Adapter             Ring
──────                  ───────             ────
Automerge sync          CrdtIngressAdapter  crdt-ring
TW5 VM result           VmIngressAdapter    vm-ring
Operator message        SessionAdapter      session-ring
External tool tick      ToolBridgeAdapter   tool-ring[toolId]
```

Each adapter stamps events with a **Hybrid Logical Clock (HLC)** timestamp at ingestion — decoupling internal tick sequence from wall-clock skew. Adapter writes set `external-clock-received` on observed-clock tiddlers (see below). Adapters own the clock translation boundary; the tick loop never touches external clocks directly.

Backpressure: ring depth signals overload. CRDTs tolerate event drop/reorder (Automerge ops merge idempotently); adapters may shed redundant patches under pressure.

### Layer 2 — Unified Tick Loop

A single coordinator ticks at a configurable base rate (default: 20 Hz for the lararium-node). Each tick:

1. Drain all ingress rings in priority order
2. Apply CRDT merge patches to relevant DocHandles
3. Run TW5 recipe queue (recipes triggered by doc changes)
4. Dispatch outbound events to session/presence broadcast
5. Advance the **tick counter** (monotonic sequence number)

**Flecs-style RateFilter chaining** for sub-tick rates:

```
base tick (20 Hz)
  └─ crdt-sync flush (1 Hz)        — batch Automerge saves
  └─ world-clock persistence (0.1 Hz)  — write world tiddler to disk
  └─ presence broadcast (5 Hz)     — PresenceSlot broadcast
```

The tick counter serves as the node's **logical sequence number** — monotonically incrementing, independent of wall time, usable as a causal anchor across all event sources. It is NOT a FfzClock — it carries no bounded-cyclic semantics. FfzClock lives above it as application-layer annotation.

### Layer 3 — Observers for Reactive Subsystems

Components that respond only to document changes register as change-listeners rather than running every tick. Automerge's `DocHandle.on("change", ...)` maps directly to a Verse-style `subscribable<DocChange>`. Zero idle-tick cost when nothing changes.

```
// Verse-inspired subscription interface (TypeScript shape)
interface LarEventBus {
  // Subscribe to a named event stream
  subscribe<T>(eventType: string, handler: (event: T) => void): Cancelable;
  // Await the next event of a type (suspends until fired)
  listenOnce<T>(eventType: string): Promise<T>;
  // Structured concurrency: race N event streams, cancel losers
  race<T>(...streams: LarEventStream<T>[]): Promise<T>;
  // Structured concurrency: branch child task, scope-bound lifetime
  branch(task: () => Promise<void>): void;
}
```

Structured cancellation — `branch` tasks cannot outlive their parent scope — addresses Automerge's change-listener accumulation problem when handles are abandoned.

---

## The Lararium Tick Clock Is NOT a FfzClock

| Clock | Type | Lives on | Driven by |
|---|---|---|---|
| Tick counter | Monotonic integer | Node process memory | Fixed-rate scheduler |
| FfzClock (session) | 5-level bounded | PresenceSlot tiddler | Operator grounding act |
| FfzClock (diegetic) | 5-level bounded | World tiddler field | Explicit fiction advancement |
| FfzClock (world-cal) | 5-level bounded | World tiddler field | Diegetic ₄ rollover |

The tick counter provides the join key: "TW5 VM ran recipe X during tick 47291, which corresponded to exchange turn 8 of session 3." It does not encode rhythmic position; it encodes sequence. FfzClock encodes rhythmic position. They serve different questions.

---

## Five Clock Domains — Owned vs Observed

```
Clock domain          Owned or Observed   Authority           Data home
──────────────────    ─────────────────   ─────────────────   ──────────────────
Lararium tick         Owned               Node process         Process memory
Session/exchange      Owned               Operator (via        PresenceSlot tiddler
                                          grounding act)
Connected-world       Observed            External system      Observer tiddler
                                          (Valheim, etc.)      (read-only fields)
Diegetic/combat       Observed*           World document       WorldClockTiddler
World calendar        Observed*           World document       WorldClockTiddler
```

*Observed from any individual node's perspective unless that node holds `writePolicy` capability. The shared world document owns these; individual nodes observe via Automerge sync.

---

## Observed Clock Tiddler Shape

External clock values land as LWW-Register field clusters in dedicated tiddlers. No `ffzTick` calls on these fields — only the named ingress adapter holds write authority.

```
title                   = "$:/lares/clocks/connected-world/valheim"
kind                    = "observed-clock"
external-clock-domain   = "connected-world/valheim"
external-clock-value    = "47"            # string; external system's own units
external-clock-units    = "in-game-days"
external-clock-hwm      = "47"            # high-water-mark: max observed, never decreases
external-clock-stale    = "false"         # true if no update within timeout window
external-clock-received = "0:3:2:1:0"    # ffzSerialize(FfzClock) at time of observation
external-clock-source   = "valheim-bridge-adapter"
```

**High-water-mark (`external-clock-hwm`):** Never decreases. Implements the Flink watermark pattern — "external clock has reached AT LEAST this value." A world event that triggers at day 50 queries `hwm >= 50`, not `value == 50`. This handles out-of-order delivery gracefully.

**Stale flag:** If no update arrives within N session ticks, `external-clock-stale = "true"`. The last known value becomes a lower bound, not a current fact. The node treats observations differently when stale.

**`external-clock-received`:** The FfzClock position (session clock) when this observation arrived — provides the bi-temporal anchor. You can later ask: "what was the operator doing when the Valheim world reported day 47?"

---

## Verse-Style Event Subscription — What to Adopt

From Verse, adopt the **interface shape**:
- `subscribable<T>` → `DocHandle.on("change", ...)` and tool bridge callbacks
- `listenable<T>` → `Promise`-based one-shot awaits within the tick loop
- `race(A, B)` → "apply whichever of local mutation or remote sync arrives first"
- `branch(task)` → scope-bound spawned tasks tied to session lifetime (auto-cancel on disconnect)
- `Sleep(0.0)` equivalent → `await nextTick()` — yield to next tick without wall-clock wait

Do NOT adopt:
- UEFN's fixed global tick rate (build configurable multi-rate scheduler)
- STM transactional rollback across CRDT boundaries (Automerge is always-commit)
- `<suspends>` effect propagation as a viral type constraint (use standard async/await boundary instead)

---

## Open Questions (Code Design)

- `LarEventBus` as a class in `@lararium/mesh` or `@lararium/node`? (Node-specific; probably `@lararium/node`)
- Does `lararium-browser` get a lighter `BrowserEventBus` with reduced tick rate (RAF-driven rather than fixed interval)?
- `WorldClockTickService` in lararium-node: which tick rate drives `tickPolicy: "autonomous"` world clocks?
- Does the TW5 VM recipe queue drain synchronously within a tick, or does each recipe run as a `branch` task?
- Ring buffer implementation: use existing Node.js EventEmitter, or a proper bounded ring (e.g., `mnemonist` CircularBuffer)?

---

## Prior Art

- Verse structured concurrency: `race`/`branch`/`sync`/`rush` — [UnrealFest 2023](https://www.youtube.com/watch?v=B3WiSgKXsrg)
- Verse `subscribable<T>` / `listenable<T>` — [Epic UEFN API docs](https://dev.epicgames.com/documentation/en-us/fortnite/verse-api/versedotorg/verse/subscribable)
- Nakama `MatchLoop` queue-drain pattern — [Heroic Labs](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)
- Flecs RateFilter + Observers — [flecs.dev](https://www.flecs.dev/flecs/group__c__addons__timer.html)
- Akka timer + mailbox per rate — [Akka docs](https://doc.akka.io/libraries/akka-core/current/actors.html)
- Flink watermarks — [Confluent event-time processing](https://developer.confluent.io/patterns/stream-processing/event-time-processing/)
- Kafka three-timestamp domains — [Confluent patterns](https://developer.confluent.io/patterns/stream-processing/event-time-processing/)
- HLC (Kulkarni 2014) — ingress timestamp pattern
- Automerge `DocHandle.on("change")` — [automerge.org](https://automerge.org)
