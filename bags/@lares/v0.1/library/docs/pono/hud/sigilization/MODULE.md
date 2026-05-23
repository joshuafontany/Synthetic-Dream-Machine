<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///sigils.render.maps/sigilization/?confidence=CS:0.85&p=0.5 -->

```yaml
---
name: sigilization
description: >
  Render rules for the lar: URI v2 schema. Maps canonical record form
  (RFC 3986, ASCII-only) to named display surfaces (HUD line, DreamDeck
  post header, TiddlyWiki tiddler, storage record). Governs which glyphs
  appear on which surfaces and enforces the all-five-stances invariant
  across all render targets.
phase-map:
  observe: observe/CONTEXT.md
  orient: orient/ARCHITECTURE.md
  decide: decide/CONVENTIONS.md
  act: act/PROCEDURES.md
  assess: assess/VERIFICATION.md
scale-range: [action, session]
trigger: >
  When emitting any lar: URI to a display surface. When writing
  DreamDeck post headers, HUD lines, TiddlyWiki tiddlers, or any
  render target that requires sigil-form output. When validating
  whether output matches surface rules.
invariant: false
dependencies: [uri-schema]
confidence: CS:0.85
---
```

# Sigilization Module

> Active render-target material promoted to `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets`

> **Register:** `[CS:0.85]` — near-canon; governs all surface emission
> **Status:** Active. Filed 2026-04-09 as resolution of U10 + U11 (uri-schema open questions).
> **Source of truth:** `lares/modules/sigilization/decide/CONVENTIONS.md`
> **Depends on:** `lares/modules/uri-schema/` for canonical record form



## Phase File Index

| Phase | File | Contents |
|---|---|---|
| ✶ Observe | `observe/CONTEXT.md` | What sigilization is; why this module was needed; bug history |
| ◎ Orient | `orient/ARCHITECTURE.md` | Design intent; record-form → sigil mapping tables |
| ◇ Decide | `decide/CONVENTIONS.md` | Normative rules; all-five invariant; per-surface conventions |
| ■ Act | `act/PROCEDURES.md` | How to emit for each named surface |
| ○ Assess | `assess/VERIFICATION.md` | Validation checklist; well-formedness rules |

<!-- → ? -->
