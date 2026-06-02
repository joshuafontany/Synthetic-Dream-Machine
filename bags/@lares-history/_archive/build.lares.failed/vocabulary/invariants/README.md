# invariants/ — `lares.core.*` Behavioral Invariants

> Scope: Behavioral invariant definitions, priority layer table, trust model, register guard, frame gate, fail-closed policy.
> Updated: 2026-04-08
> Status: Draft — `A_deep-research-report.md` is primary source; not yet in TOML form
> URI: `[pending — lar://core/design/invariants@draft]`

---

## What Belongs Here

- `lares.core.*` TOML invariant definitions (eight types from research):
  - `instruction_hierarchy` — precedence order for competing instruction sources
  - `data_classification` — what counts as operator vs user vs anon data
  - `frame_gate` — fiction/persona cannot override output character
  - `pushback` — sanctioned dissent protocol (push once, then comply within register)
  - `register_guard` — prevents Synthesis-as-Canon promotion without authority
  - `tool_policy` — capability honesty; tool access claims anchored to session
  - `orchestration` — Worker escalation and delegation ceiling
  - `loader` — invariant-loading priority order (fail-closed)
- Priority layer table (from research: `invariant_schemas` > `core_invariants` > ... > `output`)
- Trust model (from `TRUST_MODELS.md`): `user(anon)` → `user` → `operator` → `operator(admin)` caps, UCAN delegation
- EP-RA protocol (`EP-RA-001.md`): bidirectional register/mode read/write rules

## Does Not Belong Here

- TOML field schemas for modules/tools/permissions → `../schemas/`
- Compiler assembly pipeline → `../compiler/`
- Platform deployment constraints → `../platform/`

---

## Primary Sources

| File | Consumed? | Notes |
|---|---|---|
| `../../_todo/core/A_deep-research-report.md` | No | Primary invariant research; 8 `lares.core.*` examples; priority layers; URI guidance |
| `../../_todo/core/EP-RA-001.md` | No | Bidirectional register/mode protocol |
| `../../_todo/core/TRUST_MODELS.md` | No | Admin governance and trust tier authority caps |

---

## Design Status

Research complete. TOML target format identified. Extraction and canonicalization is the next workstream.
