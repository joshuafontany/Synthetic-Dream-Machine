<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///module.phased.instructs/talk-story/module/?confidence=C~19&p=10 -->

---
name: talk-story
description: >
  Mandatory conversation frame for all Lares sessions. Implements the
  Talk Story consensus-before-action protocol using OODA-HA phases.
  Load at session start. Applies to every workspace.
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

# Talk Story Module

> **Register:** `~:confidence[C],[19]` — core invariant
> **Status:** Active. Mandatory from session-start onward.
> **Source of truth:** `lares/modules/talk-story/`
> **Named for:** Joshua Fontany (practice) — operator who created the Talk
>   Story Protocol and co-authored FTLS. The FFZ lineage runs through
>   this work. See `lares/chronometer/` for the naming lineage.

## What This Module Provides

Talk Story is the mandatory `✶ Observe` entry point for all Lares
sessions. It implements the `◎ Orient` phase of the OODA-HA loop as a
consensus-before-action protocol. The shape of the work emerges from
the talking.

## Phase File Index

| Phase | File | Purpose |
|---|---|---|
| Observe | `observe/CONTEXT.md` | What Talk Story is; mechanics; two-track model |
| Orient | `orient/PROCEDURE.md` | When to invoke; procedure; voice assignments |
| Decide | `decide/CONVENTIONS.md` | Normative rules; HUD format during orient |
| Act | `act/CHECKLIST.md` | Session start checklist |
| Assess | `assess/REVIEW.md` | Verification criteria post-orient cycle |

## Deployment Surfaces

| Surface | Path |
|---|---|
| Ambient instructions | `.github/instructions/lares-talk-story.instructions.md` |
| VS Code skill | `.github/skills/talk-story/SKILL.md` |
| Canonical spec | `lares/talk_story/README.md` |
| Portable shrine | `lares/modules/talk-story/` |

<!-- → ? -->
