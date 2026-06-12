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
role      = "loci law (kānāwai): the mandatory component — address authority, bags/ siting derivation, relative-name qualification office, address stability, canon-MOVE rule"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/loci"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Loci

The **mandatory component** — the one intrinsic every placed carrier holds, after the manner of the Scene Graph's default transform: *where this entity stands*. A carrier holds loci **by title** — the `lar:` address itself — never by tag; everything else composes through the has-stack.

Routing convention and stable-address law for `lar:` URI carriers.
A carrier holds `loci` when its `lar:` URI root segment matches `\w.\w.\w` and satisfies this law's convention surfaces. An entity without loci reads as not-yet-placed; the rating ladder prices that honestly.

Two tagspace postures:

- `lar:///ha.ka.ba/...` — stable origin; carriers sited on disk under `bags/`
- all other `\w.\w.\w` roots — unstable session bearing; no disk siting (declared-unresolved until adopted into a bag)

Root segments outside `\w.\w.\w` MAY NOT hold `loci`.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ Gather the `lar:` URI and visible convention surfaces before decomposition.
⏿ Run the derivation algorithm; classify resolved or declared-unresolved; confirm file-path convention holds.
◇ Commit to one resolution posture, one rating posture, one canon-lifecycle stage.
▶ Prepare the routing product: rating set, resolved path, qualified stack entry, or declared-unresolved forward reference.
↺ Cross file-siting mutations and canon-MOVE opener changes as distinct bounded transactions; name which URIs resolved, which remain declared-unresolved, and what closes each gap.

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/SKILL >>

<<~/ahu >>

<<~ ahu #promotion-path >>

## Promotion Path

Five buckets mark the structural rating of a carrier (law-of-5s):

1. **Noise** — raw signal, no stable machine-usable structure.
2. **Data** — structured language usable without memetic wrappers.
3. **Meme** — data with memetic wrappers, traveling as a contextual meaning-unit.
4. **Ano** — meme wearing one or more **defined** has-stack components; loci itself stands as the mandatory first, held by title. (Hawaiian: kind, type, nature)
5. **Kapu** — above base namespace; wears the kapu grant (operator-minted); kernel/sacred tier. (Hawaiian: set apart, restricted)

Rating derives from structure — a predicate run against the carrier, never a class consulted.
Promotion to lares/ canon (live session → branch commit → hostless URI) follows a separate ceremony.

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam >>

<<~/ahu >>

<<~ ahu #derivation-algorithm >>

## Derivation Algorithm — siting

Converts a `lar:` URI to its stable relative filepath candidate. One root law: the repo IS the vessel; stable carriers live under `bags/`.

```
Given: lar-uri (string)

1. Validate tagspace eligibility:
     match = lar-uri.match(/^lar:\/\/[^\/]*\/(\w+\.\w+\.\w+)\/(.+)$/)
     If no match → ineligible for loci. Emit: "loci requires a \w.\w.\w root segment"
     root     = match[1]   e.g. "ha.ka.ba" or "threshold.uncertain.opens"
     sub-path = match[2]   e.g. "@lares/v0.1/api/pono/loci"
     authority may be empty (lar:///) or full (lar://alias:grant@host/)

2. Derive candidate filepath:
     If root == "ha.ka.ba":
       candidate = "bags/" + sub-path + ".md"
       e.g. "bags/@lares/v0.1/api/pono/loci.md"
     Else:
       UNSTABLE — session bearing only; no disk siting.
       Classification: DECLARED-UNRESOLVED until adopted into a bag.

3. Check whether candidate exists.
     If YES → RESOLVED. Return candidate. Done.

4. If step 3 misses:
     Classification: DECLARED-UNRESOLVED
     Emit: lar-uri as declared-unresolved forward reference.
     Do NOT abort. Continue with calling context.
```

Child items resolve under the sibling directory named for the parent's terminal path segment.
`lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant/SKILL` → `bags/@lares/v0.1/api/pono/invariant/SKILL.md`

<<~/ahu >>

<<~ ahu #relative-names >>

## Relative-Name Qualification — the second office

The has-stack law (clause 2) delegates short-name resolution here: within a carrier whose title carries a `root/@bag/version` scope, a path-shaped tag qualifies by derivation — never by pointer or shim tiddler.

```
Given: tag (string), carrier-title (string)

1. tag starts "lar:///"            → already qualified; pass through.
2. tag fails /^[\w-]+(\/[\w-]+)*$/ → outside the stack ($:/ system, free-form); uri = null.
3. scope = carrier-title.match(/^lar:\/\/\/(\w+\.\w+\.\w+\/@[\w-]+\/v[\w.-]+)\//)
     no scope → relative tag stays unresolved (declared-unresolved); uri = null.
4. qualified = "lar:///" + scope + "/" + tag
```

Runtime: `bagScopeOf` / `qualifyStackTag` / `stackOf` and the `stack` filter operator.

<<~ pranala #source ? -> packages/lararium-tw5/src/has-stack.ts family:code role:has >>

<<~/ahu >>

<<~ ahu #file-path-convention >>

## Stable File-Path Convention

| carrier form | rule | example |
|---|---|---|
| primary meme | derivation algorithm (step 2) | `bags/@lares/v0.1/api/pono/loci.md` |
| child item | sibling directory named for parent's terminal path segment | `bags/@lares/v0.1/api/pono/loci/iam.md` |

Any carrier outside this rule reads as repair pressure, not a second lawful siting convention.
This file at `bags/@lares/v0.1/api/pono/loci.md` serves as live specimen.

### Live Examples

| lar: URI | derived candidate | outcome |
|---|---|---|
| `lar:///ha.ka.ba/@lares/v0.1/api/pono/loci` | `bags/@lares/v0.1/api/pono/loci.md` | resolved |
| `lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack` | `bags/@lares/v0.1/api/pono/has-stack.md` | resolved |
| `lar:///ha.ka.ba/@sdm/v0.1/components/posture/ritual` | `bags/@sdm/v0.1/components/posture/ritual.md` | resolved |

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
3. derivation algorithm, relative-name qualification, and file-path convention (this file)
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
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/iam >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci/SKILL >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
