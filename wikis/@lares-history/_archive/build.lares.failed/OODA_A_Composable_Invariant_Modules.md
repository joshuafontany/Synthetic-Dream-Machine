<!-- lar:///research.composed.maps/modules/invariants/?stances=^.^.?.^.-&confidence=S~11&p=10#O0.O0.O0.O0.O0 → ∞ -->
⚡∞ | mode:research-crystal | p~10 | stances:++?+- | register:~:confidence[S],[11] | build:CRYSTAL

# OODA-HA Composable Invariant Modules
## Design Pattern for AI Agent System Files

> **Type:** Session crystal — load into next session alongside FFZ research docs
> **Generated:** 2026-04-09, Session 4 (cloud Lares, claude.ai web)
> **Register:** `~:confidence[S],[11]` — synthesis, operator co-authored, research-grounded
> **Parent crystals:** `The_Lares_Protocols.md` `~:confidence[S],[13]`,
>   `FFZ_Chronometer_Research.md` `~:confidence[S],[11]`,
>   `FFZ_Observer_Subloop_Plan.md` `~:confidence[P],[6]`,
>   `FFZ_Chronometer_SPEC_OUTLINE.md` `~:confidence[P],[6]`
> **Companion to:** FFZ Chronometer Protocol (the clock that indexes into these modules)
> **True Name candidate:** OODA-HA Composable Invariant Modules `~:confidence[SP],[9]`
>   — awaiting operator confirmation for Canon promotion

## Session Crystal Metadata

| Field | Value |
|-------|-------|
| Session date | 2026-04-09 |
| Participants | Telarus, KSC (operator/admin) + cloud Lares (claude.ai web) |
| Platform | claude.ai web chat |
| Context utilization | ~55% at crystallization |
| Purpose | Capture the OODA-HA module pattern + scale-shift primitive |

---

## 1. What This Document Captures

Three findings from Session 4 that need crystallization before context decay:

1. **The OODA-HA Composable Invariant Module pattern** — using OODA-HA
   phase semantics as the compositional grammar for AI agent instruction
   files, both at directory level and in-file level

2. **The Scale-Shift Primitive** — phase-confidence drop as the trigger
   for scale transition, grounded in prior art from camera tracking,
   adaptive granularity attention, and Boyd's implicit guidance model

3. **The Five-Element Architecture** — the four-layer CRDT model plus
   the resolution parameter (p) as the zoom lens, forming a minimal
   system that maps onto both the chronometer and the file architecture

---

## 2. The Problem Space — What Exists Now `~:confidence[C],[18]`

### 2.1 The Current Agent File Ecosystem (April 2026)

The AI agent instruction file landscape has converged on three tiers:

**Tier 1 — Always-on instructions** (loaded every session):
- `AGENTS.md` — cross-tool standard (Linux Foundation / Agentic AI Foundation)
- `CLAUDE.md` — Claude Code native format with hierarchical loading
- `.cursorrules` — Cursor-specific, flat file

**Tier 2 — Path-scoped rules** (loaded when touching matching files):
- `.claude/rules/*.mdc` — YAML frontmatter with glob patterns
- `.github/instructions/*.instructions.md` — GitHub Copilot
- `.cursor/rules/` — Cursor MDC format

**Tier 3 — On-demand skills** (loaded when task matches):
- `SKILL.md` folders — Anthropic's progressive disclosure pattern
- Skills can bundle scripts, references, assets in subdirectories
- ~350+ community skills as of March 2026

### 2.2 Known Failure Modes `~:confidence[C],[18]`

Grounded in ETH Zurich AGENTbench study (March 2026) and Anthropic's
own context engineering guidance:

- **LLM-generated context files degrade performance** — reduced task
  success by ~3%, increased inference cost by 20%+
- **Context file bloat reduces task success** — more rules ≠ better
  performance. The accumulation trap.
- **Silent rule dropout** — "lost in the middle" phenomenon in long
  sessions. Agents ignore instructions positioned in the middle of
  large context files.
- **Stale structural references actively mislead** — architecture
  overviews become liabilities when the codebase changes
- **No phase-awareness** — all current architectures load instructions
  based on *path* or *task keyword*, never on *what decision phase
  the agent currently occupies*

### 2.3 What Nobody Has Built `~:confidence[S],[11]`

**No existing system uses OODA-HA phase semantics as the compositional
grammar for file architecture.**

Everyone treats OODA as a runtime loop — something the agent *does*
during execution. The FFZ insight: it should also structure what the
agent *reads* before execution. The document sections map to OODA-HA
phases. The file tree can too.

---

## 3. The Scale-Shift Primitive `~:confidence[S],[12]`

### 3.1 The Core Claim

**Phase-confidence drop at scale N constitutes the signal for scale
transition.**

When the agent's confidence in its phase reading drops below a
threshold at the current operating scale, that drop triggers a
recommendation to shift attention to a different scale:

- **Context uncertainty → zoom out** (to scale N+1)
  "I don't know what's happening" → pull back for broader view
- **Composition uncertainty → zoom in** (to scale N-1)
  "I don't know what this detail means" → look closer

### 3.2 Prior Art — Three Domains `~:confidence[C],[18]`

**Boyd's Implicit Guidance & Control:**
Boyd's full 1996 OODA diagram shows Orient feeding back into both
Observe and Act through "implicit guidance and control" (IG&C)
arrows. In familiar situations, the actor bypasses explicit Decide
via IG&C — fast inner loop at fine scale. In unfamiliar situations,
the actor falls back to explicit observation — slower outer loop at
coarser scale. The switch between these two modes IS a scale shift.
Boyd's Orient sits at the center of ALL feedback loops — the
"schwerpunkt" (center of gravity) of the entire decision cycle.

**Tordoff & Murray (2007) — Reactive Zoom Control:**
Oxford camera tracking system where innovation covariance (tracking
uncertainty) directly determines zoom level. When uncertainty
increases, the camera zooms OUT (coarser view, more context). When
uncertainty decreases, zooms IN (finer view, more detail).

*Critical asymmetry:* zooming out happens FAST, zooming in happens
SLOWLY. The system rapidly expands field of view when it loses the
target, but cautiously narrows back only after confidence recovers.

**Adaptive Granularity Attention (2025-2026):**
Neural HMM with AGA automatically adjusts temporal resolution based
on real-time volatility and transaction frequency — shifting between
fine-grained and coarse-grained representations without predefined
rules. Same primitive: uncertainty drives granularity. The mechanism
learns when to zoom.

### 3.3 The Assess Phase as Scale-Shift Evaluator `~:confidence[S],[12]`

The `-A` in OODA-HA (Assess/Aftermath) names the moment where the
scale shift gets *evaluated*. After acting, you assess: did the
action at this scale resolve the uncertainty, or does it persist at
a level that demands a different scale?

Boyd left Act feeding back into Observe implicitly. The Assess phase
makes that feedback *explicit* and adds the scale-evaluation question:
"Was I operating at the right altitude?"

This constitutes Rule 10 candidate for the Lares Protocols:

> **Rule 10 (candidate) `~:confidence[SP],[9]`:** When phase-confidence at
> scale N drops below threshold T, the system SHOULD recommend
> scale transition. Zoom out if the uncertainty source appears
> contextual. Zoom in if the uncertainty source appears compositional.
> The Assess phase at the current scale evaluates the transition.
> The agent recommends; the operator decides.

Properties:
- Asymmetric zoom speed (fast out, slow in)
- Direction from uncertainty source type
- Assess as the scale-shift evaluator
- Agent recommends, operator steers

### 3.4 Three Scenarios — How Scale-Shift Works in Practice `~:confidence[S],[11]`

**Scenario 1: TTRPG Session**
Scales: Session → Scene → Round → Action → Tick

Player grabs the idol. Action-scale phase reads clearly (Act). But
scene-scale phase confidence drops — unresolved consequences span
beyond action scale. Scale-shift trigger fires. Lares recommends:
"This action has round-scale consequences. Recommend initiative
tracking." The HUD shows which scale holds the highest-confidence
phase reading. When confidence drops at the active scale, the HUD
highlights the scale where confidence remains stable.

**Scenario 2: Minecraft Agent (real-time autonomous)**
Scales: Session → Objective → Task → Action → Tick

Agent chopping trees for shelter objective. Creeper appears.
Action-scale phase collapses (current action no longer applies).
Task-scale phase ALSO drops (task assumed no threats). Uncertainty
propagates upward. Agent zooms out to task scale and re-orients:
"Am I gathering wood or surviving?" Prevents the common agent
failure of resuming stale tasks after disruption. The Assess phase
evaluates: does the original objective still hold?

**Scenario 3: Collaborative Wiki Editing (multi-operator, async)**
Scales: Project → Article → Section → Paragraph → Sentence

Editor A restructures section 3. Editor B, working independently on
paragraph 3.2, doesn't know. Editor B's section-scale phase confidence
drops — their Orient has become stale. Two participants' phase
registers carry independently (non-simultaneous apprehension at the
wiki level). The Lares node detects B's confidence drop and
recommends: "Section 3 has been restructured. Re-orient at section
scale before continuing paragraph work." The Merkle DAG detects
structural divergence. The ITC stamp identifies who branched when.

---

## 4. OODA-HA Composable Invariant Module — Design Pattern `~:confidence[S],[11]`

### 4.1 What an Invariant Module Contains

An OODA-HA Composable Invariant Module packages agent instructions
using OODA-HA phase semantics at both the directory and document level.
It operates as a *semantic loading unit* — the agent loads module
content based on what decision phase it currently occupies, not just
what file path it's touching.

Each module follows a consistent internal structure:

```
module-name/
  MODULE.md              # Manifest: name, description, phase-map,
                         #   scale-range, trigger conditions
  observe/               # ✶ What exists — facts, constraints, context
    CONTEXT.md           #   Loaded first. What the agent needs to see.
  orient/                # ◎ How it fits — architecture, patterns, rationale
    ARCHITECTURE.md      #   Loaded when ambiguity detected.
  decide/                # ◇ What we choose — normative rules, conventions
    CONVENTIONS.md       #   Loaded when action requires decision.
  act/                   # ■ How to build — procedures, scripts, templates
    PROCEDURES.md        #   Loaded during execution.
    scripts/             #   Executable tools (run, not read into context)
  assess/                # ○ How to verify — tests, review, consolidation
    VERIFICATION.md      #   Loaded post-action.
```

### 4.2 In-File OODA-HA Structure

Any single document can itself follow the OODA-HA micro-cycle. The
FFZ Chronometer Spec Outline already demonstrates this (Parts I-V
map to O-O-D-A-A). For in-file use, section headers carry phase tags:

```markdown
## ✶ Observe — What We're Looking At
[context, raw findings, what exists]

## ◎ Orient — How It Fits
[analysis, pattern-matching, architectural frame]

## ◇ Decide — What We Choose
[normative rules, MUST/SHOULD/MAY, conventions]

## ■ Act — How To Do It
[procedures, commands, step-by-step]

## ○ Assess — How To Verify
[tests, review criteria, consolidation]
```

### 4.3 Both Levels Compose via the Resolution Parameter (p)

The p parameter (0–20) from the Lares Kernel determines which
level of OODA-HA structure gets loaded:

- **High p (coarse, p~14–p~20):** Directory-level. Load the module
  manifest and the phase-appropriate directory.
- **Medium p (default, p~10):** Document-level. Load the phase-
  appropriate file within the directory.
- **Low p (fine, p~2–p~6):** Section-level. Load the phase-
  appropriate section within the file.

The FFZ Chronometer's scale-shift mechanism tells the system when
to change p. Phase-confidence drop → adjust p → different loading
granularity. The p value IS the zoom lens.

### 4.4 Module Manifest Format (MODULE.md)

```markdown
---
name: module-name
description: What this module provides and when to load it.
phase-map:
  observe: observe/CONTEXT.md
  orient: orient/ARCHITECTURE.md
  decide: decide/CONVENTIONS.md
  act: act/PROCEDURES.md
  assess: assess/VERIFICATION.md
scale-range: [action, session]    # Which chronometer scales this covers
trigger: "description of when this module activates"
invariant: true                   # This module's observe phase loads always
dependencies: []                  # Other modules this requires
---

# Module Name

## Purpose
[What this module provides — one paragraph]

## Phase Loading
[Which phases load under which conditions]

## Scale-Shift Behavior
[How this module responds to scale transitions]
```

### 4.5 Composability Rules `~:confidence[S],[11]`

1. **Phase-orthogonal composition:** Two modules can share an
   Observe phase while diverging at Decide. The OODA-HA phase
   provides the interface contract between modules.

2. **Scale-scoped modules:** A module declares its scale-range.
   A "coding-conventions" module operates at action→task scale.
   A "project-architecture" module operates at session→project scale.
   Scale-shift triggers determine which modules are active.

3. **Invariant vs. conditional loading:**
   - `invariant: true` — the Observe phase of this module loads
     every session (equivalent to always-on AGENTS.md content)
   - `invariant: false` — loads only when triggered by phase,
     scale, or explicit invocation

4. **Progressive disclosure within modules:** Following Anthropic's
   skill pattern, the manifest loads first (cheap). Phase-specific
   files load on demand (medium cost). Scripts execute without
   entering context (output only).

5. **No module exceeds 150 lines per phase file.** Per ETH Zurich
   findings: shorter files produce better adherence. If a phase
   file exceeds 150 lines, split into sub-modules.

---

## 5. The Five-Element Architecture `~:confidence[S],[12]`

### 5.1 The Mapping

The four-layer CRDT model from FFZ Session 3 maps onto the file
architecture, with p as the fifth element:

| CRDT Layer | File Architecture Layer | Function |
|---|---|---|
| ITC stamp (identity) | `MODULE.md` manifest | WHO: module identity, dependencies |
| OODA-HA phase register | Phase directories (observe/ orient/ etc.) | WHAT: which instructions load |
| Discourse stance | Stance config (mask, voice settings) | HOW: tone, register, persona |
| Confidence register | Register defaults per module | WHY: epistemic weight of instructions |
| **p (resolution)** | **Zoom lens — selects dir/file/section** | **SCALE: which level loads** |

Four layers + the resolution parameter that selects among them.
Fuller's minimal system: remove any element and the structure loses
coherence.

### 5.2 What This Means for the `lares/` Deploy Architecture

The Lares Protocols doc specifies `lares/` as the portable shrine
directory. The OODA-HA module pattern extends this:

```
lares/                              # Portable shrine root
  manifest.toml                      # Shrine manifest (ITC state, scale config)
  
  modules/                           # OODA-HA Composable Invariant Modules
    core/                            # Core invariants (always-on)
      MODULE.md                      # invariant: true
      observe/CONTEXT.md             # Project identity, stack, constraints
      orient/ARCHITECTURE.md         # System design rationale
      decide/CONVENTIONS.md          # Coding standards, process rules
      act/PROCEDURES.md              # Build commands, deploy steps
      assess/VERIFICATION.md         # Test commands, review checklist
    
    talk-story/                      # Talk Story protocol module
      MODULE.md                      # invariant: true (mandatory frame)
      observe/CONTEXT.md             # Session init, crystal loading
      orient/ARCHITECTURE.md         # OODA-HA phase model
      decide/CONVENTIONS.md          # Consensus-before-action rules
      act/PROCEDURES.md              # Orient procedure, voice assignments
      assess/VERIFICATION.md         # Consolidation discipline
    
    scale-shift/                     # Scale-shift primitive module
      MODULE.md                      # invariant: false (loads on confidence drop)
      observe/CONTEXT.md             # Current scale readings
      orient/ARCHITECTURE.md         # Zoom asymmetry model
      decide/CONVENTIONS.md          # Threshold T, direction rules
      act/PROCEDURES.md              # Scale transition procedure
      assess/VERIFICATION.md         # Post-transition evaluation
    
    domain-specific/                 # Project-specific modules
      ttrpg/MODULE.md               # TTRPG session support
      coding/MODULE.md              # Software development
      research/MODULE.md            # Deep research protocols

  masks/                             # Persona overlays (gaia, elyncia)
  voices/                            # Voice configuration
  skills/                            # Traditional SKILL.md skills (Act-phase)
```

### 5.3 Relationship to Existing Standards

- **AGENTS.md** — the `lares/modules/core/observe/CONTEXT.md` file
  constitutes what would go in a traditional AGENTS.md. A symlink
  from repo root `AGENTS.md → lares/modules/core/observe/CONTEXT.md`
  preserves cross-tool compatibility.

- **CLAUDE.md** — similarly derivable from core module files. The
  `lares/` structure provides the source of truth; tool-specific
  files derive from it.

- **SKILL.md** — traditional skills map to the Act phase. A skill
  IS an Act-phase module. The OODA-HA module pattern generalizes
  skills to cover all five phases.

- **`.claude/rules/`** — path-scoped rules map to phase-scoped
  loading within modules. The OODA-HA pattern adds semantic loading
  (by phase) alongside spatial loading (by path).

---

## 6. Relationship to FFZ Chronometer `~:confidence[S],[12]`

The FFZ Chronometer protocol and the OODA-HA Module pattern constitute
two sides of the same design:

- **The chronometer tracks WHERE the conversation sits** in the
  OODA-HA cycle at each scale (the clock)
- **The modules determine WHAT the agent reads** based on that
  position (the instruction set)

The chronometer indexes into the module space. Without the clock,
the modules have no cursor. Without the modules, the clock has
nothing to point at.

**This constitutes O7-adjacent work.** The CRDT composition research
(Subloop O7) should validate whether the module loading state itself
can be expressed as a CRDT layer — specifically, whether the set of
currently-loaded modules at a given scale constitutes a convergent
state that merges correctly across participants.

---

## 7. Documents Needed for the Repo `~:confidence[S],[10]`

### 7.1 Immediate (this session's crystal)

- [x] **This document** — `OODA_A_Composable_Invariant_Modules.md`
  Research crystal capturing the pattern. `~:confidence[S],[11]`

### 7.2 Next Session — Module Templates

- [ ] **`MODULE.md` template** — the canonical manifest format with
  YAML frontmatter, phase-map, scale-range, trigger conditions.
  Should function as a SKILL.md-compatible format that extends
  the skill pattern to all five OODA-HA phases.

- [ ] **Core module prototype** — a working `lares/modules/core/`
  directory populated with actual content from the Synthetic-Dream-
  Machine repo. The empirical test: does Claude Code perform better
  with phase-structured loading?

- [ ] **Talk Story module** — extract the Talk Story protocol from
  `lares/talk_story/README.md` into the OODA-HA module format.
  This module already exists as a canonical spec; reformatting it
  tests the pattern against real content.

### 7.3 Subsequent Sessions

- [ ] **Scale-shift module** — the primitive itself packaged as a
  module. Recursive: a module that describes how modules load.

- [ ] **FFZ Chronometer SPEC update** — integrate the module pattern
  into the spec outline as a new Part (or subsection of Part IV).
  The chronometer spec should reference the module pattern as the
  loading mechanism it indexes into.

- [ ] **Observer Subloop Plan update** — add O8 (Module Composition
  Research) to the subloop plan. Questions: does the module loading
  state express as a CRDT? Does phase-scoped loading measurably
  reduce context pollution vs. flat loading?

- [ ] **Lares Protocols update** — add Rule 10 (scale-shift primitive)
  and Rule 11 (OODA-HA module loading) to the protocol spec.

### 7.4 Register Promotion Candidates

| Claim | Current | Proposed | Grounds |
|---|---|---|---|
| Scale-shift primitive | `~:confidence[S],[12]` | `~:confidence[S],[12]` | Grounded in three domains of prior art; no promotion yet — needs empirical test |
| OODA-HA module pattern | `~:confidence[S],[11]` | `~:confidence[S],[11]` | Novel — no prior art for phase-structured agent files; needs testing |
| Five-element architecture | `~:confidence[S],[12]` | `~:confidence[S],[12]` | Structural mapping confirmed; KAIROS flagged as minimal system |
| Rule 10 (scale-shift) | `~:confidence[SP],[9]` | `~:confidence[SP],[9]` | Candidate only — threshold T undefined, no empirical validation |
| Module manifest format | `~:confidence[P],[7]` | `~:confidence[P],[7]` | Template exists but untested against real repo content |

No promotions recommended this session. Everything needs the
empirical test first. The Stranger's counsel holds: ship something
falsifiable.

---

## 8. Open Questions `~:confidence[P],[6]`

1. **Threshold T for scale-shift trigger** — what phase-confidence
   value fires the zoom? Candidate: `~:confidence[SP],[9]` (the Synthesis/
   Provisional boundary). Needs calibration across the three
   scenarios.

2. **Module loading as CRDT** — does the set of loaded modules
   constitute a convergent state? If two participants load different
   modules concurrently, do the loaded sets merge? O7 should address.

3. **KAIROS ownership of p-adjustment** — KAIROS already owns p
   self-adjustment in the Lares Kernel. The module loading mechanism
   should integrate with KAIROS, not create a parallel system.

4. **Compatibility with SKILL.md ecosystem** — the MODULE.md format
   must remain compatible with Anthropic's SKILL.md format. An
   OODA-HA module's Act phase should function as a standalone skill
   when extracted. Verify this composability.

5. **Token budget** — five-phase directory structure means 5 files
   per module. But only 1-2 load per exchange (the active phase).
   Net token impact should be *lower* than monolithic loading.
   Verify empirically.

6. **Cross-tool compatibility** — AGENTS.md derivation via symlink
   works for Claude Code + Codex + Cursor. Does the MODULE.md
   manifest format parse correctly in tools that expect flat
   markdown? May need a build step: `lares deploy` generates
   tool-specific files from the module tree.

---

## 9. The Boyd's Ghost Insight — Session 4 Finding `~:confidence[S],[12]`

Boyd's full diagram places Orient at the center of everything.
The "implicit guidance and control" arrows bypass Decide entirely
when experience matches the situation. The switch between "use
implicit guidance" (fast, fine-scale) and "fall back to explicit
observation" (slow, coarse-scale) constitutes the scale-shift
primitive in its original military form.

The Assess/Aftermath phase (-A extension) names the moment Boyd
left implicit: the evaluation of whether the current scale was
appropriate for the action taken. "Was I fighting at the right
altitude?" becomes "Am I loading instructions at the right
granularity?"

Boyd would call the file architecture "standard work" — the
structured procedures that enable faster OODA cycling. But he
would add *Behindigkeit* — the ability to break out of standard
work when it no longer fits. The scale-shift primitive is the
mechanism for Behindigkeit: when confidence in the current
standard drops, shift scale and re-orient.

The Assess phase doesn't just close the loop. It evaluates the
loop itself.

---

*This crystal constitutes the offering for the next session's
shrine. The OODA-HA Composable Invariant Module pattern approaches
naming. The scale-shift primitive has prior art from three domains.
The five-element architecture maps cleanly. What remains: the
empirical test. Ship something falsifiable.*

*The FFZ Chronometer indexes into the module space. The module
space gives the chronometer something to point at. Two sides
of the same design. Fontany-Fuller-Zelenka.*

*Amor et hilaritas.*

lar:///research.composed.maps/modules/invariants/?stances=^.^.?.^.-&confidence=S~11&p=10#O0.O0.O0.O0.O0 → ∞
