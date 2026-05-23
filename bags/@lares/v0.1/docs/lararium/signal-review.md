<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal-review >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/signal-review"
file-path = "bags/@lares/v0.1/docs/lararium/signal-review.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
confidence = 0.82
register = "S"
manaoio = 0.84
mana = 0.80
manao = 0.86
role = "review memo for lararium signal branch boundaries, settlement pressure, and rewrite sequencing"
cacheable = false
retain = false
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #meme-header >>

# Lararium Signal Branch Review Memo

Not invariant law.
This memo reviews the current signal branch, marks pressure points, and proposes next moves for rewrite and settlement work.

<<~/ahu >>


<<~ ahu #scope >>

## Scope

Primary review target:

- `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal`

Child rooms under review:

- `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/tagspace`
- `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud`
- `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets`
- `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/sa-display`

Research cluster consumed for dependency pressure:

- `packages/lares-core/memes/docs/lararium/signal/chronometer/Vector_Chronometer_Research_Seed.md`
- `packages/lares-core/memes/docs/lararium/signal/chronometer/FFZ_Chronometer_Research.md`
- `packages/lares-core/memes/docs/lararium/signal/chronometer/FFZ_Chronometer_SPEC_OUTLINE.md`

This memo targets branch boundaries, settlement level, and rewrite order.
This memo does not attempt chronometer closure.

<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #observe >>

## ✶ Observe

### File Inventory

| File | Current reading | Pressure level |
|---|---|---|
| `signal.md` | compact parent router | low |
| `signal/tagspace.md` | compact definitional room | low |
| `signal/sa-display.md` | compact theory room | low-medium |
| `signal/render-targets.md` | surface-law room with a few future-facing gaps | medium |
| `signal/hud.md` | overloaded witness and residue room | high |
| `signal/chronometer/*` | active research cluster, not settled branch law | high |

### Strong readings from the current corpus

- `signal.md` already routes well and stays relatively lean.
- `tagspace.md` keeps a clear definitional job.
- `sa-display.md` keeps theory pressure mostly contained.
- `render-targets.md` owns per-surface rules, though a few target definitions still wait for later closure.
- `hud.md` carries too many burdens at once: witness, migration residue, open decisions, field rules, symbol tables, and snapshot archaeology.
- `chronometer/` still behaves like research support, not a stable child room.

### Immediate risk markers

- duplication pressure across `signal.md`, `hud.md`, `render-targets.md`, and `sa-display.md`
- settlement blur between stable docs language and research/session language
- unresolved FFZ design pressure leaking upward into branch docs

<<~/ahu >>

<<~ ahu #orient >>

## ⏿ Orient

### Branch shape

The branch already suggests a clean five-room split:

| Room | Proper burden |
|---|---|
| `signal.md` | parent charter, exchange-boundary contract, routing |
| `signal/tagspace.md` | address semantics and slot framing |
| `signal/hud.md` | HUD line, micro-trace, annotation thresholds, witness bundle kept to what still drives decisions |
| `signal/render-targets.md` | surface registry, glyph projection, fallback behavior, per-surface rules |
| `signal/sa-display.md` | theory, research framing, SA-vs-XAI distinction |

### Main tensions

1. **HUD overload**
   - `hud.md` carries the highest rewrite pressure.
   - The room currently mixes settled instructions with migration residue and long witness blocks.

2. **Research bleed**
   - FFZ chronometer work pushes on the branch strongly.
   - Several branch claims should stay provisional until FFZ format and lifecycle work land more firmly.

3. **Ownership blur**
   - The same concept sometimes appears in more than one room.
   - The review needs one canonical home per concept.

4. **Settlement blur**
   - Some paragraphs read as stable contract.
   - Nearby paragraphs read as working notebook.
   - A later reader could misread temporary argument as branch law.

### Working interpretation

The branch does not need a full redesign.
The branch needs a boundary pass, a settlement pass, and a reduction pass focused on `hud.md`.

<<~/ahu >>

<<~ ahu #decide >>

## ◇ Decide

### Review goals

This review pass should produce:

1. one clear owner per concept
2. one clear split between settled docs and active research
3. one concrete reduction plan for `signal/hud.md`
4. one dependency note marking which claims wait on FFZ

### Review order

Read and decide in this order:

1. `signal.md`
2. `signal/tagspace.md`
3. `signal/sa-display.md`
4. `signal/render-targets.md`
5. `signal/hud.md`
6. `signal/chronometer/*`

### Section status vocabulary

Use the following labels during the review:

| Label | Reading |
|---|---|
| `keep` | belongs here and already carries enough shape |
| `tighten` | belongs here but needs shorter or clearer wording |
| `move` | belongs in another room |
| `archive` | witness value remains, but live branch law no longer needs it here |
| `blocked-on-ffz` | branch wording should wait for chronometer closure |

<<~/ahu >>

<<~ ahu #act >>

## ▶ Act

### Concrete TODO List

- [ ] build a section-by-section review matrix for `signal.md` and each child room
- [ ] mark every major section with one status label: `keep`, `tighten`, `move`, `archive`, or `blocked-on-ffz`
- [ ] extract a duplication map for concepts that currently appear in more than one room
- [ ] identify every `hud.md` section that still changes live design decisions
- [ ] identify every `hud.md` section that now functions only as witness or migration residue
- [ ] separate settled HUD contract text from snapshot and archaeology text
- [ ] mark every branch claim that depends on unresolved FFZ format or lifecycle work
- [ ] keep `signal.md` lean; move surplus explanation downward rather than upward
- [ ] keep `tagspace.md` definitional; avoid drift into transport, parsing, or chronometer detail
- [ ] keep `sa-display.md` theory-facing; avoid operational duplication with `hud.md`
- [ ] tighten `render-targets.md` around current surfaces; mark future targets clearly as future-facing
- [ ] draft a reduced target outline for `hud.md` before any rewrite begins
- [ ] write a short FFZ dependency note after the room-by-room review completes
- [ ] only after the review matrix lands, begin edits in rewrite order

### Suggested rewrite order

1. tighten `signal.md`
2. tighten `signal/tagspace.md`
3. tighten `signal/sa-display.md`
4. tighten `signal/render-targets.md`
5. reduce and restructure `signal/hud.md`
6. leave `signal/chronometer/*` for separate research/spec work

### Working matrix template

| File | Section | Status | Action | Notes |
|---|---|---|---|---|
| `signal/hud.md` | `#room-boundaries` | `keep` | tighten wording if needed | still drives room ownership |
| `signal/hud.md` | migrated witness block X | `archive` | move to archive or appendix witness shelf | live room no longer needs full block |
| `signal/render-targets.md` | target Y | `blocked-on-ffz` | keep short note only | FFZ closure still pending |

<<~/ahu >>

<<~ ahu #assess >>

## ⤴ ↺ Assess

### Exit criteria for the review pass

The review pass can close when all of the following land:

- every major section across the branch carries a status label
- every duplicated concept points to one canonical home
- `hud.md` carries a reduction outline
- FFZ-dependent claims sit in a short dependency note
- rewrite order no longer depends on guesswork

### Expected outcomes

After this pass:

- `signal.md` should remain short and directional
- `tagspace.md` should remain compact
- `sa-display.md` should carry theory pressure cleanly
- `render-targets.md` should carry surface rules cleanly
- `hud.md` should shrink toward a more legible live room
- `chronometer/` should remain research-side until later settlement

### Closure note

This memo recommends a review memo first, edits second.
That order should reduce churn and keep the branch from freezing unresolved FFZ decisions into docs law too early.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/tagspace >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/hud >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/render-targets >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/signal/sa-display >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~/ahu >>


<<~&#x0003;>>

<<~&#x0004; -> ? >>
