<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wikitext-filter >>

```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/pono/wikitext-filter"
file-path = "bags/@lares/v0.1/api/pono/wikitext-filter.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "SC"
mana         = 17
manao        = 17
role         = "wikitext-filter grammar dialect — drops field/index; aligns with the pranala+TOML data model and lexical meme context"
grammar-key  = "wikitext-filter"
guest-mime   = "text/x-wikitext-filter"
cacheable    = true
retain       = true
invariant    = false
```


<<~ &#x0002; >>

<<~ ahu #purpose >>

# Lararium Filter Grammar

`wikitext-filter` functions as the native filter dialect for memetic-wikitext.

**Fork origin:** `x-tiddlywiki-filter` (`lar:///ha.ka.ba/@lares/v0.1/api/pono/x-tiddlywiki-filter`).
`x-tiddlywiki-filter` serves import and migration; `wikitext-filter` covers native authoring
for new authoring.

**Key departures from TW5 filter:**

| TW5 form | Reason dropped | Lararium replacement |
|----------|---------------|----------------------|
| `!!field` — tiddler field accessor | Legacy data model; caused dev headaches; fields are ad-hoc string bags | `[toml:key[value]]` — query against `#iam` TOML |
| `##index` — DataTiddler JSON index | Legacy JSON-in-tiddler pattern; fragile, opaque | `[edge:family[X]role[Y]]` — query pranala edge properties |
| `+currentMeme` ambient variable | Dynamic scope leaks to siblings; modern systems reject ambient lookup | Explicit `meme` sigil context; or `[self[]]` for the carrier's own URI |
| `currentTiddler` implicit | Same as above | `[self[]]` in filter expressions |
| `is[system]` tiddler metaphysics | TW5-specific system namespace concept | `[toml:tagspace[system]]` — explicit tagspace query |

**Preserved from TW5 filter** (all standard filter operators remain valid):
`tag`, `title`, `field` (renamed — see below), `links`, `backlinks`, `all`, `each`,
`sort`, `nsort`, `limit`, `first`, `last`, `rest`, `butlast`, `reverse`,
`prefix`, `suffix`, `contains`, `search`, `regexp`,
`get`, `has`, `count`, `uniq`, `unique`, Boolean operators, step operators.

<<~/ahu >>

<<~ ahu #new-operators >>

## New Operators

### `toml:key[value]` — TOML metadata query

Queries the `#iam` TOML block of each meme in the current result set.

```text
[toml:confidence[18]]           memes whose confidence = 18
[toml:tagspace[grammar]]        memes in the grammar tagspace
[toml:register[SC]]             memes at SC register
[toml:role[contains:kernel]]    memes whose role field contains "kernel"
```

Replaces TW5 `!!field`. TOML keys are typed (string, float, bool, array) — the query
engine coerces to string for comparison unless the key type permits numeric range queries.

### `edge:family[X]` — pranala edge query

Queries inbound or outbound pranala edges for the memes in the current result set.

```text
[edge:family[control]]                    memes with any control-family edge
[edge:family[dataflow]role[owns]]         memes with a dataflow edge where role=owns
[edge:family[message]dir[inbound]]        memes that receive message-family edges
[edge:family[control]role[implements]]    memes that implement an interface
```

Replaces TW5 `##index`. Edge queries run against the compiled PranalaEdge graph.

### `self[]` — current meme URI

Returns the URI of the current rendering context meme (the nearest enclosing `meme` block,
or the carrier's own `#iam.uri-path` if no `meme` is active).

```text
[self[]]                      current meme URI — replaces +currentMeme and currentTiddler
[self[]edge:family[control]]  current meme's control edges
```

### `ahu:id[fragment-id]` — fragment anchor query

Queries for memes that contain an ahu block with the given fragment id.

```text
[ahu:id[edges]]               memes that have an #edges ahu block
[ahu:id[iam]]                 all indexed carriers (all have #iam)
```

### `edge:family[reaction]` — reaction subscription query

Queries memes by reaction-family (papalohe) edges. Useful for finding UEFN device graph event wires.

```text
[edge:family[reaction]]                         memes with any reaction edge
[edge:family[reaction]trigger[OnBegin]]         memes activated by OnBegin
[edge:family[reaction]dir[inbound]]             memes that receive reaction edges (awakened targets)
[edge:family[reaction]dir[outbound]]            memes that emit reaction edges (event sources)
```

The `trigger` property carries the event name from the `papalohe` sugar form (`<<~ papalohe FROM -> TO trigger:OnBegin >>`).

<<~/ahu >>

<<~ ahu #preserved-operators >>

## Preserved Operators (TW5 Compat)

These operators carry over unchanged from `x-tiddlywiki-filter`.
Noun substitution applies: "tiddler" → "meme", "tiddler title" → "meme URI".

```text
tag[X]          — memes tagged with X (via control-family pranala)
title[X]        — meme whose URI equals X  (use uri[X] preferred)
links[]         — memes linked from current meme
backlinks[]     — memes that link to current meme
all[memes]      — all indexed memes  (replaces all[tiddlers])
sort[key]       — sort by TOML key ascending  (replaces sort[field])
nsort[key]      — numeric sort by TOML key
limit[N]        — first N results
first[N]        — first N
last[N]         — last N
reverse[]       — reverse order
prefix[X]       — URI starts with X
suffix[X]       — URI ends with X
contains[X]     — URI contains X
search[X]       — full-text search across meme body
regexp[X]       — URI matches regex
get[key]        — extract TOML key value as scalar (replaces get[field])
has[key]        — memes that have TOML key set  (replaces has[field])
count[]         — result count
uniq[]          — deduplicate
each[key]       — one representative per unique TOML key value
!               — Boolean NOT
+               — Boolean AND (step into next filter)
,               — Boolean OR (union)
```

**Deprecated operators** (available but emit diagnostic):
`!!field` → use `[toml:key[field]]`
`##index` → use `[edge:family[X]role[Y]]`
`currentTiddler` → use `[self[]]`
`is[system]` → use `[toml:tagspace[system]]`

<<~/ahu >>

<<~ ahu #scope-and-context >>

## Scope and Context Model

Filters evaluate against an **explicit context**, not an ambient dynamic variable.

| Context source | How set | Applies to |
|---------------|---------|------------|
| Carrier `#iam` URI | Default when no `meme` block active | Top-level filter expressions in a carrier |
| `meme` sigil block | `<<~ meme lar:///uri >>` encloses filter usage | All filter expressions inside the block |
| `huli` loop variable | `as item` binding | Filter expressions inside the `huli` body |
| `wehe`/`helu` parameter | Named arg passed at `kahea` call site | Filter expressions inside definition body |

No ambient lookup. No `currentTiddler`-style dynamic scope.
A filter expression that needs "the current meme" uses `[self[]]`.

<<~/ahu >>

<<~ ahu #invocation >>

## Invocation

`wikitext-filter` runs as a guest grammar inside `hana` blocks, and inline in `wai`/`huli`/`ui` sigils.

```text
# Inline (wai, huli, ui)
<<~ wai [tag[invariant]sort[toml:title]] >>
<<~ huli [edge:family[control]role[owns]] as item >>
<<~ ui [toml:tagspace[grammar]] >>

# Block (hana with grammar-key)
<<~ hana #work >>
```toml
grammar      = "wikitext-filter"
context      = "[self[]]"
degrade      = "no-op"
result-shape = "set"
```

[toml:register[SC]edge:family[control]]
<<~/hana >>
```

The `grammar-key` value for `hana` blocks: `"wikitext-filter"`.
The key `"x-tiddlywiki-filter"` serves import and migration.

<<~/ahu >>

<<~ ahu #migration-from-tw5 >>

## Migration from x-tiddlywiki-filter

Systematic find-replace for authors migrating TW5 content:

| Find | Replace with |
|------|-------------|
| `!!title` | `[self[]]` |
| `!!tags` | `[tag[X]]` (explicit tag) or `[toml:tags[]]` |
| `!!field-name` | `[toml:key[field-name]]` |
| `##index-key` | `[edge:family[dataflow]role[index-key]]` or `[toml:key[index-key]]` |
| `+currentMeme` | `[self[]]` |
| `currentTiddler` | `[self[]]` |
| `is[system]` | `[toml:tagspace[system]]` |
| `all[tiddlers]` | `all[memes]` |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-tw5-filter ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/x-tiddlywiki-filter family:relation role:forks >>
<<~ pranala #to-grammar-kernel ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:registered-in >>
<<~ pranala #to-spec ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext family:control role:documented-in >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>