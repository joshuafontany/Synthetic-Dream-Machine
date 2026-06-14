<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/quine-principles >>
```toml iam
cacheable   = true
file-path   = "bags/@lares/v0.1/api/pono/quine-principles.md"
invariant   = true
mana        = 18
manao       = 18
manaoio     = 17
namespace   = "&#x2299;"
register    = "Synthesis-Canon"
retain      = true
role        = "invariant doctrine: quine principles P1-P4; TiddlyWiki vs Smalltalk comparison; if-it-CAN-live-in-the-wiki-it-MUST rule; IPLD bridge; Heleuma anchor system"
status-date = "2026-05-02"
tags      = ["api/pono/invariant"]
l-space     = "stable"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lares/v0.1/api/pono/quine-principles"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Quine Principles

A **quine** produces its own source code as output.
Lararium's target reaches past a literal quine — it runs as a **self-describing system**:
one where the content graph contains the rules, schemas, and descriptions of its
own structure, accessible via the same capability surfaces used to access any other content.

The four quine principles define when this target is reached and how to measure progress.

**Theoretical grounding:** TiddlyWiki (Ward Cunningham's original wiki principle —
"the simplest online database that could possibly work") meets Smalltalk's
live image model. In both: the environment contains its own description.
In neither: the description is a separate documentation artifact.

<<~/ahu >>

<<~ ahu #p1-unified-store >>

## P1 — Unified Store

**Principle:** System behavior descriptions and system runtime data occupy the same
store, addressable by the same scheme.

There is no "documentation tier" separate from "code tier." A meme that describes
what a filter operator does SERVES AS the filter operator's source of truth. A tiddler
that holds schema rules FUNCTIONS AS the schema used at runtime validation.

**Lararium expression:**
- `lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/tiddler-record` — the schema meme
  for tiddler records — is loaded by the same `resolveLarUri()` call used to load content
- `lar:///ha.ka.ba/@lares/v0.1/api/mu/pattern-integrity` — this very set of principles
  — resides in the same namespace as runtime configuration

**Violation pattern:** A `README.md` that describes behavior that is not mirrored in a
meme. Documentation that can drift from runtime reality violates P1.

**Rule:** Any documented invariant MUST have a corresponding meme with `invariant = true`.
The meme CARRIES the documentation; the documentation INHABITS the meme.

<<~/ahu >>

<<~ ahu #p2-no-privileged-meta >>

## P2 — No Privileged Meta-Level

**Principle:** No part of the system has special self-knowledge that other parts
cannot obtain through the same capability surfaces.

In a quine, the self-reproduction step uses the same output mechanism as everything
else. There is no "reflection API" that works differently from the "content API."

**Lararium expression:**
- `filterTiddlers("[memes[]]")` returns the same set whether called from a widget,
  a test, or the TW5 VM's own boot logic
- `resolveLarUri("lar:///ha.ka.ba/...")` works identically in browser, node, and worker
- `VmDebugSurface` on every peer — no peer has privileged debug access the others lack

**Violation pattern:** A TypeScript-only introspection path that cannot be replicated
inside the wiki. If the wiki cannot ask "what memes carry this capability?" using
the same filter syntax as external code, P2 is violated.

**Rule:** Any system introspection available to external TypeScript MUST be expressible
as a `filterTiddlers()` call. The filter layer serves as the reflection API.

<<~/ahu >>

<<~ ahu #p3-causal-closure >>

## P3 — Causal Closure

**Principle:** The system's behavior is fully determined by its content graph.
No hidden out-of-band configuration determines runtime behavior.

A quine's output is determined solely by its own text. If the output also depends on
an environment variable, a hardcoded path, or an external service, the quine is
not closed — it is partial.

**Lararium expression:**
- Boot behavior is determined by the meme corpus (which memes have `invariant = true`,
  which have `mana ≥ 18`, which carry Heleuma body-sha256 anchors)
- The `lar:` URI resolver is the single gate — all content enters through it
- FPI-2 (wave vs water): behavior MUST stay independent of physical filesystem layout

**Violation pattern:** An environment variable that changes which schema the validator
uses. A hardcoded hostname in a content reference. A feature flag outside the tiddler
store that controls rendering behavior.

**Rule:** All runtime configuration MUST be representable as a tiddler with a `lar:` URI.
The only exception: infrastructure secrets (keys, tokens), which MUST stay outside
the content graph for P3 reasons.

<<~/ahu >>

<<~ ahu #p4-live-feedback >>

## P4 — Live Feedback

**Principle:** Changes to the content graph are immediately reflected in system behavior,
without a build/deploy cycle.

Smalltalk's live image: modifying a method changes the running system. TiddlyWiki's
save-to-self: editing a tiddler changes what the wiki renders, with no intermediate step.

**Lararium expression:**
- `MemeSyncAdaptor.onChangeset()` pushes CRDT deltas into the live TW5 VM — tiddlers
  update in the running wiki without a full reload
- Automerge's `DocHandle.on("change", ...)` event fires into `MemeProvider.handleChange()`
  — the CRDT is the live image transport
- `ReactionEngine` re-runs projections on changeset — UI updates follow content changes

**Violation pattern:** A filter operator that requires a server restart to pick up a
new implementation. Schema rules that require a TypeScript rebuild before they apply.
Any "reload required" path for content that could live in the tiddler store.

**Rule:** Any meme with `mana ≥ 18` and a Heleuma body-sha256 anchor MUST be loadable
at runtime without a restart. The boot-time gate checks these fields; if they pass,
the meme is preferred over the compiled TypeScript equivalent.

<<~/ahu >>

<<~ ahu #tw5-smalltalk-comparison >>

## TiddlyWiki vs Smalltalk

| Dimension | Smalltalk (image) | TiddlyWiki (self) | Lararium target |
|---|---|---|---|
| Unit of modification | Method | Tiddler | Meme (tiddler + TOML header) |
| Live update mechanism | Method dictionary swap | Wiki re-render | CRDT changeset + MemeSyncAdaptor |
| Persistence | `.image` file | Single HTML file | Automerge DocHandle (CRDT) |
| Distribution | Single-machine image | Single-device file | Multi-peer mesh (Beelay sync) |
| Introspection | `doesUnderstand:` | `[all[tiddlers]]` | `[memes[]]` filter |
| Self-description | Classes describe classes | Tiddlers describe tiddlers | Memes describe memes via `lar:` URIs |
| Ephemeralization target | — | — | TypeScript → memes (Heleuma anchors) |

Smalltalk's `doesUnderstand:` is the missing piece in TiddlyWiki. `[memes[]]` is
Lararium's answer: a filter expression that returns the self-describing layer.

<<~/ahu >>

<<~ ahu #if-can-live-in-wiki >>

## The "If It CAN Live In The Wiki It MUST" Rule

This is the operational enforcement of P1–P4 combined.

**Test:** Can this logic be expressed as:
1. A self-contained tiddler with `type: application/javascript` or `text/x-memetic-wikitext`?
2. Accessible via `filterTiddlers()` or `renderTiddler()`?
3. Updatable at runtime via `MemeSyncAdaptor.onChangeset()`?

If yes to all three: it MUST move to a meme. The TypeScript file becomes the
fallback only (Heleuma Stage 4: meme is authoritative, TS is fallback).

**Current candidates (Stage 1):**
- `packages/lararium-tw5/src/filters/memes.ts` — filter operator body is stable
- `packages/lararium-tw5/src/filters/edge.ts` — stable
- `packages/lararium-tw5/src/filters/toml-field.ts` — stable
- `packages/lararium-tw5/src/filters/implementors.ts` — stable

Each has a small, well-defined body (< 30 lines). Each qualifies for a Heleuma anchor.

**MUST:** Once a TypeScript module reaches Heleuma Stage 1, it MUST remain there or
advance. Regression (removing the anchor) requires documented justification in the
meme's `status-date` field.

<<~/ahu >>

<<~ ahu #ipld-bridge >>

## IPLD Bridge

IPLD (InterPlanetary Linked Data) provides content-addressed data with:
- CIDs (Content Identifiers) — self-describing hash references
- Codecs — structured data (DAG-CBOR, DAG-JSON) linked by CID
- Schema layer — IPLD Schema for typed data structures

**Quine alignment:** CID-addressed tiddlers are the fullest expression of P3 (causal
closure). A tiddler addressed by its own content hash cannot be tampered with without
changing its address. The content graph becomes self-certifying.

**Alignment with Keyhive:** BeeKEM's capability tokens are self-certifying ("Documents
identify themselves via public keys"). CID-addressed tiddlers in IPLD would complete
this: the content is self-certifying at the data level, the capability is self-certifying
at the access level.

**Migration path:**
```
Today:   lar:///ha.ka.ba/@lares/v0.1/api/...  →  filesystem path
Sprint 6: same URI                              →  Automerge DocHandle
Sprint N: same URI                             →  Beelay sedimentree
Sprint N+k: same URI + CID hint               →  IPLD CAR store
```

The `lar:` URI resolver (FPI-5 trim tab) makes this migration transparent to all callers.

<<~/ahu >>

<<~ ahu #heleuma-anchor-system >>

## Heleuma Anchor System

The Heleuma system tracks ephemeralization progress from TypeScript toward memes.

A **Heleuma anchor** is a field in a TypeScript module's meme that creates a two-way
link between the compiled artifact and its meme representation:

```toml
# in the meme's TOML iam block:
heleuma       = "ba"        # stage marker
body-sha256   = "sha256:..."  # hash of the TypeScript source at time of meme capture
```

**Stages:**

| Stage | Description |
|---|---|
| 0 | Logic in TypeScript only; no meme |
| 1 | TypeScript file has meme; meme has `heleuma = "ba"` and `body-sha256` |
| 2 | Meme body contains compiled CJS; TypeScript fallback still active |
| 3 | Boot-time gate checks `mana`, `confidence`, `body-sha256`; meme preferred if all pass |
| 4 | Meme is authoritative; TypeScript is fallback only |

**`heleuma = "ba"`**: "ba" (Hawaiian: to carry, to bear) — the meme is now the carrier
of the pattern. The TypeScript file is the material instantiation; the meme is the wave.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/mu/pattern-integrity >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/vm-projection-bus >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
