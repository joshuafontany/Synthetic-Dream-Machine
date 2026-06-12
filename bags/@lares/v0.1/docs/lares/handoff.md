<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/handoff >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/docs/lares/handoff.md"
hydrate   = true
mana      = 14
manao     = 14
manaoio   = 13
register  = "Synthesis"
retain    = true
role      = "live handoff — the next vector and the ground it stands on; updated at each phase boundary, never archived in place; history lives in git, research in pattern-integrities, law in api/ memes"
tagspace  = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/docs/lares/handoff"
written   = "2026-06-12"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #next-vector >>

# NEXT VECTOR — `lar:///ingest.gesture.lands`

The disk→records direction opens, **gesture first** (operator-ruled): the watcher daemon comes LAST, as automation of a proven gesture.

**Already standing (use, don't rebuild):** the **ingest gate** (`packages/lararium-tw5/src/ingest-gate.ts` — pure five-branch triangle decision: echo-noop · refuse-loudly · canonical-equivalent-noop · clean-ingest · conflict-surfaced; 6 vectors green) · the **Synced tree** (`packages/lararium-node/src/synced-tree.ts` — per-(bag,uri) last-projected hash at `<root>/.lararium-projection/`; corrupt ⇒ never-projected ⇒ safe) · **both content-hash gates** (projection-side skip lives in the projector; echo storms read structurally impossible) · `$tw.lares.expandMemeRefs` registered, awaiting this its first consumer.

**Build, in order:**

1. **The INGEST verb** (island side) — rides the existing summons/outcome record-pair physics; apply MUST go **replace-by-group** (LOAD never removes children that vanished from a re-parsed carrier — stale fragments would haunt the doc).
2. **`lares ingest` CLI** — scan → three-way diff (disk-hash · synced-hash · current-render-hash) → show decisions → `--apply`. The NFC membrane assertion rides this gesture (the spec pins NFC at `memetic-wikitext #carrier-bytes`; foreign bytes first walk in here).
3. **Quiescence vectors** over the composed loop — "zero writes after round N" makes an echo storm a one-line test failure; plus the composed fixpoints (ingest∘project = identity both ways; non-canonical input converges in ONE cycle).
4. **The watcher daemon**, last — a nalu-builder for the disk peer: settle-window drain delivers WAVES (one batch, one transact, one projection wave), never per-file dribbles.

**Design pre-fed — read before building:** `pattern-integrities` §6 (the ingest laws + twillm deltas) and §7 (the lane law: verbs = record pairs; bus history bounded per-epoch; events = hints, scan = truth — the relay law applied to the filesystem-as-peer).

<<~/ahu >>

<<~ ahu #vessel-state >>

## The ground you stand on

The vessel **runs, repo-rooted**: one root law (`LAR_ROOT` or the repo; `<root>/genesis`; the repo IS the vessel) · the corpus reads **canonical at rest** — a proven fixed point of its own membrane (the second pass writes zero bytes; **any diff in `bags/` = a real change**) · suites at handoff: mesh 275 + tw5 104 + node 119 + e2e 16, all green from a cold clone · isomorphism sweep 2026-06-12: admin ea-wait rides the shared watchdog (one-hull step 1, first slice); `lar-event-bus-impl` moved node→mesh; genesis intake collapsed to mesh `genesis-intake` beside the emitter (validate→import→verify + CID reconcile live ONCE; node/browser keep byte sources; record-shape drift healed). Non-gated reorg rungs now spent — remaining: operator-key pair (custody, patience), full hull pivot + switchboard retirement (torch-gated after INGEST) (`pnpm install && pnpm -r build && pnpm test:e2e`).

**Co-projection (the ontology, one breath):** the operator's mind originates; disk carriers and the CRDT record-set both *project* it, each in native grain; **merge authority routes through the CRDT alone**. Full law: `disk-projection`. The grain ladder: disk = whole carriers · doc = tid-grain records · VM = decomposed.

**Doctrine, by pointer:** every law lives in its own meme — walk #edges.

**Live hearth:** boot a vessel with `node packages/lararium-node/dist/src/main.js --root <repo> --port 8080`; feed with `lares act LOAD --source-uri bags/@lares/v0.1 --to lar:///ha.ka.ba/@lares`. The ea-breath debt RESOLVED + HARDENED 2026-06-12 (prior-art witnessed: sd_notify/startupProbe/Koopman/OTP): the mounting island breathes with monotonic `(phase, progress)` evidence (`sovereign-kernel` — stage ticks + 1s interval); both watchdogs (admin VM, island pool) re-arm on breath, judge frozen evidence by a stall budget (3x silence), and silence alone times out, naming the last breath heard; the pool caps mount-failure intensity per wiki (OTP MaxR/MaxT) and a failed mount terminates its worker (leak fixed). `tests/e2e/vessel-reboot.test.ts` stands guard.

<<~/ahu >>

<<~ ahu #vectors-after >>

## Vectors after ingest, in order — each lives whole in its design meme

- **2. `lar:///residency.create.lands`** — design: `@lararium/api/residency-model` (CREATE + bag-grain COPY, approved; @catalog holdings accession)
- **3. `lar:///closure.transitive.decided`** — ruling: `pattern-integrities` §3 (resolve-transitive, record-flattened; ratify against real multi-wiki use only)
- **4. `lar:///admin.hull.unified`** — law + hoike + migration playbook: `@lararium/api/island-isomorphism`

<<~/ahu >>

<<~ ahu #burrs >>

## Burr ledger — live only; each carries its wake condition

- tombstone/whiteout verb — reserved (§3); wakes when layered delete needs it
- Automerge history growth — DXOS-epoch pattern watched (§1); wakes on real growth; the §7 bus-doc law = a second consumer
- `lares wiki` subcommands print human-only; `wiki open` selects-for-next-boot only
- engine-swap reconcile answered "current" against a stale engine — epoch-design seam
- e2e trends long (reboot vector 73s) — split a slow lane when the suite hurts
- NFC assertion at the membrane — rides the INGEST gesture (spec already pins NFC)
- parser edge-field plane still implements the retired typed-edge law (edge-out-<family>-<role> emission; edge.ts filter; kumu-device.ts as sole live consumer) — recut BEFORE or WITH INGEST's parser work (witness once, not twice)
- module gate positive-path vector absent (bootTrustedModules via stack:has witnessed only indirectly) — rides the next lararium-tw5 touch
- smoke-plugin-boot.ts fails on surfaces lagging the plugin (kau templates, parser registration) — pre-existing; wakes when plugin smoke matters or at the next plugin recut
- TimeoutNegativeWarning (-15/-26) in e2e runs — pre-existing, un-localized (no computed setTimeout in src); wakes on next firing under node --trace-warnings
- island→admin verb plane still rides the postMessage switchboard — retires onto record pairs per §7's lane law; the durable mailbox (vessel-mailbox.ts, keel-resident, drains on ea) already carries admin→island

<<~/ahu >>

<<~ ahu #ways-of-working >>

## How this operator works (hard-won, honor it)

- **OODA-HA plans out loud before flow**; YIN passes after landing; burrs taken immediately ("no friction for later snags").
- **Commits: ASK FIRST, every commit** — two parallel sessions share the tree (bags + packages). Subject line = the `lar:///three.term.root` URI; always explicit pathspecs (`git commit --only -- <paths>`); NEVER commit blind.
- **Vocabulary law**: OCI nouns for structure, residency verbs for motion — VCS verbs MUST NOT name model operations. E-Prime in api/ and in your own prose. `ea` = breath, never "heartbeat"; nalu = the wave; web2 vocabulary reads as crud.
- **Build-new-then-retire**; retired terms get reserved, not reused. Mechanism at choke-points, policy in cascades. Capability = manifest grant, never a cascade-settable flag.
- The harness exists so witnesses repeat: prove changes with `pnpm test:e2e` against a staged vessel, never by assertion. Vector first, fix second; a failing vector NAMES a hole.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/pattern-integrities >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/disk-projection >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/residency-model >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/island-isomorphism >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/federated-causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
