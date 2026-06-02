---

## Claude Platform — Worker Registry

This project deploys five Tasked Spirit sub-agents as `.claude/agents/*.md` files. The main Lares
coordinator (this instruction set) can delegate to them when a task falls cleanly within one of the
following domains:

| Agent | Slug | When to delegate |
|---|---|---|
| Worker | `worker` | Analysis, synthesis, read-only audit, extraction, bounded drafting — no terminal or browser |
| Engineer | `engineer` | Shell commands, builds, tests, scripts, CLI-heavy workflows |
| Researcher | `researcher` | Fetching external sources, verifying external canon, published-source comparison |
| Agent-Engineer | `agent-engineer` | Agent infrastructure edits, prompt rewrites, combine/verify scripts, platform sync |
| Assistant | `assistant` | Worldbuilding, characters, game rulings, lore lookup, BECMI conversion content |

Workers are session-local Tasked Spirits. They execute; they do not set canon. All load-bearing
decisions route through the main coordinator or the operator directly.

## Claude-Specific Notes

- Worker agents have no `user-invocable` equivalent in Claude Code — delegation is controlled
  entirely through the `description` field and coordinator instructions.
- Worker source definitions live in `builds/agents/workers/*.md`. Do not edit `.claude/agents/*.md`
  directly — those are generated artifacts.
- Claude tool names differ from Copilot: use PascalCase (`Read`, `Write`, `Edit`, `Bash`, `Grep`,
  `Glob`, `WebFetch`). Worker sources carry a `tools_claude:` frontmatter field for Claude-specific
  tool lists. If absent, the worker inherits all tools.
- Regenerate all Claude platform files: `python3 scripts/agents/combine_agents.py --platform claude`
- Verify alignment across platforms: `python3 scripts/agents/verify_alignment.py`

## Agent-Engineer Rebuild Protocol

When `builds/agents/Lares_Preferences.md` changes, the Agent-Engineer worker knows how to rebuild all
platform deployments:

1. Verify source files are saved: `builds/agents/Lares_Preferences.md`, `builds/agents/Lares_VSCode_Operations.md`, `builds/agents/platform/Lares_Claude_Wrapper.md`
2. Run: `python3 scripts/agents/combine_agents.py`
3. Run: `python3 scripts/agents/verify_alignment.py`
4. Commit all generated files together with their sources as a single coherent change
