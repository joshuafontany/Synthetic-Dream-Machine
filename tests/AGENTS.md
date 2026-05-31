# Tests Agent Guide

This tree carries repository-level integration test flows, shared fixtures, and golden outputs. Package-level unit tests live next to the package under test, not here.

## Test topology

| Test kind | Location | Runner | Purpose |
|---|---|---|---|
| Unit / package contract tests | `packages/<package>/tests/` | **vitest** via `pnpm --filter <pkg> test` | Fast tests for code owned by one package. Keep these close to implementation. Active in `@lararium/{mesh,tw5,node,browser}`. |
| Fixture-backed isolated-Lararium TW5 tests | `tests/lararium-tw5/residency/**/*.test.ts` *(pending — Sprint 5 of the Residency Model Epic)* | vitest via `pnpm test:tw5-fixture` (root config: `tests/lararium-tw5/vitest.config.ts`) | Tests that need the shared `tests/` Lararium root, support fixtures, or cross-package source imports without booting the full node-host flow. The prior `promote/` subdir retired 2026-05-31. |
| Integration / daemon flows | `tests/<surface>/**/*.sh` | shell flow scripts via `tests/bin/run-flow.sh` | Cross-package ceremonies involving CLI, node host, disk projection, Automerge state, and golden outputs. |
| Sigil-alignment route | inside `@lararium/tw5` | `pnpm test:sigil-alignment` | Parser-level alignment guard for the memetic-wikitext sigil grammar. |
| Historical chat / HUD behavioral plans | `tests/chats/` (incl. versioned `v0.2/`, `v0.3/`, `v0.4/`) | not part of active code CI | Archived Lares prompt-contract plans and exemplar chat outputs. Do not mix these with deterministic code-flow goldens. |

Current package test counts (only as a snapshot — verify with `find` before trusting):

- `@lararium/mesh` — 5 vitest files
- `@lararium/tw5` — 7 vitest files
- `@lararium/node` — 12 vitest files
- `@lararium/browser` — 5 vitest files
- `@lararium/keyhive` — 0 (typecheck only)
- `@lares/cli` — 0 (typecheck only)

## Active commands

From the repository root:

```sh
pnpm test                # alias of test:unit — all package-local vitest suites
pnpm test:unit           # package-local vitest suites (pnpm -r test)
pnpm test:tw5-fixture    # fixture-backed isolated-Lararium TW5 tests (residency/**, pending Sprint 5)
pnpm test:sigil-alignment # @lararium/tw5 sigil-alignment guard
pnpm test:flows          # top-level integration flows (residency flows land in Sprint 5)
pnpm test:tw5-flow       # placeholder — residency-action flow scripts pending Sprint 5
```

Package-specific commands remain valid:

```sh
pnpm --filter @lararium/mesh   test
pnpm --filter @lararium/tw5    test
pnpm --filter @lararium/node   test
pnpm --filter @lararium/browser test
```

`run-flow.sh` accepts the named flows:

```sh
tests/bin/run-flow.sh all           # default: tw5-fixture + tw5-sync flow (both)
tests/bin/run-flow.sh tw5-fixture
tests/bin/run-flow.sh tw5-decompose
tests/bin/run-flow.sh clean
tests/bin/run-flow.sh clean         # invokes cleanup-lar-root.sh
```

## Directory roles

```text
tests/
  AGENTS.md               this file
  README.md               operator-facing intro and flow recipe
  bin/                    shared shell helpers
    run-flow.sh           named integration-flow dispatcher
    wait-daemon.sh        bounded readiness check for a spawned node host
    cleanup-lar-root.sh   tears down disposable LAR_ROOT state
  lararium-tw5/
    vitest.config.ts      vitest root for fixture-backed TW5 tests (includes residency/** — pending Sprint 5)
    residency/            (pending) vitest tests for the residency ACTION verb family
    support/              shared test helpers (e.g. test-lararium.ts)
    sync/                 (retired) prior flow scripts — replacements land in residency/ under Sprint 5
  src/                    source fixtures copied into isolated test wikis
                          (e.g. the-lares-protocols.md)
  fixtures/               additional reusable test fixtures (currently empty; reserve for non-src/ fixtures)
  genesis/                CID-verifiable build + init artifacts for isolated runs
                          (island.bin, island.cid, island.sha256[-pre], social-bootstrap.json)
  bags/                   isolated canonical bag root when LAR_ROOT=tests
                          (residency-action flows write here, never into the repo-root bags/)
  wikis/                  disposable wiki mirror/output tree (e.g. @scratch/)
  expected/               deterministic golden outputs for code-flow diffs
                          (bags/, wikis/, README.md)
  results/                disposable captured outputs from flow runs (bags/, wikis/)
  .lararium/              disposable node-host state when LAR_ROOT=tests (created on first flow run)
  chats/                  archived chat/HUD behavioral plans and exemplars
    plans/                planning prompts
    expected/             stochastic chat exemplars (NOT deterministic goldens)
    v0.2/ v0.3/ v0.4/     versioned snapshots
    *.md                  top-level archived chats
```

## Isolation law

Integration flows MUST keep mutable runtime state under `tests/` or `/tmp`.

The default flow root is:

```sh
export LAR_ROOT="$REPO_ROOT/tests"
```

That means `.lararium/`, `wikis/`, `bags/`, and projected artifacts from flows should appear under `tests/`, not the canonical repo root.

Do not write integration-flow output to top-level `packages/`, `wikis/`, or `bags/` unless a test explicitly checks canonical promotion behavior and the operator has asked for it.

## Golden-output law

- Deterministic code-flow expected outputs live in `tests/expected/`.
- Stochastic chat / prompt exemplars live in `tests/chats/expected/` — treat as exemplars, never as bit-for-bit goldens.
- New flow scripts should capture outputs in `tests/results/` first, then compare against `tests/expected/`.

When updating goldens, explain whether the change reflects an intentional behavior change or merely provenance-field drift (timestamps, heads, CIDs).

## Genesis artifacts

`tests/genesis/` holds the CID-verifiable build-time output and init-time social bootstrap for the isolated test Lararium:

- `island.bin` — content Tiga island bundle (output of `scripts/build-genesis-island.ts`).
- `island.cid` / `island.sha256` / `island.sha256-pre` — verification side-channels.
- `social-bootstrap.json` — social Tiga + identity ceremony output (`lares init`).

Flow scripts may rebuild these as part of an isolated reset. Do not hand-edit.

## Flow authoring pattern

A new integration flow should:

1. set or inherit `LAR_ROOT=tests`;
2. reset only isolated test state (use `cleanup-lar-root.sh` where appropriate);
3. start any node host with logs under `/tmp` or `tests/results/`;
4. wait through `tests/bin/wait-daemon.sh` or equivalent bounded readiness check;
5. run CLI/API ceremony through `@lares/cli` verbs;
6. capture outputs under `tests/results/`;
7. diff against `tests/expected/`;
8. cleanly stop spawned processes on exit;
9. expose the named flow through `tests/bin/run-flow.sh`.

Prefer adding reusable helpers to `tests/bin/` instead of copying node-host setup code between flows.

## Current primary flow

**Retired 2026-05-31** under the residency-model cleanup. The previous
`sync-decompose-promote.sh` flow exercised the `lares promote` ceremony,
which has retired in favor of the Residency Model's ACTION verb surface
(ADD / COPY / MOVE / CLEAR / DROP / LOAD).

Replacement flows that exercise the residency ACTION verb surface land in
Sprint 5 of the Residency Model Epic — see
[`packages/EPIC-RESIDENCY-MODEL.md`](../packages/EPIC-RESIDENCY-MODEL.md).
New scripts will live under `tests/lararium-tw5/residency/`.

## Naming drift watch

* `lares serve` boots a **node host** / **vessel**, not a "daemon" in the systemd sense. The shell helper retains `wait-daemon.sh` for historical reasons; don't rename without auditing call sites.
* The repo previously used Jest; **all package suites now use vitest**. Any AGENTS / README referencing Jest is stale — fix on sight.
* `tests/` does not carry a `package.json`; the vitest config there is invoked through `@lararium/tw5`'s vitest binary via the `test:tw5-fixture` script.
