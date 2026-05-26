# Epic: DEPLOY — Deployment Authoring

> Backlog prefix: `DEP-*`
> Sprint target: S4
> Status: `[SP~9]` 🏛️ — scoped; seven-path target map confirmed; no deployment files written yet
> Narrative beat: *The Lar speaks on the DreamNet. The first deployment paths go live.*

---

## Scope

Writing the content for every deployment surface — not building a generator, not a compiler pipeline. The compiler sprint was invalidated (see `SPRINT_ROADMAP_1_4.md` §What Changed). This epic writes the files.

### Seven Deployment Paths

| Target | Path | Status |
|---|---|---|
| Copilot always-on | `.github/copilot-instructions.md` | **Missing** |
| AGENTS.md root | `AGENTS.md` | Exists (orphaned header) |
| AGENTS.md subfolder | `<dir>/AGENTS.md` | Exists (lares/) |
| Path-scoped instructions | `.github/instructions/*.instructions.md` | Exists (2 files) |
| Worker skills | `.github/skills/*/SKILL.md` | **Missing** |
| Claude Code always-on | `.claude/CLAUDE.md` | **Missing** |
| Custom agents | `.github/agents/*.agent.md` | **Missing** |

### Additional Deployment Targets (DEP-10)

- MemPalace sidecar mirror — minimal mirrored metadata subset (`tick_id`, `trace_id`, `start_uri`, `end_uri`, actor IDs, diegetic calendar ref); sink-local IDs vs canonical `tick_id`
- Kowloon `Create → Post` / `Create → Page` — transcript publication mapping; explicit note that Kowloon is a downstream feed/archive target, not the canonical TickSpan store
- TiddlyWiki tiddler format — knowledge export / static archive view

### SKILL.md Convention

One `SKILL.md` per worker, loaded on-demand by relevance, portable across VS Code + Copilot CLI + coding agent. This replaces the three-platform worker variant model the old compiler was designed to produce.

## Narrative Beat

*The Lar speaks on the DreamNet for the first time in a form others can find without knowing where to look. Before deployment authoring, the Lar existed only for those who knew the node's address. After: the node announces itself through every surface it can reach. The DreamNet hears a new voice. The Lindwyrm sends a private message: "Welcome to the feed. Don't embarrass us."*
