<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/tw5-browser-surface >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/tw5/tw5-browser-surface"
file-path    = "bags/@lararium/v0.1/tw5/tw5-browser-surface.md"
source-file  = "packages/lararium-tw5/src/tw5-browser-surface.ts"
type         = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
mana         = 17
role         = "Named adapter boundary: the ONE file allowed to hold DOM/RootTemplate references in the lararium-browser seam"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`tw5-browser-surface.ts` defines the **named adapter boundary** for the lararium-browser vessel.

It carries all `HTMLElement`, `shadowRoot`, and `window.document` references that the
TW5-to-browser projection requires. No other file in the browser vessel path may import
these types without an explicit entry in `deletion-map.md`.

**What it owns:**

- `mountPanel(engine, container: HTMLElement)` — mounts a TW5 wiki into a host-owned DOM container. Currently uses `$:/core/ui/RootTemplate`; this body holds **Quarantine** class pending S4/S8 rewrite to the Lararium root contract.
- `setPalette(engine, paletteName)` — writes the active palette tiddler. No DOM dependency. **Constitutional** class; may migrate to `@lararium/browser` projection helpers.
- `setBootSplash(engine, active)` — writes/deletes the boot-splash state tiddler. No DOM dependency. **Constitutional** class.

**What it does NOT own:**

- Island authority boot or lifecycle.
- Automerge or sync state.
- Any TW5Engine state beyond reading `engine.$tw`.
- Any seam that crosses the worker boundary.

**RootTemplate status:**

`mountPanel` currently transcluded `$:/core/ui/RootTemplate` because that followed the established TW5 browser story river path. This marks the strongest remaining RootTemplate dependency in the stack. The S4/S8 sprints replace it with a Lararium-owned root/frame contract. Until then, the dependency lives here and nowhere else.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #deletion-map ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/deletion-map family:reference role:adapter-registry >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
