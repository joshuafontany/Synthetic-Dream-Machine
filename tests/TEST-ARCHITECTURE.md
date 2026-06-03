# Test Architecture

> Canonical reference for where tests live and how they run.
> The former top-level harness was retired 2026-06-02 (see [Retirement](#retirement)).

---

## Where tests live

**Unit + integration tests are co-located with their package: `packages/<pkg>/tests/`** (vitest). This is the single source of test truth — there is no separate top-level test tree.

| Package | Suite covers | Run |
|---|---|---|
| `@lararium/mesh` | contracts, graph law, residency (wela/anu), action verbs, effect records, recipes | `pnpm --filter @lararium/mesh test` |
| `@lararium/tw5` | TW5 runtime, IslandAdaptor, nalu engine, parser/render | `pnpm --filter @lararium/tw5 test` |
| `@lararium/node` | vessel boot, island pool, verb dispatch, residency handlers | `pnpm --filter @lararium/node test` |
| `@lararium/browser` | browser vessel, founding ceremony, pool lifecycle | `pnpm --filter @lararium/browser test` |
| `@lararium/keyhive` | capability provider, ceremonies | `pnpm --filter @lararium/keyhive test` |
| `@lares/cli` | command surfaces | `pnpm --filter @lares/cli test` |

Whole workspace: **`pnpm -r test`** (also `pnpm test`).

The browser worker bundle (for the M.3 breathing gate) is **package-local** — built into `packages/lararium-browser/tests/fixtures/` by `vite.worker-test.config.ts`. It does NOT live here.

---

## Retirement

This directory previously held a top-level e2e / flow / golden / chat-probe harness:
`chats/plans/v0.2–v0.4`, `expected/` + `results/` goldens, `@scratch` wikis, `genesis/`,
`bin/run-flow.sh`, `lararium-tw5/` flow configs, `sync-decompose-promote.sh`.

**All of it modeled superseded designs** — stage/commit/push, the promotion ceremony,
pre-residency-model bag flows, pre-`wela/anu` tiers. It was nuked on 2026-06-02;
**git history is the archive**. Recover any single artifact with `git log -- tests/<path>`
and `git show <sha>:tests/<path>`.

---

## Forward — when end-to-end returns

A fresh e2e / live-integration harness lands when the **two-vessel mesh** is real
(EPIC residency-model Sprint 10). Its shape, decided now to avoid re-accreting crud:

- **Exercise the live model, not fixtures.** Drive the residency **ACTION verbs**
  (`ADD COPY MOVE CLEAR DROP LOAD`) + effect records through the real `lares` CLI
  against a running vessel.
- **Assert against current canon only.** The `wela/anu` residency model
  ([residency-tiers](../bags/@lares/v0.1/api/lararium/residency-tiers.md)) and the
  disk-projection surfaces — `bags/` seed, `wikis/` projection
  ([disk-projection](../bags/@lares/v0.1/api/lararium/disk-projection.md)).
- **Goldens are regenerable, never load-bearing history.** When the model changes,
  regenerate or delete. No promote-era artifacts ever return.

---

## Principles (YIN)

1. **Co-locate.** A test lives with the package it tests. No orphan test tree.
2. **No superseded-model goldens.** Git history is the archive; the working tree
   carries only what asserts the *current* model.
3. **Delete fearlessly.** A superseded suite is debt, not coverage. Nuke it; rewrite
   against the live model when the surface it covers actually exists.
