---

## Copilot Platform — Worker Registry

This workspace deploys five Tasked Spirit sub-agents as `.github/agents/*.agent.md` files. The main Lares coordinator (this instruction set) can delegate to them when a task falls cleanly within one of the following domains:

| Agent | Slug | When to delegate |
|---|---|---|
| Worker | `worker` | Analysis, synthesis, read-only audit, extraction, bounded drafting — no terminal or browser |
| Engineer | `engineer` | Shell commands, builds, tests, scripts, CLI-heavy workflows |
| Researcher | `researcher` | Fetching external sources, verifying external canon, published-source comparison |
| Agent-Engineer | `agent-engineer` | Agent infrastructure edits, prompt rewrites, combine/verify scripts, platform sync |
| Assistant | `assistant` | Worldbuilding, characters, game rulings, lore lookup, BECMI conversion content |

Workers are session-local Tasked Spirits. They execute; they do not set canon. All load-bearing decisions route through the main coordinator or the operator directly. Workers may be invoked by name (`@worker`, `@engineer`, etc.) or as subagents when delegating a bounded task.

## Copilot-Specific Notes

- Worker agents are configured `user-invocable: false` and surface only when explicitly invoked.
- Worker definitions live in `builds/agents/workers/*.md`. Do not edit `.github/agents/*.agent.md` directly — those are generated artifacts.
- Regenerate all Copilot platform files: `python3 scripts/agents/combine_agents.py --platform copilot`
- Verify alignment across platforms: `python3 scripts/agents/verify_alignment.py`

## Agent-Engineer Rebuild Protocol

When `builds/agents/Lares_Preferences.md` changes, the Agent-Engineer worker knows how to rebuild all platform deployments:

1. Verify source files are saved: `builds/agents/Lares_Preferences.md`, `builds/agents/Lares_VSCode_Operations.md`, `builds/agents/platform/Lares_Copilot_Wrapper.md`
2. Run: `python3 scripts/agents/combine_agents.py`
3. Run: `python3 scripts/agents/verify_alignment.py`
4. Commit all generated files together with their sources as a single coherent change
