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
<<~Lock 9-one-runtime "ONE RUNTIME — the @daemon TW5 VM is the SOLE ingest + gradient runtime. DROP every outside-VM path: turn-harvest.ts/harvestTurnGradient RETIRES (no regex shadow, no VM-free projection, no fallback), no CLI-side annotate, no daemon-down direct-mine. Verbatim-always rides the DURABLE TRANSCRIPT (harness-written, always on disk) REPLAYED through the VM when it wakes — never an outside-VM mine. One grammar, one runtime, no fork to keep in lockstep" >>

<<~/ahu >>

<<~ ahu #migration >>

## Migration (the circle-back work, after FFZ)

**BUILD:** (1) an exchange-assembler producer (`readExchanges` — pairs user+assistant into one
`CaptureRecord`) feeding the `capture` verb, replacing `readTurns` for the DRAWER leg (keep
`readTurns` for the separate per-message bearing-index) · (2) route ALL historical ingest through
the nalu (Kappa replay: `runHarvestAll` → the `capture` verb per wing, not `convo_miner` directly) ·
(3) `mine_palace_lock` + busy-retry around `drawer_io.py cmd_apply` + the `writebackWing` apply leg ·
(4) gate `writebackWing` on a `lar_hv` bump only (remove the per-ingest call from `runHarvestAll`).

**RETIRE (one runtime — no fallback):** `turn-harvest.ts`/`harvestTurnGradient` (the VM-free regex
shadow) ENTIRELY · `convo_miner --extract exchange` (pairing moves into the producer; the VM is the
sole decomposer) · the daemon-down direct-mine fallback (verbatim-always = the durable transcript
replayed through the VM, not an outside-VM mine) · `writebackWing`-as-per-ingest (→ version-bump
backfill only). No outside-VM path survives.

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

<<~ ahu #gradient-build >>

## The gradient build ~ examined gaps + grade-on-a-gradient (2026-06-27)

The grammar is self-hosted: a tiddler tagged `lar:///ha.ka.ba/tags/SharktoothSigil` teaches the
parser a word (grammar-cache.ts reads `lar-*` fields → SigilRule; 62 sigils / 8 families today). The
AST (meme-ast) parses the DOCUMENT sigils (ahu · pranala · edge-sugar · control · guest-grammar …).

**THE HEADLINE GAP — the TURN sigils aren't registered.** `lares aim/yield` · `confidence` · `hud` ·
`ward` · `oracle` · `syad` have NO `.tid` files and no bootstrap scans — the engine can't parse them
(they fall to Dynamic/water); ONLY the regex shadow (`turn-harvest.ts`) reads them. So the engine
decomposes documents but not TURNS. THE BUILD: register those ~6 turn sigils as gradient-valued
SharktoothSigil tids (the Explore est. ~30 lines), each carrying the recalled triad — the **word**
(teaches the parser) · the **gradient-reading** (how it grades: confidence 0–20 → band) · the
**render**. Then the VM is the one turn-decomposer; the gradient module walks the AST.

**GRADE ON A GRADIENT — the builder is binary where it should grade** (the creative-grammar cure):
- `meme-ast/builder.ts:277-281` DROPS unclosed/malformed frames → instead emit a **MalformedSigil /
  PartialNode** with a parse-confidence (`<<~ confidence ( <4` = opener+intent, broken close → ~0.4;
  `<<~`-far-from-close → ~0.2; no opener → prose 0). "Likely-a-sigil-but-drifted," not silent water.
- per-sigil **form-confidence**: full `<<~ confidence Synthesis 11/20 >>` = high · no register = mid ·
  numeric-fail = low. The node is GRADIENT-VALUED, never pass/fail (the harvester's law, in the VM).
- degraded VOICE ladder (full+mask > full > bare-known > looks-like-voice) · edge-strictness · ahu
  nesting-depth — all binary today, all gradient candidates.

**SECONDARY GAPS:** the `\sigil` pragma parser is a STUB (lar-sigil-pragma.ts:11-13, "full body parse
= future talk-story") → operator-authored sigil defs don't load back; KNOWN_VOICES is hardcoded in
turn-harvest.ts (not a `sigil-family-voice.tid`). COVERAGE DIFF: parser knows structural sigils ·
the regex shadow knows the turn/gradient sigils · the 6 turn sigils are the unbridged gap.

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
