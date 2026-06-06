<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/hui >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/hui"
file-path = "bags/@lares/v0.1/api/pono/hui.md"
type      = "text/x-memetic-wikitext"
register  = "Synthesis"
role      = "await-all synchronization sigil — hui as gathering; English alias: \\sync; async-first concurrency sprint pending"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Hui

*hui* — Hawaiian: group, club, association, organization; to gather together, to meet. A hui
brings separate parties into one meeting and holds them until the gathering completes. No member
leaves while others still travel.

An await-all synchronization sigil. The body of a hui block spawns parallel flows; the sigil
holds execution until every child flow completes. English alias: `\sync`.

Verse equivalent: `sync` — all branches inside the block run concurrently and the containing
flow resumes only after every branch settles.

Grammar only --- the await-all join runtime awaits the async-first sprint.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A hui block MUST spawn all child flows before any awaiting begins.
A hui block MUST NOT resume the containing flow until every child flow completes.
A hui block MUST propagate failure from any child flow to the containing flow.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ hui >>
  <<~ lele lar:///target-a >>
  <<~ lele lar:///target-b >>
<<~/hui >>

<<~ \sync >>
  <<~ \branch lar:///target-a >>
  <<~ \branch lar:///target-b >>
<<~/\sync >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #tiddler-sigil-hui ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-hui family:control role:has >>
<<~ pranala #tiddler-sigil-sync ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-sync family:control role:alias >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
