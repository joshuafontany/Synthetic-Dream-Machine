# Lararium Node — Tasked Spirits Research Packet

**Date:** 2026-05-01 (updated 2026-05-01)
**Voice:** Lares (Scryer/Council)  
**Topic:** Automerge sync cost, internal causal islands, TW5 recipe/bag composition, room/corpus/presence/draft/projection architecture, authorization readiness, and prior art.

---

## 0. Operator problem statement

### Current island layout (canonical, 2026-05-01)

```
catalog doc  ─── engine entry { version, docUrl, sha256 }
             │
             ├── lararium doc (LarariumDoc)
             │     blobs["tiddlywikicore"] = { blob: Uint8Array, sha256, version }
             │     (TW5 core + plugins — no CDN dependency after first peer seed)
             │
             ├── corpus docs  (one per bag: lares, elyncia, ftls, sdm, …)
             │     MemeStoreDoc — carrier tiddlers from lares/ projection
             │
             └── room docs  (one per roomId — starts EMPTY)
                   MemeStoreDoc — user content, pins, room-local overrides
```

Browser CompositeStore recipe (lowest → highest priority):

```
corpus islands  (bag: slug,   read-only)  — arrive async, non-blocking
room island     (bag: "room", writable)   — primary content gate
```

### Disk projection law (Fontany-Fuller-Zelenka, 2026-05-01)

**The disk is a projection. The Automerge store is the mind.**

`LarDiskProjector` (store → disk, unidirectional) replaced the old inline `exportCarrierText` subscriber. The projector reads `carrier-text` from the store record — never from disk. Slot edits patch surgically via `replaceCarrierSlot`. The `writing` Set guards against file-watcher echo.

`NodeMemeStore` (`packages/lararium-node/src/node-meme-store.ts`) wraps a `DocHandle<MemeStoreDoc>` as a `LarTiddlerStore` for the server side.

### Engine island law (2026-05-01)

The TW5 engine (`tiddlywikicore-*.js`) lives in its own `LarariumDoc` corpus island. The catalog holds only `{ version, docUrl, sha256 }`. The Service Worker verifies sha256 before caching. Any mesh peer can seed the blob — no CDN authority required. Mid-session updates travel over Automerge sync and trigger the TW5 update-available banner.

### Current milestone state (updated 2026-05-01, sprint 2)

| Milestone | Status |
|---|---|
| A — Readiness Map | `ReadinessMap` in `@lararium/mesh`. `snapshot` key renamed `sw-shell` (FFZ-correct: lights when SW controls page, not server-rendered HTML). Browser marks: `auth`, `sw-shell`, `catalog`, `room-content`, `corpus:*`, `tw-vm`. `room-presence`, `tldraw-doc`, `mcp-index`, `disk-projector`, `kowloon-feed` declared but not yet lit. `disk-projector` now lights on first `LarDiskProjector` flush. ~70% |
| B — Catalog Island | `CatalogDoc` fully wired. `engine`, `corpora`, `rooms` entries. ~100% |
| B.1 — Engine Island | `LarariumDoc` blob + sha256. SW verification + mesh-native delivery. Resume boot now calls `reconcileEngineBlobIfChanged` — re-ingests updated TW5 core if disk sha differs from stored sha. ~100% |
| C — First-paint (FFZ) | No server-rendered snapshot — rejected as web2 SPA pattern. `sw-shell` readiness key lights when SW controls page (warm: immediate; cold: `controllerchange`). App shell serves from SW cache. Automerge islands hydrate in background. ~60% |
| D — Recipe/bag live surface | `CompositeStore` + per-recipe TW5 VMs done. `BAG_IDS` constants (`system`, `room`, `draft`, `projection`) + `corpusBagId()` factory added. `hasBag()` guard prevents duplicate registration. Priority order locked. System and projection store implementations still pending. ~80% |
| E — Draft MOVE (residency ACTION) | `PromotionReceipt` type in `causal-island.ts`. `promoteDraft` stub on `NodeMemeStore` with ability-ladder guard (`promote` required). 6 `abilityImplies` guard tests passing. Head-tracking and projection invalidation pending. ~25% |
| F — Presence split | Not started. ~0% |

**FFZ web3 principle (locked 2026-05-01):** No server-rendered CRDT projections served as HTML. The disk and any HTTP response are projections; the Automerge store is the mind. `sw-shell` replaces `snapshot` across the codebase.

### Auth state (updated 2026-05-01)

| Provider | Status |
|---|---|
| `gh` CLI auto-auth | Wired. Server reads `gh auth token` on startup; injects `LarAuthReceipt` as `<meta name="lararium-operator-receipt">`. Developer path: zero browser interaction. |
| Bluesky AT Proto OAuth | Browser client wired via `@atproto/oauth-client-browser`. Server serves `/oauth/client-metadata.json`. Localhost loopback client works without public domain. Primary path for end users. |
| GitHub web OAuth | Scaffolded and env-var-gated (`GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`). Returns 501 until an OAuth App is registered. |
| `local-dev` | Fallback when `gh` CLI is unavailable (container path). |

### Prior QA issues

| Issue | Root cause | Current posture |
|---|---|---|
| 403 static assets | Pre-existing | Resolved |
| E2E cold boot ~50s | `handle.whenReady()` decodes ~760KB single Automerge doc | Island split: room doc starts empty (instant); lares corpus doc carries memes. Warm IDB returns <5s. Cold first-visit cost has moved to the lares corpus doc size. Milestone C (static projection lane) is the correct long-term fix. |
| E2E `waitForFunction` hangs | `Promise.all(331 microtasks)` starves event loop | Chunked 50-at-a-time with `setTimeout(0)` yield |
| `TimeoutNegativeWarning` | Upstream `automerge-repo` `throttle.js` bug | Known upstream issue |
| `'message' handler 210ms` | Automerge WASM CRDT merge per WS message | Architectural; warm IDB eliminates return-visit pain |

Primary concern resolved: the single cosmological Automerge doc has been split into catalog + engine + corpus + room islands. `CompositeStore` composes them via TW5 recipe order. Auth gate precedes content sync. Disk is a unidirectional projection from store.

Remaining concern: first cold-visit boot cost lives in the lares corpus doc. Milestone C closes this.

---

## 1. Executive synthesis

The researched prior art converges on a strong design line:

> **Automerge docs should follow collaboration, authority, loading, and causality boundaries. TW5 recipes should compose those docs into live surfaces. Snapshots should provide first paint. Presence should not share fate with durable content. Authorization must not depend on a giant content doc being ready.**

This suggests a Lararium architecture shaped like:

```text
Auth / capability island
  proves who may ask, before content sync completes

Catalog / root island
  small, fast, names rooms, corpora, recipes, doc URLs, snapshot URLs, heads, policies

Corpus islands
  durable Automerge docs: SDM/FTLS, Ars Magica, Discordian library, silat videos, concept art

Room content islands
  situated meaning: pins, recipe selection, room notes, promoted room-local artifacts

Presence island
  ephemeral weather: cursors, camera, selections, who is watching, typing, attention

Draft island
  high-churn local TW5 draft-of tiddlers, private layers, agent proposals

Projection islands
  rebuildable shadows: TW render bundles, MCP resource views, disk write-back, Kowloon events
```

Doctrine:

```text
Auth proves who may ask.
Catalog says what exists.
Corpus docs hold durable memory.
Room docs hold situated meaning.
Presence holds weather.
Drafts hold breath.
Snapshots give first light.
TW5 recipes compose the live surface.
Automerge sync makes the surface alive.
Receipts prevent projection from becoming counterfeit canon.
```

---

## 2. Prime ingest queue — Brooklyn Zelenka / Ink & Switch / Keyhive vein

### P0 — Keyhive: Local-first access control

**Source:** Ink & Switch Keyhive project page  
**URL:** https://www.inkandswitch.com/project/keyhive/  
**Ingest reason:** This is the central Brooklyn Zelenka hard reference for Lararium.

Keyhive is framed as local-first access control for collaborative applications. It grants and revokes the ability to **synchronize, read, write, or administer** local-first data while respecting offline and concurrent operation. It introduces **convergent capabilities** and co-designs with **Beelay**, an encrypted sync protocol able to move end-to-end encrypted payloads that sync servers cannot decrypt.

**Lararium translation:**

- Treat authorization and sync as a shared design problem.
- Separate **pull**, **read**, **write**, and **admin** effects.
- Do not rely on document URL secrecy.
- A sync relay should move bytes and document-head metadata without becoming the authority or plaintext owner.
- Capability state belongs near the doc graph, not only in a central web session.

### P0 — Keyhive lab notebook

**Source:** Ink & Switch Keyhive notebook  
**URL:** https://www.inkandswitch.com/keyhive/notebook/  
**Ingest reason:** Best source for design pressures and failure modes.

Keyhive names several principles that directly apply:

- Local-first cannot assume a central network boundary as the enforcement layer.
- Access control must be clear enough to satisfy “least surprise.”
- “Rumpelstiltskin” / Swiss-number security fails when doc IDs leak.
- Auth must be foundational because storage and sync depend on encrypted-at-rest data.
- Sync and secrecy interact: sync wants metadata for efficient deltas; cryptography wants metadata minimization.
- “Pull access” is weaker than read/write: a peer may retrieve ciphertext without being able to decrypt it.

**Lararium translation:**

- Automerge document IDs are locators, not authority.
- “Can pull bytes,” “can decrypt/read,” “can materialize/write,” and “can promote/admin” should be distinct capability effects.
- The catalog may expose document existence while still restricting pull/read/write.
- Projection snapshots should carry enough receipt metadata to reconcile without leaking content across security domains.

### P0 — Authomerge notes by Brooklyn Zelenka

**Source:** Brooklyn Zelenka notes, “Authomerge”  
**URL:** https://notes.brooklynzelenka.com/Notes/Authomerge  
**Ingest reason:** Earlier design exploration, renamed to Keyhive.

Authomerge’s stated goals include:

- Coarse read control.
- Granular write control.
- Partition-tolerant revocation.
- Post-compromise security.
- Trust-minimized sync servers.
- Avoiding central authority where possible.
- Tens-of-thousands of documents and thousands of writers as scale targets.

**Lararium translation:**

- Corpus/room/presence split should not be treated as mere performance sharding. It is also an authorization scale boundary.
- One giant doc makes granular write control harder.
- Revocation needs causal semantics; the system must decide how to handle writes concurrent with revocation.
- The architecture should preserve room/corpus authority histories separately.

### P0 — UCAN

**Sources:**  
- UCAN specification: https://ucan.xyz/specification/  
- UCAN overview: https://ucan.xyz/  
- Brooklyn Zelenka UCAN notes: https://notes.brooklynzelenka.com/Notes/User-Controlled-Authorization-Networks

**Ingest reason:** UCAN supplies the capability vocabulary around delegable, verifiable, offline authorization.

UCAN is a user-controlled, local-first, delegable authorization scheme. It supports public-key verifiable capability chains, delegation, revocation, invocation, and transport-agnostic containers.

**Lararium translation:**

- BlueSky/ATProto OAuth answers “which account authenticated.”
- UCAN/Keyhive-style capabilities answer “what can this actor/device/agent do to this room/corpus/projection while offline.”
- Agentic write-back should use explicit invocations, not ambient authority.
- Delegated tasked spirits should carry narrow caveats: read-only, propose-only, promote denied, corpus-specific, room-specific, time-limited.

### P1 — Keyhive BeeKEM and Beelay details

**Sources:**  
- BeeKEM notebook: https://www.inkandswitch.com/keyhive/notebook/02/  
- Syncing Keyhive notebook: https://www.inkandswitch.com/keyhive/notebook/05/  
- Dispatch open-sourcing Keyhive/Beelay: https://www.inkandswitch.com/newsletter/dispatch-010/

**Ingest reason:** These add sync-architecture detail beyond “access control.”

Beelay sync proceeds in layers:

1. Authenticate peers by key.
2. Sync Keyhive membership graph.
3. Sync document collection state.
4. Sync individual documents.

The document collection sync includes document IDs and hashes of document heads / BeeKEM operations.

**Lararium translation:**

- Do not start sync by fetching the biggest corpus.
- First sync identity/capability graph.
- Then sync catalog / collection summaries.
- Then decide which corpus and room docs are in scope.
- Then hydrate individual docs by priority.
- This is almost exactly the “auth readiness → catalog readiness → room readiness → corpus readiness” ladder.

---

## 3. Prime ingest queue — Automerge and sync cost vein

### P0 — Automerge Modeling Data

**Source:** Automerge Modeling Data  
**URL:** https://automerge.org/docs/cookbook/modeling-data/

Important findings:

- Applications may use many Automerge documents.
- Hundreds of docs should be fine; thousands can impose high overhead.
- PushPin used very granular docs and gained benefits but also incurred sync overhead.
- Fewer documents loaded into memory or over the network at a time reduces startup and sync time.
- Performance depends heavily on workload; measure with your actual data.

**Lararium translation:**

- The answer is not “one doc” or “one doc per tiddler.” It is a middle-grained island model.
- Likely good starting granularity:
  - 1 small catalog/root doc.
  - 1 doc per durable corpus.
  - 1 room content doc per live surface.
  - Presence separate from durable content.
  - Drafts local or room-local until promotion.
- Avoid thousands of tiny docs until sync infrastructure supports them well.

### P0 — Automerge Repo storage and IndexedDB

**Sources:**  
- Storage docs: https://automerge.org/docs/reference/repositories/storage/  
- Local storage and sync tutorial: https://automerge.org/docs/tutorial/local-sync/  
- Under-the-hood storage: https://automerge.org/docs/reference/under-the-hood/storage/

Important findings:

- A Repo without a storage adapter is transient and must reload from remote peers every restart.
- Browser storage uses `IndexedDBStorageAdapter`.
- Automerge Repo storage saves incremental changes and occasionally compacts them into snapshots.
- Multiple tabs can safely use the same storage; changes merge on refresh even without live tab sync.

**Lararium translation:**

- Your warm IndexedDB behavior is not a hack; it is the intended fast path.
- Return visits should hydrate from IndexedDB first.
- Cold visits still need snapshot/projection first-paint support.
- If the app supports multiple tabs, presence/live updates need a BroadcastChannel-style or equivalent adapter separate from persistent storage.

### P0 — Automerge binary format / save / incremental save

**Sources:**  
- Binary Document Format: https://automerge.org/automerge-binary-format-spec/  
- `save()`: https://automerge.org/automerge/api-docs/js/functions/save.html  
- `saveIncremental()`: https://automerge.org/automerge/api-docs/js/functions/saveIncremental.html

Important findings:

- Automerge has a compact binary document format designed for storage and transfer.
- `save(doc)` exports compressed bytes suitable for `load` / `loadIncremental`.
- `saveIncremental(doc)` creates appendable binary save data.

**Lararium translation:**

- Snapshot-over-HTTP can be grounded in Automerge’s binary serialization and/or projection-specific snapshots.
- A “first light” snapshot can include:
  - projection hash,
  - source doc ID(s),
  - source heads,
  - schema/projection version,
  - authorization/capability receipt,
  - fallback TW tiddler bundle for rendering before live doc readiness.

### P1 — Automerge root/catalog document pattern

**Source:** Automerge root document tutorial  
**URL:** https://automerge.org/docs/tutorial/persist-root-doc/

**Lararium translation:**

- A tiny root/catalog doc is not an alien pattern.
- Use it to point at the current set of corpora, rooms, recipes, and snapshots.
- The catalog doc is the hallway; corpus docs are libraries; room docs are active shrines.

---

## 4. Prime ingest queue — TW5 recipe/bag prior art

### P0 — TiddlyWiki Bags and Recipes

**Source:** TiddlyWiki Bags and Recipes  
**URL:** https://tiddlywiki.com/static/Bags%2520and%2520Recipes.html

Important findings:

- Tiddlers are stored in named bags.
- Bags have read/write access controls.
- Recipes are ordered lists of bags from low priority to high priority.
- If the same tiddler title exists in multiple bags, the highest-priority bag wins.
- Hosted wikis are composed by splicing recipe tiddlers into the standard TW5 HTML template.
- Changes to a shared app bag can ripple into affected wikis.

**Lararium translation:**

TW5’s recipe/bag model is the right composition metaphor:

```text
system bag       invariant UI / grammar / Lararium control memes
corpus bags      SDM/FTLS, Ars, Discordian library, silat, concept art
room bag         room-local pins, notes, recipes, overrides
draft bag        local high-churn draft-of tiddlers
projection bag   derived tiddlers, search indexes, HUD render hints
```

Each bag may map to one Automerge doc, one static snapshot, one local draft store, or one projection cache.

### P0 — TiddlyWebAdaptor

**Source:** TiddlyWiki TiddlyWebAdaptor  
**URL:** https://tiddlywiki.com/static/TiddlyWebAdaptor.html

Important findings:

- TiddlyWebAdaptor synchronizes tiddler changes between browser and server.
- It supports both TiddlyWeb and TW5’s built-in server.
- TiddlyWeb fully supports bags/recipes; TW5 built-in server only supports a simplified single-bag/single-recipe model.

**Lararium translation:**

- Lararium can use TW5 as the engine VM, but should not inherit the built-in single-bag limitation.
- The Lararium “server” is a projection/composition layer over causal islands, not just a TW5 file server.

### P1 — TiddlyWiki MultiWikiServer ACL / security notes

**Sources:**  
- Application Access & Security: https://mws.tiddlywiki.com/static/Application%2520Access%2520%2526%2520Security.html  
- MultiWikiServer corpus / Bags and Recipes notes: https://mws.tiddlywiki.com/alltiddlers.html

Important findings:

- MWS models READ / WRITE / ADMIN permissions over bags and recipes.
- Bags can inherit ACL from recipes.
- Security notes warn about cross-bag compression oracle risks and propose the mitigation: never compress contents of two bags together.

**Lararium translation:**

- If bags/corpora have distinct security domains, avoid cross-domain compression or bundled projections that leak size/timing relationships.
- “Snapshot bundle” should respect security boundaries:
  - one snapshot per security domain, or
  - encrypted sub-bundles with independent compression.
- Do not merge private draft bag + public corpus bag into one compressed artifact unless the viewer has both authorities and the artifact will never be served cross-boundary.

---

## 5. Prime ingest queue — canvas / presence / room prior art

### P0 — tldraw Store record scopes

**Sources:**  
- Store docs: https://tldraw.dev/sdk-features/store  
- RecordScope: https://tldraw.dev/reference/store/RecordScope  
- TLRecord: https://tldraw.dev/reference/tlschema/TLRecord  
- Store API: https://tldraw.dev/reference/store/Store

Important findings:

tldraw distinguishes:

| Scope | Persistence | Sync | Example |
|---|---:|---:|---|
| `document` | persisted | synced | shapes, pages, assets, bindings |
| `session` | optional/local | not synced | camera/current page |
| `presence` | not persisted | synced | cursor, selection |

tldraw store APIs can serialize by scope and filter changes by scope.

**Lararium translation:**

- Room canvas content is durable room content.
- Camera, current HUD panel, and local selected perspective are session.
- Cursors, typing, live agent attention, and viewer presence are presence.
- Presence should never block room document readiness.
- The room can be “content ready” before presence is ready.

### P1 — tldraw migrations and sync

**Sources:**  
- Store schema: https://tldraw.dev/reference/store/StoreSchema  
- Migration: https://tldraw.dev/reference/store/Migration  
- Sync docs: https://tldraw.dev/docs/sync

Important findings:

- tldraw records carry schema/migration machinery.
- Migrations can operate at record or store scope.
- Sync validates and runs migrations.

**Lararium translation:**

- Projection records should have schema versions and migrations.
- Corpus tiddler/meme schema should not force eager rewrites.
- Read/project through migration lenses; preserve raw history.

---

## 6. Prime ingest queue — subdocument / multi-container prior art

### P1 — Yjs subdocuments

**Sources:**  
- Yjs subdocuments: https://beta.yjs.dev/docs/api/subdocuments  
- Liveblocks Yjs subdocuments guide: https://liveblocks.io/docs/guides/how-to-use-yjs-subdocuments  
- Liveblocks Yjs best practices: https://liveblocks.io/docs/guides/yjs-best-practices-and-tips  
- Yjs community discussion on subdoc atomicity: https://discuss.yjs.dev/t/transactions-nested-subdocuments/1602

Important findings:

- Yjs subdocuments allow nested documents and lazy loading.
- They are useful for multiple large docs in the same room.
- They add complexity and are not necessary for many multi-editor cases.
- Cross-subdocument atomicity is not free; once split, consistency across boundaries must be handled by the application or another layer.

**Lararium translation:**

Splitting Automerge docs solves boot/loading/authorization pressure, but introduces explicit cross-island semantics:

- Cross-island operations are not ordinary atomic transactions.
- A promotion touching multiple corpora/rooms needs a receipt, saga, or manifest record.
- A recipe update can be atomic within the room doc, while corpus changes remain separate.
- Deleting/moving across islands should be a semantic operation with repair/reconciliation, not a hidden multi-doc mutation.

### P1 — Fluid Framework containers and dynamic objects

**Sources:**  
- Fluid data modeling: https://fluidframework.com/docs/build/data-modeling/  
- Fluid containers: https://fluidframework.com/docs/build/containers/  
- Fluid DDS overview: https://fluidframework.com/docs/build/dds

Important findings:

- Fluid containers are primary encapsulation units and permission boundaries.
- Dynamic shared objects are discovered by handles stored in connected objects.
- Initial objects act as the base of the data model.
- Multiple containers can be used to reduce memory footprint or enforce different permission boundaries.
- Fluid distinguishes local readiness, publication, and connection status.

**Lararium translation:**

- Catalog/root island mirrors Fluid’s initial-object/handle pattern.
- Corpus/room docs can be loaded by handles from catalog.
- Separate readiness states are normal:
  - local ready,
  - published/attached,
  - connected/syncing,
  - projection ready.
- Multiple containers/docs are appropriate when experiences or permissions differ.

---

## 7. Prime ingest queue — broader prior art

### P1 — DXOS ECHO / HALO / MESH / spaces

**Sources:**  
- DXOS introduction: https://docs.dxos.org/  
- HALO introduction: https://docs.dxos.org/halo/introduction  
- ECHO introduction: https://docs.dxos.org/echo/introduction/

Important findings:

- DXOS separates peer database (ECHO), identity/contact management (HALO), networking (MESH), edge services, and app framework.
- ECHO spaces are sharing/access-control units.
- A peer typically belongs to many spaces.
- Spaces replicate objects among authorized peers.

**Lararium translation:**

- Architecture separation is healthy:
  - auth/capability,
  - storage/docs,
  - network/sync,
  - edge/snapshot,
  - app/projection.
- “Many spaces per peer” validates many corpus/room islands per user.
- Do not collapse identity, corpus, room, projection, and network into one runtime promise.

### P1 — WNFS / WebNative File System

**Sources:**  
- docs.rs WNFS: https://docs.rs/wnfs  
- Libraries.io WNFS: https://libraries.io/cargo/wnfs

Important findings:

- WNFS is a versioned, logged, programmable filesystem for the web.
- It has public and private subsystems.
- Private filesystem is encrypted.
- Minimal metadata is leaked.
- Service providers can validate writes without reading contents.

**Lararium translation:**

- Long-term disk write-back and private corpus storage can learn from WNFS:
  - content-addressed artifacts,
  - versioned tree receipts,
  - encryption-aware storage,
  - metadata minimization,
  - validate without plaintext when possible.

### P1 — Patchwork / Universal Version Control

**Sources:**  
- Patchwork project: https://www.inkandswitch.com/project/patchwork/  
- Patchwork notebook: https://www.inkandswitch.com/patchwork/notebook/

Important findings:

- Patchwork explores version control for writing and beyond.
- Branches, diff visualization, history, and comments can generalize across prose, drawings, spreadsheets, and AI suggestions.
- In the tldraw prototype, app-specific pointer types refer to parts of each medium while generic comment/version UI handles shared collaboration.

**Lararium translation:**

- A Lararium room should support “agent proposed patch” as a first-class branch/layer, not a blind write.
- Comments/annotations should point into corpus excerpts, canvas shapes, TW tiddlers, and generated projections.
- Pointer types and provenance links should be generic enough to survive projection changes.

### P1 — Jacquard / fine-grained provenance

**Sources:**  
- Jacquard project: https://www.inkandswitch.com/project/jacquard/  
- Jacquard notebook: https://www.inkandswitch.com/jacquard/notebook/  
- Fine-grained provenance: https://www.inkandswitch.com/jacquard/notebook/03/

Important findings:

- Jacquard tracks provenance from source artifacts to derived outputs.
- Fine-grained provenance connects specific source spans to specific output spans.
- Provenance can support navigation, comments, direct edits from rendered outputs, and maps of a project.

**Lararium translation:**

- Every projection should carry provenance:
  - source doc ID,
  - source head(s),
  - source tiddler/meme URI,
  - source span or anchor,
  - projection version,
  - render receipt.
- MCP answers, disk writes, Kowloon posts, HUD cards, and tldraw nodes should be able to answer: “what produced me?”

### P2 — Replicache / RxDB

**Sources:**  
- Replicache docs: https://doc.replicache.dev/  
- RxDB replication: https://rxdb.info/replication.html

Important findings:

- Replicache emphasizes instant optimistic local mutations, reactive subscriptions, and background sync.
- RxDB sync supports local reads/writes offline and replication when online.

**Lararium translation:**

- Useful UX prior art: local interaction first, sync second.
- Less directly applicable than Automerge/Keyhive because Replicache-like designs often assume a canonical backend or server-side mutator model.
- Still useful for “first paint / optimistic UI / background sync” mental model.

---

## 8. Golden principles for Lararium Node

### 1. No global “app ready”

Replace one global readiness gate with readiness vectors:

```text
auth.ready
catalog.ready
room.content.ready
room.presence.ready
room.snapshot.ready
tw.vm.ready
tldraw.document.ready
mcp.index.ready
disk.projector.ready
kowloon.feed.ready
corpus.sdm.ready
corpus.ars.ready
...
```

The UI should progressively reveal which shrine-lights are lit.

### 2. First paint must not wait for live CRDT

Use:

```text
static shell → auth/catalog → snapshot/projection → live Automerge catch-up
```

A user should see a fossilized projection quickly, then watch it become live once sync catches up.

**Fontany-Fuller-Zelenka island law (do not violate):**

The snapshot/projection lane is a **read artifact** served over HTTP. It is rendered from a corpus island at build or request time, then served as static HTML. It MUST NOT seed or bootstrap any Automerge doc. Each causal island starts from its own history — the room doc starts empty; the corpus doc carries its own seeded content. The static projection is a window, not the source. Seeding a CRDT doc from an HTTP snapshot violates the causal-island boundary and reintroduces server authority over local state.

Correct Milestone C implementation:
- Server: `GET /snapshot/:roomId` renders a static TW5/tldraw projection from the lares corpus doc and serves it as HTML
- Browser: shows this HTML as first paint, then `whenReady()` for the live islands proceeds in background
- When live islands are ready, the static projection is replaced — never merged back in

### 3. Docs follow collaboration + authority + loading boundaries

Automerge doc boundaries should be chosen where at least one of these changes:

- who collaborates,
- who may read,
- who may write,
- who may administer/promote,
- how often it changes,
- how large it is,
- whether it must load for first paint,
- whether it is durable or ephemeral.

### 4. Avoid the two bad extremes

Bad extreme A: one giant forever-growing wiki doc.

Bad extreme B: one doc per tiddler/shape/line, causing thousands of sync objects and cross-doc atomicity problems.

Target middle:

```text
catalog doc
corpus docs
room docs
presence channels/docs
draft stores
projection caches
```

### 5. Presence does not share fate with content

Presence is weather. Losing it should not damage memory.

Presence should be:

- fast,
- disposable,
- non-blocking,
- not included in durable cold-start payloads,
- never required for corpus readiness.

### 6. Drafts are private layers; promotion is ceremony

TW5 `draft-of` tiddlers are structurally valuable. Preserve this:

```text
draft churn → local/private layer
promotion → one meaningful durable update
projection → receipt-tagged derived view
```

Avoid streaming every keystroke into durable corpus history unless intentionally collaborative.

### 7. TW5 recipes compose surfaces; they do not define ontology

TW5 should serve as:

- filter host,
- recipe/bag compositor,
- wiki-engine VM,
- draft surface,
- HTML preview/render helper.

Lararium ontology remains:

```text
meme / tiddler adapter / carrier / corpus / room / projection / receipt
```

### 8. Catalog/root doc is the hallway

The catalog should be tiny, fast, and warmable:

```text
corpora[]
rooms[]
recipes[]
doc URLs
snapshot URLs
latest heads
projection receipts
capability hints
migration/schema versions
```

It should not contain the full corpus.

### 9. Authorization readiness precedes document readiness

OAuth / login should complete before content hydration. Then capability logic decides what docs may be pulled, decrypted, read, written, or promoted.

### 10. OAuth is identity; capabilities are authority

ATProto OAuth is important for BlueSky login, but it should not become the whole permission model.

Use OAuth to establish identity/session. Use capability/Keyhive/UCAN-like records to establish authority over Lararium resources.

### 11. Secret URLs are not security

Document URLs, Automerge URLs, or snapshot URLs are locators. Treat them as leakable.

Authority requires:

- capability receipt,
- signature,
- policy,
- key membership,
- or server-side enforcement as a transitional fallback.

### 12. Split pull/read/write/admin

Adopt Keyhive’s useful distinction:

```text
pull    can retrieve bytes
read    can decrypt/materialize view
write   can create valid updates
admin   can change membership/policy/promote
```

This maps well to corpora, rooms, snapshots, and MCP.

### 13. Cross-island operations need receipts, not hidden atomicity

Once split, cross-doc atomicity is not free.

Use manifest/receipt operations for:

- promote draft to corpus and room at once,
- move item across corpus boundaries,
- delete room + its presence/projection caches,
- publish projection to Kowloon,
- write back to disk.

### 14. Do not cross-compress security domains

Borrow the MWS security warning: never compress different security bags together if one party might observe compressed artifacts without authority to all inputs.

For Lararium snapshots:

- compress/encrypt per bag/security domain,
- or only bundle domains for users with all rights,
- record boundaries in receipts.

### 15. Projection receipts prevent counterfeit canon

Every projection needs a receipt:

```text
projection id
projection type
source doc ids
source heads
source anchors/spans
schema version
renderer version
created by
created at
capability context
hash
```

Projection without receipt becomes shadow canon.

### 16. Translate on read

Use Cambria-like read-time translation / lens thinking:

- preserve old raw corpus history,
- project into current schema at read/render time,
- avoid eager rewriting of all corpus docs for schema changes.

### 17. Agent writes are proposals unless explicitly promoted

Agentic chat/session output should land in a live room/session/proposal doc. Promotion to durable corpus requires explicit ceremony and capability.

### 18. Measure by island

Do not just measure total boot.

Measure:

```text
auth handshake
catalog fetch
snapshot fetch/decode
first paint
room live catch-up
presence connect
corpus sync per corpus
TW VM hydration
tldraw hydrate
MCP index ready
disk projection ready
```

---

## 9. Recommended next architectural milestone

Do not split everything first. Name and prove the islands.

### Milestone A — readiness map

Implement or document the readiness vocabulary:

```text
ready: auth
ready: catalog
ready: snapshot
ready: room-content
ready: room-presence
ready: tw-vm
ready: tldraw-doc
ready: corpus:<id>
ready: projection:<id>
```

### Milestone B — catalog island

Create a tiny root/catalog record that names:

```text
corpus id
corpus doc url
corpus snapshot url
room id
room content doc url
room presence channel/doc
recipe id
bag stack
latest known heads
projection receipt ids
```

### Milestone C — first-paint projection

For one room + one corpus, provide a **static HTML projection** that can render before live Automerge readiness.

Island law (Fontany-Fuller-Zelenka): the projection is a read artifact. It MUST NOT seed or hydrate any Automerge doc. The causal islands own their own history. The projection is a window.

Implementation path:
- `GET /snapshot/:roomId` — server renders TW5 tiddler bundle → static HTML, tagged with source doc heads and a projection receipt
- Browser: show static HTML immediately, start Automerge islands in background
- When `room-content.ready` fires, swap static for live — never merge projection back into CRDT
- `snapshot.ready` readiness key lights when static HTML is present in the DOM
- `room-content.ready` fires when Automerge `whenReady()` completes, regardless of snapshot

### Milestone D — recipe/bag live surface

Make the live surface compose:

```text
system bag
corpus bag
room bag
draft bag
projection bag
```

Even if most bags are backed by the same old doc at first, the composition model should already exist.

### Milestone E — draft MOVE (residency ACTION)

Keep `draft-of` churn local. Promotion emits:

```text
source draft id
target tiddler/meme id
target corpus or room doc
before head
after head
actor/capability
projection invalidation
```

### Milestone F — presence split

Presence should light up independently and not be stored in the durable corpus/room document.

---

## 10. Open design questions

1. **Is a corpus doc a TW5 bag, or can one corpus doc contain multiple bags?**  
   Likely answer: start with one corpus doc = one bag. Later allow internal bag partitions if needed.

2. **Should room presence use Automerge at all?**  
   Likely answer: not initially. Treat presence as ephemeral network state or short-retention doc. Use durable Automerge only for room content.

3. **What is the minimal snapshot payload?**  
   Candidate:
   - rendered HTML/HUD projection,
   - TW tiddler bundle,
   - tldraw document-record snapshot,
   - projection receipt,
   - source heads,
   - schema versions.

4. **How does MCP query partially ready worlds?**  
   MCP should return readiness-aware answers:
   - live,
   - snapshot-backed,
   - unavailable,
   - stale receipt,
   - permission denied.

5. **Can disk write-back be projection-only?**  
   Yes. Disk should consume promotion receipts and projection outputs, not raw transient edits.

6. **How does Kowloon publish?**  
   Kowloon should publish promoted events and projection receipts, not every raw Automerge change.

7. **How do agentic sessions become canon?**  
   Session/chat docs are low-authority. They can propose patches. Promotion creates durable corpus updates.

---

## 11. Source bibliography

### Brooklyn Zelenka / Ink & Switch / local-first access control

- Keyhive project — https://www.inkandswitch.com/project/keyhive/
- Keyhive notebook — https://www.inkandswitch.com/keyhive/notebook/
- BeeKEM — https://www.inkandswitch.com/keyhive/notebook/02/
- Syncing Keyhive / Beelay — https://www.inkandswitch.com/keyhive/notebook/05/
- Authomerge notes — https://notes.brooklynzelenka.com/Notes/Authomerge
- Brooklyn UCAN notes — https://notes.brooklynzelenka.com/Notes/User-Controlled-Authorization-Networks
- UCAN site — https://ucan.xyz/
- UCAN specification — https://ucan.xyz/specification/
- UCAN container specification — https://ucan.xyz/container/

### Local-first foundations

- Local-first software essay — https://www.inkandswitch.com/essay/local-first/
- Ink & Switch local-first research area — https://www.inkandswitch.com/local-first-software/

### Automerge

- Automerge home — https://automerge.org/
- Modeling Data — https://automerge.org/docs/cookbook/modeling-data/
- Repo storage — https://automerge.org/docs/reference/repositories/storage/
- Local Storage & Sync — https://automerge.org/docs/tutorial/local-sync/
- Under-the-hood storage — https://automerge.org/docs/reference/under-the-hood/storage/
- Binary Document Format — https://automerge.org/automerge-binary-format-spec/
- `save()` — https://automerge.org/automerge/api-docs/js/functions/save.html
- `saveIncremental()` — https://automerge.org/automerge/api-docs/js/functions/saveIncremental.html

### ATProto / BlueSky OAuth

- Bluesky OAuth client implementation guide — https://docs.bsky.app/docs/advanced-guides/oauth-client
- AT Protocol OAuth spec — https://atproto.com/specs/oauth
- AT Protocol auth / DPoP — https://atproto.com/specs/auth
- OAuth patterns — https://atproto.com/guides/oauth-patterns

### TiddlyWiki

- Bags and Recipes — https://tiddlywiki.com/static/Bags%2520and%2520Recipes.html
- TiddlyWebAdaptor — https://tiddlywiki.com/static/TiddlyWebAdaptor.html
- TiddlyWeb — https://tiddlywiki.com/static/TiddlyWeb.html
- MultiWikiServer all tiddlers — https://mws.tiddlywiki.com/alltiddlers.html
- MultiWikiServer Application Access & Security — https://mws.tiddlywiki.com/static/Application%2520Access%2520%2526%2520Security.html

### tldraw

- Store docs — https://tldraw.dev/sdk-features/store
- RecordScope — https://tldraw.dev/reference/store/RecordScope
- TLRecord — https://tldraw.dev/reference/tlschema/TLRecord
- Store API — https://tldraw.dev/reference/store/Store
- StoreSchema — https://tldraw.dev/reference/store/StoreSchema
- Migration — https://tldraw.dev/reference/store/Migration
- tldraw sync — https://tldraw.dev/docs/sync

### Yjs and Fluid prior art

- Yjs subdocuments — https://beta.yjs.dev/docs/api/subdocuments
- Liveblocks Yjs subdocuments guide — https://liveblocks.io/docs/guides/how-to-use-yjs-subdocuments
- Liveblocks Yjs best practices — https://liveblocks.io/docs/guides/yjs-best-practices-and-tips
- Yjs community discussion on nested subdocuments and atomicity — https://discuss.yjs.dev/t/transactions-nested-subdocuments/1602
- Fluid Framework data modeling — https://fluidframework.com/docs/build/data-modeling/
- Fluid containers — https://fluidframework.com/docs/build/containers/
- Fluid DDS overview — https://fluidframework.com/docs/build/dds

### Broader local-first prior art

- DXOS docs — https://docs.dxos.org/
- DXOS HALO — https://docs.dxos.org/halo/introduction
- DXOS ECHO — https://docs.dxos.org/echo/introduction/
- WNFS docs.rs — https://docs.rs/wnfs
- WNFS libraries.io — https://libraries.io/cargo/wnfs
- Patchwork project — https://www.inkandswitch.com/project/patchwork/
- Patchwork notebook — https://www.inkandswitch.com/patchwork/notebook/
- Jacquard project — https://www.inkandswitch.com/project/jacquard/
- Jacquard notebook — https://www.inkandswitch.com/jacquard/notebook/
- Jacquard fine-grained provenance — https://www.inkandswitch.com/jacquard/notebook/03/
- Replicache docs — https://doc.replicache.dev/
- RxDB replication — https://rxdb.info/replication.html

---

## 12. Closing synthesis

The current boot pain is useful diagnostic weather. It says:

```text
The local cache path is working.
The first-arrival path lacks a fossil/projection lane.
The single-doc virtual server is becoming too cosmological.
```

The architecture wants to become:

```text
local-first causal islands
+ TW5 recipe composition
+ snapshot first paint
+ live Automerge catch-up
+ capability-shaped sync
+ projection receipts
```

Or, in the idiom of the lararium:

> Many shrines, one plaza.  
> Many documents, one surface.  
> Many projections, one receipt trail.  
> The gods may wake slowly, but the door must open quickly.
