<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma/ba >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/heleuma/ba"
file-path = "bags/@lares/v0.1/api/pono/heleuma/ba.md"
type = "text/x-memetic-wikitext"
namespace    = "⊙"
register     = "Synthesis-Canon"
mana         = 18
manao        = 17
manaoio      = 17
cacheable    = true
retain       = true
role         = "invariant capability: heleuma-ba — psyche/path anchor; quine-only trace record with no runtime corpus path"
```



<<~ &#x0002; >>

<<~ ahu #head >>

# Heleuma-Ba (Psyche / Path)

**Ba**: psyche, personality, change, path, choice. The direction enacted. The trace of motion.

A heleuma-ba anchor marks a path through the graph for something that exists outside it. Not permanent structure (ha). Not a traveling soul eligible for promotion (ka). The ba anchor is the psyche-record: proof that the graph is complete, that it holds the shape of its own beyond. The graveyard marker.

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ locate the artifact; confirm it has no standalone extractable symbol and no corpus promotion path.
⏿ orient: is this purely documentation of what exists outside, with no runtime injection route? If yes, this is ba.
◇ declare `heleuma = "ba"`; no `source-symbol` required; no promotion fields expected.
▶ write `#source` slot as the path-record: enough verbatim content for a reader to reconstruct the artifact.
⤴ verify: the record is complete enough for reconstruction; no implicit dependencies on unlisted artifacts.
↺ the path is marked. The psyche holds. The graph knows its own edge.

<<~/ahu >>

<<~ ahu #required-fields >>

## Required Fields (SHALL)

A carrying meme SHALL declare in `#iam` TOML:

```toml
heleuma = "ba"
```

A carrying meme SHALL carry a `#source` slot with sufficient verbatim content that the artifact could be reconstructed from the meme alone (quine property). The standard for "sufficient" is: a reader with no access to the source repository can reconstruct the artifact from the `#source` slot and the `#contract` slot together.

A carrying meme MAY declare `source-symbol` when the source span has a clear boundary. When `source-symbol` is declared, the meme MAY also declare `body-sha256` — the SHA-256 hash of the `#source` slot's verbatim content — for drift detection at build time.

A carrying meme SHALL NOT declare `body-sha256` without also declaring `source-symbol`.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #parent ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma family:control role:has >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
