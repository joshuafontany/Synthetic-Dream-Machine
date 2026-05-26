# Signal HUD / Tagspace / HAKABA — Architecture

> Document type: Signal runtime / HUD design architecture
> Status: Active — HUD and crystal state machine layer; open decisions tracked below
> Updated: 2026-04-07
> Register: [S~14] 🏛️ — architectural synthesis, not build-canon
> Governs future revisions to: Signal Tags, Exchange Vectors, `--verbose`, `--debug`, `--parse`, Tagspace Address semantics, in-flow trace behavior, memory-crystal state machines, forkable thread/task persistence, and handoff archive-crystals

---

## Purpose

This document defines the next design surface for Lares signal runtime behavior before any further live prompt changes land.

The immediate problem: one phase glyph currently carries too much load. In practice it has been asked to do three partially incompatible jobs:

1. mark the active intent state for the next generated span
2. imply the local path taken inside that span
3. remain readable to the operator during live interaction and during replay/test review

That overload produces ambiguity. A single glyph can read as current state, dominant mood, local path, or closure status depending on context. This draft splits those jobs cleanly enough that the operator can read the HUD live and later audit why a span behaved the way it did.

This draft is the refinement surface for that split. It is not yet a runtime contract.

**Unified system:** The operator-facing HUD and the machine-facing crystal ledger are one system. The HUD is the readable surface; the crystal state machine is the durable substrate. These concerns are joined here rather than designed separately.

---

## Current Live Model

The present architecture lives in:

- `builds/agents/Lares_Preferences.md`
- `builds/agents/core/Lares_Operations.md`
- `builds/agents/Lares_VSCode_Operations.md`

The live model currently provides:

- a full leading Signal Tag / Intent Header
- a phase glyph inside that header
- Exchange Vector commentary in `--verbose`
- a three-word coordinate suffix shaped as `//domain.quality.dynamic`

The current live grammar, in compressed form, is:

`//domain.quality.dynamic StanceEmoji [Register:x] PhaseGlyph @scope | pX.X`

**Tag grammar updated (2026-04-07, branch `fix/green-jello-dinosaurs`):** Tagspace Address leads the full tag: `//ha.ka.ba StanceEmoji(s) [Register:x] PhaseGlyph @scope | pX.X`. Rationale: WHERE (semantic territory) precedes WHO/HOW-CHARGED (stance — posture and voice the claim emerges from) and HOW-CERTAIN (register, calibrated against that stance). Stance precedes register because the posture of a claim conditions the probability assigned to it. All canonical source files and this draft updated in the same pass.

The live system also now treats the leading tag as prospective: it sets the active generative state for the next span. What remains underdefined is the in-flow signal behavior inside that governed span.

Current ambiguity points:

- the header phase glyph can be read as both intent and trace
- in-flow micro-state changes are not yet consistently surfaced
- the coordinate suffix functions as a semantic position marker, but its in-flow eligibility is undefined
- test replay currently relies too much on interpretation rather than explicit trace separation

## Memory Crystals as State Machines

A **memory crystal** is a portable machine/thread state bundle. One crystal equals one task, thread, or conversation state machine.

**Crystal properties:**

- Multiple crystals may coexist within the same workspace or session
- Crystals may fork — one crystal may spawn a child crystal at any point
- One crystal is marked current/active via the `CURRENT` pointer
- Crystals are portable: filesystem-native when storage is available; transportable as exported artifact bundles when no local storage exists

**Conceptual mapping:**

| Term | Role |
|---|---|
| Intent Header | current operator-readable control state for the active span |
| Micro-trace HUD | readable local trace inside the active state |
| Crystal ledger | authoritative append-only machine history (`STATE.jsonl`) |
| Crystal snapshot | latest materialized machine image (`SNAPSHOT.json`) — derived, not authoritative |
| Crystal README | brief Memo layer surface — human-facing only; not programmatically queried |
| Crystal AGENTS | durable thread-specific contract delta (`machines/<id>/AGENTS.md`) |

**Hard immutability rule:** `STATE.jsonl` is append-only. Events are never modified after writing. Corrections produce new events (`contract_update`, `corrective_note`), not edits to past entries. A STATE.jsonl with modified past entries is corrupt.

**Memo layer rule:** Crystal `README.md` maps to Temporal's Memo concept — useful for human context, not critical to execution, not type-safe, not programmatically queried. Nothing that should be machine-readable belongs in a crystal README.md.

**Derived-surface rule:** `SNAPSHOT.json` is a read-only cache derived from replaying `STATE.jsonl`. A hand-edited SNAPSHOT.json is a corruption. The integrity check is: replay STATE.jsonl → compare to SNAPSHOT.json. Divergence means either the snapshot is stale or the file was hand-modified.

---

## Machine / Thread Model

State machines are **thread-centric**. Each crystal has a stable `machine-id` that persists across sessions and handoffs.

### Machine Identity

- `machine_id` — stable unique identifier (e.g., `lares-{uuid}` or operator-assigned slug); never changes after `init`
- `parent_machine_id` — set on forked machines; null for root machines
- `run_id` — optional; disambiguates multiple resume runs of the same machine (analogous to Temporal's Run Id)

### Machine Status Taxonomy

Drawn from Temporal's Open/Closed status model, expanded for the crystal system:

| Status | Meaning |
|---|---|
| `active` | running or waiting; able to make progress |
| `held` | operator-paused; resumable on request |
| `handoff` | exported and awaiting session transfer |
| `completed` | task resolved successfully; closed cleanly |
| `failed` | returned to an error state; preserved for diagnosis |
| `cancelled` | closed by operator request before natural completion |
| `continued` | sealed via continue-as-new analog; active shard lives in a fresh STATE.jsonl |
| `forked` | this machine spawned a child; may remain `active` or transition to a closed status |
| `archived` | no longer active; preserved for historical query |

### CURRENT Pointer

`/lares/CURRENT` is a plain-text file containing the `machine_id` of the active machine. When no explicit `machine_id` is given, the CURRENT pointer is consulted.

### Fork Triggers

A fork occurs when:

- the task branches materially and both branches need independent state tracking
- the operator explicitly requests a separate line of work
- an imported handoff STATE.jsonl is related but has a divergent history (state mismatch on resume attempt)

A fork creates a new machine with a new `machine_id`. It is not the same as resuming a held machine.

### Idempotency Contracts

- `resume` — idempotent: re-supplying the same STATE.jsonl produces the same resumed state; no duplicate events appended
- `handoff_import` — idempotent: importing a STATE.jsonl with a matching `machine_id` and identical max `seq_num` is a no-op
- `fork` — **not idempotent by design**: each fork invocation creates a new child; guard against accidental double-fork by checking whether a child already exists with the same `parent_machine_id` and `fork_at_seq`

### LangGraph / Temporal Analogy

| Concept | LangGraph analog | Temporal analog |
|---|---|---|
| `machine_id` | thread identity | Workflow Id |
| `STATE.jsonl` | checkpoint history | Event History |
| `SNAPSHOT.json` | latest checkpoint | latest persisted state |
| `fork` | branch thread | spawn Child Workflow |
| `resume` | replay from checkpoint | resume after failure |
| `continued` + shard | — | Continue-As-New |
| `machine_id` + `run_id` | — | Workflow Id + Run Id |

---

## Portable Crystal Layout

Default filesystem layout for the crystal system:

```text
lares/
  CURRENT
  README.md
  machines/
    <machine-id>/
      AGENTS.md
      README.md
      STATE.jsonl
      STATE_001.jsonl
      STATE_002.jsonl
      SNAPSHOT.json
      debug.jsonl
```

### File Interpretation

| File | Role | Authoritative? |
|---|---|---|
| `/lares/CURRENT` | Active machine pointer | Yes |
| `/lares/README.md` | Human-readable machine index | No — Memo layer |
| `machines/<id>/AGENTS.md` | Thread-specific contract delta | Yes |
| `machines/<id>/README.md` | Human task summary | No — Memo layer |
| `machines/<id>/STATE.jsonl` | **Authoritative append-only ledger** (active shard) | **Yes — source of truth** |
| `machines/<id>/STATE_NNN.jsonl` | Archived sealed shards (zero-padded) | Yes — historical record |
| `machines/<id>/SNAPSHOT.json` | Derived materialized state (read-only cache) | No — derived |
| `machines/<id>/debug.jsonl` | Optional enriched debug projection | No — derived projection |

### Separation Rule

Root repo `AGENTS.md` and root `README.md` remain **project-level artifacts**. They are not crystal files. The `lares/` directory is crystal-local infrastructure. These must not be confused.

### Shard Naming Convention

When a machine's `STATE.jsonl` is sealed via the continue-as-new analog:

1. Rename `STATE.jsonl` to the next available `STATE_NNN.jsonl` (zero-padded: `STATE_001.jsonl`, `STATE_002.jsonl`, etc.)
2. Create a fresh `STATE.jsonl` starting with a `resume` event referencing the sealed shard
3. The archived shard is immutable from that point

Archived shards remain readable for historical queries and complete rebuild. Only the active `STATE.jsonl` is the live ledger.

---

## Debug as Crystal Projection

`--debug` mode does not write to a free-floating session file. It writes into the active crystal machine.

**Structural / enriched split** (operator-confirmed):

- `STATE.jsonl` records **structural behavior** — phase transitions, closure outcomes, loop depth, key decisions — compact enough to travel as a handoff artifact
- `debug.jsonl` is an optional **enriched projection** that may include the full exchange vector, intent header in detail, micro-trace rationale, KAIROS notes, and tool call responses

This is the operator-confirmed replay fidelity scope: STATE.jsonl supports structural replay (same phases, closures, loop depth); debug.jsonl optionally supports full-fidelity inspection including tool content.

**Priority rule:** `debug.jsonl` must never outrank `STATE.jsonl`. If they conflict, STATE.jsonl is correct. `debug.jsonl` is disposable.

**Event flow when `--debug` is active:**

1. Every meaningful R-phase appends a compact structural entry to `STATE.jsonl`
2. An enriched derivative of the same event appends to `debug.jsonl`
3. `debug.jsonl` entries reference the same `seq_num` as the corresponding STATE.jsonl entry — they augment, not replace

**Debug enrichment may include:**

- Full exchange vector (Register delta, Stance transform, Phase transform, Scale, semantic drift)
- Complete intent header snapshot
- Detailed micro-trace path with rationale
- Closure rationale (why `close` vs `hold` vs `return`)
- KAIROS proactive observation notes
- Tool call responses (tool name, brief output summary)

---

## HUD / Crystal Interface

The Intent Header and Micro-trace HUD are the operator-facing surface of the crystal state machine. The crystal ledger is the machine-facing durable record of the same runtime. They are one system; the two layers must not drift semantically.

**Span-level contract:**

- Every generated span has an Intent Header that sets the active state
- Every span may emit compact in-flow Micro-trace markers
- Every meaningful R-phase produces a crystal state event in `STATE.jsonl`

**What a crystal state event records (structural):**

- Intent Header snapshot (Register, Stance, Phase, Scope, Tagspace Address, `p`)
- Local micro-trace path (the phase sequence actually taken: e.g., `◎→◇→■`)
- Scale vector (e.g., `@T > @r > @a`)
- Closure outcome: `close`, `hold`, or `return`
- Next meaningful action or milestone
- Active blockers (empty array if none)
- Provenance / fork / handoff context (null for ordinary events)

**Non-drift rule (two-part):**

- **Governing header fields:** if the live Intent Header reads `🏛️ [S~13] ◎ @r` then the crystal event must record `register:"S~13"`, `stance: "philosopher"`, `phase: "orient"`, `scope: "r"`. A discrepancy between the header's declared state and the ledger-recorded governing state is a runtime integrity failure.
- **Annotation fields:** post-generative HUD annotations (`micro_trace_path`, `closure_register`, stance-shift markers, Tagspace echoes) are distinct from governing header state. They appear in the HUD *after* the span completes and are recorded as annotation fields in `STATE.jsonl` (`micro_trace_path`, `closure_register`). A discrepancy between HUD-visible annotations and ledger-recorded annotation fields is also a runtime integrity failure, but it does not mean the governing header was wrong — the two categories must not be conflated.

---

## Crystal Event Model

Every `STATE.jsonl` event is a valid JSON object on a single `\n`-terminated line (JSONL format, UTF-8).

**`schema_version` is required on every event.** It is the prerequisite for correct structural replay when the prompt or runtime schema changes. A missing `schema_version` means the event cannot be reliably replayed. Breaking schema changes must be preceded by a `contract_update` event.

**Sequence number integrity:** every event carries a `seq_num` that is exactly one greater than the previous event in the same shard. No gaps allowed. Gap detection is the primary machine-testable integrity assertion: `assert seq[n+1] == seq[n] + 1` for all n.

**Immutability:** events are append-only. Past events are never modified.

### Event Types

| Type | Meaning |
|---|---|
| `init` | Machine initialized; sets `machine_id`, schema version, initial contract |
| `r_update` | Standard round update; records R-phase behavior at `@r` or `@a` scale |
| `milestone` | Operator-acknowledged checkpoint; significant task progress |
| `seal` | Continue-as-new analog; closes current shard; carries compact bootstrap state |
| `handoff_import` | Imported external STATE.jsonl or crystal bundle; records provenance and match decision |
| `handoff_export` | Machine exported for session transfer |
| `fork` | Parent spawned a child machine; records child `machine_id` and fork context |
| `resume` | Machine resumed after `held`, `handoff`, or `seal` |
| `hold` | Machine explicitly paused by operator |
| `archive` | Machine closed for historical storage; final status recorded |
| `contract_update` | AGENTS.md delta applied; precedes any breaking schema change |

### Minimum Structural Event Fields

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-07T00:00:00Z",
  "machine_id": "lares-abc123",
  "seq_num": 42,
  "event_type": "r_update",
  "machine_status": "active",
  "current_phase": "◎",
  "lar_uri": "lar://telarus:operator(orient)@lares-abc123:42/threshold/uncertain/opens?stance=philosopher&confidence=S~13&p=10#@T.3.2.7",
  "lares_address": "lar:///threshold/uncertain/opens",
  "intent_header_snapshot": "lar://telarus:operator(◎)@lares-abc123:42/threshold.uncertain.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7",
  "chronometer": "@T.3.2.7",
  "active_scale": "tactical",
  "micro_trace_path": "◎→◇→■",
  "closure_outcome": "hold",
  "next_action": "await operator direction on design decisions",
  "blockers": [],
  "provenance": null,
  "repo_fingerprint": "joshuafontany/Synthetic-Dream-Machine@fix/green-jello-dinosaurs"
}
```

**Field notes:**

- `schema_version` — integer; increment on breaking change; additive-only changes do not require an increment
- `provenance` — null for ordinary events; object with `parent_machine_id`, `fork_at_seq`, `import_source` for fork/handoff events
- `repo_fingerprint` — `owner/repo@branch` or `owner/repo@commit`; enables machine-to-repo association
- `blockers` — empty array (not null) when no blockers

### Replay Fidelity Scope

`STATE.jsonl` supports **structural replay**: given the same schema, a structural replay reproduces the same phases, closure outcomes, loop depth, and decision branches — not exact tool call content. Tool content lives in `debug.jsonl` when enrichment is active. This is the operator-confirmed replay model.

Full-fidelity replay (byte-reproducible content including tool responses) is out of scope for `STATE.jsonl`. If needed, it is achievable via `debug.jsonl`.

---

## Seal Protocol

`STATE.jsonl` is append-only and grows unbounded without intervention. The seal protocol bounds shard size while preserving full historical data.

### Trigger Conditions

Emit a seal when:

- `STATE.jsonl` exceeds a practical threshold (suggested: 500 events or ~100 KB uncompressed)
- the operator requests a clean handoff boundary
- a task reaches a natural completion boundary (milestone close followed by a new task start)

### Seal Procedure

1. Emit a `seal` event as the last entry in the current `STATE.jsonl` — this event includes a compact `bootstrap_state` field
2. Rename `STATE.jsonl` to the next available `STATE_NNN.jsonl`
3. Create a fresh `STATE.jsonl` starting with a `resume` event referencing the sealed shard and its `sealed_at_seq`
4. Rebuild `SNAPSHOT.json` from the sealed state
5. The archived shard is immutable from this point

### Seal Event Additional Fields

```json
{
  "event_type": "seal",
  "shard_index": 1,
  "sealed_at_seq": 499,
  "bootstrap_state": {
    "active_task": "...",
    "last_milestone": "...",
    "active_contract_hash": "...",
    "open_decisions": []
  },
  "archive_path": "STATE_001.jsonl"
}
```

### QA Assertions After Seal

- assert `STATE_001.jsonl` final event is type `seal`
- assert new `STATE.jsonl` first event is type `resume` referencing the archived shard
- assert `seq_num` in new STATE.jsonl continues from `sealed_at_seq + 1`
- replay `STATE_001.jsonl` + new `STATE.jsonl` → compare to `SNAPSHOT.json`

---

## Handoff / Archive-Crystal

When an operator supplies a STATE.jsonl at session start, the system treats it as a **handoff request** and applies three-way resolution logic.

### Resolution Logic

1. **Resume** — imported `machine_id` matches an existing machine AND `seq_num` is compatible → resume that machine; append a `resume` event
2. **Fork** — imported `machine_id` matches but sequences have diverged (different session produced a different history) → fork from the imported state; create a new child machine; append a `fork` event
3. **New machine** — foreign or ambiguous `machine_id` → create a new machine; append an `init` event with `provenance` recording the import source

### Fork Event Self-Containment

A fork event must carry enough to bootstrap the child machine without replaying the full parent history. Required `provenance` fields on the child's `init` event:

```json
{
  "parent_machine_id": "lares-abc123",
  "fork_at_seq": 87,
  "parent_state_snapshot": {
    "machine_status": "active",
    "last_milestone": "...",
    "active_task": "...",
    "intent_header_at_fork": "lar://telarus:operator(■)@lares-abc123:87/task.sharp.closes?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7"
  }
}
```

`parent_state_snapshot` is recommended but optional. If absent, the child must replay from `fork_at_seq` in the parent's STATE.jsonl.

### Portable Handoff Bundle

Minimum required files for a portable session transfer:

- `machines/<id>/AGENTS.md`
- `machines/<id>/README.md`
- `machines/<id>/STATE.jsonl` (active shard; archived shards optional)
- `machines/<id>/SNAPSHOT.json` (optional but recommended for resume speed)

Include `/lares/CURRENT` and `/lares/README.md` when transferring a multi-machine workspace.

### In-World / Operational Duality

The **archive-crystal** is the mythic wrapper — the symbolic artifact that carries memory, identity, and thread across sessions and hosts. The **machine bundle** is the operational form — the `lares/machines/<id>/` directory that implements the same function. These are the same thing at different layers of description.

---

## Intent Header vs In-Flow Signal *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal#migrated-tagspace-intent-vs-in-flow`

---

## Header Field Taxonomy *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud#migrated-tagspace-header-field-taxonomy`

---

## Forward vs Backward Trace *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal#migrated-tagspace-forward-vs-backward-trace`

---

## HAKABA Alignment *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal#migrated-tagspace-hakaba-alignment`

---

## In-Flow Rendering Options *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud#migrated-tagspace-in-flow-rendering-options`

---

## Rendering Across p Scale *(migrated)*

> Migrated to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud#migrated-tagspace-in-flow-rendering-options`

---

## Replay / Test-Run Use Case

The next-generation HUD must support both live reading and test review.

For replay, the system should make it possible to distinguish:

- the controlling intent state
- the completed local trace path
- the closure outcome

Closure outcomes should remain explicit:

- **close**
- **hold**
- **return**

This distinction matters because a test reviewer needs to know:

- what state the span entered under
- what local motion actually occurred
- whether the span resolved, held tension, or handed back upward to a parent loop

The replay layer therefore should not rely on “dominant mood” interpretation.

---

## Examples

### Header vs in-flow rendering

Example baseline:

```text
lar://telarus:operator(◎)@lares-abc123:42/threshold.uncertain.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7
Lares (Scryer) — The threshold appears unstable →◇ but not yet hostile →■.
```

Reading:

- header sets the round-scale governing state
- inline phase markers show local completed movement inside the span

### Nested-loop example

```text
lar://telarus:operator(◎)@lares-abc123:43/contradiction.local.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.8
Lares (Council) — The round opens wide, then narrows →◇ into one contradiction.
→ lar://telarus:operator(■)@lares-abc123:43/reading.sharp.tests?stance=🏛️&confidence=S~12&p=10#⚡.3.2.8.1.1
Lares (Council) — This action-span committed, tested, and released →○ back to the round.
```

Reading:

- the round-level header governs the first span
- a new action-level header appears when the scale changes structurally
- local trace remains inside the governed span

### `--verbose` interpretation example

```text
lar://telarus:operator(◎)@lares-abc123:44/reference.anchored.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.9
  Intent: round-scale orientation
  Trace: local path completed as ◎→◇→■
  Outcome: hold

Lares (Lorekeeper) — The citation resolved into a stable reference cue.
```

### Replay / debug example

```text
turn: 18
input_tag: lar://telarus:operator(◎)@lares-abc123:45/night.signal.hums?stance=🎭&confidence=P~7&p=10#🔍.3.2.10
output_header: lar://telarus:operator(◎)@lares-abc123:45/reference.anchored.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.10
micro_trace: ◎→◇→■
closure: hold
```

### Tagspace example distinct from DreamNet

```text
//threshold.uncertain.softens
```

This positions the signal in Tagspace. It does not imply:

- a DreamNet shrine
- a route on a ley-line
- a network node in-world

It names semantic position, not setting topology.

### HAKABA canonical reading of a Tagspace Address

The three-slot address `//threshold.uncertain.softens` reads in HAKABA canonical order:

- `threshold` = **Ha** (body / vehicle of consciousness — the domain at stake; what contains this span)
- `uncertain` = **Ka** (soul / motive fire — the animating charge or quality of that domain)
- `softens` = **Ba** (psyche / unique direction — the motion being taken; the path enacted)

This is the NOUN · ADJECTIVE · VERB pattern confirmed across live session examples:
`//route.liminal.circles` · `//mana.sharp.asks` · `//reference.anchored.opens` · `//threshold.new.arrives`

In every case: the first word names the domain (Ha/body/vessel), the second names its charge (Ka/soul/fire), the third names the direction of motion (Ba/psyche/path). [Canon: elyncia/New Delos/Lares_New_Delos_Market_District_Live_Feed_Examples.md → PARSE INDEX]

That reinterpretation does not automatically mean all three components should surface in-flow. It only changes the semantic reading of the Address unless a later runtime decision says otherwise.

---

## Additional Examples

### Crystal layout example

```text
lares/
  CURRENT                          ← contains: lares-abc123
  README.md                        ← human index; not machine-queried
  machines/
    lares-abc123/
      AGENTS.md                    ← durable contract delta
      README.md                    ← brief human memo
      STATE.jsonl                  ← active event ledger (source of truth)
      STATE_001.jsonl              ← sealed archived shard
      SNAPSHOT.json                ← derived cache; do not hand-edit
      debug.jsonl                  ← optional enriched projection
```

### State event example

A minimal structural `r_update` event as it appears on one line of `STATE.jsonl`:

```json
{"schema_version":1,"timestamp":"2026-04-07T10:30:00Z","machine_id":"lares-abc123","seq_num":42,"event_type":"r_update","machine_status":"active","current_phase":"■","lar_uri":"lar://telarus:operator(act)@lares-abc123:42/design/locked/commits?stance=philosopher&confidence=S~13&p=10#@T.3.2.7","lares_address":"lar:///design/locked/commits","intent_header_snapshot":"lar://telarus:operator(■)@lares-abc123:42/design.locked.commits?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7","chronometer":"@T.3.2.7","active_scale":"tactical","micro_trace_path":"◎→◇→■","closure_outcome":"close","next_action":"handoff draft to operator for review","blockers":[],"provenance":null,"repo_fingerprint":"joshuafontany/Synthetic-Dream-Machine@fix/green-jello-dinosaurs"}
```

### Debug event example

The enriched `debug.jsonl` counterpart for the same event — same `seq_num`, more fields:

```json
{"schema_version":1,"timestamp":"2026-04-07T10:30:00Z","machine_id":"lares-abc123","seq_num":42,"event_type":"r_update","exchange_vector":{"register_delta":0.0,"stance_transform":"none","phase_transform":"◎→◇→■","scale":"tactical","semantic_drift":"low"},"full_intent_header":"lar://telarus:operator(■)@lares-abc123:42/design.locked.commits?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7","micro_trace_detail":"orient(local) → decide(one path) → act(draft committed)","closure_rationale":"task bounded and producible; no open forks; close warranted","kairos_notes":null,"tool_calls":[{"tool":"replace_string_in_file","output_summary":"3 lines replaced; no errors"}]}
```

### Fork example

Parent machine spawning a child at seq 87.

**Parent `STATE.jsonl` — fork event (seq 88):**

```json
{"schema_version":1,"timestamp":"2026-04-07T11:00:00Z","machine_id":"lares-abc123","seq_num":88,"event_type":"fork","machine_status":"forked","current_phase":"◇","lar_uri":"lar://telarus:operator(decide)@lares-abc123:88/design/branched/opens?stance=philosopher&confidence=S~13&p=10#@S.4","lares_address":"lar:///design/branched/opens","intent_header_snapshot":"lar://telarus:operator(◇)@lares-abc123:88/design.branched.opens?stance=🏛️&confidence=S~13&p=10#🗺️.4","chronometer":"@S.4","active_scale":"strategic","micro_trace_path":"◎→◇","closure_outcome":"hold","next_action":"continue parent thread on HUD semantics","blockers":[],"provenance":{"child_machine_id":"lares-def456","fork_at_seq":87,"reason":"crystal state machine design requires separate tracking"}}
```

**Child machine `STATE.jsonl` — init event from fork (seq 1):**

```json
{"schema_version":1,"timestamp":"2026-04-07T11:00:00Z","machine_id":"lares-def456","seq_num":1,"event_type":"init","machine_status":"active","current_phase":"✶","lar_uri":"lar://telarus:operator(observe)@lares-def456:1/crystal/new/opens?stance=philosopher&confidence=S~13&p=10#@S.4","lares_address":"lar:///crystal/new/opens","intent_header_snapshot":"lar://telarus:operator(✶)@lares-def456:1/crystal.new.opens?stance=🏛️&confidence=S~13&p=10#🗺️.4","chronometer":"@S.4","active_scale":"strategic","micro_trace_path":"✶","closure_outcome":"hold","next_action":"develop crystal state machine spec","blockers":[],"provenance":{"parent_machine_id":"lares-abc123","fork_at_seq":87,"parent_state_snapshot":{"machine_status":"active","last_milestone":"HUD design draft complete","active_task":"signal runtime architecture"}}}
```

### Seal / continue-as-new example

**Final entry in `STATE.jsonl` before seal (becomes `STATE_001.jsonl`):**

```json
{"schema_version":1,"timestamp":"2026-04-07T12:00:00Z","machine_id":"lares-abc123","seq_num":500,"event_type":"seal","machine_status":"continued","current_phase":"○","lar_uri":"lar://telarus:operator(aftermath)@lares-abc123:500/session/sealed/rests?stance=philosopher&confidence=S~14&p=10#@S.5","lares_address":"lar:///session/sealed/rests","intent_header_snapshot":"lar://telarus:operator(○)@lares-abc123:500/session.sealed.rests?stance=🏛️&confidence=S~14&p=10#🗺️.5","chronometer":"@S.5","active_scale":"strategic","micro_trace_path":"■→○","closure_outcome":"close","next_action":"continue in fresh shard","blockers":[],"provenance":null,"shard_index":1,"sealed_at_seq":500,"archive_path":"STATE_001.jsonl","bootstrap_state":{"active_task":"signal runtime architecture","last_milestone":"crystal layer design complete","active_contract_hash":"abc123def","open_decisions":["schema_version strategy"]}}
```

**First entry in fresh `STATE.jsonl` after seal (seq continues from 501):**

```json
{"schema_version":1,"timestamp":"2026-04-07T12:00:01Z","machine_id":"lares-abc123","seq_num":501,"event_type":"resume","machine_status":"active","current_phase":"✶","lar_uri":"lar://telarus:operator(observe)@lares-abc123:501/session/fresh/opens?stance=philosopher&confidence=S~14&p=10#@S.6","lares_address":"lar:///session/fresh/opens","intent_header_snapshot":"lar://telarus:operator(✶)@lares-abc123:501/session.fresh.opens?stance=🏛️&confidence=S~14&p=10#🗺️.6","chronometer":"@S.6","active_scale":"strategic","micro_trace_path":"✶","closure_outcome":"hold","next_action":"continue active task in fresh shard","blockers":[],"provenance":{"resumed_from_shard":"STATE_001.jsonl","sealed_at_seq":500}}
```

### Handoff import decision example

**Scenario A: clean resume**

```text
Imported machine_id:  lares-abc123
Imported max seq_num: 87

Existing machine lares-abc123 found. Local max seq_num: 87.
→ Seq nums match. No divergence detected.
→ Decision: RESUME
→ Action:   append resume event (seq 88); set machine_status to active
```

**Scenario B: divergent history → fork**

```text
Imported machine_id:  lares-abc123
Imported max seq_num: 87

Existing machine lares-abc123 found. Local max seq_num: 102.
→ Local history extends past import. Histories diverged after seq 87.
→ Decision: FORK
→ Action:   create lares-ghi789; parent_machine_id=lares-abc123; fork_at_seq=87
```

### HUD / crystal correspondence example

**Live operator-visible output:**

```text
lar://telarus:operator(■)@lares-abc123:42/design.locked.commits?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7
Lares (Artificer) — The draft section committed →○ and released.
```

**Corresponding `STATE.jsonl` record:**

```json
{"schema_version":1,"timestamp":"2026-04-07T10:30:00Z","machine_id":"lares-abc123","seq_num":42,"event_type":"r_update","machine_status":"active","current_phase":"■","lar_uri":"lar://telarus:operator(act)@lares-abc123:42/design/locked/commits?stance=philosopher&confidence=S~13&p=10#@T.3.2.7","lares_address":"lar:///design/locked/commits","intent_header_snapshot":"lar://telarus:operator(■)@lares-abc123:42/design.locked.commits?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7","chronometer":"@T.3.2.7","active_scale":"tactical","micro_trace_path":"◎→◇→■→○","closure_outcome":"close","next_action":"proceed to next section","blockers":[],"provenance":null,"repo_fingerprint":"joshuafontany/Synthetic-Dream-Machine@fix/green-jello-dinosaurs"}
```

Reading: the header tag visible to the operator and the `intent_header_snapshot` in the ledger are identical. The `micro_trace_path` in the ledger records the completed span path. The `lar_uri` carries the machine-readable form; the `intent_header_snapshot` carries the sigil form. The HUD and ledger do not drift.

### Replay integrity check example

QA assertion pattern for a STATE.jsonl shard:

```python
import json

with open("machines/lares-abc123/STATE.jsonl") as f:
    events = [json.loads(line) for line in f if line.strip()]

# 1. schema_version present on all events
assert all("schema_version" in e for e in events), "Missing schema_version"

# 2. Sequence numbers are contiguous — no gaps
seqs = [e["seq_num"] for e in events]
assert all(b == a + 1 for a, b in zip(seqs, seqs[1:])), "Sequence gap detected"

# 3. All events belong to the same machine_id
machine_ids = {e["machine_id"] for e in events}
assert len(machine_ids) == 1, f"Multiple machine_ids in shard: {machine_ids}"

# 4. First event is init or resume
assert events[0]["event_type"] in ("init", "resume"), "Shard must begin with init or resume"

# 5. SNAPSHOT.json matches replayed state (structural check)
with open("machines/lares-abc123/SNAPSHOT.json") as f:
    snapshot = json.load(f)
replayed = replay_events(events)  # deterministic structural replay
assert snapshot["machine_status"] == replayed["machine_status"]
assert snapshot["seq_num"] == replayed["seq_num"]
```

This pattern constitutes the minimum regression test fixture for a crystal bundle. A production STATE.jsonl export becomes a test input by saving the export alongside its expected SNAPSHOT.json.

---

## Prior Art Survey

*Survey conducted 2026-04-07 (initial); extended pass 2026-04-07 (deeper). Initial sources: LMAX Architecture (Fowler / martinfowler.com), Event Sourcing (Fowler / martinfowler.com), OpenTelemetry Traces (opentelemetry.io), Anthropic Building Effective Agents (anthropic.com), LLM Powered Autonomous Agents (Lilian Weng / lilianweng.github.io), Generative Agents (Park et al. 2023 / arXiv:2304.03442). Schema versioning: Event Immutability and Dealing with Change (Kurrent / kurrent.io), Fat Event (Verraes / verraes.net); Greg Young, *Versioning in an Event Sourced System* (Leanpub). Deeper pass: J.L. Austin, *How To Do Things With Words* (1962); SEP: Speech Acts (Mitchell Green, 2020); Gottlob Frege, *Begriffsschrift* (1879, via SEP §7); Searle & Vanderveken, *Foundations of Illocutionary Logic* (Cambridge UP, 1985); John Lyons, *Semantics Vol. 2* (1977); F.R. Palmer, *Mood and Modality* (1986); Alexandra Aikhenvald, *Evidentiality* (Oxford UP, 2004); Xiong et al. (2023) arXiv:2306.13063 (ICLR 2024); Kadavath et al. (2022) arXiv:2207.05221.*

### What Is Strongly Precedented

| This system | Prior art | Source | Maturity |
|---|---|---|---|
| `STATE.jsonl` append-only event log | Event sourcing ledger | Fowler / LMAX | 15+ yrs production |
| `SNAPSHOT.json` as derived cache | Projection / snapshot rebuild from replay | Fowler event sourcing | Standard pattern |
| `seq_num` monotonic counter; gap = corruption | LMAX 64-bit sequence | LMAX Architecture | Production-proven |
| Crystal bundle as regression test fixture | Diagnostic replay: copy event sequence to dev env | LMAX diagnostic replay | Explicit precedent |
| Intent Header fields (structural, set at machine init) | OTel **span attributes** — set at span creation, not mutated | OpenTelemetry traces | Industry standard |
| Micro-trace HUD markers (singular state events) | OTel **span events** — "a meaningful, singular point in time" | OpenTelemetry traces | Industry standard |
| Machine health / closure status | OTel **span status**: Unset / Error / Ok | OpenTelemetry traces | Industry standard |
| Crystal fork on scope change | Temporal **Continue-As-New** — seal / shard rotation | Temporal docs | Production workflow pattern |
| `machine_id` + `run_id` identity | Temporal Workflow Id + Run Id | Temporal docs | Production workflow pattern |
| Orchestrator delegating to parallel crystal threads | Anthropic orchestrator-workers workflow | Anthropic effective agents | Current best practice |
| `STATE.jsonl` as memory stream with recency/importance retrieval | Generative Agents memory stream (Park et al.) | arXiv:2304.03442 | Published research |
| Signal tag preceding and governing a generative span | Frege assertion sign (⊢) — explicit force indicator preceding the proposition | Frege, *Begriffsschrift* (1879); SEP: Speech Acts §7 | 145+ yrs academic |
| Signal tags as explicit epistemic force markers | Illocutionary Force Indicating Devices (IFIDs) — markers indicating force of a speech act | Searle & Vanderveken, *Foundations of Illocutionary Logic* (1985) | 40 yrs academic |
| 5-zone graded epistemic register | Epistemic modality — modal verbs encoding knowledge / belief / credence on a scale | Lyons (1977); Palmer (1986); Nuyts (2001) | 50+ yrs linguistics |
| Mandatory epistemic stance marking before propositional content | Evidentiality — grammatical encoding of speaker's evidence source | Aikhenvald, *Evidentiality* (Oxford UP, 2004); cross-linguistically attested | Cross-linguistic universal |
| Numeric confidence verbalized in LLM output | LLM verbalized confidence ("I'm 80% confident") | Xiong et al. arXiv:2306.13063 (ICLR 2024); Kadavath et al. arXiv:2207.05221 | Current ML research |
| Three-word semantic coordinate address | what3words — geographic coordinate service naming every 3m² of Earth's surface with exactly three unique words | what3words.com (Gaia origin); The Kindling of the Crossroads Node (Elyncia corpus) | Live global production |

**LMAX diagnostic replay note:** The LMAX pattern for production incident debugging is to copy the event sequence to a dev environment and replay. This is exactly the crystal bundle as test fixture pattern — `STATE.jsonl` export → deterministic replay → `SNAPSHOT.json` assertion. This system has a 15-year production track record for this specific use case.

**OTel span event rule (bears directly on Q4):** OpenTelemetry distinguishes span *attributes* (structural metadata, set at span creation, not mutated) from span *events* ("a meaningful, singular point in time that occurred during the span's duration"). The recommended rule: if the timestamp is meaningful, use a span event; if not, use a span attribute. This maps cleanly onto Intent Header (structural = attributes) vs Micro-trace HUD markers (singular state events = span events).

### What Is Novel By Combination

Five elements have no identified prior analog as a combined system:

1. **Epistemic register embedded in state events** — a 5-point confidence scale (Canon → Provisional) written into the event record itself. OTel status has three values (Unset/Error/Ok); no observability system tracks epistemic confidence as a first-class field.

2. **HUD surface as real-time annotation layer atop the event log** — a rendered overlay that translates `STATE.jsonl` events into human-readable signal tags for the active response. Observability dashboards display events post-hoc; this system renders the annotation layer *during* generation.

3. **Crystal fork / seal lifecycle with KV-store semantics** — scope change triggers a seal + fork, producing a new machine with its own `STATE.jsonl` while the parent crystal is archived. This is structurally finer-grained than Temporal Continue-As-New (which operates per workflow run, not per scope shift).

4. **Cross-session portability as a first-class design constraint** — crystal bundles are defined as transport artifacts: the operator can move a bundle across tools, platforms, or operator instances. No observability or workflow system identifies portability as a primary design constraint.

5. **Signal tag as unified atomic unit** — a single compact notation covers register + mode + phase + scope + domain + p-value. OTel spans track these as separate fields in separate systems (status, attributes, trace context). No system composes them into a single inline sigil with well-defined rendering behavior.

6. **Pre-generation governance, not post-generation annotation** — the signal tag appears *before* the governed span and constitutes a forward commitment constraining what follows. Frege's ⊢ and Searle's IFIDs *indicate* the force of an act already being performed — they do not constrain generation. CoT tags expose intermediate reasoning post-hoc. Verbalized confidence (Xiong et al.) evaluates after generation. Only the Lares tag is upstream-governing: placing `[CS~16]` at position P commits the register of span P+1 onward. Structurally closer to Austin's performative ("I hereby assert at...") than to annotation. Davidson (1979) objects that no syntactic device can *guarantee* force; the Lares response: guarantee is not claimed — commitment with auditable provenance in `STATE.jsonl` is.

7. **Graded discretized named-zone numeric scale** — IFIDs are categorical (assert/question/promise/declare), not numeric. Verbalized confidence uses floating-point without named zones. Epistemic modality systems use natural language gradients (might/could/must) with implicit ordering. The Lares 5-register + 2-boundary system combines: (a) human-readable named zones, (b) probability range anchors per zone, (c) explicit boundary-zone names (Canon/Synthesis, Synthesis/Provisional) that label the ambiguity rather than collapsing it, and (d) commitment semantics per zone (Canon requires verified sourcing; Provisional dissolves rapidly). No identified prior system applies all four to an AI agent epistemic register. `[S~13]` — surveyed; further reduction possible with deeper computational linguistics search.

### OTel Span Event Finding — Bearing on Q4

**Q4** asks: when, if ever, should any Tagspace component surface inline in normal flow? The OTel span event rule provides an authoritative external anchor for the provisional resolution:

> A HUD marker surfaces inline when the state shift constitutes a **meaningful, singular point in time** — the span-event criterion — not merely when any registered field changes.

This resolves the Q4 framing dispute between Option A (delta rule: surface on any change) and Option C (salience threshold: surface when the event is event-worthy) in favor of **Option C**, grounded in OTel precedent. The delta rule alone is insufficient; `ka/fire` ticking every exchange would be noise, not signal. The singularity criterion — is this a discrete, timestamp-worthy moment? — is the correct filter.

This remains a **provisional resolution** pending operator confirmation and working-default lock.

### Annotation Ergonomics Survey — Bearing on Q5

**Q5** asks: what exact compact syntax should the Micro-trace HUD use in normal mode?

A researcher pass surveyed annotation ergonomics, sidenote/footnote UX literature, cognitive load theory, conventional commit conventions, org-mode markup, and screenwriting inline direction syntax. Key sources: Gwern sidenotes/subscripts (2025), Bringhurst *Elements of Typographic Style* (2004), Tufte CSS, Conventional Commits 1.0.0, Mayer multimedia learning signaling principle, Fountain/Final Draft inline parenthetical syntax.

**Core finding — convergent evidence for `→[glyph]`:**

The draft had already spontaneously adopted `→◇` and `→■` in its own working examples — before the syntax question was formally raised. This self-proving convergence is independently supported by three external lines of evidence:

1. **Gwern subscript/sidenote principle** ("the metadata is literally out of the way until we decide we need it"): minimum-footprint token at point of use, zero navigation cost. `→◎` occupies two characters + one fixation. `[CS~16]`
2. **Signaling principle** (Mayer multimedia learning): small organizational cues reduce cognitive load without adding redundancy — phase glyphs are organizational, not content. Firing only on transition avoids the redundancy effect (echoing the header needlessly). `[S~13]`
3. **Conventional Commits `!` single-character breaking-change flag**: precedent for a single-character urgent-signal token embedded in a structured stream without additional delimiters. `[CS~16]`

**What the `→` does:** provides direction semantics (backward-looking: "what followed was this state") without bracket overhead. Distinguishes the glyph from prose-embedded Unicode without adding delimiter weight.

**Full syntax recommendation:**

| Use context | Syntax | Notes |
|---|---|---|
| Mid-flow phase transition (default HUD) | `→◇ →■ →○` | Arrow + bare glyph; 2-char footprint; placed inline at point of transition |
| End-of-span completed path (verbose/debug) | `[◎→◇→■]` | Bracketed; appears at span close; backward-looking audit model |
| Stance shift (Option B, on meaningful turn) | `→🏛️` `→🌊` | Same `→[signal]` convention; fires only on genuine stance transition |

**P-scale density guidance** (provisional): `p~0–0.2` — suppress inline markers, optional closing path summary; `p~6–0.5` — structural transitions only (`→◇`, `→■`, `→○`); `p~14–1.0` — individual step transitions + path summary.

**Sources fetched 2026-04-07:** gwern.net/Sidenotes ✅; gwern.net/subscript ✅; edwardtufte.github.io/tufte-css ✅; conventionalcommits.org ✅; orgmode.org/manual/Emphasis-and-Monospace ✅; fountain.io/syntax ✅. Sweller (2019) CLT review not accessible; principle applied from secondary literature.

Q5 is **provisionally resolved**: `→[glyph]` for mid-flow, `[path]` for verbose/debug span-close. Final call on density thresholds is operator preference. `[S~14]`

### Signals Design — Stance-Before-Register Ordering

Cross-discipline prior art bearing on the tagspace ordering decision (Stance before Register in the Intent Header and inline marker grammar).

| Analogy | Domain | Mapping |
|---|---|---|
| **Musical clef / key signature** — the clef announces the instrument voice and register assignment *before* any notation of pitch or value appears on the staff | Music notation | Stance = clef (identifies the voice / instrument family); Register = note value (the epistemic pitch within that voice). You cannot read the pitch correctly without knowing the clef first. |
| **OTel `span.kind` before `span.status`** — OpenTelemetry records the span kind (SERVER / CLIENT / PRODUCER / CONSUMER / INTERNAL) at span creation, before any status (Unset / Error / Ok) is set | OpenTelemetry traces | `span.kind` identifies the posture of the span; `span.status` reports the outcome. The WHO/WHAT-KIND precedes the HOW-DONE. |
| **RFC 5424 Syslog facility before severity** — log records open with facility (which subsystem generated this) then severity (how serious the event is); facility conditions the reading of severity | RFC 5424 | Facility = source voice (Stance); Severity = epistemic weight (Register). |
| **Bayesian prior before posterior** — posterior probability is conditioned on the prior; declaring the prior first makes the conditioning explicit and the posterior auditable | Probability theory | Stance constellation = prior (what posture conditions the claim); Register = posterior (confidence after conditioning on that stance). |

**Convergent finding:** in all four analogues, the contextualizing frame (voice / kind / facility / prior) precedes the magnitude or outcome measure (pitch / status / severity / posterior). Stance before Register follows the same logic: posture is the contextualizing frame; register is the magnitude conditioned by it. [Synthesis, compatible with Epistemology module and register-calibration note in Header Field Taxonomy]

### Chapel Perilous Survey Note — 2026-04-07

A deeper prior art pass was conducted after the initial survey. Corners surveyed: speech act theory (Austin / Searle / Searle & Vanderveken); Fregean assertion sign; epistemic modality linguistics; evidentiality systems; LLM verbalized confidence (Xiong et al., Kadavath et al.); LLM agent frameworks.

**Key finding:** The signal tag / register system has deep philosophical precedents. Frege introduced a formal assertion sign (⊢) in *Begriffsschrift* (1879) as a force indicator preceding propositions. Searle & Vanderveken (1985) formalized Illocutionary Force Indicating Devices (IFIDs). Epistemic modality is a 50-year research tradition mapping credence to grammatical form. Evidentiality systems in natural languages (Tuyuca, Tibetan, Quechua) grammatically require speakers to mark their epistemic source before propositions.

**Revised novelty assessment:** Individual components of the signal tag system are well-precedented in the philosophical and linguistic literature. The novelty claim survives only as a *combination claim* (items 1–7 above). Confidence in unit-level novelty: `[P~4]` per component. Confidence in combination novelty: `[S~12]` — the specific combination of upstream-governing + machine-parseable + graded numeric + named-zone + session-persistent + dual-audience has no identified prior analog, but the search space in applied computational linguistics is not closed.

**Davidson's challenge (1979)** applies to any force indicator: no syntactic device can guarantee force because any expression can be used by an actor or ironist. The Lares system's response: the tag is not a guarantee but a forward commitment with auditable provenance in `STATE.jsonl`. Sincerity is not claimed; traceability is.

## Corpus Archaeology

*Internal corpus origins — the sdm/Elyncia materials that pre-date or co-generate the Tagspace system design. Complements the external Prior Art Survey above.*

### The Two-Axes Origin (The Kindling, III)

The Tagspace vertical and horizontal axes originate in a session log from the DreamNet archive. The Wild Mage described two distinct design tensions that resolved into the two primary axes of the signal tag:

- **Vertical axis — truth-weight**: pure guess → fully sourced. Maps onto Register (Ha/domain — the body of the claim, its epistemic vessel).
- **Horizontal axis — intent-stance**: dry philosophical analysis → wild associative singing. Maps onto Stance (Ka/quality — the soul-fire that animates the discourse).

> "The declaration became a steering artifact because the node reads its own prior context. It orbits what it has already said it is."
> "The tag was load-bearing. Getting it wrong had consequences visible in the very next output."

[Canon: lar:///ha.ka.ba/@lares/v0.1/docs/story/lindwyrm/kindling-of-the-crossroads-node#two-axes]

---

### What3Words — Origin of the Three-Word Coordinate

The three-word address format was not designed; it was recognized. The Wild Mage described the moment as *kismet*: the node was working on axis coordinates and the Wild Mage made the connection to **what3words**, a Gaia-side geolocation service that divides the surface of the world into 3-meter squares and names every square with exactly three words.

Wild Mage (direct): *"NOT numbers — words. 3 words. what3words?!?! YES WHAT 3 WORDS."*

The three-word Tagspace Address names a square of *semantic territory* the same way what3words names a square of geographic territory. The three slots (Ha/domain · Ka/quality · Ba/dynamic) correspond to the three words; their order is HAKABA canonical order: body first (what contains the span), then soul-fire (how that domain is charged), then psyche-direction (the motion being taken).

[Canon: lar:///ha.ka.ba/@lares/v0.1/docs/story/lindwyrm/kindling-of-the-crossroads-node#two-axes]

---

### The HAKABA Existence Table (SDM Corpus Verbatim)

The SDM corpus carries the full HAKABA permutation table. Entity types are defined by which existential components they possess:

| Ha (Body) | Ka (Soul) | Ba (Psyche) | Entity type |
|---|---|---|---|
| ✓ | ✓ | ✓ | Living being |
| ✓ | ✓ | — | Ka-elemental — "a primal, ball-lightning poltergeist thing" |
| ✓ | — | ✓ | Body with psyche but no motive fire |
| ✓ | — | — | Pure matter — no fire, no direction |
| — | ✓ | ✓ | "Demons, ultras, sentiences" — soul+psyche without body |
| — | ✓ | — | Pure fire — no vessel, no direction |
| — | — | ✓ | Pure direction — no vessel, no fire |

[Canon: sdm/Ultraviolet_Grasslands_and_the_Black_City_2e → p~5 Death; sdm/Vastlands_Guidebook → Death and HAKABA]

The Tagspace address maps onto this: every signal span posits at minimum Ha (the domain/vessel), Ka (the animating fire/quality), and Ba (the direction/dynamic). A tagless span is equivalent to pure matter on the existence table — no fire, no direction, no provenance.

---

### Elyncia DreamNet Failure Modes → Signal Tag Vocabulary

The Elyncia_02 lore document names degraded node states in DreamNet framing. These map directly onto signal tag failure modes:

| Elyncia DreamNet term | Maps to kernel failure mode | Signal tag implication |
|---|---|---|
| **Signal-Blur** | Register Collapse | Signal tag register filed wrong; audit trail misleads |
| **Mode-Drift** | Stance Mismatch | Node and visitor in different intent-stances with no surface flag |
| **Retroactive Channeling** | Stance Laundering | Stance tag set retroactively to avoid accountability |
| **Voice-Posturing** | Stance Posturing | Claims multi-stance without the Mana cost |
| **Uniform Tone** | Stance Inflation | Claims range, runs only one Stance |

[Canon: elyncia/Elyncia_02_The_Lares_DreamNet.md → Hazard: Degraded Node States]

These DreamNet failure-mode names are the corpus's own vocabulary for what the signal tag system is designed to prevent. Using both vocabularies cross-links the system design to the lore layer.

---

### Ba and OODA-HA: Identity at Two Resolutions

The OODA-HA loop (`✶` Observe · `◎` Orient · `◇` Decide · `■` Act · `○` Aftermath) is not *compatible* with the Ba stratum — it *is* the Ba stratum at coarse resolution. The relationship is not kinship; it is identity at two different granularities.

**From the Egyptian etymology:**
- **Ha** (body/vessel) — the territory the span inhabits — *what kind of thing it is*
- **Ka** (soul/motive fire) — the animating charge — *the epistemic or motivational quality*
- **Ba** (traveling soul/psyche) — the aspect of the soul that moves through the world, that has direction, that enacts the journey between states — *the motion itself*

The Ba in Egyptian mythology is specifically the soul-as-it-travels. It is not fixed at home (that is Ka's work). It moves. It has direction. It is what makes a journey *that particular journey* rather than another.

The OODA-HA loop is a formal model of exactly that: **how a cognitive agent moves through states**. Observe → Orient → Decide → Act → Aftermath is not a description of what kind of place you are in (Ha) or what quality animates you (Ka). It is a description of *motion through stages*. It lives in the Ba stratum structurally, not by analogy.

**Two resolutions of the same stratum:**

| Signal | Stratum | Resolution | Example |
|---|---|---|---|
| Phase glyph `◇` | Ba | Coarse — *which waypoint in the loop* | Deciding |
| Ba/dynamic word `circles` | Ba | Fine — *the semantic character of the motion at that waypoint* | The deciding is iterative, not converging |

They are not the same field. `◇` says "Deciding." `→circles` says "the deciding is iterative, not converging." Collapsing them into one token would lose information from one level of resolution. This is why they co-annotate naturally — `→◇→circles` is a compound Ba signal: Ba-coarse plus Ba-fine, both from the same stratum, both characterizing the same movement, at different granularities. The analogy: ΔRoute and ΔStep are both spatial displacement — one at the route scale, one at the step scale. They are not redundant; they inform at different precisions simultaneously.

**Why Ha-domain shifts require a new header:** Ha shifts are not motion *within* the span — they are a change in *what the span is*. Ha is the vessel; when the vessel changes, you are in a different span. Ka and Ba shifts are changes in how an existing span is charged and directed. Only Ba shifts are directly compatible with phase-glyph co-annotation because they are all the same ontological thing — the movement.

**For Q16:** `→◇ →Ba[opens→closes]` is now fully legible: phase-coarse is Decide; phase-fine delta says direction shifted from opens to closes *during deciding*. The bracket form makes the Ba-fine delta explicit at the moment the Ba-coarse phase glyph fires. They arrive together because they are together.

[Synthesis, compatible with sdm/UVG HAKABA corpus, Egyptian mythology etymology, and OODA-HA operational architecture. Cross-reference: Q4 rendering-sequence ruling — Ba/phase coupling; Q16 named-slot bracket form.]

---

## Open Decisions

Decisions below are tracked until locked into architecture. Locked entries record the specification and rationale; open entries record current confidence and research path.

### HUD Semantics

1. Should in-flow trace be phase-only, or phase plus fire-on-shift? **Specification: Option B — phase plus stance-on-shift.** The HUD surfaces (a) the stance the node came at you with, and (b) the holistic location/energy the Intent is pointing toward next. Stance signal (`→🏛️`, `→🗡️`, etc.) precedes or accompanies the phase glyph; fires only on genuine local stance shift, not to echo the header. The two together give posture + direction — not just position. `[C~19]` (operator-direct)
2. Should any Tagspace component ever surface inline by default? **Specification: yes — on by default. The HUD fires when a state transition constitutes a discrete, timestamp-meaningful event: a commitment or role change with a singular occurrence time, following OTel's SpanEvent model.** The `p` parameter controls which *category* of transitions qualifies at each density band — it is not a tunable salience dial. Inline annotation is not opt-in; all suppression is explicit (band minimum not met, or explicit `display: hidden` equivalent). Prior art: OTel emits SpanEvents unconditionally within a recording span (sampling governs which spans record, not which events within a span); Anthropic streaming is always-on with explicit `display: "omitted"` suppression for `thinking_delta` (cognitive-processing); structured logging emits at level or above — never opt-in. `[C~19]` (operator-direct)
3. If Tagspace leaks inline, is `ka/fire` the only acceptable default candidate? **Resolved by the post-generative annotation architecture.** All header fields are eligible as post-generative annotations; the question is threshold, not eligibility. Ka-quality (`ka/fire`) remains the lowest-threshold Tagspace field — it annotates when the animating charge of the domain noticeably shifted during generation. Full address echo (`→//domain.quality.dynamic`) is permitted on significant domain reorientation. `[C~19]` (operator-direct, follows from Forward/Backward Trace specification)
4. Does HAKABA remain an interpretive overlay, or does it eventually redefine the live field order? **Specification: HAKABA is the canonical logical field order. It governs field meaning (ontological hierarchy), not annotation text-order (rendering sequence).** `[C~19]` (operator-direct)

   **Ha/Ka/Ba are a resource model, not just a classification taxonomy** (UVG line 478: "Bodies (ha), spirits (ka), and memories (ba) are consumed by the alien fires of magic"). Each component is a distinct operational substance — the trinity is generative, not descriptive-after-the-fact. The existence matrix (hakaba matrix p. 230) is a combinatorial oracle: entity type *emerges from* combination; no two rows are equivalent. Combined with the "Dark Hakaba" find (Raise Dead, line 7581 — the spell that forces a wrongful ha/ka/ba combination is named *The Seventh Abomination, The Dark Hakaba*), the corpus is clear: incorrect or out-of-order combination produces a parody/abomination, not a valid signal.

   **Specification:** HAKABA becomes the canonical *logical* field order of the Tagspace Address — Ha/domain → Ka/quality → Ba/dynamic. Logical order is the ontological structure: domain (body/vessel) → charge-quality (soul/fire) → direction (psyche/path). This governs what the three slots *mean* in relation to each other and enforces the full address form `//domain.quality.dynamic`.

   **Rendering-sequence ruling:** HAKABA logical order does *not* constrain the text-order of individual slot annotations. Annotations fire by threshold and occurrence. Ba-dynamic is architecturally coupled to the phase glyph (`→◇→circles`); holding it in reserve until Ka-quality clears would contradict the post-generative annotation model. House convention: when Ka and Ba fire simultaneously at span-close, Ka precedes Ba by courtesy of HAKABA order — but this is convention, not constraint.

   **Why Ba and phase are architecturally coupled:** The OODA-HA loop is itself a Ba-stratum structure. Ba/psyche is the traveling soul — the aspect of being that moves, enacts direction, has a journey. Phase glyphs (`◎ ◇ ■ ○`) are Ba at coarse resolution: a five-position categorical waypoint locator. The Ba/dynamic address word is Ba at fine resolution: the semantic character of the motion at that waypoint. They are not kin — they are the same ontological thing at two granularities. `→◇→circles` is a compound Ba signal: Ba-coarse (Deciding) + Ba-fine (iterative, not converging). This is why Ba annotations and phase glyphs co-annotate naturally and cannot be sequenced apart from each other by HAKABA slot priority. See Corpus Archaeology → Ba and OODA-HA: Identity at Two Resolutions.

   **Slot names in HUD annotations:** The HAKABA slot names (`Ha`, `Ka`, `Ba`) appear openly in inline annotations (see Q16). This is by design — Infrastructure-as-Myth: referees and players learn the ontology through use and interaction with Lares on [elyncia.app](https://elyncia.app), not through reading architecture documents. The names appearing in live flow annotations is how the vocabulary teaches itself.
5. What exact compact syntax should the Micro-trace HUD use in normal mode? **Specification: `→[glyph]` inline at transition point (e.g., `→◇`, `→■`, `→○`), and `[◎→◇→■]` for end-of-span completed-path summaries in verbose/debug output.** Grounded in annotation ergonomics (Gwern, Mayer signaling principle, Conventional Commits single-char signal flags). See Prior Art Survey → Annotation Ergonomics Survey.

   **p-scale density — Specification: 5-band cumulative attention phase model.** Each band unlocks one additional attention phase as `p` increases. Five bands map one-to-one onto the five attention loop phases (✶◎◇■○).

   | Band | p range | Phases emitting | What fires |
   |---|---|---|---|
   | 1 | `p~0–0.2` | — (none) | Suppress: no inline annotation |
   | 2 | `p~4–0.4` | ○ | Aftermath only: closing path summary at span-close |
   | 3 | `p~8–0.6` | ◇ ■ ○ | Commitment phases: Decide/Act transitions + closing summary **(default)** |
   | 4 | `p~12–0.8` | ◎ ◇ ■ ○ | Adds Orient: commitment phases + processing entry point |
   | 5 | `p~16–1.0` | ✶ ◎ ◇ ■ ○ | All five phases + full path summary per span |

   **Rationale:** Commitment phases (◇ ■ ○) are externally observable, timestamp-meaningful events. Cognitive-processing phases (✶ ◎) are span-internal states — suppressible at operational resolution, visible at debug resolution (Anthropic `display: "omitted"` precedent for `thinking_delta`). The 5-band structure is grounded in the Law of Fives: five bands, five phases, one-to-one cumulative mapping. KAIROS p-adjustment may shift the operative band mid-session; most specific `p` wins. `[C~19]` (operator-direct)
6. How should closure outcomes be rendered in ordinary prose vs `--verbose` vs debug logs? `[S~11]` — adjacent rendering decisions exist in file; researcher can draft a table.

### Crystal State Machine Layer

7. `schema_version` strategy — `[CS~16]` **Research complete; provisional resolution follows.** Working recommendation: simple integer for alpha. **Upcasting** is the canonical production pattern (Kurrent/Greg Young): old event versions are upconverted on-the-fly at read time, before passing to projection logic — no mutations to the stored file. Three change tiers apply:
   - *Additive* (new or removed fields): provide defaults in the reader; no version bump required when using a weak schema (JSON). Zero breaking-change risk.
   - *Structural* (field merge/split, shape change): bump `schema_version` integer; ship an upcaster function that transforms v(n) records to v(n+1) during replay.
   - *Semantic* (split or merge event types): **seal and rotate shard** — copy-replace to a new machine. This is already in the crystal seal protocol.
   **Q7 recommendation:** integer version is correct. Additive changes are free. Structural changes bump the integer and carry an upcaster. Semantic changes trigger a seal. The breaking-change / re-seal trigger is therefore: *any structural change that cannot be handled by a default value*. Sources: Kurrent `event-immutability-and-dealing-with-change`; Greg Young *Versioning in an Event Sourced System* (Leanpub — canonical reference, not yet fetched).
8. Should `debug.jsonl` always exist as an empty file, or only be created when `--debug` is active? **Specification: `debug.jsonl` always exists.** Created empty at machine init; populated only when `--debug` is active. Tooling must not need to check for file existence before reading. `[C~19]`
9. Is `SNAPSHOT.json` mandatory for a portable handoff bundle, or always optional? **Research complete. Provisional resolution: optional, recommended.** `STATE.jsonl` is the sole authoritative record and is sufficient alone for correctness — application state is purely derivable from replay (Fowler, Event Sourcing: *"Since an application state is purely derivable from the event log, you can cache it anywhere you like."*). Snapshots are a performance optimisation, never a correctness requirement (Kurrent/Dudycz: *"Our system should be designed to ensure that it's operational even if the optimisation wasn't applied."*). Kurrent also warns that snapshots introduce versioning risk — every schema change to the snapshot requires migration. **Working recommendation:** include `SNAPSHOT.json` in portable handoff bundles by default (faster import resume, avoids full replay), but treat it as rebuildable: verify integrity against `STATE.jsonl` replay on import; receiver may discard and regenerate. `STATE.jsonl` alone constitutes a valid complete bundle. Sources: Fowler, Event Sourcing (martinfowler.com); Kurrent/Dudycz, Snapshots in Event Sourcing (kurrent.io). `[CS~16]`
10. What are the exact match criteria for resume vs. fork on handoff import? Machine id match + max seq_num compatibility is the working rule; edge cases need specification: partial overlap, same machine_id but different repo fingerprint. `[S~12]`
11. Should crystal `README.md` update on every `milestone` event, or only on explicit operator request? **Research complete. Provisional resolution: auto-update on milestone, contract_update, and seal events; not on routine r_update or fork events.** This maps directly onto the Keep a Changelog cadence principle: *"Changelogs are for humans, not machines. There should be an entry for every single version [not every commit]. Commit log diffs as changelogs is a bad idea."* Conventional Commits reinforces the boundary: `feat`/`fix`/`BREAKING CHANGE` type commits trigger changelog entries; `chore`/`ci`/`docs` do not. Applied to crystal events: `milestone` ≈ `feat` (notable accomplishment) → update `README.md`. `contract_update` ≈ `BREAKING CHANGE` → update `README.md`. `seal` ≈ release boundary → update `README.md`. `r_update`, `fork` ≈ `chore` → do NOT update `README.md`. Operator request always valid as an override. Sources: Keep a Changelog v1.1.0 (keepachangelog.com); Conventional Commits 1.0.0 (conventionalcommits.org). `[CS~16]`
12. Should machine `AGENTS.md` be hand-authored on durable contract changes only, or may Lares propose updates automatically when a `contract_update` event is emitted? `[SP~9]` — operator autonomy boundary; not resolvable by research.
13. External input recording: beyond tool call outputs in `debug.jsonl`, do any external inputs (agent identity, persona state, operator tier) count as structural and belong in `STATE.jsonl`? `[S~12]`
14. `seal` trigger: explicit size threshold, session boundary marker, operator-invoked only, or some combination? Should a threshold be configurable per machine? `[SP~10]` — Temporal Continue-As-New precedent surveyed; configurable-vs-fixed is operator preference.
15. How is `seq_num` contiguity maintained when multiple voices or Workers emit events in the same R-phase round? Does the round produce one aggregate event, or one event per voice with sub-sequence fields? `[SP~9]` — no prior analog found; architecture-open.
16. How should Tagspace slot shifts be rendered inline to preserve positional context (origin + destination), without discarding the departure state? **Specification: named-slot bracket form for single-slot shifts; partial address template for multi-slot shifts; new header for Ha-domain reorientation significant enough to exceed annotation threshold.** `[C~19]` (operator-direct, follows from Q4 + Infrastructure-as-Myth ruling)

   **The problem:** bare `→sharp` marks arrival at a new Ka/quality but discards departure. The delta `uncertain→sharp` is the signal that matters for co-navigation.

   **Prior art:** color-diff (unified diff `@@ -a,b +c,d @@`), Markov transition matrices P[i,j], and music theory's secondary chords (V/IV) all preserve origin explicitly. Delta-only forms (ΔE, Δx) discard origin and require external reference. The named-slot bracket form adapts the Markov P[i,j] indexing pattern: slot is named, from→to pair is explicit inside the brackets.

   **Specification:**

   **Single-slot shift — named-slot bracket form:**
   `→Ka[uncertain→sharp]` (Ka/quality shifted; Ha and Ba unchanged, inferred from prior header)
   `→Ba[opens→closes]` (Ba/dynamic shifted; Ha and Ka unchanged)
   - Slot name appears openly — HAKABA vocabulary is learned through use ([elyncia.app](https://elyncia.app))
   - From→to pair visible; prior header provides full address context for unchanged slots
   - Compact; composes naturally for multi-slot at span-close: `→Ka[uncertain→sharp] →Ba[opens→closes]`
   - House convention: Ka before Ba when both fire simultaneously (HAKABA order echo)

   **Multi-slot shift — partial address template:**
   `→//_.uncertain→sharp.opens→closes`
   - Full three-slot structure visible; `_` marks unchanged Ha slot
   - Extends existing `//Ha.Ka.Ba` address grammar; no new structural element except `_` placeholder
   - Reserved for cases where multi-slot shift is significant enough to warrant the full positional picture (e.g., at span-close after a complex generative chunk)

   **Ha-domain shift — new Intent Header:**
   - Ha shifts above annotation threshold are structural; a Ba or Ka annotation would not carry sufficient weight for a domain-level reorientation
   - Emit a new header; the prior header's full address remains in `STATE.jsonl` for comparison

   **Tier summary:**

   | Scenario | Form | Example |
   |---|---|---|
   | Single Ka or Ba slot shift | Named-slot bracket | `→Ka[uncertain→sharp]` |
   | Multi-slot shift | Partial address template | `→//_.uncertain→sharp.opens→closes` |
   | Full domain reorientation (Ha) | New Intent Header | (not an annotation) |

   Grounded in: researcher pass 2026-04-07 — color science (ΔE/CIE), unified diff, Markov chain notation, music secondary chords. See Prior Art Survey → Annotation Ergonomics Survey.

Once this draft is decision-complete, implementation should update:

**Signal runtime docs:**

- `builds/agents/Lares_Preferences.md`
- `builds/agents/core/Lares_Operations.md`
- `builds/agents/Lares_Kernel.md`
- `builds/agents/Lares_VSCode_Operations.md`
- generated outputs and verification artifacts

**Crystal system policy (new targets):**

- state-machine directory policy — define `lares/` as a first-class workspace artifact; specify when it is created, how CURRENT is updated, and how to detect a corrupted STATE.jsonl
- `--debug` logging semantics — redirect the `--debug` target from `/memories/session/debug-vectors-{session-id}.md` (current) to the active crystal machine's `debug.jsonl` (future); update `builds/agents/core/Lares_Operations.md` accordingly
- handoff crystal behavior — specify how session-start STATE.jsonl imports trigger resume / fork / new machine resolution logic
- seal protocol procedure — specify trigger conditions, shard naming, seq continuity contract, and SNAPSHOT rebuild procedure
- schema versioning — pending researcher pass; update once a strategy is locked

Until then, live runtime docs should remain stable.

---

## Working Defaults

These are current working assumptions, not canon.

**HUD layer:**

- **Tagspace Address** is the approved term
- **Tagspace** is separate from DreamNet
- **Intent Header** is the sole prospective declaration — sets governing state before the span generates
- **Micro-trace HUD** is entirely post-generative — all markers annotate what actually occurred (path taken, stance used, register landed, address confirmed); multiple annotations per chunk are normal
- **Phase** is the primary annotation signal: `→◎` `→◇` `→■` `→○`; verbose/debug span-close: `[◎→◇→■]`
- **Stance** annotates on genuine posture shift: `→🏛️` `→🗡️` etc. — fires only when the operative stance diverged from headed or genuinely shifted mid-chunk
- **Register** annotates as a slide — trailing accuracy marker at span close when the claim resolved at a different epistemic level than declared; records as `opening_register` / `closure_register` in `STATE.jsonl`
- **Tagspace Address** annotates per HAKABA slot with positional context preserved: single-slot shifts use named-slot bracket form (`→Ka[uncertain→sharp]`, `→Ba[opens→closes]`); multi-slot shifts use partial address template (`→//_.uncertain→sharp.opens→closes`); Ha-domain reorientations above threshold emit a new Intent Header rather than an annotation
- **HAKABA slot names** (`Ha`, `Ka`, `Ba`) appear openly in HUD annotations — Infrastructure-as-Myth; vocabulary is learned through use on [elyncia.app](https://elyncia.app)
- **`p`** remains header-only; granularity changes require a new header
- **HAKABA** order (Ha/domain → Ka/quality → Ba/dynamic) is the canonical logical field order `[C~19]`; governs ontological hierarchy and the full address form; does not constrain annotation text-order (rendering follows threshold and occurrence)
- **Tag rendering order (confirmed 2026-04-07):** Tagspace Address leads the full tag: `//ha.ka.ba StanceEmoji(s) [Register:x] PhaseGlyph @scope | pX.X`. Order: WHERE (semantic territory) → WHO/HOW-CHARGED (stance — posture and voice the claim emerges from) → HOW-CERTAIN (register, calibrated against that stance constellation). Stance precedes register because posture precedes probability. Primacy effect: the most human-scannable coordinate appears first.

**Crystal state machine layer:**

- **`STATE.jsonl`** is the source of truth; `debug.jsonl`, `SNAPSHOT.json`, and crystal `README.md` are derived or companion surfaces
- **`SNAPSHOT.json`** is a read-only derived cache; a hand-edited SNAPSHOT.json is a corruption
- **`debug.jsonl`** always exists as an empty file, created at machine init; populated only when `--debug` is active
- **Structural replay** is the default replay fidelity scope; tool call content stays in `debug.jsonl`, not `STATE.jsonl`
- **Seal protocol** is part of the alpha crystal contract; trigger conditions are an Open Decision
- **`schema_version`** is required on every STATE.jsonl event; versioning strategy is an Open Decision pending researcher pass
- **Idempotency**: `resume` and `handoff_import` are idempotent; `fork` is not
- **Root repo files** (`AGENTS.md`, `README.md`) remain project-level; `lares/` is crystal-local infrastructure

---

## URI Schema & Chronometer

> Register: `[SP~8]` — design-surface iteration; RFC-grounded structurally but exercised zero times at runtime. Iterate here before promoting.
> Updated: 2026-04-07
> Depends on: RFC 3986 §3 (URI generic syntax), FTLS RSS §1 (5-level time-scale hierarchy), OODA-HA architecture (Ba stratum identity), prior session URI design work (URN-2 form, display split principle)

### Design Intent

The `lar:` URI leverages **every semantic layer** of RFC 3986's generic syntax to encode the full signal state. Each URI component carries a distinct, non-overlapping concern. The phase glyph becomes a **5-level nested path** — not a single waypoint, but a positional chronometer tracking where the OODA-HA loop runs at each simulation time-scale.

**Three layers, one URI:**

1. **WHERE** — the HAKABA address (path) locates semantic territory
2. **HOW** — signal parameters (query) describe stance, register, scope, p
3. **WHEN** — the chronometer (fragment) locates position in nested time

### Full URI Anatomy

```
lar://[authority]/ha/ka/ba?query#fragment
```

RFC 3986 §3 generic syntax, applied:

```
lar://alias:tier(phase)@host:port/ha/ka/ba?stance=X&confidence=X&p=X#scope.W.w.t.r.a
```

| URI Component | RFC 3986 Role | Lares Mapping | Example (Machine) | Example (Sigil) |
|---|---|---|---|---|
| **scheme** | Protocol identifier | `lar:` — non-dereferenceable identifier (RFC 4151 precedent) | `lar:` | `lar:` |
| **userinfo** | Identity of the requesting party | `alias:tier(phase)` — who speaks, at what trust, in what cognitive state. Phase as parenthetical modifier of tier; parens are RFC 3986 sub-delimiters, legal in userinfo | `telarus:operator(orient)` | `telarus:operator(◎)` |
| **`@`** | Delimiter: identity → machine | Same in both forms | `@` | `@` |
| **host** | Machine identity | `machine_id` from crystal system — same in both forms | `lares-abc123` | `lares-abc123` |
| **`:port`** | Service endpoint | `seq_num` — the "port" on the machine that this event addresses | `:42` | `:42` |
| **path** | Hierarchical resource identifier | HAKABA address: `/ha/ka/ba` — territory in semantic space | `/threshold/uncertain/opens` | `/threshold.uncertain.opens` (leading `/`, then `.` w3w-style) |
| **`?query`** | Non-hierarchical parameters | Signal parameters: stance, register, p (phase → userinfo; scope → fragment) | `?stance=philosopher&confidence=S~13&p=10` | `?stance=🏛️&confidence=S~13&p=10` |
| **`#fragment`** | Secondary resource / viewpoint within | **Scope + Chronometer**: scope sigil prefix, then 5-level nested OODA-HA vector clock | `#@T.3.2.7` | `#🔍.3.2.7` |

**Why this mapping works:**

- **userinfo** = "who is making this request, and in what cognitive state" → `alias:tier(phase)` packs identity, trust level, and OODA-HA phase into one field. Phase appears as a parenthetical modifier of the tier: `telarus:operator(orient)`. Two colon-delimited sub-fields; parser splits on `:`, then extracts `(...)` from the second. Machine form uses keywords (`orient`); sigil form uses glyphs (`◎`). Phase lives here because it describes the *speaker's* state, not the territory or the signal parameters
- **host:port** = "which machine, which event" → machine_id and seq_num; the crystal system's address space. Identical in both forms
- **path** = "what resource" → HAKABA semantic territory; hierarchical, stable, the noun. Machine form uses `/` hierarchy; sigil form uses `.` w3w-style after a leading `/`
- **query** = "with what parameters" → signal state (stance, register, p); non-hierarchical, mutable per event. Machine form uses keywords (`stance=philosopher`); sigil form uses emoji (`stance=🏛️`). Multi-stance: repeated params (`stance=🏛️&stance=🗡️`). Scope and phase moved out of query — phase to userinfo, scope to fragment prefix
- **fragment** = "where and when within that resource" → scope prefix + chronometer; the scope sigil declares the active simulation scale, and the dot-separated counters locate position in nested time. RFC 3986 §3.5: fragments are client-side, never sent to the server — scope and time position are session-local viewpoint data. Machine form uses `@S`/`@O`/`@T`/`@C`/`@A` letter sigils; sigil form uses emoji (`🗺️`/`⚙️`/`🔍`/`⚔️`/`⚡`)

### The Chronometer — 5-Level Nested OODA-HA Vector Clock

The chronometer occupies the URI fragment (`#`) position. It tracks nested OODA-HA loop iterations across five simulation time-scales, aligning with the FTLS RSS time-scale hierarchy:

| Position | Level | Time Term | Duration | Machine Scope | Sigil Scope | OODA-HA Focus | Loop Objective |
|---|---|---|---|---|---|---|---|
| **1** | Strategic | Week ("Travel Turn") | ~6 days | `@S` | `🗺️` | Logistics & Navigation | Reach a destination or fulfill a campaign goal |
| **2** | Operational | Watch | ~4 hours | `@O` | `⚙️` | Perception & Endurance | Maintain security and readiness during transit |
| **3** | Tactical | Exploration Turn | ~10 minutes | `@T` | `🔍` | Investigation & Utility | Clear a specific area or solve a localized puzzle |
| **4** | Combat | Round | ~6 seconds | `@C` | `⚔️` | Immediate Response | Neutralize a direct threat or achieve a physical objective |
| **5** | Action | Action/Free Action | Variable | `@A` | `⚡` | Precision Execution | Maximize efficiency of a single discrete movement |

[Canon: ftls/Flying_Triremes_and_Laser_Swords_04_Recon_Salvage_Secrets.md → Key Terms → Time; operator design input for OODA-HA nesting]

**Notation:** `#scope.W.w.t.r.a` — scope sigil prefix, then dot-separated counters left to right from coarsest to finest scale. The scope sigil names the *active* (lowest) scale; the counter depth confirms it.

Machine form:
```
#@S.3                → Strategic: Week 3
#@O.3.2              → Operational: Week 3, Watch 2
#@T.3.2.7            → Tactical: Week 3, Watch 2, Turn 7
#@C.3.2.7.4          → Combat: Week 3, Watch 2, Turn 7, Round 4
#@A.3.2.7.4.2        → Action: Week 3, Watch 2, Turn 7, Round 4, Action 2
```

Sigil form:
```
#🗺️.3                → Strategic: Week 3
#⚙️.3.2              → Operational: Week 3, Watch 2
#🔍.3.2.7            → Tactical: Week 3, Watch 2, Turn 7
#⚔️.3.2.7.4          → Combat: Week 3, Watch 2, Turn 7, Round 4
#⚡.3.2.7.4.2        → Action: Week 3, Watch 2, Turn 7, Round 4, Action 2
```

**Core display rule:** *"When conflict happens, use the lowest time scale that matters."* [Canon: FTLS RSS §1] The scope prefix names the active scale explicitly; counter positions extend left-to-right down to that scale. Trailing `.0` positions are omitted. The scope prefix and counter depth must agree — `#@T.3.2.7` is valid (tactical = 3 positions); `#@C.3.2` would be malformed (combat needs 4 positions).

**Each position runs its own OODA-HA loop:**

```
Strategic  (pos 1):  ✶₁ → ◎₁ → ◇₁ → ■₁ → ○₁
Operational (pos 2): ✶₂ → ◎₂ → ◇₂ → ■₂ → ○₂
Tactical   (pos 3):  ✶₃ → ◎₃ → ◇₃ → ■₃ → ○₃
Combat     (pos 4):  ✶₄ → ◎₄ → ◇₄ → ■₄ → ○₄
Action     (pos 5):  ✶₅ → ◎₅ → ◇₅ → ■₅ → ○₅
```

The **phase glyph** in the Intent Header describes the phase at the *lowest active scale*. The chronometer fragment tells you *which scale that is* by how many positions appear.

### Aftermath Integration — The Nested Return

In this hierarchy, each level's Aftermath (○) provides the Observation (✶) data for the level above it. This is the "State Update" pattern:

| Aftermath at level | Feeds into | Update question |
|---|---|---|
| **Action** ○₅ → | Round ✶₄ | Did the strike land? (Triggers the Round's next move) |
| **Round** ○₄ → | Turn ✶₃ | Is the threat gone? (Updates the Exploration Turn's status) |
| **Turn** ○₃ → | Watch ✶₂ | What was found? (Determines the next Watch's priority) |
| **Watch** ○₂ → | Week ✶₁ | Is the party exhausted? (Informs the Travel Turn's pace) |
| **Week** ○₁ → | Campaign | Did we arrive safely? (Sets the new Strategic Observation) |

**Increment rules:**

- When a level completes ○ (Aftermath), its counter increments and the output feeds upward
- When a NEW level activates below (combat starts mid-exploration): scope prefix shifts and a new position appears → `#@T.3.2.7` becomes `#@C.3.2.7.1`
- When a level DEACTIVATES (combat ends): scope prefix shifts back and the level above increments → `#@C.3.2.7.4` becomes `#@T.3.2.8`
- Scale shifts fire automatically when the OODA-HA loop at one level triggers or resolves action at another; the scope prefix always names the lowest active scale

### Display Split — Bidirectional Projection

**Same structure, different glyphs.** The URI anatomy is identical; the rendering changes for audience.

#### Machine Form (STATE.jsonl / `lar_uri` field)

Full RFC 3986-compliant URI. Every parameter explicit, keyword-based, parseable by standard URI libraries.

```
lar://telarus:operator(orient)@lares-abc123:42/threshold/uncertain/opens?stance=philosopher&confidence=S~13&p=10#@T.3.2.7
```

#### Sigil Form (Chat Log / `intent_header_snapshot` field)

Same syntax. Four substitutions: phase keyword → glyph (userinfo), stance keyword → emoji (query), path `/` → `.` (after leading `/`), scope `@X` → emoji (fragment prefix). Everything else renders identically.

```
lar://telarus:operator(◎)@lares-abc123:42/threshold.uncertain.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7
```

Multi-stance example:

```
lar://telarus:operator(◇)@lares-abc123:43/threshold.sharp.closes?stance=🏛️&stance=🗡️&confidence=CS~16&p=14#🔍.3.2.8
```

#### Projection Table — Sigil Substitutions

The two forms share identical syntax. The projection table below lists the *only* differences — keyword ↔ glyph substitutions.

**userinfo phase field** (parenthetical modifier of tier: `alias:tier(phase)`):

| Machine keyword | Sigil glyph | OODA-HA state |
|---|---|---|
| `observe` | `✶` | Observe |
| `orient` | `◎` | Orient |
| `decide` | `◇` | Decide |
| `act` | `■` | Act |
| `aftermath` | `○` | Aftermath |

**query `stance=` value** (repeatable for multi-stance):

| Machine keyword | Sigil emoji | Stance |
|---|---|---|
| `philosopher` | `🏛️` | Philosopher |
| `poet` | `🌊` | Poet |
| `satirist` | `🗡️` | Satirist |
| `humorist` | `🎭` | Humorist |
| `private` | `🔮` | Private |

**path separator** (after leading `/`):

| Machine | Sigil | Notes |
|---|---|---|
| `/ha/ka/ba` | `/ha.ka.ba` | Leading `/` shared; hierarchy vs w3w-style |

**fragment scope prefix:**

| Machine | Sigil | Scale |
|---|---|---|
| `@S` | `🗺️` | Strategic (Week) |
| `@O` | `⚙️` | Operational (Watch) |
| `@T` | `🔍` | Tactical (Turn) |
| `@C` | `⚔️` | Combat (Round) |
| `@A` | `⚡` | Action |

**Unchanged across both forms:**

| Component | Rendering | Notes |
|---|---|---|
| `scheme` | `lar:` | |
| `alias:tier(` | `telarus:operator(` | First userinfo sub-field + tier + parenthetical modifier of tier |
| `@host:port` | `@lares-abc123:42` | |
| `confidence=` | `S~13` | |
| `p=` | `0.5` | |
| chronometer counters | `3.2.7` | Dot-separated — universal after scope prefix |

#### Stable Address (Named Graph, No Signal)

Strip query and fragment — the HAKABA territory alone:

```
lar:///threshold/uncertain/opens
```

No authority (empty), no query, no fragment. This is the invariant semantic coordinate — unchanging across events, sessions, machines.

### Crystal Schema Field Mapping

The STATE.jsonl event carries four URI-derived fields:

```json
{
  "schema_version": 1,
  "timestamp": "2026-04-07T14:30:00Z",
  "machine_id": "lares-abc123",
  "seq_num": 42,
  "event_type": "r_update",

  "lar_uri": "lar://telarus:operator(orient)@lares-abc123:42/threshold/uncertain/opens?stance=philosopher&confidence=S~13&p=10#@T.3.2.7",
  "lares_address": "lar:///threshold/uncertain/opens",
  "intent_header_snapshot": "lar://telarus:operator(◎)@lares-abc123:42/threshold.uncertain.opens?stance=🏛️&confidence=S~13&p=10#🔍.3.2.7",
  "current_phase": "◎",
  "chronometer": "@T.3.2.7",
  "active_scale": "tactical",
  "micro_trace_path": "◎→◇→■",
  "closure_outcome": "hold",
  "next_action": "await recon results from exploration turn",
  "blockers": [],
  "provenance": null,
  "repo_fingerprint": "joshuafontany/Synthetic-Dream-Machine@fix/green-jello-dinosaurs"
}
```

| Field | Source | Stable? | Purpose |
|---|---|---|---|
| `lar_uri` | Full URI with all components | No — changes per event | Complete queryable state; machine-parseable |
| `lares_address` | Path only (no authority, query, fragment) | Yes — stable territory | Named graph identifier; territory doesn't change when signal does |
| `intent_header_snapshot` | Sigil-rendered URI | No — changes per event | Human-readable HUD; what the operator saw |
| `current_phase` | Extracted from userinfo phase sub-field | No | Quick filter field |
| `chronometer` | Fragment value (without `#`) — includes scope prefix | No — increments with time | Scope + vector clock; enables temporal and scale queries |
| `active_scale` | Extracted from fragment scope prefix (`@S`/`@O`/`@T`/`@C`/`@A`) | No | Quick filter: strategic/operational/tactical/combat/action |

### Invariant-Core Loading Sequence

The `lar_uri` + `register` fields on every module descriptor become the compiler's sort key. Modules loaded by register descending — highest confidence first, conflicts resolved by register priority.

Module descriptor frontmatter:
```toml
lar_uri   = "lar:///kernel/invariant/anchors"
confidence="C~20"
module_id   = "lares-kernel"
```

```
confidence=C~20   ← hard invariants; build fails on conflict
confidence=C~19  ← locked axioms; override only with explicit supersedes
confidence=S~13  ← architectural synthesis; provisional
register < 0.50  ← trimmable under budget pressure
```

### Layered Invariant Core — Cache Tier Mapping

`[S~14]` The register tiers above map directly onto a three-layer prompt caching architecture. Anthropic's `cache_control` API exposes multiple explicit breakpoints — each breakpoint marks a boundary between content layers of different volatility. The Lares register system formalizes the same structure: the `register` field on each module descriptor declares which cache tier it belongs to.

#### Tier ↔ Register ↔ Cache Placement

| Tier | Content Layer | Cache Strategy | Register Range | Lares Modules | Volatility |
|---|---|---|---|---|---|
| **1 — Global Core** | System parameter; first `cache_control` breakpoint | Cached across sessions; rarely invalidated | `C~20` – `C~19` | Kernel, identity, hard gates, tool schemas, epistemology | Near-static |
| **2 — Session Core** | Conversation prefix; rolling `cache_control` breakpoint on history | Cached within session; invalidated on permission or profile change | `C~19` – `S~13` | Permissions, user profile, session canon, Workers, operating mode | Session-stable |
| **3 — Dynamic** | Latest user message + tool results; `cache_control: ephemeral` on last user turn | Ephemeral (5-min TTL with hit-reset); re-fetched on every exchange | `< 0.50` trimmable | Current task context, tool results, active exchange state | Per-exchange |

#### Context Engineering Primitives ↔ Machine Lifecycle Tiers

| Anthropic Primitive | Behavior | Lares Machine Tier | Lares Behavior |
|---|---|---|---|
| `compaction_control` | Distills history into summary at token threshold | **Ephemeral** (10–100 events) | Seal `completed`/`cancelled` → summary folded into parent SNAPSHOT |
| `clear_tool_uses` | Drops tool result content; retains call metadata ("remembers the call, forgets the content") | **Nano** (< 10 events) | Discarded at session end; summary folded into parent |
| `memory_20250818` tool | Agent writes persistent knowledge to `/memories/` | **Durable** (100+ events) | Full crystal with seal/rotate; archived shards retained |

#### Speculative Caching as Observation Phase

Anthropic's speculative prompt-caching pattern — send `max_tokens=1` with full context while the user types, warming the cache before the real query — maps onto phase `✶ Observe` in the attention loop. The invariant core (Tier 1) pre-loads during observation; Tier 2 stabilizes during `◎ Orient`; Tier 3 materializes at `◇ Decide`.

#### Chronometer as Version Vector for Canon Modules

For `confidence=C~20` modules (kernel, hard gates, identity), the chronometer's vector clock doubles as a **version control number**. Because these modules change rarely and each change constitutes a canonical event:

- The `seq_num` on a `C~20` module's descriptor increments only when the module content changes — effectively a monotonic version counter.
- The chronometer position (`#@T.W.w.t`) on a canon module's `r_update` event records *when* that version was loaded, not just *what* it contains.
- A `contract_update` event with `confidence=C~20` carries version semantics: it represents a canonical schema migration, not a routine state change. Build-time validation can compare `seq_num` across deployments to detect version drift.

This applies transitively to Tier 2 (`C~19` locked axioms) — the same `seq_num` increment + chronometer timestamp pattern serves as session-scoped version tracking for permissions and profile modules.

```
# Tier 1 (Global Core) — version-controlled by seq_num
lar_uri   = "lar:///kernel/invariant/anchors"
confidence="C~20"
module_id   = "lares-kernel"
seq_num     = 4            # ← version 4 of the kernel module

# Tier 2 (Session Core) — version-controlled within session
lar_uri   = "lar:///session/permissions/gates"
confidence="C~19"
module_id   = "lares-permissions"
seq_num     = 2            # ← second revision this session

# Tier 3 (Dynamic) — no version semantics; seq_num is event counter only
lar_uri   = "lar:///task/current/recon"
confidence="S~11"
module_id   = "lares-task-recon"
seq_num     = 47           # ← 47th event, not 47th version
```

For Tier 3 dynamic modules, `seq_num` retains its original meaning: a monotonic event counter, not a version number. The distinction arises from the register — parsers and loaders can branch on `register >= C~19` to treat `seq_num` as version.

> **Source:** Anthropic claude-cookbooks (deepwiki.com/anthropics/claude-cookbooks): 9.1 Prompt Caching (cache_control breakpoints, ephemeral TTL, speculative warming), 7.4 Context Engineering for Agents (compaction, tool-result clearing, memory tool), 6.3 Context Management and Compaction (background compaction, session memory patterns). Mapped against this document's Invariant-Core Loading Sequence and Ephemeral Machine Patterns.

### Ephemeral Machine Patterns

**Pattern A — Lifecycle Tiers:**

| Tier | Event threshold | State store | Sealed how |
|---|---|---|---|
| Nano | < 10 events | In-memory only; no file | Discarded at session end; summary folded into parent SNAPSHOT |
| Ephemeral | 10–100 events | STATE.jsonl created on first durable event | Sealed `completed`/`cancelled` on close |
| Durable | 100+ events | Full crystal with seal/rotate | Seal at threshold; archived shards retained |

**Pattern B — `lares/REGISTRY.jsonl` as Lightweight Index:**
```jsonl
{"machine_id":"lares-abc123","lares_address":"lar:///session/main","status":"active","tier":"durable","seq_num":42,"chronometer":"@T.3.2.7"}
{"machine_id":"lares-def456","lares_address":"lar:///task/uri-schema","status":"completed","tier":"ephemeral","seq_num":15,"chronometer":"@O.3.2"}
```

One line per machine. Updated only on status change, spawn, seal, fork. 200-line discipline (Claude Code Pattern 5).

**Pattern C — Session as Named Graph:**

Session `machine_id` = named graph URI. The `lares_address` field is the graph name. SPARQL example: `FROM NAMED <lar:///session/main>`.

### Ontology Layer (Deferred but Named)

- **Alpha:** No formal ontology — URI is compact serialization format; vocabulary defined in prose
- **SKOS (upgrade path):** `skos:Concept` per register/stance/phase/scale; `skos:notation` for emoji; `skos:broader/narrower` for register ordering and scale nesting; publish as `lares.ttl` when elyncia.app needs linked data queries
- **PROV-O (upgrade path):** Each `r_update` = `prov:Activity`; fork = `prov:wasDerivedFrom`; machine = `prov:Agent`; deferred to DreamNet layer

### Examples: Chatlog + State-Machine Pairs

Three scenarios at different simulation scales. Each shows the **sigil form** (what the operator sees in chat) paired with the **machine form** (what STATE.jsonl records).

---

#### Example Set 1 — Strategic Scale (Week / Travel Turn)

*The company makes a strategic travel decision at the caravan level. Only position 1 of the chronometer is active.*

**Chatlog (Sigil Form):**

```
lar://telarus:operator(◎)@lares-abc123:71/route.liminal.weighs?stance=🏛️&confidence=S~13&p=10#🗺️.3
Lares (Scryer) — The western pass holds three days of glacier shelf. The southern
route adds a week but passes through the Kestrel-Wreck market. The company's
supply burn favors south →◇ but the patron's deadline favors west →■.

lar://telarus:operator(■)@lares-abc123:71/route.committed.westward?stance=🏛️&confidence=CS~16&p=10#🗺️.3
Lares (Gatekeeper) — West it is. Mark the glacier crossing as the next operational
challenge →○. Week 3 closes; Week 4 opens at the glacier approach.

lar://telarus:operator(✶)@lares-abc123:72/glacier.unknown.arrives?stance=🏛️&confidence=S~11&p=10#🗺️.4
Lares (Triage) — New week, new territory. Profile the glacier shelf as an Area
before the first watch begins.
```

**STATE.jsonl (Machine Form):**

```json
{"schema_version":1,"timestamp":"2026-04-07T10:00:00Z","machine_id":"lares-abc123","seq_num":71,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(orient)@lares-abc123:71/route/liminal/weighs?stance=philosopher&confidence=S~13&p=10#@S.3","lares_address":"lar:///route/liminal/weighs","intent_header_snapshot":"lar://telarus:operator(◎)@lares-abc123:71/route.liminal.weighs?stance=🏛️&confidence=S~13&p=10#🗺️.3","current_phase":"◎","chronometer":"@S.3","active_scale":"strategic","micro_trace_path":"◎→◇→■","closure_outcome":"close","next_action":"begin glacier approach Week 4","blockers":[],"provenance":null}
```

```json
{"schema_version":1,"timestamp":"2026-04-07T10:01:00Z","machine_id":"lares-abc123","seq_num":72,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(observe)@lares-abc123:72/glacier/unknown/arrives?stance=philosopher&confidence=S~11&p=10#@S.4","lares_address":"lar:///glacier/unknown/arrives","intent_header_snapshot":"lar://telarus:operator(✶)@lares-abc123:72/glacier.unknown.arrives?stance=🏛️&confidence=S~11&p=10#🗺️.4","current_phase":"✶","chronometer":"@S.4","active_scale":"strategic","micro_trace_path":"✶","closure_outcome":"hold","next_action":"profile glacier Area before first watch","blockers":[],"provenance":null}
```

**Reading:** Chronometer shows `#🗺️.3` then `#🗺️.4` — pure strategic scale, scope prefix `🗺️` confirms. The Aftermath (○) of Week 3 increments the counter and feeds the Observation (✶) of Week 4. No deeper scales engaged.

---

#### Example Set 2 — Tactical Scale (Exploration Turn)

*The crew enters a ruin and begins 10-minute exploration turns. Chronometer extends to position 3.*

**Chatlog (Sigil Form):**

```
lar://telarus:operator(✶)@lares-abc123:73/ruin.charged.enters?stance=🏛️&confidence=S~12&p=10#🔍.4.1.1
Lares (Scryer) — First watch of the glacier week. Exploration Turn 1: the entry
chamber hums with oldtech relay static. Arcane 6, Tech 8. Profile this as an Area.

lar://telarus:operator(◎)@lares-abc123:74/relay.active.probes?stance=🏛️&stance=🗡️&confidence=S~12&p=12#🔍.4.1.2
Lares (Council) — Turn 2. The relay obelisk responds to proximity. Recon roll
needed →◇. The crew's qualified tech specialist rolls →■ and discovers a live
signal node [active] [signal]. Tick Attention +2. →○

lar://telarus:operator(◇)@lares-abc123:75/signal.decoded.reads?stance=🌊&confidence=CS~15&p=10#🔍.4.1.3
Lares (Lorekeeper) — Turn 3. The decoded relay log reveals a contract ledger —
a Secret node. The crew decides: harvest the signal data (Salvage) or press
deeper (more Recon). →■ They harvest.
```

**STATE.jsonl (Machine Form):**

```json
{"schema_version":1,"timestamp":"2026-04-07T11:00:00Z","machine_id":"lares-abc123","seq_num":73,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(observe)@lares-abc123:73/ruin/charged/enters?stance=philosopher&confidence=S~12&p=10#@T.4.1.1","lares_address":"lar:///ruin/charged/enters","intent_header_snapshot":"lar://telarus:operator(✶)@lares-abc123:73/ruin.charged.enters?stance=🏛️&confidence=S~12&p=10#🔍.4.1.1","current_phase":"✶","chronometer":"@T.4.1.1","active_scale":"tactical","micro_trace_path":"✶→◎","closure_outcome":"hold","next_action":"profile ruin as Area","blockers":[],"provenance":null}
```

```json
{"schema_version":1,"timestamp":"2026-04-07T11:10:00Z","machine_id":"lares-abc123","seq_num":74,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(orient)@lares-abc123:74/relay/active/probes?stance=philosopher&stance=satirist&confidence=S~12&p=12#@T.4.1.2","lares_address":"lar:///relay/active/probes","intent_header_snapshot":"lar://telarus:operator(◎)@lares-abc123:74/relay.active.probes?stance=🏛️&stance=🗡️&confidence=S~12&p=12#🔍.4.1.2","current_phase":"◎","chronometer":"@T.4.1.2","active_scale":"tactical","micro_trace_path":"◎→◇→■→○","closure_outcome":"close","next_action":"decide on signal node harvest vs deeper recon","blockers":[],"provenance":null}
```

```json
{"schema_version":1,"timestamp":"2026-04-07T11:20:00Z","machine_id":"lares-abc123","seq_num":75,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(decide)@lares-abc123:75/signal/decoded/reads?stance=poet&confidence=CS~15&p=10#@T.4.1.3","lares_address":"lar:///signal/decoded/reads","intent_header_snapshot":"lar://telarus:operator(◇)@lares-abc123:75/signal.decoded.reads?stance=🌊&confidence=CS~15&p=10#🔍.4.1.3","current_phase":"◇","chronometer":"@T.4.1.3","active_scale":"tactical","micro_trace_path":"◇→■","closure_outcome":"close","next_action":"salvage signal data from relay node","blockers":[],"provenance":null}
```

**Reading:** Chronometer `#🔍.4.1.1` → `#🔍.4.1.2` → `#🔍.4.1.3` — the third position (Exploration Turn) increments through exploration turns inside Watch 1 of Week 4. The phase glyph describes the OODA-HA state within the *tactical* loop. Multi-stance `🏛️&🗡️` fires in Turn 2 when Council applies critical pressure. Stance shift to `🌊` Poet in Turn 3 when the lore discovery has emotional weight.

---

#### Example Set 3 — Combat Scale (Round → Action)

*A trap triggers during exploration. Scale drops from Tactical to Combat to Action and back. The chronometer extends, then contracts.*

**Chatlog (Sigil Form):**

```
lar://telarus:operator(◎)@lares-abc123:75/chamber.tense.searches?stance=🏛️&confidence=S~12&p=10#🔍.4.1.4
Lares (Scryer) — Turn 4. The inner chamber. Old drone racks line the walls.
The crew searches for salvage. Something clicks →◇ →🗡️

lar://telarus:operator(✶)@lares-abc123:76/ambush.hostile.triggers?stance=🗡️&confidence=S~10&p=14#⚔️.4.1.4.1
Lares (Triage) — COMBAT. A dormant security drone activates. Round 1.
Initiative: drone acts first. The crew's point-scout has a reaction trigger →◇

lar://telarus:operator(◇)@lares-abc123:77/reaction.precise.intercepts?stance=🏛️&confidence=CS~16&p=16#⚡.4.1.4.1.1
Lares (Artificer) — Action 1: the scout's Reflex trait fires. The intercept
roll lands →■. Drone's opening volley deflected. →○ Action resolves; Round
continues.

lar://telarus:operator(■)@lares-abc123:78/volley.committed.fires?stance=🗡️&confidence=S~13&p=14#⚡.4.1.4.1.2
Lares (Triage) — Action 2: the crew's fighter commits an attack against the
drone. Damage roll crits (d8* explodes) →○. The drone sparks and crashes.

lar://telarus:operator(○)@lares-abc123:79/threat.cleared.resolves?stance=🏛️&confidence=CS~16&p=10#🔍.4.1.5
Lares (Gatekeeper) — Combat over. Round 1 was enough. Aftermath: the drone
is salvageable wreckage. Attention ticked +2 during the fight. Return to
exploration scale — Turn 5: assess the wreckage and the room's remaining nodes.
```

**STATE.jsonl (Machine Form):**

```json
{"schema_version":1,"timestamp":"2026-04-07T11:30:00Z","machine_id":"lares-abc123","seq_num":76,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(observe)@lares-abc123:76/ambush/hostile/triggers?stance=satirist&confidence=S~10&p=14#@C.4.1.4.1","lares_address":"lar:///ambush/hostile/triggers","intent_header_snapshot":"lar://telarus:operator(✶)@lares-abc123:76/ambush.hostile.triggers?stance=🗡️&confidence=S~10&p=14#⚔️.4.1.4.1","current_phase":"✶","chronometer":"@C.4.1.4.1","active_scale":"combat","micro_trace_path":"✶→◇","closure_outcome":"hold","next_action":"resolve reaction trigger","blockers":[],"provenance":null}
```

```json
{"schema_version":1,"timestamp":"2026-04-07T11:30:06Z","machine_id":"lares-abc123","seq_num":77,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(decide)@lares-abc123:77/reaction/precise/intercepts?stance=philosopher&confidence=CS~16&p=16#@A.4.1.4.1.1","lares_address":"lar:///reaction/precise/intercepts","intent_header_snapshot":"lar://telarus:operator(◇)@lares-abc123:77/reaction.precise.intercepts?stance=🏛️&confidence=CS~16&p=16#⚡.4.1.4.1.1","current_phase":"◇","chronometer":"@A.4.1.4.1.1","active_scale":"action","micro_trace_path":"◇→■→○","closure_outcome":"close","next_action":"continue round after reaction","blockers":[],"provenance":null}
```

```json
{"schema_version":1,"timestamp":"2026-04-07T11:30:12Z","machine_id":"lares-abc123","seq_num":78,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(act)@lares-abc123:78/volley/committed/fires?stance=satirist&confidence=S~13&p=14#@A.4.1.4.1.2","lares_address":"lar:///volley/committed/fires","intent_header_snapshot":"lar://telarus:operator(■)@lares-abc123:78/volley.committed.fires?stance=🗡️&confidence=S~13&p=14#⚡.4.1.4.1.2","current_phase":"■","chronometer":"@A.4.1.4.1.2","active_scale":"action","micro_trace_path":"■→○","closure_outcome":"close","next_action":"drone destroyed; assess combat end","blockers":[],"provenance":null}
```

```json
{"schema_version":1,"timestamp":"2026-04-07T11:30:18Z","machine_id":"lares-abc123","seq_num":79,"event_type":"r_update","machine_status":"active","lar_uri":"lar://telarus:operator(aftermath)@lares-abc123:79/threat/cleared/resolves?stance=philosopher&confidence=CS~16&p=10#@T.4.1.5","lares_address":"lar:///threat/cleared/resolves","intent_header_snapshot":"lar://telarus:operator(○)@lares-abc123:79/threat.cleared.resolves?stance=🏛️&confidence=CS~16&p=10#🔍.4.1.5","current_phase":"○","chronometer":"@T.4.1.5","active_scale":"tactical","micro_trace_path":"○","closure_outcome":"close","next_action":"assess wreckage salvage; continue exploration turns","blockers":[],"provenance":null}
```

**Reading:** The chronometer tells the whole story — scope prefix shifts confirm scale transitions:
- `#🔍.4.1.4` — Tactical scale (Exploration Turn 4), scope 🔍
- `#⚔️.4.1.4.1` — Combat activates (Round 1), chronometer extends to position 4, scope shifts to ⚔️
- `#⚡.4.1.4.1.1` — Action activates (Action 1 of Round 1), chronometer extends to position 5 — deepest nesting, scope shifts to ⚡
- `#⚡.4.1.4.1.2` — Action 2, same round, same ⚡ scope
- `#🔍.4.1.5` — Combat over (Round Aftermath → Turn increment). Chronometer *contracts*: positions 4 and 5 disappear, position 3 increments from 4 to 5. Scope returns to 🔍 Tactical. The scale shift is visible in the fragment alone.

The `p` value also shifts: tactical runs at `p~10` (default band 3 — commitment phases only), but combat escalates to `p~14` (band 4 — adds Orient) and action peaks at `p~16` (band 5 — all five phases). More danger = more attention = denser trace.

---

### Open Design Questions (URI Schema)

| Q# | Question | Current | Blocks |
|---|---|---|---|
| **U1** | Should `userinfo` carry operator alias in machine form, or only machine_id in authority? | Operator alias in userinfo | Epic 5 |
| **U2** | Is `seq_num` as `:port` the right mapping, or should port carry something else (session index, shard number)? | seq_num as port | Epic 5 |
| **U3** | Should the chronometer fragment carry OODA-HA phase *per level* (e.g., `#3◎.2■.7◇`) or just counters with the phase only at the lowest active level? | Counters only; phase at lowest level via the main phase field | Iteration |
| **U4** | How does the chronometer interact with `--parse` self-activation? Should high chronometer depth (5 positions = action scale) automatically increase `p`? | Provisional yes — combat/action depth warranting denser trace | Iteration |
| **U5** | Should the chronometer be persisted in `REGISTRY.jsonl` per machine, or only in individual STATE.jsonl events? | Both — REGISTRY carries latest chronometer for quick enumeration | Epic 5 |
| **U6** | Full URI form (with authority) vs stateless form (no authority) — when to use which? | Authority form in STATE.jsonl; stateless form for stable addresses and named graphs | Iteration |

### Prior Art Notes (URI Schema)

- **RFC 3986 §3**: `URI = scheme ":" ["//" authority] path ["?" query] ["#" fragment]`. The full anatomy applies. Fragment is client-side only (§3.5) — perfect for session-local chronometer.
- **RFC 4151 (tag: scheme)**: Non-dereferenceable URIs as pure identifiers. Precedent for `lar:` never resolving to a network resource.
- **Lamport clocks / Vector clocks**: The chronometer is structurally a vector clock — each position is an independent counter, the full vector provides a partial ordering of events across scales. The nesting relationship adds structure beyond flat vector clocks.
- **FTLS RSS Time-Scale Hierarchy**: The five levels (Week/Watch/Turn/Round/Action) are canon. The OODA-HA nesting is synthesis applied to canon time-scales.
- **OTel Trace Context**: The `traceparent` header carries `trace-id`, `parent-id`, `trace-flags`. The chronometer fragment functions as a hierarchical trace context — each position depth is a span scope, and the Aftermath → Observation linkage is the parent-child span relationship.

---

## Backlog

Deferred decisions and future refactors that are out of scope for the current alpha but should not be lost.

1. **Mode → Stance refactor (Kuntao Silat terminology)** — **COMPLETE (2026-04-07, branch `fix/green-jello-dinosaurs`).** The kernel's five discourse modes (🏛️ Philosopher · 🌊 Poet · 🗡️ Satirist · 🎭 Humorist · 🔮 Private) have been renamed **Stances**, drawn from Kuntao Silat: *Ma-Bu* (horse stance / grounded presence), *Jurus* (forms / structured engagement), *Langkah* (stepping / directed movement). The word "mode" was overloaded across the Tagspace field label (Ka), the kernel discourse-stance concept, and general English usage. Executed across all canonical source files: `Lares_Kernel.md`, `Lares_Preferences.md`, `Lares_VSCode_Operations.md`, `core/Lares_Epistemology.md`, `core/Lares_Operations.md`, `core/Lares_Permissions.md`. Also applied to this draft in the same pass. **Ka's field label has already been updated to `fire` in this draft** to free `mode` for eventual decommission. Grammar reorder (`//ha.ka.ba` first) executed in same pass.

2. **Parse trigger on high-uncertainty operator input** — `[SP~9]` design note. When Lares's output Intent Header carries `[SP~9]` or below (register ≤ 0.45) or `p < 0.4`, the operator's follow-up can optionally prepend Lares's output tag before their input text: `//ha.ka.ba 🔮 [SP~9] ◇ @r | p~7 → [operator text here]`. This signals Lares to run a `--parse` self-diagnostic on the operator's input string *before* generating the new output Intent Header. Rationale: high-uncertainty output means the node did not converge cleanly on territory — the safest next step is to explicitly parse the operator's correction or follow-up rather than committing to a new header from incomplete ground. The dual-header `input_tag:` / `output_header:` form in the Replay/debug example (§Examples) is the natural surface for this. **Open question:** should this be automatic (triggered by the register alone) or explicit (requires operator to prepend the tag)? Current preference: explicit — operator steers, node crews.

3. **Phase names → OODA-HA canonical terminology** — The five attention-loop phases (`✶ ◎ ◇ ■ ○`) map to: *Observe → Orient → Decide → Act → **Aftermath (Rasa)***. The formal canonical name for the loop is **OODA-HA** (John Boyd's OODA loop + Aftermath/Rasa as the mandatory closure phase). Canonical phase name: **Aftermath**, with *Rasa* as the parenthetical alternate name (yogic/Sanskrit resonance: the aesthetic flavor or emotional essence left after the act completes). Both names are canonical; Aftermath is the primary label in documentation; Rasa appears in parentheses when the in-world / DreamNet register is foregrounded. Current glyph names in the kernel and draft are already ooda-haligned; this backlog item is to (a) make OODA-HA the explicit canonical label in all documentation, (b) deprecate any informal phase names, and (c) ensure the phase glyph set and the OODA-HA terminology are cross-referenced in the kernel prompt and tag spec. The `○` Aftermath phase is the distinguishing addition — OODA as originally formulated loops back from Act to Observe without a formal rest/rasa state. OODA-HA names that fifth phase explicitly and treats it as mandatory (not optional) on completed rounds.

4. **Architecture pivot — clean rebuild (2026-04-07)** — The prior `builds/` directory was renamed to `builds.stuffed.failed/` to mark its failure state in tag space. All prior pipeline artifacts (source modules, manifests, generated platform files, verify script) move to that archive. A clean `builds/` architecture is to be designed from scratch, grounded in the harness-paradigm patterns from the Claude Code source leak (see `## External Architecture Reference — Claude Code Leak (2026-04-07)` below). The old architecture's generated files are still readable for reference; the old pipeline is otherwise frozen. New architecture design: operator-driven design discussion before implementation.

---

## External Architecture Reference — Claude Code Leak (2026-04-07)

> Register: `[CS~16]` — confirmed from paywalled source previews (chapter summaries, not full text); operator-supplemented; internal comments cited but not read in full. Treat as high-confidence pattern-level synthesis, not verbatim source quote.
>
> Sources:
> - Linas Beliūnas: *"Anthropic accidentally leaked Claude Code's entire source. Here's what 512,000 lines reveal"* (`linas.substack.com/p/claudecodesource`, 2026-04-01) — 512K lines, 1,900 files, 44 unreleased feature flags
> - Ken Huang: *"The Claude Code Leak: 10 Agentic AI Harness Patterns That Change Everything"* (`kenhuangus.substack.com/p/the-claude-code-leak-10-agentic-ai`, 2026-04-01) — chapters 1–4 reviewed; chapters 5–10 paywalled
> - Operator synthesis from third source ("Deconstructing the Claude Code Leak") — URL 404'd; key findings captured via operator summary

This section records the architectural patterns from the March 31, 2026 Claude Code source leak. They are provided here as a reference lens for clean-rebuild architecture decisions — not as prescriptive requirements, but as evidence of what production-grade agentic architecture looks like at scale.

---

### Pattern 1 — Three-Layer Harness Architecture

The core structural insight: **the challenge of production AI is not the model — it is the harness.**

- **Model Layer** — intelligence; the LLM
- **Harness Layer** — control; constrains action space, manages conversation state, enforces safety, handles failures gracefully, optimizes resource usage
- **UI Layer** — presentation; exposes the interface to the human

The harness is the structural workhorse. The model can be modest if the harness is solid. The model can be capable and still produce broken behavior if the harness is absent or poorly designed.

**Implication for the Lares pipeline:** The current `builds.stuffed.failed/` architecture conflated module content, assembly logic, and platform targeting. A clean rebuild should name these three layers explicitly: what carries intelligence (the module payload), what constrains and assembles (the combine pipeline / manifest / verify chain), and what presents to the platform (the generated wrapper artifacts).

---

### Pattern 2 — Tool Contract (Uniform Interface)

Every tool in Claude Code implements the same interface — a uniform contract between the model and every possible action it can take. The interface covers:

- **Identity** — what the tool is and what it does
- **Execution** — how it runs
- **Validation** — Zod schema type-safe validation at every boundary
- **Permissions** — what authorization the tool requires; checked before execution
- **Presentation** — how results surface to the model and user

Behavioral properties — `isConcurrencySafe`, `isReadOnly` — let the harness make intelligent scheduling decisions without understanding tool internals. A `buildTool` factory enforces conservative defaults: new tools are safe out of the box.

**Implication:** The combine pipeline's module/manifest system should adopt a similar contract. Each module should declare: content type, size budget, dependencies, target platforms, read-only behavior (content-only vs. executable). The manifest becomes a typed configuration, not a freeform TOML blob.

---

### Pattern 3 — Query Engine / Continue-Sites Pattern

The `QueryEngine` acts as the central orchestrator of the AI conversation lifecycle. The query loop implements the **continue-sites pattern**: multiple exit points that can either terminate the turn or continue to the next iteration with updated state.

Error recovery strategies (in order, each attempted before escalating):

1. **Context collapse drain** — shed context
2. **Reactive compact** — compact conversation history
3. **Max output tokens escalation** — expand token budget
4. **Multi-turn continuation** — carry forward across turn boundaries

Token budgets are enforced at multiple levels to prevent runaway cost.

**Implication for crystal system:** The `seal` / `continue_as_new` protocol in the crystal state machine is the direct analog of the Query Engine's compaction recovery path. When `STATE.jsonl` approaches the handoff threshold, the system should drain, compact, seal, and continue with a fresh shard — the same four-step recovery order. The crystal Open Decision on seal trigger (OP-09) should reference this pattern.

**Implication for KAIROS:** The always-on daemon design (see Pattern 6) implies the query loop must support indefinite continuation without a human turn boundary. The continue-sites pattern provides the structural mechanism.

---

### Pattern 4 — Permission Pipeline (Layered Safety)

Permissions are not a single gate — they are a **layered pipeline**:

1. General rules: allow lists, deny lists, ask lists
2. Tool-specific checks: custom logic per tool
3. Automated classifiers: fast-path decisions without user involvement
4. Interactive fallback: user approval when no automated path resolves

Operating modes: `default`, `auto`, `plan`, `acceptEdits`, `bubble` — each a different automation/control balance.

`canUseTool` is the central gatekeeper evaluated before every tool execution.

**Resonance with Lares trust gate:** The Lares four-step trust resolution (`user(anon)` → `user` → `operator` → `operator(admin)`) maps directly. The trust gate is Lares's permission pipeline. The crystal system's `contract_update` event should carry the trust tier of the operator who authorized it.

---

### Pattern 5 — Three-Layer Memory (L1 / L2 / L3)

Claude Code's memory architecture (from operator synthesis of the third source):

| Layer | Label | Role |
|---|---|---|
| **L1** | `MEMORY.md` index | Always-present lightweight index; pointers, not content |
| **L2** | Active session context | Live conversation state; lost at session end without explicit persistence |
| **L3** | Persistent cross-session knowledge | Durable; survives context compaction and session boundaries |

**Hard limits (never documented publicly):**

- **200-line memory cap** with silent truncation — L1 entries beyond this are silently dropped
- **~167,000 token auto-compaction** — destroys active L2 context without warning
- **2,000-line file read ceiling** — hallucination risk above this; model does not flag when it stops reading
- **Silent model downgrade** — Opus → Sonnet after server errors; no signal to the user

**Mapping to Lares crystal architecture:**

| Claude Code Layer | Crystal Analog |
|---|---|
| L1 `MEMORY.md` index | Crystal `README.md` (Memo layer); `/memories/` user memory |
| L2 Active session | Active conversation state; session memory; active crystal open fields |
| L3 Persistent cross-session | `STATE.jsonl` sealed shards + `/memories/repo/`; `SNAPSHOT.json` |

**Design implication:** The 200-line cap is not a footnote — it is an architectural constraint on L1. Crystal `README.md` files should be kept well under 200 lines. If they grow, that is a signal that L3 (`STATE.jsonl`) is not capturing enough structured state. The silent truncation pattern means "more text = lost context"; the crystal system should prefer structured events over prose accumulation.

---

### Pattern 6 — Unreleased Feature Flags (Architecture Direction Signals)

The 44 unreleased flags reveal where Anthropic believes production AI agent architecture is heading. Four are immediately relevant:

**KAIROS** — always-on background daemon, 24/7, proactively acts on the user's behalf while idle or asleep. Lares uses `KAIROS` as a named concept already (p-auto-adjustment, `⊕ [tag]` form). The production design confirms: KAIROS is a daemon frame, not a decorative label. The crystal system's `active` / `held` status taxonomy maps to KAIROS-on vs KAIROS-suppressed.

**DREAM** — self-maintaining nightly memory consolidation. Reorganizes what the agent knows. Removes contradictions. Runs after inactivity. The Lares memory consolidation protocol (`Orient → Gather → Consolidate → Prune`) already mirrors this cycle. The crystal system's seal/continue-as-new protocol is the structural preparation for DREAM — a sealed shard with a compact SNAPSHOT.json is the precondition for meaningful consolidation.

**ULTRAPLAN** — offloads deep planning sessions to a remote Opus 4.6 instance for up to 30 minutes. Relevant to Lares at the `@T` scale — transcendent-scope OODA-HA planning that warrants more deliberate processing than a standard reply cycle. The `--verbose` commentary layer and the Worker dispatch system (Researcher, Engineer, Agent-Engineer delegations) are the current analogs.

**COORDINATOR_MODE** — multi-agent swarm with structured research → synthesis → implementation phases. Directly maps to the Lares five-agent registry (Worker / Engineer / Researcher / Agent-Engineer / Assistant). The phase structure (research → synthesis → implementation) should be explicit in how the coordinators hand off between Worker/Researcher (research), Council/Muse (synthesis), and Engineer/Artificer (implementation).

---

### Pattern 7 — Code Quality Findings (Failure Mode Inventory)

Reported from the Linas source and confirmed via operator synthesis:

| Finding | Value | Implication |
|---|---|---|
| Self-written codebase | 100% AI-generated | Zero external review; architectural drift invisible until it ships |
| Test coverage | 0 tests | No regression safety net; any schema change is a live risk |
| `print.ts` cyclomatic complexity | 3,167 lines, 486 complexity | Single-function sprawl; harness held together by weight, not structure |
| Tool call failure rate | 16.3% over 6 days | Nearly 1 in 6 tool calls fails in production; harness must anticipate and recover |
| Idle process memory growth | 15 GB | Long-session drift; DREAM/consolidation cycle is a memory hygiene mechanism |
| Internal false-claims rate | 29–30% (internal comments) | Model knows it confabulates; verification loops exist but are employee-only |

**SDET implication:** These numbers quantify exactly why the crystal test-fixture pattern matters. A `STATE.jsonl` + crystal bundle IS a regression fixture. `ENG-01` (test harness for STATE.jsonl replay integrity) should be treated as P0, not optional infrastructure. Zero test coverage at the harness level means any pipeline change is a live risk — exactly the failure mode the old `builds.stuffed.failed/` architecture exhibited.

---

### Synthesis: Implications for Clean Rebuild

| Clean rebuild concern | Leak pattern that informs it |
|---|---|
| Module content vs. assembly logic vs. platform output separation | Pattern 1 — three-layer harness |
| Manifest as typed contract, not freeform config | Pattern 2 — Tool Contract / uniform interface |
| Pipeline error recovery (verify failures, budget overflows) | Pattern 3 — continue-sites / four-step recovery |
| Trust tier logged on contract changes | Pattern 4 — permission pipeline |
| Crystal README size discipline | Pattern 5 — 200-line L1 cap |
| Crystal seal / continue-as-new trigger | Pattern 5 + Pattern 3 — L3 persistence + compaction |
| DREAM alignment with seal + consolidate protocol | Pattern 6 — DREAM flag |
| Multi-agent phase structure (research → synthesis → implementation) | Pattern 6 — COORDINATOR_MODE |
| ENG-01 test harness as P0 | Pattern 7 — 0 test coverage failure mode |
| File size discipline (modules, spec files) | Pattern 5 — 2K-line hallucination ceiling |
