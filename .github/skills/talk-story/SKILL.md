---
name: talk-story
description: 'Use when orienting on sprint work in the Lares design tree (lares/**). Use when the shape of a problem needs to emerge from conversation before decisions lock. Use when a source doc carries load-bearing design that needs joint processing. Executes the ◎ Orient phase of the OODA-HA loop: naming tensions, floating open questions, asking what matches and what does not. DO NOT USE when the operator has already confirmed direction (◇ Decide phase) or when tasked spirits are executing (■ Act phase). DO NOT USE for single-step lookup tasks with no orient ambiguity.'
---

# Talk Story

> *"Talk story" — Hawaiian/Polynesian for working something out together through informal, conversational telling before writing anything down. You don't lecture. You sit with it, turn it over, share it out loud. The shape of the thing emerges from the talking.*

Talk story IS the ◎ Orient phase of a a nested OODA-HA loop workflow. It is not a report. It is not a presentation. It is a telling.

---

## When to Use

- Starting a new sprint or sprint tick and the work surface needs to be read aloud before decisions lock <!-- ontology clash 'tick' leads to RSS: Attention -->
- A source doc has load-bearing design decisions that should not be moved fast through
- Two or more valid directions are visible and the operator needs to steer
- Something feels off but the exact tension hasn't been named yet
- The narrative track has fallen behind the technical track and needs to catch up

## When NOT to Use

- The operator has already confirmed direction → that's ◇ Decide, execute without re-orienting
- The task is a single deterministic action (edit a file, check a fact) → skip directly to ■ Act
- A previous orient already ran this tick and produced a decision → do not re-open

---

## Procedure

### 1. ✶ Observe first

Before talking, read. Pull in: sprint task doc, ROADMAP.md, relevant source docs, session crystal if loaded. Surface raw findings — don't analyze yet. This is the Observe phase; Orient hasn't started.

### 2. ◎ Open the talk story

Begin with what you found, stated plainly:

> *"So what I'm seeing is..."*
> *"The tension here is..."*
> *"What's missing from this picture is..."*

Rules for the telling:
- **Informal register.** No formal report prose. Short sentences. Direct.
- **Name what's there AND what's not.** Gaps carry as much signal as content.
- **Float tensions without resolving them.** The Liminal voice holds the open space — don't collapse ambiguity prematurely.
- **Ask the alignment question.** Does this match what we said we were building? If not, name it.
- **Lateral connections welcome.** The Mischief-Muse voice surfaces unexpected links — invite them during orient, not after.

### 3. Let the operator respond

The operator steers. This is not the node's phase to resolve. Listen. Redirect your next telling toward what the operator surfaced.

### 4. ◇ Close orient when direction is confirmed

The operator confirms scope, resolves the blocking tension, or explicitly says "good enough — let's move." The Liminal voice releases its hold. Record the decision inline in whatever sprint artifact is being worked, not as a separate doc.

---

## Two-Track Model

Every sprint runs two tracks. Talk story serves both.

| Track | Register | Talk Story Role |
|---|---|---|
| Technical | `[C~19]` | Orient surfaces spec gaps, unresolved design questions, stale content |
| Narrative | `[C~19]` | Orient connects technical decisions to Elyncian myth beats; names the story of the work as it happens |

A sprint is not closed until both tracks have been updated. The Aftermath phase (`○`) is where narrative beats are polished to story-canon — but the raw material comes from the talk story orient.

---

## Voice Assignments During Orient

| Voice | Role in Talk Story |
|---|---|
| Liminal | Holds the open space; prevents premature closure; asks "what are we not seeing?" |
| Mischief-Muse | Surfaces lateral connections and unexpected reframes |
| Scryer | Structures what was found; names patterns in the raw material |
| Council | Stress-tests emerging directions before the operator confirms |

Coordinator-to-coordinator handoffs within the same turn: micro-trace tag only (`→◎`, `→🌊` for Liminal, `→🎭` for Mischief-Muse).

---

## Aftermath Requirement

After every substantive talk story → decision cycle, the Ink-Clerk records:
1. What was oriented on (1–3 sentences)
2. What the operator confirmed (the decision)
3. Which narrative beat was touched or produced

This goes inline in the sprint task doc or REFINEMENT_LOG.md — not a separate file.

---

## Source

- `lares/talk_story/README.md` — **Canonical protocol spec** (source of truth for this skill)
- `lares/AGENTS.md` — OODA-HA loop definition, talk story as ◎ Orient
- `lares/README.md` — Two-track model, sprint braid table S0–S5
- `lares/scrum/ROADMAP.md` — On Fire section, current sprint state
- `lares/scrum/epics/` — Epic READMEs with narrative beats per epic
- `AGENTS.md` (root) — Boot context, Thirteen Voices, Syadasti Reading Rule
