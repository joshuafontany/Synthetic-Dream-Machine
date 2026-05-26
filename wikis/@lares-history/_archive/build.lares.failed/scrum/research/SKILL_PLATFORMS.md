# SKILL_PLATFORMS.md — Platform Research: Skill/Instruction Deployment Paths

**Register:** `[SP~9]` — Prospective. Most entries are observed-in-practice, not confirmed from primary docs.
**Owner:** Artificer (research) → Operator (confirm before S4 execution)
**Linked sprint:** S4 (Deployment Authoring)
**Created:** TALK_STORY pre-sprint / S0 cycle

---

## Purpose

Skill and instruction files need to reach the AI assistant layer at runtime. Different platforms load these files from different paths, with different format requirements and discovery mechanisms. This doc maps what we know, what we've confirmed, and what still needs answering before S4 can produce platform-specific deployment packages.

---

## What We Know (Confirmed)

| Platform | Path | Format | Discovery Mechanism | Source |
|---|---|---|---|---|
| VS Code (Copilot Chat) | `.github/skills/<name>/SKILL.md` | YAML frontmatter + Markdown | Copilot reads per-repo; `description` field is the trigger surface | Observed this session — `get-search-view-results` and `agent-customization` examples in VS Code extension assets |
| VS Code (Copilot Chat) | `.github/instructions/*.instructions.md` or `*.prompt.md` | YAML `applyTo` glob + Markdown | `applyTo` pattern gates when instructions load; `description` gates SKILL discovery | Confirmed: `lares-operations.instructions.md`, `lares-voice.instructions.md` both in `.github/instructions/` and loading correctly |
| VS Code (Copilot Chat) | `.github/copilot-instructions.md` | Plain Markdown (no frontmatter required) | Always-on repo-level instructions | AGENTS.md / VS Code docs |

### VS Code SKILL.md Format (Confirmed)

```yaml
---
name: skill-folder-name          # required; must match folder name
description: >                   # required; up to 1024 chars; THIS IS THE DISCOVERY SURFACE
  Trigger phrases appear here. Model reads this first to decide whether to load.
  Include all terms a user might say that should invoke this skill.
argument-hint: ...               # optional; shown in UI when user invokes
user-invocable: true/false       # optional; default true
disable-model-invocation: true   # optional; prevent model from auto-invoking
---
```

Progressive loading: description (~100 tokens) → body (<5000 tokens) → referenced files.

---

## What We Need To Find (Open Research)

### Claude Code CLI

| Question | Status | Notes |
|---|---|---|
| Does `~/.claude/skills/` exist as a path convention? | ❓ Unconfirmed | Session crystal reference mentioned it; not verified against Claude Code docs |
| Does Claude Code read `AGENTS.md` from repo root? | ✅ Confirmed (this session) | AGENTS.md is loaded and operative |
| Does Claude Code read `.github/instructions/*.instructions.md`? | ✅ Confirmed (this session) | Both lares instructions files load correctly in Claude Code |
| Does Claude Code support a SKILL.md loading mechanism? | ❓ Unknown | No observed behavior confirming skill auto-load outside VS Code |
| What triggers instruction file loading in Claude Code vs VS Code? | ❓ Unclear | The `applyTo` glob works in VS Code; Claude Code behavior may differ |

### Copilot CLI / GitHub CLI Integration

| Question | Status | Notes |
|---|---|---|
| Does `gh copilot` read `.github/instructions/` files? | ❓ Unknown | Likely different from VS Code Copilot Chat |
| Is there a per-user skill path for Copilot CLI? | ❓ Unknown | |

### Claude.ai Web (Browser)

| Question | Status | Notes |
|---|---|---|
| How does the operator's `userPreferences` (Kernel) get loaded? | ✅ Confirmed (per AGENTS.md) | System prompt / project instructions in browser UI |
| Is there a SKILL equivalent in browser Claude? | ❓ Unknown | Probably not; instructions are loaded as project-level context, not skill files |
| Can `.github/instructions/` files be surfaced to browser session? | ❓ Unknown | Not natively; would require explicit upload or project context |

---

## Platform Matrix (Current State)

| Platform | AGENTS.md | `.github/instructions/` | `.github/skills/` | User-level config |
|---|---|---|---|---|
| VS Code Copilot Chat | ✅ Yes | ✅ Yes (applyTo) | ✅ Yes (SKILL.md) | `~/.vscode/...` settings |
| Claude Code CLI | ✅ Yes | ✅ Yes (observed) | ❓ Unknown | `~/.claude/` (unconfirmed) |
| Claude.ai browser | ✅ Via project instructions | ❓ Not natively | ❓ Unknown | System prompt / userPreferences |
| Copilot CLI (`gh copilot`) | ❓ Unknown | ❓ Unknown | ❓ Unknown | Unknown |
| Other (Cursor, Windsurf, etc.) | ❓ Varies | ❓ Varies | ❓ Varies | Varies |

---

## Open Questions for S4

1. **Claude Code skill loading:** Is there a documented `~/.claude/skills/` convention, or is this node-local inference? If not, what's the right delivery mechanism for Claude Code users?
2. **Dual-platform SKILL.md:** Can a single SKILL.md file work for both VS Code Copilot and Claude Code, or do we need per-platform variants?
3. **Instruction `applyTo` in Claude Code:** Does Claude Code honor the `applyTo` glob pattern in frontmatter, or does it load all `.github/instructions/` files unconditionally?
4. **Packaging strategy for S4:** Should S4 produce a single repo-deployable package (works wherever the repo is cloned) or platform-specific deployment scripts?
5. **User-level vs repo-level:** Should Lares skills and instructions live at repo level (current approach) or migrate to `~/.vscode/` / `~/.claude/` for non-repo contexts (e.g., general assistant use)?

---

## Research Actions (Before S4 Sprint Planning)

| Action | Owner | Priority |
|---|---|---|
| Check Claude Code docs for `~/.claude/` skill/instruction path spec | Artificer | High (blocks S4 packaging) |
| Test: does a SKILL.md in `.github/skills/` auto-load in Claude Code? | Operator + Artificer | High |
| Check `applyTo` behavior in Claude Code vs VS Code | Artificer | Medium |
| Survey Copilot CLI for instruction/skill loading surface | Artificer | Low (not current deployment target) |

---

*This is a living research doc. Update in place as questions are answered before S4 sprint planning.*
