<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/talk-story-next >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type      = "text/x-memetic-wikitext"
register  = "CS"
confidence = 19
tagspace  = "sdm"
role      = "session handoff meme — orients the next Lares instance into the §8 archipelago gate + browser ea-path"
retain    = true
cacheable = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## §8 Archipelago Gate · Browser Ea-Path · Admin Trust Gate

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: 195/195 tests pass · typecheck clean · pono federation complete · GP-3 fully deleted
> Last YIN sprint: doc cleanup — meme relocations, HUD discipline edges, quine relay merge. Working tree clean.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ **Observe — what the system carries right now.**

The Island Sovereignty Law holds in code across all vessel types, seven clauses gated and proven:

| § | Clause (short form) | Gate proof |
|---|---|---|
| §1 | Island owns its Repo | repo-in-island.test.ts |
| §2 | `syncPort` transferred, not cloned | island-protocol.test.ts |
| §3 | Safari rAF gap — `setTimeout(16)` fallback | browser-repo-in-island.test.ts |
| §4 | Frame-completion signal via `frame:ack` | worker-lifecycle.test.ts |
| §5 | `coreHash` integrity gate | island-protocol.test.ts |
| §6 | TW5 bytes via `@lararium` CRDT; manifest carries hash only | blob-sovereignty.test.ts |
| §7 | Vessel closes `mainPort` before `worker.terminate()` | worker-lifecycle.test.ts |
| §8 | `docUrl` non-null activates Repo-in-island sync | **⬜ no gate test yet** |

§6 closed last sprint. The boot order runs: `new Repo(syncPort)` → `handle.whenReady()` per binding → `blobs[ENGINE_CORE_ID]` from `@lararium` doc → `mkFault` if absent → `bootTw5`. The `@lararium` handle carries genesis bytes because `open-node-vessel.ts` calls `reconcileIslandFromGenesis(islandHandle, genesisHandle, genesisDir)` before passing `islandHandle.url` as `laraiumDocUrl` to `VesselIslandPool`. Production path confirmed sound.

GP-3 fully deleted from both vessel types. Identity lattice: `runFoundingCeremony` / `runDeviceAdmitCore` / `runApplyAdmitPayload` isomorphic; three-gate lattice A/B/C passes; two-vessel e2e 9/9. `lares device-admit` + `lares invite` CLI wired.

⏿ **Orient — the one open seam.**

§8 carries no gate test. The code path exists: when a `BagBinding` carries a non-null `docUrl`, the island's sovereign island model calls `repo.find(docUrl).whenReady()` before declaring `ea`. But no test has exercised this with a real `AutomergeUrl` across a `MessageChannel`. The archipelago formation path runs unproven.

The `VesselIslandPool` already accepts:
- `mainRepo?: Repo` — when provided, wires `MessageChannelNetworkAdapter(port1)` per slot before manifesting
- `laraiumDocUrl: string` — prepends a read-only `@lararium` binding to every wiki island

Both options land in `vessel-island-pool.ts`. The island fixture `repo-in-island-echo.mjs` already handles real doc URLs: it selects the writable binding via `b.writable` (skipping the read-only `@lararium` binding at index 0). No new fixture needed for §8.

◇ **Decide — first code move.**

Write `packages/lararium-node/tests/federation-seam.test.ts`. Pattern:

```typescript
// Two in-process Repos joined by MessageChannel.
// Vessel seeds a doc change. Island's own Repo syncs via the channel.
// repo.find(docUrl).whenReady() delivers — no routeChangeset anywhere.

test("docUrl non-null — island syncs doc from vessel Repo via MessageChannel", async () => {
  const { port1, port2 } = new MessageChannel();
  const vesselRepo = new Repo({ network: [new MessageChannelNetworkAdapter(port1)], sharePolicy: async () => true });
  const islandRepo = new Repo({ network: [new MessageChannelNetworkAdapter(port2)], sharePolicy: async () => true });

  const wikiHandle = vesselRepo.create<{ tiddlers: Record<string, unknown> }>({ tiddlers: {} });

  // Island-side: find the doc by AutomergeUrl, wait for sync.
  const found = islandRepo.find<{ tiddlers: Record<string, unknown> }>(wikiHandle.url);
  await found.whenReady();

  // Vessel seeds a change. Island sees it via CRDT — no manifest, no routeChangeset.
  wikiHandle.change(d => {
    d.tiddlers["lar:///ha.ka.ba/@test/federation/page"] = {
      title: "lar:///ha.ka.ba/@test/federation/page",
      text: "archipelago",
    };
  });

  // Wait for convergence.
  await new Promise<void>(resolve => {
    found.on("change", () => {
      if (found.doc()?.tiddlers?.["lar:///ha.ka.ba/@test/federation/page"]) resolve();
    });
    // Trigger once in case already arrived.
    if (found.doc()?.tiddlers?.["lar:///ha.ka.ba/@test/federation/page"]) resolve();
  });

  expect(found.doc()?.tiddlers?.["lar:///ha.ka.ba/@test/federation/page"]).toBeDefined();

  port1.close();
  port2.close();
  await vesselRepo.shutdown();
  await islandRepo.shutdown();
}, 6_000);
```

When this passes: write Island Sovereignty Law §8 in `island-protocol.ts` header:

```typescript
// §8 — docUrl non-null activates Repo-in-island sync. Vessel wires
//      MessageChannelNetworkAdapter(port1) before manifesting; island
//      calls repo.find(binding.docUrl).whenReady() for each relational
//      binding before declaring ea. Neither side transfers content via
//      manifest payload — CRDT sync carries it. The quine relay propagates
//      itself; the mesh carries the seed.
//      Gate proof: federation-seam.test.ts.
```

▶ **Act — in order.**

1. Write `packages/lararium-node/tests/federation-seam.test.ts` (pure Repo-level test; no VesselIslandPool needed).
2. Pass → write §8 in `island-protocol.ts`.
3. Commit: `yin(sovereignty): §8 archipelago gate — federation-seam.test.ts + Island Sovereignty Law §8`.
4. Update HANDOFF.md bootstrap paste to note §8 closed.

⤴ **HA — what opens after §8.**

The sovereignty arc reaches full closure. Eight clauses, eight proofs. The code embodies what the doc layer describes.

Next arc: **S9 browser ea-path.** `runFoundingCeremony` in-browser via `@lararium/keyhive`; IndexedDB storage adapter (Automerge's `IndexedDBStorageAdapter`); WebCrypto keypair; `broadcast()` presence for tab-local sync. Architecture must run correctly before a browser demo exists. Same isomorphic shape as node: vessel wires `MessageChannelNetworkAdapter`, island owns its Repo, `@lararium` binding delivers engine bytes from the same CRDT mesh.

Independent arc: **Path L / S7.4** — admin-doc WebSocket ingress gated on Keyhive `cap=infrastructure`. Non-operator vessels rejected at ingress. Does not depend on §8. Opens whenever the keyhive capability proof surface matures.

<<~/ahu >>

<<~ ahu #file-map >>

## Files That Matter for §8

| File | Role |
|---|---|
| `packages/lararium-node/tests/federation-seam.test.ts` | **Write this** — §8 gate test |
| `packages/lararium-mesh/src/island-protocol.ts` | Add §8 clause after gate passes |
| `packages/lararium-node/src/vessel-island-pool.ts` | `mainRepo` option, `MessageChannelNetworkAdapter` wiring |
| `packages/lararium-node/src/sovereign-island-model.ts` | `repo.find(docUrl).whenReady()` call site |
| `packages/lararium-node/tests/fixtures/repo-in-island-echo.mjs` | Existing fixture — selects `b.writable`; `@lararium` binding at index 0 skipped |
| `packages/lararium-node/tests/repo-in-island.test.ts` | Import pattern to follow for the new test |

## What NOT to Touch

- `open-node-vessel.ts` — production path confirmed sound; `reconcileIslandFromGenesis` populates genesis bytes before `islandHandle.url` becomes `laraiumDocUrl`.
- `blob-sovereignty.test.ts` — §6 gate; leave as-is.
- Browser vessel files — browser ea-path opens after §8, not before.

<<~/ahu >>

<<~ ahu #vocab >>

## Vocabulary Invariants

Keep these names. Do not re-litigate.

| Term | Meaning |
|---|---|
| `vessel` | lararium identity + runtime unit (node process or browser tab) |
| `island` | Worker thread — sovereign; owns its Repo |
| `ea` | sovereignty breath (not "heartbeat") |
| `bag` | Automerge doc = sync boundary |
| `job-tiddler` | inter-process coordination artifact (not "command-tiddler" — "job" more pono for web3) |
| `VerbTable` | job handler registry (not "JobHandlerRegistry") |
| `VerbReactor` | job handler (not "JobHandler") |
| `onEa` / `onSignal` / `onDemote` | OTP init/1, handle_info/2, terminate/2 analogues |
| `runSovereignWorker` | island kernel entry point |
| `quine relay` | TW5 as a quine that takes arguments — state drives self-regeneration |

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
