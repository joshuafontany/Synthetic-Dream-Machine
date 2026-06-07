<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/verb-summons >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/tw5/verb-summons"
file-path    = "bags/@lararium/v0.1/tw5/verb-summons.md"
source-file  = "packages/lararium-tw5/src/verb-summons.ts"
type         = "text/x-memetic-wikitext"
register     = "Synthesis"
mana         = 12
role         = "the summons relay — CRDT verb-summons tiddler (@admin/summons/<id>) → volatile local invocation; edge transport, not durable coordination"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~ &#x0002; >>

<<~ ahu #contract >>

## The summons relay

`emitVerbSummons` carries the **edge transport** of the verb/summons/outcome surface. An external vessel writes a **summons** tiddler at `@admin/summons/<id>` to the shared Automerge doc; the admin island's CompositeStore subscriber translates it into a volatile local invocation (`lararium.local.vm/verbs/<id>`) the VerbDispatcher watches, then tombstones the summons. Edge transport — fire-and-forget, never durable coordination.

The durable result lands at `@admin/outcomes/<id>` (the outcome). The summons calls; the outcome answers; CRDT convergence on the outcome carries the meaning.

Naming note: "signal" names a DIFFERENT layer — the Agent↔Operator HUD/legibility frame (`lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal`). The task-transport noun reads **summons** (renamed from "signal" 2026-06-07 by research verdict — grammar register, no compute-runtime freight). The fuller surface + the UCAN boundary projection live in [lar:///ha.ka.ba/@lararium/v0.1/mesh/verb-tiddler](../mesh/verb-tiddler.md).

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
