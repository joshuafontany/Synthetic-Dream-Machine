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
  ([residency-tiers](../bags/lararium/ha.ka.ba/lararium/api/residency-tiers.mem)) and the
  disk-projection surfaces — `bags/` seed, `wikis/` projection
  ([disk-projection](../bags/lararium/ha.ka.ba/lararium/api/disk-projection.mem)).
- **Goldens are regenerable, never load-bearing history.** When the model changes,
  regenerate or delete. No promote-era artifacts ever return.

---

## Reading a live vessel — the instrument laws

Every law here was paid for by a loop that measured the VECTOR and reported the CODE. A red these
produce is indistinguishable from a real fault, which is what makes them expensive: the suite answers
confidently and answers wrong. Collide the instrument before believing what it says.

**`lares vessel stand` DETACHES.** The launcher prints a status line and exits while the vessel it
started keeps running and writes `<root>/data/lares/vessel/wake-serve.log`. A harness watching the
launcher's pipe sees a vessel that reached `live` as one that printed nothing — the floor reported
down while it is up. *Read the vessel's own log, never the launcher's stdout.*

**That log APPENDS.** Re-standing into an existing log means the previous boot's `phase → live`
matches instantly for a vessel that never came back. The vector then reports a hearth that stood when
nothing did, and reaches for a socket no process holds. *Clear the log before every stand.*

**A zero presenter key is refused on CAPABILITY, before your question is reached.** `0x000…` names
nobody, and nobody is denied by the cap gate long before the thing under test runs. A vector holding a
zero key measures the gate and reports whatever it meant to ask. *Present the vessel's own did —
`fleetPeerDid()` under the test's `LAR_ROOT`.*

**Never fail-fast on a bare `/Error:/`.** A healthy keyhive wasm boot prints
`Error: Some(ReceiveCgkaOpError(UnknownInvitePrekey…))` on its way to `live`. Matching it cuts the
watch short and reports a vessel that stood as one that died. *Match faults this house raises —
`boot fault`, `FATAL`, `already in use`, `TypeError:` — not the word "Error".*

**An arg-shape check that fires BEFORE the resolve makes a proof vacuous.** `realm-clock` validates
`realm` as 64-hex and only then calls `resolveStore()`. Driving it with a malformed realm returns a
clean, legible refusal that proves the plane resolves — and proves nothing at all, because the plane
was never reached. The same shape hides in every verb that validates before it reaches. *Assert the
code under test RAN: drive the verb with arguments good enough to reach past every gate in front of
it, and prefer a WRITE round-trip, which cannot pass by absence.*

**A fixed sleep is not a wait.** A vessel flushes its stores and its repo on the way down, so how long
it holds its listener depends on what it wrote, not on a constant. Pausing a fixed interval and
re-standing races that flush: the re-stand binds a port the dying vessel still holds, dies with
"already in use", and the vector reports the act under test broken when what broke was the wait.
*Poll for the condition — the port free, the socket present — never a duration.*

**Name a process by the port it holds.** `pkill -f <pattern>` matches its own shell and kills the
harness with the vessel. *`ss -ltnp | grep ':PORT ' | grep -oP 'pid=\K[0-9]+'`.*

**UDS paths cap at ~107 bytes.** A root deep enough to push `<root>/data/lares/vessel/lares.sock` past
it fails `connect` with `EINVAL`, which reads exactly like a daemon that never opened its door. The
suffix runs 30 bytes, so a root over ~77 bytes crosses the cap. *Stand test vessels at a short root.*

### Red vectors

**The convention this repo actually uses is a PLAIN FAILING TEST whose header names the defect.** It
carries no `test.fails` and no `test.todo`; the one `test.skip` defers a scouting question. Red
contracts are written as ordinary vectors that fail, with a doc-comment saying what the red means —
`frames-per-carrier` states it outright: *"A red here does NOT say the corpus is broken — it says the
CHECK READER is single-frame and the corpus has outgrown it"*, and names where the cure lives.

**Counting `test.fails` does not tell you whether a repo holds a standing red.** An earlier revision of
this section read the two markers, found none, and recorded "this repo holds no standing red" while a
plain red vector stood in the tree. The measurement answered the question it could reach rather than
the question asked — the same shape as an arg-check that fires before the resolve. *To find the
standing reds, run the suites and read the bar.*

**Known standing reds must be named in the suite that carries them, never only in a session.** A red
nobody can distinguish from a regression costs every later reader the same investigation.

`test.fails` remains available and its behaviour here is collided, not assumed: a failing body reports
`1 expected fail` and the suite stays green, while a body that PASSES fails the suite with `Expect test
to fail`. That inversion is its whole value — a red contract goes red the moment it is fixed and cannot
be silently left behind. `test.todo` registers a name and runs nothing.

*When such a window closes, the vectors become ordinary tests and the header stops calling itself red.*

---

## Principles (YIN)

1. **Co-locate.** A test lives with the package it tests. No orphan test tree.
2. **No superseded-model goldens.** Git history is the archive; the working tree
   carries only what asserts the *current* model.
3. **Delete fearlessly.** A superseded suite is debt, not coverage. Nuke it; rewrite
   against the live model when the surface it covers actually exists.
