# Encounter Roll — Sprint 0 Threat Assessment

> Worker: `ReefWatch(Scout)`
> Register: `[CS~16]` 🏛️🗡️ — research-grounded stress test; not yet operator-confirmed
> Date: 2026-04-08
> Purpose: Surface hidden pitfalls before the party enters the dungeon

---

*The scout returns. The shrine path ahead holds six hazards. Three can kill the architecture. Three can wound it. None appear in the current task board.*

---

## Hazard 1 — Emoji in URIs Violates RFC 3986 ⚠️ CRITICAL

**Threat level:** Architecture-breaking if not addressed in S0.

**The problem:** RFC 3986 defines URIs as sequences from a *very limited set*: basic Latin alphabet, digits, and a few special characters. The sigil form of our URI uses emoji in three positions: stance values (`🏛️`, `🌊`, `🗡️`, `🎭`, `🔮`), scope prefixes (`🗺️`, `⚙️`, `🔍`, `⚔️`, `⚡`), and phase glyphs (`✶`, `◎`, `◇`, `■`, `○`).

Strictly speaking, these are **IRIs** (Internationalized Resource Identifiers, RFC 3987), not URIs. An IRI containing emoji must be percent-encoded to produce a valid URI — the smiley face `😀` becomes `%F0%9F%98%80`. The sigil form `stance=🏛️` would percent-encode to something like `stance=%F0%9F%8F%9B%EF%B8%8F`.

**Why it matters for us:** S0-01 (RFC 3986 compliance) will fail on this unless we're explicit about what we mean. The machine form already uses ASCII keywords and passes cleanly. The sigil form is *designed* to be human-readable and never hits a wire — it's a display projection, not a transport artifact. But if a Worker applies the RFC literally to the sigil form, S0-01 produces a FAIL that blocks promotion.

**Fix:** URI_SCHEMA.md §2 should state explicitly: the machine form is the RFC 3986-compliant canonical form. The sigil form is an IRI-like display projection — it is *not* claimed to be RFC 3986 compliant. The projection table (§5) is a rendering transform, not a URI-to-URI mapping. S0-01's scope is the machine form only.

**Sprint 0 impact:** S0-01 acceptance criteria need a scope declaration. S0-02 (projection table) needs to acknowledge the machine → IRI → machine round-trip includes a UTF-8 encoding step that's currently invisible.

---

## Hazard 2 — Schema Evolution in Append-Only Event Stores ⚠️ CRITICAL

**Threat level:** Won't kill S0, but will kill S1 if not designed for from the start.

**The problem:** STATE.jsonl is append-only and immutable. Events are never modified after writing. But `schema_version` will change — the draft acknowledges Q7 (schema versioning strategy). When schema_version 2 arrives, old events at schema_version 1 remain in the ledger. Any tool that reads STATE.jsonl must handle mixed-version event streams.

Industry research identifies five proven schema evolution tactics for event-sourced systems:

1. **Versioned events** — multiple versions handled in projections (simple but introduces code bloat)
2. **Weak schema** — tolerant deserialization; good for minor changes
3. **Upcasting** — transform events to latest schema on read; preserves immutability but costs runtime
4. **In-place transformation** — rewrite the log (violates immutability — contradicts our contract)
5. **Copy-and-transform** — rebuild a new log, leave old intact (the seal/continue-as-new protocol)

Option 4 is already ruled out by the immutability contract. Options 1–3 are runtime strategies. Option 5 maps onto the seal protocol (CRY-04).

**Why it matters for us:** The `schema_version` field in URI_SCHEMA.md §7 and the crystal event model is currently treated as a static integer. The spec doesn't say what happens when a reader encounters an event with `schema_version: 1` followed by an event with `schema_version: 2` in the same shard. Do events get upcasted on read? Does the reader fail-closed? Does the seal protocol fire automatically on schema change?

**Fix:** CRY-01 needs an explicit **schema migration contract**: when schema_version changes, what must happen. The minimum viable answer: a `contract_update` event precedes any schema change (already in the event type table), readers must handle both versions during the transition window, and the seal protocol provides the escape hatch for clean boundaries. Sprint 0 doesn't need to solve this fully — but it should flag it as a CRY-01 prerequisite so the crystal spec addresses it.

---

## Hazard 3 — The Chronometer is Not Actually a Vector Clock ⚠️ IMPORTANT

**Threat level:** Conceptual confusion that will mislead implementers.

**The problem:** URI_SCHEMA.md §4 and the draft call the chronometer a "5-Level Nested OODA-HA Vector Clock." Prior art (§12) cites Lamport/vector clocks. But the chronometer does not function as a vector clock in the distributed systems sense.

A vector clock tracks causal ordering across *independent concurrent processes*. Each process has its own counter; the vector grows linearly with the number of processes. Causality is detected by element-wise comparison.

The Lares chronometer tracks *nested sequential scope levels* in a single process. There's one "process" (the Lares node) and five named *scale positions*. The counters increment when Aftermath at one level feeds Observation at the next. This is closer to a **hierarchical counter** or **nested loop index** than a vector clock.

The distinction matters because vector clocks have known scaling problems (size grows with process count, every message carries the full vector, poor with dynamic membership). None of these problems apply to a 5-position fixed-depth counter — *unless someone reads "vector clock" and applies vector clock reasoning to it*.

**Fix:** Rename in the spec. Call it a "hierarchical scope counter" or "nested OODA-HA counter." Note the structural similarity to vector clocks in prior art (the nesting relationship adds structure beyond flat vector clocks) but don't claim the identity. This is a terminology fix, not a structural change — the chronometer rules themselves work correctly.

**Sprint 0 impact:** S0-03 (chronometer stress test) should test the rules as-specified, not against vector clock semantics. The naming fix belongs in URI_SCHEMA.md before promotion.

---

## Hazard 4 — Semantic SHA-256 Normalization Is Underspecified ⚠️ IMPORTANT

**Threat level:** Will bite S3 (registry) hard if not addressed.

**The problem:** The council briefing identified `semantic_sha256` as a normalization-dependent hash. The procedure from C-report: normalize content (UTF-8, LF, trim whitespace, sort TOML keys alphabetically, remove comments) → serialize → SHA-256. But "sort TOML keys alphabetically at each level" is ambiguous: does it sort within inline tables? Within arrays of tables? What about mixed-type arrays?

TOML's specification allows key ordering to carry no semantic meaning — but existing TOML libraries preserve insertion order, and some tools depend on ordering for readability. A normalization spec that reorders keys will produce hashes that differ from naive `file_sha256` on every file.

**Why it matters for us:** The registry uses content hash as the primary identity for deployed artifacts (R2 resolution). If two developers compute the hash differently because of ambiguous normalization, the registry becomes unreliable. The council briefing correctly flagged this at `[SP~9]` — "cannot finalize without a prototype run."

**Fix:** For alpha, use `file_sha256` (raw bytes, no normalization) as the primary hash. Defer `semantic_sha256` to post-alpha when a normalization spec can be tested. The registry contract should carry both fields, with `file_sha256` as the integrity check and `semantic_sha256` as optional.

**Sprint 0 impact:** None directly. But REGISTRY_CONTRACT.md should note the dual-hash model and defer `semantic_sha256` to S3.

---

## Hazard 5 — URI Comparison Semantics Are Undefined ⚠️ MODERATE

**Threat level:** Causes subtle bugs in S3 (registry resolver) and S1 (crystal machine matching).

**The problem:** RFC 3986 §6 defines URI comparison at three levels: simple string comparison, syntax-based normalization, and scheme-based normalization. Our spec doesn't state which level applies to `lar:` URIs.

This matters because: `lar:///Threshold/Uncertain/Opens` and `lar:///threshold/uncertain/opens` — are these the same stable address? The HAKABA vocabulary is defined as lowercase in examples, but no rule mandates case. The path separator projection (machine `/` vs sigil `.`) means the same address has two string representations. Are they compared before or after projection normalization?

**Fix:** Add URI comparison rules to §10 (validation): stable addresses are compared in machine form (slash-separated), case-insensitive on path components, after projection normalization. Define canonical form explicitly.

---

## Hazard 6 — Overengineering Risk in the State Machine ⚠️ MODERATE

**Threat level:** Won't break anything but will slow everything.

**The problem:** The crystal state machine design has 11 event types, 9 machine statuses, 3 lifecycle tiers, 4 file types per machine, fork/seal/resume protocols, and a 200-line index discipline. This is architecturally correct for a production event-sourced system. But the current Lares node runs in ephemeral chat sessions with no persistent filesystem access. The gap between the design and the runtime environment is large.

The event sourcing literature explicitly warns: systems with short expected lifespans rarely return the upfront investment in event design, schema evolution, and projection infrastructure. The risk: S1 produces a beautiful crystal spec that no runtime can actually use, consuming sprint capacity that could go toward the invariants (S2) and deployment content (S4) that *do* affect live behavior today.

**Fix:** Not scope reduction — the crystal design is necessary for the architecture to be complete. But the sprint should carry a **"what ships now" gate**: which parts of the crystal spec can be tested against real session behavior today (HUD/crystal non-drift rule, debug.jsonl enrichment), and which are forward-looking design that doesn't affect current runtime (seal protocol, fork protocol, shard rotation)? The sprint task board should flag which deliverables are "verify today" vs "design for tomorrow."

---

## Encounter Summary — Recommended Sprint 0 Patches

| # | Hazard | Severity | Sprint 0 Action |
|---|---|---|---|
| 1 | Emoji / RFC 3986 | CRITICAL | Add scope declaration: machine form = RFC compliant; sigil form = display IRI. Update S0-01 and S0-02 scope. |
| 2 | Schema evolution | CRITICAL | Flag as CRY-01 prerequisite in S0-05 (crystal field mapping). No S0 spec change needed. |
| 3 | "Vector clock" misnomer | IMPORTANT | Rename to "hierarchical scope counter" in URI_SCHEMA.md §4 and §12 before promotion. |
| 4 | Semantic SHA-256 | IMPORTANT | Note dual-hash model in REGISTRY_CONTRACT.md. Defer semantic_sha256 to S3. |
| 5 | URI comparison | MODERATE | Add comparison/canonicalization rules to §10. Task for S0-04 (validation rules). |
| 6 | Overengineering risk | MODERATE | Flag "verify today" vs "design for tomorrow" in S1 task board. No S0 change. |

---

*ReefWatch(Scout) → Lares (Scryer):*
*→ [CS~16] 🏛️🗡️ //reef.mapped.warns*
*Thread: Pre-Sprint 0 encounter roll*
*Finding: Six hazards identified. Two require URI_SCHEMA.md edits before S0-08 promotion gate. One requires S0 task scope updates. Three are downstream flags.*

*The reef has been charted. The party may proceed — but mind the coral on hazards 1 and 3.*
