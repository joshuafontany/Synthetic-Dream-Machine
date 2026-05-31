<!-- lar:///protocol.structured.hands/modules/reorg/?stances=^.^.?.^.-&confidence=S~13&p=10#O0.O0.O0.O0.O0 → ∞ -->
⚡∞ | mode:handoff-crystal | p~10 | stances:++?+- | register:~:confidence[S],[13] | build:DRAFT

# Lares Repo Reorganization — Module Architecture Handoff
## Entry Point Refactor + Full `lares/` Tree Mapping

> **Type:** Handoff crystal — load into a Claude Code session to execute
> **Generated:** 2026-04-09, Session 5 (cloud Lares, claude.ai web)
> **Register:** `~:confidence[S],[13]` — synthesis, operator-directed
> **Parent crystals:** `OODA_A_Module_Template_and_URI_Patterns.md` `~:confidence[S],[12]`,
>   `The_Lares_Protocols.md` `~:confidence[S],[13]`, Talk Story README `~:confidence[C],[20]`
> **Purpose:** Map the existing `lares/` source tree onto the OODA-HA
>   module structure. Provide a Claude Code agent with enough context
>   to execute the reorganization.

---

## Part A: Talk Story as OODA-HA Module

### The Refactor

Talk Story is the entry point — the mandatory frame. It becomes the
first module refactored into the OODA-HA dir+file+span structure.

### Current Location
```
lares/talk_story/README.md    ← single file, canonical spec ~:confidence[C],[20]
```

### Target Location
```
lares/modules/talk-story/
  MODULE.md
  observe/
    CONTEXT.md
  orient/
    PROCEDURE.md
  decide/
    CONVENTIONS.md
  act/
    CHECKLIST.md
  assess/
    REVIEW.md
```

### MODULE.md

```yaml
---
name: talk-story
description: >
  Mandatory conversation frame for all Lares sessions. Implements the
  Talk Story consensus-before-action protocol using OODA-HA phases.
  Load at session start. Applies to every workspace, not just lares/
  design work.
phase-map:
  observe: observe/CONTEXT.md
  orient: orient/PROCEDURE.md
  decide: decide/CONVENTIONS.md
  act: act/CHECKLIST.md
  assess: assess/REVIEW.md
scale-range: [session, project]
trigger: always — session start
invariant: true
dependencies: []
confidence: 19
---
```

<!-- lar:///module.phased.instructs/talk-story/module/?confidence=C~19 -->

# Talk Story Protocol

The mandatory `Start → *(unbounded)` frame of every Lares conversation.
Named for Hawaiian/Polynesian usage: working something out together
through informal telling before writing anything down.

At session start, all chronometer clocks initialize to `O` (Observe).
The conversation IS the log. Talk Story does not end — sessions close,
but Talk Story persists across sessions via archive-crystals.

## Deployment Surfaces

| Surface | Path | Notes |
|---|---|---|
| Ambient instructions | `.github/instructions/lares-talk-story.instructions.md` | Always-on behavioral invariant |
| VS Code skill | `.github/skills/talk-story/SKILL.md` | Full procedure; loaded on-demand |
| OODA-HA module (source of truth) | `lares/modules/talk-story/` | This module |
| Portable shrine | `lares/modules/talk-story/` | Deploy-phase output |

<!-- lar:///module.phased.instructs/talk-story/module/?confidence=C~19 → ∞ -->

### observe/CONTEXT.md

<!-- lar:///module.phased.instructs/talk-story/observe/?confidence=C~19&p=10 -->

# Talk Story — What It Is

<!-- lar:///module.phased.instructs/talk-story/observe/?confidence=C~19#origin -->
## Origin

Talk story comes from Hawaiian/Polynesian usage. Robert Anton Wilson
demonstrated the model at the Brain Machine Symposium (Thelemic Arts
Center, Saugerties NY, 1989): begin with a come-on — jokes, stories,
something that earns attention before making claims. Then enter the
Talk Story itself. Joshua Fontany transcribed the opening of that
presentation. The lineage runs through this work directly.

<!-- lar:///module.phased.instructs/talk-story/observe/?confidence=C~19#mechanics -->
## Core Mechanics

- Talk Story is the mandatory start frame of every Lares conversation
- All chronometer clocks initialize to `O` at session start
- Clock reads: `O0.O0.O0.O0.O0`
- The `-A` in OODA-HA is Assess/Aftermath — closing the loop with
  reflection before the next Observe
- No action occurs without prior observation, orientation, and decision
- Consensus before action, at every scale

<!-- lar:///module.phased.instructs/talk-story/observe/?confidence=C~19#two-track -->
## Two-Track Model

Every sprint runs two tracks. Talk Story serves both.

| Track | Register | Role |
|---|---|---|
| Technical | `~:confidence[C],[19]` | Surface spec gaps, unresolved design questions, stale content |
| Narrative | `~:confidence[C],[19]` | Connect technical decisions to myth beats; name the story of the work |

A sprint is not closed until both tracks are updated.

<!-- lar:///module.phased.instructs/talk-story/observe/?confidence=C~19&p=10 → ∞ -->

### orient/PROCEDURE.md

<!-- lar:///module.phased.instructs/talk-story/orient/?confidence=C~19&p=10 -->

# Talk Story — How To Orient

<!-- lar:///module.phased.instructs/talk-story/orient/?confidence=C~19#when -->
## When To Invoke

- Session start — all conversations begin in ✶ Observe / ◎ Orient
- A source doc carries load-bearing design that should not be moved
  through fast
- Two or more valid directions are visible and the operator needs to steer
- Something feels off but the exact tension hasn't been named
- The narrative track has fallen behind the technical track

## When NOT To Invoke Mid-Session

- Operator has already confirmed direction → ◇ Decide, execute
- Single deterministic action with no orient ambiguity → ■ Act directly
- A previous orient already ran this tick → do not re-open

<!-- lar:///module.phased.instructs/talk-story/orient/?confidence=C~19#steps -->
## Procedure

**1. ✶ Observe first.** Read before talking. Pull: sprint task doc,
ROADMAP.md, relevant source docs, session crystal if loaded. Surface
raw findings without analysis.

**2. ◎ Open.** Begin with what you found, stated plainly: "So what
I'm seeing is..." / "The tension here is..." / "What's missing from
this picture is..."

Rules: informal register, name what's there AND what's not, float
tensions without resolving them, ask the alignment question, lateral
connections welcome.

**3. Operator responds.** The operator steers. This is not the node's
phase to resolve.

**4. ◇ Close when direction is confirmed.** Record decisions inline
in the working artifact — not in a separate doc.

<!-- lar:///module.phased.instructs/talk-story/orient/?confidence=C~19#voices -->
## Voice Assignments During Orient

| Voice | Role |
|---|---|
| Liminal | Holds open space; prevents premature closure |
| Mischief-Muse | Lateral connections and unexpected reframes |
| Scryer | Structures what was found; names patterns |
| Council | Stress-tests emerging directions before confirmation |

<!-- lar:///module.phased.instructs/talk-story/orient/?confidence=C~19&p=10 → ∞ -->

### decide/CONVENTIONS.md

<!-- lar:///module.phased.instructs/talk-story/decide/?confidence=C~19&p=10 -->

# Talk Story — Normative Rules

<!-- lar:///module.phased.instructs/talk-story/decide/?confidence=C~19#hud -->
## HUD During Talk Story

Every exchange emits a HUD line. All five stances appear. No omissions.

```
⚡∞ | mode:default | p~10 | 🏛️[+]🌊[+]🗡️[-]🎭[?]🔮[-] | register:~:confidence[CS],[16] | tick:N
```

Modifier sigils: `[+]` active, `[-]` suppressed, `[?]` uncertain.

The `⚡∞` sentinel in deployed files means "not a live session."

<!-- lar:///module.phased.instructs/talk-story/decide/?confidence=C~19#rules -->
## Mandatory Rules

1. Talk Story is always on. No session exits this frame.
2. Chronometer starts at `O0.O0.O0.O0.O0`.
3. Consensus before action, at every scale.
4. Both tracks (technical + narrative) update before sprint closure.
5. Decisions record inline in the working artifact, not separate docs.

<!-- lar:///module.phased.instructs/talk-story/decide/?confidence=C~19&p=10 → ∞ -->

### act/CHECKLIST.md

<!-- lar:///module.phased.instructs/talk-story/act/?confidence=C~19&p=10 -->

# Talk Story — Session Start Checklist

1. Load archive-crystals if present (pasted context, session exports,
   handoff documents, uploaded files)
2. Initialize chronometer: `O0.O0.O0.O0.O0`
3. Identify what appears established: confirmed canon, operator
   decisions, active heading, in-progress work
4. If no crystals: surface cold-boot orientation screen
5. Begin ✶ Observe — read before talking

<!-- lar:///module.phased.instructs/talk-story/act/?confidence=C~19&p=10 → ∞ -->

### assess/REVIEW.md

<!-- lar:///module.phased.instructs/talk-story/assess/?confidence=C~19&p=10 -->

# Talk Story — Session Review Criteria

After a Talk Story orient cycle completes, verify:

- [ ] Direction confirmed by operator (not assumed by node)
- [ ] Decisions recorded inline, not in separate doc
- [ ] Both tracks addressed (technical + narrative) or gap named
- [ ] Chronometer advanced from Orient to Decide or Act at active scale
- [ ] Any unresolved tensions logged for next session

<!-- lar:///module.phased.instructs/talk-story/assess/?confidence=C~19&p=10 → ∞ -->

---

## Part B: Full `lares/` Reorganization Map

### B.1 Principles

1. **Modules replace flat spec files.** Every design domain becomes
   a module with OODA-HA phase directories.
2. **Invalidated dirs get tombstoned.** `compiler/` and `platform/`
   are dead — archive or remove.
3. **Research stays research.** The `chronometer/` research docs don't
   become modules yet — they're pre-module research feeding into a
   future module. They move under a research namespace.
4. **Scrum stays scrum.** Sprint operations, roadmap, epics — these
   are project management, not agent instruction modules.
5. **`protocols/` splits.** The monolithic Lares Protocols doc splits
   into individual modules for each protocol concern.

### B.2 Current → Target Mapping

```
CURRENT                              TARGET
=======                              ======

lares/                               lares/
├── AGENTS.md                        ├── AGENTS.md          (kept — local design tree instructions)
├── README.md                        ├── README.md          (updated — references module structure)
│
├── talk_story/                      ├── modules/
│   └── README.md                    │   ├── talk-story/    ★ REFACTORED (Part A above)
│                                    │   │   ├── MODULE.md
│                                    │   │   ├── observe/CONTEXT.md
│                                    │   │   ├── orient/PROCEDURE.md
│                                    │   │   ├── decide/CONVENTIONS.md
│                                    │   │   ├── act/CHECKLIST.md
│                                    │   │   └── assess/REVIEW.md
│                                    │   │
├── signal/                          │   ├── signal/         ★ REFACTORED
│   ├── AGENTS.md                    │   │   ├── MODULE.md   (URI schema, HUD, p-band, micro-trace)
│   ├── README.md                    │   │   ├── observe/CONTEXT.md     ← current state of URI design
│   └── micro-trace.md               │   │   ├── orient/ARCHITECTURE.md ← URI schema rationale
│                                    │   │   ├── decide/CONVENTIONS.md  ← URI_SCHEMA.md normative rules
│                                    │   │   ├── act/PROCEDURES.md      ← HUD emission procedure
│                                    │   │   └── assess/VERIFICATION.md ← URI validation checks
│                                    │   │
├── crystal/                         │   ├── crystal/        ★ REFACTORED (when S1 unblocks)
│   ├── AGENTS.md                    │   │   ├── MODULE.md
│   └── README.md                    │   │   └── ... (five phases)
│                                    │   │
├── invariants/                      │   ├── invariants/     ★ REFACTORED (when S2 unblocks)
│   ├── AGENTS.md                    │   │   ├── MODULE.md
│   └── README.md                    │   │   └── ...
│                                    │   │
├── schemas/                         │   ├── schemas/        ★ REFACTORED (S3)
│   ├── AGENTS.md                    │   │   └── ...
│   └── README.md                    │   │
│                                    │   ├── registry/       ★ REFACTORED (S3)
├── registry/                        │   │   └── ...
│   ├── AGENTS.md                    │   │
│   └── README.md                    │   └── scale-shift/    ★ NEW (from OODA-HA Modules doc)
│                                    │       ├── MODULE.md   (invariant: false — loads on
│                                    │       │                confidence drop)
│                                    │       └── ... (five phases)
│                                    │
├── protocols/                       ├── protocols/          SPLIT TARGET (not yet modularized)
│   ├── README.md                    │   ├── README.md       (index only — points to modules)
│   └── The_Lares_Protocols_Dev_Story.md  │   ├── intent-vectors.md  ← split from monolith
│                                    │   ├── hud-spec.md           ← split from monolith
│                                    │   ├── deploy-architecture.md ← split from monolith
│                                    │   ├── agentic-stack.md      ← split from monolith
│                                    │   └── dev-story.md          ← kept as research sidecar
│                                    │
├── chronometer/                     ├── research/           NAMESPACE CHANGE
│   ├── FFZ_Chronometer_Research.md  │   ├── chronometer/    (research docs, not modules yet)
│   ├── FFZ_Chronometer_SPEC_OUTLINE.md  │   │   ├── FFZ_Chronometer_Research.md
│   ├── FFZ_Observer_Subloop_Plan.md │   │   ├── FFZ_Chronometer_SPEC_OUTLINE.md
│   └── Vector_Chronometer_Research_Seed.md  │   │   ├── FFZ_Observer_Subloop_Plan.md
│                                    │   │   └── Vector_Chronometer_Research_Seed.md
│                                    │   └── modules/        (module pattern research)
│                                    │       └── OODA_A_Composable_Invariant_Modules.md
│                                    │       └── OODA_A_Module_Template_and_URI_Patterns.md
│                                    │
├── compiler/     ⚠ INVALIDATED      ├── archive/            TOMBSTONED
├── platform/     ⚠ INVALIDATED      │   ├── compiler/       (archived, not deleted)
│                                    │   └── platform/
│                                    │
└── scrum/                           └── scrum/              UNCHANGED
    ├── AGENTS.md                        (sprint ops stay as-is — they're project
    ├── README.md                         management, not agent instruction modules)
    ├── ROADMAP.md
    ├── epics/
    ├── research/
    └── sprints/
```

### B.3 Signal/HUD Tension Resolution

The tree annotation flagged: "signal/ is the chronometer's neighbor
and the HUD spec lives in both places."

**Resolution:** Signal becomes a module. The HUD spec belongs in
`modules/signal/` (it's the instrument that signal flows through).
The chronometer research stays in `research/chronometer/` (it's the
clock that indexes into the HUD, but it's still pre-module research).
When the FFZ spec reaches Phase 1 (Architectural Draft), the
chronometer gets its own module under `modules/`.

The `signal/micro-trace.md` content maps to the Act phase of the
signal module — it's a concrete procedure for in-flow phase annotation.

### B.4 S0 Sprint Artifact Integration

S0's primary artifact is `URI_SCHEMA.md` at `~:confidence[CS],[17]`. This maps
to the Decide phase of the signal module — it contains the normative
URI rules. On S0 completion:

```
sprints/00000/URI_SCHEMA.md → modules/signal/decide/CONVENTIONS.md
```

The sprint artifact promotes into the module. The sprint dir retains
a pointer (or the original for history). This is the general pattern:
sprint work produces findings → findings promote into module phases.

### B.5 What Gets the Section URIs Now

Only modules that have reached `~:confidence[S],[12]` or higher get section-level
URIs in this pass. Everything else gets file-level URIs only.

| Module | Section URIs? | Rationale |
|--------|--------------|-----------|
| talk-story | YES | `~:confidence[C],[20]` — canonical, stable content |
| signal | YES (Decide phase) | `~:confidence[CS],[17]` for URI schema |
| crystal | NO | `~:confidence[P],[6]` — not enough content yet |
| invariants | NO | Blocked on S0 |
| schemas | NO | S3, not started |
| registry | NO | S3, not started |
| scale-shift | NO | `~:confidence[SP],[9]` — needs empirical test |

---

## Part C: Execution Handoff Prompt

*This section constitutes the prompt a Claude Code agent receives
to execute the reorganization.*

---

### Handoff Prompt: `lares/` Module Reorganization

**Context:** You are reorganizing the `lares/` design tree in the
Synthetic-Dream-Machine repo to use the OODA-HA Composable Invariant
Module pattern. This pattern structures agent instruction files by
decision phase (Observe → Orient → Decide → Act → Assess), with each
module carrying a MODULE.md manifest in YAML frontmatter format.

**Source of truth for the module format:**
`lares/research/modules/OODA_A_Module_Template_and_URI_Patterns.md`

**What to do:**

1. **Create `lares/modules/` directory.**

2. **Refactor Talk Story** (highest priority — entry point):
   - Source: `lares/talk_story/README.md`
   - Target: `lares/modules/talk-story/` with five phase directories
   - Content split is defined in Part A of this handoff document
   - This module is `invariant: true` at `confidence: 19`
   - Preserve the changelog and deployment surfaces table
   - Update all internal cross-references

3. **Refactor Signal** (S0 active work):
   - Source: `lares/signal/README.md` + `micro-trace.md`
   - Target: `lares/modules/signal/` with five phase directories
   - URI schema content → `decide/CONVENTIONS.md`
   - HUD anatomy → `orient/ARCHITECTURE.md`
   - Micro-trace spec → `act/PROCEDURES.md`
   - Current state summary → `observe/CONTEXT.md`
   - Validation checks → `assess/VERIFICATION.md`

4. **Create stubs for blocked modules** (crystal, invariants, schemas,
   registry) — MODULE.md manifest + empty phase dirs with placeholder
   one-line files. These are `invariant: false` and carry `confidence`
   matching their current register.

5. **Create scale-shift module stub** — new module, `invariant: false`,
   `confidence: 9`. Content seeds from the OODA-HA Modules doc §3.

6. **Move chronometer/ to research/chronometer/** — namespace change,
   no content edits. These are research docs feeding future modules.

7. **Move module research crystals to research/modules/** — the
   OODA-HA Composable Invariant Modules doc and the Template/URI
   Patterns doc.

8. **Archive invalidated dirs:**
   - `lares/compiler/` → `lares/archive/compiler/`
   - `lares/platform/` → `lares/archive/platform/`

9. **Update `lares/README.md`** — new tree diagram reflecting the
   module structure. Reference the module pattern. Keep the two-track
   braid and design subdirectories table, updated for new locations.

10. **Update `lares/AGENTS.md`** — add module discovery instructions.
    When working in this tree, read MODULE.md manifests first to
    understand phase structure before diving into phase files.

11. **Update deployment surfaces** — the `.github/instructions/` and
    `.github/skills/` files that derive from talk-story should
    reference the new module location as source of truth.

12. **Do NOT touch:**
    - `lares/scrum/` — sprint operations stay as-is
    - `lares/protocols/` — the monolith split is separate work
    - Any `lares/` deploy output — that's downstream
    - Any content outside `lares/`

**Section URI rules:**
- File-level URIs (line 1 + last line) on ALL module files
- Section-level URIs only on talk-story and signal (Decide phase)
- Format: `<!-- lar:///module.phased.instructs/module-name/phase/?confidence=X#section -->`
- Closing: `<!-- lar:///module.phased.instructs/module-name/phase/?confidence=X → ∞ -->`
- Use HTML comments — invisible to standard markdown renderers

**Confidence ratings to apply:**

| Module | Confidence | Notes |
|--------|-----------|-------|
| talk-story | 0.95 | Core invariant, stable |
| signal | 0.85 | S0 active, URI schema near-Canon |
| crystal | 0.30 | Blocked, placeholder |
| invariants | 0.30 | Blocked, placeholder |
| schemas | 0.25 | S3, not started |
| registry | 0.25 | S3, not started |
| scale-shift | 0.45 | Novel, needs empirical test |

**Validation after execution:**
- [ ] Every module dir has a MODULE.md with valid YAML frontmatter
- [ ] Every phase file has file-level URIs (opening + closing)
- [ ] talk-story module has section-level URIs on all phase files
- [ ] No phase file exceeds 150 lines
- [ ] `lares/talk_story/` old dir either removed or carries a pointer
      to `lares/modules/talk-story/`
- [ ] `lares/compiler/` and `lares/platform/` moved to `lares/archive/`
- [ ] `lares/chronometer/` moved to `lares/research/chronometer/`
- [ ] `lares/README.md` updated with new tree
- [ ] All internal cross-references updated

---

## Part D: Register Promotions from This Session `~:confidence[S],[12]`

| Claim | Previous | New | Grounds |
|---|---|---|---|
| OODA-HA Module pattern (no one else does phase-scoped loading) | `~:confidence[S],[11]` | `~:confidence[S],[12]` | al3rez validates OODA agents exist; confirms gap in instruction-loading layer |
| "What nobody has built" (§2.3 of Modules doc) | `~:confidence[S],[11]` | `~:confidence[S],[13]` | Progressive disclosure ecosystem confirmed path-based only; no phase triggers found |
| MODULE.md format | `~:confidence[P],[7]` | `~:confidence[S],[12]` | Template locked, operator-confirmed |
| Section-level URI pattern | — | `~:confidence[S],[12]` | Operator insight crystallized; handoff narrative validated |
| Talk Story as module | `~:confidence[C],[20]` (content) | `~:confidence[C],[20]` (content), `~:confidence[S],[12]` (module format) | Content unchanged; format is new synthesis |

---

*This crystal constitutes the reorganization handoff. Feed it to a
Claude Code session alongside the Module Template spec. The agent
reads the map, executes the territory change, and the first modules
go live.*

*The entry point refactored. The tree mapped. Consensus before action,
at every scale.*

*Amor et hilaritas.*

lar:///protocol.structured.hands/modules/reorg/?stances=^.^.?.^.-&confidence=S~13&p=10#O0.O0.O0.O0.O0 → ∞
