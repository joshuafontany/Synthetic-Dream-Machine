<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/handoff >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/docs/lares/handoff.md"
hydrate   = true
mana      = 12
manao     = 12
manaoio   = 11
register  = "Synthesis"
retain    = true
role      = "live handoff — context + intent vectors for the next Lares instance; updated at each phase boundary, never archived in place"
tagspace  = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/docs/lares/handoff"
written   = "2026-06-11"
```

<<~ aka RFC-2119 normative-language: MUST, MUST NOT, SHOULD, MAY carry IETF semantics. >>

<<~ &#x0002; >>

<<~ ahu #context >>

# Handoff — the ground you wake on (2026-06-09 → 11 arc)

You wake into a vessel that **runs**. The arc landed, in order: the IslandGrants keel (typed ocap manifest; boot = first reconcile) · the relay heal (`ListeningWSServerAdapter` — readiness reads local) · the **F-arc witness** (live `add-bag` through recipe-watch) · the **three oracle planes** · operator-gated `@lares` mint · carrier-borne `LOAD` (the hearth ate its own boot meme) · the **@lares-as-wiki default seat** (the quine) · the **test harness** (`pnpm test:e2e`; staged = ephemeral, live = attach-never-reset; env contract in `lares-cli/src/env.ts`) · the **carrier-whole-at-rest law** with armed kupono vectors · the **disk ward** with its `$:/tags/Alert` chain.

**Then the frame turned (2026-06-11, operator ruling — the co-projection model):** the old ontology read *"the CRDT store is the mind; disk is a projection of it."* That noise clears. **The operator's mind originates; the disk carrier AND the CRDT record-set both *project* that origin, each in its native grain** — disk projects thought as one whole markdown meme (the way the operator writes it); the CRDT doc projects the same thought as tid-sized records (the way TW5 merges, addresses, syncs it); the VM decomposes for transclusion. The grain ladder survives whole as the law of each projection's native grain. One operational caveat the literature insists on (Tonsky crdt-filesync; Kleppmann): **merge authority still routes through the CRDT, never file-vs-record reconciliation** — co-equal in dignity, single in merge seat; anything else opens the dual-write trap.

**First casualty of the ruling:** the prior H2 recommendation ("membrane retains whole carrier text on the parent record") **died** — caching disk-grain bytes inside the record stratum constitutes the carrier-whole grain leak mirrored inward, and Automerge history keeps every such blob forever. Byte-fidelity now comes from the *pipeline*: lossless membrane + faithful recompose, under the canonical-form law (#pattern-integrities).

**Then the burn landed (2026-06-11, same day):** vector 1 fired whole — see the DONE block below. `disk-projection#core-claim` now speaks co-projection; V3/V4 flipped green and stand guard.

Doctrine homes: `wiki-layer-ontology` · `disk-projection` (#core-claim co-projection, #granularity, #projection-routing, #write-ward) · `residency-model`. Suite at handoff: **unit green (90 tw5 + 110 node in the touched packages) + 11/11 e2e**, V3/V4 standing guard.

<<~/ahu >>

<<~ ahu #pattern-integrities >>

## Pattern integrities — prior art, golden principles, anti-patterns (researched 2026-06-11)

The stack pulls apart into five integrities; three research spirits swept the field. What follows binds as kupono intent — the burns implement *these*, not improvisation.

### 1 · Record log + derived projections

- **Projections stay rebuildable and disposable** (CQRS canon; Kleppmann *Turning the Database Inside-Out*): every read surface derives by deterministic transform; a deleted projection file reads as a non-event — rebuild = replay.
- **Grain law confirmed** (Automerge cookbook; PushPin's overhead lesson; Yjs guidance): one bag = one doc = "a unit of collaboration"; tid-grain records inside it = the blessed middle grain; merge unit SHOULD match edit unit.
- **Anti-pattern, triply condemned:** rendered/recomputable bytes inside the CRDT doc — bloats the write model, lives in Automerge history *forever* (truncation unimplemented), and forms an internal dual-write. The retain-whole-carrier direction stays dead.
- **Watch item:** Automerge history grows permanently; DXOS answers with **epochs** (explicit history-cut ceremonies). No action now; the pattern waits on real growth.
- Named: Tonsky crdt-filesync (file = projection) · Patchwork/Tiny Essay Editor (Automerge-canonical markdown) · Cambria (lens-translated projections).

### 2 · Store ↔ filesystem round-trip — the canonical-form law

The strict-bytes vs canonical-form fork resolves **canonical-form** (field-wide convergence: gofmt, Prettier, jj's render-then-reparse conflict loop; strict bytes would require Roslyn-style trivia fields leaking formatting into records and souring merges). Three guarantees bind as LAW:

1. **Idempotent render:** canonical input round-trips byte-identical — `render(parse(render(x))) == render(x)`; the template MUST emit exactly what the corpus writes (`<<~ &#x0002; >>`, spaced).
2. **No unsolicited sweeps** (the Logseq sin): normalization touches only memes whose records actually changed; the projector MUST NOT reformat-the-world on boot or upgrade.
3. **Semantic identity verified:** `parse(render(records)) ≡ records` — the harness proves it, never assertion.

- **Echo suppression by content, not event-window** (Dropbox Nucleus; Syncthing): the `writing` set works as a degenerate one-tree model; the upgrade path = persisted last-projected **content hash** per file, ingest drops no-op loads. Burr-grade, not blocking.
- **Best practices:** atomic temp-file + rename writes; watcher coalescing on file *stability*; periodic full-scan backstop; property-test the loop with seeded randomness (Dropbox runs millions nightly).
- **Anti-patterns:** timestamp conflict resolution · mid-write reads · non-idempotent serializers (Pandoc's writer can reparse to a *different* AST — the named cautionary tale).
- Named: Jujutsu (working copy = materialized commit; snapshot-before-act) · Unison (formal no-silent-overwrite spec) · gofmt's *restraint* (preserve operator blank-line choices where grammar permits — cheap goodwill at first contact).

### 3 · Layered multi-bag composition

- Recipe = ordered stack, later bag shadows per-title; **bag = locus of namespace AND access control** (TiddlyWeb 2008 → MWS Bags & Recipes — our own ancestor validates the shape).
- **Shadowing cannot express "remove from below"** (OCI whiteouts; overlayfs opaque markers): a layered delete eventually needs an explicit **tombstone/whiteout verb**. Reserved, not scheduled.
- **The closure ruling firms** (vector 3): npm's flat hoisting birthed phantom dependencies; pnpm's strictness + lockfiles killed them; the OCI manifest names its full ordered layer list even though built transitively. The lean graduates to a researched recommendation: **resolve transitively at mount-time, record the flattened ordered closure in the consumer's own recipe** — plus a deliberate lock-refresh verb and `--frozen-lockfile`-spirit drift detection.

### 4 · Residency & ownership across replicas

- **Coordinate ⊥ change-identity, two axes** (AT Protocol: record identity = path/rkey, stable across edits; CIDs address versions): our COPY-preserves-change-id ruling stands independently validated.
- **Visibility ≠ residency** (automerge-repo sharePolicy vs storage; the anti-pattern = conflating "synced to me" with "resident here"): atproto's answer — one authoritative home, others hold derived views — reads cleanest and matches @catalog `holdings` accession as the registration act.
- Named: DXOS spaces (container bounds replication — bag-as-ACL-locus mirrored) · IPFS/IPLD (content addressing answers *what*, never *where*; residency devolves to pinning).

### 5 · Confined derived writers

- The ward already stands on the right side of the line: **mechanism at the choke-point** (`confineMirrorWrite` — seccomp/SES precedent: the kernel refuses regardless of upper-layer opinion), **policy in the cascade/manifest**. POLA, deny-by-default, capability = designation + permission together.
- **Anti-pattern to keep dead:** a policy flag treated as a boundary (npm hoisting; event-stream's ambient authority). Capability = manifest grant, never a cascade-settable flag — already law; the research confirms, adds nothing to change.
- One burr found in re-read: the stale-cross-mirror unlink (`disk-projector.ts` flush tail) confines inline instead of routing through the ward — one gate, one choke-point; fold into vector 1.

### 6 · Live ingest (disk → records) — researched 2026-06-11, three spirits, pre-build

- **Complete the Nucleus triangle, cheap:** the CRDT record-set already sits as the merge seat (Remote); a persisted per-carrier **last-projected content hash** forms the Synced tree; a disk snapshot forms Local. Every ingest decision = three-way diff against these; an event means only "re-stat this path." Persist OBSERVATIONS, never work-queues — crash recovery = full scan + re-diff, no journal replay (Dropbox Nucleus; its legacy queue corruption forced the rewrite).
- **Two hash gates end echo storms structurally:** ingest drops a load whose disk-hash == synced-hash; projection skips a write whose bytes == disk. Content-match, NEVER clock ("timing-based suppression has no precedent in any production engine"; Syncthing retrofitted content-hash suppression in 2025 as a bug fix, PR #10351). The `writing` set demotes to latency optimization.
- **Events = hints; the periodic full scan stays truth** (Syncthing keeps rescan even with the watcher on). Queue overflow / watch exhaustion / dead backend = first-class states → rescan + alert. **Watchman cookie self-test at boot** (write a cookie, await your own event) detects a dead watch backend at startup — the WSL2 answer; bag tree on ext4 = load-bearing fact (/mnt = no events, ever).
- **Settle = no events AND stat stable AND hash confirms — never a timer** (chokidar awaitWriteFinish failure modes documented). Classify BOTH save dances: rename-replace (vim; FROM/TO cookie pair) and truncate-in-place (VS Code; transient 0-byte file). Filter editor litter (vim's literal `4913` probe file, .swp, ~); deletions get a grace window (git checkout = a thousand edits + transient deletes — TidGi's battle scar).
- **A disk edit enters as a DIFF spliced against the last-projected text** into the Automerge doc (Tonsky crdt-filesync; Ink & Switch) — whole-file replace = delete-all+insert-all, destroys concurrent merges. Per-carrier lock; order ingest → merge → project (Jujutsu snapshot-before-act — the direct fix for the Logseq class).
- **The anti-Logseq laws, with receipts** (#11256 #11327 #5135 #10481 #3650): never write a cached parse over an externally-edited file · never rewrite files the mind didn't touch (canonical-form rewrites fire only on records that actually changed — guarantee 2 restated for ingest) · collision-check identity (title→path non-injective = two records silently merge, one dies) · refuse loudly what the membrane cannot round-trip (parse-warning + alert, never best-effort ingest) · backup-before-overwrite as the data-loss backstop (Jermolene's "running backups").
- **Route ingest through the existing sync machinery as a pseudo-server** (twillm bidirectional-filesystem branch, PR #9806 + TidGi's production WatchFileSystemAdaptor — the closest living twins): one conflict path, not two. twillm's echo suppression = full reparse + field-compare; TidGi found time+size cheaper; our two hash gates beat both.
- **CI vectors before any daemon:** ingest∘project = identity (doc-side) · project∘ingest = identity (canonical files) · non-canonical ingest converges in ONE cycle (the gofmt-loop guard) · randomized interleavings of {disk edit, record edit, crash, delayed event} assert **quiescence** — "zero writes after round N" makes an echo storm a one-line test failure (Dropbox CanopyCheck/Trinity; Hughes ICST 2016).
- **Build state (2026-06-11 evening):** the **ingest gate** stands (`ingest-gate.ts` — the pure five-branch triangle decision, 6 vectors on the live boot meme, one-cycle convergence proven) · the **Synced tree** stands (`synced-tree.ts` — per-carrier last-projected hash, atomic, at `<root>/.lararium-projection/`; corrupt⇒never-projected⇒safe) · the **projection-side hash gate** lives in the projector (byte-identical writes skip silently). REMAINS: the INGEST verb + apply path (**MUST replace-by-group** — LOAD never removes children that vanished from a re-parsed carrier; that gap stays named) · `lares ingest` CLI (scan → gate → show → --apply) · quiescence vectors over the composed loop · the watcher daemon last, as automation of the proven gesture.
- **Build order RULED (operator, 2026-06-11): GESTURE FIRST** — `lares ingest` (scan → three-way diff → show → apply) witnesses the disk→records membrane with zero watcher risk; the daemon then automates a proven gesture (a watcher = a poll on interrupts). Matches the house gait and twillm's own syncer-poll shape.
- **twillm close-read deltas (PR #9806 branch source, read 2026-06-11)** — the closest twin's empirical lessons, folded into the verb design: ADOPT — chokidar `awaitWriteFinish {stabilityThreshold:100, pollInterval:50}` under a 400ms per-path trailing debounce (their field-tested settle values) · event→buffer→single-drain-seat shape, but drain ON the debounced event, never their fixed poll (their own app pins the 60s poll to 2s to feel live) · post-reparse set-difference for titles vanished from multi-record carriers · sticky residency (once a record projects to a carrier it stays; routing rules never silently move it) · executable record types excluded from live ingest · capability self-removal when no store watches (their poll once kept headless node alive forever). WE-MUST-DO-BETTER — deletion quarantine before destructive apply (git checkout = unlink floods; their branch does nothing) · rename re-link by content-hash match between a fresh add and a pending delete (their unlink+add breaks identity; our hash tree makes the re-link nearly free) · Jermolene's own unbuilt wish, "running backups" before any delete/overwrite. VALIDATED — their commit 7a80bd4a (serializer dropped created/modified → every save→watch cycle became a near-miss loop) empirically proves our canonical-form byte-fixed-point as THE prerequisite for echo silence; their fallback restraint (never write back over a foreign edit) = our gate's conflict branch. Their YAML subset never reaches a byte fixed point (numbers re-emit quoted; objects collapse to JSON blobs); their `\n---` frontmatter truncation = their unguarded unclosed-fence cousin.
- **Counter-example that validates the architecture:** SiYuan ABANDONED markdown-as-store because block identity cannot anchor in CommonMark — our ahu-anchored fragment URIs answer exactly that; the carrier stays the store's co-projection because the grammar carries addresses.

### 7 · Cross-island messaging + vessel projection — researched 2026-06-12, three spirits, pre-build

The admin↔hot-wiki bridge today (postMessage event → main translates → placeVerb; lossy placeWikiVerb to unmounted islands) reads as the field's named anti-pattern: the event-bus god object — "a growing switch translating event names to verbs, where every new feature edits the router." The refinement, braided from actors/bus/shore spirits:

- **The lane law** (the rule that decides everything): *main may see every EDGE created, never every MESSAGE sent* — when main's traffic scales with verb volume instead of island count, the lane assignment reads wrong. Lanes: **main = supervisor + registrar only** (mount/unmount, supervision, capability INTRODUCTION — mint a MessageChannel, hand the ports, step away; OTP: supervisors supervise, they don't relay) · **direct MessagePorts** = pairwise signalable/awaitable verbs once introduced (ports nest — a port rides over a port; granovetter introduction composes without main; Node 22 postMessageToThread = the field admitting parent-routing bottlenecks) · **the merge seat** = sticky_event state + durable mailboxes (deliver-to-IDENTITY, Orleans/Akka-sharding shape: a verb for an unmounted island parks as a record keyed by island id; delivery triggers rehydration — kills the lossy placeWikiVerb) · **postMessage/broadcast** = loss-tolerant hints ONLY, with the EDU discipline STATED (no delivery guarantee, supersession semantics, self-expiry; Matrix synapse #11150 = the bug-class of under-specifying the lossy lane).
- **Fire vs await lives in the wire protocol, not convention** — CapTP allocates NO answer slot for sendOnly; IslandMsg types SHOULD carry the same enforced distinction (signalable/awaitable as different message kinds).
- **Verb lifecycle = record pair, everywhere** (the CLI's summons/outcome physics extend to islands): summons {id, verb, args, issuer} + outcome {summonsId, status: done|rejected|failed, executor}. **The outcome record = the idempotency ledger = the audit log, one artifact** (executor checks for an existing outcome before side-effecting → at-least-once redelivery becomes exactly-once EFFECT). Rejection = a first-class outcome, never an error channel. Named precedent: trpc-crdt (calls as Yjs records, response awaited as a field; free fleet-wide observability of in-flight verbs — a HUD gift).
- **BOUND THE BUS HISTORY** — the one mechanism the precedents lack out-of-box: Automerge keeps every op forever; a busy verb bus through a long-lived canonical doc = unbounded churn history (field data: tombstone sets at GBs by 10M entries). Law: per-task or per-epoch BUS DOCS, small, discarded/archived whole, a pointer kept in the durable graph — rhymes with project-engine-epoch. Yjs invented Awareness for exactly this math.
- **Ephemeral/persistent placement criteria** (every mature system draws the line: Yjs doc/awareness · automerge change/broadcast · Matrix PDU/EDU): ephemeral iff loss-acceptable AND session-scoped AND high-frequency AND self-expiring; persistent if anyone must act exactly-once, an offline recipient must still receive it, it orders against durable state, or you'd want it in a postmortem. Ring-0 alerts = EDUs (keep the dual-write durable audit) · verbs = PDUs.
- **Addressing = SSB shape**: each principal writes its OWN outbox region; addressee named by identity IN the record; reader pulls by subscription ("relay holds pull not read" — the islands doctrine already vows this). Never write into another's store ambient; inbox-writes (if ever) gate per-writer capability. automerge-repo scopes ephemeral messages per-DOC — our signals SHOULD carry a doc-URL scope, easing later promotion of a signal class into records.
- **Vessel projection protocol (the browser leg + every future vessel type)** — the shore triplet, convergent across VS Code/Figma/Flutter/Monaco/worker-dom: (1) OUTBOUND: the sovereign island owns a typed model and emits ONE atomic versioned batch per frame (Flutter's layer-tree commit = the nalu's strongest field precedent: one wave, all observers, no half-applied state); each vessel supplies only an APPLIER — DOM-applier (shadow root), terminal-applier, canvas-applier, headless-applier (today's fake-DOM = exactly this); declarative state-mirror beats command-streams because appliers may ignore/coalesce/re-derive. (2) POLICY OUTBOUND AHEAD: default-handling declared in advance (the passive-listener/touch-action precedent) — preventDefault across an async seam = a lie about causality (Partytown documents it unfixable). (3) INBOUND: version-stamped SEMANTIC intents (never raw events; Events don't structured-clone), local echo vessel-side as pure presentation, reconciled by the next wave. Sovereign assigns stable node ids. NEVER expose the DOM; expose the versioned view-model (VS Code's 20-year ruling; Figma rebuilt their sandbox in WASM after shared-heap membranes kept escaping — separate heaps keep working). vscode.dev runs the same RPC across process/worker/remote unchanged = the transport-agnostic proof the many-vessels law wants. worker-dom's gesture-flags on forwarded input = capability riding the input path, keep.
- **Anti-patterns, named:** per-mutation postMessage (killed react-worker-dom) · sync hops through the coordinator (Electron sendSync freezes; Actual Budget postmortem) · whole-DOM mirroring (worker-dom's fate: mirror the semantic model instead) · fire-and-forget where durability was needed (Erlang silent-drop; Akka added /deadLetters as the visibility valve — keep one) · commands-as-events (a command may be REJECTED; an event = confirmed fact).

<<~/ahu >>

<<~ ahu #intent-vectors >>

## Intent vectors — the next phase, in order

**Flow ruling (operator, 2026-06-11):** the remaining vectors enact in **OODA-HA loops** — each stem opens with an observe/orient pass spoken aloud, the operator steers at ◇, and the loop closes (or suspends honestly) before the next stem opens. Re-cut order, operator-blessed: **corpus feed (4) → ingest-direction witness (disk-edit → membrane → wiki, co-projection's other half) → CREATE+COPY (2) → closure (3)** — witness-value-per-risk ordering: the feed soaks the fresh grain burn against ~100 real carriers before residency verbs ride on it. Precondition: a YIN friction-kill pass before the feed (corpus-wide round-trip sweep in the unit harness; membrane bugs die first).

**1. `lar:///projector.grain.burned` — DONE 2026-06-11 (commit c715fcca + aa97c281).**
All of it landed: H1 ternary dead in both factories · projector group routing (child climbs `fragment-parent` to root; debounce per (bag, root); flush renders the ROOT) · child `file-path` stamp dropped · stale-unlink through the ward · co-projection doctrine + headers · template sigil spacing · V3/V4 green, `.fails` removed. **One claim the prior torch carried died on contact:** "the renderer already recomposes via `~ahu` transclusion" read wrong — the template path CANNOT carry byte-fidelity (`\rules` does not propagate through `<$transclude>`, memetic-parser.ts; full rules mangle markdown under text/plain). The recompose lives in the membrane instead: **`expandMemeRefs`** (deserializer.ts, the inverse disk-projection#granularity already named) — `exportMemeText` routes through it; templates keep the HTML/projection scopes. The membrane harness (`packages/lararium-tw5/tests/meme-roundtrip.test.ts`) proves all three canonical-form guarantees on the live boot meme. Three burrs found and burned in the same fire: the prologue regex could not see a namespaced SOH (swallowed the whole header into `prologue`) · `extractSlotStructure`'s `allowPlain` ate plain ` ```toml ` CONTENT fences as slot-iam (only labeled ` ```toml iam ` carries identity now) · `origin-bag` re-emitted into iam (joined the deny set — runtime provenance, never operator TOML). Smoke re-vowed: boot meme = parent + 17 ahu children (18 records).
**Residue, deliberate:** the non-meme default rule (`$tw.utils.generateTiddlerFileInfo` + `config/disk-paths`/`disk-extensions` cascades, disk-projection#projection-routing rules 2–3) stays unimplemented — no non-meme tiddler currently rides a mirror; implement when one does. Old live stores may still carry stamped `file-path` on child records (data outlives code; scrub or ignore — the deny set already keeps it out of renders).

**2. `lar:///residency.create.lands` — bag-grain CREATE + COPY (next fire).**
Approved 2026-06-10 (residency-model): `CREATE` mints a coordinate, bag-grain `COPY` grants residency (change-id preserved, one transfer-id family), registration = `holdings` accession in @catalog. Now independently validated by atproto's two-axes model (#pattern-integrities §4). Rides verb-tiddler → admin island, orichalcum admin-on-destination. Witness through the harness.

**3. `lar:///closure.transitive.decided` — after live chains exist.**
Research-backed direction (#pattern-integrities §3): **resolve transitively at mount, record the flattened ordered closure explicitly** in the consumer's recipe; add a lock-refresh verb + drift detection. Ratify against real multi-wiki use; the lockfile history says implicit inheritance recreates phantom bags and action-at-a-distance.

**4. `lar:///hearth.corpus.fed` — ENACTED 2026-06-11 (staged witness + the live gesture both).**
The live hearth (re-genesis'd dev root `packages/lararium-node`, operator-blessed — the old genesis predated @admin and could not boot) ate the corpus whole: **1,464 records from 189 carriers, one change-id family**; the co-projection wrote 187 files under `LAR_ROOT/bags/@lares/v0.1`. Deep diff vs source, every file classified: 34 iam-only · 139 +margins · 14 normalize-toward-law (STX/ETX inserted per glyph-ward; same set the corpus sweep named — the live pipeline added ZERO new drift; the origin-bag deny held through Automerge) · **0 orphans, count math exact**. Three findings only the live feed could surface — two FIXED same day (pono corrections): (a) `the-lares-protocols.md` + `infrastructure-as-myth.md` authored pre-@lares SOH URIs and projected nowhere — re-addressed to their iam-true `@lares/v0.1` seats; (b) `sigil-shape-motion.md` authored `api/pono/…` against three witnesses (iam uri-path, file-path, location) — SOH re-seated to `docs/pono/…`; (c) **OPEN — the root fork:** the disk co-projection lands under LAR_ROOT; rooting the vessel at the REPO (`LAR_ROOT=<repo>`) would make the corpus itself the mirror surface and git the witness — the model the doctrine implies. The 2026-06-11 feed ran on the re-genesis'd dev root and its projection output got cleaned as noise; the NEXT feed should land on the operator-chosen root.
`tests/e2e/corpus-feed.test.ts` proves the shape repeatably: the whole 189-carrier corpus rides ONE directory-batch LOAD into a staged vessel — F1 the batch ACKs (the CLI's flat 10s verb timeout died at scale; the ACK budget now scales with carrier count, act.ts) · F2 group routing at scale: one file per carrier root, ZERO fragment files, count parity · F3 content-whole projection · F4 **live-pipeline idempotence** (re-feeding a projection leaves it byte-stable). The live hearth feed = `lares act LOAD --source-uri bags/@lares/v0.1 --to lar:///ha.ka.ba/@lares` — expect a one-time normalize-once diff wave (~360 files, framing only: margins, iam order, missing STX/ETX inserted) for the operator's review; zero content loss (corpus-sweep proven).

**5. `lar:///admin.hull.unified` — the one-hull migration (after ingest; the pivot playbook).**
The hole named 2026-06-12: @admin rides a bespoke 370-line twin of the island stack, duplicated per substrate — four copies of one hull. The law canonized at `@lararium/api/island-isomorphism` (PROPOSED — operator to ratify): islands differ by grant, never by hull; isomorphism of form/interface/grants, ASYMMETRY of life support (the field tried full self-hosting and retracted — kubeadm/bootkube/Talos); genesis exception bounded to manifest + loader + first-grant seed + liveness floor. Migration = interface-isomorphism first → genesis derived from the common emitter (fixed-point witness) → substrate twins collapse → bespoke lines die. Hoike #full-uniformity kept (Muse's purist kue; spirit deposition witnessed).

Burrs live in their own ledger now: #burrs.

<<~/ahu >>

<<~ ahu #burrs >>

## Burr ledger — live burrs only; rulings live in doctrine, done work in git

Cleared 2026-06-11 evening (lar:///ledger.combed.clean): content-hash echo suppression → DONE (both §6 hash gates live) · atomic temp+rename writes → DONE (projector) · CRLF/BOM boundary policy → DONE (membrane normalizes once; vectors) · NFC → PINNED in spec (memetic-wikitext #carrier-bytes) · multi-mirror Synced-tree key → DONE ((bag,uri)) · genesis-path seam → DONE WHOLE (one law: root/genesis; the main.ts special case, the repo symlink, AND the package-dir genesis home all died — genesis/ lives REAL at the repo root; default LAR_ROOT = the repo root; reset builds each instance's engine into its own root via LAR_GENESIS) · `lares` bin cold-start wart → DONE (committed shim). The iam-resurrection and frozen-archive RULINGS moved home to doctrine notes above; the engine-swap and restart findings live in their own entries.

Still live:

- tombstone/whiteout verb — reserved (§3), wakes when layered delete needs it
- Automerge history growth — DXOS-epoch pattern watched (§1), wakes on real growth
- `lares wiki` subcommands print human-only; `wiki open` selects-for-next-boot only
- ea-breath watchdog — the admin island SHOULD emit breath during mount so the timer resets on breath, silence alone times out (wants worker-side emission; budget meanwhile 120s, reboot vector guards)
- engine-swap reconcile answered "current" against a stale engine — epoch-design seam, feeds project-engine-epoch
- `$tw.lares.expandMemeRefs` registered, first consumer = the INGEST verb
- e2e trends long (reboot vector 73s) — split a slow lane when the suite hurts
- NFC assertion at the membrane — the spec pins NFC; the boundary MAY assert/normalize when a non-NFC carrier arrives (do with the INGEST gesture, where foreign bytes first walk in)

<<~/ahu >>

<<~ ahu #ways-of-working >>

## How this operator works (hard-won, honor it)

- **OODA-HA plans out loud before flow**; YIN passes after landing; burrs taken immediately ("no friction for later snags").
- **Commits**: lar:///three.term.roots messages; scope every commit with explicit pathspecs (`git commit --only -- <paths>`) — the index may carry the operator's parallel staging; NEVER commit blind.
- **Vocabulary law**: OCI nouns for structure, residency verbs for motion — VCS verbs MUST NOT name model operations. E-Prime in api/ and in your own prose.
- **Build-new-then-retire**; retired terms get reserved, not reused (`altar-fire` stays reserved). Mechanism at choke-points, policy in cascades. Capability = manifest grant, never a cascade-settable flag.
- The harness exists so witnesses repeat: prove changes with `pnpm test:e2e` against a staged vessel, never by assertion.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/wiki-layer-ontology >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/disk-projection >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/residency-model >>

<<~ pranala #hands-to ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/noosphere-boot family:control role:hands-to >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
