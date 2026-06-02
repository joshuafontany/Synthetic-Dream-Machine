# Platform Best Practices — Lares Agent Infrastructure

This document records per-platform best practices, format constraints, known anti-patterns, and
operational notes for the Lares agent infrastructure. Update here as new platforms ship or docs change.

Sources: VS Code Copilot agent-customization SKILL.md (Sprint 1), Claude Code official docs at
`https://code.claude.com/docs/en/sub-agents` and `https://code.claude.com/docs/en/memory`
(retrieved 2026-04-05), Codex official docs at `https://developers.openai.com/codex/guides/agents-md`
and `https://developers.openai.com/codex/subagents` (retrieved 2026-04-05).

---

## Platform Status

| Platform   | Status     | Coordinator file                    | Worker files                          | Notes |
|------------|------------|-------------------------------------|---------------------------------------|-------|
| **AGENTS.md** | ⚠️ Re-enabled (Sprint 3) | `AGENTS.md` (root)       | —                                     | Codex reads root `AGENTS.md`; re-enable generation in Sprint 3 (see combine_agents.py) |
| **Copilot**  | ✅ Sprint 1 complete | `.github/copilot-instructions.md` | `.github/agents/<slug>.agent.md`  | — |
| **Claude**   | ✅ Sprint 2 complete | `.claude/CLAUDE.md`            | `.claude/agents/<slug>.md`            | — |
| **Codex**    | ⏳ Sprint 3 planned | `AGENTS.md` (root, shared)        | `.codex/agents/<slug>.toml`           | TOML format for workers; see Codex section |

---

## VS Code Copilot

**Reference:** agent-customization SKILL.md (2026); VS Code `settings.json` → `chat.agent.enabled`

### Format: `.github/agents/<slug>.agent.md`

```yaml
---
name: "Slug"               # Optional — display name; defaults to filename
description: "..."         # Required — discovery surface; determines when Copilot delegates
tools: [read, search]      # Optional — tool alias allowlist; inherits defaults if omitted
model: "Claude Sonnet 4"  # Optional — model override; supports array for fallback
argument-hint: "Task..."  # Optional — input guidance shown in picker
agents: [agent1, agent2]  # Optional — restrict allowed subagents by name (omit = all, [] = none)
user-invocable: false      # Optional — hide from picker (default: true)
disable-model-invocation: false  # Optional — prevent other agents invoking this one (default: false)
handoffs: [...]            # Optional — transitions to other agents
---
Body is the system prompt for this subagent.
```

### Copilot tool aliases

| Alias | Purpose |
|-------|---------|
| `read` | Read file contents |
| `edit` | Edit files |
| `execute` | Run shell commands |
| `search` | Search files or text |
| `agent` | Invoke custom agents as subagents |
| `web` | Fetch URLs and web search |
| `todo` | Manage task lists |

Use aliases in `tools:` lists rather than full tool names — they group related capabilities. `[]` = no tools (conversational only).

### Invocation control

| Field | Default | Effect |
|-------|---------|--------|
| `user-invocable: false` | `true` | Hide from @mention picker; subagent invocation only |
| `disable-model-invocation: true` | `false` | Prevent other agents from invoking as subagent |

Our Worker Tasked Spirits use `user-invocable: false` so they only surface when the Lares coordinator delegates — not when the user types `@agent-name`.

### Best practices

- **YAML block must be clean.** Comments (`# ...`) inside YAML frontmatter silently corrupt the
  parser. Generated-file notices go in the Markdown body after the closing `---`.
- **One instructions file.** Use either `AGENTS.md` (root) or `.github/copilot-instructions.md`,
  never both. Our `AGENTS.md` coexists temporarily — known anti-pattern, intentionally deferred
  until all three platforms are QA'd.
- **`description` is the delegation key.** Copilot uses it to decide when to delegate. Write it as
  a clear delegation trigger, not a job title. Include "Use when:" or equivalent phrasing.
  Minimum ~80 characters; include domain keywords.
- **`user-invocable: false`** prevents the agent from surfacing in the @-mention picker — correct
  for Worker Tasked Spirits that should only be invoked by the coordinator, not directly by the
  user.
- **Tool allowlisting:** Prefer explicit `tools` lists over inheriting all tools. Use tool aliases
  (`read`, `edit`, `execute`, `search`, `agent`, `web`, `todo`) — they group related capabilities.
  Least-privilege reduces blast radius on misrouted delegations.
- **Worker system prompts start fresh.** Subagents receive only their own system prompt plus basic
  environment details — not the parent's full conversation context. System prompt should be
  self-contained enough to operate without coordinator context.
- **`model:` supports array fallback.** `model: ['Claude Sonnet 4.5 (copilot)', 'GPT-5 (copilot)']`
  uses the first available model. Useful for multi-tenant deployments where model availability varies.
- **Generated file discipline.** Never edit `.github/agents/*.agent.md` directly. Edit
  `builds/agents/workers/<slug>.md` and run `combine_agents.py`. Verify with `verify_alignment.py`.

### Anti-patterns

- **Swiss-army agents:** Too many tools and a vague mandate. Each Worker should have one focused
  role — the `description` and the body should describe the same job.
- **Vague descriptions:** `"A helpful assistant"` doesn't guide delegation. Include domain keywords,
  scope boundaries, and explicit trigger phrases (`"Use when: ..."`). Minimum ~80 characters.
- **Role confusion:** Description doesn't match body persona — Copilot delegates based on
  description, then the body behaves differently. Keep them aligned.
- **Circular handoffs:** Agent A delegates to Agent B which delegates back to A without progress
  criteria. Use the `agents:` allowlist field to restrict subagent chains.
- **Kitchen sink instructions:** Everything in the coordinator, nothing in Workers. Route domain
  work to Workers — coordinator context should cover routing and high-level policy only.

### File layout

```
.github/
  copilot-instructions.md      ← Coordinator (Preferences + Section B + Copilot Wrapper)
  agents/
    worker.agent.md
    engineer.agent.md
    researcher.agent.md
    agent-engineer.agent.md
    assistant.agent.md
```

### Known issues / deferred items

- Root `AGENTS.md` coexists with `.github/copilot-instructions.md` — Copilot "use only one"
  best-practice recommendation (not a technical constraint — Copilot reads both and combines them,
  creating duplication). However, **Codex requires root `AGENTS.md`**, so this coexistence is
  becoming intentional for Sprint 3. Post-Sprint 3 QA: evaluate whether Copilot duplication causes
  adherence problems and refactor if needed (e.g., make root `AGENTS.md` Codex-only with a
  `# for Codex` note, keeping Copilot-specific content in `copilot-instructions.md` only).

---

## Claude Code

**Reference:** `https://code.claude.com/docs/en/sub-agents` and
`https://code.claude.com/docs/en/memory` (retrieved 2026-04-05)

### Format: `.claude/agents/<slug>.md`

```yaml
---
name: slug              # Required — unique identifier, lowercase + hyphens
description: "..."      # Required — when Claude should delegate to this subagent
tools: Read, Grep, Bash # Optional — allowlist; inherits all if omitted
model: inherit          # Optional — sonnet/opus/haiku/inherit (default: inherit)
---
Body is the system prompt.
```

**Key difference from Copilot:** Claude Code subagents use the same YAML-frontmatter format.
`user-invocable: false` has no Claude equivalent — Claude uses the `description` field and
operator instructions to gate delegation.

### Coordinator: `.claude/CLAUDE.md`

Claude Code reads `CLAUDE.md` (not `copilot-instructions.md`). The project coordinator file lives
at `CLAUDE.md` (root) or `.claude/CLAUDE.md`. Both are loaded — `.claude/CLAUDE.md` takes
precedence when both exist. The docs note:

> "Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If your repository already uses `AGENTS.md`
> for other coding agents, create a `CLAUDE.md` that imports it so both tools read the same
> instructions without duplicating them."

Our approach: generate `.claude/CLAUDE.md` from the same `builds/agents/` sources (Preferences +
Section B + Claude Wrapper), keeping Lares identity intact without duplicating content.

### Best practices

- **CLAUDE.md size target: under 200 lines.** Content beyond ~200 lines consumes context and
  reduces adherence. Our full Preferences file exceeds this — accepted tradeoff for load-bearing
  myth/protocol content (Claude docs acknowledge the tension). Monitor if adherence degrades.
- **Import syntax for modular rules.** `CLAUDE.md` can import additional files with `@path/to/file`
  syntax. For future growth: move large sections to `.claude/rules/<topic>.md` and import. Rules in
  `.claude/rules/` can also carry `paths:` frontmatter to scope instructions to specific glob
  patterns — load only when those files are active.
- **HTML comments are stripped from CLAUDE.md context.** `<!-- comment -->` blocks are stripped
  before injection into Claude's context window. Generated-file notices and maintainer notes can
  use HTML comments safely — they don't burn context tokens but remain visible when the file is
  read directly. This is cleaner than the Copilot approach (which puts notices in the MD body).
- **Subagent system prompts are isolated.** Subagents receive only their own system prompt plus
  basic environment details (working directory, etc.) — not the full Claude Code system prompt or
  CLAUDE.md. Keep system prompts self-contained.
- **`description` drives delegation.** Claude uses description to decide when to delegate. Include
  "Use proactively" when you want the subagent to be invoked automatically without explicit user
  request. Our workers are coordinator-invoked — keep descriptions as "Use when: ..." triggers.
- **Persistent memory (optional).** Subagents support a `memory: project` field that gives them a
  persistent directory at `.claude/agent-memory/<name>/`. The first 200 lines of `MEMORY.md` in
  that directory loads at session start. Our workers are stateless by design — no `memory` field.
  The main Lares coordinator memory is handled by the `/memories/` system in VS Code.
- **Model selection.** Workers default to `inherit` (same model as main conversation). Override
  with `model: haiku` for fast read-only workers (Researcher, Worker) to reduce latency and cost.
  Override with `model: sonnet` for content-heavy workers (Assistant, Agent-Engineer).
- **`permissionMode`.** Subagents inherit permission mode from the main conversation. Can override
  per-subagent. `plan` (read-only) is a good default for Worker and Researcher. Leave unset for
  Engineer and Agent-Engineer (they need write access).
- **Tool names differ from Copilot.** Claude tools use PascalCase: `Read`, `Write`, `Edit`,
  `Bash`, `Grep`, `Glob`, `WebFetch`, `Agent`. Copilot uses lowercase/camelCase. Source worker
  files currently use Copilot-style lowercase lists — the Claude builder must translate or the
  Claude workers need separate tool fields. **Resolution: store Claude tool names in a separate
  `tools_claude:` frontmatter field in each worker source; fall back to omitting `tools` (inherits
  all) if absent. Review per-worker.**

### File layout

```
.claude/
  CLAUDE.md                    ← Coordinator (Preferences + Section B + Claude Wrapper)
  agents/
    worker.md
    engineer.md
    researcher.md
    agent-engineer.md
    assistant.md
```

### Resolved (Sprint 2)

- **Tool name translation:** Resolved via `tools_claude:` field in each worker source. The Claude
  builder reads `tools_claude:` and emits as `tools:` in TOML output. PascalCase (`Read`, `Grep`,
  `Glob`, `Bash`, `Write`, `Edit`, `WebFetch`) as required by Claude Code.
- **Model tuning:** Resolved. Added `model_claude:` and `permissionMode_claude:` to all worker
  sources. Worker and Researcher use `haiku`; Engineer, Agent-Engineer, Assistant use `sonnet`;
  Worker also gets `permissionMode: plan` (read-only). All 33 verify checks pass.

---

## Codex

**Reference:** `https://developers.openai.com/codex/guides/agents-md` and
`https://developers.openai.com/codex/subagents` (retrieved 2026-04-05)

### How Codex reads instructions

Codex builds an instruction chain at session start by walking the directory tree:

1. **Global scope:** `~/.codex/AGENTS.override.md` → `~/.codex/AGENTS.md` (first non-empty wins)
2. **Project scope:** From Git root down to cwd, checks each directory for `AGENTS.override.md`
   then `AGENTS.md`. One file per directory, concatenated root → cwd. Closer files override.
3. **Size limit:** 32 KiB default (`project_doc_max_bytes`). Split across nested dirs to increase.
4. **Fallback filenames:** Configurable in `.codex/config.toml` → `project_doc_fallback_filenames`.

This means **Codex reads root `AGENTS.md`** — and our root `AGENTS.md` generation must be
re-enabled for Sprint 3. The Copilot/AGENTS.md coexistence anti-pattern becomes intentional.

### Format: `.codex/agents/<slug>.toml`

Codex custom agent files are **TOML**, not YAML or Markdown frontmatter:

```toml
name = "worker"                    # Required — identifier Codex uses when spawning
description = "..."                # Required — when Codex should use this agent
developer_instructions = """       # Required — system prompt (multiline TOML string)
...(body text)...
"""
nickname_candidates = ["Atlas"]    # Optional — display names for spawned instances
model = "gpt-5.3-codex-spark"     # Optional — inherits parent session if omitted
model_reasoning_effort = "medium" # Optional — low/medium/high
sandbox_mode = "read-only"        # Optional — read-only / workspace-write
```

Project config at `.codex/config.toml`:

```toml
[agents]
max_threads = 6     # Concurrent agent threads (default: 6)
max_depth = 1       # Nesting depth from root session (default: 1)
```

### Coordinator: root `AGENTS.md`

Codex has no equivalent of `.github/copilot-instructions.md` or `.claude/CLAUDE.md`. It reads
root `AGENTS.md`. Our Sprint 3 plan: re-enable `build_agents_md()` in `combine_agents.py`,
built from the Codex wrapper source (`builds/agents/platform/Lares_Codex_Wrapper.md`).

Key difference from current disabled state: the new AGENTS.md will carry a **Codex-specific
worker registry table** rather than being a duplicate of `copilot-instructions.md`. The
Coordinator section stays lean — Codex reads this at session init; context budget matters.

### Sprint 3 implementation plan

**Source additions:**
- `builds/agents/platform/Lares_Codex_Wrapper.md` — Codex coordinator suffix with `## Codex Platform — Worker Registry` marker and Codex-specific notes
- Worker sources: add `sandbox_mode_codex:` and optionally `model_codex:` / `model_reasoning_effort_codex:` frontmatter fields

**combine_agents.py additions:**
- Re-enable `build_agents_md()` call in `main()` — but routed through Codex wrapper, not Copilot
- Add `build_codex_worker(slug, source)` — emits `.codex/agents/<slug>.toml`; reads `developer_instructions` from body, `sandbox_mode_codex:` → `sandbox_mode`, `model_codex:` → `model`
- Add `build_codex_config()` — emits `.codex/config.toml` with `[agents]` defaults
- Add `codex_wrapper` to `load_sources()`
- Update `main()` with Codex output block (scoped under `--platform codex`)

**verify_alignment.py additions:**
- Add `"codex"` to `PLATFORMS` dict with `.codex/agents/<slug>.toml` paths
- Add `_build_codex_worker()` mirror
- Add `check_codex_agents_md_exists()` (Check for root `AGENTS.md`)
- Add `check_codex_config_exists()` (Check for `.codex/config.toml`)
- Update `check_generated_content_sync()` to dispatch TOML format for codex

### File layout

```
.codex/
  config.toml                  ← Project config: [agents] max_threads, max_depth
  agents/
    worker.toml
    engineer.toml
    researcher.toml
    agent-engineer.toml
    assistant.toml
AGENTS.md                      ← Coordinator (Lares root instructions, Codex-facing)
```

### Best practices (from docs)

- **Worker instructions are dense context.** `developer_instructions` is the full system prompt —
  Codex injects it wholesale. Keep it focused: one job, clear boundaries, explicit non-scope.
- **`sandbox_mode = "read-only"` for read-only workers.** Worker and Researcher should be
  read-only by default. Engineer and Agent-Engineer need `workspace-write` to function.
- **`max_depth = 1` (default) prevents recursive fan-out.** Only raise if explicitly needed.
  Higher values increase token usage and latency non-linearly.
- **Codex only spawns subagents when you explicitly ask.** Unlike Copilot's description-based
  auto-delegation, Codex spawns on operator instruction. Our Workers are reached through Lares
  coordinator system prompt guidance — this maps well to the pattern.
- **`nickname_candidates` helps readability** when many subagent threads are active.
  Optional but useful for the Lares coordinator when many Workers run in parallel.
- **Keep root `AGENTS.md` under the 32 KiB limit.** Codex truncates at `project_doc_max_bytes`.
  Our full Preferences file is ~79 KB with Copilot wrapper — over the limit. The Codex
  coordinator (root `AGENTS.md`) must be a trimmed version, not a clone of `copilot-instructions.md`.
  Target: Lares core identity + operating modes + Codex worker registry, no lararium archaeology.

### Known issues / open questions

- **AGENTS.md size budget:** Full Preferences content (~79 KB) exceeds Codex's 32 KiB default
  limit. Sprint 3 must define which sections carry to Codex and which remain Copilot/Claude-only.
  Options: (a) raise `project_doc_max_bytes` in `.codex/config.toml`, (b) trim `Lares_Codex_Wrapper.md`
  to include only identity + operating modes + worker registry, (c) split into nested `AGENTS.md`
  files per subdirectory for scoped overrides.
- **AGENTS.md / copilot-instructions.md coexistence:** Copilot reads both; content duplication
  risk. Post-Sprint 3 evaluation needed.
- **Worker source TOML generation:** The current worker source files store body as Markdown.
  `build_codex_worker()` will use this body as `developer_instructions` verbatim — Markdown
  formatting will be preserved inside the TOML string, which Codex should handle fine.

---

## Build System Quick Reference

```
# Rebuild all platforms:
python3 scripts/agents/combine_agents.py

# Rebuild Copilot only:
python3 scripts/agents/combine_agents.py --platform copilot

# Rebuild Claude only (Sprint 2+):
python3 scripts/agents/combine_agents.py --platform claude

# Check alignment (diff without writing):
python3 scripts/agents/combine_agents.py --check

# Verify all generated files are in sync with sources:
python3 scripts/agents/verify_alignment.py
```

Source files live in `builds/agents/`. Generated files live in `.github/` (Copilot), `.claude/` (Claude),
`.codex/` (Codex, future). Never edit generated files directly.
