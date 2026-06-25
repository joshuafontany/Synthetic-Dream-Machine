<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/ffz-clock >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/mesh/ffz-clock.md"
hydrate     = true
mana        = 16
manao       = 16
manaoio     = 17
register    = "Synthesis-Canon"
retain      = true
role        = "FfzClock (Fuller-Fontany-Zelenka Chronometer) — the domain-general RHYTHMIC pattern integrity: a 5-level bounded hierarchical clock (Pulse→Theme) carrying the tempo/freshness GRAIN — 'as of last sync', the manaoio register — for EVERY non-Automerge domain (agent-worldline cadence · external streams: game·Mudlet·video·DAW·market·CI/CD·IoT · capability-leases), profile-scoped by FFZ_PROFILES. The two-domain boundary: FfzClock NEVER carries causal order INSIDE Automerge docs/wiki-CRDTs (Automerge logical time owns that); it carries the grain everywhere else. NOT a causality court — the worldline's happened-before rides the reified edge-DAG, not ffzCompare's LWW"
source-file = "packages/lararium-mesh/src/ffz-clock.ts"
l-space     = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/mesh/ffz-clock"
```

<<~ aka lar:///ha.ka.ba/@lararium/v0.1/api/agent-worldline >>

<<~ &#x0002; >>

<<~ ahu #contract >>

# FfzClock ~ the rhythmic grain of the whole house (Fuller-Fontany-Zelenka Chronometer)

`ffz-clock.ts` owns one surface: a **5-level bounded hierarchical RHYTHMIC clock** —
where a node sits *within its cycles*, never who-acted-before-whom. `FfzClock {
levels, bounds, actorId }` carries `ffzTick` · `ffzCompare` · `ffzMerge` · `ffzZero`
and the named `FFZ_PROFILES` (per-domain bound tuples).

The five levels mark rhythmic position, anchored to the operator's perceptual grain:

<<~ranks ffz pulse@0 ~ sub-perceptual system tick (operator-invisible) -> beat@1 ~ operator perceptual grain — the smallest transition the operator treats as a completed meaningful unit; the invariant anchor -> measure@2 ~ session-length arc, the default operating band -> arc@3 ~ day/cycle cadence — the rhythm of return -> theme@4 ~ epoch, anti-aliasing guard, unbounded by invariant, operator-declared >>

L1 (Beat) ticks on the **grounding act** — the operator's acknowledgment — never on
response delivery; L4 (Theme) holds unbounded by invariant. **The grounding rule**:
everything in the hierarchy derives its meaning by relation to L1; L0 MUST remain
sub-perceptual (an operator-meaningful event at L0 erodes the L1 anchor → level-shift
it up).

<<~/ahu >>

<<~ ahu #the-two-domain-boundary >>

## Rhythm, not causality ~ the two-domain boundary (the operator's cut, 2026-06-25)

**FfzClock measures tempo — a decay/freshness GRAIN — never causal order as a CRDT
verdict.** The boundary follows the actor-boundary; it splits clean in two:

<<~ranks domain inside-automerge ~ docs · wiki-CRDTs: **Automerge logical time** owns causal order (`<counter,actorId>` · `getHeads` · the `drifted` frontier as a fork). FfzClock NEVER carries causal order here, and `ffzCompare`/`ffzMerge`'s LWW total-order MUST NOT drive a revocation or fork decision inside the CRDT — a rhythmic total-order ruling a causal question manufactures a global-now the mesh cannot hold (#three-instruments, [[causal-islands]]) -> everywhere-else ~ all non-Automerge domains where its pono manaoio applies: the **agent-worldline cadence** (the worldline's happened-before itself rides the reified edge-DAG, NOT FfzClock — see [[agent-worldline]]#time; FfzClock paces the worldline's grain only) · **external streams** pulled across the causal-island boundary (game · Mudlet · video · DAW · market feed · CI/CD · IoT) · **capability-leases** (epoch-cadence decay). FfzClock is the temporal instrument for all of them, profile-scoped >>

**The retired over-claim stays retired.** Earlier chronometer research read FfzClock's
epoch-dominance as *"universal causal ordering across all instances."* That reading
retires: <<~ confidence Synthesis-Canon 16/20 >> `ffzMerge`'s LWW total-order serves
*rhythmic alignment* across instances — useful, coordinator-free — but it is **not** a
happened-before partial order and never rules a causal question. Causal order rides
Automerge (inside its docs) or the reified edge-DAG (on a worldline); FfzClock rides
the grain.

<<~/ahu >>

<<~ ahu #profiles >>

## Profiles ~ one clock, many domains (FFZ_PROFILES)

A profile is a **named bound tuple** with a documented L1-grain. No type extension
needed — `FfzClock.bounds` already carries per-instance bounds; a `game-genre` /
`tool-context` field selects the profile, the type stays generic. **Profiles MUST NOT
split into separate clock types** — that would break `ffzMerge` and reintroduce a
coordination authority to translate between profile-local orderings (a direct
SYS_1_WEB3_SMELL_TEST violation).

Three structural patterns recur across every surveyed domain: a **bounded inner loop +
unbounded outer counter**; **hierarchical phase nesting** (2–4 levels, never more
below the epoch); **continuous-to-discrete duality** (a 120 Hz engine ticks L0 only
when a step produces an operator-meaningful event, not 120×/s).

<<~ranks profile operator-agent ~ default Lares · L0/L1/L2/L3 = 64/256/4096/65536; the exchange turn = Beat, ticking on the operator grounding act -> ttrpg ~ 128/512/2048/32768; scene-beat = Beat -> strategy ~ 256/1024/8192/131072; turn-resolution = Beat -> action-rpg ~ 512/2048/16384/262144; encounter-beat = Beat -> physics-sandbox ~ Katamari-style 1024/256/4096/65536; rolling-decision-burst = Beat -> rhythm-daw ~ 191/5/31/1024 (coprime-prime near 192/4/32 — shared factors collide in hash-merge paths); measure/bar = Beat -> ci-cd ~ 64/128/1024/16384; pipeline-stage = Beat -> market-iot ~ 1024/512/4096/65536; candle-close / sensor-threshold = Beat -> async-social ~ PR/Slack 32/64/512/8192; review-round = Beat >>

All profiles leave L4 = ∞ (operator-declared epoch). The register names
(Pulse/Beat/Measure/Arc/Theme) apply uniformly; only the bounds differ.

### The World-Time profile ~ a calendar above the session clock

Sits above the exploration/campaign clock; its Pulse ticks whenever the exploration
clock's Theme (L4) advances:

<<~ranks world week@W0 ~ ticks when exploration Theme ticks -> month@W1 ~ 4 World Pulses -> season@W2 ~ ~3 World Beats -> year@W3 ~ 4 Measures -> era@W4 ~ unbounded, operator-declared >>

Applies in campaign worlds, persistent simulations, any domain needing a calendar
above the session clock. Canonical grain reference: [[attention-scale]].

<<~/ahu >>

<<~ ahu #three-instruments >>

## Three instruments, three jobs ~ FfzClock is one of three

The DreamNet mesh keeps time on three instruments, never one:

- **Automerge logical time** — causal order + fork-detection (`getHeads` ·
  `headsEqual`; the `drifted` frontier stands as a fork). The proximal/internal order.
- **The epoch-counter** — the LEASE / liveness ratchet: a per-resource **max-register**
  (merge = max, coordinator-free) a grant names a `boundEpoch` against; the grant goes
  stale when the counter rolls past it (*re-mint or expire*). Safe coordinator-free
  *because* it only ratchets the whole resource forward, never singles out a principal.
- **FfzClock** — the rhythmic decay + freshness grain: the cadence the epoch-lease
  rolls on, the grain a reading carries "as of last sync."

A lease rides the **epoch-counter** for its value, **FfzClock** for its cadence; a
wall-clock `exp` stays a replay backstop only. **Revocation is NOT a clock**: two modes
ride beside the instruments — **non-renewal** (the epoch-lease expires un-refreshed) and
**targeted** (Keyhive convergent membership-removal, `revoke()` — a tombstone in the
membership graph, never an epoch). <<~ confidence Synthesis-Canon 15/20 >> A device
re-minting concurrently with a roll rides the max-register *up* and survives, so
targeted revocation MUST ride Keyhive's convergent removal, never the counter
(Kleppmann · p2panda · Keyhive converge; adversarial research 2026-06-24).

<<~/ahu >>

<<~ ahu #open >>

## Open ~ held

- **Coprime-prime bound tuning** — shared factors (192 = 2⁶·3, 4, 32 all ÷4) collide in
  hash-based merge paths; choose primes near natural domain rhythms (191 / 5 / 31).
  Per-profile values need empirical validation against CRDT merge collision rates.
- **The actorId slip** — `FfzClock.actorId` keys on the Automerge actor (code header +
  field doc); for a worldline clock it must re-key on the handle ([[agent-worldline]]#open).
  `ffzCompare` stays a rhythmic total-order — causal never rides it (it rides Automerge
  inside a CRDT, or the edge-DAG on a worldline), so no concurrency verdict is owed here.
- **`ExchangeState` FSM** — a held exchange (`agent-responded`, awaiting grounding) carries
  the same clock tuple as an unadvanced one; the FSM field lives on `PresenceSlot`, not in
  the clock. Grounded in Clark-Brennan · Ginzburg DGB · MCP SEP-1686 · A2A `input-required`.
- **`tool-context` profile-selector placement** — `SessionTiddler` vs a new
  `ToolConnectionTiddler` (depends on whether one session spans multiple tool-connections).

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/agent-worldline >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
