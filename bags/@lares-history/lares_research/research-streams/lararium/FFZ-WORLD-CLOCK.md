# FFZ World Clock — Multi-Temporal Architecture for Lares

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Research spirits: world-state temporal models + multi-temporal distributed systems + Lares architecture synthesis

---

## The Tension

FfzClock currently sits on `PresenceSlot` — the operator's ephemeral broadcast. That placement handles operator-session time correctly. But the world/tool/game carries its own clock(s), and those clocks answer fundamentally different questions:

| Clock | Owns what | Lives where | Ticks when |
|---|---|---|---|
| Operator clock | Session rhythm | PresenceSlot (ephemeral) | Operator actions |
| World clock | Shared diegetic state | World tiddler (persistent) | Explicit advancement |

One Tuesday session may advance the world clock by 3 weeks, or by zero. These axes run orthogonally and must never coerce one into another.

---

## The Core Rule (Rhine / Verraes / Snodgrass)

Three independent research domains converge on the same principle:

> **Name the clock at the type/schema level. Let each clock have exactly one owner. Require explicit mediation whenever two clocks interact. Never allow one clock's value to appear in a context expecting another without an explicit coercion that documents the intention.**

- **Rhine (FRP, ACM Haskell 2018)**: clock identity encodes in the type signature. The type checker rejects composition of signals at incompatible rates without a declared resampling combinator. "A signal is only meaningful relative to its clock."
- **Verraes (event sourcing, 2022)**: a domain event spans multiple time axes when it crosses contexts. Each axis names explicitly: `deposited_at` (world time) vs `recorded_at` (transaction time). Never conflate them in a projection.
- **Snodgrass (bi-temporal databases, 1999 / SQL:2011)**: valid time (when a fact held true in the world) vs transaction time (when the system recorded it). Axes never implicitly roll up — queries must always specify which axis they fold over.

For Lares: `OperatorClock` answers "where is this operator in their session rhythm?" and `WorldClock` answers "where does the shared world stand in its own time?" These constitute two independent valid-time axes on different tiddler aggregates.

---

## Three-Layer Separation (from surveying Minecraft, Valheim, Foundry, DAWs, SpatialOS)

Every system that gets this right uses three layers:

### Layer 1 — Document Layer (persisted clock value)
The durable last-known clock value. Lives in the save file, database record, or world tiddler. Outlives any session. In Minecraft: `DayTime` field in `level.dat`. In Foundry: `worldTime` in LevelDB world-scoped settings. In Lares: a `WorldClockTiddler` in the world's `LarDoc`.

### Layer 2 — Process Layer (autonomous tick source)
The component that actually advances the clock. Minecraft's server main loop (20 ticks/second). SpatialOS's singleton worker. The lararium-node process. When no operator connects, a server-tick system advances time autonomously; a role-gated system (Foundry) freezes. This is a deployment choice — the world's `tickPolicy` field declares it.

### Layer 3 — Presentation/Control Layer (operator interface)
The operator reads and optionally advances the clock (Foundry's Simple Calendar, Valheim's HUD, PresenceSlot's `worldClockRef`). Holds no write authority unless explicitly granted by the writePolicy.

The lararium-node maps naturally to Layer 2 — it operates as the persistent peer (server-as-peer law) and constitutes the natural tick source for shared world state.

---

## ECS Pattern: Component Types as Clock Namespaces

Flecs (Sander Mertens) and Unreal's Mass ECS use `SharedFragment` components to let entity subsets share one clock while other subsets share a different clock. The component type prevents cross-clock reads by construction: a system querying `WorldClock` cannot accidentally read `SessionClock` without explicitly declaring both in its query.

For Lares: model `OperatorClock` and `WorldClock` as distinct tiddler types (distinct `kind` field values). Systems/filters that update presence state touch only `kind: "operator-clock"`; systems updating world state touch only `kind: "world-clock"`. The tiddler kind serves as the clock's namespace.

---

## Proposed `WorldClockTiddler` — Lares Architecture

Lives as a dedicated tiddler in the world's `LarDoc` at a canonical URI:

```
lar:///ha.ka.ba/@world/{worldId}/clock
```

This makes the world clock a first-class tiddler — queryable via TW5 filter syntax, reachable via the lar: URI scheme, taggable, indexable.

```typescript
// WorldClockTiddler — field shape for a world clock tiddler
// Lives in the world's LarDoc at lar:///ha.ka.ba/@world/{worldId}/clock
interface WorldClockTiddler {
  readonly worldId:     string;         // matches world doc ID
  readonly kind:        "world-clock";
  // Named clock profiles — each value is ffzSerialize(FfzClock)
  readonly clocks: {
    readonly "world-time": string;      // World-Time profile (Week/Month/Season/Year/Era)
    readonly "diegetic":   string;      // FTLS exploration profile (Action/Round/Turn/Watch/Week)
    readonly [name: string]: string;    // open-ended named profiles
  };
  // Bounds per profile — JSON-encoded FfzLevel tuple
  readonly clockBounds: {
    readonly "world-time": string;
    readonly [name: string]: string;
  };
  /**
   * writePolicy controls who may advance this clock.
   * "keyhive:{gmCircleUri}"        — GM-only (TTRPG campaign)
   * "group:{allPlayersCircleUri}"  — any connected operator (Minecraft/Valheim)
   * "private"                      — lararium-node process only (autonomous tick)
   */
  readonly writePolicy:  string;
  /**
   * tickPolicy declares Layer 2 behavior when no operator connects.
   * "autonomous"  — lararium-node advances clock continuously (Minecraft model)
   * "freeze"      — clock pauses when no authorized operator present (Foundry model)
   * "manual"      — clock advances only by explicit operator action (calendar model)
   */
  readonly tickPolicy:   "autonomous" | "freeze" | "manual";
  /** ISO 8601 wall-clock timestamp of last clock advancement — for drift detection */
  readonly lastTickedAt?: string;
}
```

---

## PresenceSlot Changes

`PresenceSlot` references the world clock without owning it:

```typescript
// Additions to PresenceSlot (in social-doc.ts)
// Replace single `clock: FfzClock` with named map:
readonly clocks:        Record<string, FfzClock>;   // keyed by clock-context name
// e.g. { "session-clock": FfzClock, "diegetic-clock": FfzClock }

// Reference to the active shared world clock tiddler:
readonly worldClockRef?: string;   // lar: URI of WorldClockTiddler
```

The operator's `clocks` map carries personal clock profiles. `worldClockRef` provides the join point for rendering — the UI reads the world clock tiddler at the URI to display the shared calendar.

---

## Concurrent Advancement and FfzMerge

When two operators both tick the world clock simultaneously, `ffzMerge` applies epoch-dominance LWW at L4, then per-level max within the same epoch.

Example: both operators at `[2,0,1,3,0]`, one advances to `[3,0,1,3,0]`, the other to `[2,1,1,3,0]`. Merge produces `[3,1,1,3,0]` — the furthest state across both, not a double-tick.

Semantic reading: the world moved forward once to the furthest point either operator advanced it. Correct behavior for world time — you cannot un-advance a calendar.

Under Keyhive write-gating (`writePolicy: "keyhive:{gmCircleUri}"`), concurrent writes from non-authorized peers fail at the capability layer before reaching Automerge, so the merge question only arises for open-write worlds.

---

## Bi-temporal Events: The World-Advancement Pattern

When an operator explicitly advances the world clock, that act constitutes a bi-temporal event carrying both clock values. Following Verraes's multi-temporal event pattern:

```typescript
interface WorldTimeAdvancedEvent {
  kind:             "world-time-advanced";
  worldClockDelta:  FfzClock;   // how far the world clock moved (the advance)
  atSessionClock:   FfzClock;   // operator's session clock at the moment of advancement
  byOperator:       string;     // DID of the operator who advanced it
  sessionId:        string;     // which session this occurred within
}
```

This makes the bi-temporal join explicit and auditable — you can later ask "what was the operator doing (session time) when they advanced the world clock by 3 weeks?"

---

## Open Questions

- `tickPolicy: "autonomous"` on lararium-node: what granularity does the node tick at, and how does it avoid clock drift relative to wall-clock time?
- Does the world clock tiddler live inside the room's `LarDoc` (campaign/session doc) or a dedicated top-level world doc? (Current recommendation: room's LarDoc — avoids doc proliferation)
- Multiple worlds in one Lararium (e.g., running two TTRPG campaigns simultaneously): each gets its own `@world/{worldId}/clock` tiddler — no sharing
- `WorldTimeAdvancedEvent` as a `SessionEvent` with `clock: FfzClock` — should world-advancement events flow through the session event log?
- Keyhive capability scope for world clock write: per-world or per-Lararium?

---

## Prior Art Citations

- Verraes, M. (2022). [Eventsourcing Patterns: Multi-temporal Events](https://verraes.net/2022/03/multi-temporal-events/)
- Snodgrass, R.T. (1999). Developing Time-Oriented Database Applications in SQL. Arizona. SQL:2011 standard.
- Fowler, M. [Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)
- Perez, I. & Baudin, M. (2018). [Rhine: FRP with Type-Level Clocks](https://dl.acm.org/doi/10.1145/3242744.3242757). ACM SIGPLAN Haskell Symposium.
- Kleppmann, M. (2020). [CRDTs: The Hard Parts](https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html)
- Mertens, S. [Flecs Pipeline docs](https://www.flecs.dev/flecs/group__c__addons__pipeline.html)
- Minecraft Wiki. [Java Edition level format — DayTime](https://minecraft.wiki/w/Java_Edition_level_format)
- Foundry VTT. [GameTime API](https://foundryvtt.com/api/classes/foundry.helpers.GameTime.html)
- Ableton. [Link documentation](https://ableton.github.io/link/)
- Heroic Labs. [Nakama authoritative multiplayer](https://heroiclabs.com/docs/nakama/concepts/multiplayer/authoritative/)
- Improbable. [SpatialOS read/write authority](https://docs.improbable.io/reference/13.6/shared/design/understanding-access)

---

## Code Changes Queued (waiting on operator go-ahead)

- `social-doc.ts`: replace `PresenceSlot.clock: FfzClock` with `clocks: Record<string, FfzClock>` + `worldClockRef?: string`
- `social-doc.ts`: add `WorldClockTiddler` interface + `readWorldClockTiddler()` helper
- `social-doc.ts`: add `WorldTimeAdvancedEvent` interface
- `lararium-node`: add `WorldClockTickService` implementing `tickPolicy` dispatch
- `attention-scale.md`: add `WorldClockTiddler` integration note to `#clock-profiles` section
