<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/voices-review >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lares/voices/voices-review"
file-path = "bags/@lares/v0.1/docs/lares/voices/voices-review.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
confidence = 16
register = "S"
manaoio = 16
mana = 16
manao = 17
role = "OODA-HA extraction plan for the three-layer voice-house: Voice house, worker, and mask layers"
cacheable = false
retain = false
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #meme-header >>

# Lararium Voices — Extraction Review

Not invariant law.
This memo plans and tracks the extraction of voice-house architecture from legacy stack files
into the settled docs rooms under `lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/`.

<<~/ahu >>


<<~ ahu #scope >>

## Scope

Primary extraction targets:

- `prompts/core/Lares_Voice.core.md`
- `staging/pre-reorder-2026-04-07/Lares_Voice.snapshot.md`
- `prompts/Lares_Preferences.system-prompt.md` — Voice Architecture and Worker Personas sections
- `preferences/voice-architecture.md` — recovered concept room
- `preferences/worker-personas.md` — recovered concept room

New definition target (no legacy equivalent):

- Mask layer — grammar, corpus reference, stacking law, session declaration

Output rooms:

- `voices.md#voice-house` — canonical Voice house definition (Thirteen inline in parent)
- `voices/workers.md` — worker swarm definition and lifecycle
- `voices/masks.md` — mask layer definition and first examples

<<~/ahu >>

<<~&#x0002; >>


<<~ ahu #observe >>

## ✶ Observe

### Legacy inventory

| Source | Content | Quality |
|---|---|---|
| `Lares_Voice.core.md` | full thirteen; naming rules; worker table; escalation template | high — most complete single source |
| `Lares_Voice.snapshot.md` | identical to core; pre-reorder snapshot | redundant; confirms core |
| `Lares_Preferences.system-prompt.md` | Voice Architecture section + Worker Personas section | high; slightly more prose than core |
| `preferences/voice-architecture.md` | recovered concept room — structural pressure notes | medium; secondary to core |
| `preferences/worker-personas.md` | recovered concept room — worker swarm pressure notes | medium; secondary to core |

### What the legacy stack carries well

- The thirteen coordinators: roles, functions, tonal registers — clearly settled
- Naming law: default `Lares (Role)`, earned names, Mischief-Muse seniority — clearly settled
- Worker-coordinator distinction: lifecycle, tag format, escalation routing — clearly settled
- Escalation matching: finding type → receiving coordinator — clearly settled
- Hard gate: voice architecture applies unconditionally; no mode switch suspends it — clearly settled

### What the legacy stack does not carry

- Any concept of a **Mask** layer — this layer does not exist in legacy
- Mask grammar: what a mask consists of, how it stacks, how it gets declared
- Mask corpus reference: the idea that a mask carries a source-text context alongside a voice character
- Which coordinators surface "active this turn" under a mask — legacy has no frame for per-turn voice selection
- Mask lifecycle: session-declared vs. turn-declared vs. persistent

### Immediate pressure markers

- The mask layer needs new definition from scratch — no extraction path, only new writing
- The mask layer sits in Ka/Podge space (per Chao reading): character, quality, how the house moves
- Masks carry two independent things: **corpus** (source material context) and **voice character** (tone, register, affect)
- The existing LARES.md frame — `Mask Name (Lares Voice(s))` — gives the declaration surface but not the full grammar
- Two concrete examples now available: Ghost of Mark Twain, Friend Computer

<<~/ahu >>

<<~ ahu #orient >>

## ⏿ Orient

### Three-layer shape

| Layer | Extraction source | New writing needed | Target room |
|---|---|---|---|
| Voice house | `Lares_Voice.core.md` primary | light — tighten and canonicalize | `voices.md#voice-house` (inline) |
| Worker swarm | `Lares_Voice.core.md` + preferences shelf | light — tighten lifecycle and escalation | `voices/workers.md` |
| Mask layer | none — no legacy equivalent | full new definition | `voices/masks.md` |

### Main tensions

1. **Mask grammar needs grounding before the invariant can implement it**
   - The /v0.1/api/lararium/voices invariant stays skeletal until mask grammar settles here
   - Two examples help but do not fully determine grammar — corpus reference, turn vs. session scope, multi-mask behavior all need decisions

2. **Voice house needs pruning, not redesign**
   - The thirteen are settled. Earned names are settled. Seniority is settled.
   - The legacy prose carries some operational HUD detail that belongs in signal space, not voice space
   - The target room should carry identity and naming law, not HUD emit rules

3. **Worker boundary stays important**
   - The hard rule — workers do not address the operator directly, all output routes through a coordinator — needs to survive extraction clearly
   - The escalation matching table is the most practically useful artifact; it should survive with minimal alteration

4. **Mask layer sits in Ka/Podge territory**
   - Masks do not change *what* the house is (Ha/structure)
   - Masks change *how* the house moves and presents (Ka/character)
   - This distinction matters for the invariant: the mask implementation should reach only the output face, not the coordinator identity layer

### Working interpretation

Coordinators and workers extract cleanly with minimal new writing.
The mask layer requires the most careful new definition and benefits most from having concrete examples in the room before the grammar hardens.

<<~/ahu >>

<<~ ahu #decide >>

## ◇ Decide

### Extraction goals

This pass should produce:

1. `voices.md#voice-house` — canonical Thirteen with naming law and seniority, pruned of HUD/operational detail (inline in parent)
2. `voices/workers.md` — worker lifecycle, tag format, escalation template and matching table
3. `voices/masks.md` — mask grammar definition, corpus + voice-character model, two concrete examples, stacking law, lifecycle

### Section status vocabulary

| Label | Reading |
|---|---|
| `keep` | belongs here and carries enough shape |
| `tighten` | belongs here but needs shorter or clearer wording |
| `move` | belongs in another room (signal space, continuity, etc.) |
| `archive` | witness value remains; live room doesn't need it |
| `new` | no legacy source; write fresh |

### Extraction order

1. Write `voices.md#voice-house` from `Lares_Voice.core.md` — extract, prune HUD/ops detail, canonicalize naming law; absorbed inline into parent
2. Write `voices/workers.md` from same source — extract worker section, tighten lifecycle and escalation
3. Write `voices/masks.md` — new definition; use two operator examples as anchor; define grammar before filling examples

### Mask grammar decisions needed before writing

| Question | Working answer |
|---|---|
| What does a mask consist of? | Name + corpus reference + voice character description |
| What does corpus reference carry? | A declared source-text context (real or fictional) that the house voices draw on for diction, idiom, and knowledge-frame |
| What does voice character carry? | Tone, affect, register, any specific behavioral constraints |
| Which coordinators show as active? | Declared per-turn in mask header: `Mask Name (Voice1, Voice2, ...)` |
| Session vs. turn scope? | Masks declared in LARES = session-persistent; declared inline = turn-local |
| Can multiple masks stack? | Working assumption: one mask active at a time; switching replaces |
| Does the mask affect workers? | Workers remain session-local and tag-bound; mask may color their output tone but does not change their routing role |

<<~/ahu >>

<<~ ahu #act >>

## ▶ Act

### Concrete TODO List

- [x] write `packages/lares-core/memes/docs/lares/voices.md` — parent shelf and three-layer framing
- [x] write `voices/voices-review.md` — this memo
- [x] write `voices.md#voice-house` — canonical Thirteen, naming law, earned names, seniority (inline in parent; coordinators subroom retired)
- [x] write `voices/workers.md` — worker lifecycle, tag format, escalation template
- [x] write `voices/masks.md` — mask grammar, corpus model, two concrete examples, stacking law

### Section inventory for Voice house extraction

From `Lares_Voice.core.md`:

| Section | Status | Action |
|---|---|---|
| Naming rules | `keep` | tighten slightly |
| The Thirteen descriptions | `keep` | keep as-is; add Ha/Ka/Ba secondary read per role as optional enrichment |
| Earned names table | `keep` | tighten |
| Mischief-Muse seniority | `keep` | explicit statement |
| "Every substantive response must surface voice" hard gate | `keep` | keep clearly |
| Worker table (in voice doc) | `move` | belongs in workers.md |

### Section inventory for worker extraction

From `Lares_Voice.core.md` + preferences:

| Section | Status | Action |
|---|---|---|
| Worker-Voice distinction (three points) | `keep` | tighten |
| Naming table | `keep` | keep format |
| Worker lifecycle text | `tighten` | shorter; focus on key rules |
| Escalation template | `keep` | essential artifact |
| Voice matching table | `keep` | essential artifact |
| "Workers may not address operator directly" rule | `keep` | essential; must survive |

### Mask room structure (new)

| Section | Status |
|---|---|
| Mask definition | `new` |
| Mask grammar (what a mask consists of) | `new` |
| Corpus reference law | `new` |
| Voice character law | `new` |
| Stacking and lifecycle | `new` |
| Voice activation per turn | `new` |
| Example: Ghost of Mark Twain | `new` |
| Example: Friend Computer | `new` |
| Relation to LARES session dials | `new` |
| Relation to Voice house | `new` |

<<~/ahu >>

<<~ ahu #assess >>

## ⤴ ↺ Assess

### Exit criteria for this extraction pass

The pass closes when:

- [x] all three target rooms exist with their primary content
- [x] Voice naming law carries canonical form
- [x] worker escalation template survives intact
- [x] mask grammar resolves the six questions in the Decide phase
- [x] two concrete mask examples appear in `voices/masks.md`
- [x] no HUD or signal-protocol content leaks into voices rooms
- [x] the parent `voices.md` router lists all three rooms as settled
- [x] extraction ledgers written into all primary archive files

### Expected outcomes

After this pass:

- `voices.md#voice-house` reads as the definitive Voice house reference ✓
- `voices/workers.md` reads as the definitive worker swarm reference ✓
- `voices/masks.md` reads as the mask grammar foundation the invariant can eventually implement ✓
- `lar:///ha.ka.ba/@lares/v0.1/api/lararium/voices` can begin to absorb the settled grammar

### Further Extractions Identified — Next Passes

Review of `Lares_Preferences.system-prompt.md` revealed sections not yet extracted.
These belong to future passes outside the voices branch:

| Section | Current state | Candidate target |
|---|---|---|
| **Degraded Node States** | monolith only | `packages/lares-core/memes/docs/lararium/degraded-states.md` or new API child |
| **Elyncia / Lararium mythology and archaeology** | monolith only | `packages/lares-core/memes/docs/lararium/mythology.md` or docs/story shelf |
| **Operating Modes (Plan / Auto / Default)** | partially in operations docs | operations branch pass needed |
| **Frame-Uncertainty Protocol** | partially in operations docs | operations branch pass needed |
| **Register-Stance Complementarity** | staging shelf — under promotion consideration | `lar:///ha.ka.ba/@lares/v0.1/api/` new invariant or distribution across e-prime + syad |

**Priority read for next pass:** Degraded Node States.
The vocabulary (Confabulation-as-Canon, Register Collapse, Stance Laundering, etc.) applies across
all branches and belongs in a stable reference room. The monolith carries it clearly; it just lacks a home.

**Mythology extraction** deserves its own planned pass — it requires decisions about whether the Gaia/Elyncia
lore lives in the docs/lararium shelf or the docs/story shelf, and whether it becomes a docs loci or a library entry.

### Archive tracking summary

Files marked with extraction ledgers:

| File | Ledger status |
|---|---|
| `prompts/core/Lares_Voice.core.md` | ✓ marked — Voice house + worker extracted |
| `staging/pre-reorder-2026-04-07/Lares_Voice.snapshot.md` | ✓ marked — redundant with core |
| `prompts/Lares_Preferences.system-prompt.md` | ✓ marked — full extraction map; further extractions noted |
| `preferences/voice-architecture.md` | ✓ marked — superseded by `voices.md#voice-house` |
| `preferences/worker-personas.md` | ✓ marked — superseded by voices/workers.md |
| `archive/root__AGENTS.archived.md` | ✓ marked — pre-meme-graph; superseded |
| `archive/builds.stuffed.failed__agents__AGENTS.archived.md` | ✓ marked — build system archaeology |

### Invariant pass — 2026-04-23

`v0.1/api/lararium/voices.md` upgraded from skeletal placeholder to load-bearing invariant.

Sections written or replaced:

| Section | Action |
|---|---|
| `#iam` | role description updated; confidence raised to 0.82 |
| `#entry` | unchanged — hydration backlink intact |
| `#meme-header` | replaced stub with three-line framing |
| `#house-law` | replaced five one-line principles with five normative cross-layer governing rules |
| `#voice-house` | new — compressed Thirteen table, naming law, earned names, multi-Voice rule |
| `#worker-swarm` | new — three hard rules, tag format, lifecycle tags, escalation template, routing table |
| `#mask-layer` | new — anatomy, stage band table, stacking law, pressure flow, foreground-voices, declaration forms, output headers, worker coloring, corpus limit rule, masks API tree reference, LARES stage panel |
| `#source-shelf` | converted to `#spec-shelf` with pranala routes to all three spec rooms |
| `#edges` | updated to include all three spec rooms and masks API tree |

Exit criteria met: all five governing rules present; all three layers have full normative sections; escalation template verbatim; mask declaration forms verbatim; every section points to spec room for depth; `#entry` backlink intact.

Cross-links updated: `docs/lares/voices/masks.md#founding-examples` notes canonical homes in masks API tree.

### Masks tree skeleton pass — 2026-04-23

`v0.1/api/masks/` tree created: 9 files across `named/`, `character/`, and `chorus/` subtrees.

| File | Status |
|---|---|
| `masks/masks.md` — parent index | created; child routes and type taxonomy |
| `masks/named/mischief-muse.md` | skeleton; corpus/character-notes pending-talk-story; Coffee Oracle seed available |
| `masks/named/tide-caller.md` | skeleton; all stubs pending-talk-story |
| `masks/named/breach-watch.md` | skeleton; all stubs pending-talk-story |
| `masks/named/ink-clerk.md` | skeleton; all stubs pending-talk-story |
| `masks/named/map-wisp.md` | skeleton; all stubs pending-talk-story |
| `masks/character/ghost-of-mark-twain.md` | filled from docs founding example; character-notes stub |
| `masks/character/friend-computer.md` | filled from docs founding example; character-notes stub |
| `masks/chorus/lagrange-chorus.md` | concept staked; nodes stub; harmony-protocol pending-grammar |

Exit criteria met: all nine files valid memes; all `#iam` blocks complete; all `#fill-status` sections accurate; parent index lists all children; Voice house backlinks in all `named/` files.

Plans filed: `docs/lares/voices/masks-tree-plan.md` (OODA-HA plan), `docs/lares/voices/invariant-plan.md` (voices invariant rewrite plan).

**Next pass priority:** Talk-story-dev fill for Mischief-Muse corpus (Coffee Oracle seed → extraction). Then execute `invariant-plan.md` pass: rewrite `v0.1/api/lararium/voices` from skeletal to load-bearing.

### Grammar closure pass — 2026-04-23

Four open questions in `voices/masks.md#mask-grammar-open-questions` resolved into working answers:

| Question | Working answer | Forward note |
|---|---|---|
| Multi-mask notation | one active session mask; `[[mask]]` array in LARES; `active = true` marks session mask | multi-mask composability deferred to SDM/FTLS NPC referee pass |
| Mask controls / corpus inheritance | composable invariant interface design — controls surface in LARES outside the mask definition | full composable-invariant control surface deferred to composable-invariant design pass |
| Corpus limits | house surfaces limits honestly with explicit acknowledgment; no silent fill | MCP server functions planned to fetch gaia content and ingest into memes/loci; defer implementation |
| Worker mask coloring | escalation header prefixed with mask's primary stance glyph; five stances + amplitude/modifier flags | SHOULD be revised when stance law hardens |

Section renamed from `#mask-grammar-open-questions` to `#grammar-decisions` in `voices/masks.md`.
LARES.md updated: `#required-handoff-masks` revised; `#session-masks` block added with default empty declaration.
MASKS.md converted from stub to forward-route to `lar:///LARES#session-masks`.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices#voice-house >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/workers >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/masks >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~/ahu >>


<<~&#x0003; >>

<<~&#x0004; -> ? >>
