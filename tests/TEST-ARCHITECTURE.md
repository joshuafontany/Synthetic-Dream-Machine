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

Whole workspace: **`pnpm test`** — which runs `pnpm -r --workspace-concurrency=1 test`.

**The serialization is load-bearing, not a preference.** Several packages drive the SAME python palace
holders and stand their own TW5 islands. Run the workspace concurrently and those packages contend for
one holder, its RPC deadline expires, and a test fails naming a timeout — the suite reports the machine's
spare capacity as the code's correctness. This is the single-owner law reaching the test runner: one
sovereign body per store, tests included. Run `pnpm -r test` by hand and expect flakes under load.

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

## The harness — end-to-end returned (2026-06-10)

The `@lares/harness` workspace package lives here now (`tests/`), holding the
shape this section pre-decided. It drives the **real `lares` CLI** against a
real instance in one of two modes:

| Mode | Selector | Behavior |
|---|---|---|
| **Staged** *(default)* | — | harness OWNS the instance: ephemeral root under `os.tmpdir()`, random port, `lares vessel clear --force` → daemon boot → await `phase → live` → tests → daemon killed, root deleted. Every run starts from genesis. |
| **Live** | `LAR_TARGET=live` + `LAR_ROOT`/`LAR_PORT` | harness ATTACHES: never resets, never stops, never deletes. Mutating tests guard on `instance.mode === "staged"` and skip. |

**The env contract** (one source: `packages/lares-cli/src/env.ts`): `LAR_ROOT` +
`LAR_PORT` name an instance; separate instances = separate pairs. QA attaches to
a live pair; Staged mints and destroys its own.

Run: **`pnpm test:e2e`** (root) · `pnpm test:e2e:live` against a running hearth.
Deliberately OUTSIDE `pnpm -r test` (the script is `test:e2e`, not `test`) — the
unit suites stay fast; the harness boots a real daemon (~20s).

First stable layer: `e2e/smoke.test.ts` — boot-to-live with the @lares hearth
seated, the operator-mint oracle on the invariant plane, carrier-borne `LOAD`
(boot meme → 17 records), carrier-less refusal, `wiki init`/`add-bag` registry
composition, and one live-safe `status` read.

## The shape (held from the pre-decision)

- **Exercise the live model, not fixtures.** Drive the residency **ACTION verbs**
  (`ADD COPY MOVE CLEAR DROP LOAD`) + effect records through the real `lares` CLI
  against a running vessel.
- **Assert against current canon only.** The `wela/anu` residency model
  ([residency-tiers](../bags/@lararium/ha.ka.ba/lararium/api/residency-tiers.mem)) and the
  disk-projection surfaces — `bags/` seed, `wikis/` projection
  ([disk-projection](../bags/@lararium/ha.ka.ba/lararium/api/disk-projection.mem)).
- **Goldens are regenerable, never load-bearing history.** When the model changes,
  regenerate or delete. No promote-era artifacts ever return.

---

## Principles (YIN)

1. **Co-locate.** A test lives with the package it tests. No orphan test tree.
2. **No superseded-model goldens.** Git history is the archive; the working tree
   carries only what asserts the *current* model.
3. **Delete fearlessly.** A superseded suite is debt, not coverage. Nuke it; rewrite
   against the live model when the surface it covers actually exists.
