<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/sigil-aka >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/tw5/sigil-aka"
file-path    = "bags/@lararium/v0.1/tw5/sigil-aka.md"
type         = "text/x-memetic-wikitext"
register     = "Synthesis"
mana         = 16
manao        = 16
manaoio      = 15
role         = "design record: ~aka sigil — shadow transclusion, template mechanism, preview image plan"
cacheable    = true
retain       = true
```

<<~ &#x0002; >>

<<~ ahu #head >>

# ~aka Sigil Design

`<<~ aka lar:///target >>` — shadow transclusion.

The `aka` sigil renders a **projection** of a canonical URI into the current meme.
The target remains canonical at its source.
This meme records design decisions and deferred work.

<<~/ahu >>


<<~ ahu #semantics >>

## Semantics

`aka` carries `rdfs:seeAlso` / `skos:closeMatch` weight — not identity (`owl:sameAs`), not full summons (`kahea`).

Two states:

- **local aka** — target tiddler exists in this wiki: `<details>` quoteblock, expandable to target content
- **shadow aka** — target is off-wiki (peer node or external canonical): `<details>` with URI link, empty body

The summary header always shows the target URI as a link, so the projection always points home.

Cascade tag: `lar:///ha.ka.ba/tags/aka-template` — operator can override the render template per scope.

Call-site template override: `<<~ aka lar:///target lar:///my-template >>` (p2 bypasses cascade).

<<~/ahu >>


<<~ ahu #mechanism >>

## Render Mechanism

Both `aka` and `kahea` use TW5's `<$tiddler> + <$transclude>` pattern:

```
<$tiddler tiddler=<<target-uri>>>
  <$transclude $tiddler=<<selected-template>>/>
</$tiddler>
```

`$tiddler` shifts `currentTiddler` to the target; the template accesses target fields via `{{!!field}}`.
Cascade evaluates in the **calling** context (before `$tiddler` shifts it) — the template selection
depends on where the sigil appears, not what the target is.

Template selection precedence: p2 explicit > cascade > fallback shadow tiddler.

<<~/ahu >>


<<~ ahu #preview-image >>

## Preview Image — Tier 1 (live) / Tier 2 (deferred)

### Tier 1 — Template (shipped)

The `aka-template-html.tid` shows a preview image when available:

1. **`thumbnail` field** on the target tiddler — displayed as `<img class="lar-aka-thumb">`.
   Any resolver that fetches metadata writes this field.
2. **Domain favicon fallback** — for HTTP/HTTPS URIs with no `thumbnail` field, the template
   renders `<img src="https://icons.duckduckgo.com/ip3/{domain}.ico">` with `onerror` hide.
   DuckDuckGo favicon endpoint: privacy-respecting, no tracking, silently fails offline.
   `lar:///` URIs skip this path (no domain to extract).

### Tier 2 — Node-side OG metadata fetch (deferred)

When the Lararium node resolves an external `aka` URI (HTTP/HTTPS), it should:

1. Fetch `HEAD` then parse `og:image`, `og:title`, `og:description`, `og:site_name` from the page.
2. Write the result as fields on the local shadow tiddler:
   - `thumbnail` = `og:image` URL
   - `og-title` = `og:title`
   - `og-description` = `og:description`
   - `og-fetched-at` = ISO timestamp
3. Refresh on a configurable TTL (default: 7 days).

Implementation home: `disk-projector.ts` or a dedicated `og-metadata-fetcher.ts` in `lararium-node`.
The template renders whatever fields are present — no template changes needed for Tier 2 rollout.

<<~ pranala ? -> lar:///ha.ka.ba/@lararium/v0.1/node/disk-projector family:dataflow role:implements >>
<<~/pranala >>

### Off-wiki `lar:///` URIs

`lar:///` URIs are Lares-native — no external service can fetch them.
Preview for peer-node URIs must come from the peer itself (a future peer-announce protocol
could include thumbnail + og-title in the handshake). Hold open.

<<~/ahu >>


<<~ ahu #source-shelf >>

## Source Shelf

<<~ pranala ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/tw5-module family:relation role:references >>
<<~/pranala >>

<<~ pranala ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/meme-ast family:relation role:references >>
<<~/pranala >>

<<~/ahu >>

<<~ &#x0003; >>
