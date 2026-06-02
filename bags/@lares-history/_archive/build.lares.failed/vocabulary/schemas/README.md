# schemas/ — Module/Tool/Permission TOML Schemas

> Scope: TOML schemas for module descriptors, tool descriptors, permission descriptors, registry manifest, bootloader config. Semantic digest model.
> Updated: 2026-04-08
> Status: Draft — `B_deep-research-report.md` is primary source
> URI: `[pending — lar://core/design/schemas@draft]`

---

## What Belongs Here

- `.module.toml` field schema and validation spec
- `.tool.toml` field schema and validation spec
- `.permission.toml` field schema and validation spec
- `lares.registry.toml` manifest schema
- `.claude/CLAUDE.toml` bootloader config schema
- Dual-digest model: `file_sha256` + `semantic_sha256` — definition, computation, and invalidation rules
- Cache-friendly field ordering conventions (stable fields before volatile)
- `TODO_PARSE_DOC_SPEC.md` parse/doc formatting spec (overlaps with compiler; schema-layer section goes here)

## Does Not Belong Here

- Invariant TOML (`lares.core.*`) → `../invariants/`
- Compiler assembly algorithm → `../compiler/`
- `lar:` URI scheme field anatomy → `../signal/` (anatomy) + `../registry/` (resolver)
- Platform-specific TOML overrides → `../platform/`

---

## Primary Sources

| File | Consumed? | Notes |
|---|---|---|
| `../../_todo/core/B_deep-research-report.md` | No | Primary schema research; TOML schemas for all five descriptor types; prompt caching constraints; Claude Code `@import` mechanics |
| `../../_todo/core/TODO_PARSE_DOC_SPEC.md` | No | Parse/doc formatting spec — schema layer sections |

---

## Design Status

Research complete. Five schema types identified. Extraction and field-by-field annotation is next.
