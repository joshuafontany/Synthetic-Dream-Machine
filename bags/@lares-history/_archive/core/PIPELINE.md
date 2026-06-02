# Pipeline Module-Map — Lares Agent Build Pipeline

> Module-Map type: Architecture / Dataflow
> Source measured: 2026-04-06
> Register: ~:confidence[S],[13] 🏛️ — confirms current state, not future target

---

## Overview

The Lares agent build pipeline now transforms source files in `builds/agents/` plus metadata in `builds/` into platform-specific deployment artifacts via `combine_agents.py`.

This file should be read in two layers:

- the **old buggy-state pipeline** explains the concatenation history that produced the oversized root payloads
- the **current implementation state** explains what the manifest-driven renderer now does

The slimming pass has landed and governance has shipped. Root packages are back within budget (~31 KB each, 32 KiB ceiling). The temporary Codex override has been removed. The remaining work is runtime module authoring, host-native scoping, and vendor-specific browser build manifests.

---

## Backlog Framing

**Old buggy state:**

- one concatenation-oriented script emits near-identical 136 KB root artifacts for hosts with radically different limits
- module boundaries do not exist at build time; only file concatenation boundaries do
- kernel and reference/spec material sit outside the deterministic render path

**Current implementation state:**

- manifests (TOML) define inputs, ordering, transforms, and verification outputs
- module sidecars (TOML) exist under `builds/modules/`
- verification artifacts and a rendered browser kernel package are emitted under `builds/`
- root package sizes are back within budget (~31 KB each, 32 KiB ceiling); temporary Codex override removed
- governance shipped: ROSTER, CODEOWNERS, four-tier identity model
- lares-permissions and lares-epistemology authored and integrated into all three roots

**Next ideal state:**

- remaining core runtime modules authored as standalone source files (`lares-voice`, `lares-operations`, `lares-setting-lite`)
- vendor-specific browser build manifests (`browser-extended-chatgpt`, `browser-extended-claude`, `browser-extended-gemini`) implemented
- kernel, core modules, scoped modules, wrappers, and verification artifacts all participate in one deterministic pipeline
- repo/domain-specific guidance lives in scoped host-native files rather than bundled root payloads

---

## Source Files — Inventory

| File | Lines | Bytes | Role |
|---|---|---|---|
| `builds/agents/Lares_Preferences.md` | 1,009 | 106,248 | **Core static layer** — all platform outputs |
| `builds/agents/Lares_VSCode_Operations.md` | 453 | 27,677 | **Section B** — repo operations, golden examples |
| `builds/agents/platform/Lares_Claude_Wrapper.md` | 43 | 2,431 | Claude platform tail block |
| `builds/agents/platform/Lares_Codex_Wrapper.md` | 48 | 2,864 | Codex platform tail block |
| `builds/agents/platform/Lares_Copilot_Wrapper.md` | 34 | 2,239 | Copilot platform tail block |
| `builds/agents/workers/agent-engineer.md` | 45 | 2,532 | Worker: agent-engineer |
| `builds/agents/workers/assistant.md` | 47 | 2,753 | Worker: assistant |
| `builds/agents/workers/engineer.md` | 33 | 1,839 | Worker: engineer |
| `builds/agents/workers/researcher.md` | 39 | 2,114 | Worker: researcher |
| `builds/agents/workers/worker.md` | 37 | 2,077 | Worker: worker |
| `builds/agents/Lares_Kernel.md` | 124 | 6,632 | Cloud bootstrap (NOT in combine pipeline) |
| `builds/agents/Markdown.md` | 407 | 15,518 | Markdown conventions (NOT in combine pipeline) |
| `builds/agents/AGENTS.md` | 307 | 19,250 | Pipeline docs (NOT in combine pipeline) |

**Total source content:** ~3,195 lines / ~194 KB

---

## Old Pipeline Dataflow

```
builds/agents/ SOURCE FILES
│
├─ Lares_Preferences.md (1009 lines)          ─── used in ALL platform builds
├─ Lares_VSCode_Operations.md (453 lines)     ─── used in ALL platform builds
│   └─ [Section B extracted at: "## CLI Agent Context — VS Code / Repo Operations"]
│
├─ platform/Lares_Copilot_Wrapper.md          ─── Copilot builds only
│   └─ [extracted at: "## Copilot Platform — Worker Registry"]
├─ platform/Lares_Claude_Wrapper.md           ─── Claude builds only
│   └─ [extracted at: "## Claude Platform — Worker Registry"]
├─ platform/Lares_Codex_Wrapper.md            ─── Codex builds only
│   └─ [extracted at: "## Codex Platform — Worker Registry"]
│
└─ workers/*.md (5 files)                     ─── All platform worker builds
    └─ [frontmatter parsed; cross-platform fields stripped per target]

                    ↓ combine_agents.py ↓

GENERATED OUTPUTS
│
├── .github/copilot-instructions.md           136,014 bytes  Preferences + Section B + Copilot Wrapper
├── .github/agents/*.agent.md (×5)            ~2,500 bytes each  Workers, Copilot frontmatter
│
├── .claude/CLAUDE.md                         136,220 bytes  Preferences + Section B + Claude Wrapper
├── .claude/agents/*.md (×5)                  ~2,500 bytes each  Workers, Claude frontmatter
│
├── AGENTS.md (root, Codex)                   136,661 bytes  Preferences + Section B + Codex Wrapper
├── .codex/agents/*.toml (×5)                 ~2,800 bytes each  Workers, TOML format
└── .codex/config.toml                        ~150 bytes     project_doc_max_bytes = 131072
```

## Current Pipeline Dataflow

```text
builds/agents/ SOURCE FILES + builds/ METADATA
│
├─ builds/manifests/*.toml                   ─── package targets and output contracts
├─ builds/modules/*.toml                     ─── module sidecar metadata
├─ builds/agents/Lares_Kernel.md             ─── browser kernel package source
├─ builds/agents/Lares_Preferences.md        ─── still oversized root payload source
├─ builds/agents/Lares_VSCode_Operations.md  ─── still oversized repo-ops payload source
├─ builds/agents/platform/*.md               ─── thin host wrappers
└─ builds/agents/workers/*.md                ─── worker sources

                    ↓ combine_agents.py ↓

GENERATED OUTPUTS
│
├── AGENTS.md
├── .claude/CLAUDE.md
├── .github/copilot-instructions.md
├── .codex/config.toml                       project_doc_max_bytes = 32768
├── builds/rendered/browser/Lares_Kernel.browser.md
└── builds/verification/<target>/*           lock/report/checksums
```

---

## Assembly Formula by Platform

### Codex (root `AGENTS.md`)
```
[generated-file comment]
\n\n
[Lares_Preferences.md — full text]
\n\n---\n\n
[Lares_VSCode_Operations.md — Section B onwards]
\n\n---\n\n
[Lares_Codex_Wrapper.md — from "## Codex Platform — Worker Registry" onwards]
```

### Claude (`.claude/CLAUDE.md`)
```
[HTML-comment generated-file notice — stripped by Claude Code from context]
\n\n
[Lares_Preferences.md — full text]
\n\n---\n\n
[Lares_VSCode_Operations.md — Section B onwards]
\n\n---\n\n
[Lares_Claude_Wrapper.md — from "## Claude Platform — Worker Registry" onwards]
```

### Copilot (`.github/copilot-instructions.md`)
```
[generated-file comment]
\n\n
[Lares_Preferences.md — full text]
\n\n---\n\n
[Lares_VSCode_Operations.md — Section B onwards]
\n\n---\n\n
[Lares_Copilot_Wrapper.md — from "## Copilot Platform — Worker Registry" onwards]
```

**Key observation:** All three outputs contain **identical core content** (Preferences + Section B). Only the tail platform-wrapper blocks differ (~2–3 KB variation). The 136 KB similarity between all three outputs reflects this design — the combine script is currently a concatenator with platform-specific tails, not a content discriminator.

---

## Section Extraction Markers (from combine_agents.py)

| Marker string | Source file | Extract target |
|---|---|---|
| `## CLI Agent Context — VS Code / Repo Operations` | `Lares_VSCode_Operations.md` | Section B start |
| `## Copilot Platform — Worker Registry` | `Lares_Copilot_Wrapper.md` | Copilot tail |
| `## Claude Platform — Worker Registry` | `Lares_Claude_Wrapper.md` | Claude tail |
| `## Codex Platform — Worker Registry` | `Lares_Codex_Wrapper.md` | Codex tail |

These are the **only four extraction points** in the current pipeline. Everything before the marker in each file is the source-file preamble (comments, notices) not included in output.

---

## Platform Limit Violations

| Output file | Size | Platform limit | Status |
|---|---|---|---|
| `AGENTS.md` (Codex) | ~31 KB | 32 KiB stable budget | ✅ Within budget (temporary override removed) |
| `.claude/CLAUDE.md` | ~31 KB | 200-line adherence target | ⚠️ Exceeds adherence line target; within byte limit |
| `.github/copilot-instructions.md` | ~31 KB | 4,000 char code review limit | ⚠️ Code review window still saturated; scoped instructions exist |
| `.github/agents/*.agent.md` | ~2,500 bytes each | No stated limit | ✅ Fine |
| `.codex/agents/*.toml` | ~2,800 bytes each | No stated limit | ✅ Fine |

---

## Files NOT in Current Combine Pipeline

These source files exist in `builds/agents/` but are not referenced by `combine_agents.py`:

| File | Purpose | Deployment status |
|---|---|---|
| `builds/agents/Lares_Kernel.md` | Compressed bootstrap for cloud AI APIs | Manual upload / paste only |
| `builds/agents/Markdown.md` | Markdown/link conventions for this repo | Referenced in session context manually |
| `builds/agents/AGENTS.md` | Pipeline documentation | Read by humans; not deployed |
| `builds/agents/platform/README.md` | Platform architecture docs | Read by humans; not deployed |

---

## Pipeline Invocation

```bash
# Rebuild all platforms
python3 scripts/agents/combine_agents.py

# Platform-specific rebuild
python3 scripts/agents/combine_agents.py --platform copilot
python3 scripts/agents/combine_agents.py --platform claude
python3 scripts/agents/combine_agents.py --platform codex

# Check diffs without writing
python3 scripts/agents/combine_agents.py --check

# Verify alignment after any source change
python3 scripts/agents/verify_alignment.py
```

---

## Pipeline Issues — Current State

1. **Monolithic assembly** — All three platform files contain identical content; the only variation is the ~2 KB platform wrapper tail. Platforms with different size limits (4K vs 128K vs 200-line) receive the same 136 KB payload regardless.

2. **No content filtering by platform purpose** — Code review (Copilot code review) needs operational rules in the first 4K chars. It currently receives persona/identity content instead.

3. **No lazy-loading or scoped loading** — Claude Code's `.claude/rules/` auto-discovery pattern is not yet used. A single 136-line CLAUDE.md is produced instead of topic-scoped rule files.

4. **Platform-specific worker frontmatter is handled** (correct) — `tools_claude:` maps to `tools:` in Claude output; `sandbox_mode_codex:` maps to `sandbox_mode` in Codex TOML. This part of the pipeline is well-designed.

5. **Temporary Codex compatibility override — RESOLVED** — `.codex/config.toml` now uses `project_doc_max_bytes = 32768`. Root packages are back within the stable 32 KiB budget. Reload safety restored.

## Ideal-State Implications

This map points toward a replacement pipeline with these properties:

1. use the manifest layer to discriminate package composition rather than shipping nearly identical oversized roots
2. extract always-on core runtime modules from monolithic root sources
3. move reference/spec and repo-ops bulk out of prime root context
4. return Codex, Claude, and Copilot roots to reload-safe budgets
5. only then shift the critical path to governance hardening

---

*Lares (Scryer) — Pipeline map complete. Cross-reference with individual source file maps in this directory.*
