<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >> -->

<<^ code:"&#x0001;" namespace:"ॐ ँ" ? -> lar:///ha.ka.ba/sdm/handoff/talk-story-next >>
```toml iam
uri-path  = "ha.ka.ba/sdm/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type      = "text/x-memetic-wikitext"
register  = "CS"
confidence = 20
l-space   = "sdm"
role      = "session handoff — S9 browser ea-path · dual-surface vision · YIN ground"
retain    = true
cacheable = false
```

<<^ code:"&#x0002;" >>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## Isomorphism Campaign Closed · Next: the Local-Verifiability Wall

> ⚠ **STALE — FROZE 2026-06-06.** This floor's "next vector" (the local-verifiability wall) CLOSED 2026-06-07 (`4834c66d`), and the work moved on through LOAD → INGEST → the watcher (live handoff: `bags/lares/ha.ka.ba/lares/docs/handoff.md`). The genuinely-open floor now is the **watcher-seams talk-story** (deletions heaviest) in that bags torch, SUSPENDED. The counts below (mesh 236 etc.) are obsolete — real state 2026-06-14: mesh 275 · tw5 113 · node 124 · browser 13 (4 ingest RED found + fixed this session, fixture drift).

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: **typecheck 10/10 · mesh 236 · tw5 73 · node 94 · browser 20** — green; dist-build verified 2026-06-06.
> Last arc: isomorphism-by-composition campaign COMPLETE (5 mirror pairs + `resolveOracleDoc` + bag-vocab single-source + YIN comment pass). S9 browser ea-path closed. Dual-surface vision (below) still stands as the horizon.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ **Observe — ground state**

The sovereignty arc closes completely. Eight clauses, eight gate proofs. All in `island-protocol.ts`:

| § | Clause | Gate |
|---|---|---|
| §1 | Island owns its Repo | `repo-in-island.test.ts` |
| §2 | `syncPort` transferred, not cloned | `island-protocol.test.ts` |
| §3 | Safari rAF — `setTimeout(16)` fallback | `browser-repo-in-island.test.ts` |
| §4 | Frame signal via `frame:ack` | `worker-lifecycle.test.ts` |
| §5 | `coreHash` integrity gate | `island-protocol.test.ts` |
| §6 | TW5 bytes via `@lararium` CRDT | `blob-sovereignty.test.ts` |
| §7 | Vessel closes `mainPort` before terminate | `worker-lifecycle.test.ts` |
| §8 | `docUrl` non-null → Repo-in-island sync | `federation-seam.test.ts` + `browser-repo-in-island.test.ts` test 2 |

**YIN ground clean:** `FFZ_LEVEL_NAMES` (no consumers), `pluginBlob` (required field nobody read), `legacyScalarToPonoLevel` + `legacy01` (no legacy data in early alpha), two stale historical tombstones in `resolver.ts` and `base-doc.ts` — all deleted. `BrowserAuthorityBootParams` uses `bagBindings` only; deprecated `bagStack`/`docUrl` shim gone. `island-protocol.ts` comments reflect what the manifest actually carries.

**Production path confirmed:** `reconcileIslandFromGenesis` runs at line ~217 in `open-node-vessel.ts`; `VesselIslandPool({ laraiumDocUrl: islandHandle.url })` at line ~728. Genesis bytes populate the handle before the URL reaches the pool. §6 will not silently fault in production.

⏿ **Orient — the open arc**

The isomorphism campaign closed; both vessels read as thin host seams over shared cores. The next burning arc is the **local-verifiability wall**: host-delegated verbs run UNVERIFIED. `mountMainVerbs(registry, verifier?)` (`tw5/admin-vm-core.ts`) takes an optional verifier; both vessels pass none (`open-node-vessel.ts:544`, `open-browser-vessel.ts:462`), so `admin:delegate-verb` → `runLocalVerb` executes host verbs (where / resolve / residency / add-bag / …) with no capability check. This breaks the protocol's load-bearing invariant: never trust a claim you cannot verify locally.

| Fork | Shape |
|---|---|
| A — main calls back | wire `adminVm.authSeam.verify` into `mountMainVerbs`; main round-trips to the worker's keyhive per verb |
| B — verify-then-delegate (cleaner) | the admin worker verifies the cap in its `delegate-verb` dispatch BEFORE posting to main; main runs pre-verified |

Operator settles A vs B before the fix. Origin: the Stage-1 keyhive host→worker move (`65d82084` / `b5e87384`) left the main-thread verb registry without its verifier.

**Dual-surface vision** — what S9 makes possible:

The operator and the Lares instance share two surfaces:

1. **The chat surface** — IDE extension, CLI, browser app, desktop app. Where the conversation lives. Ephemeral in the current session; durable if the conversation bag lands in the CRDT mesh.
2. **The lararium quine-relay-wiki** — the TW5 wiki running inside the browser vessel. Durable, federated, operator-owned. CRDT-backed. The wiki IS the memory substrate — not a log, not a transcript, a living document fabric.

Both surfaces reach the same bags. The operator writes in the wiki; the Lares instance reads the same tiddlers via CRDT sync. The conversation leaves traces in the wiki; the wiki shapes the conversation. No server holds the truth. The operator's identity lattice holds it.

◇ **Decide — S9 first moves, in order**

1. **Wire `IndexedDBStorageAdapter`** — `BrowserVesselIslandPool` options accept `storage?: IslandStorageConfig`. The `idb` variant already exists in the type. Wire it into the pool and pass through `mkManifest`.
2. **`runFoundingCeremony` in-browser** — `browser-founding.ts` calls `runFoundingCeremony({ crypto: self.crypto })`. Gate test: three-gate lattice A/B/C passes.
3. **`BroadcastChannelNetworkAdapter`** — tab-local sync. Two tabs sharing the same channel name sync the same `@lararium` doc without a network hop.
4. **`browser-ea-path.test.ts`** — end-to-end: browser vessel boots, founding ceremony runs, wiki island declares ea, CRDT change propagates.

▶ **Act — file map**

| File | Move |
|---|---|
| `packages/lararium-browser/src/browser-vessel-island-pool.ts` | Wire `storage: IslandStorageConfig` option → pass through `mkManifest` |
| `packages/lararium-browser/src/browser-sovereign-island-model.ts` | Construct `IndexedDBStorageAdapter` on `storage.type === "idb"` |
| `packages/lararium-browser/src/browser-founding.ts` | **New** — `runBrowserFoundingCeremony({ crypto })` |
| `packages/lararium-browser/tests/founding-ceremony-browser.test.ts` | **New** — three-gate lattice in browser |
| `packages/lararium-browser/tests/browser-ea-path.test.ts` | **New** — full S9 arc gate |

**What NOT to touch:**
- `island-protocol.ts` — §8 clause and gate proofs final
- `federation-seam.test.ts` — §8 gate; landed and closed
- Node vessel files — sovereignty arc complete; S9 is browser-only

⤴ **HA — what opens after S9**

The browser vessel breathes its own sovereignty. Node + browser share one `@lararium` CRDT doc.

**After S9 → live multiplayer** — node + browser sharing one wiki bag via `docUrl` federation. §8 gate already proves the primitive. The two-vessel demo needs a running second vessel and a known bag `AutomergeUrl`.

**After live multiplayer → chat-as-bag** — conversation turns as tiddlers in a shared bag. Operator writes; Lares instance reads via CRDT sync and responds. Both sides see the same document. The conversation persists in the operator's own fabric. No server. No log. A record.

**Independent arc: Path L / S7.4** — admin-doc WebSocket ingress gated on Keyhive `cap=admin`. Does not depend on S9. Opens when the keyhive capability proof surface matures.

<<~/ahu >>

<<~ ahu #file-map >>

## Files That Matter for S9

| File | Role |
|---|---|
| `packages/lararium-browser/src/browser-vessel-island-pool.ts` | Wire `storage` option |
| `packages/lararium-browser/src/browser-sovereign-island-model.ts` | `IndexedDBStorageAdapter` construction |
| `packages/lararium-browser/src/browser-founding.ts` | **Write** — `runBrowserFoundingCeremony` |
| `packages/lararium-node/src/open-node-vessel.ts` | Pre-flight cleared; do not change |
| `packages/lararium-node/tests/federation-seam.test.ts` | **✅ §8 gate** — leave as-is |
| `packages/lararium-mesh/src/island-protocol.ts` | **✅ §8 clause** — leave as-is |
| `packages/lararium-node/tests/blob-sovereignty.test.ts` | **✅ hardened** — leave as-is |

<<~/ahu >>

<<~ ahu #vocab >>

## Vocabulary Invariants

| Term | Meaning |
|---|---|
| `vessel` | lararium identity + runtime unit (node process or browser tab) |
| `island` | Worker thread — sovereign; owns its Repo |
| `ea` | sovereignty breath — island declares it after boot completes |
| `bag` | Automerge doc = sync boundary |
| `verb-tiddler` | inter-process coordination artifact |
| `VerbTable` | job handler registry |
| `VerbReactor` | job handler |
| `onEa` / `onSignal` / `onDemote` | OTP init/1 · handle_info/2 · terminate/2 |
| `runSovereignWorker` | island kernel entry point |
| `quine relay` | TW5 as a quine that takes arguments — state drives self-regeneration |
| `archipelago` | federation of vessels sharing bags via AutomergeUrl |
| `dual-surface` | chat (ephemeral conversation) + wiki (durable CRDT fabric) — both reach the same bags |

<<~/ahu >>

<<~ ahu #rules >>

## Rules — Do Not Re-Decide

- `@lares/cli` remains its own package.
- `@keyhive/keyhive` / concap remains the capability substrate; do not pivot to UCAN.
- Canonical system tiddlers use `lar:///` titles; `$:/` only for TW5 core contracts TW5 owns.
- `<<~/sigil >>` closing tag convention.
- Web3 only — no web2 models, code, or flows in the Lares stack.
- TW5 VM primacy — if logic can live in the VM, keep it there.
- Bag = Automerge doc = sync boundary.
- No manifest byte transfer — TW5 core bytes travel via `@lararium` CRDT.
- Canon requires operator gesture through an ACTION verb (`ADD COPY MOVE CLEAR DROP LOAD`). Every residency change writes an indelible effect record tagged with the matching archival verb (`accession`, `deaccession`, `transfer`, `withdrawal`, …). No silent unlink. The CLI surface lives at `lares act` (Sprint 5 of the Residency Model Epic ships the handler family). The prior `lares promote` ceremony retired 2026-05-31 — see [bags/lares/api/lararium/residency-model.md](../bags/lares/api/lararium/residency-model.md) and [packages/EPIC-RESIDENCY-MODEL.md](EPIC-RESIDENCY-MODEL.md).
- Conflict resolution surfaces to operator-agent or cabal Talk Story; the CRDT layer detects + records, never decides. Automated arbitration reads as anti-pono. (See agent memory slug `project-talk-story-conflict-surfacing`, and the `#conflict-resolution` ahu in [bags/lares/api/lararium/residency-model.md](../bags/lares/api/lararium/residency-model.md).)
- Git diff remains the visible signature.

<<~/ahu >>

<<~ ahu #smokes >>

## Useful Smokes

```sh
pnpm test:unit                                         # 196/196
pnpm --filter @lararium/node exec vitest run           # 52 node tests
pnpm --filter @lararium/browser exec vitest run        # 5 browser tests (Chromium)
pnpm --filter @lararium/node exec tsx scripts/test-quine.ts
pnpm --filter @lararium/tw5 exec tsx scripts/smoke-plugin-boot.ts
```

<<~/ahu >>

<<^ code:"&#x0003;" >>

<<^ code:"&#x0004;" -> ? >>
