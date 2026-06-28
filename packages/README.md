# Packages Workspace Map

Short orientation for humans and agents reviewing `packages/`.

## Source of truth

- `packages/AGENTS.md` carries package-boundary law.
- `packages/HANDOFF.md` carries active work only.
- `packages/ROADMAP.md` carries near-term path order.
- `packages/MEMPALACE-INTEGRATION.md` carries the mempalace ↔ `lares` memory
  integration — the `wake` harness-wiring flags, `harvest` modes, the `lar_*`
  metadata net, and the blank-slate refresh flow. Design/canon lives at
  `lar:///ha.ka.ba/@lararium/api/mempalace-integration`.
- Source lives under each package's `src/`.
- Unit tests live under each package's `tests/`.
- Cross-package and daemon/CLI integration flows live under repo-root `tests/`.

## Generated and review-noisy paths

Treat these as build artifacts unless the task explicitly targets generators,
bundles, or release packaging:

- `packages/*/dist*/`
- `packages/lararium-tw5/output/`
- `packages/lararium-tw5/src/plugin-tiddler.generated.ts`
- `packages/lararium-tw5/tw5-core/`
- `packages/lararium-node/genesis/`

Prefer reviewing the generator or source module first, then rebuild.

## Current architectural pressure

- TW5 VM primacy: memetic wikitext has a host wiki context. Do not parse through
  an arbitrary global/pinned VM when a specific wiki context owns the import.
- Tiddlers are the CRDT atoms. A bag is an Automerge document containing
  tiddlers; a wiki is a TW5 VM view over a recipe of those bags.
- Integration tests should prove import/decompose/promote behavior through real
  VM and daemon surfaces. Package unit tests should keep narrow seams fast.
- Sync, VM pooling, and multi-wiki/shared-bag behavior remain active design
  pressure. Harden tests before large refactors.
