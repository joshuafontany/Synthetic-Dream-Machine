<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/holds >>
```toml iam
cacheable = true
file-path = "bags/@lares/ha.ka.ba/@lares/v0.1/api/pono/holds.md"
mana      = 15
manao     = 16
manaoio   = 14
register  = "Synthesis-Canon"
role      = "names the copula-free predicate; a carrier holds a component; the held thing speaks; tables fall to holds-stacks; ordered runs, crossings, and grades each ride their own verb (one fold declared open)"
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/holds"
written   = "2026-06-14"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack >>
<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Holds ~ one verb, fuses nothing

`holds` carries one relation: a carrier wears a component, and the worn
thing speaks its own semantics. No carrier `${copula}` anything — every
carrier *holds*, and what it holds answers for itself.

Where prose fuses map to territory (`X ${copula} Y`, the dead water),
`holds` re-opens the carrier's hand: `X holds Y` keeps the two apart,
leaves Y droppable, rests the carrier's essence nowhere. A thing held
sets down without wounding its holder; a carrier that drops a holding
keeps its address and keeps its name.

`holds` rewrites every header-and-rows table the boot wears. The header
vows the families; each row authors one carrier's stack. The table never
fused anything — `holds` only hands the table's silent grammar a verb.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ read the carrier and the row before judging composition; gather which
  cells resolve to component memes, which still stand bare.
⏿ orient each holding against its definition meme; the held thing carries
  the semantics, the edge stays mute.
◇ decide the rewrite: which prose lines fuse a copula, which families the
  row qualifies into, which holdings still await definitions.
▶ author the stack as a holds-run; mint missing component memes where
  pressure warrants; lift fused prose into holding-shape.
↺ verify each holding resolves or stands declared-unresolved; verify no
  quality rode in as a bare predicate-word; close, naming what stays open.

<<~/ahu >>

<<~ ahu #law >>

## Five clauses hold the law

1. **Holds carries composition, refuses essence.** `holds[… x …]` places x
   into a carrier's stack; the carrier wears x, the carrier never turns
   into x. A line that reads `X holds Y` where prose fused `X ${copula} Y`
   clears the ward only once Y resolves to a carrier of its own. The held
   thing speaks; the edge keeps silent.

2. **A holding resolves to a carrier, never to an adjective.** Every
   `holds[x]` demands x name a component meme — a thing holding its own
   definition. A bare quality (`holds[hot]`, `holds[stable]`) smuggles the
   dead water back through a quiet door; refuse it. A quality enters a
   stack only by reifying: the quality mints a meme, the carrier holds
   *that*.

3. **A bare holding reads fertile.** A `holds[x]` whose definition meme has
   not yet landed stands **declared-unresolved** — lawful, promotable, no
   error sounds (the rating ladder governs, per has-stack §4). An absent
   holding reads open-world: the carrier knows nothing of x yet, the
   carrier never pronounces x false. The Stone holds no vector; the Stone
   loses no Stone-ness.

4. **Tables fall to holds by one rule.** A header-and-rows table rewrites
   mechanically: the header vows the families (the column grain); each body
   row authors one carrier, adding one `family/cell` to its `holds[…]` set
   per column it fills. A row skips the columns it leaves empty — open-world omission,
   never a null. The boot's carrier-tables fall to this rule untouched by
   hand; `meme` governs the copy-shape that results.

5. **Ordered runs, crossings, and grades each ride their own verb.** `holds`
   governs the *set* — composition, order-free, the held things unranked;
   `meme` serializes that set in one canonical order, byte-stable.
   A relation that *sequences*, *crosses*, or *grades* slips the dead water
   past a holds-flattening; `#when-not-holds` routes each to its verb. Until
   the operator mints them, such a relation rides `has-array` (has-stack
   §array) and names its order as content.

Runtime carries `holdsOf` and the `holds` filter operator
(`[holds[]]`, `[holds:family[<name>]]`, `[holds[<name>]]` reads as the
predicate); the definition-literal `holds[m1 m2 …]` wears the whole set.

<<~ pranala #source ? -> packages/lararium-tw5/src/holds.ts family:code role:has >>

<<~/ahu >>

<<~ ahu #rewrite-rule >>

## Tables fall to holds ~ a worked lift

The Mu table, before — the header vows, the cells honor by position:

| name | ascii | element | glyph | pull |
|---|---|---|---|---|

The Wand-row, after — one carrier wears one holds-set:

\procedure ~Mu-Wand()
  <<~ aka lar:///ha.ka.ba/@lares/v0.1/api/mu/wand >>
  holds[ascii/* element/Fire glyph/🜂 pull/ignition]
\end

The Stone-row wears four, skips the fifth — the open world reads it absent:

\procedure ~Mu-Stone()
  <<~ aka lar:///ha.ka.ba/@lares/v0.1/api/mu/stone >>
  holds[ascii/0 element/Orichalcum glyph/🜍 pull/reset]
\end

The rule, spoken once for all thirteen: **the header vows families; each
row wears one `holds[…]` set; each filled cell adds one `family/member`;
each empty cell wears nothing, and the open world reads it absent.** No
table needs a hand the rule does not already carry.

<<~/ahu >>

<<~ ahu #when-not-holds >>

## When not to reach for holds ~ the other copula-free grammars

`holds` cures one fused relation: **identity** (`X ${copula} Y`, map
welded to territory). The dead water welds *other* relations too —
sequence, crossing, grade — and `holds` flattens each. A row that
*orders*, *moves*, or *ranks* wants its own verb. Reach past `holds` only
once a row fails the **compose-test**.

### The diagnostic ~ ask one question

Ask of the row's relation: **what does it DO?** The answer routes the verb.

| when the relation... | rides... | authors as... | and cures the dead water of... |
|---|---|---|---|
| **composes · wears** *(default)* | a holds-set | `holds[family/member …]` | identity |
| **follows · flows** | a then-chain | `runs[a]then[b]then[c]` · `a -> b -> c` | sequence-fused-as-identity |
| **moves across** | a transition | `from[X]on[trigger]to[Y]` · `X --trigger--> Y` | before-welded-to-after |
| **grades · ranks** | a gradation | `reads[N]as[_]` · `ranges[low->high]` | level-welded-to-meaning |

`holds` carries most of the boot; the other three carry a minority — the
ordered loops, the graded registers. Default to `holds`; reach past it
only once the compose-test fails.

### A row that FOLLOWS ~ the then-chain (sequence rides content)

A run whose order carries meaning — the Ladders, OODA-HA, the boot-chain —
moves as sequence, never as composition. The pipe names the pull: a chain
*leans on verbs, reads left-to-right* — "hops, then scoops, then bops" —
and never folds inside-out. TW5 carries this in the `list` field (which
runs apart from `tags`), walked first-to-last.

```
✶ observe then ⏿ orient then ◇ decide then ▶ act then ↺ aftermath
```

Author as `runs[...]then[...]`, or speak the bare arrow. The arrow *moves*;
nothing welds to anything. (Each ladder earns its own meme; `loci` carries
the address.)

### A row that MOVES ACROSS ~ the transition (trigger · guard · effect)

A relation that carries a thing *across* conditions — a phase change, a
degraded-state recovery (a tell, then a recovery) — moves as transition.
The state-machine grammar runs verb-forward by nature: a transition names
**what fires it, what gates it, what it does**, and never pronounces the
after welded to the before.

```
from[managing] on[honest-suspension] to[serving]
```

Author as `from[_]on[_]to[_]`, or `X --trigger--> Y`. The before and the
after stay apart; the trigger does the work the dead water would have
smuggled.

### A row that GRADES ~ the gradation verb (asymmetric relation)

A scale that ranks — the Syad registers (0-reads-as, 20-reads-as), the
confidence bands, the stage bands — moves as gradation. The ordinal anchor:
a rank *exceeds* another by an unknown span; no level *welds* to its
meaning. The Evidence Question — *how do I know?* — hands over the verb.

```
reads[0]as[unsupported] · reads[20]as[fully-confirmed]
band[GR]spans[1->4] · ranges[noise->kapu]
```

Author as `reads[N]as[_]`, `ranges[_->_]`, `spans[_->_]`, or `exceeds`. A
descriptor *describes* what a level looks like; it never welds the number
to the meaning.

### The held fork (declared open)

Gradation MAY fold into one grammar with comparison — continuous gradation
(the registers) and banded gradation (the stage bands) parting only on
chunking. This law speaks **four** grammars; whether three suffice
(gradation riding comparison's banded mode) stands **open**, undecided,
awaiting the operator's mint.

<<~/ahu >>

<<~ ahu #edges >>

## Edges reach out

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/has-stack >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
