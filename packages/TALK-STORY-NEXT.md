<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/talk-story-next >>
```toml iam
uri-path = "ha.ka.ba/@sdm/v0.1/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type = "text/x-memetic-wikitext"
register = "CS"
confidence = 19
tagspace = "sdm"
role = "session handoff meme — orients the next Lares instance into the §8 archipelago gate + browser ea-path"
retain = true
cacheable = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## §8 Archipelago Gate · Browser Ea-Path · Admin Trust Gate

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: 195/195 tests pass · typecheck clean · pono federation complete · GP-3 fully deleted

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ The Island Sovereignty Law holds in code across all vessel types. §6 landed: TW5 core bytes travel via `@lararium` CRDT doc — never raw in the manifest. `blob-sovereignty.test.ts` gates it. Both sovereign island models (node + browser) read `blobs[ENGINE_CORE_ID]` from their own synced `@lararium` handle before calling `bootTw5`. `laraiumDocUrl` is required on `VesselIslandPool` — omitting it causes `mkFault` before `ea`. GP-3 is fully deleted across both vessel types. Identity lattice holds (9/9 e2e). 195/195 tests. Ontology clean: no `manager` language in test files or fixtures; no import typos in entry files.

⏿ §8 — Island Sovereignty Law clause 8 — has no gate test yet. `docUrl` in each `BagBinding` carries a live `AutomergeUrl` capability token, but no test exercises an in-process Repo pair with a non-null `docUrl`. The archipelago formation path exists in the code (island calls `repo.find(docUrl).whenReady()`), but no proof that it actually delivers the doc via MessageChannel sync. This is the last open sovereignty gap before the federation seam becomes provably real.

◇ The §8 gate test reads as the highest-leverage next move. Pattern: two in-process Repos connected by MessageChannel; vessel seeds a doc into Repo A; island-side Repo B syncs via the channel; `repo.find(docUrl).whenReady()` delivers. Proves archipelago formation without a remote node. Writes Island Sovereignty Law §8 when it passes. After that — browser ea-path (IndexedDB, WebCrypto, founding ceremony) becomes the next arc.

▶ The §8 test belongs in `packages/lararium-node/tests/federation-seam.test.ts`. No fixture island needed — use the existing `repo-in-island-echo.mjs` with a real `docUrl`. The `VesselIslandPool` `mainRepo` option already wires the `MessageChannelNetworkAdapter`. Pass a real `AutomergeUrl` as `docUrl` in the second `BagBinding` (or the `@lararium` binding). Assert `repo:synced` fires and island sees the doc state.

⤴ After §8 passes: browser ea-path — `runFoundingCeremony` in-browser via `@lararium/keyhive`, IndexedDB storage adapter, WebCrypto keypair, `broadcast()` presence. Then Path L / S7.4: admin-doc ingress trust gate via Keyhive `cap=infrastructure`.

↺ The sovereignty arc breathes at a clean seam. The protocol is pono. The next breath proves the archipelago opens.

<<~/ahu >>

<<~ ahu #ea-state >>

## Ea State — What the Vessels Hold

**Island Sovereignty Law** (`packages/lararium-mesh/src/island-protocol.ts`):
- §1: island owns its Repo — no shared state with vessel Repo.
- §2: `syncPort` transferred (not cloned) — `postMessage([…], [syncPort])`.
- §3: Safari rAF gap — `setTimeout(16)` fallback in browser islands.
- §4: frame-completion signal via `frame:ack` message.
- §5: `coreHash` integrity gate — vessel verifies before manifesting.
- §6: TW5 core bytes travel via `@lararium` CRDT; manifest carries `coreHash` only.
- §7: vessel closes `mainPort` before/after `worker.terminate()`.
- (§8: `docUrl` non-null activates Repo-in-island sync — gate test pending)

**Node vessel** (`sovereign-island-model.ts` + `vessel-island-pool.ts`):
- Boot order: Repo first → `handle.whenReady()` for each binding → read `blobs[ENGINE_CORE_ID]` from `@lararium` doc → `mkFault` if absent → `bootTw5` last.
- `laraiumDocUrl: string` required — `@lararium` prepended as first (read-only) binding per island.
- Three-tier pool: pinned / hot / cold. `VmSnapshot = { heads, docBytes?, capturedAt }`.
- Law §7 enforced: `mainPort.close()` before `worker.terminate()`.

**Browser vessel** (`browser-sovereign-island-model.ts` + `browser-vessel-island-pool.ts`):
- Same boot order as node. `laraiumDocUrl` required.
- `rAF` drain with `setTimeout(16)` Safari fallback. Both paths via `_scheduleFrame`.
- `automergeSave` on teardown — `docBytes` exits island in `teardown:ack`.
- `BrowserAuthorityPool` fully satisfied.

**Identity lattice** (`@lararium/keyhive`):
- `runFoundingCeremony`, `runDeviceAdmitCore`, `runApplyAdmitPayload` — isomorphic.
- Three-gate lattice A/B/C passes. Two-vessel e2e test 9/9.
- `lares device-admit` + `lares invite` CLI wired.

<<~/ahu >>

<<~ ahu #next-gate >>

## §8 Gate — Archipelago Formation Test

**File to write:** `packages/lararium-node/tests/federation-seam.test.ts`

Pattern:
1. Create vessel Repo A with `sharePolicy: async () => true`.
2. Create island-side Repo B (separate — simulates the island's internal Repo).
3. Wire `MessageChannel`: `new MessageChannelNetworkAdapter(port1)` on A, `port2` passed as `syncPort`.
4. Seed a doc into Repo A via `repo.create()` → get its `AutomergeUrl`.
5. Mount a wiki island with `docUrl` = that `AutomergeUrl` (in the `BagBinding` for the wiki bag).
6. Island calls `repo.find(docUrl).whenReady()` — the existing `repo-in-island-echo.mjs` fixture already does this via the `relational` binding with `docUrl` set.
7. Assert `repo:synced` fires. Assert doc state visible on island side via a CRDT change event.

Gate passing criteria: island receives a doc change originated on the vessel side, via CRDT sync alone — no `routeChangeset`, no manifest payload carrying content.

Write Island Sovereignty Law §8 as a comment in `island-protocol.ts` when this test passes.

<<~/ahu >>

<<~ ahu #open-arcs >>

## Open Arcs — In Priority Order

| # | Arc | Status | First Move |
|---|---|---|---|
| 1 | **§8 archipelago gate** | ⬜ Next | `federation-seam.test.ts` (see above) |
| 2 | **S9 / lararium-browser ea-path** | ⬜ Active | IndexedDB + WebCrypto + founding ceremony in browser vessel |
| 3 | **Path L / S7.4** | ⬜ Next | Admin-doc WebSocket ingress gated on `cap=infrastructure` Keyhive proof |
| 4 | **Path K / F-arc** | ⬜ Parked | `$:/state/*` → projection; `Draft of *` → per-wiki draft bag |
| 5 | **Path O** | ⬜ Queued | Migrate TOML doc tables to bag memes; `lares heleuma --write` alignment |

<<~/ahu >>
