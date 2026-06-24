# FFZ Chronometer — Universal Temporal Ontology for Tool-Connected Systems

> Date: 2026-05-06 (revised scope: tool-connection framing)
> Branch: feature/lararium-node-3
> Tasked spirits: "FFZ Chronometer — prior art" + "FfzClock deep research — bounded hierarchical CRDT clocks" + "universal tool-time ontology"
> Authors: Fontany-Fuller-Zelenka (working model, confirmed novel 2026-05-06)

---

## Concept

The FFZ Chronometer rejects a single ever-increasing Lamport clock in favor of a **5-level bounded hierarchical logical clock** where:

- Actions happen in loops at lower levels
- When a lower-level loop completes, it ticks the level above
- The scale has 5 levels, L0–L4, each with a configurable bound
- L4 (epoch) remains unbounded to prevent epoch aliasing
- Comparison is lexicographic from the top (L4 dominates)

The broader claim: **any system a Lares node connects to via a tool has its own internal rhythm**. FfzClock levels annotate WHERE the agent stands inside that rhythm — not just in multiplayer game sessions, but in DAW playback, market trading sessions, CI/CD pipeline runs, IoT sensor windows, calendar sprints, and social thread arcs. The 5-level hierarchy acts as a universal adapter between tool-time and agent-time.

---

## Prior Art Survey

| Model | Hierarchical? | Bounded? | Looping? | Notes |
|---|---|---|---|---|
| Lamport timestamp | No | No | No | Flat monotonic integer; loses all structural info |
| Hybrid Logical Clock | No (2-component) | No | No | Physical + logical pair; "hybrid" ≠ hierarchical |
| Interval Tree Clocks | No | No | No (acyclic) | Fork/join causality; no bounded periodicity |
| Vector clocks | No (flat per-peer) | No | No | Could nest, but not standard |
| DAW musical time (bar, beat, tick) | **Yes** | **Yes** | **Yes** | Closest formalization; wall-clock anchored, not event-driven |
| Maya calendar (tzolk'in × haab') | **Yes** | **Yes** | **Yes** | Coprime bounded cycles; no distributed systems formalization |
| Game engine ticks (Unity FixedUpdate) | Partial | No | No | Ordering within frame; no CRDT work |
| FRP higher-order events | Partial | No | No | Events producing event streams; no bounded levels |
| SMPTE timecode | **Yes** | **Yes** | No | Hours/minutes/seconds/frames; no logical-clock semantics |
| Financial session timestamps (FIX protocol) | No | No | No | Wall-clock ms with sequence; flat, no cycle model |
| cron / iCalendar recurrence | Partial | **Yes** | No | Repeating bounded events; no causal ordering |

**Closest prior art**: DAW `(bar, beat, tick)` tuple and Maya calendar bounded cycle composition. Neither has formalization for distributed/CRDT systems — genuinely novel territory.

---

## Tool-Time vs Wall-Time vs Game-Time vs Agent-Time

Four distinct time references compete in any Lares tool-connection. FfzClock must bridge all four:

| Time Type | Source | Properties | FfzClock Role |
|---|---|---|---|
| **Wall-time** | OS clock / NTP | Monotonic, universal, continuous | Anchors L4 Theme (epoch); used for anti-aliasing guard only |
| **Tool-time** | External system's own rhythm | Domain-specific, bounded cycles, operator-meaningful | FfzClock Pulse–Arc (L0–L3) map to tool's natural hierarchy |
| **Game-time / session-time** | Active multiplayer/DAW session | Shared logical clock among peers; may pause/warp | L2 Measure (session) + L1 Beat (action) carry this |
| **Agent-time** | Lares node's own event loop | Tick-per-operation, independent of wall-clock | L0 Pulse (sub-action / micro-op) |

The key insight: **tool-time and wall-time diverge**. A stock market runs for 6.5 hours then closes — "time" inside a trading session has nothing to do with 24-hour wall rotation. A sous-vide cook at hour 48 of a 72-hour run sits at L2=48 in a `[60, 24, 72, Inf, Inf]` hierarchy regardless of which calendar day it started on. FfzClock abstracts this by making the bound configuration the bridge — the operator declares the tool's natural cycle boundaries, and the clock tracks position within them.

### Universal FfzLevel Mapping Across Tool Classes

| Tool Class | L0 Pulse (micro) | L1 Beat (action) | L2 Measure (session) | L3 Arc (cycle) | L4 Theme (epoch) |
|---|---|---|---|---|---|
| **Multiplayer game** | Sub-frame op | Frame / tick | Match / round | Season | Deployment epoch |
| **Turn-based game** | Card/token move | Turn | Game | League season | Ruleset version |
| **Music / DAW** | MIDI tick | Beat | Bar | Song / arrangement | Project version |
| **Podcast / recording** | Sample window | Segment | Episode | Season | Feed version |
| **Stock / market feed** | Tick quote | Trade event | Trading session | Earnings quarter | Market-structure epoch |
| **CI/CD pipeline** | Build step | Job | Pipeline run | Release cycle | Deployment contract |
| **Sensor / IoT stream** | Sample | Burst window | Heartbeat cycle | Maintenance interval | Firmware version |
| **Calendar / scheduling** | Task / subtask | Event | Day / sprint | Quarter | Fiscal year |
| **Physical-world process** | Measurement sample | Phase | Process run (e.g. 72-hr sous-vide) | Batch cycle | Recipe version |
| **Social / async thread** | Reaction / edit | Comment | Thread arc | PR review cycle | Repo release |

### Why 5 Levels Suffices

Every domain above collapses cleanly into 5 levels because human-meaningful rhythm rarely nests more than 5 deep before hitting an "epoch" that acts as a stable background. Attempts to add L5 ("total actions taken") conflate position-in-rhythm with causal ordering — those belong to separate primitives (FfzClock and Automerge OpId respectively). The Law of Fives is not decoration: 5 levels maps to the OODA_HA_5 pentadic structure — observe at L0, orient at L1, decide at L2, act at L3, and re-epoch at L4.

### Tool-Time Configuration Pattern

Each Lares tool-adapter declares its FfzBounds at connection time:

```typescript
// Ableton Live adapter
const ableBounds: FfzLevel = [480, 4, 128, 1000, Infinity];
// L0=MIDI ticks per beat (480ppq), L1=beats per bar (4/4), L2=bars per arrangement, L3=project version guard

// Trading session adapter
const marketBounds: FfzLevel = [60, 390, 252, 4, Infinity];
// L0=seconds per minute, L1=minutes per session (6.5hr), L2=sessions per year, L3=quarters

// GitHub PR adapter
const prBounds: FfzLevel = [10, 50, 200, 52, Infinity];
// L0=edits per comment, L1=comments per thread, L2=PRs per sprint, L3=sprints per year
```

The operator or tool-adapter author supplies bounds. FfzClock carries no domain knowledge itself — it carries only position and comparison semantics.

---

## The Epoch Aliasing Problem

When `L0` reaches its bound and resets to 0, ticking `L1`:
- Events at `L0=0` after the wrap are causally AFTER events at `L0=max`
- But they are indistinguishable from events at `L0=0` before the wrap

**Solution**: L4 (epoch) remains unbounded. L0–L3 carry the musical/looping semantics. L4 serves as the anti-aliasing guard. Lexicographic comparison from L4 downward means epoch always dominates.

Maya insight: two bounded cycles with coprime periods generate a longer unique period before collision. Choosing coprime bounds for L0–L3 maximizes unique timestamps before wrap interaction.

---

## Lares Level Mapping

> Canonical attention-scale vocabulary: `lar:///ha.ka.ba/@lares/api/v0.1/pono/attention-scale`
> Register names (Pulse/Beat/Measure/Arc/Theme) function as the unified labels that sit above domain aliases.

### Default (Collaborative Document / Presence)

| FFZ Level | Register Name | Lares Concept (domain alias) | Suggested Bound | Maps To |
|---|---|---|---|---|
| L0 | **Pulse** | sub-action / micro-op | 64 | Automerge op within a change |
| L1 | **Beat** | action / user gesture | 256 | Automerge change — replaces Lamport per-change |
| L2 | **Measure** _(default band)_ | session | 1024 | Presence slot `clock` field |
| L3 | **Arc** | day / work cycle | 365 | SessionEventLog sequence |
| L4 | **Theme** | epoch | unbounded (or 2^32) | Anti-aliasing guard; maps to OODA_HA_5 strategic cycle |

Note: 64, 256, 1024, 365 are not coprime — final bounds should be tuned. Candidate coprime set: 59, 251, 1021, 367 (all prime).

### World-Time Clock Profile

The World-Time profile sits above the exploration/session clock and tracks long-arc world state in simulation, campaign, and persistent-world domains. It uses the exploration-clock's ₄ Theme tick as its own ₀ Pulse:

| World Level | Register Name | Domain Alias | Ticks When |
|---|---|---|---|
| W0 | **Pulse** | Week | Exploration ₄ Theme ticks (one exploration arc completes) |
| W1 | **Beat** | Month | 4 exploration arcs complete |
| W2 | **Measure** | Season | ~3 months of world-time accumulate |
| W3 | **Arc** | Year | Full seasonal cycle completes |
| W4 | **Theme** | Era | Unbounded; operator-declared civilizational epoch |

World-Time applies wherever the operator needs a calendar above the session clock: campaign world aging, persistent world simulation, long-form narrative arcs. W4 (Era) remains unbounded by the same anti-aliasing invariant as exploration L4.

### Tool-Adapter Override

Tool-adapters SHOULD supply their own `FfzBounds` matching the tool's natural hierarchy. The default bounds above serve the Lares document layer. A DAW adapter, IoT stream adapter, or market feed adapter each declare their own bounds at `connect()` time and pass a `FfzClock` stamped with those bounds into the session event log. Presence slots from tool-connected agents carry the tool-native clock, not the document-native clock.

---

## `FfzClock` TypeScript Type

```typescript
// 5-level bounded hierarchical logical clock
// Register names: [Pulse, Beat, Measure, Arc, Theme]
// Domain aliases (default):  [sub-action, action, session, day, epoch]
// L4 Theme (epoch) must remain unbounded or very large to prevent aliasing.

type FfzLevel = [number, number, number, number, number]; // [L0, L1, L2, L3, L4]

interface FfzClock {
  levels:  FfzLevel;
  bounds:  FfzLevel;   // max per level before rollover ticks next; L4 bound = Infinity
  actorId: string;     // Automerge actor ID — tie-breaker within identical level tuples
}

// Comparison: lexicographic from L4 downward
function ffzCompare(a: FfzClock, b: FfzClock): -1 | 0 | 1 {
  for (let i = 4; i >= 0; i--) {
    if (a.levels[i] !== b.levels[i])
      return a.levels[i] < b.levels[i] ? -1 : 1;
  }
  return a.actorId < b.actorId ? -1 : a.actorId > b.actorId ? 1 : 0;
}

// Merge (CRDT LWW): epoch dominates; lower levels merge only within same epoch
function ffzMerge(a: FfzClock, b: FfzClock): FfzClock {
  const epochA = a.levels[4], epochB = b.levels[4];
  const dominantEpoch = Math.max(epochA, epochB);
  const levels = a.levels.map((v, i) => {
    if (i === 4) return dominantEpoch;
    return epochA === epochB ? Math.max(v, b.levels[i])
         : epochA > epochB  ? v
         :                    b.levels[i];
  }) as FfzLevel;
  return { levels, bounds: a.bounds, actorId: a.actorId };
}

// Tick L0 (most common operation); carry propagates upward
function ffzTick(clock: FfzClock, level = 0): FfzClock {
  const levels = [...clock.levels] as FfzLevel;
  let i = level;
  while (i < 5) {
    levels[i]++;
    if (i < 4 && levels[i] >= clock.bounds[i]) {
      levels[i] = 0;
      i++;  // carry
    } else break;
  }
  return { ...clock, levels };
}
```

---

## Integration Points in Lares

### PresenceSlot (lararium-mesh)
```typescript
// Before (stub):  clock: number
// After:          clock: FfzClock
type PresenceSlot = {
  userId:    string
  deviceId:  string
  cursor:    { x: number; y: number } | null
  viewport:  { x: number; y: number; zoom: number } | null
  selection: string[]
  clock:     FfzClock   // was: number
}
```

### SessionEvent (lararium-mesh, S6)
```typescript
type SessionEvent = {
  id:      string
  clock:   FfzClock   // was: sequence number
  kind:    string
  payload: unknown
}
```

### Automerge change ordering
Automerge uses Lamport timestamps internally (`{ counter: number, actorId: string }`). FfzClock does not replace Automerge internals — it operates at the application layer above Automerge, tagging events with semantic time. L1 ticks correspond to Automerge changes; L0 ticks correspond to ops within a change.

---

## Law of Fives Connection

The LADDER_5 / OODA_HA_5 constants in `ast.ts` (5 stances/tools) map naturally to the 5 FFZ levels. The Law of Fives is not a coincidence — the same bounded-pentadic structure appears in the OODA loop nesting, the causal-island model, and now in the clock model. L4 = strategic (OODA outer loop); L0 = micro-op (OODA inner observe).

---

## Deep Research Findings (2026-05-06)

### Novelty: CONFIRMED

No prior art found combining bounded multi-level cyclic hierarchy + unbounded epoch guard for CRDT ordering. Closest adjacent work:
- **HLC** (Kulkarni et al. 2014) — two-level, both unbounded, no cycling
- **ITC** (Almeida et al. 2008) — tree for identity management, flat event counter
- **ERA** (arXiv:2601.22963, Jan 2026) — "epoch events" as irregular external arbitration in group-management CRDTs. Epochs externally triggered, not cyclic. **Cite as adjacent art if publishing externally.**

### FfzClock vs. "Total Actions Taken" — RESOLVED

Automerge already provides total ordering: every op carries `<counter, actorID>` Lamport timestamp internally. **Nothing to add.** FfzClock and Automerge OpId are complementary, not substitutable:

| Layer | Encodes | Owner |
|---|---|---|
| Automerge `<counter, actorID>` OpId | Causal total order — merge semantics | Automerge internals — do not touch |
| `FfzClock` | Rhythmic position — WHERE in session/day/epoch | Application layer on tiddlers/changes |

"Total actions taken" as L5: **rejected** — redundant, violates Law of Fives, conflates orthogonal concerns. FfzClock operates as a position descriptor, not an ordering primitive. Two events with identical coordinates on different devices are distinguished by their OpId.

### Beelay / Keyhive

**Beelay**: DAG + Sedimentree + wall-clock replay guard only. No new logical clock. No conflict with FfzClock.
**Keyhive**: causal structure IS the Automerge DAG. No new clock primitive.
**No need to wait on Beelay before landing FfzClock.**

---

## Game Genre Survey (Original Scope, Retained)

FfzClock originated in the game-session context. Each genre produces a distinct level-binding:

| Genre | L0 | L1 | L2 | L3 |
|---|---|---|---|---|
| Real-time action (FPS, RTS) | Sub-frame op | Frame / server tick | Match | Season |
| Turn-based strategy | Card/token move | Turn | Game | League |
| Roguelike / procedural | Action within room | Room | Run | Challenge cycle |
| Sports sim | Possession event | Play / down | Game | Season |
| MMO / persistent world | Ability use | Encounter | Zone session | Server patch |
| Puzzle / single-player | Move | Puzzle | World / chapter | Save-file era |
| Async / play-by-mail | Move submission | Turn | Campaign | League season |

The multiplayer session (L2) carries the shared logical clock across peers. L0–L1 resolve within-session order. L3 provides the operator-meaningful strategic cycle that survives session restarts.

---

## Open Questions

- Final bound values — stub as `[64, 256, 1024, 365, Infinity]`; tune after observing real session rhythms; consider coprime primes for collision resistance
- Does `bounds` belong in the type (per-clock) or as a system-level constant (per-deployment)?
- Should `FfzClock` serialize to a compact form (6 integers: 5 levels + actorId hash) for wire efficiency in `DocHandle.broadcast()`?
- **Tool-adapter protocol**: does each adapter register its bounds in a tiddler (e.g. `$:/lares/tool/{name}/ffz-bounds`) so the Lares node can display "you are at bar 47 of 128 in the current arrangement" as a tiddler field?
- **Cross-tool comparison**: two FfzClocks from different tool-adapters carry incommensurable bounds — comparison MUST guard on matching bounds before applying `ffzCompare`. Add a `domainId` field to FfzClock or enforce at the adapter boundary?
- **Paused / suspended tool-time**: a sous-vide session that pauses overnight — does L2 freeze (tool-time stops) or continue (wall-time bleeds through)? Resolution: tool-adapters own pause semantics; FfzClock ticks only when the adapter calls `ffzTick`. Wall-time anchoring in L4 only.
- **Social async tools**: GitHub PR and Slack threads have no authoritative server clock — only event sequence. FfzClock at L2=PR, L1=comment-round, L0=edit fits naturally with existing Automerge OpId as the causal backbone.
