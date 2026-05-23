<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/sigil-procedure >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/tw5/sigil-procedure"
file-path    = "bags/@lararium/v0.1/tw5/sigil-procedure.md"
type         = "text/x-memetic-wikitext"
register     = "S"
confidence   = 0.88
mana         = 0.82
manao        = 0.80
manaoio      = 0.78
role         = "design record: \\procedure English alias sigil — pragma-alias, wehe cross-ref, declaration form"
cacheable    = true
retain       = true
```

<<~&#x0002;>>

<<~ ahu #head >>

# ~\procedure Sigil Design

`<<~ \procedure name(params) >>body<<~/ \procedure >>` — English-form procedure declaration.

The `\procedure` sigil makes TW5's `\procedure` pragma first-class in memetic-wikitext.
Hawaiian equivalent: `wehe` (procedure/function executor; outside/exit boundary).

<<~/ahu >>


<<~ ahu #semantics >>

## Semantics

`\procedure` and `wehe` share executor semantics:
- Both declare a named callable body.
- `\procedure` = English alias; reads naturally to non-Hawaiian operators.
- `wehe` = Hawaiian form; carries cultural weight of "outside/exit boundary" — the procedure defines a crossing point from declaration-space into execution-space.

`lar-kind: pragma-alias` — the sigil IS the declaration mechanism; it produces no render output.

Cross-ref: `lar-see-also: wehe`. When `sigil-wehe.tid` ships (Path G.SharktoothSigil), it will carry `lar-see-also: \procedure` as the reverse pointer.

<<~/ahu >>


<<~ ahu #dispatch >>

## Dispatch Form

```
<<~ \procedure greet(name:"world") >>Hello <<name>>!<<~/ \procedure >>
```

Equivalent native TW5:
```
\procedure greet(name:"world")
Hello <<name>>!
\end
```

The `lar-sigil.ts` wikirule matches `<<~ \procedure … >>` as a compound block opener;
the body runs through the pragma handler (TW5 parse-time, not render-time).

<<~/ahu >>


<<~ ahu #source-shelf >>

## Source Shelf

<<~ pranala ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-procedure family:dataflow role:implements >>
<<~/pranala >>

<<~ pranala ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-wehe family:relation role:hawaiian-equiv >>
<<~/pranala >>

<<~/ahu >>

<<~&#x0003;>>
