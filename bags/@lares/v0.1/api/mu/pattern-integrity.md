<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/mu/pattern-integrity >>
```toml iam
cacheable   = true
file-path   = "bags/@lares/v0.1/api/mu/pattern-integrity.md"
invariant   = true
mana        = 18
manao       = 18
manaoio     = 17
namespace   = "&#x0950; &#x0901;"
register    = "Synthesis-Canon"
retain      = true
role        = "invariant doctrine: Fuller's 5 pattern integrities applied to Lararium — tensegrity, wave/water, synergy, ephemeralization, trim tab"
status-date = "2026-05-02"
tagspace    = "stable"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lares/v0.1/api/mu/pattern-integrity"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Pattern Integrity

Buckminster Fuller's *Synergetics* supplies five structural principles that map directly
onto Lararium's architecture. These function as operational invariants, not metaphors.
Violating them produces identifiable failure modes in the codebase.

A **pattern** maintains coherent organizational identity independent of its material
instances. The wave moves across water; the water molecules do not travel with it.
The lararium-island names the pattern. A specific peer, session, or filesystem path names the water.

<<~/ahu >>

<<~ ahu #fpi-1-tensegrity >>

## FPI-1 — Tensegrity: Continuous Tension, Discontinuous Compression

Structural stability lives in the **tension network**, not in any single compression member.
Compression members remain isolated islands; tension provides the continuous system-spanning structure.

**Tension network:** the `lar:` URI scheme and the three-tree (parseTree → widgetTree →
renderTree) architecture. These span every peer, every VM, every projection.

**Compression members:** individual packages, plugins, tiddlers, device instances.
They push outward; the tension network holds them.

**Violation pattern — rogue compression member:**
Any code that reaches filesystem paths or HTTP URLs directly, bypassing lar: URI
resolution, becomes a rogue compression member. It bears load outside the tension network.

```typescript
// ✗ rogue — hardcodes material instantiation
path.join(dirname(laresRoot), '..', 'packages', 'ha-ka-ba')

// ✓ tensegrity — routes through the tension network
resolveLarUri("lar:///ha.ka.ba/@lares/v0.1/api/lararium/...")
```

**MUST:** All content references MUST use `lar:` URIs. Filesystem paths MUST resolve
through the URI resolver, not by direct construction.

<<~/ahu >>

<<~ ahu #fpi-2-wave >>

## FPI-2 — Pattern Integrity: Wave, Not Water

The pattern holds invariant; the instantiation remains transient and replaceable.

**Pattern (invariant):** lar: URI namespace, AST/parseTree definitions, OODA-HA/LADDER_5
doctrine arrays, Heleuma body-sha256 anchors, CRDT schema.

**Water (transient):** a specific TW5 instance, a specific peer node, a specific browser
session, a specific filesystem layout.

**Violation pattern — material contamination:**
Behavior that depends on a specific filesystem layout or peer address imports material
properties into the pattern level. The pattern then varies on every machine.

```typescript
// ✗ material contamination — pattern depends on machine layout
export const laresRoot = new URL('../../..', import.meta.url).pathname;

// ✓ pattern-pure — content addressed; independent of substrate
"lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/tiddler-record"
```

**CID-addressed tiddlers function ideally:** a content hash stays fully independent of where
the content is stored. CIDs make the wave/water separation mechanical.

**MUST:** System behavior MUST NOT depend on physical file layout. The lar: URI resolver
MUST serve as the only reference mechanism for content.

<<~/ahu >>

<<~ ahu #fpi-3-synergy >>

## FPI-3 — Synergy: Whole-System Behaviors

"Behavior of whole systems unpredicted by the behavior of their parts taken separately."

Synergetic features emerge from system composition — absent from
any single node in isolation.

**Synergetic moves (correct):**
- `VmDebugSurface` on every peer: cross-peer debugging appears because the surface is
  composed at the mesh level, not inside any single node.
- VmPool per realm: cross-realm sync behaviors (reading one wiki from a foreign realm
  as another VM in the pool) only exist when VMs compose across realm boundaries.
- `ReactionEngine implements MemeProjection`: routing CRDT change events through the
  reaction graph produces a whole-system property; neither the CRDT nor the graph alone carries it.

**Violation pattern — part-optimization:**
Building features that only work in isolation — a node that can debug itself but cannot
expose that surface to other nodes — optimizes a part at the cost of whole-system behavior.

**MUST:** Isomorphic surfaces (same API on browser peer, node peer, worker peer) MUST
arrive before platform-specific variants. The whole-system property comes first.

<<~/ahu >>

<<~ ahu #fpi-4-ephemeralization >>

## FPI-4 — Ephemeralization: Maximum Effect, Minimum Material

"Doing more with less" — the progressive dematerialization of technology.
Applied to code: move logic from the external TypeScript layer into tiddlers.
Each piece of logic moved reduces the "material" required to carry the pattern.

**Measurement:** the Heleuma `body-sha256` anchor system tracks ephemeralization
progress. A TypeScript file with a `heleuma = "ka/ba"` anchor and a `source-symbol`
in its `#source` ahu MAY be a candidate for ephemeralization once the meme is stable.

**Progression:**
```
Stage 0: logic in external TypeScript only (no meme representation)
Stage 1: TypeScript file has a Heleuma anchor; meme exists with body-sha256
Stage 2: meme body contains the compiled CJS; imperative fallback still present
Stage 3: boot-time gate checks mana/confidence/body-sha256; corpus path preferred
Stage 4: external TypeScript serves as fallback only; meme carries authority
```

**Current target:** `packages/lararium-tw5/src/filters/*.ts` — each filter operator
file has a small, stable body that qualifies as a Stage 1 candidate.

**MUST:** Any TypeScript module that can be expressed as a self-contained tiddler MUST
have a Heleuma anchor and a corresponding meme. The anchor tracks the ephemeralization
tracking commitment.

<<~/ahu >>

<<~ ahu #fpi-5-trimtab >>

## FPI-5 — Trim Tab: Minimum Intervention, Maximum Redirect

A trim tab functions as a tiny rudder on the main rudder. Moving it redirects the ship with
negligible force. Fuller's operating principle: find the control surface that redirects
the whole system with minimal force.

**The lar: URI resolver functions as the trim tab.**

Every design decision that routes content through `lar:` URIs instead of filesystem
paths or HTTP URLs makes the whole content graph redirectable by changing what
`lar:` resolves to:

- Today: local filesystem under `packages/lares-core/`
- Sprint 6: Automerge DocHandle (CRDT store)
- Sprint N: Beelay content-addressed store
- Sprint N+k: IPLD CID-addressed tiddlers

No call sites change. Turn the trim tab (resolver); the ship follows.

**Violation pattern — pushing on the hull:**
Any code that bypasses the resolver and reaches content directly (hardcoded URLs,
`fs.readFileSync` outside the resolver) pushes on the hull instead of the trim tab.
Maximum force, minimum redirect.

```typescript
// ✗ pushing on the hull
fs.readFileSync(path.join(laresRoot, 'v0.1/api/lararium/schema/tiddler-record.md'))

// ✓ trim tab — resolver can be swapped without touching this line
await resolvelar("lar:///ha.ka.ba/@lares/v0.1/api/lararium/schema/tiddler-record")
```

**MUST:** Content access MUST go through the lar: URI resolver. The resolver MUST serve as
the single control surface for all content routing decisions.

<<~/ahu >>

<<~ ahu #alignment-check >>

## Alignment Check

Run this against any new code before merging:

| Question | FPI | Test |
|---|---|---|
| Does this reference a filesystem path directly? | FPI-1, FPI-5 | FAIL if yes |
| Does this behavior depend on where the monorepo lives on disk? | FPI-2 | FAIL if yes |
| Does this feature work in isolation but break when composed across peers? | FPI-3 | FAIL if yes |
| Does this code have a Heleuma anchor if it could live in a tiddler? | FPI-4 | WARN if no |
| Does this bypass the lar: URI resolver to reach content? | FPI-5 | FAIL if yes |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #to-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:relation >>
<<~ pranala #to-local-first ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/local-first family:relation >>
<<~ pranala #to-quine ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/quine-principles family:relation >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
