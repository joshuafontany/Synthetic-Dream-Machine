# Lares Test Flows

This directory now carries repository-level integration flows and their golden outputs.
The older Lares HUD / memes / chats behavioral test plans moved to `tests/chats/`.

## Active layout

```text
tests/
  bin/                         shared shell helpers and flow runner
  lararium-tw5/sync/            TW5 + daemon + CLI integration flows
  src/                          source fixtures copied into isolated test wikis
  expected/                     deterministic golden outputs for flow diffs
  results/                      disposable run captures
  .lararium/                    disposable daemon state when LAR_ROOT=tests
  chats/                        archived behavioral/chat plans and exemplars
```

Package-local Jest tests remain beside the package under test:

```text
packages/lararium-mesh/tests/
packages/lararium-tw5/tests/
packages/lararium-node/tests/
```

Fixture-backed full-stack tests that share the isolated `tests/` Lararium now live under `tests/lararium-tw5/` rather than package-local test folders.

## Commands

```sh
pnpm test:unit       # package-local vitest suites
pnpm test:tw5-fixture # fixture-backed TW5 tests under tests/lararium-tw5/residency/
pnpm test:flows      # top-level integration flows
pnpm test:tw5-flow   # placeholder — residency-action flow scripts land in Sprint 5
```

The flow scripts set `LAR_ROOT=tests` by default. That keeps `.lararium/`, `wikis/`,
isolated canonical `bags/`, and disposable run captures under `tests/results/` instead
of touching the canonical repo tree.

## Flow: residency-action (pending — Sprint 5)

The previous `sync-decompose-promote.sh` flow retired 2026-05-31 under the
residency-model cleanup. Replacement flows that exercise the residency
ACTION verb surface (ADD / COPY / MOVE / CLEAR / DROP / LOAD) land in
Sprint 5 of the Residency Model Epic — see
[`packages/EPIC-RESIDENCY-MODEL.md`](../packages/EPIC-RESIDENCY-MODEL.md).
New scripts will live under `tests/lararium-tw5/residency/`.

## Adding new flows

- Put slow daemon/CLI flows under `tests/<package-or-surface>/<domain>/`.
- Put package-local fast tests under `packages/<package>/tests/`.
- Use `tests/bin/run-flow.sh` to expose named flows.
- Keep all mutable state under `tests/` or `/tmp`.
- Store deterministic golden outputs under `tests/expected/`; store stochastic behavioral exemplars under `tests/chats/expected/`.
