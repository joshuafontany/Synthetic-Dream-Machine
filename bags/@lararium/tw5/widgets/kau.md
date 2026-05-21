<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/widgets/kau >>
```toml iam
uri-path      = "ha.ka.ba/@lararium/tw5/widgets/kau"
file-path     = "bags/@lararium/tw5/widgets/kau.md"
type          = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.88
role          = "anchor: ~kau TW5 wikitext widget — heleuma ka"
heleuma       = "ka"
source-symbol = "~kau"
module-ref    = "lar:///ha.ka.ba/@lararium/tw5/widgets/kau"
cacheable     = true
retain        = true
body-sha256 = "6cc6ce1e6d1dc43e399f3c00735763a804c36fdf3b646670588cc2505b9f5af2"
```

<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`<<~ kau #frag Name props >>` places a device instance into the carrier. kau = "to place upon, set down with intention" (Hawaiian).

Each kau placement creates a device instance with:
- **Instance URI**: `carrierUri#fragment` (explicit `#frag` required; auto-UUID deferred to action tiddler when Keyhive WASM lands)
- **Own execution context**: `currentTiddler` set to instance URI before transcluding the kumu def
- **Persistent addressability**: instance URI becomes UCAN resource for per-instance capability grants (Keyhive deferred)

`p1` parse: first token starting with `#` = fragment; remainder = name + props.

Invocation form: `<<~ kau Name >>` — no fragment; transcludes kumu def in caller's context.

Resolves kumu definition via `[all[tiddlers+shadows]tag[lar:///ha.ka.ba/tags/kumu]field:kumu-name<name>first[]]`.
Placement renders `<div class="lar-kau lar-kau-place" data-uri="...">`.
Invocation renders `<div class="lar-kau lar-kau-invoke">`.
Unresolved devices show `<span class="lar-kau-hole">`.

### Render surface

`\widget ~kau(p1:"")` lives in `tiddlers/sigil-kau.tid`. Template cascade:
- HTML: `lar:///ha.ka.ba/@lararium/templates/kau/html` (via `lar:///ha.ka.ba/tags/kau-template`)
- markdown-meme: `lar:///ha.ka.ba/@lararium/templates/kau/markdown-meme`

Companion procedures: `~kahea~kau` (live transclusion of kau child-slot), `~aka~kau` (frozen projection via aka template cascade).

### Keyhive stubs — deferred

Per-instance capability hooks and UUID write-back surface as explicit TW5 action tiddlers when Keyhive WASM lands. The widget itself holds no JS module hooks.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/kau family:control role:implements >>
<<~ pranala #to-tw5-widgets ? -> lar:///ha.ka.ba/@lararium/tw5/modules/tw5-widgets family:control role:implements >>
<<~ pranala #to-sigil-tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-kau family:control role:module >>
<<~ pranala #to-kumu ? -> lar:///ha.ka.ba/@lararium/tw5/widgets/kumu family:control role:depends >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
