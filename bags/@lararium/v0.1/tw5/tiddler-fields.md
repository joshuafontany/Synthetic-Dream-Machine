<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/tiddler-fields >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/tiddler-fields"
file-path = "bags/@lararium/v0.1/tw5/tiddler-fields.md"
type = "text/x-memetic-wikitext"
register = "CS"
confidence = 0.93
mana = 0.92
manao = 0.90
manaoio = 0.88
role = "interface note: canonical TW5 core-semantic tiddler field shapes for Lararium"
cacheable = true
retain = true
```

<<~&#x0002;>>

## TW5 Tiddler Field Shapes

Lararium carries two pono TW5 field shapes because TW5 core itself carries two semantic states.

### `ITW5TiddlerInputFields | TW5TiddlerInputFields`

This shape models the raw open field bag accepted by core TW5 write and intake paths:

- `new $tw.Tiddler(...)`
- `wiki.addTiddler(...)`
- `wiki.deserializeTiddlers(...)`
- deserializer output before TW5 field-module parsing finishes materialization

Properties:

- `title` may be absent in the raw input bag
- `created` and `modified` may be strings or `Date`
- `tags` and `list` may be strings or arrays
- arbitrary extra fields remain valid

### `ITW5TiddlerFields | TW5TiddlerFields`

This shape models the materialized runtime field bag exposed as `tiddler.fields`.

Properties:

- `title` exists
- `created` and `modified` materialize as `Date`
- `tags` and `list` materialize as arrays
- arbitrary extra fields remain valid
- the bag reads as frozen/readonly at runtime

## Source Law

This split follows core TW5 source, not the narrower convenience defaults in `tw5-typed`.

Core TW5 parses only a small built-in field set through field modules:

- `created`
- `modified`
- `tags`
- `list`

All other fields pass through as open values. Lararium therefore treats the input and materialized states as two honest types instead of collapsing them into one overfit wrapper.

## DRY Rule

Lararium code should use these two names as the only TW5 authority shapes.

- intake, parser, deserializer, import, and pre-commit write paths use `TW5TiddlerInputFields`
- runtime reads from `tiddler.fields` and post-parse materialized views use `TW5TiddlerFields`
- local aliases should collapse onto one of those two shapes instead of inventing a third near-duplicate wrapper

## Host Record Boundary

TW5 field bags are no longer the whole Lararium store record.

`LarTiddlerRecord` now carries two explicit lanes:

- `fields` = the canonical TW5 input-field bag that projects into TW5 VMs
- `meta` = host-envelope state such as deletion and authority

Current host-law:

- TW5 VMs should consume `record.fields`, not the whole host record
- host metadata should stay out of ordinary TW5 field bags unless a deliberate projection surfaces it
- `bag` is not stored per record; it travels as write/query/change context because bag identity belongs to topology and recipe resolution, not tiddler content
- Admin surfaces may project metadata and bag/topology views queryably, but that is an admin capability layer, not the canonical stored tiddler shape

This split removes the old flat-record ambiguity where TW5 content fields and host metadata shared one namespace and drifted into accidental collisions.

<<~ ahu #edges >>

<<~ pranala ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/tw5-module family:relation role:adjacent >>
<<~ pranala ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/tiddler-store family:dataflow role:shapes-store-boundary >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
