<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/carrier-parse >>
```toml iam
body-sha256   = "de5ced103cad1f1a5e414cabe57a2052578fa69e190baf2e2dc06fb458db9ceb"
file-path     = "bags/@lararium/v0.1/docs/carrier-parse.md"
heleuma       = "ka"
mana          = 17
manao         = 17
manaoio       = 17
register      = "Synthesis-Canon"
role          = "canonical source copy: carrier ingress gate — text-in, CarrierRecord-out; validates shape, extracts metadata and implements bundle"
source-symbol = "parseCarrier"
status-date   = "2026-04-30"
tags      = ["lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant", "lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma/ka"]
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/v0.1/docs/carrier-parse"
```

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ carrier text arrives; locate the iau block and opener URI.
⏿ orient: does this qualify as a valid carrier? does metadata align with opener? do STX/ETX/return-throat appear?
◇ decide rating: kapu if valid + implements kapu URI; ano if valid + implements set non-empty; meme if valid; data if opener or metadata present; noise otherwise.
▶ parse pranala edges; merge implements set; return CarrierRecord with shape, metadata, implements.
↺ verify: diagnostics surface all errors; rating reflects the worst valid state; depthState reflects loulou count; text-in, record-out — no side effects, no I/O. Callers own persistence and routing.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

`parseCarrier(uri, text)` serves as the entry gate for all carrier ingress. Isomorphic — no `fs`, no `path`, no `window`. The host passes text; parseCarrier returns a typed record.

**This function cannot be loaded from a meme.** It orchestrates `extractIamMetadata`, `validateCarrierShape`, and `parsePranalaEdges` — all compiled-in. Extracting it to a corpus JS module would require all three dependencies to also move, collapsing the entire carrier spine into a single bundle. The boundary is practical, not philosophical.

Promotion path: when the carrier spine stabilises and a corpus-loadable module bundle becomes practical, this function and its dependencies (`extractIamMetadata`, `validateCarrierShape`, `extractTomlFields`) travel together as one `tw5-module` implementor.

<<~/ahu >>

<<~ ahu #source >>

## Source (TypeScript — compiled-in)

```typescript
export function parseCarrier(uri: string, text: string): CarrierRecord {
  const { metadata, diagnostics: metaDiags } = extractIamMetadata(text);
  const edges = parsePranalaEdges(uri, text);
  let shape = validateCarrierShape(text, metadata, edges);

  if (metaDiags.length > 0) {
    shape = {
      valid: false,
      rating: text.trim() ? "data" : "noise",
      depthState: shape.depthState,
      diagnostics: [...metaDiags, ...shape.diagnostics],
    };
  }

  const implSet = new Set(extractInterfaceBundle(metadata));
  for (const edge of edges) {
    if (edge.family === "control" && edge.role === "implements") implSet.add(edge.toUri);
  }

  return { uri, metadata, implements: [...implSet].sort(), shape };
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/carrier-sigils >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/schema/projection-codec >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
