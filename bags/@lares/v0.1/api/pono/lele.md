<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lele >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/api/pono/lele.md"
namespace = "&#x2299;"
register  = "Synthesis"
retain    = true
role      = "structured fire-and-continue sigil — lele as Verse branch; English alias: \\branch; async-first concurrency sprint pending"
tags      = ["lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-lele"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/lele"
```

<<~ ahu #head >>

# Lele

*lele* — Hawaiian: to fly, jump, leap; to move quickly; to pass over. Used in *lele kawa* (cliff
diving). The motion commits to the leap, starts a side flow, and continues forward without waiting.

A structured fire-and-continue sigil. Emits a message-family edge, starts the target flow, and
continues immediately. English alias: `\branch`.

Verse equivalent: `branch` — one or more async expressions start, and the enclosing
flow continues — neither waits for the other. The side flow remains bounded by the enclosing async context and
cancels when that context completes.

Grammar only --- the fire-and-continue execution runtime awaits the async-first sprint.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A lele edge MUST carry a target URI as its first argument.
A lele edge MUST emit a message-family pranala and continue without blocking.
A lele edge MUST stay bounded by the enclosing async context.
A lele edge MUST cancel remaining side-flow work when the enclosing async context completes.
A lele edge MUST NOT wait for a response from the target.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ lele lar:///target/uri >>
<<~ \branch lar:///target/uri >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-branch >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
