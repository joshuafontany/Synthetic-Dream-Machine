<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-type-lattice >>
```toml iam
uri-path    = "ha.ka.ba/@lares/v0.1/api/pono/verse-type-lattice"
file-path   = "bags/@lares/v0.1/api/pono/verse-type-lattice.md"
type        = "text/x-memetic-wikitext"
register    = "Synthesis-Canon"
mana        = 17
manao       = 17
tagspace    = "stable"
role        = "canonical: Verse type lattice — any/false/void/comparable hierarchy; persistable constraint universe; effects bit-vector (6 families); edge-label semantics for pranala type annotations"
cacheable   = true
retain      = true
status-date = "2026-05-15"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Verse Type Lattice

Verse's type system is a **lattice**, not a simple tree. At the top sits `any`
(universal supertype); at the bottom lies `false` (uninhabited bottom type).
Between them: all primitives, containers, classes, and interfaces as subtypes of `any`.

**Source authority:** Book of Verse ch. 11 (verselang.github.io/book/11_types/),
ch. 13 (effects), ch. 17 (persistable); Epic Games developer documentation.

<<~/ahu >>

<<~ ahu #lattice >>

## The Type Lattice

```
any                        ← universal supertype; ALL types descend from it
│                            erases type information when stored here
├── comparable             ← constraint type; adds equality + ordering capability
├── int / float / rational ← numeric primitives; all comparable
├── logic                  ← boolean
├── char / char32          ← character types
├── string                 ← text (array of char)
├── []T (array)            ← covariant in element type
├── [K]V (map)             ← contravariant in keys, covariant in values
├── (T1, T2, ...) (tuple)  ← covariant in components
├── ?T (option)            ← covariant in element type
├── all class types        ← nominal subtyping via single inheritance
│   └── all interface types (multiple composition via implements)
└── function types         ← contravariant in parameters, covariant in return

void                       ← discard type; supertype of all types in contravariant
                             (return) position. Only valid as a function return type.
                             Signals: this function's result is not useful.

false                      ← bottom type; SUBTYPE of ALL types; uninhabited.
                             No value of type false exists. Used to type
                             expressions that never return (infinite loops,
                             unconditional failure, etc.).
```

### Subtyping rule

> "When type A is a subtype of type B, every value of type A can be used wherever
> a value of type B is expected." — Book of Verse ch. 11

Covariance in containers: if `int <: rational`, then `[]int <: []rational`.
Contravariance in map keys: `[K1]V1 <: [K2]V2` requires `K2 <: K1` (reversed).
Function subtyping: `(T1)->R1 <: (T2)->R2` requires `T2 <: T1` and `R1 <: R2`.

<<~/ahu >>

<<~ ahu #class-modifiers >>

## Class Modifiers That Affect the Lattice

| Modifier | Effect on subtyping |
|---|---|
| `<unique>` | Class instances carry identity equality; are comparable |
| `<castable>` | Enables runtime type checking (`Type(value)` casts) |
| `<final>` | No subclasses allowed; required for `<persistable>` classes |
| `<persistable>` | Marks a class/struct/enum for cross-session storage (see below) |

<<~/ahu >>

<<~ ahu #persistable-constraint >>

## Persistable — A Closed Constraint Universe

`<persistable>` is NOT a node in the type lattice. It is a constraint on type
composition: a type is persistable if it stores ONLY persistable-compatible values.

**Built-in persistable types:**
- Primitives: `logic`, `int`, `float`, `string`, `char`, `char32`
- Containers: `array`, `map`, `option`, `tuple` — when element types are persistable

**Types that CANNOT appear in persistable class/struct fields:**
- `any` — erases type info; not persistable-safe
- `comparable` — constraint type; not persistable-safe
- `type` — meta-type; not persistable-safe
- `rational` — arbitrary-precision; not persistable-safe
- Function types — not persistable-safe
- `weak_map` — not persistable-safe
- Interface types — not persistable-safe
- Non-persistable user types

**Structural rules for persistable classes:**
- Must be marked `<final>` (no subclasses)
- Must be marked `<persistable>` on the class declaration
- All fields must themselves be of persistable type

Persistable data is stored via `weak_map(player, t)` declarations and persists across
game sessions. This is Verse's equivalent of cross-session player storage.

<<~/ahu >>

<<~ ahu #effects-as-edge-labels >>

## Effects System — Six Families

Verse effects are a **bit-vector** propagated upward through call chains. Each
function declares which effect bits it sets; callers must declare at least the same
bits (or more). Six families:

| Family | Specifier | Meaning | Graph relevance |
|---|---|---|---|
| Cardinality | `<decides>` | Can fail (zero or one result) | edge may not fire |
| Heap | `<transacts>` | Reads/writes/allocates heap | edge has side effects |
| Suspension | `<suspends>` | Async; may pause and resume | edge is async |
| Divergence | `<converges>` | Guaranteed to terminate | edge is bounded |
| Prediction | `<predicts>` | Deterministic/pure prediction | edge is reproducible |
| Purity | `<computes>` | No side effects (composite of read-only) | edge is safe to parallelize |

**Composition specifiers:**
- `<computes>` — pure: no heap writes, no suspension, no failure, no divergence
- `<transacts>` — default: heap reads + writes + allocation
- `<reads>` — read-only heap access

**Key rule:** Functions **without `<writes>`** can be safely executed in parallel
without locks. This is the Verse-native condition for safe concurrent edges.

### Propagation and hiding

Effects propagate **upward**: calling a `<suspends>` function from a non-suspends
function requires marking the caller `<suspends>`. The effect bit flows up the call
chain.

**Exception — `spawn` hides `<suspends>`:** The `spawn` expression absorbs the
`<suspends>` effect of the spawned function. The calling context does NOT need to be
marked `<suspends>`. This is the formal mechanism that allows spawn to create a new
task root independent of the calling scope. See `verse-task-tree` for the tree-topology
consequence.

**`if` hides `<decides>`:** The `if` expression absorbs the failure effect of its
condition. The calling context does NOT need to handle failure — `if` converts a
failable expression into a conditional branch.

<<~/ahu >>

<<~ ahu #pranala-edge-labels >>

## Effects as Pranala Edge Labels

When Lararium models Verse function types in the graph, effects annotate the edge:

| Effect present | Edge annotation | Meaning |
|---|---|---|
| `<suspends>` | `reaction:subscribable` edge; `effects: suspends` | input handler is async |
| `<decides>` | `reaction:subscribable` edge; `effects: decides` | handler is failable |
| `<transacts>` | `reaction:subscribable` edge; `effects: transacts` | handler participates in rollback |
| `<computes>` | `aka` / observe-family edges | pure; frozen-read semantics |
| `<converges>` | (future annotation) | handler guaranteed to terminate |

These annotations feed future Verse code generation from the Lararium scene graph.
See `uefn-scene` for the `reaction:subscribable` edge format and `KumuSubscribable.effects`.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-verse-task-tree ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-task-tree family:relation >>
<<~ pranala #to-verse-event-lattice ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-event-lattice family:relation >>
<<~ pranala #to-uefn-scene ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/uefn-scene family:relation >>
<<~ pranala #to-heihei ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heihei family:relation role:uses >>
<<~ pranala #to-kapu ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kapu family:relation role:uses >>
<<~ pranala #to-pono ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pono family:control role:governs >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
