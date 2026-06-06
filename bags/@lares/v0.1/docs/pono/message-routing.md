<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/message-routing >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/docs/pono/message-routing"
file-path = "bags/@lares/v0.1/docs/pono/message-routing.md"
type      = "text/x-memetic-wikitext"
tagspace  = "stable"
register  = "Synthesis"
mana      = 16
manao     = 16
role      = "extended docs: memetic-wikitext message routing — render-down (dataflow) and message-up (message) over the control DAG; lexical meme-scope; filter context binding"
cacheable = false
retain    = false
invariant = false
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Message Routing

Extended docs for memetic-wikitext's two routing directions on the canvas / flow surface. The family law lives at `lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-families`; this surface carries the routing treatment the submission spec abstracts.

The message-up / render-down tree pattern holds as correct modern architecture, not TW5 legacy: SwiftUI (PreferenceKey) and Flutter (NotificationListener + InheritedWidget) converged on the same model independently. The improvement over TW5 — routing decouples message channels from tree position: multiple independent channels, not one `messagecatcher` per branch.

<<~/ahu >>

<<~ ahu #two-directions >>

## Two Routing Directions

```
RENDER-DOWN  (environment / data-push)
  pranala family:dataflow — push-forward from source toward owned subtree
  Analog: SwiftUI Environment, Flutter InheritedWidget, React Context

MESSAGE-UP   (event / signal-bubble)
  pranala family:message — bubble from source toward control root
  Analog: SwiftUI PreferenceKey, Flutter Notification, DOM bubbling
```

Both ride the canvas / flow surface (value and signal wires) — distinct from `transclusion`, which embeds page-surface content.

<<~/ahu >>

<<~ ahu #routing-rules >>

## Invariant Routing Rules

1. A `family:dataflow` edge carries a value **root-ward → leaf-ward** (source pushes to its owned subtree).
2. A `family:message` edge carries a signal **leaf-ward → root-ward** (source bubbles toward the control root).
3. Routing follows the `family:control role:owns` DAG, not `ahu` nesting depth.
4. **Multiple independent channels** — one per named pranala edge. No global catcher. A meme declares itself a handler by carrying an inbound `family:message` edge.
5. Message propagation stops at the nearest upstream handler. Absent a handler, the signal drops with a diagnostic, not an error.

<<~/ahu >>

<<~ ahu #lexical-scope >>

## Lexical Scope — No Ambient `currentMeme`

Variables do not leak through sibling scope. The `meme` sigil sets an explicit lexical context:

```text
<<~ meme lar:///uri >>       binds lar:///uri as the rendering context — lexical, not ambient
  <<~ kahea sub-template >>  the template reads lar:///uri as current meme
<<~/meme>>
                             sibling sigils outside this block stay unaffected
```

This follows the Svelte `setContext` model: explicit, bounded, non-leaking. The wikitext filter binds meme context through the `meme` sigil alone; it carries no ambient `currentMeme` lookup.

<<~/ahu >>

<<~ ahu #filter-context >>

## Filter Context Binding

Filters inside `heihei` / `huli` / `ui` evaluate against the **explicit current meme context** — set by the nearest enclosing `meme` block, or the carrier's own `#iam` URI when no `meme` runs. No ambient dynamic lookup.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ pranala #governed-by ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-families family:control role:governed-by >>
<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
