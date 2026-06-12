<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/api/pono/loci.md"
mana      = 15
manao     = 17
manaoio   = 13
namespace = "&#x2299;"
register  = "Synthesis-Canon"
retain    = true
role      = "loci-rating law (kānāwai), routing convention authority, address stability authority, canon-MOVE rule"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/loci"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Loci

Routing convention and stable-address capability law for `lar:` URI carriers.

A carrier carries the `loci` component when its `lar:` URI root path segment matches `\w\.\w\.\w` and satisfies this law's convention surfaces.
Carrying `loci` does not foreclose other components.

Two tagspace roots:

- `lar:///ha.ka.ba/@lares/` — stable origin; files at `packages/lares-core/memes/`
- all other `\w\.\w\.\w` roots — unstable; files at `lares/chapel-perilous-opens/{root}/`

Root path segments outside `\w\.\w\.\w` MAY NOT carry `loci`.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ Gather the `lar:` URI and visible convention surfaces before decomposition.
⏿ Run the derivation algorithm; classify resolved or declared-unresolved; confirm file-path convention holds.
◇ Commit to one resolution posture, one rating posture, one canon-lifecycle stage.
▶ Prepare the routing product: rating set, resolved path, or declared-unresolved forward reference.
↺ Cross file-siting mutations and canon-MOVE opener changes as distinct bounded transactions; Name which URIs resolved, which remain declared-unresolved, and what closes each gap.

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/SKILL >>

<<~/ahu >>

<<~ ahu #promotion-path >>

## Promotion Path

Five buckets mark the structural rating of a carrier (law-of-5s):

1. **Noise** — raw signal, no stable machine-usable structure.
2. **Data** — structured language usable without memetic wrappers.
3. **Meme** — data with memetic wrappers, traveling as a contextual meaning-unit.
4. **Ano** — meme carrying one or more components: `loci`, `grammar`, `skill`, `todo`. (Hawaiian: kind, type, nature)
5. **Kapu** — above base namespace; carries the `kapu` component; kernel/sacred tier. (Hawaiian: set apart, restricted)

Rating derives from structure — from schema compliance and component declaration.
Promotion to lares/ canon (live session → branch commit → hostless URI) follows a separate ceremony.

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam >>

<<~/ahu >>

<<~ ahu #derivation-algorithm >>

## Derivation Algorithm

Converts a `lar:` URI to its stable relative filepath candidate.

```
Given: lar-uri (string)

1. Validate tagspace eligibility:
     match = lar-uri.match(/^lar:\/\/[^\/]*\/(\w+\.\w+\.\w+)\/(.+)$/)
     If no match → ineligible for loci. Emit: "loci capability requires \w.\w.\w root path segment"
     root     = match[1]   e.g. "ha.ka.ba" or "threshold.uncertain.opens"
     sub-path = match[2]   e.g. "v0.1/api/pono/loci"
     authority may be empty (lar:///) or full (lar://alias:grant@host/)

2. Derive candidate filepath:
     stem = sub-path.replace("_", "-")
     If root == "ha.ka.ba":
       candidate = "packages/lares-core/memes/" + stem + ".md"
       e.g. "packages/lares-core/memes/v0.1/api/pono/loci.md"
     Else:
       candidate = "lares/chapel-perilous-opens/" + root + "/" + stem + ".md"
       e.g. "lares/chapel-perilous-opens/threshold.uncertain.opens/pono/loci.md"

3. Check whether candidate exists.
     If YES → RESOLVED. Return candidate. Done.

4. If step 3 misses:
     Classification: DECLARED-UNRESOLVED
     Emit: lar-uri as declared-unresolved forward reference.
     Emit: "local derivation miss; stable relative filepath absent or resolver support required"
     Do NOT abort. Continue with calling context.
```

Child items resolve under the sibling directory named for the parent's terminal path segment.
`lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant/SKILL` → `packages/lares-core/memes/v0.1/api/pono/invariant/SKILL.md`

<<~/ahu >>

<<~ ahu #file-path-convention >>

## Stable File-Path Convention

| carrier form | rule | example |
|---|---|---|
| primary meme | derivation algorithm (step 2) | `packages/lares-core/memes/v0.1/api/pono/loci.md` |
| child item | sibling directory named for parent's terminal path segment | `packages/lares-core/memes/v0.1/api/pono/loci/iam.md` |

Any carrier outside this rule reads as repair pressure, not a second lawful siting convention.
This file at `packages/lares-core/memes/v0.1/api/pono/loci.md` with children under `packages/lares-core/memes/v0.1/api/pono/loci/` serves as live specimen.

### Live Examples

| lar: URI | derived candidate | outcome |
|---|---|---|
| `lar:///ha.ka.ba/@lares/v0.1/api/pono/loci` | `packages/lares-core/memes/v0.1/api/pono/loci.md` | resolved |
| `lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam` | `packages/lares-core/memes/v0.1/api/pono/loci/iam.md` | resolved |
| `lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant/SKILL` | `packages/lares-core/memes/v0.1/api/pono/invariant/SKILL.md` | resolved |

<<~/ahu >>

<<~ ahu #address-stability >>

## Address Stability

A `lar:` URI counts as stable when:

1. `register` falls in `CS` or `C`
2. The `lar:` URI in the document opener stays coherent with the meme's carrier identity and derived filepath through migration and promotion

A stable `lar:` URI stays **immutable**.
Its primary carrier MUST remain at the derived filepath.
Child items MUST grow beneath the sibling sub-directory.
The parent carrier MUST NOT move.

The `?` form marks the graph's unbound uncertainty token at document time.
A lawful meme MUST discharge residual uncertainty outward through its footer `... -> ? >>`.

<<~/ahu >>

<<~ ahu #explicit-convention >>

## Explicit Convention

Routing convention reads as explicit when an agent can point to the surfaces justifying current resolution and rating posture.

Convention surfaces:

1. `lar:` URI in the document opener
2. `#iam` rating cluster and `register`
3. derivation algorithm and file-path convention (this file)
4. canon-MOVE criteria (`lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam`)

Convention fails when:

- opener claims confirmed canon while address-stability conditions do not yet hold
- meme presents high readiness while resolution depends on hidden heuristics
- file-path evidence contradicts declared address, derived filepath, or promotion posture

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/SKILL >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
