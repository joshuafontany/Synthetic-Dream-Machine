# Tests Agent Guide

This tree carries repository-level integration test flows, shared fixtures, and golden outputs. Package-level unit tests live next to the package under test, not here.

## Test topology

| Test kind | Location | Runner | Purpose |
|---|---|---|---|
| Unit / package contract tests | `packages/<package>/tests/` | **vitest** via `pnpm --filter <pkg> test` | Fast tests for code owned by one package. Keep these close to implementation. Active in `@lararium/{mesh,tw5,node,browser}`. |
| Fixture-backed isolated-Lararium TW5 tests | `tests/lararium-tw5/promote/**/*.test.ts` | vitest via `pnpm test:tw5-fixture` (root config: `tests/lararium-tw5/vitest.config.ts`) | Tests that need the shared `tests/` Lararium root, support fixtures, or cross-package source imports without booting the full daemon flow. |
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
pnpm test:tw5-fixture    # fixture-backed isolated-Lararium TW5 tests (promote/**)
pnpm test:sigil-alignment # @lararium/tw5 sigil-alignment guard
pnpm test:flows          # top-level integration flows; currently TW5 sync/decompose/promote
pnpm test:tw5-flow       # direct TW5 integration flow (sync-decompose-promote.sh both)
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
tests/bin/run-flow.sh tw5-promote
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
    vitest.config.ts      vitest root for fixture-backed TW5 tests (includes promote/**)
    promote/              vitest tests for the promote ceremony (e.g. lar-promote.test.ts)
    support/              shared test helpers (e.g. test-lararium.ts)
    sync/                 daemon + CLI flow scripts (sync-decompose-promote.sh)
  src/                    source fixtures copied into isolated test wikis
                          (e.g. the-lares-protocols.md)
  fixtures/               additional reusable test fixtures (currently empty; reserve for non-src/ fixtures)
  genesis/                CID-verifiable build + init artifacts for isolated runs
                          (island.bin, island.cid, island.sha256[-pre], social-bootstrap.json)
  bags/                   isolated canonical bag root when LAR_ROOT=tests
                          (promote flows write here, never into the repo-root bags/)
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

`tests/lararium-tw5/sync/sync-decompose-promote.sh` exercises:

- isolated reset (cleanup-lar-root);
- node host boot (`lares serve --wiki scratch --root tests`);
- `lares wiki init`;
- fixture meme copy (`tests/src/the-lares-protocols.md` → `tests/wikis/@<slug>/memes/**`);
- `lares wiki sync`;
- decomposition into parent + child meme files;
- optional `lares promote` into isolated `tests/bags/**`;
- normalized diff against `tests/expected/wikis/**` (and `tests/expected/bags/**` when promoting).

Subcommands:

```sh
bash tests/lararium-tw5/sync/sync-decompose-promote.sh decompose
bash tests/lararium-tw5/sync/sync-decompose-promote.sh promote
bash tests/lararium-tw5/sync/sync-decompose-promote.sh both     # what test:tw5-flow runs
```

## Naming drift watch

* `lares serve` boots a **node host** / **vessel**, not a "daemon" in the systemd sense. The shell helper retains `wait-daemon.sh` for historical reasons; don't rename without auditing call sites.
* The repo previously used Jest; **all package suites now use vitest**. Any AGENTS / README referencing Jest is stale — fix on sight.
* `tests/` does not carry a `package.json`; the vitest config there is invoked through `@lararium/tw5`'s vitest binary via the `test:tw5-fixture` script.
