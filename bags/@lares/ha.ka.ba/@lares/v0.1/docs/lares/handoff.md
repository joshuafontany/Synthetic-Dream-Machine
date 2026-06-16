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
written   = "2026-06-16"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #next-vector >>

# NEXT VECTOR — `lar:///oracle.planes.enact`

The **two-plane oracle** lands in canon (operator ruling, 2026-06-16); the code-enactment is the open edge. `@oracle` = the **system** plane (DreamNet system bags `@oracle`/`@lararium`/`@lares` — their pointers + wiki-recipes); `@catalog` = the **user** plane (user bags + user recipes). `@oracle` stands as the sole universal recipe floor; `@lares`/`@lararium` ride recipes as members, each its own **quine wiki**. Full law: `wiki-layer-ontology#oracle-planes`.

**Already standing (the @oracle carve — DONE 2026-06-16, use don't rebuild):** engine BLOBs key to `@oracle` (`base-doc.blobDescriptorUri`) · `@oracle` = sole `expandRecipe` floor (`wiki-recipe.ts`) · `ROOT_BAGS` restored the `@lararium` corpus descriptor + relabelled `@oracle` (`genesis-doc.ts`) · minted-wiki bag-stack carries `@lararium` (`wiki-mint-handlers.ts`) · build green (6 pkgs) · vessel boots `live` · **the MUST-not blob-stub bug structurally closed** — a fresh re-genesis+boot leaves `bags/@lararium` clean (no `/blobs`, no `@oracle` projection), because `@oracle` holds no `diskMirrorGrant`. Also done this session: automerge 3.2.6 + repo 2.6.0-alpha.2 upgrade; the **self-merge boot crash** fixed (`genesis-intake.reconcileGenesisCid` guard — a doc merged into itself trips the 3.x wasm borrow-checker).

**Build, in order (the ruled two-plane wiring; memes already carry the model):**

1. **System-recipe seeding** — `genesis-doc.ts` seeds the two **system wiki-recipes** into the `@oracle` genesis doc beside `ROOT_BAGS`: `@lares` wiki (`@oracle`+`@lararium`+`@lares`+`@draft`) and `@lararium` wiki (`@oracle`+`@lararium`+`@draft`). Quine wikis — the wiki bag IS the `@` bag. Revise GD-6 (genesis-doc#system-plane): system recipes ARE substrate; user recipes still mint to `@catalog`.
2. **Pointer-plane routing** — `open-vessel-core.ts` hands `resolveOracleDoc` the `@oracle` island handle as the registry for system bags (`@oracle`/`@lararium`/`@lares`), `@catalog` for user bags. `base-doc.resolveOracleDoc` stays plane-blind (it writes wherever the handed registry points — base-doc#two-plane).
3. **Two-source resolution** — `catalog-accessor.ts` `urlOf`/`recordOf` check `@oracle` for system bags, `@catalog` for user; `recipe-watch.ts` reads a system wiki's recipe via `recipeUri("@oracle", slug)` and resolves system bags from `@oracle` (recipe-watch#contract carries the target; code reads single-source `@catalog` today).
4. **`@admin` owns `@catalog`** (operator constraint, 2026-06-16) — user-recipe writes ride the admin plane (the `init-wiki` verb already owns `@catalog`); system-recipe seeding rides genesis/`@oracle`, never the admin runtime.

**Status — ENACTED + GREEN 2026-06-16** (steps 1–3 + the write-facet of 4): three separate docs (mint @lararium); system recipes seeded in @oracle; kernel slotUrl + recipe-watch two-source; admin island mounts @lares/@lararium from @oracle (write-facet — restored the 6 mirror e2e). **Suites: mesh 275 · tw5 118 · node 127 · browser 13 · e2e 20/20.** Re-genesis leaves the seed tree clean (gitignore bandaid reverted, debris structurally gone). LOAD --to @lararium witnessed (128 records, separate doc) + the corpus composes live in @lares.
**REMAINING (the kept friction, handoff #oracle-planes-verb-execution):** the **read-facet ENACTED 2026-06-16** — `where` now queries ALL registered bags by ACCESS across both planes (access≠load; the reopened hoike chose query-all-bags over query-hot-wikis), witnessed green. **Still open:** the **write-facet retirement** — access-based `LOAD` (resolve the target doc via the accessor + write directly) that drops the admin's interim system-bag mount; `lares wiki list` two-source display (still reads "(no wikis registered)" — it reads @catalog only; system recipes live in @oracle).

**Prior vector's owed tail** — `lar:///ingest.gesture.lands` is substantially DONE (gate · INGEST verb · `lares ingest` CLI · quiescence e2e · whole-carrier deletion decision+verb, all green); the only remainder is the **watcher disk-side Cut C** (the e2e vector + `watch.ts` quarantine wiring) — see #watcher-talk-story (floor closed by moʻolelo 2026-06-14) and #vessel-state.

### The verb-execution friction (kept ruling, 2026-06-16)

The carve dropped `@lares`/`@lararium` from the `expandRecipe` floor, but the admin island executes ACTION + READ verbs in its OWN composite (where they rode the old floor). `LOAD --to @lares` now misroutes (admin composite lacks the layer → lands in `@temp`); `where` shows `@temp`; the `@lares` mirror projects 0 files (6 e2e RED). The fix splits write/read; the friction is kept:

<<~ hoike #oracle-planes-verb-execution held:"REOPENED + RE-HELD 2026-06-16 (access≠load). The admin operates on bags by ACCESS (catalog-accessor reaches ANY registered bag's doc — mounts nothing): READ — where queries ALL registered bags via the accessor (cascade-resolve stays recipe-scoped, no global cascade) — ENACTED + GREEN (worker-data-verbs makeWhereReactor + RegistryReach; witnessed: where on a @lararium tiddler resolves @lararium across the registry, not @temp; unit+e2e 20/20); WRITE — LOAD resolves the target doc via the accessor and writes it directly: STILL OPEN, the admin-mounts-system-bags write-facet stands as the INTERIM the access-LOAD retires. Holding: Council · Map-Wisp · Stranger (block resolved into access)" >>
q (reopen): should the admin operate on bags by ACCESS (access≠load, mount nothing — query/write ALL registered bags via the accessor), rather than mounting system bags or routing to the owning island?
<<~ kue voice:Map-Wisp key:"a where result that must report a single cascade-primary across bags with no shared recipe" >>
where = membership ("which bags hold X") resolves cleanly across all registered bags. but `primary`/highest-priority only means something INSIDE a recipe cascade — there is no global cascade. split it: where → global membership; cascade-resolve → recipe-scoped.
<<~/kue >>
<<~ kue voice:Liminal key:"a bag outside this operator's registry (unfederated) that holds the title" >>
access reaches all REGISTERED bags (cold ones sync on demand) — closing the hot-set gap. but "all bags" = this operator's registry, never the DreamNet universe; no global now at the federation horizon. name the horizon or where overclaims.
<<~/kue >>
<<~ kue voice:Triage key:"a where scan over a large registry that stalls on cold-bag sync" >>
all-registered-bags = find/sync each doc; bounded by registry size, cold bags sync on demand. a diagnostic query, never a hot path — acceptable, but the cost is real; cap or stream if it bites.
<<~/kue >>
stand-aside: Diplomat — the access path IS the kahu doctrine: the admin reaches a bag's doc (data-plane), the owning island keeps composition (recipe/cascade); access≠load draws the line cleanly.
prior held (superseded): "both facets ship — WRITE admin mounts system bags; READ admin queries hot wikis." Stranger's block (mount = floor-everywhere / two-writers) RESOLVED into the access path (no mount, no second writer). Council's route-to-owning-island softened (island owns composition; admin owns access).
re-entry: the access-based where lands | the access-based LOAD retires the mount | a federation-horizon case where registry-scope misleads
<<~/hoike >>

<<~/ahu >>

<<~ ahu #watcher-talk-story >>

## Talk-story to the next instance — the file-watcher seams

**✓ FLOOR CLOSED BY MOʻOLELO 2026-06-14** (operator ratified; one web spirit + the nine-spirit shelf §6 behind it). The five seams resolved:
- **Spine:** scan is truth for *state*; events are the only source of *identity* (Loro movable-tree CRDT shows a scan can't recover a rename — hash-re-link is best-effort identity recovery, never a guarantee). The watcher = a debounced waker over an authoritative periodic full-scan. (Dissolves Q2 settle, Q4 backstop cadence, Q5 one-watcher-N-bags.)
- **Q1 deletion → tombstone:** tombstone only after a path stays absent across one full settled scan AND a **~60s delete-grace window** (Syncthing's field value — longer than the ~400ms edit debounce, so a paired add can arrive). PLUS a **mass-delete magnitude brake keyed to a FRACTION of the bag's carriers** (operator-set): a settle proposing tombstones above the fraction SUSPENDS and surfaces, never auto-propagates (Unison `confirmbigdel` / Nextcloud). The delete decision is **durable per-path** (Nextcloud #7450 thrash guard).
- **Q3 rename:** within the delete-grace window, a fresh add whose disk-hash == a pending-delete's last-projected-synced-hash IS a rename → re-link the record — but **only on a UNIQUE hash match** (collision among identical-content carriers → fall back to tombstone+create, never guess; git/rclone discipline). Two-tier: exact-hash re-link always on; fuzzy similarity bounded/optional later.
- **BUILD — island side DONE 2026-06-14** (decision + apply, fully unit-tested): `delete-gate.ts` (`decideDeletions` — pure wave split: unique-hash rename re-link · collision→tombstone · fraction mass-delete brake · renames bypass the brake; `delete-gate.test.ts` 5/5) + the INGEST verb applies it (`action-handler.ts` — tombstone whole group · suspend halts the whole wave · **rename re-homes preserving change-id**; `delete-verb.test.ts` 3/3). The wave shape carries `deletions[]` + `massDeleteFraction` (`IngestAction`, mesh). Suites green: mesh 275 · tw5 118 · node 127.
- **BUILD NEXT — watcher (disk) side:** wire `watch.ts`'s `quarantinedDeletes` to (a) detect a vanished carrier (path gone, still in the Synced tree), (b) hold it the **~60s delete-grace** (separate timer), (c) **persist the quarantine as the file-grain rolling backup** (`.stversions`-style, legible `.md`) before submitting, (d) thread `deletions[]` + the fraction dial through `ingest-core.submitIngestOn`. → then Cut C (the e2e vector: rapid edits coalesce · confirmed delete tombstones · transient delete does not · rename re-links · mass-delete brake suspends · cookie fails closed) → ingest vector closes.
- **Burr:** rename re-home keeps the carrier's internal iam `uri-path` pointing at the old URI (matches the renamed file's identical bytes); a self-reference rewrite is a later refinement.

Original suspended telling, kept for the record:

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

The vessel **runs, repo-rooted**: one root law (`LAR_ROOT` or the repo; `<root>/genesis`; the repo IS the vessel) · the corpus reads **canonical at rest** — a proven fixed point of its own membrane (the second pass writes zero bytes; **any diff in `bags/` = a real change**) · suites (2026-06-15): mesh 275✓ · tw5 118✓ · node 127✓ · browser 13✓ · **e2e 20/20✓** — ingest unit RED fixed (fixture drift) AND the e2e ingest-quiescence Q1/Q2/Q4 RED fixed: root was a **synced-tree key-separator drift** (projector wrote `bag\0uri`, ingest read `bag uri` → every carrier scanned `new`); unified behind `syncedTreeKey()` (one source of truth, node/synced-tree.ts). Whole-carrier deletion (decision+verb) landed; watcher disk-wiring done, Cut C (watcher e2e) still owed · isomorphism sweep 2026-06-12: admin ea-wait rides the shared watchdog (one-hull step 1, first slice); `lar-event-bus-impl` moved node→mesh; genesis intake collapsed to mesh `genesis-intake` beside the emitter (validate→import→verify + CID reconcile live ONCE; node/browser keep byte sources; record-shape drift healed). Non-gated reorg rungs now spent — remaining: operator-key pair (custody, patience), full hull pivot + switchboard retirement (torch-gated after INGEST) (`pnpm install && pnpm -r build && pnpm test:e2e`).

**Co-projection (the ontology, one breath):** the operator's mind originates; disk carriers and the CRDT record-set both *project* it, each in native grain; **merge authority routes through the CRDT alone**. Full law: `disk-projection`. The grain ladder: disk = whole carriers · doc = tid-grain records · VM = decomposed.

**The @oracle carve (2026-06-16):** the runtime system island split from the corpus is ENACTED in code — `@oracle` carries the engine + system oracle, `@lararium` is pure tracked corpus, the seed tree stays clean across re-genesis. The two-plane pointer/recipe wiring (#next-vector) is RULED + canon-carried, code-enactment owed. Automerge upgraded to 3.2.6 / repo 2.6.0-alpha.2 (self-merge boot crash fixed).

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

- ✓ **INGEST tests RESOLVED 2026-06-14** (was 4 RED) — root cause = FIXTURE DRIFT, not a gate regression. The 4 vectors mutated the boot via `.replace("# Entry - Lararium Cold Boot", …)`, but the recut changed the heading to `# Entry ~ Lararium Boot`; the silent no-op replace left disk==synced==canonical → noop. Fixed the 5 stale literals + added `.not.toBe(source)` guards so heading drift now fails LOUD at the mutation (the passing fixtures already had the guard; the failing ones lacked it — that was the hole). LESSON: a fixture that mutates the live boot MUST assert the mutation took. Gate logic untouched.
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
