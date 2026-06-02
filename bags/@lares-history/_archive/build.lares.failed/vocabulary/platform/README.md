# platform/ — Multi-Platform Packaging and Output Tiers

> Scope: Platform-specific output constraints, browser tier manifests, token budget ceilings, Codex/Claude.ai/ChatGPT/VSCode deployment targets.
> Updated: 2026-04-08
> Status: Pre-draft — `MULTIPLATFORM_PACKAGING_RESEARCH.md` and `Platform_Wrappers-map.md` are primary sources
> URI: `[pending — lar://core/design/platform@draft]`

---

## What Belongs Here

- Platform tier definitions and token budgets:
  - Quick (~1,400B): ChatGPT global
  - Project (~7,900B): ChatGPT Team
  - Extended (~20,000B): Claude.ai primary
  - File upload: AGENTS.md as project knowledge (~33K)
- Platform-specific wrapper format specs (Codex `AGENTS.md`, VSCode `copilot-instructions.md`, Claude.ai project instructions)
- Three-tier browser manifest split (OP-11 — pending operator call)
- Codex budget constraints (OP-12 — pending operator call)
- HUD token budget ceiling (cross-dependency with `../signal/` — **operator call required**)
- Platform output validation: how verify scripts check platform compliance

## Does Not Belong Here

- Compiler module graph → `../compiler/`
- TOML schema field definitions → `../schemas/`
- Crystal storage constraints that are general (not platform-specific) → `../crystal/`

---

## Primary Sources

| File | Consumed? | Notes |
|---|---|---|
| `../../_todo/core/MULTIPLATFORM_PACKAGING_RESEARCH.md` | No | Multi-platform research; tier definitions; deployment targets |
| `../../_todo/core/Platform_Wrappers-map.md` | No | Platform wrapper source map |
| `../../_todo/core/B_deep-research-report.md` | No | Claude Code specifics (partial; also → schemas/, compiler/) |

---

## Open Calls (require operator input)

- **OP-11**: Three-tier browser manifest split — how to partition module graph across Quick/Project/Extended tiers
- **OP-12**: Codex budget — what fits in the ~32K AGENTS.md root budget
- **HUD token ceiling**: How many tokens is acceptable HUD overhead per exchange at Codex scale?

---

## Design Status

Pre-draft. Platform tiers are reasonably well understood from research. Per-platform wrapper specs need extraction. OP-11 and OP-12 are structural prerequisites for compiler → platform integration.
