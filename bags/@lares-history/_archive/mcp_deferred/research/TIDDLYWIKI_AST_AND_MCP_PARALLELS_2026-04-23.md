# TiddlyWiki AST / Widget Graph Pass — MCP Parallels

Research cut date: **April 23, 2026**
Local source set:
- `tiddlywiki5/boot/boot.js`
- `tiddlywiki5/core/modules/wiki.js`
- `tiddlywiki5/core/modules/parsers/wikiparser/wikiparser.js`
- `tiddlywiki5/core/modules/widgets/widget.js`
- `tiddlywiki5/core/modules/widgets/wikify.js`
- `tiddlywiki5/core/modules/startup/load-modules.js`
- `tiddlywiki5/core/modules/startup/rootwidget.js`
- `tiddlywiki5/core/modules/startup/render.js`

Web source set:
- TiddlyWiki developer docs
- Model Context Protocol specification
- Epic / UEFN Scene Graph docs

---

## Executive contraction

This pass pushes one strong conclusion:

The Lararium should stop treating syntax and hydration as only a network of `lar:///...` identifiers.
The next stable center should carry **actual graph layers**:

1. source text
2. parse tree / AST
3. execution tree / widget tree
4. render target tree

TiddlyWiki supplies the clearest working exemplar in the current repo.
Its internal architecture already runs:

`text -> parse tree -> widget tree -> DOM`

The Lararium can consume that pattern directly while keeping host law, host metaphysics, and host naming intact.

---

## What the TiddlyWiki submodule currently teaches

## 1. Boot stays tiny, then yields to typed modules

Local evidence:
- `boot/boot.js` names itself as the barebones kernel
- startup then loads typed modules with `module-type`
- later startup modules assemble parsers, widgets, root widget handlers, and final page render

The broad flow reads:

1. boot kernel builds `$tw`
2. tiddlers and modules load from browser DOM or filesystem
3. JavaScript tiddlers with `module-type` register as modules
4. startup modules apply methods to `$tw`, `Tiddler`, and `Wiki`
5. parser classes and widget classes get assembled
6. root widget arrives
7. page template transcludes into a widget tree
8. widget tree renders into DOM

This boot shape strongly resembles the Lararium target:
- threshold
- hydrated invariants
- typed graph walkers
- runtime execution graph
- render targets

---

## 2. “Every internal module is a tiddler” gives more than storage

TiddlyWiki does not merely store content in tiddlers.
It also stores JavaScript modules as titled tiddlers with metadata such as:
- `title`
- `type`
- `module-type`

`boot.js` then registers and executes those modules through the module mechanism.

That pattern matters for Lares because it collapses:
- content address
- metadata
- source body
- type declaration
- runtime loading

into one carrier.

The Lararium already moves partway in that direction with:
- `lar:` addressing
- `#iam`
- `implements`
- `role`
- `pranala`

The missing step now looks like:

**promote each lawful carrier from linked document node to typed AST-bearing carrier with executable lowering paths.**

---

## 3. TiddlyWiki already distinguishes graph layers cleanly

Local source evidence:
- `wikiparser.js` describes source text turning into a parse tree
- `wiki.js` exposes `parseText`, `parseTiddler`, and `makeWidget`
- `wikify.js` can emit both `parsetree` and `widgettree`
- widget docs describe parse-tree nodes becoming widget objects, then DOM

That gives a very crisp four-layer separation:

| Layer | TiddlyWiki form | Lararium parallel |
|---|---|---|
| source | wiki text / tiddler body | memetic wikitext / guest grammar body |
| syntax graph | parse tree | AST graph |
| execution graph | widget tree | execution / hydration / view graph |
| render graph | DOM | DOM / tldraw / Kowloon / future scene target |

The Lararium should keep `lar:///...` URIs at the identity layer, but should no longer ask the URI graph to do syntax and execution work by itself.

---

## 4. Sandboxing in TiddlyWiki stays partial, not absolute

Local evidence:
- `boot.js` uses Node `vm`
- `evalSandboxed` and `sandbox` contexts exist
- module execution receives a constrained sandbox object
- browser and server differ
- safe mode disables custom overrides and plugins rather than fully proving code safety

So the submodule teaches a useful caution:

TiddlyWiki carries:
- sandboxing gestures
- execution compartments
- safe mode

but not a total capability-proof security model.

For Lares, that suggests:

1. borrow the **layer separation**
2. borrow the **small boot kernel**
3. borrow the **typed-module loading pattern**
4. do **not** overclaim TiddlyWiki-style sandboxing as the whole security answer

MCP security, roots, approval gates, and local sandboxing still need their own lane.

---

## 5. Pranala already gives the Lararium a host-grade edge law

Local repo evidence outside the submodule matters here too:
- `lar:///ha.ka.ba/@lares/api/v0.1/pono/pranala` already defines one typed, directed, acyclic edge between sockets
- `family`, `lifecycle`, `role`, `traversal`, and `propagation` already stay distinct in law
- `control role:owns` already carries lifetime pressure that lines up well with runtime hierarchy
- docs and API loci across Mu, Lararium, and child invariants already use explicit hydration `pranala` rather than loose markdown adjacency

That means the Lararium does not start from a blank graph problem.
It already carries a host edge constitution.
The missing move looks narrower:

**compile `pranala` into explicit graph planes instead of leaving it as surface routing markup.**

Practical read:
- `relation` edges belong first to identity / provenance graph
- `control` edges belong first to execution ownership graph
- `dataflow` edges belong first to live binding graph
- `message` edges belong first to event graph
- `constraint` edges belong first to declarative rule graph
- `observe` edges belong first to operator / inspection graph

That separation would let one host edge law survive while different graph planes consume different families.

---

## 6. Refresh and execution ride the tree, not the raw text

TiddlyWiki widget docs show message bubbling and selective refresh on the widget tree.
That means the live system operates on the execution graph, not on plain source text.

The Lararium should likely follow the same discipline:

- source edits regenerate syntax graphs
- syntax graphs lower into execution graphs
- execution graphs feed render targets
- refresh and interaction should travel through execution graphs

That move would keep:
- `lar:` identity graph
- AST graph
- execution graph
- render graph

distinct instead of blended.

---

## Parallels in current MCP research and standards

## 1. MCP already points toward typed graph payloads

The MCP tools spec now supports:
- `structuredContent`
- `outputSchema`
- resource links
- embedded resources

That does not yet give a full AST protocol by itself, but it gives a natural carriage for AST-shaped data.

Practical parallel:
- a Lararium parser tool can return `structuredContent` matching an AST schema
- that tool can also return resource links to source loci or compiled artifacts

Source:
- Model Context Protocol tools spec, rev. 2025-06-18  
  https://modelcontextprotocol.io/specification/2025-06-18/server/tools

## 2. MCP prompts and resources support graph assembly, not only strings

The prompts and resources specs support:
- embedded resources
- URI-addressed resources
- metadata annotations
- list-changed notifications

That aligns with a model where:
- source text stays one resource
- AST becomes another resource
- execution graph becomes another resource
- render-target projections become further resources

Sources:
- MCP resources spec, rev. 2025-06-18  
  https://modelcontextprotocol.io/specification/2025-06-18/server/resources
- MCP prompts spec, rev. 2025-06-18  
  https://modelcontextprotocol.io/specification/2025-06-18/server/prompts

## 3. “Structured outputs” pressure in current model tooling pushes the same direction

Current MCP and model-tooling practice rewards explicit schemas.
That pressure matches an AST-first Lararium.

Instead of:
- freeform “parse this page”

the Lararium should prefer:
- typed parse requests
- typed AST responses
- typed lowering passes
- typed render-target projections

## 4. Unreal Scene Graph sharpens the owned-hierarchy comparison

Epic's current Scene Graph docs for UEFN describe entities as hierarchical, component-bearing runtime objects, and describe parent entities as controlling the lifetime of nested child entities. That comparison helps sharpen one specific Lararium design choice:

- not every edge should act like parenthood
- owned hierarchy should stay explicit
- non-owning relations should remain separate typed edges

That pressure fits the existing `pranala` law well.
`control role:owns` can carry the nearest host parallel to parent-child entity hierarchy, while `dataflow`, `message`, `constraint`, and `observe` remain parallel graph lanes rather than fake children.

Source:
- Epic entity hierarchy docs, accessed April 23, 2026  
  https://dev.epicgames.com/documentation/en-us/fortnite/entity-hierarchy

## 5. Scene-graph adoption elsewhere supports the architectural move

Epic’s current Scene Graph docs for UEFN frame Scene Graph as a unified structure connecting world objects and enabling duplication, iteration, and reusable prefabs.
That differs from TiddlyWiki’s widget tree in domain, but the structural rhyme still helps:

- node identity
- parent/child relations
- reusable subgraphs
- operations over related structures
- multiple target behaviors downstream

Source:
- Epic / UEFN Scene Graph docs  
  https://dev.epicgames.com/documentation/uefn/scene-graph-in-unreal-editor-for-fortnite

---

## Direct implications for the Lararium

## A. Lock wikitext into AST graphs

The next invariant step should name at least:

- source carrier
- parser output schema
- execution graph schema
- render projection schema

Candidate shape:

```text
lar carrier
  -> source text
  -> parse AST
  -> execution graph
  -> render projection
```

## B. Treat `lar:` graph and AST graph as adjacent, not identical

More sharply now:
- `lar:///...` and socket identity stay in the identity plane
- `pranala` stays the host typed-edge constitution across planes
- AST nodes stay syntax objects, not substitute links
- execution nodes stay runtime objects, not parse nodes in disguise

`lar:` graph should continue to carry:
- identity
- address
- provenance
- relationship
- hydration edges

AST graph should carry:
- syntax nodes
- attributes
- source spans
- child order
- grammar ownership

Execution graph should carry:
- instantiated node class
- variables / scope
- event hooks
- dependency edges
- refresh semantics

## C. Make TiddlyWiki Filter Language a first-class guest grammar AST lane

The current TiddlyWiki filter import should now move from “guest grammar admitted” toward:

- parsed filter AST
- typed operator nodes
- preserved run-prefix nodes
- lowering path into Lararium query / selection semantics

That move would support direct comparison between:
- imported filter AST
- host query AST

without forcing the host to become TiddlyWiki.

## D. Use tldraw and Kowloon as render / projection targets, not just adjacent products

Once AST and execution graphs arrive, projections can target:
- DOM-like render
- tldraw scene / visual graph
- Kowloon feed / thread projections
- crystal / continuity traces

That would make the current submodule program much tighter.

---

## Recommended next locking actions

1. define a **memetic-wikitext AST schema**
2. define a **guest-grammar AST envelope**
3. define a **widget/execution graph schema** for Lararium runtime lowering
4. define **render projection contracts** for DOM, tldraw, and Kowloon
5. add a parser story for **TiddlyWiki Filter AST import**

---

## One-sentence conclusion

TiddlyWiki contributes the strongest current exemplar for the Lararium’s next step: not merely a graph of named loci, but a stack of typed graphs where text lowers into AST, AST lowers into execution, and execution lowers into multiple render targets.
