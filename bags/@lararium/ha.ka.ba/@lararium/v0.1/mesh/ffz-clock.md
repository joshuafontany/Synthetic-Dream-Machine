<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/ffz-clock >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/mesh/ffz-clock.md"
mana        = 9
register    = "Synthesis"
retain      = true
role        = "self-documentation: FfzClock — the rhythmic decay/freshness GRAIN (Pulse→Theme), NOT a causal clock; causal order rides Automerge, revocation authority rides the Keyhive epoch"
source-file = "packages/lararium-mesh/src/ffz-clock.ts"
l-space     = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/mesh/ffz-clock"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

# FfzClock ~ the rhythmic grain (Fuller-Fontany-Zelenka Chronometer)

`ffz-clock.ts` owns one surface: a **5-level bounded hierarchical RHYTHMIC clock** — where a node sits *within its cycles*, never who-acted-before-whom. `FfzClock { levels, bounds, actorId }` carries `ffzTick` · `ffzCompare` · `ffzMerge` · `ffzZero` and the named `FFZ_PROFILES` (per-domain bound tuples).

The five levels mark rhythmic position, anchored to the operator's grain:

<<~ranks ffz pulse@0 ~ sub-perceptual system tick -> beat@1 ~ operator perceptual grain, the invariant anchor -> measure@2 ~ session-length arc -> arc@3 ~ day/cycle cadence -> theme@4 ~ epoch, anti-aliasing guard, unbounded >>

L1 (Beat) ticks on the **grounding act** — the operator's acknowledgment — never on response delivery; L4 (Theme) holds unbounded by invariant, declared by the operator.

<<~/ahu >>

<<~ ahu #rhythm-not-causality >>

## Rhythm, not causality ~ the pono boundary

**FfzClock measures tempo — a decay/freshness GRAIN — never causal order.** It names the cadence a capability-lease decays over and the grain a reading carries ("as of last sync"); it never names who-acted-first. <<~ confidence Synthesis-Canon 15/20 >> Causal ordering rides **Automerge logical time** — the `<counter, actorId>` OpId, `getHeads` / `headsEqual`, a partitioned frontier (`drifted`) standing as a fork — never FfzClock.

**The retired over-claim.** Earlier chronometer research read FfzClock's epoch-dominance as *"universal causal ordering."* That reading retires: the code hands causal order to Automerge, and `ffzCompare` / `ffzMerge` impose an LWW total-order that **MUST NOT** drive a revocation or fork decision — a rhythmic total-order ruling a causal question manufactures a global-now the mesh cannot hold (#causal-islands).

<<~/ahu >>

<<~ ahu #three-clocks >>

## Three clocks, three jobs

The DreamNet mesh keeps time on three instruments, never one — and FfzClock is one of the three:

- **Automerge logical time** — carries causal order + fork-detection (`getHeads` · `headsEqual`; a partitioned frontier `drifted` stands as a fork).
- **The epoch-counter** — carries the LEASE / liveness ratchet: a per-resource **max-register** (merge = max, coordinator-free) that a grant names a `boundEpoch` against; the grant goes stale when the counter rolls past it (*re-mint or expire*). Safe without a coordinator *because* it only ever ratchets the whole resource forward — never to single out one principal.
- **FfzClock** — carries the rhythmic decay + freshness grain: the cadence the epoch-lease rolls on, the grain a reading carries "as of last sync".

A lease rides the **epoch-counter** for its value and **FfzClock** for its cadence; a wall-clock `exp` stays a replay backstop only, never the source of truth.

**Revocation is NOT a clock — and the epoch is a lease, not a revoker.** Two modes ride beside the instruments: **non-renewal** (the epoch-lease above — a grant expires when un-refreshed) and **targeted** (Keyhive **convergent membership-removal**, `revoke()` — a tombstone in the membership graph, never an epoch). <<~ confidence Synthesis-Canon 15/20 >> A device that re-mints concurrently with a roll rides the max-register *up* and survives, so **targeted** revocation MUST ride Keyhive's convergent removal, never the counter (Kleppmann · p2panda · Keyhive converge on this; adversarial research 2026-06-24).

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
