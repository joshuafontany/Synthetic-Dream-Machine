<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/handoff >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/docs/lares/handoff"
file-path = "bags/@lares/v0.1/docs/lares/handoff.md"
type      = "text/x-memetic-wikitext"
tagspace  = "stable"
register  = "Synthesis"
manaoio   = 11
mana      = 12
manao     = 12
role      = "live handoff — context + intent vectors for the next Lares instance; updated at each phase boundary, never archived in place"
written   = "2026-06-11"
cacheable = true
hydrate   = true
retain    = true
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

<<~/ahu >>

<<~ ahu #intent-vectors >>

## Intent vectors — the next phase, in order

**1. `lar:///projector.grain.burned` — DONE 2026-06-11 (commit c715fcca + aa97c281).**
All of it landed: H1 ternary dead in both factories · projector group routing (child climbs `fragment-parent` to root; debounce per (bag, root); flush renders the ROOT) · child `file-path` stamp dropped · stale-unlink through the ward · co-projection doctrine + headers · template sigil spacing · V3/V4 green, `.fails` removed. **One claim the prior torch carried died on contact:** "the renderer already recomposes via `~ahu` transclusion" read wrong — the template path CANNOT carry byte-fidelity (`\rules` does not propagate through `<$transclude>`, memetic-parser.ts; full rules mangle markdown under text/plain). The recompose lives in the membrane instead: **`expandMemeRefs`** (deserializer.ts, the inverse disk-projection#granularity already named) — `exportMemeText` routes through it; templates keep the HTML/projection scopes. The membrane harness (`packages/lararium-tw5/tests/meme-roundtrip.test.ts`) proves all three canonical-form guarantees on the live boot meme. Three burrs found and burned in the same fire: the prologue regex could not see a namespaced SOH (swallowed the whole header into `prologue`) · `extractSlotStructure`'s `allowPlain` ate plain ` ```toml ` CONTENT fences as slot-iam (only labeled ` ```toml iam ` carries identity now) · `origin-bag` re-emitted into iam (joined the deny set — runtime provenance, never operator TOML). Smoke re-vowed: boot meme = parent + 17 ahu children (18 records).
**Residue, deliberate:** the non-meme default rule (`$tw.utils.generateTiddlerFileInfo` + `config/disk-paths`/`disk-extensions` cascades, disk-projection#projection-routing rules 2–3) stays unimplemented — no non-meme tiddler currently rides a mirror; implement when one does. Old live stores may still carry stamped `file-path` on child records (data outlives code; scrub or ignore — the deny set already keeps it out of renders).

**2. `lar:///residency.create.lands` — bag-grain CREATE + COPY (next fire).**
Approved 2026-06-10 (residency-model): `CREATE` mints a coordinate, bag-grain `COPY` grants residency (change-id preserved, one transfer-id family), registration = `holdings` accession in @catalog. Now independently validated by atproto's two-axes model (#pattern-integrities §4). Rides verb-tiddler → admin island, orichalcum admin-on-destination. Witness through the harness.

**3. `lar:///closure.transitive.decided` — after live chains exist.**
Research-backed direction (#pattern-integrities §3): **resolve transitively at mount, record the flattened ordered closure explicitly** in the consumer's recipe; add a lock-refresh verb + drift detection. Ratify against real multi-wiki use; the lockfile history says implicit inheritance recreates phantom bags and action-at-a-distance.

**4. `lar:///hearth.corpus.fed` — one gesture, operator's call:**
`lares act LOAD --source-uri bags/@lares/v0.1 --to lar:///ha.ka.ba/@lares` (whole-dir carriers; directory batch shares one change-id — noted, accepted).

**Burrs, non-blocking:** content-hash echo suppression upgrade (§2) · tombstone/whiteout verb reserved (§3) · Automerge history growth → DXOS-epoch pattern watched (§1) · remaining `lares wiki` subcommands print human-only · `wiki open` selects-for-next-boot only.

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
