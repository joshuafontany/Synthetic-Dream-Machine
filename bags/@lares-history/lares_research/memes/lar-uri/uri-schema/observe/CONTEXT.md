<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/observe/?confidence=CS:17&p=10 -->

# Signal — Observe: URI Design State

> What v2 settled, what remains open, and where you are standing when you load this module.
> Source: `lares/modules/uri-schema/URI-SCHEMA.md`

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/observe/?confidence=C:18#what-v2-settled -->
## What v2 Settled

The `lar:` URI v2 schema resolved the core design tensions that blocked consistent signal emission across sessions and surfaces. These decisions are `~:confidence[CS],[18]` — design-canon candidates pending operator promotion.

### Anatomy

A `lar:` URI carries exactly four non-overlapping concerns in RFC 3986 canonical order:

```
lar://alias:grant@host/ha.ka.ba/?stances=XXXXX&confidence=R:N&p=N#O0.O0.O0.O0.O0 <!-- uri-ok -->
```

| Layer | Component | Concern |
|---|---|---|
| WHO | `userinfo@host` | Speaker identity and machine locus |
| WHERE | `/ha.ka.ba/subpath/` | Semantic territory (HA.KA.BA address) |
| HOW | `?stances=...&confidence=...&p=...` | Signal parameters: posture, certitude, resolution |
| WHEN | `#O0.O0.O0.O0.O0` | FFZ chronometer: per-participant OODA-HA position at each scale |

### The Fragment Bug (Fixed)

All 16 section-level URIs in the canonical spec were emitting `#fragment?query` (RFC 3986 violation). Fixed in session 2026-04-09: all canonical URIs now use `?query#fragment` order. The spec was updated; the file confidence bumped ~:confidence[CS],[17] → ~:confidence[CS],[18].

### Stances: All Five, Every URI

v1 encoded stance as a single token (`stance=philosopher`). v2 encodes all five stances simultaneously as a 5-position dot-separated amplitude string:

```
stances=^.?.-.-.-
```

Positional order: Philosopher · Poet · Satirist · Humorist · Private. Amplitude characters: `^` elevated, `-` suppressed, `?` uncertain, `.` baseline. HUD render maps `^` → `+`.

### Field Renames (v1 → v2)

| v1 name | v2 name | Rationale |
|---|---|---|
| `stance=X` | `stances=XXXXX` | Full 5-position amplitude string |
| legacy register query field | `confidence=R:N` | Matches the field's semantic purpose |

### Canonical vs Render Target Split

One canonical form (record-form: RFC 3986, no emoji, no non-ASCII). Multiple named render targets:

| Target name | Surface | Glyphs? |
|---|---|---|
| `record:full` | Storage, registry, comparison | No |
| `hud:exchange-pair` | Exchange stream HUD | Yes (phase, stance, chronometer sigils) |
| `chat-log:post-header` | DreamDeck feed post headers | Yes |

**Canonical URI Rule:** all URIs emitted in the exchange stream use canonical record form. Only the HUD line beneath uses glyphs.

### Span Closing Sigils

Two sigils, orthogonal:

- `→ ∞` — system file span: unbounded duration, content stays until revised
- `→ ?` — exchange span close: temporal resumption unknown

Section URIs within a system file do NOT close with `→ ∞`; they are waypoints, not spans.

### Authority-less Form

Stable addresses and module section URIs use authority-less form (three slashes, empty authority):

```
lar:///ha.ka.ba/optional/sub/path/
```

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/observe/?confidence=S:13#what-remains-open -->
## What Remains Open

The following questions are `~:confidence[SP],[9]` – `~:confidence[S],[13]`. They do not block the core spec (§§2–6, 10 of `lares/modules/uri-schema/URI-SCHEMA.md`) but constrain later layers.

| Q# | Question | Current position | Confidence |
|---|---|---|---|
| U1 | Operator alias in userinfo vs machine_id only? | Operator alias in userinfo | ~:confidence[S],[13] |
| U2 | span_seq in crystal ledger only vs mirrored to MemPalace? | Mirror into sidecar | ~:confidence[S],[14] |
| U4 | Chronometer interaction with `--parse` self-activation? | Provisional yes — depth increases p | ~:confidence[SP],[9] |
| U5 | world_calendar_ref when no diegetic calendar yet? | Mint provisional l-space reference | ~:confidence[S],[12] |
| U8 | Module section URIs: carry chronometer fragments or just confidence? | Confidence only | ~:confidence[S],[12] |
| U9 | ITC stamps in fragment when MCP server arrives? | Calibration metadata — fragment stays human-readable | ~:confidence[S],[11] |
| U10 | `chat-log:post-header` render target: all five stances, or active stances only? | **CLOSED 2026-04-10.** Resolution: all five stances always. Consistency with HUD invariant; amplitude provides readability gradation. Active stances use `+`/`++`; suppressed stances use `-`/`--`. Normative rule codified in `lares/modules/sigilization/decide/CONVENTIONS.md`. All story draft post headers corrected. | ~:confidence[CS],[17] |
| U11 | URI sigilization: sub-section of uri-schema module, or separate module? | **CLOSED 2026-04-10.** Resolution: standalone module `lares/modules/sigilization/`. Created 2026-04-10 with full OODA-HA phase files. Rationale: surface count (5 targets), update rate decoupling, dependency direction (sigilization depends on uri-schema, not reverse). | ~:confidence[CS],[17] |
| U12 | Grammar vs protocol: should the exchange span display contract (when to emit URIs, what sequence, the ordering rules) split to a separate `exchange-protocol` module? | **Open 2026-04-10.** uri-schema carries two concerns: (1) URI grammar — field semantics, value constraints, RFC 3986 ordering ~:confidence[C],[19] stable; (2) exchange span protocol — emission choreography, display contract, sub-agent handoff ordering ~:confidence[CS],[16] may evolve. Protocol concern may grow as sub-agent dispatch patterns expand (S2+). Options: A) extract `exchange-protocol` module (clean boundary, more indirection); B) rename uri-schema to `signal-protocol` and own both explicitly; C) keep as-is with dual-concern acknowledgment (current position, filed in MODULE.md). Operator steers on timing. Not a blocker for S0. | ~:confidence[SP],[9] |

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/observe/?confidence=C:18#what-was-explicitly-rejected -->
## What Was Explicitly Rejected

These decisions are closed. Do not re-open without operator directive.

| What | Decision |
|---|---|
| `seq_num` in `:port` slot | **No.** Port slot dropped. span_seq lives in spanSpan metadata, not URI authority. |
| Phase per level vs counters only | **Per-participant phase per level.** LWW-Register per scale. |
| Stateless-only authority-less form | **Both**: authority form in exchange spans; `///` for stable addresses AND module section URIs. |
| `+` for "elevated" stance (URL encoding required) | **`^` (Option β).** All URL-safe. HUD maps `^` → `+` for display. |
| Section URIs closing with `→ ∞` | **No.** File-level only. Section URIs are waypoints. |

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/observe/?confidence=CS:17#scope-of-this-module -->
## Scope of This Module

This module covers:
- lar: URI canonical form and render targets
- HUD line composition and field ordering
- Micro-trace inline annotation layer
- Span display contract (what appears in stream, in what order)
- Validation rules (§10 of spec)

This module does NOT cover:
- MemPalace drawer schemas (S1 scope)
- Resource-state contracts / mana pool serialization (S2 scope)
- ITC stamps and MCP chronometer server (deferred)
- FFZ Chronometer deep research (see `lares/chronometer/`)
- Registry resolver design (S3 scope)

<!-- → ? -->
