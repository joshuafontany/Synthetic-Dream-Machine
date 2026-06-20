# FfzClock Extended Use Cases

Canonical synthesis of four research spirit reports on FfzClock application beyond session-level rhythmic annotation.

---

## Section 1: Scope

FfzClock supports two use-case families beyond its original scope of session-level rhythmic annotation.

### Use Case 1: Operator-Agent Alignment Over Unknown-Duration Exchange Turns

Operator-agent exchanges do not carry predetermined durations. A single exchange turn may resolve in seconds (a quick clarification) or remain open for hours (an async task dispatched while the operator attends to other work). FfzClock provides a causal ordering substrate for these variable-length turns without relying on wall-clock timestamps, preserving the async-first principle and avoiding server authority over turn boundaries.

### Use Case 2: Tool-Connected System Time

Any external system the operator interacts with through a Lares tool-connection produces its own temporal structure. FfzClock maps onto that structure rather than replacing it. The domain space covers the full genre and tool spectrum:

- **Games**: tabletop RPGs and VTTs, turn-based strategy, async multiplayer, action-RPGs, physics sandboxes (Katamari-style), rhythm games
- **Creative tools**: DAWs, timeline editors
- **Market and financial feeds**: tick-by-tick price streams, order lifecycle events
- **CI/CD pipelines**: build triggers, test runs, deployment gates, rollback cycles
- **IoT and process control**: sous-vide timers, telescope sessions, sensor polling loops
- **Async social workflows**: PR review cycles, Slack threads, code review rounds

Every domain in this list produces a natural hierarchical phase structure. FfzClock's five-level design accommodates all of them through profile-scoped bound tuples.

---

## Section 2: The Grounding Rule

### L1 Anchors to Operator Perceptual Grain

The single most consequential design finding: **L1 anchors to the operator perceptual grain** — the smallest phase transition the operator treats as a completed meaningful unit within their connected system.

Everything else in the level hierarchy derives from this anchor:

| Level | Register Name | Domain Name | Definition |
|-------|---------------|-------------|------------|
| L0 | **Pulse** | Sub-perceptual system tick | The system's smallest internal resolution step; operator-invisible |
| L1 | **Beat** | Operator perceptual grain | The smallest transition the operator treats as a completed meaningful unit — **invariant anchor** |
| L2 | **Measure** _(default band)_ | Session-length arc | A coherent working window; bounded by the operator's attention span for that domain |
| L3 | **Arc** | Day/cycle arc | A recurrent cadence — the rhythm of return to this domain |
| L4 | **Theme** | Epoch | An anti-aliasing guard; unbounded by invariant; declared by operator |

L1 varies by domain and tool profile, but within a given profile it holds invariant as the anchor. The L0–L2–L3 levels derive their meaning by relation to L1, not independently.

### Profile as a Named Bound Tuple

A profile consists of a named `FfzLevel` bounds tuple with a documented L1-grain annotation. No new type extension is needed — `FfzClock.bounds` already carries per-instance bound values. Profile selection happens via a `game-genre` or `tool-context` field on the session tiddler; the `FfzClock` type stays generic.

### Why Profiles Must Not Split

Splitting profiles into separate clock types would break `ffzMerge` CRDT semantics. Epoch dominance provides universal causal ordering across all FfzClock instances. Forked profile types would require translation layers between merge operations, reintroducing a coordination authority to arbitrate between profile-local orderings — a direct violation of SYS_1_WEB3_SMELL_TEST.

### The L0 Sub-Perceptual Constraint

L0 MUST remain sub-perceptual. If a system's smallest operator-meaningful event lands at L0, the L1 anchor erodes — session bounds lose meaning because no clear distinction remains between "a thing the operator noticed" and "a thing the system did internally." Any domain mapping that would assign an operator-visible event to L0 requires a level-shift: that event becomes L1, and a finer system tick becomes L0.

---

## Section 3: Operator-Agent Alignment Level Mapping

### Theoretical Grounding

This mapping draws on:
- Clark & Brennan grounding model (1991) — the distinction between presentation, acceptance, and acknowledgment as distinct acts
- Ginzburg Dialogue Game Board (2012) — the board state tracks pending versus resolved contributions
- MCP SEP-1686 `input_required` state — a held exchange awaiting operator input
- A2A Protocol v0.3 (2025) `input-required` state — agent-to-agent analog
- ReAct framework (Yao 2022) — Thought/Action/Observation as sub-turn micro-steps
- CodeCRDT (arXiv:2510.18893) — causal document convergence as a model for exchange convergence

### Key Principle: L1 Ticks on Grounding, Not on Response Delivery

A response delivered but not yet acknowledged sits in `ExchangeState = "agent-responded"`. The L1 tick has not fired. The tick fires at the grounding act — when the operator acknowledges, redirects, or otherwise closes the exchange turn. This distinction preserves causal consistency: clock advancement reflects operator-confirmed understanding, not agent-side transmission.

### Level Mapping Table

| Level | Register Name | Alignment unit | Tick trigger |
|-------|---------------|----------------|--------------|
| L0 | **Pulse** | ReAct micro-step (Thought / Action / Observation), individual tool call, sub-query | Each micro-step within an agent turn |
| L1 | **Beat** | Exchange turn — operator-intent → agent-response → operator-grounding | Operator grounding act (acknowledge or redirect) |
| L2 | **Measure** | Alignment session — continuous bounded working context | Session close (disconnect, idle timeout, MCP `completed`) |
| L3 | **Arc** | Work cycle / day arc | Wall-clock day boundary or operator-declared sprint end |
| L4 | **Theme** | Epoch / strategic project arc | Operator epoch declaration; unbounded |

---

## Section 4: ExchangeState FSM

### Separation of Concerns

`ExchangeState` belongs on `PresenceSlot` as a separate field, not inside the clock. A blocked L1 — one that has not yet ticked — carries the same clock tuple as an unadvanced L1. No external observer can distinguish "waiting for grounding" from "nothing has happened yet" from clock values alone. The FSM field makes that distinction explicit without polluting clock semantics.

### State Definitions

```typescript
type ExchangeState =
  | "idle"             // no active exchange
  | "operator-sent"    // operator presented intent; agent not yet responded
  | "agent-working"    // agent processing; sub-steps (L0) ticking
  | "agent-responded"  // response delivered; awaiting operator grounding
  | "grounded"         // both parties accepted; L1 tick fires here, then state → "idle"
  | "blocked"          // agent waiting for operator input (MCP input_required)
```

### Async Pause Behavior

During an extended async wait — the operator goes offline for hours after the agent responds — the correct state reads:

- `exchangeState = "agent-responded"`
- Clock remains stable; no phantom ticks advance

On operator return and acknowledgment:

- L1 ticks exactly once (at the `"grounded"` transition)
- `exchangeState` resets to `"idle"`

This preserves the invariant that L1 advances once per exchange turn regardless of wall-clock duration.

---

## Section 5: Game Time and Tool-Time Level Mapping

### Three Universal Patterns

Across every surveyed game genre and tool-connected system, three structural patterns recur:

1. **Bounded inner loop + unbounded outer counter** — every system distinguishes "position within current cycle" from "which cycle am I in." FfzClock's L0/L1 versus L3/L4 split mirrors this directly.

2. **Hierarchical phase nesting** — every domain produces 2–4 natural nesting levels. No domain surveyed required more than four levels below the epoch, matching FfzClock's L0–L3 structure.

3. **Continuous-to-discrete duality** — every real-time or continuous system produces discrete events at action-resolution granularity. L0 ticks at that boundary regardless of whether the underlying engine runs continuous simulation. A physics engine running at 120 Hz does not require L0 to tick 120 times per second; L0 ticks when a simulation step produces an operator-meaningful physical event (an object absorbed, a collision resolved, a note quantized).

### Universal Level Mapping

| Level | Register Name | Tabletop RPG / VTT | Turn-based strategy | Action-RPG (live) | Physics sandbox (Katamari) | Rhythm / DAW | CI/CD pipeline | Market / IoT feed | Async social (PR / Slack) | Operator-agent exchange |
|-------|---------------|--------------------|--------------------|--------------------|---------------------------|-------------|----------------|-------------------|--------------------------|------------------------|
| **L0** | **Pulse** | Dice roll, table lookup, sub-move | Unit action, combat calculation | Attack frame, collision resolution | Object-absorbed physics snap | Individual MIDI event, 192-tick sub-beat | Build step, test assertion | Single tick / sensor sample | Inline comment, file diff hunk | ReAct micro-step, tool call |
| **L1** | **Beat** (grain) | Scene beat — a completed narrative moment | Turn resolution — all units moved | Encounter beat — one meaningful engagement | Rolling decision burst between pickups | Measure / bar — completed musical phrase | Pipeline stage (build / test / deploy) | Candle / bar close, sensor threshold event | Review round — all reviewers responded | Exchange turn — operator grounding act |
| **L2** | **Measure** | Session — one play session | Match / campaign mission | Play session | Level run segment | Song / arrangement section | Release cycle | Trading session / shift | PR open → merge window | Alignment session |
| **L3** | **Arc** | Campaign arc | Season / league | Character arc / patch | Full level run | Album / project | Sprint / quarter | Market cycle / maintenance window | Repo sprint / milestone | Work cycle / day arc |
| **L4** | **Theme** | Chronicle / world-era | Franchise era | Game edition lifecycle | Playthrough | Discography epoch | Product roadmap epoch | Fund / instrument epoch | Organization strategic arc | Strategic project epoch |

### Katamari-Specific Notes

Katamari Damacy provides a clean physics-sandbox exemplar because its temporal structure makes level transitions explicit:

- **L0**: the physics snap of a single object absorbed — discrete, sub-decision, rapid
- **L1**: a rolling decision burst between pickups — the operator chooses direction, estimates reachable objects, and commits; this burst resolves when the operator perceives a completed approach
- **L2**: a level run segment — a stretch of play between orientation pauses
- **L3**: the full level run — from level start to cousin-size target achieved
- **L4**: the playthrough — all levels, one save file

"Thinking about how to play Katamari" means querying: what scale am I at now (L2 position), how many absorptions have I taken in this burst (L0 count), and what run number in this session (L3/L4 counter).

### Rhythm Game Validation

The bar / beat / tick structure of rhythm games and DAWs confirms FfzClock's bounded-cyclic philosophy most precisely of all surveyed domains. Standard values — 192 ticks per beat, 4 beats per measure, 32 measures per section — map cleanly to L0 / L1 / L2 respectively.

However, these standard values share common factors (192 = 2⁶ × 3; 4 = 2²; 32 = 2⁵; all divide by 4). Shared factors produce collision patterns in hash-based CRDT merge paths. A coprime-prime tuning improves collision resistance: choose prime values near these natural domain rhythms rather than the domain values themselves. Examples: 191 ticks per beat (prime near 192), 5 beats per measure (prime near 4), 31 measures per section (prime near 32). The precise final values remain an open question (see Section 8).

---

## Section 6: Bound Profiles by Domain

All profiles leave L4 = Infinity. L4 declarations come from operator epoch declarations, not from domain structure. The `game-genre` or `tool-context` field on the session tiddler selects the active profile; `FfzClock` itself remains type-generic.

The register names (Pulse/Beat/Measure/Arc/Theme) apply uniformly across all profiles; the bound values differ by domain.

| Domain category | L0 Pulse max | L1 Beat max | L2 Measure max | L3 Arc max |
|----------------|--------|--------|--------|--------|
| Operator-agent alignment (default Lares) | 64 | 256 | 4096 | 65536 |
| Tabletop RPG / VTT | 128 | 512 | 2048 | 32768 |
| Turn-based strategy | 256 | 1024 | 8192 | 131072 |
| Action-RPG (live session) | 512 | 2048 | 16384 | 262144 |
| Physics sandbox (Katamari-style) | 1024 | 256 | 4096 | 65536 |
| Rhythm / DAW | 191 | 5 | 31 | 1024 |
| CI/CD pipeline | 64 | 128 | 1024 | 16384 |
| Market / IoT feed | 1024 | 512 | 4096 | 65536 |
| Async social (PR review, Slack thread) | 32 | 64 | 512 | 8192 |

These values represent starting recommendations. Final coprime-prime tuning for the Rhythm / DAW profile in particular requires validation against CRDT merge collision rates (see Section 8).

### World-Time Clock Profile

The World-Time profile sits above the exploration/campaign clock and tracks long-arc world state. Its own Pulse ticks whenever the exploration clock's Theme (L4) advances — i.e., one exploration arc completes.

| World Level | Register Name | Domain Alias | Ticks When |
|---|---|---|---|
| W0 | **Pulse** | Week | Exploration Theme (L4) ticks |
| W1 | **Beat** | Month | 4 World Pulses accumulate |
| W2 | **Measure** | Season | ~3 World Beats |
| W3 | **Arc** | Year | Full seasonal cycle (4 Measures) |
| W4 | **Theme** | Era | Unbounded; operator-declared |

This profile applies in campaign worlds, persistent simulations, and any domain that requires a calendar sitting above the session/exploration clock. W4 Era remains unbounded by the same anti-aliasing invariant as exploration L4 Theme.

Canonical reference: `lar:///ha.ka.ba/@lares/api/v0.1/pono/attention-scale`

---

## Section 7: PENTA_2_CLOCK_ALIGNMENT Revision

The existing `PENTA_2_CLOCK_ALIGNMENT` invariant in `system-invariants.md` describes L1 as "orient-act / action/gesture." The sharper statement:

> **L1 Beat = operator perceptual grain**

The canonical register names for the five levels now read:

| Level | Register Name | OODA-HA mapping | Canonical role |
|---|---|---|---|
| L0 | **Pulse** | Observe | Sub-perceptual system tick |
| L1 | **Beat** | Orient-act | Operator perceptual grain — invariant anchor |
| L2 | **Measure** | Decide | Session-length arc — default operating band |
| L3 | **Arc** | Act | Day/cycle arc — recurrent cadence |
| L4 | **Theme** | Re-epoch | Anti-aliasing guard; strategic cycle |

In the OODA-HA mapping, "orient-act" precisely marks the moment perception resolves into a completed meaningful unit — the point where observation has closed and orientation has produced a decision. This moment defines the Beat regardless of absolute wall-clock duration: a trade execution resolves its Beat in ~200ms; a sous-vide check-in resolves its Beat after ~4 hours. Both qualify as L1 Beat under the operator perceptual grain definition.

The PENTADIC invariant itself holds without modification. The register names (Pulse/Beat/Measure/Arc/Theme) provide unified labels above all domain aliases (sub-action/action/session/day/epoch for default Lares; Action/Round/Turn/Watch/Week for FTLS/TTRPG game time). Domain aliases remain valid within their domain; register names apply system-wide.

Canonical reference: `lar:///ha.ka.ba/@lares/api/v0.1/pono/attention-scale`

---

## Section 8: Open Questions

The following questions remain open as of this synthesis:

1. **Final coprime-prime bound values** — confirmed needed for collision resistance in CRDT merge paths; rhythm game evidence supports choosing primes near natural domain rhythms rather than exact domain values. Specific prime selections for each profile require empirical validation.

2. **`bounds` placement in the type** — confirmed as a per-instance field on `FfzClock`; no change needed to the existing design.

3. **`ExchangeState` as a separate presence field** — confirmed by alignment prior art (Clark-Brennan, Ginzburg DGB, MCP SEP-1686, A2A); implementation location on `PresenceSlot` remains to be specified in detail.

4. **`tool-context` field location** — does the tool-context profile selector live on `SessionTiddler` or on a new `ToolConnectionTiddler`? Open; depends on whether a session can span multiple tool connections simultaneously.

5. **Keyhive capability token scope for tool-connections** — per-tool or per-session? Open; deferred to S9+.

---

## Section 9: Prior Art Citations

- Yao, S. et al. (2022). ReAct: Synergizing Reasoning and Acting in Language Models. arXiv:2210.03629.
- Clark, H. H., & Brennan, S. E. (1991). Grounding in communication. In Resnick, L. B. et al. (Eds.), *Perspectives on socially shared cognition*. APA.
- Ginzburg, J. (2012). *The Interactive Stance: Meaning for Conversation*. Oxford University Press. [Dialogue Game Board model]
- MCP SEP-1686. Async Tasks specification. `input_required` state definition.
- A2A Protocol v0.3 (2025). Agent-to-Agent Protocol specification. `input-required` state definition.
- Frangoudis, N. et al. (2024). CodeCRDT: Conflict-free Replicated Data Types for Collaborative Code Editing. arXiv:2510.18893.
- ERA paper. arXiv:2601.22963. [Adjacent art on event-based reactive architectures; not a direct dependency.]
- Kulkarni, S. et al. (2014). Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases. [HLC — Hybrid Logical Clocks]
- Almeida, P. S. et al. (2008). Interval Tree Clocks. [ITC — prior CRDT clock art]
- IWSDS 2025 turn-taking survey. Proceedings of the International Workshop on Spoken Dialogue Systems Technology, 2025.
- Scheduler-theoretic framework. arXiv:2604.11378. [Adjacent art on task scheduling under uncertainty.]
