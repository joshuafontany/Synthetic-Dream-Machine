<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/tw5-deserializer >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/lararium/tw5-deserializer"
file-path = "bags/@lares/v0.1/docs/lararium/tw5-deserializer.md"
type = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 17
mana         = 17
manao        = 17
manaoio      = 16
role         = "design doc: TW5 tiddlerDeserializerModules registration for text/x-memetic-wikitext"
status-date  = "2026-04-30"
source       = "lar:///ha.ka.ba/@lares/v0.1/api/lararium/modules/deserializer"
```



<<~&#x0002; >>

<<~ ahu #overview >>

## Overview

TW5 parses tiddler content by content-type. The deserializer for `text/x-memetic-wikitext` is registered in the `TW5.Wiki.tiddlerDeserializerModules` map at boot time. When TW5 encounters a tiddler with this type, it calls the deserializer to split the raw carrier text into one parent tiddler and N ahu child slot tiddlers — the same structural split performed on the Node side by the disk projector.

The canonical source is at `lar:///ha.ka.ba/@lares/v0.1/api/lararium/modules/deserializer`.

<<~/ahu >>

<<~ ahu #split-model >>

## Split Model

The deserializer delegates to `splitCarrierToTiddlers(uri, text)` (from `@lararium/tw5`). The parent tiddler receives all `#iam` TOML fields merged into its TW5 fields. Each `<<~ ahu #slot >>` block becomes a child tiddler with `ahu-slot` and `ahu-parent` fields set.

Parse warnings are surfaced as `$:/lararium/parse-warning/<slug>` tiddlers so the operator can review and acknowledge them without the warnings being lost in the console.

<<~/ahu >>

<<~ ahu #why-stuck >>

## Why This Cannot Be a Meme

The deserializer is a closure over the compiled `splitCarrierToTiddlers` TypeScript function. It is registered as a property assignment on the live `tw.Wiki` class — a reference that only exists after TW5 boot. There is no TW5 hook to load a deserializer from a tiddler; registration must be imperative.

Once the corpus path passes the boot gate and injects `tw5-modules`, that bundle includes the parser and a compatible deserializer. The imperative registration here is the cold-boot fallback.

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
