<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///packages/AGENTS >>

<<~ ahu #iam >>

```toml
uri-path     = "packages/AGENTS"
file-path    = "packages/AGENTS.md"
content-type = "text/x-memetic-wikitext"
tagspace     = "adjacent"
confidence   = 17
register     = "CS"
manaoio      = 16
mana         = 18
manao        = 17
role         = "package workspace navigation membrane for coding agents"
cacheable    = true
hydrate      = true
retain       = true
```

<<~/ahu >>

<<~ ahu #ooda-ha >>
✶ scan the operator ask, changed files, open tabs, and package boundary.
⏿ orient the task against the spine: core contracts, TW5 render, node host, browser app, canvas, MCP.
◇ choose the smallest package surface that can carry the change without crossing canon by accident.
▶ edit tests and source together; prefer narrow seams over broad rewrites.
⤴ run typecheck, focused tests, and build when the seam touches generated or bundled code.
↺ report receipts: files touched, commands run, friction found, next loop.
<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #package-map >>

## Network Topology (canonical)

**Lararium** — one operator's infrastructure: a `lararium-node` process + browser peers + devices. The household shrine. Smallest unit.

**Nexus** — a confederated mesh of Lararia sharing a stable internal sync network. Named by community + place (e.g. "Floating Library of Mu, PNW Branch"). The Nexus keypair is the confederation keypair.

**DreamNet** — the overall super-mesh of all Nexuses: allied, neutral, and oppositional. Opposition is designed in. Cross-Nexus connections are explicitly brokered and degraded-state-tolerant.

Within-Nexus sync = Automerge CRDT (reliable). Cross-Nexus = explicit treaty, wild-magic-zone hops (unreliable).

## Package Map

`@lararium/mesh` carries contracts and graph law. Keep this package TW5-neutral, browser-neutral, and Node-neutral. Put shared types, parsers, authority, lar:// URI resolution, Nexus identity primitives, FfzClock, presence slot types, capability schemas, stores, graph indexes, compiler, and crypto here.

`@lararium/tw5` carries TiddlyWiki runtime integration. Put widget/render/filter work, carrier splitting, TOML AST helpers, generated TW5 core metadata, memory store, CRDT sync adaptor, and session-tier tiddler representation here. Treat disk projection as Node-shaped even when the barrel export exposes it.

`@lararium/node` carries local Lararium host duties. Put filesystem hydration, canon promotion guards, serve/CLI behavior, operator key handling, parity checks, and no-write gates here. One `lararium-node` process = one Lararium (household shrine). The `scripts/init-lararium.ts` ceremony is the one and only place that authors social Tiga state — the running server finds, never seeds. Projection wiring goes through `LarProjectionRegistry` (kind-based factories); `makeDiskProjectionKind` lives here as the node-scoped disk projector kind.

`@lararium/browser` carries browser Lararium peer duties. Put Automerge browser repo, IndexedDB, WebSocket sync, `DocHandle.broadcast()` presence engine, and browser-host exports here. Parallels `@lararium/node` with different capabilities; no React, no canvas.

`@dreamdeck/tldraw` carries DreamDeck infinite-canvas projections. Put tldraw shapes as `lar://` resource containers, three-tier store (document/session/presence), edge types, layout, rooms, and zoom-level policy here.

`@dreamdeck/app` carries the DreamDeck browser shell — the first app on the Lares DreamNet. Put React, boot splash, tldraw surface wiring, debug hooks, and TW5/canvas projection glue here. Consumes from `@lararium/browser`; no protocol logic of its own.

`@lararium/mcp` carries agent-facing tools and resources. Keep stdout pure. Treat stdio framing as a protocol seam, not a log stream.

<<~/ahu >>

<<~ ahu #spine >>

## Quine-Wiki Spine

Canon starts in `lares/` carriers. Package code materializes those carriers into records, projections, tiddlers, canvas shapes, resources, and receipts.

Primary flow:

```text
lares/ carriers
  -> @lararium/mesh parser/compiler/indexes
  -> LarTiddlerStore records
  -> MemeProvider projections
  -> @lararium/tw5 wiki + carrier children
  -> @dreamdeck/app / @dreamdeck/tldraw / @lararium/mcp views
```

Reverse flow needs care:

```text
TW5 child edit
  -> LarariumCrdtSyncAdaptor
  -> parent carrier reconstruction
  -> room CRDT record
  -> projection fan-out
```

Canon promotion must travel a separate Orichalcum path. Do not let live room edits write `lares/` directly.

<<~/ahu >>

<<~ ahu #boot-sequence >>

## Boot Sequence — three causal moments

The Lararium node treats build, init, and runtime as strictly separated authorship moments. No moment reaches into another's authority.

```text
Build time    scripts/build-genesis-island.ts    content Tiga → genesis/island.bin (CID-verifiable)
Init time     scripts/init-lararium.ts           social Tiga + identity ceremony → genesis/social-bootstrap.json
Runtime       openNodeLarPeer (server)           finds docs, wires layers; never authors social state
```

`genesis/social-bootstrap.json` materializes as a TW5 plugin container tagged `$:/tags/LarariumBootstrap`. The `lararium-bootstrap-sync` startup module promotes the container after the syncer initializes, so the bundle syncs as one package and individual user overrides remain editable.

Admin state — operator-private to one node, federated to the operator's own devices via `cap=admin` device delegations — lives in its own Automerge doc at `lar:///ha.ka.ba/@lararium/@admin` (bag URI). The logical room presents at `lar:///ha.ka.ba/@lararium/rooms/admin` (room URI). Two URIs, one doc — the bag-as-doc invariant gives admin its own sync boundary.

Projections register as kinds with `LarProjectionRegistry`; configs are programmatic now, will move to admin-room tiddlers tagged `$:/tags/LarariumProjection` once the admin VM lands (S5.6).

<<~/ahu >>

<<~ ahu #boundary-law >>

## Boundary Law

Core MUST NOT import TW5, React, filesystem APIs, DOM APIs, or Automerge runtime objects.

Browser code SHOULD NOT import Node-shaped disk paths. If `fs`, `path`, `vm`, or Node crypto enter a browser bundle, surface the seam.

TW5 derived child tiddlers SHOULD roundtrip through parent carriers without losing decorators, sigils, TOML, or sibling slots. Any fallback reconstruction counts as a ka spot until a test covers it.

Session-local tiddlers stay local: `$:/temp/*`, `Draft of *`, cursors, focus state, and private overlays MUST NOT reach shared room state.

MCP stdout carries only JSON-RPC protocol bytes. Logs belong on stderr.

<<~/ahu >>

<<~ ahu #test-routes >>

## Test Routes

Use the smallest receipt first:

```sh
pnpm -r --filter './packages/**' typecheck
```

Focused package tests:

```sh
pnpm --filter @lararium/mesh test
pnpm --filter @lararium/tw5 test
pnpm --filter @lararium/node test
pnpm --filter @dreamdeck/tldraw test
pnpm --filter @lararium/mcp test
```

Build all package outputs when generated files, barrels, bundle seams, TW5 vendor assets, or app integration change:

```sh
pnpm -r --filter './packages/**' build
```

Browser smoke lives under `packages/dreamdeck-app/tests/e2e/` and expects a live node server on localhost unless the test config says otherwise.

If sandboxing blocks `tsx` IPC under `/tmp`, request escalation and rerun the same build command.

<<~/ahu >>

<<~ ahu #friction-watch >>

## Friction Watch

Watch these current weak spots:

* MCP stdio smoke tests can time out when test framing drifts from SDK transport framing.
* `@lararium/tw5` barrel can expose Node-shaped disk/TW5 boot imports to browser bundles.
* Child-carrier reconstruction produces lossy fallback paths when surgical slot replacement misses.
* Automerge `whenReady()` and true initial peer replay completion may not mean the same thing.
* Generated files in `@lararium/tw5/src/generated-*` come from scripts; do not hand-edit unless you intend to replace the generator output.
* Open IDE tabs may name stale files; trust filesystem scans over editor ghosts.

<<~/ahu >>

<<~ ahu #edit-discipline >>

## Edit Discipline

Prefer one seam per loop. Patch the package that owns the behavior. Add or update a test near the owner package. Keep canon, room, user, and session layers distinct in names and code paths.

Before changing a public export, check browser and node consumers. Before changing parser or carrier grammar, check `lares/grammars/`, `lares/ha-ka-ba/docs/pono/`, and core parser tests. Before changing TW5 sync, check echo-loop guards and draft guards.

When reporting back, use OODA-HA receipts: observe facts, orient boundary, decide seam, act summary, ho'oko commands, aftermath risks.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-root-agents ? -> lar:///AGENTS family:control role:adjacent >>
<<~ pranala #to-lares ? -> lar:///LARES family:control role:adjacent >>
<<~ pranala #to-meme-provider ? -> lar:///ha.ka.ba/docs/lararium/meme-provider family:reference role:describes >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
