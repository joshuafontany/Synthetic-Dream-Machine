<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/docs/pono/lar-uri-roots >>
```toml iam
uri-path = "ha.ka.ba/@lares/docs/pono/lar-uri-roots"
file-path = "bags/@lares/docs/pono/lar-uri-roots.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.88
manao         = 0.86
manaoio       = 0.84
tagspace      = "stable"
role          = "lar:/// URI namespace roots: file-resolvable caps, virtual caps, stable tuple root"
cacheable     = true
retain        = true
invariant     = true
status-date   = "2026-04-30"
source-symbol = "CAPS_FILE_ROOTS VIRTUAL_CAPS_ROOTS STABLE_TUPLE_ROOT"
```



<<~ ahu #head >>

# lar:/// URI Roots

Three categories of root segment govern how hostless `lar:///` URIs resolve.
The resolver classifies the root segment before walking the child path.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law

A hostless `lar:///` URI of the form `lar:///ROOT/child/path` resolves as follows:

**caps-file roots** — resolve against the lares/ directory tree on disk.
These are the operator-authored corpus roots. The resolver maps root → directory.

**virtual caps roots** — resolve to in-memory or computed records.
No disk file exists; the resolver synthesizes the result at query time.

**stable tuple root** — `ha.ka.ba` names the invariant API tuple space.
All canonical infrastructure memes live under `lar:///ha.ka.ba/@lares/api/v0.1/`.
The tuple root does not resolve via the caps-file mechanism; it resolves
through the Automerge doc store and lares/ hydration path.

Hostful URIs (`lar://alias:tier@host/path`) carry lower trust than hostless
invariant memes. Hostful records never resolve to lares/ files.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for `CAPS_FILE_ROOTS`, `VIRTUAL_CAPS_ROOTS`,
`STABLE_TUPLE_ROOT` in `packages/lararium-mesh/src/resolver.ts`.

```toml
# Root segments that resolve to lares/ directory trees on disk
caps-file-roots = ["AGENTS", "LARES", "README"]

# Root segments that resolve to virtual / computed records (no disk file)
virtual-caps-roots = ["INDEXES"]

# The invariant API tuple space root — all ha.ka.ba/@lares/api/v0.1/ memes live here
stable-tuple-root = "ha.ka.ba"
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/invariant family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
