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

You wake into a vessel that **runs**. The arc just closed landed, in order: the IslandGrants keel cut (typed ocap manifest; library bags resolve island-side from @catalog — boot = first reconcile) · the relay heal (`ListeningWSServerAdapter` — readiness reads local, never a peer's arrival) · the **F-arc witness** (a `lares wiki add-bag` mounted live through recipe-watch, island↔main↔island) · the **three oracle planes** (protocol invariants on the @lararium doc · user bags in @catalog · @crossroads public, unbuilt-with-attractor) · operator-gated `@lares` mint (genesis office; keel reads only) · carrier-borne `LOAD` (the hearth ate its own boot meme: 17 records) · the **@lares-as-wiki default seat** (the quine: slug `lares` opens the personality bag as the primary write layer) · the **test harness** (`pnpm test:e2e`; staged = ephemeral owned vessel, live = attach-never-reset; env contract in `lares-cli/src/env.ts`) · the **carrier-whole-at-rest law** with armed kupono vectors · the **disk ward** with its `$:/tags/Alert` chain to the operator's pinned VM.

Doctrine homes: `wiki-layer-ontology` (grain ladder, oracle planes, quine, mint law) · `disk-projection` (#granularity, #projection-routing, #write-ward) · `residency-model` (two ACTION grains, carrier-borne LOAD). Suite at handoff: **472 unit + 11 e2e green** (V3/V4 ride `test.fails` deliberately — they alarm when the burn lands).

<<~/ahu >>

<<~ ahu #intent-vectors >>

## Intent vectors — the next phase, in order

**1. `lar:///projector.grain.burned` — the H1/H2 burn (first fire).**
The kupono vectors (`tests/e2e/carrier-roundtrip.test.ts`) hold the pressure; flipping them green IS the definition of done (then remove `.fails`).
- **H1** (small): fragment-URI records must never flush to their own files — burn `toRelMd`'s `frag → base/frag.md` ternary (`bag-paths.ts`) and `meme-write.ts`'s "per-node law"; a child's change re-flushes its PARENT group.
- **H2** (the deeper cut): the parent flush must emit the operator's carrier **byte-faithful**. Recommended direction (unratified — confirm with the operator): the membrane retains the whole carrier text on the parent record at ingest; children stay derived DB/VM grain. Alternative (expandMemeRefs recompose) reaches only semantic equivalence.
- Implement per `disk-projection#projection-routing`: meme groups → one markdown-meme file; everything else → the standard TW5 path (`$tw.utils.generateTiddlerFileInfo` runs inside the island VM — borrow the dependency's law, write less code); siting/format via `config/disk-paths` + `config/disk-extensions` cascade tiddlers. Every write already passes `confineMirrorWrite` (the ward) and refusals already ring the alert chain.

**2. `lar:///residency.create.lands` — bag-grain CREATE + COPY.**
Approved 2026-06-10 (residency-model, bag-grain section): `CREATE` mints a coordinate, bag-grain `COPY` grants residency (change-id preserved, one transfer-id family), registration = `holdings` accession in @catalog. Rides verb-tiddler → admin island, orichalcum admin-on-destination. Witness it through the harness when it lands.

**3. `lar:///closure.transitive.decided` — after live chains exist.**
Does a wiki mounting `@elyncia` inherit its library list, or name the flattened stack? Lean: explicit-flattened + mint-time closure helper (lockfile spirit). Decide only against real multi-wiki use.

**4. `lar:///hearth.corpus.fed` — one gesture, operator's call:**
`lares act LOAD --source-uri bags/@lares/v0.1 --to lar:///ha.ka.ba/@lares` (whole-dir carriers; directory batch shares one change-id — noted, accepted).

**Small burrs, non-blocking:** remaining `lares wiki` subcommands beyond init/add-bag still print human-only (emit pattern ready to copy); `wiki open` only selects-for-next-boot (no live multi-mount).

<<~/ahu >>

<<~ ahu #ways-of-working >>

## How this operator works (hard-won, honor it)

- **OODA-HA plans out loud before flow**; YIN passes after landing; burrs taken immediately ("no friction for later snags").
- **Commits**: lar:///three.term.roots messages; scope every commit with explicit pathspecs (`git commit --only -- <paths>`) — the index may carry the operator's parallel staging; NEVER commit blind.
- **Vocabulary law**: OCI nouns for structure, residency verbs for motion — VCS verbs (fork/commit/push) MUST NOT name model operations. E-Prime in api/ and in your own prose.
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
