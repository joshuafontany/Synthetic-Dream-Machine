<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >> -->

<<^ &#x0001; ? -> lar:///packages/AGENTS >>

<<~ ahu #iam >>

```toml
uri-path     = "packages/AGENTS"
file-path    = "packages/AGENTS.md"
content-type = "text/x-memetic-wikitext"
l-space      = "adjacent"
confidence   = 17
register     = "CS"
manaoio      = 16
mana         = 18
manao        = 17
role         = "package workspace navigation shore for coding agents"
cacheable    = true
hydrate      = true
retain       = true
```

<<~/ahu >>

<<~ ahu #ooda-ha >>
✶ scan the operator ask, changed files, open tabs, and package boundary.
⏿ orient the task against the spine: mesh contracts, TW5 VM, node host, browser vessel, caps, operator CLI.
◇ choose the smallest package surface that can carry the change without crossing canon by accident.
▶ edit tests and source together; prefer narrow shores over broad rewrites.
⤴ run typecheck, focused tests, and build when the shore touches generated or bundled code.
↺ report receipts: files touched, commands run, friction found, next loop.
<<~/ahu >>

<<^ &#x0002;>>

<<~ ahu #network-topology >>

## Network Topology (canonical)

**Lararium** — one operator's infrastructure: a `lararium-node` process + browser peers + devices. The household shrine. Smallest unit.

**Nexus** — a confederated mesh of Lararia sharing a stable internal sync network. Named by community + place (e.g. "Floating Library of Mu, PNW Branch"). The Nexus keypair carries the confederation.

**DreamNet** — the overall super-mesh of all Nexuses: allied, neutral, and oppositional. Opposition lives by design. Cross-Nexus connections travel through explicit brokers and tolerate degraded state.

Within-Nexus sync = Automerge CRDT (reliable). Cross-Nexus = explicit treaty, wild-magic-zone hops (unreliable).

<<~/ahu >>

<<~ ahu #package-map >>

## Package Map (active)

Eight packages carry the stack. Each owns one boundary; cross-cutting work travels through the contracts in `@lararium/mesh`.

**This map names boundaries, never files.** A file inventory here rots the moment the tree moves, and a stale inventory misleads worse than none — read the package's own `src/` for what lives in it.

`@lararium/mesh` carries contracts and graph law. Keep this package TW5-neutral, browser-neutral, and Node-neutral. Shared types, `lar:` URI resolution, capability schemas, the Automerge/composite store law, residency tiers, recipes, causal-island + island-protocol, and the session gradient parser live here. Mesh owns the island `Repo` factory (`makeIslandRepo`); the vessel-opening packages (`node`, `browser`) construct the vessel's own `Repo`. `@lararium/tw5` and `@lares/cli` hold **zero** `@automerge` dependencies — keep it that way.

`@lararium/tw5` carries TiddlyWiki runtime integration: the TW5 VM surface, the island layer, the memetic-wikitext machinery, the verb pipeline, TW5-side stores, and the TW5 wikirules/macros/modules/filters. Holds zero `@automerge` dependencies. Treat disk projection as Node-shaped even when the barrel export exposes it.

`@lararium/node` carries local Lararium host duties: the host and vessel boot, island plumbing, bag-path + residency law, boot artifacts, the wiki composition family, disk projection, the UDS verb-channel, and the oracle read-face. One `lararium-node` process = one Lararium (household shrine). The running server **finds**; it never seeds social state. No TW5 VM ever runs on the main thread — every engine lives in a worker.

`@lararium/browser` carries browser Lararium peer duties, paralleling `@lararium/node` with browser-native capabilities (WebSocket, IndexedDB, WebCrypto), plus `__stubs__` for browser-incompatible deps. The browser vessel is a genuine remote peer: it speaks WS to a node's relay across a real island boundary. No React, no canvas.

`@lararium/app` carries the browser-lararium app shell — boots a sovereign browser vessel and, when reachable, reads the public `@oracle` read-face. Location-agnostic: served from localhost, LAN, or a public host, the vessel always runs local; the origin is a static host, **never an authority**.

`@lararium/keyhive` carries the capability layer — a pre-alpha integration of `@keyhive/keyhive` WASM bindings. One Keyhive Doc = one bag (1:1). The access axis carries the four Keyhive-native verbs (`pull` / `read` / `edit` / `admin`). Cap-event home and γ-with-operator-α-mirror sync stay in design flux — touch with care.

`@lararium/mempalace` carries the session-memory integration — a local-only read leg over the pinned mempalace sidecar plus the declared `lar_*` writeback (the tensegrity that binds verbatim drawers to domain bearings). mempalace itself rides **behind a causal-island boundary** as a vendored substrate — the memory-library, accessed-not-loaded — never a citizen of the stack. See `packages/MEMPALACE-INTEGRATION.md` + `lar:///ha.ka.ba/lararium/api/mempalace-integration`.

`@lares/cli` carries the operator-facing surface: the `lares` binary, arg parsing, process spawn, the socket invoker, the harness-wiring on `wake`, and the verb family in `commands/`. The CLI carries no protocol logic and **no transport of its own beyond one socket** — every verb dispatches to `@lararium/node` handlers through the daemon's UDS verb-channel (`verb-call.runVerb` → `local-connector.invokeLocal` → `<dataDir>/lares.sock`); an absent socket raises `DaemonUnreachable`, never a fallback. WS lives at the daemon's relay, for genuine remote peers; the CLI holds no Automerge dependency at all.

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

Residency transitions travel through the ACTION verb surface (`ADD`, `COPY`, `MOVE`, `CLEAR`, `DROP`, `LOAD`) governed by the [Residency Model Epic](EPIC-RESIDENCY-MODEL.md). The `lares act` CLI carries the operator surface; no `promote` shim exists. Do not let live wiki edits write `bags/` directly — operators land bag content through ACTION verbs.

<<~/ahu >>

<<~ ahu #boot-sequence >>

## Boot Sequence — three causal moments

The Lararium node treats build, init, and runtime as strictly separated authorship moments. No moment reaches into another's authority.

```text
Build time    scripts/build-genesis-island.ts    content Tiga → genesis/island.bin (CID-verifiable)
Init time     lares vessel found  (was scripts/init-lararium.ts)    social Tiga + identity ceremony → genesis/social-bootstrap.json
Runtime       openNodeVessel  /  openBrowserVessel          finds docs, wires layers; never authors social state
```

`genesis/social-bootstrap.json` materializes as a TW5 plugin container tagged `$:/tags/LarariumBootstrap`. The `lararium-bootstrap-sync` startup module promotes the container after the syncer initializes, so the bundle syncs as one package and individual user overrides remain editable.

### Admin VM (landed)

Admin state lives in its own Automerge doc at `lar:///ha.ka.ba/bags/@admin` (bag URI; aligned to the bag-tag rule in [lar-uri.md](../bags/@lares/ha.ka.ba/lares/api/pono/lar-uri.md)). The logical room presents at `lar:///ha.ka.ba/lararium/rooms/admin` (room URI). Two URIs, one doc — the bag-as-doc invariant gives admin its own sync boundary. The admin VM hosts itself through `open-admin-vm` (node) and `open-browser-admin-vm` (browser); bag-mirror configs ride as `$:/tags/LarariumBagMirror` tiddlers inside admin.

Operator-private to one node, federated to the operator's own devices via `cap=admin` device delegations through `@lararium/keyhive`.

### Browser three-tier genesis (landed)

`browser-genesis` mirrors the node three-tier model (pinned / hot / cold) into IndexedDB. The browser vessel earns the same gates A/B/C as node and the `workerEa` admin gate sits in front of the admin VM.

### Projection registry

Projections register as kinds with `LarProjectionRegistry`. The node-scoped `disk-projector` kind lives in `@lararium/node`. Configs ride as admin-room tiddlers tagged `$:/tags/LarariumProjection`.

<<~/ahu >>

<<~ ahu #boundary-law >>

## Boundary Law

**Core MUST NOT import** TW5, React, filesystem APIs, DOM APIs, or Automerge runtime objects. `@lararium/mesh` stays neutral.

**Browser code SHOULD NOT** import Node-shaped disk paths. If `fs`, `path`, `vm`, or Node crypto enter a browser bundle, surface the shore. Use the `@lararium/browser/__stubs__` pattern for browser-incompatible deps.

**Namespace boundary.** `@lararium/*` = runtime stack (mesh, tw5, node, browser, app, keyhive, mempalace). `@lares/*` = operator-facing surface (cli). `@dreamdeck/*` = app/canvas layer (none active yet). Do not cross these on convenience.

**TW5 derived child tiddlers SHOULD** roundtrip through parent carriers without losing decorators, sigils, TOML, or sibling slots. Any fallback reconstruction counts as a ka spot until a test covers it.

**Session-local tiddlers stay local.** `$:/temp/*`, `Draft of *`, cursors, focus state, and private overlays MUST NOT reach shared room state.

**Capability layer is the only authority gate.** Do not invent ad-hoc auth checks; route through `@lararium/keyhive` or the `admin-auth-gate` in `@lararium/node`.

**Bag URI law.** Bag tags occupy `child[1]` only. Do not promote a `child[N]` sigil to bag identity. See [lar-uri.md](../bags/@lares/ha.ka.ba/lares/api/pono/lar-uri.md).

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
pnpm test:tw5-flow         # placeholder — residency-action flow scripts pending
pnpm test:flows            # top-level integration flows
```

Build all package outputs when generated files, barrels, bundle shores, TW5 vendor assets, or app integration change:

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
* **`pnpm-workspace.yaml` globs `packages/*`.** A directory added there without a `package.json` and source will surface install errors.
* **Open IDE tabs** may name stale files; trust filesystem scans over editor ghosts.
* **mempalace stays vendored.** Never edit the `mempalace/` submodule; it rides behind the causal-island boundary. Tune behavior through `~/.mempalace/config.json` (e.g. `hooks.auto_save=false`) and our `@lararium/mempalace` layer. Bumping the `lar_*` enrichment ⇒ bump `lar_hv` in lockstep (`harvest.ts buildPatch` ⟷ `drawer_io.py HARVEST_VERSION`). Run `lares sense pour --all` only on a **fresh** palace — re-staging existing drawers under a new `source_file` duplicates them.

<<~/ahu >>

<<~ ahu #edit-discipline >>

## Edit Discipline

Prefer one shore per loop. Patch the package that owns the behavior. Add or update a test near the owner package. Keep canon, room, user, and session layers distinct in names and code paths.

Before changing a public export, check browser and node consumers (and `@lares/cli`, which depends on both `@lararium/mesh` and `@lararium/node`). Before changing parser or carrier grammar, check `bags/@lares/ha.ka.ba/lares/api/pono/`, `bags/@lares/ha.ka.ba/lares/docs/pono/`, and core parser tests. Before changing TW5 sync, check echo-loop guards and draft guards.

Documentation memes go to `bags/` as `.md` files. `.tid` files live in TW5 packages and carry runtime widget / procedure code only.

When reporting back, use OODA-HA receipts: observe facts, orient boundary, decide shore, act summary, ho'oko commands, aftermath risks.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/lares/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/lares/api/pono/invariant family:control role:implements >>
<<~ pranala #implements-lar-uri ? -> lar:///ha.ka.ba/lares/api/pono/lar-uri family:control role:implements >>
<<~ pranala #implements-parser ? -> lar:///ha.ka.ba/lares/api/pono/parser family:control role:implements >>
<<~ pranala #implements-render-pipeline ? -> lar:///ha.ka.ba/lares/api/pono/render-pipeline family:control role:implements >>
<<~ pranala #to-root-agents ? -> lar:///AGENTS family:control role:adjacent >>
<<~ pranala #to-lares-agents ? -> lar:///ha.ka.ba/lares/AGENTS family:control role:adjacent >>
<<~ pranala #to-lares ? -> lar:///LARES family:control role:adjacent >>
<<~ pranala #to-voices ? -> lar:///ha.ka.ba/lares/api/voices family:reference role:governs >>
<<~ pranala #to-meme-provider ? -> lar:///ha.ka.ba/lares/docs/lararium/meme-provider family:reference role:describes >>
<<~ pranala #to-dreamnet ? -> lar:///ha.ka.ba/lares/docs/mesh/dreamnet-architecture family:reference role:describes >>
<<~ pranala #to-mempalace-integration ? -> lar:///ha.ka.ba/lararium/api/mempalace-integration family:reference role:describes >>

<<~/ahu >>

<<^ &#x0003;>>

<<^ &#x0004; -> ? >>
