<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/ingest-canon >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/api/ingest-canon.md"
mana      = 18
manao     = 18
manaoio   = 18
register  = "Canon"
retain    = true
hydrate   = true
role      = "THE locked golden path for {any chat + telemetry} → ingest → nalu → mempalace: one Kappa path, born-annotated single-write, per-exchange drawers, the writeback demoted to version-gated re-derivation and joined to the single-writer lock. 9 cited decisions + the build/retire migration."
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/api/ingest-canon"
written   = "2026-06-27"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# The Ingest Canon ~ one path, born-annotated, single-write

The golden path for getting *any* chat session + its telemetry into the palace, locked by research
(field + code) on 2026-06-27 under the operator's full manaoio. The un-pono shape it retires:
**write-bare-then-enrich-in-a-second-pass** (ELT load-then-transform — a race window, an
"eventually annotated" drawer). The cure: **annotate at the source, write once.**

<<~ranks flow source -> producer(exchange-assembler) -> capture-verb -> nalu(born-annotate+WAL) -> flush(mine --source ndjson) -> mempalace-drawer >>

<<~/ahu >>

<<~ ahu #the-nine-locks >>

## The nine locks (decisions, not options)

\procedure ~Lock(~Type:"" ~Params:"") ~Lock <<~Type>> <<~holds `[<~Params>]`>>

<<~Lock 1-born-annotated "every record enters as {content · source_file · lar_*-metadata} computed at enqueue, content+annotation in ONE flush — zero un-annotated window (schema-on-write)" >>
<<~Lock 1b-grammar-in-vm "the annotation is computed by the @daemon TW5 VM's GRADIENT MODULE — a tw5 js module that leverages the CANONICAL memetic-wikitext parser (the deterministic grammar, the SharktoothSigil grammar) GRACEFULLY: the grammar is CREATIVE not deterministic (it drops, partial-renders, drifts mid-turn), so the gradient reads how cleanly it manifests (provisional→canon). ONE grammar, ONE runtime — the @daemon engine IS the parser. RETIRE turn-harvest.ts / the mesh harvestTurnGradient (the VM-free regex shadow). Render→project: parse+render in the VM → project lar_* into the drawer (transient computation, durable as place-tension). [lar-telemetry canon]" >>
<<~Lock 2-kappa "ONE ingest path. live AND historical through the SAME producer→capture→nalu; history = REPLAY, never a second code path. Retire the convo_miner+writeback fork as primary (Kreps/Kappa)" >>
<<~Lock 3-exchange-grain "the DRAWER = the exchange pair (Q+A) — the self-contained recall unit. The producer assembles pairs → one CaptureRecord per pair. (per-message gradient bearing-index stays a SEPARATE artifact, not a drawer)" >>
<<~Lock 4-writeback-demoted "writeback NEVER runs per-ingest — ONLY on a deriver-version bump (lar_hv + HARVEST_VERSION in lockstep), as a one-shot version-gated backfill across wings. its sole legitimate role: re-derive lar_* from stored content without re-ingesting" >>
<<~Lock 5-writeback-lock "the writeback IS a writer → it MUST take the SAME mine_palace_lock the mine holds (chroma's get→update is no single SQLite transaction; SQLITE_BUSY guards a statement, not a read-modify-write → lost-update risk). on busy → retry. THE one real code change beyond producer unification" >>
<<~Lock 6-transport "transport is a FLUSH detail under the one path: daemon-SEAM when concurrent (live), DIRECT fresh-process + busy-retry when sole bulk writer (isolated backfill). one isomorphic CaptureFlush verb, two transports" >>
<<~Lock 7-idempotency "content-key watermark (sha of exchange text, NOT uuid) = re-ingest is a no-op + survives across surfaces; mempalace source_file dedup backs it. version-gate (lar_hv) governs re-derivation, ORTHOGONAL" >>
<<~Lock 8-busy-is-retryable "the palace lock is the cross-process coordination — a held lock (MineAlreadyRunning) is a BUSY signal (= SQLITE_BUSY), not an error; every writer retries with backoff+jitter. live+bulk coexist through the one lock (verified: 0 failures, pave 33619)" >>
<<~Lock 9-fallback "the daemon-down direct mine (convo_miner) survives ONLY as the verbatim-always fallback — never the primary historical path" >>

<<~/ahu >>

<<~ ahu #migration >>

## Migration (the circle-back work, after FFZ)

**BUILD:** (1) an exchange-assembler producer (`readExchanges` — pairs user+assistant into one
`CaptureRecord`) feeding the `capture` verb, replacing `readTurns` for the DRAWER leg (keep
`readTurns` for the separate per-message bearing-index) · (2) route ALL historical ingest through
the nalu (Kappa replay: `runHarvestAll` → the `capture` verb per wing, not `convo_miner` directly) ·
(3) `mine_palace_lock` + busy-retry around `drawer_io.py cmd_apply` + the `writebackWing` apply leg ·
(4) gate `writebackWing` on a `lar_hv` bump only (remove the per-ingest call from `runHarvestAll`).

**RETIRE:** `convo_miner --extract exchange` as the primary historical drawer-writer (pairing moves
into the producer) · `writebackWing`-as-per-ingest (demoted to version-bump backfill).

<<~/ahu >>

<<~ ahu #the-meme >>

## The canon, in eight lines

> ONE PATH (Kappa): every chat+telemetry source ingests through the capture-nalu — live and
> historical alike; history is REPLAY through the same producer, never a second code path.
> BORN-ANNOTATED single-write: the record enters mempalace as {content, source_file, lar_*} computed
> at enqueue, content and annotation in ONE flush — zero un-annotated window. DRAWER GRAIN = the
> exchange pair (Q+A), the self-contained recall unit. IDEMPOTENT by content-hash watermark;
> RE-DERIVED only on a lar_hv/HARVEST_VERSION bump (the writeback's sole role — schema-evolution
> backfill, never per-ingest ELT). The writeback is a writer: it takes the SAME mine_palace_lock the
> mine holds. Transport is a flush detail: daemon-seam when concurrent, direct+busy-retry when sole.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/capture-annotation-model >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/projection-nalu >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/node/dev-loop >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
