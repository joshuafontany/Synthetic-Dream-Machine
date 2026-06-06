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
⏿ orient the task against the spine: mesh contracts, TW5 VM, node host, browser vessel, caps, operator CLI.
◇ choose the smallest package surface that can carry the change without crossing canon by accident.
▶ edit tests and source together; prefer narrow seams over broad rewrites.
⤴ run typecheck, focused tests, and build when the seam touches generated or bundled code.
↺ report receipts: files touched, commands run, friction found, next loop.
<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #network-topology >>

## Network Topology (canonical)

**Lararium** — one operator's infrastructure: a `lararium-node` process + browser peers + devices. The household shrine. Smallest unit.

**Nexus** — a confederated mesh of Lararia sharing a stable internal sync network. Named by community + place (e.g. "Floating Library of Mu, PNW Branch"). The Nexus keypair carries the confederation.

**DreamNet** — the overall super-mesh of all Nexuses: allied, neutral, and oppositional. Opposition lives by design. Cross-Nexus connections travel through explicit brokers and tolerate degraded state.

Within-Nexus sync = Automerge CRDT (reliable). Cross-Nexus = explicit treaty, wild-magic-zone hops (unreliable).

<<~/ahu >>

<<~ ahu #package-map >>

## Package Map (active)

Six packages carry the stack. Each owns one boundary; cross-cutting work travels through the contracts in `@lararium/mesh`.

`@lararium/mesh` carries contracts and graph law. Keep this package TW5-neutral, browser-neutral, and Node-neutral. Put shared types, parsers, `browser-dock` boundary shapes, `lar-uris` resolution, Nexus identity primitives, `FfzClock`, presence slot types, `capability` schemas, `AutomergeDocStore` + `composite-store`, `bag-residency` tiers, `LarEventBus`, `MemeProvider`, `Recipe` + `WikiRecipe`, `LarProjectionRegistry`, `PromotionCeremony`, `ReactionGraph`, `CausalIsland` + `island-protocol`, `KumuDevice`, `social-seed` + `social-tiddlers`, and the shared `cold-boot-ceremony` bones here.

`@lararium/tw5` carries TiddlyWiki runtime integration. Put the TW5 VM surface (`tw5-vm`, `tw5-host-bridge`, `tw5-browser-surface`, `tw5-module-gate`, `tw5-camera`), island layer (`island-kernel`, `island-adaptor`, `island-recipe`, `island-context`, `cold-boot-ceremony`, `active-wiki`, `admin-behavior`), memetic-wikitext machinery (`memetic-parser`, `meme-ast`, `meme-stream`, `meme-write`, `meme-worker-script`, `deserializer`, `grammar-cache`), verb pipeline (`verb-vm`, `verb-dispatcher`, `verb-local-dispatch`, `verb-signal`), TW5-side stores (`memory-store`, `wiki-sync`), generated TW5 core metadata (`generated-tw5-version`, `plugin-tiddler.generated`), and `wikirules` / `macros` / `modules` / `filters` here. Treat disk projection as Node-shaped even when the barrel export exposes it.

`@lararium/node` carries local Lararium host duties. Put the host (`node-host`, `main`, `open-node-vessel`, `open-admin-vm`), island plumbing (`node-admin-island`, `node-wiki-island`, `sovereign-island-model`, `vessel-island-pool`, `island-behaviors`, `lar-event-bus-impl`), bag-path + residency law (`bag-paths`, `residency-handlers`, `wiki-residency-handlers`), boot artifacts (`genesis-artifact`, `epoch-handlers`, `operator-key`, `admin-auth-gate`), the wiki composition family (`wiki-handlers`, `wiki-compose-handlers`, `wiki-draft-handlers`, `wiki-mint-handlers`), `where-handler`, `repo-helpers`, the kind-based `disk-projector`, and the node-side `commands/` family (`device-admit`, `init`) here. ACTION verb handlers (Sprint 5 of the Residency Model Epic) will land alongside as `action-handler.ts`. One `lararium-node` process = one Lararium (household shrine). The running server **finds**; it never seeds social state.

`@lararium/browser` carries browser Lararium peer duties. Put `browser-vessel`, `browser-admin-vm`, `browser-genesis` (three-tier), `browser-operator-key`, `browser-sovereign-island-model`, `browser-vessel-island-pool`, `browser-wiki-worker`, and `__stubs__` for browser-incompatible deps here. Parallels `@lararium/node` with browser-native capabilities (WebSocket, IndexedDB, WebCrypto). No React, no canvas.

`@lararium/keyhive` carries the capability layer. Pre-alpha integration of `@keyhive/keyhive` WASM bindings. Put `capability-provider`, `keyhive-provider`, `ceremony-core`, `event-store`, `admin-event-store` here. One Keyhive Doc = one bag (1:1). Binary read/admin gate, with `ABILITY_LADDER` caveats riding on top. Cap-event home and γ-with-operator-α-mirror sync stay in design flux — touch with care.

`@lares/cli` carries the operator-facing surface. Put the `lares` binary (`bin/lares`), arg parsing (`parse-args`), process spawn (`spawn`), `admin-connector`, and the verb family in `commands/` (`bag`, `ceremony`, `draft`, `init`, `residency`, `scripted`, `status`, `wiki`) here. Sprint 5 of the Residency Model Epic adds `commands/act.ts` for the ACTION verb surface (`lares act ADD/COPY/MOVE/CLEAR/DROP/LOAD`). The CLI carries no protocol logic — every verb dispatches to `@lararium/node` handlers through the admin WS gate.

## Package Map (planned, not yet implemented)

These directory names appear under `packages/` but carry no `package.json` or source. They mark intent, not surface.

- `dreamdeck-app/` — the DreamDeck browser shell (React + tldraw + TW5/canvas glue). Deferred per the `dreamdeck-app` sprint.
- `dreamdeck-tldraw/` — DreamDeck infinite-canvas projections (tldraw shapes as `lar://` resource containers).
- `lares-mcp/` — agent-facing MCP tools and resources. The original Python MCP parity port lives upstream of this directory; the package itself has not landed.

Do not edit AGENTS or test scripts as if these packages exist. When work picks up on any of them, restore the surface description here.

<<~/ahu >>

<<~ ahu #spine >>

## Quine-Wiki Spine

Canon starts in `bags/` carriers. Package code materializes those carriers into records, projections, tiddlers, and receipts.

Primary flow:

```text
bags/ carriers (memetic-wikitext)
  -> @lararium/mesh parser/compiler/indexes/projection-registry
  -> LarTiddlerStore records  +  AutomergeDocStore composite
  -> MemeProvider projections
  -> @lararium/tw5 island-kernel → wiki + carrier children
  -> verb-vm dispatch (TW5-native nalu)
  -> operator surface (@lares/cli) | browser vessel (@lararium/browser) | node host (@lararium/node)
```

Reverse flow needs care:

```text
TW5 child edit
  -> wiki-sync / LarariumCrdtSyncAdaptor
  -> parent carrier reconstruction (memetic-parser + grammar-cache)
  -> bag CRDT record
  -> projection fan-out + ReactionGraph dispatch
```

Residency transitions travel through the ACTION verb surface (`ADD`, `COPY`, `MOVE`, `CLEAR`, `DROP`, `LOAD`) governed by the [Residency Model Epic](EPIC-RESIDENCY-MODEL.md). Sprint 5 ships `@lararium/node/src/action-handler.ts` + `lares act` CLI; the prior `lares promote` ceremony retired 2026-05-31 with no replacement shim. Do not let live wiki edits write `bags/` directly — operators land bag content through ACTION verbs.

<<~/ahu >>

<<~ ahu #boot-sequence >>

## Boot Sequence — three causal moments

The Lararium node treats build, init, and runtime as strictly separated authorship moments. No moment reaches into another's authority.

```text
Build time    scripts/build-genesis-island.ts    content Tiga → genesis/island.bin (CID-verifiable)
Init time     lares init  (was scripts/init-lararium.ts)    social Tiga + identity ceremony → genesis/social-bootstrap.json
Runtime       openNodeVessel  /  openBrowserVessel          finds docs, wires layers; never authors social state
```

`genesis/social-bootstrap.json` materializes as a TW5 plugin container tagged `$:/tags/LarariumBootstrap`. The `lararium-bootstrap-sync` startup module promotes the container after the syncer initializes, so the bundle syncs as one package and individual user overrides remain editable.

### Admin VM (landed)

Admin state lives in its own Automerge doc at `lar:///ha.ka.ba/@admin` (bag URI; aligned to the bag-tag rule in [lar-uri.md](../bags/@lares/v0.1/api/pono/lar-uri.md)). The logical room presents at `lar:///ha.ka.ba/@lararium/rooms/admin` (room URI). Two URIs, one doc — the bag-as-doc invariant gives admin its own sync boundary. The admin VM hosts itself through `open-admin-vm` (node) and `open-browser-admin-vm` (browser); bag-mirror configs ride as `$:/tags/LarariumBagMirror` tiddlers inside admin.

Operator-private to one node, federated to the operator's own devices via `cap=admin` device delegations through `@lararium/keyhive`.

### Browser three-tier genesis (landed)

`browser-genesis` mirrors the node three-tier model (pinned / hot / cold) into IndexedDB. The browser vessel earns the same gates A/B/C as node and the `workerEa` admin gate sits in front of the admin VM.

### Projection registry

Projections register as kinds with `LarProjectionRegistry`. The node-scoped `disk-projector` kind lives in `@lararium/node`. Configs ride as admin-room tiddlers tagged `$:/tags/LarariumProjection`.

<<~/ahu >>

<<~ ahu #boundary-law >>

## Boundary Law

**Core MUST NOT import** TW5, React, filesystem APIs, DOM APIs, or Automerge runtime objects. `@lararium/mesh` stays neutral.

**Browser code SHOULD NOT** import Node-shaped disk paths. If `fs`, `path`, `vm`, or Node crypto enter a browser bundle, surface the seam. Use the `@lararium/browser/__stubs__` pattern for browser-incompatible deps.

**Namespace boundary.** `@lararium/*` = runtime stack (mesh, tw5, node, browser, keyhive). `@lares/*` = operator-facing surface (cli). `@dreamdeck/*` = app/canvas layer (none active yet). Do not cross these on convenience.

**TW5 derived child tiddlers SHOULD** roundtrip through parent carriers without losing decorators, sigils, TOML, or sibling slots. Any fallback reconstruction counts as a ka spot until a test covers it.

**Session-local tiddlers stay local.** `$:/temp/*`, `Draft of *`, cursors, focus state, and private overlays MUST NOT reach shared room state.

**Capability layer is the only authority gate.** Do not invent ad-hoc auth checks; route through `@lararium/keyhive` or the `admin-auth-gate` in `@lararium/node`.

**Bag URI law.** Bag tags occupy `child[1]` only. Do not promote a `child[N]` sigil to bag identity. See [lar-uri.md](../bags/@lares/v0.1/api/pono/lar-uri.md).

<<~/ahu >>

<<~ ahu #test-routes >>

## Test Routes

Use the smallest receipt first.

Whole-workspace typecheck:

```sh
pnpm -r --filter './packages/**' typecheck
```

Focused package tests (only the four packages that ship vitest configs today):

```sh
pnpm --filter @lararium/mesh test
pnpm --filter @lararium/tw5 test
pnpm --filter @lararium/node test
pnpm --filter @lararium/browser test
```

`@lararium/keyhive` and `@lares/cli` carry no test scripts yet; typecheck covers them.

TW5 fixture and sigil-alignment routes:

```sh
pnpm test:tw5-fixture
pnpm test:sigil-alignment
pnpm test:tw5-flow         # placeholder — residency-action flow scripts pending Sprint 5
pnpm test:flows            # top-level integration flows
```

Build all package outputs when generated files, barrels, bundle seams, TW5 vendor assets, or app integration change:

```sh
pnpm -r --filter './packages/**' build
```

`@lararium/tw5` build is the heavy one (vendor + plugin-tiddler + tsc + sync-heleuma). Expect minutes per iteration.

If sandboxing blocks `tsx` IPC under `/tmp`, request escalation and rerun the same build command.

<<~/ahu >>

<<~ ahu #friction-watch >>

## Friction Watch

Watch these current weak spots:

* **Automerge v2.5.6 API law.** `repo.find()` rejects on unavailable; use the `allowableStates` pattern. `shutdown()` → `flush()`. The workspace pins `@automerge/automerge-repo` to `2.5.5` via overrides.
* **Keyhive pre-alpha.** `@keyhive/keyhive@0.0.0-alpha.58b` — WASM bindings move under us. Cap-event home and γ-with-operator-α-mirror sync stay in design flux.
* **Browser TW5 boot shim.** `global is not defined` still fires inside TW5's core boot eval under some browser paths. The `browser-m3-breathing` test currently fails on that surface.
* **`child[1]` bag URI law.** Sigils above `child[1]` MUST NOT carry bag tags. Treat any violation as a structural error.
* **`@lararium/tw5` barrel** can expose Node-shaped disk/TW5 boot imports to browser bundles. Audit barrel changes against the browser build.
* **Child-carrier reconstruction** produces lossy fallback paths when surgical slot replacement misses. Tests cover the happy paths; the fallback path lacks coverage.
* **Automerge `whenReady()` and true initial peer replay** completion may not mean the same thing.
* **Generated files** in `@lararium/tw5/src/generated-*` come from `scripts/`; do not hand-edit unless you intend to replace the generator output.
* **Empty package directories** (`dreamdeck-app`, `dreamdeck-tldraw`, `lares-mcp`) live in `pnpm-workspace.yaml`'s `packages/*` glob; pnpm tolerates them today, but adding a `package.json` without source will surface install errors.
* **Open IDE tabs** may name stale files; trust filesystem scans over editor ghosts.

<<~/ahu >>

<<~ ahu #edit-discipline >>

## Edit Discipline

Prefer one seam per loop. Patch the package that owns the behavior. Add or update a test near the owner package. Keep canon, room, user, and session layers distinct in names and code paths.

Before changing a public export, check browser and node consumers (and `@lares/cli`, which depends on both `@lararium/mesh` and `@lararium/node`). Before changing parser or carrier grammar, check `bags/@lares/v0.1/api/pono/`, `bags/@lares/v0.1/docs/pono/`, and core parser tests. Before changing TW5 sync, check echo-loop guards and draft guards.

Documentation memes go to `bags/` as `.md` files. `.tid` files live in TW5 packages and carry runtime widget / procedure code only.

When reporting back, use OODA-HA receipts: observe facts, orient boundary, decide seam, act summary, ho'oko commands, aftermath risks.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #implements-lar-uri ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri family:control role:implements >>
<<~ pranala #implements-parser ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/parser family:control role:implements >>
<<~ pranala #implements-render-pipeline ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/render-pipeline family:control role:implements >>
<<~ pranala #to-root-agents ? -> lar:///AGENTS family:control role:adjacent >>
<<~ pranala #to-lares-agents ? -> lar:///ha.ka.ba/@lares/v0.1/AGENTS family:control role:adjacent >>
<<~ pranala #to-lares ? -> lar:///LARES family:control role:adjacent >>
<<~ pranala #to-voices ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/voices family:reference role:governs >>
<<~ pranala #to-meme-provider ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/meme-provider family:reference role:describes >>
<<~ pranala #to-dreamnet ? -> lar:///ha.ka.ba/@lares/v0.1/docs/mesh/dreamnet-architecture family:reference role:describes >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
