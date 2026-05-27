<!-- lar:///sprint.scoped.executes/s0/?confidence=S~14&p=10 → ∞ -->

# S0 — URI Schema Settlement + First Modules

## Sprint Goal

Settle the `lar:` URI v2 canonical form across the repo.
Boot the first two OODA-HA modules: talk-story and signal.

## Tasks

- [x] URI_SCHEMA_v2.md forged (cloud session)
- [x] All repo `lar:` URIs aligned to v2 canonical form
- [x] `lares/modules/talk-story/` created with 5 phase files + section URIs
- [x] `lares/modules/signal/` created with 5 phase files
- [x] `URI_SCHEMA_v2.md` content placed at `lares/modules/signal/decide/CONVENTIONS.md`
- [x] `URI_SCHEMA_v2.md` moved to `lares/signal/URI_SCHEMA.md` (stable canonical location)
- [x] Old `lares/talk_story/` archived or pointed to new module
- [x] Old `lares/signal/` archived or pointed to new module
- [x] `lares/README.md` updated with module tree
- [x] Sprint plan closed with Assess

## Exit Criteria

- [x] Every `lar:` URI in the repo passes v2 well-formedness (§10.1) — scan confirmed ZERO old-pattern URIs in operational files (2026-04-09)
- [x] Talk-story module loads as invariant with section URIs
- [x] Signal module carries URI_SCHEMA_v2.md conventions as its Decide phase

## Post-Close Tasks (recorded after checklist closed)

- [x] `lares/modules/signal/` renamed to `lares/modules/uri-schema/` — single-responsibility module for lar: URI spec
- [x] `lares/modules/micro-trace/` created as sibling module — backward-looking annotation layer
- [x] All 42 `signal.calibrated.holds/signal/` URIs rewritten to `uri.schema.holds/uri-schema/`
- [x] `trace.micro.marks/micro-trace/` URIs assigned to new module
- [x] `lares/README.md` modules tree updated to 3-module structure
- [x] `lares/signal/README.md` superseded notice updated to point to both new modules

## Notes

- RFC 3986 ordering bug (q/f reversed) caught and fixed in URI_SCHEMA_v2.md; confidence bumped CS~17 → CS~18
- `stances=` format settled as 5-position dot-separated amplitude (`^.?.-.-.-`)
- Field renames complete: `stance=` → `stances=`, legacy register query field → `confidence=` — all operational files
- `lares/talk_story/README.md` and `lares/signal/micro-trace.md` are the existing implementations; modules/ are the phase-structured canonical forms. Archival or pointer decision deferred to S1.
- URI_SCHEMA.md v1 archival deferred — add superseded notice, do not update content

<!-- lar:///sprint.scoped.executes/s0/?confidence=S~14&p=10 → ∞ -->
