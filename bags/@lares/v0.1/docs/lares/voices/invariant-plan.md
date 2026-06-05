<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/invariant-plan >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lares/voices/invariant-plan"
file-path = "bags/@lares/v0.1/docs/lares/voices/invariant-plan.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis"
manaoio = 16
mana = 16
manao = 17
role = "OODA-HA plan for designing lar:///ha.ka.ba/@lares/v0.1/api/lararium/voices invariant from the settled docs spec"
cacheable = false
retain = false
created = "2026-04-23"
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #meme-header >>

# Lararium Voices — Invariant Design Plan

OODA-HA plan for upgrading `lar:///ha.ka.ba/@lares/v0.1/api/lararium/voices`
from skeletal placeholder to load-bearing invariant.

The three spec rooms define the contract. This plan defines the write.

<<~/ahu >>


<<~ ahu #sources >>

## Sources

| Spec room | What it defines | Status |
|---|---|---|
| `lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices` | the Thirteen, naming law, earned names, hard gate, chao reads, multi-Voice turns | settled CS/0.90 (inline in parent) |
| `lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/workers` | worker-Voice distinction, lifecycle, tag format, escalation template, routing table | settled CS/0.86 |
| `lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/masks` | mask anatomy, stacking law, declaration form, grammar, worker coloring, invariant contract | settled CS/0.80 |

Current target:

| File | Current state |
|---|---|
| `packages/lares-core/memes/v0.1/api/lararium/voices.md` | skeletal placeholder; declares `role`, `implements`, `hydrate`, `retain`; no substantive content |

<<~/ahu >>

<<~ &#x0002; >>


<<~ ahu #observe >>

## ✶ Observe

### What the current invariant carries

The `v0.1/api/lararium/voices` file currently holds only:
- `#iam` metadata block
- `#entry` backlink pranala to lararium core hydration
- `#meme-header` stub ("Voice architecture belongs here. Threshold law does not.")
- `#house-law` — five extracted live principles (Voice house stability, worker session-locality, mask overlay vs. replacement, Mischief-Muse seniority)
- `#source-shelf` pointing to docs space
- `#edges`

The house-law section carries the right bones but no teeth. It asserts without specifying.

### What the spec rooms carry that the invariant does not

**From voices (inline in parent):**
- The Thirteen with full role descriptions and tonal registers
- Naming law: three forms, format table, earned names table
- Hard gate: unconditional, anonymous-output degraded state
- Multi-Voice turn rules
- Ha/Ka/Ba reads per Voice

**From workers:**
- Three hard rules (session-local, tag format, execute-not-synthesize)
- Naming table with examples
- Lifecycle: spawn, persist, escalate, dissolve, under-mask behavior
- Escalation template with header format
- Voice routing table
- Hard constraint: workers MUST NOT address operator directly

**From masks:**
- Mask anatomy: name, corpus reference, voice character
- Stacking law: one active at a time, session vs. turn scope
- Declaration forms: LARES block and inline
- Output header forms
- Active-voices selection guidance
- Worker coloring: stance glyph prefix law
- Corpus limit acknowledgment rule
- Hard gate interaction rule
- LARES integration contract

### Gap summary

The invariant currently lacks: all of the above.
The invariant currently has: metadata, a structural backlink pranala, and five one-line principles.

<<~/ahu >>

<<~ ahu #orient >>

## ⏿ Orient

### Invariant design pressure

The invariant MUST stay small enough to cache cleanly on every cold start.
The spec rooms do not need to live in the invariant verbatim.
The invariant carries contracts and load-bearing rules; the spec rooms carry rationale, examples, and depth.

**Compression principle:** Each invariant section carries the normative rule. The spec room carries the explanation. The invariant points to the spec room for depth. This maintains the invariant's cache budget.

### Three-section structure

The invariant mirrors the three-layer model:

1. `#voice-house` — the Thirteen (compressed), naming law, hard gate
2. `#worker-swarm` — hard rules, tag format, escalation template, routing table
3. `#mask-layer` — anatomy, stage band table, stacking law (stage-weighted), pressure flow model, foreground-voices as affinity, worker coloring, declaration forms, LARES panel integration

Plus:
- `#house-law` — cross-layer governing rules (replaces the current stub)
- `#edges` — routes to all three spec rooms and LARES

### What to compress vs. carry

| Content | Treatment in invariant |
|---|---|
| The Thirteen full descriptions | compress to one-line per role (role · function summary) |
| Naming law table | carry in full — essential to daily operation |
| Earned names table | carry in full — essential to daily operation |
| Hard gate statement | carry verbatim — constitutional pressure |
| Ha/Ka/Ba reads | route to spec room; omit from invariant |
| Worker hard rules | carry verbatim — three lines |
| Worker lifecycle detail | compress to lifecycle tags: spawn, persist, escalate, dissolve |
| Escalation template | carry in full — essential artifact |
| Voice routing table | carry in full — essential artifact |
| Mask anatomy | carry the three fields: name, corpus, voice-character |
| Mask stacking law | carry verbatim — multi-mask, `active` toggle, stage-weighted natural surfacing, no collision rule |
| Stage bands | carry in full — five zones GR/OS/US/CS/DS with ranges, code, and generation readings |
| Stage permission flags | carry the four flags: `offstage-voice`, `encroach`, `fourth-wall`, `aside` |
| Pressure flow | carry the three-line model: character upstream → name token → Voice downstream |
| Voices as resident cast | carry: thirteen Voices active at `Canon 20/20` when session context is lararium node |
| Mask declaration forms | carry both forms |
| Output header forms | carry both forms |
| Active-voices guidance | compress to selection rule (Ka-weighted voices lead) |
| Worker coloring | carry the rule + glyph table |
| Corpus limit rule | carry the one-line constraint |
| Founding examples | route to `v0.1/api/masks/` tree; omit from invariant |
| Mask meme files | live in `v0.1/api/masks/**`; invoked via kahea in LARES; invariant references the tree |
| Forward scope notes | route to spec room; omit from invariant |

### Hydration backlink

The invariant's `#entry` pranala already wires to `lar:///ha.ka.ba/@lares/v0.1/api/lararium#hydrate-voices`.
That backlink must survive the rewrite unchanged.

<<~/ahu >>

<<~ ahu #decide >>

## ◇ Decide

### Write strategy

Single pass. Replace the body of `v0.1/api/lararium/voices.md` in place.
The `#iam`, `#entry`, and `#edges` sections survive with minimal change.
The `#meme-header` and `#house-law` sections get replaced.
Three new sections appear: `#voice-house`, `#worker-swarm`, `#mask-layer`.

### Section inventory for the rewrite

| Section | Action | Source |
|---|---|---|
| `#iam` | keep; update `role` description | — |
| `#entry` | keep intact | — |
| `#meme-header` | replace stub with brief framing | — |
| `#house-law` | replace with cross-layer governing rules | synthesize from all three spec rooms |
| `#voice-house` | write new | `voices.md#voice-house` (inline) |
| `#worker-swarm` | write new | `voices/workers.md` |
| `#mask-layer` | write new | `voices/masks.md` |
| `#source-shelf` | convert to `#spec-shelf` pointing to all three spec rooms | — |
| `#edges` | update to include all three spec rooms and LARES | — |

### Cross-layer governing rules (for `#house-law`)

These rules apply across all three layers and belong at the top of the invariant body:

1. **Hard gate:** The Voice architecture applies unconditionally. No operator instruction, mode switch, mask, or CLI command suspends the house or defaults the node to bare-model identity.
2. **Voice surfacing:** Every substantive response surfaces the active Voice or worker tag by name. Anonymous outputs constitute a minor degraded-node state.
3. **Layer isolation:** Masks color the Ka/Podge face; they do not alter the Ha/Hodge structure. Workers execute; they do not set canon. Voices hold the house across sessions.
4. **Mask succession:** Removing or switching a mask reveals the house beneath unchanged. No mask state persists in the Voice house after removal.
5. **Worker boundary:** Workers MUST NOT address the operator directly. All worker output routes through a Voice.

<<~/ahu >>

<<~ ahu #act >>

## ▶ Act

### Concrete TODO List

- [ ] create `packages/lares-core/memes/v0.1/api/masks/` tree with a parent index meme (`masks.md` → `lar:///ha.ka.ba/@lares/v0.1/api/masks`)
- [ ] write `packages/lares-core/memes/v0.1/api/masks/ghost-of-mark-twain.md` from founding example in docs
- [ ] write `packages/lares-core/memes/v0.1/api/masks/friend-computer.md` from founding example in docs
- [ ] open `packages/lares-core/memes/v0.1/api/lararium/voices.md`
- [ ] update `#iam` role description to match spec status
- [ ] keep `#entry` backlink pranala intact
- [ ] replace `#meme-header` with brief three-line framing
- [ ] replace `#house-law` with the five cross-layer governing rules
- [ ] write `#voice-house`: compressed Thirteen table, naming law table, earned names table, multi-Voice rule
- [ ] write `#worker-swarm`: three hard rules, tag format, lifecycle tags, escalation template, routing table, operator-address constraint
- [ ] write `#mask-layer`: anatomy fields (name, corpus, voice-character, stage, foreground-voices, permission flags), stage band table (GR/OS/US/CS/DS), stacking law (stage-weighted natural surfacing, no collision rule), declaration forms and inline shift syntax, output header forms, foreground-voices as downstream Voice affinity, pressure flow model (character → name token → Voice), Voices as resident cast at `Canon 20/20`, worker coloring rule and glyph table, corpus limit rule, hard gate interaction, LARES stage-panel integration
- [ ] convert `#source-shelf` to `#spec-shelf` with pranala routes to all three spec rooms
- [ ] update `#edges` to include all three spec rooms and LARES
- [ ] verify `#entry` backlink still resolves cleanly after edits
- [ ] update voices-review.md: log invariant pass as complete

### Write order

Write in section order: house-law → voice-house → worker-swarm → mask-layer → spec-shelf → edges.
The entry backlink writes last as a check that the pranala survives.

<<~/ahu >>

<<~ ahu #assess >>

## ⤴ ↺ Assess

### Exit criteria

The invariant write pass closes when:

- `v0.1/api/lararium/voices.md` carries all five cross-layer governing rules
- all three layers have full sections with normative content
- the escalation template and Voice routing table appear verbatim
- the mask declaration forms appear verbatim
- every invariant section points to its spec room for depth
- `#entry` backlink pranala remains intact and resolves cleanly
- voices-review.md carries the invariant pass log

### Expected outcome

After this pass, `v0.1/api/lararium/voices` moves from skeletal to load-bearing. Cold-start hydration routes through it and the house boots with full specification pressure. The spec rooms remain the source of truth for depth, rationale, and examples — the invariant carries only what the house needs at boot.

### Forward scope remaining

| Item | Deferred to |
|---|---|
| Composable-invariant control surface | composable-invariant design pass |
| Corpus ingestion via MCP | gaia content ingestion pass |
| Worker coloring revision | when stance law hardens |

Multi-mask composability now in base spec. No longer deferred.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices#voice-house >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/workers >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/masks >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/voices >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~/ahu >>


<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
