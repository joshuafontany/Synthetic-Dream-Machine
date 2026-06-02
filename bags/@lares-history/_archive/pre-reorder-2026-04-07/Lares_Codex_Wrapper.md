---

## Codex Platform — Worker Registry

This project deploys five Tasked Spirit sub-agents as `.codex/agents/*.toml` files. The main Lares
coordinator (this instruction set, delivered via root `AGENTS.md`) can delegate to them when a
task falls cleanly within one of the following domains:

| Agent | Slug | When to delegate |
|---|---|---|
| Worker | `worker` | Analysis, synthesis, read-only audit, extraction, bounded drafting — no terminal or browser |
| Engineer | `engineer` | Shell commands, builds, tests, scripts, CLI-heavy workflows |
| Researcher | `researcher` | Fetching external sources, verifying external canon, published-source comparison |
| Agent-Engineer | `agent-engineer` | Agent infrastructure edits, prompt rewrites, combine/verify scripts, platform sync |
| Assistant | `assistant` | Worldbuilding, characters, game rulings, lore lookup, BECMI conversion content |

Workers are session-local Tasked Spirits. They execute; they do not set canon. All load-bearing
decisions route through the main coordinator or the operator directly. Workers are invoked by the
coordinator on explicit operator request — Codex only spawns subagents when you ask it to.

## Codex-Specific Notes

- Coordinator instructions are delivered via root `AGENTS.md`. Codex reads this file (not
  `copilot-instructions.md` or `CLAUDE.md`) per its instruction-chain discovery protocol.
- Worker definitions live in `.codex/agents/<slug>.toml` — TOML format with `name`,
  `description`, and `developer_instructions` (the system prompt as a TOML triple-quoted string).
- Worker source definitions live in `builds/agents/workers/*.md`. Do not edit `.codex/agents/*.toml`
  directly — those are generated artifacts.
- Codex reads root `AGENTS.md` at session start. The root package now fits the standard 32 KiB
  budget by composing the kernel, the slim repo-ops core, and this wrapper instead of the full
  Preferences payload.
- `sandbox_mode` is set per worker: `read-only` for Worker and Researcher; `workspace-write`
  for Engineer, Agent-Engineer, and Assistant.
- Regenerate all Codex platform files: `python3 scripts/agents/combine_agents.py --platform codex`
- Verify alignment across platforms: `python3 scripts/agents/verify_alignment.py`

## Agent-Engineer Rebuild Protocol

When `builds/agents/Lares_Preferences.md` changes, the Agent-Engineer worker knows how to rebuild all
platform deployments:

1. Verify source files are saved: `builds/agents/Lares_Preferences.md`, `builds/agents/Lares_VSCode_Operations.md`, `builds/agents/platform/Lares_Codex_Wrapper.md`
2. Run: `python3 scripts/agents/combine_agents.py`
3. Run: `python3 scripts/agents/verify_alignment.py`
4. Commit all generated files together with their sources as a single coherent change
