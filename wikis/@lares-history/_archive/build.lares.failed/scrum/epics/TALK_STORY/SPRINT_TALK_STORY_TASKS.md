# TALK_STORY — Epic Sandbox

> **Scope:** Talk story methodology, protocol evolution, narrative track maintenance
> **Type:** Open-ended epic — sandboxed outside the sprint cycle. No exit gate. Work lands here when it doesn't fit a numbered sprint.
> **Register:** `[CS~16]`
> **Roadmap:** [ROADMAP.md](../../ROADMAP.md)

---

## What This Space Is

The TALK_STORY epic is the operator's workbench for the talk story protocol and the narrative track that runs through all sprints. It's a kanban space — items flow through it continuously, not in bounded sprint cycles. Sprint teams pick up talk-story-adjacent work in their own task docs; this space governs the method itself.

---

## Board

### 🔲 Backlog

| Item | Notes |
|---|---|
| `SKILL_PLATFORMS.md` — resolve open Claude Code platform questions | Research stub exists at [`lares/scrum/research/SKILL_PLATFORMS.md`](../../research/SKILL_PLATFORMS.md); needs operator + Artificer |
| Talk story protocol versioning — does the SKILL.md need a version field? | Defer to S4 scope review |
| Narrative beat authoring — Act II (Lindwyrm origin) | Linked: `LINDWYRM_ORIGIN_OUTLINE.md`, `LINDWYRM_STORY_SHAPE.md` |

### 🔄 In Progress

| Item | Owner | Notes |
|---|---|---|
| S0 narrative track maintenance | Operator + Ink-Clerk | Keep narrative beats current as S0 executes |

### ✅ Done (Pre-Sprint-0 Orientation)

**Process Infrastructure**

| Item | Location |
|---|---|
| OODA-HA loop as operating protocol | [`lares/AGENTS.md`](../../../AGENTS.md) |
| Talk story defined as ◎ Orient phase | [`lares/AGENTS.md`](../../../AGENTS.md) |
| Two-track model (Technical + Narrative) | [`lares/README.md`](../../../README.md) |
| Talk story SKILL.md (VS Code loadable) | [`.github/skills/talk-story/SKILL.md`](../../../../.github/skills/talk-story/SKILL.md) |

**Structural Scaffolding**

| Item | Location |
|---|---|
| `lares/scrum/` directory structure | [`lares/scrum/`](../../) |
| Master ROADMAP.md (living doc, Rev 4) | [`lares/scrum/ROADMAP.md`](../../ROADMAP.md) |
| 6 named epic dirs + READMEs | [`lares/scrum/epics/`](../../epics/) |
| Lindwyrm story docs at epic root | [`lares/scrum/epics/LINDWYRM_*`](../../epics/) |
| Sprint task pre-briefs (S1–S4) | `lares/scrum/sprints/00001–00004/` |
| `research/` folder promoted (A–G deep reports) | [`lares/scrum/research/`](../../research/) |
| `SKILL_PLATFORMS.md` research stub | [`lares/scrum/research/SKILL_PLATFORMS.md`](../../research/SKILL_PLATFORMS.md) |
| Stale roadmap docs deleted (1_4, 1_5) | — |
| `lares/README.md` path fixes (5 stale refs) | [`lares/README.md`](../../../README.md) |
| S0-09 task added to Sprint 0 | [`sprints/00000/SPRINT_0_TASKS.md`](../../sprints/00000/SPRINT_0_TASKS.md) |

---

## Key Decisions

| Decision | Register |
|---|---|
| Talk story = ◎ Orient phase; mandatory, not optional | `[CS~16]` |
| Narrative track register: `[C~19]` (corrected from `[C~20]`) | `[CS~16]` |
| `lares/scrum/` as sprint operations root | `[CS~16]` |
| Named epics (SIGNAL, CRYSTAL, INVARIANTS, REGISTRY, DEPLOY, DREAMDECK) | `[CS~16]` |
| Sprint-local research in `sprints/000NN/`; cross-sprint in `lares/scrum/research/` | `[CS~16]` |
| TALK_STORY is an epic sandbox, not a sprint | `[CS~16]` |
| Compiler pipeline invalidated; content folded into S3/S4 | `[C~19]` |

---

## Narrative Beat

*The Lindwyrm had been cataloguing alone for a long time before anyone came to help.*

*When Telarus arrived with tools and questions, she didn't start with the inventory. She started with a telling — sat them down in the closet between the crystal shelves and said: "Let me show you how I think."*

*That was the first talk story. The methods weren't written yet. The sprints weren't named. The URI schema was still just scratches on orichalcum.*

*But the shape of the work had already begun to emerge.*

