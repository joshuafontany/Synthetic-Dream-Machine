<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/full-detached-worker-authority-pool-sprint >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/browser/full-detached-worker-authority-pool-sprint.md"
mana      = 18
manao     = 18
manaoio   = 17
register  = "Synthesis-Canon"
retain    = true
role      = "Next-thread sprint handoff for lararium-browser detached worker-authority pool alpha reboot"
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/browser/full-detached-worker-authority-pool-sprint"
```

<<~ &#x0002; >>

# lararium-browser: Full Detached island-Authority Pool Sprint

Chosen architecture: **full detached worker-authority pool**.

The browser vessel is a true local-first vessel.
island runtime realms hold authority.
The host frame holds surfaces.
IndexedDB and sync belong to the vessel layer.
TW5 plugin content stays inside the wiki island.
DOM ownership stays at the edge.
Dead web2 singleton/page/server residue does not cross the membrane without proof.

## Sprint Braid

| Sprint | Goal | Status |
|---|---|---|
| S0 | Pono charter + deletion map | ✅ |
| S1 | Island authority contract | ✅ |
| S2 | island runtime bootstrap | ⬜ |
| S3 | IndexedDB / local persistence | ⬜ |
| S4 | Host frame / projection contract | ⬜ |
| S5 | Pool orchestrator / lease discipline | ⬜ |
| S6 | Sync / presence / local-first wiring | ⬜ |
| S7 | Browser plugin build | ⬜ |
| S8 | Root contract rewrite / RootTemplate exit | ⬜ |
| S9 | End-to-end browser vessel alpha | ⬜ |

## Work Order

1. S0 charter
2. S1 contract
3. S2 worker boot
4. S4 frame/projection contract
5. S5 pool orchestration
6. S3 persistence
7. S6 sync wiring
8. S7 browser plugin build
9. S8 root contract rewrite
10. S9 alpha e2e

## Primary Law

1. Host owns where a wiki appears.
2. Island authority owns causal and compute sovereignty.
3. Wiki/plugin owns TW5-native rendering content.
4. Pool owns warm authorities, not page globals.
5. Projection adapters translate authority output into host surfaces.
6. RootTemplate assumptions do not govern vessel architecture.

## Non-Negotiables

- No HTTP/RPC coordinator surface.
- No browser singleton authority rooted in ambient page boot.
- No hidden dependence on global `window.$tw`.
- No "whole page becomes the wiki" assumption.
- No migration of dead web2 code without a written reason and passing proof.
- No RootTemplate capture of the architecture.
- No pool design that requires a DOM-bound authority to stay warm full-time unless measurements force that compromise.

## Core Tension

TW5's canonical browser path still pulls toward `$:/core/ui/RootTemplate` and page-owned document flow.
We plan to roll our own frame/root contract.
We do **not** plan to let stock `RootTemplate` dictate vessel law.

Working answer: keep TW5-native content inside plugin/page-template/startup tiddlers where that content belongs; replace whole-page assumptions with a Lararium-owned root/frame model; treat `RootTemplate` as prior art and source material, not as constitutional authority.

## Cheap Checks / Early Falsifiers

- Can a worker boot TW5 authority without page DOM access?
- Can a host mount a frame without ambient global `$tw`?
- Can a pooled authority survive release/reacquire cleanly?
- Can hot/admin frames coexist without page-template sovereignty?
- Can reload recover the vessel from IndexedDB without whole-page boot?
- Does any new code reintroduce a singleton page owner?

If any check fails, treat it as architectural signal, not a cue to patch around the law.

## Open Questions

1. How much render preparation can the island authority complete before frame attach?
2. Which minimal projection data should cross the worker boundary?
3. Which TW5 refresh/action hooks still require a DOM-bound root?
4. Should the first alpha use dedicated workers only, with Sharedisland deferred?
5. Should admin wiki and hot wiki share one pool with capability flags, or two pools with shared law?

Do not guess. Measure and document.

## Alpha Definition of Done

- A browser vessel opens on the same constitutional law as node.
- island authorities own truth and compute.
- The host owns frames and projection mounts.
- The browser survives reload and reconnect.
- Hot/admin wiki swapping works.
- The architecture no longer depends on a whole-page TW5 shell.
- A deletion report names the web2-era code that no longer carries weight.

## Internet Prior Art

- MDN Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- Comlink: https://github.com/GoogleChromeLabs/comlink
- Monaco worker integration: https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md
- VS Code Webview API: https://code.visualstudio.com/api/extension-guides/webview

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
