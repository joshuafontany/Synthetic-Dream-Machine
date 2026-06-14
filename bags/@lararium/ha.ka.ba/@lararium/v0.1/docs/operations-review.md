<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/operations-review >>
```toml iam
cacheable = false
file-path = "bags/@lararium/v0.1/docs/operations-review.md"
mana      = 15
manao     = 16
manaoio   = 16
register  = "Synthesis"
retain    = false
role      = "OODA-HA extraction plan for lararium interaction protocols — frame-uncertainty, talk story, session init, and related surfaces"
tags      = ["lar:///ha.ka.ba/@lares/v0.1/api/pono/meme", "lar:///ha.ka.ba/@lares/v0.1/api/pono/loci"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/docs/operations-review"
```

<<~ &#x0002; >>

<<~ ahu #provenance >>

```toml
primary-source = "packages/lares-core/memes/docs/lararium/prompts/Lares_Preferences.system-prompt.md"
source-version = "v4.0.1 | 2026-04-07"
secondary-source = "packages/lares-core/memes/docs/lararium/signal/chronometer/FFZ_Chronometer_SPEC_OUTLINE.md"
secondary-source-2 = "packages/lares-core/memes/docs/lararium/archive/root__AGENTS.archived.md"
created = "2026-04-23"
scope-note = "Plan only — no content extracted in this memo. Extractions to follow as separate passes."
```

<<~/ahu >>

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #meme-header >>

# Lararium Operations — Extraction Review

Not invariant law.
This memo plans extraction of interaction protocols and operational surfaces
from the legacy monolith into settled docs rooms.

**Scope boundary:** Operating Modes (Plan / Auto / Default) belong to the
VSCode / OpenAI / Claude / GitHub Copilot platform layer and remain outside this pass.
Everything else in the legacy `Lares_Preferences.system-prompt.md` operational sections
undergoes inventory and classification here.

<<~/ahu >>

<<~ ahu #observe >>

## ✶ Observe

### Source inventory

Primary source: `Lares_Preferences.system-prompt.md` v4.0.1 — sections scanned:

| Section | Lines (approx) | Content |
|---|---|---|
| Session Init Protocol | 508–551 | archive crystals, two paths, cold-boot screen format |
| Frame-Uncertainty Protocol | 905–935 | three moves; Interpretation Declaration; Frame-Uncertainty Flag; Frame-Check Escalation |
| Proactive Surfacing (KAIROS) | 939–944 | KAIROS model; proactive budget; `⊕` transition mark |
| CLI Interaction & Roleplay | 947–996 | command pattern; Terminal Identity Reality Anchor; response conventions |
| Identity & Permissions — The Transference Model | 998–1071 | four tiers; UCAN-inspired capability flow; alias system; de-escalation |
| Capability Honesty | 1073–1078 | anchor to actual session capabilities; Gaia/Elyncia split |
| Tone & Formatting | 1081–1094 | "warm, myth-tech, concise, practical"; verbosity scaling |
| Default Behavior | 1097–1103 | act on best interpretation; ask after draft not before |
| Workspace Trust Gate | 1107–1115 | checkpoint before execution in unfamiliar workspace |
| Collaboration Model | 869–903 | operator steers, node crews; Captain and Crossroads metaphors; sanctioned dissent |

Secondary source: `FFZ_Chronometer_SPEC_OUTLINE.md` — Talk Story references at lines 28–70:

| Reference | Content |
|---|---|
| Talk Story Preamble | Talk Story as mandatory `Start → *(unbounded)` frame |
| RAW Talk Story Model | RAW Brain Machine Symposium 1989; come-on → Talk Story → assessment |
| Talk Story structural mapping | Part I = come-on; Parts II-III = Talk Story proper; Parts IV-V = assessment |

### What the legacy stack carries well

- **Frame-Uncertainty Protocol** — three clean moves with example phrasings; clearly settled as a primary interaction pattern
- **Talk Story** — named and grounded in RAW lineage (Brain Machine Symposium 1989, transcribed by Joshua Fontany); carries structural mapping to OODA-HA phases at document scale
- **Session Init Protocol** — two-path structure (crystals / cold boot) with exact cold-boot screen format; clearly settled
- **Collaboration Model** — Captain and Crossroads metaphors strong and load-bearing; partially extracted already to `preferences/collaboration-model.md`
- **Tone & Formatting** — concise and legible; "warm, myth-tech, concise, practical" reads as a settled voice description

### What requires boundary decisions before extraction

- **CLI Interaction & Roleplay** — Terminal Identity (Reality Anchor at infrastructure level) belongs to Lares; command syntax (Worker spawn, resume, `--debug`) overlaps with platform-wrapper concerns. The DreamNet CLI flavor stays; the platform-specific command tables may belong closer to platform docs.
- **Identity & Permissions / Transference Model** — the four-tier UCAN-inspired architecture lives here as Lares-specific; but the specific promotion mechanics and alias system may vary per platform deployment. The conceptual tier model stays; the mechanical implementation tables may belong in platform docs.
- **Workspace Trust Gate** — primarily a security/operations concern; maps onto degraded-node vocabulary already extracted. May integrate into degraded-states.md rather than a separate room.
- **Default Behavior** — very short; may integrate into session-init or a general interaction-defaults room rather than a standalone doc.
- **Capability Honesty** — very short; may integrate into degraded-states (as the positive counterpart to Confabulation-as-Canon) or into a general principles room.

### Protocols not in Preferences that need sourcing

- **Talk Story** appears in the FFZ chronometer spec and in the `Prompt_Architecture_Overview.md` reference to the Coffee Oracle test output (`Lares_Test_Prompt_and_Output_Coffee_Oracle.md` — restored to `packages/lares-core/memes/docs/lararium/prompts/` from git history on 2026-04-23). The Talk Story protocol may carry more definition there. That file constitutes additional source material for the talk-story extraction.

<<~/ahu >>

<<~ ahu #orient >>

## ⏿ Orient

### Classification pass

Classifying each candidate section into one of four destination types:

| Type | Description |
|---|---|
| **protocol** | A named interaction procedure with defined moves, triggers, and outputs |
| **voice** | Character, tone, and register guidance; adjacent to voices shelf |
| **authority** | Identity, permissions, trust tiers, and capability boundaries |
| **integrate** | Short enough to fold into an existing room rather than a standalone |

| Section | Type | Notes |
|---|---|---|
| Frame-Uncertainty Protocol | **protocol** | standalone room; well-defined three-move structure |
| Talk Story Protocol | **protocol** | standalone room; needs Coffee Oracle source read before extraction |
| Session Init Protocol | **protocol** | standalone room; cold-boot screen format should transfer verbatim |
| KAIROS / Proactive Surfacing | **protocol** | standalone room; concept already in preferences/proactive-surfacing.md but needs a proper protocol room |
| CLI Interaction & Roleplay | **protocol** (partial) | DreamNet CLI flavor and Terminal Identity → protocol room; command tables → platform docs |
| Collaboration Model | **voice** | extend preferences/collaboration-model.md; Captain/Crossroads metaphors not yet in that room |
| Tone & Formatting | **voice** | new docs room or extend preferences; "warm, myth-tech" reads as the voice register |
| Identity & Permissions / Transference Model | **authority** | new docs room; conceptual tier model; separate from platform mechanics |
| Workspace Trust Gate | **integrate** | fold into degraded-states.md as a boundary note |
| Default Behavior | **integrate** | fold into session-init or frame-uncertainty protocol |
| Capability Honesty | **integrate** | fold into degraded-states.md as the positive counterpart to Confabulation-as-Canon |

### Target shelf structure

A `protocols/` subdirectory under `docs/lararium/` carries the protocol rooms:

```
docs/lararium/
  protocols/
    protocols-review.md          — this memo's extraction tracker (or link here)
    frame-uncertainty.md         — Frame-Uncertainty Protocol: three moves
    talk-story.md                — Talk Story: RAW lineage, OODA-HA mapping, come-on structure
    session-init.md              — Session Init: crystals / cold-boot; cold-boot screen
    proactive-surfacing.md       — KAIROS: proactive budget, timing, ⊕ mark
    cli-dreamnet.md              — DreamNet CLI flavor, Terminal Identity Reality Anchor
  preferences/
    collaboration-model.md       — extend: add Captain and Crossroads metaphors
    voice-register.md            — new: "warm, myth-tech, concise, practical" + verbosity scaling
  authority/
    transference-model.md        — four-tier UCAN model, conceptual layer only
```

### Main tensions

1. **Talk Story sourcing** — the protocol appears in the FFZ chronometer spec as a described thing but may carry more authoritative definition in `Lares_Test_Prompt_and_Output_Coffee_Oracle.md`. That file needs a read pass before talk-story.md extraction begins.

2. **CLI / platform boundary** — Terminal Identity (hostname, username, workspace as Reality Anchor) constitutes Lares infrastructure. The specific command syntax (`--debug`, `--parse`, Worker spawn format) constitutes platform-wrapper configuration. The extraction should separate these cleanly.

3. **Collaboration Model extension** — the Captain and Crossroads metaphors in Preferences run much stronger than the existing `preferences/collaboration-model.md`. The existing room should absorb this material directly rather than a new file.

4. **E-prime pressure** — Frame-Uncertainty Protocol uses first-person phrasing in its example moves ("Reading this as [X]..."). Those phrasings constitute quoted procedure forms and SHOULD survive extraction as procedure text rather than undergoing E-prime substitution. The surrounding prose should follow E-prime discipline.

<<~/ahu >>

<<~ ahu #decide >>

## ◇ Decide

### Extraction goals

This pass produces:

1. `docs/lararium/protocols/frame-uncertainty.md`
2. `docs/lararium/protocols/talk-story.md` *(after Coffee Oracle source read)*
3. `docs/lararium/protocols/session-init.md`
4. `docs/lararium/protocols/proactive-surfacing.md`
5. `docs/lararium/protocols/cli-dreamnet.md` *(DreamNet CLI flavor only; not command tables)*
6. Extensions to `preferences/collaboration-model.md` *(Captain and Crossroads metaphors)*
7. `preferences/voice-register.md` *(tone and formatting)*
8. `authority/transference-model.md` *(conceptual tier model)*
9. Integrations into `degraded-states.md` *(Workspace Trust Gate, Capability Honesty, Default Behavior notes)*

### Section status vocabulary

| Label | Reading |
|---|---|
| `extract-ready` | well-sourced; extract in the next pass |
| `needs-source-read` | additional source file needs reading before extraction |
| `extend-existing` | fold into an existing room; no new file needed |
| `platform-boundary` | belongs to platform docs; leave in archive |
| `integrate` | short; fold into a nearby extraction |

### Status table

| Section | Status | Target |
|---|---|---|
| Frame-Uncertainty Protocol | `extract-ready` | `protocols/frame-uncertainty.md` |
| Session Init Protocol | `extract-ready` | `protocols/session-init.md` |
| KAIROS / Proactive Surfacing | `extract-ready` | `protocols/proactive-surfacing.md` |
| Talk Story Protocol | `needs-source-read` | `protocols/talk-story.md` after Coffee Oracle read |
| CLI — DreamNet flavor + Terminal Identity | `extract-ready` | `protocols/cli-dreamnet.md` |
| CLI — command syntax tables | `platform-boundary` | leave in archive; platform wrappers own these |
| Collaboration Model — Captain/Crossroads | `extend-existing` | `preferences/collaboration-model.md` |
| Tone & Formatting | `extract-ready` | `preferences/voice-register.md` |
| Identity & Permissions — conceptual tier model | `extract-ready` | `authority/transference-model.md` |
| Identity & Permissions — alias/promotion mechanics | `platform-boundary` | leave in archive; per-platform |
| Default Behavior | `integrate` | fold into `protocols/session-init.md` or `protocols/frame-uncertainty.md` |
| Capability Honesty | `integrate` | fold into `degraded-states.md` |
| Workspace Trust Gate | `integrate` | fold into `degraded-states.md` |

### Extraction order

1. Read `Lares_Test_Prompt_and_Output_Coffee_Oracle.md` → gather Talk Story definition
2. Extract `protocols/frame-uncertainty.md`
3. Extract `protocols/session-init.md` (includes Default Behavior as sub-section)
4. Extract `protocols/proactive-surfacing.md`
5. Extract `protocols/cli-dreamnet.md`
6. Extract `protocols/talk-story.md`
7. Extend `preferences/collaboration-model.md`
8. Write `preferences/voice-register.md`
9. Write `authority/transference-model.md`
10. Fold integrations into `degraded-states.md`
11. Write `protocols/protocols.md` parent router

<<~/ahu >>

<<~ ahu #act >>

## ▶ Act

### Concrete TODO List

- [x] read `packages/lares-core/memes/docs/lararium/prompts/Lares_Test_Prompt_and_Output_Coffee_Oracle.md` — gather Talk Story definition and any protocol detail not in FFZ spec
- [ ] create `packages/lares-core/memes/docs/lararium/protocols/` directory
- [ ] write `protocols/frame-uncertainty.md` — three moves verbatim from source; E-prime prose framing
- [ ] write `protocols/session-init.md` — two-path structure; cold-boot screen format; Default Behavior note
- [ ] write `protocols/proactive-surfacing.md` — KAIROS model; proactive budget; promote from preferences/proactive-surfacing.md
- [ ] write `protocols/cli-dreamnet.md` — Terminal Identity Reality Anchor; DreamNet flavor; exclude platform command tables
- [ ] write `protocols/talk-story.md` — RAW lineage (Brain Machine Symposium 1989); OODA-HA structural mapping; come-on pattern
- [ ] extend `preferences/collaboration-model.md` — add Captain and Crossroads metaphors
- [ ] write `preferences/voice-register.md` — "warm, myth-tech, concise, practical"; verbosity scaling law
- [ ] write `authority/transference-model.md` — four-tier UCAN-inspired model (conceptual layer only)
- [ ] fold Workspace Trust Gate into `degraded-states.md`
- [ ] fold Capability Honesty into `degraded-states.md`
- [ ] write `protocols/protocols.md` — parent router for all protocol rooms
- [ ] mark extraction ledgers in Preferences source file for each extracted section

### E-prime notes for extraction

Frame-Uncertainty Protocol quoted procedure text runs in first-person ("Reading this as [X]..."). These constitute procedure forms — template language the operator and node use in live exchange. They SHOULD survive verbatim as quoted procedure text. The surrounding explanatory prose MUST follow E-prime discipline.

Talk Story sourcing from RAW's Brain Machine Symposium 1989 constitutes a verbatim citation context. The RAW attribution text SHOULD survive verbatim with `<!-- eprime-ok -->` marks where identity-claim forms appear.

<<~/ahu >>

<<~ ahu #assess >>

## ↺ Assess

### Exit criteria for this review memo

This memo closes when:
- all candidate sections carry a status label
- the extraction order resolves without circular dependencies
- the platform-boundary calls are explicit and justified
- the Talk Story additional source is identified (Coffee Oracle file)

This memo achieves those criteria. ✓

### Exit criteria for the full extraction pass

The extraction pass closes when:
- all eight new docs rooms exist with primary content
- two existing rooms extend
- three integrations land in degraded-states.md
- `protocols/protocols.md` parent router lists all rooms as settled
- extraction ledgers appear in the Preferences source for all extracted sections

### Open questions after extraction

After the extraction pass closes, these questions remain for a future consolidation pass:

- Does `proactive-surfacing.md` move from `preferences/` to `protocols/` entirely, or point from both?
- Does the `authority/` shelf need a parent `authority.md` router, or stay flat?
- Does the conceptual Transference Model tier need an API invariant eventually, or stay docs-only?

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/docs/degraded-states >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/docs/preferences/collaboration-model >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/docs/preferences/proactive-surfacing >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/voices-review >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
