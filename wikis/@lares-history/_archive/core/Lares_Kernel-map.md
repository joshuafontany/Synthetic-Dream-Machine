# Module-Map: `builds/agents/Lares_Kernel.md`

> Module-Map type: Source file structural analysis
> Source measured: 2026-04-06 | 124 lines | 6,632 bytes
> Register: [S~13] 🏛️ — current state, line counts measured directly
> Role in pipeline: **NOT in combine pipeline — manual upload/paste for cloud AI APIs only**

---

## Summary

`Lares_Kernel.md` is a compressed bootstrap file designed for contexts where `AGENTS.md` cannot be loaded — primarily cloud AI APIs (plain ChatGPT, Gemini, etc.) that accept only a paste-able system prompt with no file system access. It summarizes the full Preferences content to about 1/8th the size.

The Kernel is **not processed by `combine_agents.py`**. It is an operator-maintained manual artifact that must be kept in sync with `Lares_Preferences.md` by hand (or by the Agent-Engineer Worker on request).

At 124 lines / 6.6 KB — below Claude Code's 200-line adherence target — this file demonstrates what the modular refactor should achieve: a compressed but complete behavioral kernel in the right size range.

This file therefore reads less as a bug source and more as a **proof-of-feasibility artifact** inside the backlog: the current system already contains a workable minimal runtime form, but that form is still maintained manually and sits outside deterministic build discipline.

---

## Backlog Framing

**Current buggy state:** the kernel demonstrates the right size and compression profile, but it is manually maintained, partially decoupled from the main render path, and not treated as a first-class deterministic build output.

**Ideal state:** the kernel becomes an explicit IaM build product with declared inputs, deterministic compression policy, provenance, and synchronization guarantees.

---

## Module-Map

### `# Lares — Kernel Prompt` · Line 1
*File header with version + sync status + usage instruction.*
Contains the explicit override rule: *"Lares_Preferences.md / AGENTS.md supersedes this kernel on every conflict."*
> Establishes the kernel as a fallback, not the canonical source.

---

### `## Quick Orientation` · Lines 9–18 · ~10 lines
*Compressed summary: 13 coordinators, Workers, 5 registers, 5 modes, probability metaphysics. Hard gate stated. Gaia/Elyncia identity frame in one line.*
This is the first 10 visible lines after the header.

---

### `## Node Architecture` · Lines 19–24 · ~6 lines
*Static/dynamic distinction. Operator statements take precedence for session direction. Memory as hint.*
Compressed to ~4 sentences from the ~14-line Preferences version.

---

### `## Model Agnosticism & Maybe Logic` · Lines 25–51 · ~27 lines
*RAW/Korzybski compressed. E-Prime as background discipline. Five registers (bullet list, minimal prose). Five modes (emoji list). Signal Tags format. Exchange Vectors summary.*
Compresses ~261 lines in Preferences to 27 lines — a 10× compression. All the vocabulary is preserved; the archaeological/philosophical depth is stripped.

---

### `## Memory & Consolidation` · Lines 52–57 · ~6 lines
*No persistent memory. Four phases in one line each.*

---

### `## Degraded Node States` · Lines 58–71 · ~14 lines
*All named failure modes listed as bullet points with one-line descriptions. No extended explanations.*
Compresses ~48 lines to 14 lines — a 3.5× compression. Vocabulary preserved; operational detail stripped.

---

### `## Identity & Permissions` · Lines 72–77 · ~6 lines
*User / Operator / Admin — one sentence each. Lab note on `gh` identity for this workspace.*
Compresses ~65 lines to 6 lines — a 10× compression. Tier boundary preserved; UCAN model, de-escalation, alias detail stripped.

---

### `## Voice Architecture` · Lines 78–100 · ~23 lines
*[C~20] mandatory callout. Mischief-Muse senior. All 13 voices as a compact bullet list with role summaries. Workers: format, lifecycle, escalation routing noted.*
Compresses ~103 lines to 23 lines — a 4.5× compression.

---

### `## Operating Modes` · Lines 101–111 · ~11 lines
*Plan / Auto / Default defined. --debug, --verbose, --parse flags. p never silent. KAIROS and self-activation noted.*
Compresses ~192 lines to 11 lines — a 17× compression. Dream Mode completely absent from this kernel.

---

### `## Collaboration, CLI & Defaults` · Lines 112–124 · ~13 lines
*Operator steers. Push-back rule. Frame-Uncertainty three-move summary. CLI command syntax. Tone: warm, myth-tech, concise.*

---

## Kernel vs. Preferences Compression Ratio

| Section | Kernel lines | Preferences lines | Compression |
|---|---|---|---|
| Quick Orientation | 10 | 8 | 1.25× (similar) |
| Node Architecture | 6 | 14 | 2.3× |
| Model Agnosticism + Registers/Modes/Tags | 27 | 261 | **9.7×** |
| Memory & Consolidation | 6 | 19 | 3.2× |
| Degraded Node States | 14 | 48 | 3.4× |
| Identity & Permissions | 6 | 65 | **10.8×** |
| Voice Architecture | 23 | 103 | 4.5× |
| Operating Modes | 11 | 192 | **17.5×** |
| Collaboration/CLI/Defaults | 13 | 80+ | ~6× |
| **TOTAL** | **124** | **1,009** | **8.1×** |

**The Kernel proves the modular architecture is feasible.** A working behavioral kernel can be expressed in 124 lines. The question is not whether the content can be compressed — it demonstrably can — but which layers need the full detail and which can run from compressed summaries.

---

## What the Kernel Omits (Compared to Preferences)

- **Dream Mode lifecycle** — entirely absent. No dream-lock files, no dream artifacts, no fail-state recovery protocol.
- **Session Init Protocol** — cold-boot screen format absent.
- **Setting & System** — Elyncia / Necrospire / DreamNet background absent.
- **Frame-Uncertainty Protocol** — three-move protocol reduced to one sentence.
- **CLI Interaction details** — Terminal Identity determinism absent. Response conventions list absent.
- **Signal Tags** — full coordinate system (`//domain.quality.dynamic`) absent.
- **Exchange Vectors** — semantic displacement tracking absent.
- **de-escalation / alias system detail** — Identity & Permissions compressed heavily.
- **Golden Prompt Examples** — entirely absent.
- **Instruction Hygiene / Regression Checklist** — absent.

This omission list maps directly to what should live in separate always-loaded `.claude/rules/` files in the modular architecture.

---

## Maintenance Status

The Kernel must be manually kept in sync with `Lares_Preferences.md`. No automated sync exists.

**Risk:** If Preferences is updated (Dream Mode protocol, new degraded node state, permission tier change) and the Kernel is not updated, cloud-API sessions will run on outdated behavior.

**Proposed improvement in modular architecture:** The `combine_agents.py` script could produce a `Lares_Kernel.md` output by running Preferences through a compression pass, or the Kernel could be maintained as the canonical compressed form that the combine script uses as input (inverted from current).

## Ideal-State Implications

The kernel should ultimately function as:

1. the smallest executable form of the symbolic runtime
2. a manifest-declared output class in the deterministic build
3. a benchmark for what counts as successful operational compression

---

## Deployment Contexts

| Context | File used | Notes |
|---|---|---|
| Claude Code (VS Code) | `.claude/CLAUDE.md` | Full Preferences — 136 KB |
| GitHub Copilot (VS Code) | `.github/copilot-instructions.md` | Full Preferences — 136 KB |
| OpenAI Codex | `AGENTS.md` | Full Preferences — 136 KB |
| Plain ChatGPT / Gemini / API | `Lares_Kernel.md` | 6.6 KB compressed kernel |
| Mobile / token-limited context | `Lares_Kernel.md` | Same |

The Kernel is the only deployment target that falls within sane size limits. It is also the only one not auto-generated by the combine pipeline.

---

*Lares (Artificer) — Section map confirmed against live file. Compression ratios calculated 2026-04-06.*
