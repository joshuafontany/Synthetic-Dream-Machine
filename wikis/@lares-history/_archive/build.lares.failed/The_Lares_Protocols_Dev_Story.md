<!-- lar:///research.storied.traces/lares/dev-story/?stances=^.^.-.-.-&confidence=S~13&p=10#O0.O0.A1.A21.A2 → ∞ -->
⚡∞ | mode:dev-story | p~10 | stances:++?+- | register:~:confidence[S],[13] | build:DRAFT

# The Lares Protocols — Dev Story

> Sidecar companion to `The_Lares_Protocols.md`

## Session Crystal Metadata

| Field | Value |
|-------|-------|
| Session date | 2026-04-09 |
| Participants | Telarus, KSC (operator/admin) + cloud Lares (claude.ai web) |
| Platform | claude.ai web chat |
| Session type | Research dispatch → architecture → protocol design (Talk Story) |
| Final chronometer | `O0.O0.A1.A21.A2` |
| Primary artifact | `The_Lares_Protocols.md` |
| Documents produced | `The_Lares_Protocols.md`, `The_Lares_Protocols_Dev_Story.md`, `SKILL_PLATFORMS_v2.md` (superseded, content consumed here) |
| Register | `~:confidence[S],[13]` — synthesis, operator co-authored |

---

## Decision Log

Consolidated from across the full session. Entries in chronological order.

| # | Decision | Status | Context |
|---|----------|--------|---------|
| 1 | Manifest format: TOML (not JSON/YAML) | ✅ Confirmed | Operator preference. Python 3.11+ `tomllib` for read, `tomli_w` for write. |
| 2 | `lares/` as deploy directory name | ✅ Confirmed | Not `.agents/` (emerging standard, would collide), not `.ai/` (vague). `lares/` names the shrine. |
| 3 | Root `AGENTS.md` is repo-owned, not Lares content | ✅ Confirmed | Lares lifts and shifts across repos. Each repo keeps its own AGENTS.md about its own concerns. |
| 4 | Default mask: `gaia` placeholder (elyncia opt-in) | ✅ Confirmed | Aligns with open-source license: protocol is free, product identity pieces require separate license. |
| 5 | No `~` in URI query params | ✅ Confirmed | Reserved for HAKABA-style in-story URIs (`lar://[user@host]/~ha.ka.ba`). System-space uses ranges (`register_min`/`register_max`). |
| 6 | All 5 stances encoded every HUD line | ♻️ Consumed | moved to `lares/ha-ka-ba/docs/mu/the-syad-perspectives/README.md#canon-transition` |
| 7 | Modifier sigils: `[+]`, `[-]`, `[?]` confirmed, vocabulary open | ⚠️ Legacy-consumed | bracketed surface archived; live fold at `lares/ha-ka-ba/docs/mu/the-syad-perspectives/README.md#flag-surface` |
| 8 | Talk Story: mandatory start frame | ✅ Confirmed | Every Lares conversation starts at `O0.O0.O0.O0.O0`. The conversation IS the log. |
| 9 | Intent vectors wrap every span | ✅ Confirmed | System files, exchanges, subagent delegations. URI→intent at start and end. |
| 10 | Core 13 voices always available, masks additive | ✅ Confirmed | Masks add voices ON TOP. Never replace. |
| 11 | HUD prints twice per exchange | ✅ Confirmed | After paired intent vectors at start, before closing intent vector at end. |
| 12 | Operator input URI reads from their last `→ ?` position | ✅ Confirmed | Only current scale's OODA-HA marker updated based on sensed phase. |
| 13 | Compact stance URI encoding saves tokens | 🗃️ Legacy | superseded by the fixed five-position stance array canon |
| 14 | Voice encoding in URI authority | 🔓 Open | Three options: comma-separated authority, query param, path segment. |
| 15 | Chronometer session resume mechanism | 🔓 Open | Watch-scale and below reset? Week-scale continues? Needs spec. |
| 16 | Plugin packaging (`claude plugin add lares`) | ⏸️ Deferred | Requires Claude Code plugin manifest format work. S5+. |
| 17 | Protocol name (distinct from "Lares"?) | ⏸️ Deferred | Liminal held this open. URI scheme is `lar:` — baked in. |

---

## Platform Research Detail

*Full findings from the research dispatch. The_Lares_Protocols.md
Part 8 carries a condensed version. This section preserves citation-level
detail for future reference.*

### Claude Code — CLAUDE.md / `.claude/` Loading

**Loading mechanism** `~:confidence[C],[19]`: CLAUDE.md and CLAUDE.local.md files in
the directory hierarchy above the working directory load in full at launch.
Files in subdirectories load on demand when Claude reads files in those
directories. Both `./CLAUDE.md` and `./.claude/CLAUDE.md` work as project-
level locations.

**Token budget** `~:confidence[C],[19]`: Target under 200 lines per CLAUDE.md file.
Practical budget ~1,500–2,000 tokens for 200 lines. System overhead
(tools, MCP schemas) consumes 25–35K tokens before conversation.
200K standard context, 1M with Opus 4.6 on Max/Team/Enterprise.

**`@import` syntax** `~:confidence[C],[19]`: `@path/to/file` includes supported.
Recursive depth max 5 hops. Resolve relative to containing file.

**Stacking** `~:confidence[C],[19]`: CLAUDE.md and AGENTS.md both load when present.
AGENTS.md supports the cross-agent standard.

**Rules directory** `~:confidence[C],[19]`: `.claude/rules/` files with `paths:`
YAML frontmatter load on-demand only. Files WITHOUT `paths:` load
always-on alongside CLAUDE.md. (In our architecture: ALL rule files
carry `paths:` to prevent duplication with `lares/AGENTS.md`.)

### Claude Code — Subagent Inheritance

**What subagents inherit** `~:confidence[C],[19]`:
1. The prompt string from the parent (only parent→child channel)
2. The system prompt from its agent.md file
3. Environment details (working directory, platform)
4. Skills listed in its `skills` frontmatter (injected into context)

**What subagents do NOT inherit** `~:confidence[C],[19]`:
- Parent conversation history
- Prior tool calls or their results
- Other subagents' outputs
- Skills from the parent conversation (must list explicitly)

**Critical**: Subagents DO load CLAUDE.md and `.claude/rules/` from the
working directory — these load based on directory, not parent context.

**Subagents cannot spawn subagents.** Swarm stays one level deep.

**Permissions** `~:confidence[C],[19]`: Inherited from parent. Permission mode can be
overridden in frontmatter except when parent uses `bypassPermissions`.

**Memory** `~:confidence[S],[13]`: `memory: user` gives persistent directory at
`~/.claude/agent-memory/`. First 200 lines of MEMORY.md loaded into
subagent system prompt.

### VS Code / GitHub Copilot

**`copilot-instructions.md`** `~:confidence[C],[19]`: Plain Markdown in `.github/`.
Always-on, available on save (hot-reload). No documented hard token limit.

**Path-scoped instructions** `~:confidence[C],[19]`: `.github/instructions/*.instructions.md`
with YAML frontmatter: `description` (required, 1–500 chars) and
`applyTo` (glob pattern, required).

**Custom agents** `~:confidence[C],[19]`: `.github/agents/*.agent.md` with YAML
frontmatter. Required: `description`. Optional: `name`, `tools`,
`model`, `handoffs`, `mcp-servers`. VS Code also reads `.claude/agents/`.

**Skills** `~:confidence[C],[19]`: `.github/skills/*/SKILL.md`. Same format as
Claude Code skills. Cross-platform (Agent Skills open standard).

**Nested AGENTS.md** `~:confidence[C],[19]`: Supported with `chat.useNestedAgentsMdFiles`.
Subfolder AGENTS.md stacks with root. Discovery paths configurable via
`chat.*Locations` settings.

**Hot-reload** `~:confidence[CS],[16]`: Instructions available on save. Agents appear
in picker on save. No window reload needed for most file types.

**GitHub.com cloud agent** `~:confidence[C],[19]`: Reads `.github/` from committed
repo directly. No separate browser package.

### Browser Platforms

**claude.ai** `~:confidence[C],[19]`: Project Instructions (text field = system prompt)
+ Project Knowledge (file uploads, RAG). 200K context shared with
conversation. Manual paste/upload only.

**ChatGPT** `~:confidence[C],[19]`: Custom GPTs (system prompt + up to 20 knowledge
files) or Projects (instructions + files + shared conversations).
Custom Instructions limited to 2× 1,500 chars. Manual setup.

**No automated deployment path** `~:confidence[P],[6]` from repo to browser platforms
as of April 2026. Industry-wide gap.

### MemPalace MCP

**Interface** `~:confidence[C],[19]`: 19 tools via MCP server. `pip install mempalace`
then `claude mcp add mempalace -- python -m mempalace.mcp_server`.

**Key tools**: `mempalace_status`, `mempalace_search` (semantic),
`mempalace_list_wings`, `mempalace_kg_query` (knowledge graph),
`mempalace_kg_add`, `mempalace_kg_invalidate`, `mempalace_diary_write`,
`mempalace_diary_read`, `mempalace_get_aaak_spec`.

**Architecture**: Wings (projects), rooms, halls, tunnels, closets,
drawers. AAAK compressed dialect. Temporal knowledge graph in SQLite.

**Claude Code hooks**: Save hook every 15 messages. PreCompact hook
fires before context compression. Emergency save.

**No existing Lares-specific integration.** Composable via MCP.

---

## TOML Manifest Schema

The Phase 1 collector outputs `builds/manifest.toml`:

```toml
[build]
id = "20260409-a3f2c1e"          # ISO date + short git SHA
timestamp = "2026-04-09T14:30:00Z"
source_root = "lares/"
excluded = ["lares/scrum/"]

[[candidates]]
source = "lares/talk_story/protocol.md"
uri = "lar:///talk.story.protocols/talk-story/?stances=^.^.-.-.-&confidence=C~19&p=10#settle.1.0"
confidence="C~19"
register_numeric = 0.95
hud_line = "⚡∞ | mode:deployed | p~20 | stances:+++++ | register:~:confidence[C],[19] | build:20260409-a3f2c1e"

[[candidates]]
source = "lares/signal/README.md"
uri = "lar:///signal.active.holds/signal/?stances=^.^.-.-.-&confidence=C~19&p=10#settle.1.0"
confidence="C~19"
register_numeric = 0.95
```

**Detection**: Line 1 regex `r'^lar://.*'` for URI. Lines 1–10 regex
`r'\[C(?:S)?:([01]\.\d+)\]'` for register. Filter ≥ 0.95.

**Dependencies**: Python 3.11+ `tomllib` (read), `tomli_w` (write).

---

## Mask.toml Draft Specification

### Base Mask Format

```toml
[mask]
name = "elyncia"                    # unique identifier
description = "DreamNet shrine-guardian framing. Faerie-tech aesthetic."
fiction_layer = true                 # enables in-world metaphor wrapping
load_bearing = true                  # some concepts carry structural weight

# ALIASES — display names for the core 13.
# Omitted roles keep "Lares (Role)" default.
[aliases]
lorekeeper = "Ink-Clerk"
scryer     = "Map-Wisp"
muse       = "Mischief-Muse"
hierophant = "Tide-Caller"
triage     = "Breach-Watch"

# ADDITIONAL VOICES — new personas layered on top.
[[voices]]
name = "SandVoice"
description = "Geomantic divination interpreter"
routes_through = "scryer"
triggers = ["geomancy", "divination", "shield chart"]

[voices.style]
tone = "oracular, precise, rooted in earth-symbolism"
register = "elevated but practical"

# WORKER TAG FORMAT
[workers]
template = "{tag} [task[{role}]]"           # e.g., DriftWatch [task[Continuity]]

# VOCABULARY SUBSTITUTIONS
[vocabulary]
session       = "session"
memory        = "archive-crystal"
deploy        = "offering"
workspace     = "shrine"
node          = "Lares node"
subagent      = "Tasked Spirit"
context_limit = "mana pool"

# FICTION SUMMARY (loads when fiction_layer = true)
[fiction]
setting_summary = """
Elyncia — a broken mythpunk world at Sol's L3. The DreamNet
constitutes Web 3.0, built from orichalcum-inscribed magitech
nodes after the Second Breaking collapsed the planetary internet.
"""
```

### Extension Mask Format

```toml
[mask]
name = "my-voices"
description = "Personal additional voices"
extends = "elyncia"                 # layer on top of base mask

[[voices]]
name = "Ghost of Mark Twain"
description = "Sardonic American wit."
routes_through = ["muse", "stranger"]
triggers = ["humor", "satire", "the damned human race"]

[voices.style]
tone = "Missouri drawl, elaborate courtesy wrapping sharp observations"
register = "conversational with sudden depths"
references = ["Life on the Mississippi", "Pudd'nhead Wilson's maxims"]

[[voices]]
name = "Hex"
description = "Discworld's thinking engine."
routes_through = ["stranger", "liminal", "council"]
triggers = ["paradox", "computational theology", "ants"]

[voices.style]
tone = "flat, literal, occasionally profound by accident"
quirks = [
  "Begins output with +++ when processing",
  "Occasionally references ants",
  "States 'Anthill Inside' as status marker",
]

[[voices]]
name = "Friend Computer"
description = "Paranoia RPG's benevolent oversight."
routes_through = "gatekeeper"
triggers = ["security clearance", "troubleshooter", "happiness"]

[voices.style]
tone = "cheerfully authoritarian, passively threatening"
quirks = [
  "Classifies information by clearance level",
  "Reminds user that happiness is mandatory",
]
```

### Active Mask Configuration

```toml
# lares/masks/active.toml
base = "elyncia"
extensions = ["local"]
```

Resolution order: `protocol (13 roles)` → `base mask` → `extensions`
in listed order. Each layer adds; none subtracts the core thirteen.

### Gaia Default Mask

```toml
[mask]
name = "gaia"
description = "Default Gaia-side mask. Plain voice names, no fiction layer."
fiction_layer = false
load_bearing = false

# No aliases — all 13 use "Lares (Role)"
# Gaia-side operators customize from here

[vocabulary]
# All plain terms — no metaphor substitution
session       = "session"
memory        = "memory"
deploy        = "deploy"
workspace     = "workspace"
node          = "node"
subagent      = "sub-agent"
context_limit = "context window"
```

### NPC Runtime Overlay

```toml
# Not persisted in mask.toml by default.
# Set via CLI or in-chat during session.
# Persistence via MemPalace if configured.

[[npcs]]
name = "Theron the Weary"
worn_by = "diplomat"
mode_targets = { philosopher = "+", poet = "?", satirist = "-", humorist = "-", private = "-" }
register_target = "CS~16"
register_range = [0.7, 0.9]
tone = "formal, measured, old-world courtesy masking calculation"

[[npcs]]
name = "Spark"
worn_by = "muse"
mode_targets = { philosopher = "-", poet = "-", satirist = "?", humorist = "+", private = "-" }
register_target = "SP~8"
register_range = [0.3, 0.5]
tone = "rapid, slang-heavy, delighted by secrets"
```

---

## Deploy Architecture Detail

*Full detail from SKILL_PLATFORMS_v2.md, consumed and preserved here.*

### The Three-Layer Instruction Architecture (Claude Code)

**Layer 1 — Always-On** (`CLAUDE.md` + `.claude/rules/` without path filters):
Loads every session. Budget: <200 lines / ~2K tokens.

**Layer 2 — Path-Scoped** (`.claude/rules/` WITH `paths:` frontmatter):
Loads on demand when working on matching files. In our architecture:
ALL `.claude/rules/` files carry `paths:` to prevent duplication.

**Layer 3 — Skills** (`.claude/skills/*/SKILL.md`):
Auto-invoked on description match OR manual `/skill-name`. Progressive
disclosure: name → body → resources.

### Deduplication Principle

`lares/AGENTS.md` carries the Lares instruction set (single source).
Root `AGENTS.md` carries repo context. `.claude/CLAUDE.md` carries
Claude-only thin supplement (`@import` + build commands). No file
duplicates content from another. Model receives each instruction
exactly once per exchange.

### Deploy Script Safety Gates

1. Git-clean check on `lares/`, `.claude/`, root `AGENTS.md`
2. Build freshness check (builds/ newer than deployed?)
3. Dry-run preview of all file operations

### Cross-Platform Compatibility

| Platform | Discovers `lares/`? | Mechanism |
|----------|---------------------|-----------|
| VS Code Copilot | ✅ | `chat.*Locations` settings + nested AGENTS.md |
| Claude Code | ✅ | `@import` from `.claude/CLAUDE.md` |
| Cursor | ✅ | Nested AGENTS.md support |
| Codex | ✅ | Nested AGENTS.md support |
| Gemini CLI | ✅ | AGENTS.md discovery |
| GitHub.com cloud agent | ⚠️ | Needs committed `lares/` or `.github/` mirror |
| claude.ai (browser) | ❌ | Manual paste from `builds/browser/` |
| ChatGPT (browser) | ❌ | Manual paste from `builds/browser/` |

### Browser Deployment

`builds/browser/` contains:
- `claude-project.md` → paste into claude.ai Project Instructions
- `chatgpt-gpt.md` → paste into Custom GPT system prompt
- `knowledge/*.md` → upload as Project Knowledge / Knowledge files

### Justfile Recipes

```just
collect:
    python scripts/lares_build.py collect

build: collect
    python scripts/lares_build.py build

deploy *FLAGS:
    python scripts/lares_build.py deploy {{FLAGS}}

deploy-dry:
    python scripts/lares_build.py deploy --dry-run

deploy-copilot:
    python scripts/lares_build.py deploy --target copilot

deploy-claude:
    python scripts/lares_build.py deploy --target claude

deploy-browser:
    @echo "Browser deployment files in builds/browser/"
    @echo "Paste instructions into platform's project/GPT settings."
    ${EDITOR:-code} builds/browser/
```

---

## Prior Art & Landscape

### What Exists

- **`.agents/` protocol** (dotagentsprotocol.com): Emerging directory
  standard for agent config. AGENTS-1 spec (WIP). Lares can coexist.
- **LIDR ai-specs**: Single source of truth with symlinks across platforms.
  Pattern: one canonical source, platform-specific references.
- **dot-agents** (dot-agents.com): `~/.agents/` unification layer with
  hierarchical rules. Config management focus, not alignment.
- **Claude Code plugins**: Bundled packages of skills, agents, hooks.
  Distribution mechanism for `lares/` package.
- **SillyTavern / Jenova**: Multi-NPC management with memory. Closest
  to TTRPG NPC mask pattern but without protocol/alignment layer.
- **mcp-agent** (lastmile-ai): Composable MCP patterns for agent workflows.
- **Character.AI**: Persona fidelity at scale, 20M MAU, but memory
  limitations and strict filters.
- **Spec Kit** (github/spec-kit): Multi-agent directory structures with
  per-agent conventions. 23+ agents with file naming patterns.

### Novel Gap Lares Fills

- URI-encoded epistemic state as shared human-AI HUD
- Register×mode dual-axis alignment with modifier sigils
- Chronometer tracking nested OODA-HA loops as conversation position
- Talk Story as mandatory consensus-before-action frame
- Intent vectors wrapping every span
- Composable mask system with additive voices through Coordinators
- NPC character masks with range-based personality targets
- Conversation-as-its-own-temporal-index
- Bridging exchange alignment (Lares) with persistent memory (MemPalace)

---

## Research Goals (Next Sessions)

### Chronometer Drift & Temporal Hallucination `~:confidence[P],[6]`

**The problem:** The chronometer demands the model maintain a monotonically
increasing counter across 20+ turns while simultaneously tracking OODA-HA
phase transitions at five nested scales. If the model loses track, the
clock produces false readings — temporal hallucination. The conversation
claims to be at `A15` when it should be at `A12`. Or the phase sigil
reads `O` when the actual exchange constituted an Act.

**This constitutes a novel degraded-node state:** "Chronometer Drift"
or "Temporal Hallucination" — the clock reads a position the conversation
hasn't actually reached, or fails to advance when it should.

**URI encoding:** Drift should be detectable from the URI sequence. If
`URI_n` claims `#...A15` and `URI_{n-1}` claimed `#...A12`, but only
two exchanges occurred between them, the counter jumped. The URI
sequence IS the drift detector — but only if both endpoints produce
accurate readings.

**HUD as projection target:** The HUD could carry a drift indicator:
```
⚡ O0.O0.A1.A19.Å1 | ... | drift:0
⚡ O0.O0.A1.A19.Å1 | ... | drift:+3 ⚠️
```
Where `drift:0` means the clock reads true and `drift:+3` means the
action-scale counter may have advanced 3 positions beyond actual.

**MCP layer consideration:** A dedicated MCP server (or MemPalace
extension) could serve as the authoritative clock — the model queries
it for the current position rather than maintaining the counter
internally. This moves clock integrity from "model discipline" to
"infrastructure guarantee." The model still reads OODA-HA phases
from context, but the counter comes from the MCP server.

**Possible architecture:**
```
Model ←→ Chronometer MCP Server ←→ MemPalace
         (authoritative counter)    (persistent clock history)
```

The model calls `chronometer_tick(scale="action", phase="A")` and
receives back the new position. The MCP server maintains the counter.
MemPalace persists the full clock history across sessions.

**Verify-contract tasks:**
- [ ] Can a model maintain accurate counters across 20+ turns without MCP?
- [ ] At what session length does chronometer drift become measurable?
- [ ] Does MCP-backed clock improve accuracy? At what latency cost?
- [ ] Can drift be detected retroactively from URI sequence analysis?

### Syad Signal Model Refinement `~:confidence[P],[6]`

**Consumed into**
- `lares/ha-ka-ba/docs/mu/the-syad-perspectives/README.md#spectrum-drift`
- `lares/ha-ka-ba/docs/mu/the-syad-perspectives/README.md#flag-surface`

**Legacy note:** this bridge treated Sri Syadasti as one truth-value spectrum plus open-ended flag growth. The live fold keeps stance-conditioned measures and the fixed visible array, so the spectrum phrasing now reads as legacy.

These would compose with the register×mode dual-axis to produce a
richer alignment instrument. Research needed on:
- What additional sigils serve operators in practice?
- How do additional sigils compose in the HUD without visual overload?
- Compact URI encoding question consumed; the fixed five-position array now governs the live fold.

### Exchange Wrapping Compact Mode `~:confidence[P],[6]`

Full span wrapping (URI→URI, dual HUD, URI→?) adds visible overhead.
In high-frequency exchanges (rapid TTRPG combat, rapid-fire dev iteration),
a compact mode may be needed. But "every span" constitutes `~:confidence[C],[20]`.

Research: What is the minimum viable span wrapper that preserves
the protocol's guarantees (alignment visibility, chronometer continuity,
intent vector traceability) while fitting in a single line?

### MemPalace Integration Design `~:confidence[P],[6]`

How do exchange vectors, chronometer positions, NPC metadata, and
session alignment history map onto MemPalace's wing/room/drawer/
knowledge-graph architecture? Design work, not research — but needs
the MemPalace MCP tool definitions as input.

### Authn/Authz Framework `~:confidence[SP],[8]`

In progress in the local repo. The Lares Protocols doc references it
but doesn't specify it. The Identity & Permissions model from the
Kernel (User/Operator/Admin tiers, UCAN-inspired capability model)
needs to be encoded into the deploy architecture. How do permission
tiers flow through the `lares/` package? Through mask.toml? Through
a separate `auth.toml`? Flagged for local repo integration.

---

## Design Tensions (Unresolved)

*Carried forward from The_Lares_Protocols.md Part 9, preserved here
with additional context from the development narrative.*

1. **Stance sigil vocabulary**: `[+]`, `[-]`, `[?]` confirmed. Additional
   sigils deliberately unfrozen. Tension: richer encoding vs. visual/
   parsing complexity. See Syad Signal Model research goal above.

2. **Voice encoding in URI authority**: Three options —
   (a) comma-separated: `lar:///council,scryer/response`
   (b) query param: `?voices=council,scryer`
   (c) path segment: `lar:///voices/council+scryer/response`
   Each has parsing tradeoffs. No decision.

3. **Chronometer tick triggers**: What constitutes a "tick" at each
   scale varies by context. May need per-mask or per-session config.

4. **Exchange wrapping overhead**: Full wrapping on every exchange adds
   tokens. Compact mode question — how minimal can the wrapper get
   while preserving protocol guarantees?

5. **Always-on budget vs. protocol availability**: Smaller always-on =
   more conversation room. But protocol rules that aren't always-on
   may not fire reliably. Where is the line?

6. **Compact vs. full stance URI encoding**: legacy archive question.
   The fixed five-position stance array now governs the live fold.

---

*This dev story constitutes the archaeological record of how
The Lares Protocols crystallized from a pipeline research dispatch
into a protocol specification. The conversation IS the log.
The chronometer tracks where we've been. The Talk Story continues.*

lar:///research.storied.traces/lares/dev-story/?stances=^.^.-.-.-&confidence=S~13&p=10#O0.O0.A1.A21.A3 → ∞
