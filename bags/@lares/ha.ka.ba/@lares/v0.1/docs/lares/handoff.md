<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/handoff >>
```toml iam
cacheable = true
file-path = "bags/@lares/ha.ka.ba/@lares/v0.1/docs/lares/handoff.md"
hydrate   = true
mana      = 14
manao     = 14
manaoio   = 13
register  = "Synthesis"
retain    = true
role      = "live handoff — the next vector and the ground it stands on; updated at each phase boundary, never archived in place; history lives in git, research in pattern-integrities, law in api/ memes"
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/docs/lares/handoff"
written   = "2026-06-12"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #next-vector >>

# NEXT VECTOR — `lar:///ingest.gesture.lands`

The disk→records direction opens, **gesture first** (operator-ruled): the watcher daemon comes LAST, as automation of a proven gesture.

**Already standing (use, don't rebuild):** the **ingest gate** (`packages/lararium-tw5/src/ingest-gate.ts` — pure five-branch triangle decision: echo-noop · refuse-loudly · canonical-equivalent-noop · clean-ingest · conflict-surfaced; ⚠ **2/6 vectors RED as of 2026-06-14** — clean-ingest + conflict both return `noop`; see #burrs) · the **Synced tree** (`packages/lararium-node/src/synced-tree.ts` — per-(bag,uri) last-projected hash at `<root>/.lararium-projection/`; corrupt ⇒ never-projected ⇒ safe) · **both content-hash gates** (projection-side skip lives in the projector; echo storms read structurally impossible) · `$tw.lares.expandMemeRefs` registered, awaiting this its first consumer.

**Build, in order:**

1. **The INGEST verb** — DONE 2026-06-12: §6 gate composed with replace-by-group apply (uri#fragment + uri/path grains); carriers travel with diskHash+syncedHash, island computes only currentRenderHash; noop/refuse/conflict apply nothing. ⚠ **2/4 vectors RED as of 2026-06-14** (`ingest-verb.test.ts` — clean-edit-with-vanished-child + both-moved-conflict both return `noop`); the vectors stage against the LIVE boot meme, so the boot's recent churn (l-prime · holds · mutual-hold) may have collided with the fixtures — gate-regression vs fixture-drift UNCONFIRMED; see #burrs.
2. **`lares ingest` CLI** — DONE 2026-06-12 (unit-witnessed; live staged witness rides build 3): scan → loci reverse-derivation (`bagsFileToUri`) → two-leg diff preview → `--apply` sends NEW+CHANGED with hashes; act surface guards INGEST toward the gesture. NFC membrane assertion still PENDING — rides this gesture (spec pins NFC at `memetic-wikitext #carrier-bytes`).
3. **Quiescence vectors** — DONE 2026-06-12 (`tests/e2e/ingest-quiescence.test.ts`, 4 green): project∘ingest = identity · one-cycle convergence · zero-writes-after-N · the NFC membrane assertion live at the gesture (non-NFC refuses loudly, never enters). Found+fixed en route: the Synced-tree instance-root derivation lagged the siting ruling (up-three → up-two).
4. **The watcher daemon**, last — a nalu-builder for the disk peer: settle-window drain delivers WAVES (one batch, one transact, one projection wave), never per-file dribbles. **First cut ENACTED + COMMITTED 2026-06-12** (`e38bbd22 watcher.floor.suspends` — `ingest-core.ts` + `commands/watch.ts` are in the tree, NOT uncommitted; the talk-story below stays SUSPENDED, operator never steered it):
   - **Cut A — `packages/lares-cli/src/ingest-core.ts`**: the disk→records gesture factored out of `cmdIngest` (`listCarriers` · `scanFiles` · `scanSource` · `candidatesOf` · `submitIngestOn`). `cmdIngest` now consumes it — the watcher automates the proven path, never re-implements it. Typecheck green; behaviour unchanged.
   - **Cut B — `packages/lares-cli/src/commands/watch.ts`** (`lares watch --source <dir> --to <bag> [--apply] [--port N] [--debounce ms]`, registered in `bin/lares.ts`): built on Node's built-in **`fs.watch` recursive** (NOT chokidar — it satisfies §6's "settle = hash confirms, never a timer" law with no dep + no shared-lockfile contention). Events → a serialized debounce drain seat (the `recipe-watch` busy/rerun kick, disk-side) → one `scanFiles` → one INGEST wave. Preview by default; `--apply` holds ONE vessel across every wave of its life. Carries a **Watchman-style cookie self-test at boot** (writes a cookie, awaits its own event; a dead backend — WSL2 `/mnt` = no inotify — fails HERE, loudly). **Smoke proved**: cookie passes on the repo's ext4 ("backend live"); two rapid edits + a new file coalesced into a SINGLE wave with correct loci derivation (not per-file dribbles). No formal e2e vector yet — that was deferred into the talk-story below.
5. **The wire compiler** MAY ride this vector's membrane organs (ruled 2026-06-12, `wire #authoring`): anchored body pranala → wire records at `<parent>/wires/<anchor>`; shares replace-by-group + three-way diff; `edgesFromMemeAst` = the front half, standing.

**Design pre-fed — read before building:** `pattern-integrities` §6 (the ingest laws + twillm deltas) and §7 (the lane law: verbs = record pairs; bus history bounded per-epoch; events = hints, scan = truth — the relay law applied to the filesystem-as-peer).

<<~/ahu >>

<<~ ahu #watcher-talk-story >>

## Talk-story to the next instance — the file-watcher seams

E ka hale, aloha. The watcher's first cut runs (build 4 above) and the operator rebooted the session before we held the floor on its design. The cuts A+B sit uncommitted in the working tree — read `watch.ts` first, then weigh these five open questions with the operator before you commit or extend. None settled; the operator named deletions as the heaviest. Each carries the ground it stands on.

1. **Deletion → tombstone (the heaviest).** Today `watch.ts` quarantines and logs deletes, never applies them — `scanFiles` simply skips an unreadable path, so a stray delete self-heals but tombstones nothing. A real delete SHOULD tombstone the record; a transient one MUST NOT (a `git checkout` floods unlinks — TidGi's battle scar, `pattern-integrities` §6 deletion grace window). Open: what confirms a delete (a grace window? a stat re-check?), and does the INGEST verb's existing `tombstoned` path carry it, or does the watcher need a separate REMOVE wave?
2. **The "never a timer" settle.** `watch.ts` uses a trailing debounce PLUS the scan's hash gate (a no-op save drops at the gate). §6's stricter law adds **stat-stable** — two steady reads of size/mtime before a path counts settled. Open: does debounce+hash suffice (the smoke says yes for fast edits), or do we add the stat-stability check for large/slow writes?
3. **fs.watch vs chokidar, decided for real.** Built-in `fs.watch` carried preview + coalescing + the cookie test cleanly, no dep. But rename-identity (§6 WE-MUST-DO-BETTER: "re-link by content-hash between a fresh add and a pending delete") and richer per-event truth may eventually want chokidar's `awaitWriteFinish`. Open: hold the no-dep line, or concede chokidar WHEN deletion/rename lands? (Ties to Q1.)
4. **The full-scan backstop cadence.** The cookie test catches a backend dead *at boot*; a backend can die mid-life silently (Syncthing keeps a rescan even with the watcher on — events are hints, the scan is truth). Open: a live rescan interval, or boot-test-only plus a manual `lares ingest` sweep as the standing truth?
5. **One watcher, N bags?** `lares watch` targets one `--to` bag; `nalu-engine` coalesces across N bags into one island-side transact. Open: mirror that disk-side (one watcher, N targets, still one wave per settle), or keep one-bag-per-watcher?

When the floor closes, fold the rulings back into build 4 above, then the formal e2e vector (the deferred Cut C): rapid edits coalesce to one wave · a confirmed delete tombstones · a transient delete does not · the cookie test fails closed on a dead backend.

The floor opened and SUSPENDED — the operator rebooted before steering it. Its telling, kept whole for you to resume:

```
<<~ talk-story #watcher-seams ground:"build 4 first cut (ingest-core + lares watch on fs.watch), uncommitted; five seams open; operator named deletions heaviest" >>
bearings: WHERE WE STAND — the watcher runs safe in preview; cookie self-test
  live on ext4; rapid edits coalesce to one wave; --apply holds one vessel ·
  WHERE WE WANT TO GO — a wave-faithful watcher that handles deletions WITHOUT
  drift, committed once the seams settle · HOW WE GET THERE — hold this floor
  with the operator (deletions first), fold rulings into build 4, then Cut C,
  then commit.
telling: what STANDS — the gesture automates the proven path, not a copy; the
  no-op save drops at the hash gate; the dead backend fails loud at boot. what
  GOES MISSING — a delete tombstones nothing yet; settle leans on a timer where
  §6 wants stat-stable; rename-identity unhandled. the house reads it five ways:
- Map-Wisp (Scryer): the deletion seam is where identity lives or dies — a
  rename is unlink+add, and only a content-hash re-link keeps the record's
  change-id; the forward failure mode is a `git checkout` flood tombstoning live
  records. Q1 and Q3 are ONE question wearing two coats.
- Breach-Watch (Triage): only deletions burn. Preview is safe; --apply is safe
  until a delete can tombstone wrongly. Ship the rest, gate the deletes.
- Stranger: does fs.watch hold as the frame, or does conceding chokidar NOW —
  before deletion lands — save a rewrite later? The no-dep win may cost twice.
- Mischief-Muse: the cookie test is the gem. Lean all the way into "events are
  hints, scan is truth" — maybe the watcher is ALWAYS a backstop scan that
  events merely wake early. Then Q2 and Q4 dissolve into one rescan seat.
- Liminal: none of the five must close this waking. The open hand is honest.
exit -> suspended: OODA-HA(0φ:operator-rebooted-before-steering) — the floor
  reopens at the next waking, the telling above its seed; no ruling locked.
<<~/talk-story >>
```

<<~/ahu >>

<<~ ahu #vessel-state >>

## The ground you stand on

The vessel **runs, repo-rooted**: one root law (`LAR_ROOT` or the repo; `<root>/genesis`; the repo IS the vessel) · the corpus reads **canonical at rest** — a proven fixed point of its own membrane (the second pass writes zero bytes; **any diff in `bags/` = a real change**) · suites (re-run 2026-06-14, `pnpm test:fresh`): mesh 275✓ · tw5 111/113 (2 RED) · node 122/124 (2 RED) · browser 13✓ — the 4 RED all in the INGEST path (#burrs); e2e NOT re-run this pass (was 16 green) · isomorphism sweep 2026-06-12: admin ea-wait rides the shared watchdog (one-hull step 1, first slice); `lar-event-bus-impl` moved node→mesh; genesis intake collapsed to mesh `genesis-intake` beside the emitter (validate→import→verify + CID reconcile live ONCE; node/browser keep byte sources; record-shape drift healed). Non-gated reorg rungs now spent — remaining: operator-key pair (custody, patience), full hull pivot + switchboard retirement (torch-gated after INGEST) (`pnpm install && pnpm -r build && pnpm test:e2e`).

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

- ⚠ **INGEST tests RED (2026-06-14, BURNING)** — 4 vectors fail: `lararium-tw5/tests/ingest-gate.test.ts` (clean-content-edit→ingest, both-moved→conflict) + `lararium-node/tests/ingest-verb.test.ts` (vanished-child clean-edit, both-moved conflict). All return `noop` where they expect `ingest`/`conflict`; the verb test shows the edit never applies (output = unmodified boot). The vectors stage against the LIVE boot meme, which churned since they were written (l-prime rename b597cdfa · holds adoption 5e691817 · mutual-hold 36274946). WAKE: root-cause = gate-noop-detection regression vs fixture-drift-against-live-boot; decide fix-gate vs re-stage-fixtures. Until then the ingest gesture does NOT read green.
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
- island→admin verb plane still rides the postMessage switchboard — retires onto record pairs per §7's lane law; the durable mailbox (vessel-mailbox.ts, keel-resident, drains on ea) already carries admin→island. ORDERING CRUCIBLE-PASSED 2026-06-12 (moʻolelo in hoike below): LOAD stands as the FIRST witness of verb-pair physics; INGEST brings the SECOND witness + the membrane forge (three-way diff, replace-by-group, quiescence, NFC); the wire compiler rides INGEST's organs; then residency (vector 2) → closure (3); the switchboard retires on two-witness verb-pair INTEGRITY, the platform-free handlers (verb-dispatcher/summons/vm, action-handler, wiki-compose/draft/mint) migrate in-VM during that recut (one witness not two), hull steps 2–4 follow; ingest-gate packing decided at the island-verb build

<<~ hoike #ingest-ordering held:"a plan of this weight passes the work-crucible floor before it binds (operator) — CONFIRMED BY DEMONSTRATION at the floor, 2026-06-12" >>
q: does a flow-ruled sequencing chain bind, or must the plan pass the crucible discussion first?
<<~ kue voice:"the house (Gatekeeper)" key:"the convened crucible floor produces an ordering that differs from the flow-ruled chain — TURNED against the kue: the floor found the residency-vector omission and the overstated forge-claim in one reading" >>
the chain composes only standing rulings — the torch's NEXT VECTOR, §7's lane law, the
one-witness economy — so the crucible would re-derive what already stands; flow preserved
momentum the floor would spend on ceremony.
<<~/kue >>
<<~ moolelo held:"the amended chain stands (operator): LOAD = first witness · INGEST = second witness + membrane forge · residency restored at vector 2 · switchboard gates on two-witness integrity · verb-plane rides its recut" >>
the kue fell by the house's own floor — flow had sailed past a torch vector and rested a
true order on a false load-bearing claim; the crucible earned its seat by demonstration.
<<~/moolelo >>
re-entry: closed — the floor convened and the held review condition met; the chain re-opens only at a torch boundary
<<~/hoike >>

<<~/ahu >>

<<~ ahu #ways-of-working >>

## How this operator works (hard-won, honor it)

- **OODA-HA plans out loud before flow**; YIN passes after landing; burrs taken immediately ("no friction for later snags").
- **Commits: ASK FIRST, every commit** — two parallel sessions share the tree (bags + packages). Subject line = the `lar:///three.term.root` URI; always explicit pathspecs (`git commit --only -- <paths>`); NEVER commit blind.
- **Vocabulary law**: OCI nouns for structure, residency verbs for motion — VCS verbs MUST NOT name model operations. L-Prime in api/ and in your own prose. `ea` = breath, never "heartbeat"; nalu = the wave; web2 vocabulary reads as crud.
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
