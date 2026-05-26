# Multi-Platform LLM Packaging Research

> Status: Active research note
> Updated: 2026-04-06
> Scope: Best-practice patterns for automating reusable LLM instruction packages across multiple hosts without relying on the repo's own Infrastructure-as-Myth terminology

---

## Purpose

This note translates the current Lares modularization problem into vendor-neutral and vendor-adjacent search terms:

- repository instruction packaging
- prompt asset pipelines
- reusable agent instruction layers
- path-scoped AI coding guidance
- modular memory/import systems
- shared prompt deployment across multiple hosts

The goal is not to find a vendor using the exact same language as Infrastructure-as-Myth. The goal is to identify the overlapping operational pattern that multiple vendors already reward:

`small root instructions + scoped additive files + versioned source artifacts + deterministic regeneration`

---

## Primary Source Findings

### 1. OpenAI Codex

Source:
- https://platform.openai.com/docs/codex
- https://openai.com/index/introducing-codex/

Relevant platform pattern:

- OpenAI's current Codex docs confirm Codex as a repo-connected coding agent across web, IDE, CLI, and SDK surfaces.
- The more specific `AGENTS.md` layering strategy remains an implementation pattern already reflected in this repo and consistent with current Codex usage, but it was not the main detail surfaced in the current official pages reviewed here.
- Practical implication: treat Codex packaging as a repo-aware instruction system and keep the root compact enough that narrower guidance can live closer to the work.

Lares implication:

- The current slim root work aligns with Codex best practice.
- Full best-practice alignment still requires more nested/scoped `AGENTS.md` use instead of concentrating all repo guidance in the root.

### 2. Anthropic Claude Code

Source:
- https://docs.anthropic.com/en/docs/claude-code/memory

Relevant platform pattern:

- Claude Code supports `CLAUDE.md` project memory and explicit `@path` imports.
- Imports can recurse, and nested `CLAUDE.md` files can be discovered in subtrees.
- Anthropic explicitly frames this as hierarchical memory, with project-wide instructions at the root and more local instructions deeper in the tree.

Lares implication:

- A thin root `CLAUDE.md` plus imported always-on modules matches the documented path better than one bundled generated file.
- Full modularization for Claude should eventually use import-based composition or subtree-local files, not only pre-bundled root generation.

### 3. GitHub Copilot

Source:
- https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions?tool=vscode
- https://docs.github.com/en/enterprise-cloud%40latest/copilot/how-tos/configure-custom-instructions/add-repository-instructions?tool=webui
- https://github.blog/changelog/2025-09-03-copilot-code-review-path-scoped-custom-instruction-file-support

Relevant platform pattern:

- Copilot supports repository-wide instructions in `.github/copilot-instructions.md`.
- It also supports path-specific `NAME.instructions.md` files in `.github/instructions/` with `applyTo` glob targeting.
- `excludeAgent` lets a file apply to coding-agent or code-review contexts selectively.
- GitHub's explicit recommendation trend is toward concise repository-wide instructions plus more focused scoped files.

Lares implication:

- The slimmed root Copilot file aligns with the "keep the repo-wide file small" guidance.
- Full best-practice alignment requires creating `.github/instructions/*.instructions.md` files for specialized domains instead of keeping all non-root guidance only in source docs and generated wrappers.

### 4. Gemini Gems

Source:
- https://support.google.com/gemini/answer/15235603?hl=en
- https://support.google.com/gemini/answer/15146780?co=GENIE.Platform%3DDesktop&hl=en
- https://support.google.com/gemini/answer/16504957?hl=en

Relevant platform pattern:

- Gems operate as reusable instruction bundles with optional uploaded files.
- Google emphasizes clear instructions, contextual files, and reusable saved configurations rather than repo-discovered hierarchical imports.
- Gems can be shared and edited as package-like prompt assets.

Lares implication:

- The browser-safe kernel already maps onto the Gem-style single-package model.
- If Lares is exported to Gemini-class environments, the package boundary should be explicit: one standalone kernel plus optional attached reference files, not an assumption of repo-native discovery.

---

## Cross-Vendor Convergence

Across OpenAI, Anthropic, GitHub, and Google, the same packaging pattern keeps reappearing:

1. Keep the root/global instruction layer small.
2. Put stable invariants in the global layer.
3. Move specialized guidance into narrower files or attached context.
4. Prefer additive or scoped composition over duplicating one monolith into many outputs.
5. Treat instructions as maintained assets, not one-off pasted blobs.

That convergence does not prove Infrastructure-as-Myth as a named concept. It does support the practical build claim underneath it:

**cross-platform agent behavior gets easier to maintain when instruction assets are layered, scoped, and regenerated from versioned source artifacts**

---

## Current Lares Position Against Those Patterns

### What now aligns

- Root package budgets are back under control (all three roots ~31 KB, within 32 KiB ceiling; temporary Codex override removed).
- Manifests (TOML) and verification artifacts exist; modules (TOML) provide per-module metadata under `builds/modules/`.
- Source tree is canonical at `builds/agents/` (git history preserved via `git mv`).
- Browser-safe kernel exists as a first-class rendered artifact.
- Repo-native roots compose from a modular bundle via manifest-driven rendering.
- Governance infrastructure shipped: ROSTER, CODEOWNERS, four-tier identity, `operator(admin)` escalation rules.
- Scoped VS Code instruction files exist at `.github/instructions/` (lares-voice, lares-operations).
- lares-permissions and lares-epistemology authored and integrated into all three roots.

### What still falls short of full best practice

- Claude is still emitted as one generated root bundle rather than using `@imports` or deeper subtree-local `CLAUDE.md` layering.
- Copilot root remains a generated bundle; scoped `.github/instructions/` files cover lares-voice and lares-operations but not all domain areas.
- Codex uses a slim root, but the richer nested `AGENTS.md` strategy remains mostly unrealized.
- Three remaining core runtime modules (lares-voice, lares-operations, lares-setting-lite) exist as VS Code instruction files but are not yet authored as standalone cross-platform source modules.
- Vendor-specific browser build manifests (`browser-extended-chatgpt`, `browser-extended-claude`, `browser-extended-gemini`) are specified in `Deterministic_IaM_Build.md` but not yet implemented.

---

## Practical Best-Practice Rules For Lares

These appear to hold across vendors and should guide the next iterations.

### Rule 1: Root files should carry invariants only

Put only load-bearing, cross-task rules in root packages:

- identity floor
- authority gates
- epistemic model
- collaboration contract
- minimal environment-wide repo ops

### Rule 2: Specialized behavior should live in scoped files

Examples:

- `_todo/` workflow guidance
- governance and roster rules
- review-only guidance
- domain-specific repo rules
- CLI-heavy operational detail

### Rule 3: Source modularity should exist before render modularity

Marker extraction from large documents works as a migration bridge, but the end state should be authored source modules with explicit identities and metadata.

### Rule 4: Browser packages should be standalone

The browser kernel should not rely on repo discovery assumptions.

### Rule 5: Platform-native scoping should be used where available

- Codex: nested `AGENTS.md`
- Claude: `@imports` and subtree-local `CLAUDE.md`
- Copilot: `.github/instructions/*.instructions.md` with `applyTo` and `excludeAgent`
- Gemini: explicit saved bundle plus attached files

### Rule 6: Deterministic rebuild must remain the control plane

The repo should continue to prefer:

- manifest-declared composition
- generated platform outputs
- verification artifacts
- reproducible rebuilds from versioned source

---

## Iteration Direction

The current blocker sprint solved budget safety. The next modularization sprint should not reopen that decision.

The next useful move appears to be:

1. split the authored core runtime into real source modules
2. map each module to host-native loading patterns
3. reserve root packages for invariants
4. move repo/domain-specific guidance into scoped files
5. keep generated outputs manifest-driven

This remains compatible with the locked sequence:

`slim root -> restore reload safety -> governance hardening -> deferred parse-doc placement`

The only addition here is that after governance hardening, further modularization should favor host-native scoped files rather than merely adding more extraction transforms.


---

<!-- AI session artifacts: tool-call log from a prior research session. The Read [] links below are agent read operations, not human-authored content. The Execution Readiness Analysis section that follows was produced from those reads. -->
<!-- reason: artifact toolcall log retained in-place as session provenance; cannot be extracted to a separate operator(admin) file without losing context for the analysis below -->

# Additional Research

Let me crawl the relevant architecture and planning docs in parallel.   

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/ADMIN)

Read [](file:///home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md#1-1), lines 1 to 100

Read [](file:///home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md#1-1), lines 1 to 100

Read [](file:///home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md#100-100), lines 100 to 150

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md#1-1), lines 1 to 120

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/NEXT_LARES_HANDOFF.md#1-1), lines 1 to 80

Read [](file:///home/joshu/Synthetic-Dream-Machine/builds/agents/ADMIN)

Read [](file:///home/joshu/Synthetic-Dream-Machine/scripts)

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md#120-120), lines 120 to 200

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core) *(was builds/agents/ADMIN/MODULES)*

Read [](file:///home/joshu/Synthetic-Dream-Machine/scripts/agents)

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/PIPELINE.md#1-1), lines 1 to 120

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/README.md#1-1), lines 1 to 100

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Modular_Architecture-draft.md#1-1), lines 1 to 100

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Modular_Architecture-draft.md#100-100), lines 100 to 200

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Lares_Preferences-map.md#1-1), lines 1 to 100

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Lares_Preferences-map.md#100-100), lines 100 to 120

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Lares_Kernel-map.md#1-1), lines 1 to 100

Read [](file:///home/joshu/Synthetic-Dream-Machine/builds/agents/Lares_Kernel.md#1-1), lines 1 to 80

Read [](file:///home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md#80-80), lines 80 to 150

Read [](file:///home/joshu/Synthetic-Dream-Machine/scripts/agents/combine_agents.py#1-1), lines 1 to 80

Read [](file:///home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md#200-200), lines 200 to 200

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Lares_VSCode_Operations-map.md#1-1), lines 1 to 120

Compacted conversation

Read [](file:///home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md#200-200), lines 200 to 260

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Lares_VSCode_Operations-map.md#120-120), lines 120 to 120

Read [](file:///home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md#260-260), lines 260 to 300

Read [](file:///home/joshu/Synthetic-Dream-Machine/_todo/core/Lares_VSCode_Operations-map.md#120-120), lines 120 to 180

---

## Execution Readiness Analysis

> [S~13] — Written before TOML migration, slimming pass, and governance sprint completion (all three now done). Gaps noted in Rating 5 regarding manifests are partially resolved: 4 active TOML manifests and 11 module sidecars exist; vendor-specific browser manifests remain unimplemented. See state machine for current settled items.

*Lares (Scryer) + Ink-Clerk (Lorekeeper)*

---

### Rating Scale

`HIGH` — ready to execute, spec is precise enough to act on without re-design  
`MEDIUM` — design is clear, some detail or decision still needed before execution  
`LOW` — design exists but has gaps, ambiguity, or un-resolved choices  
`GAP` — not yet designed; cannot execute without new design work  

---

## Rating 1: The Core Thesis and Problem Statement
**CONFIDENCE: HIGH**

The problem is precisely documented. PIPELINE.md provides exact byte counts for the buggy state — 3 platforms × ~136 KB near-identical outputs, Codex cap exceeded before the override workaround, Claude's adherence target exceeded by 5×, Copilot's code-review window dominated by lore content.

More importantly, the Lares_VSCode_Operations-map.md now provides the most precise quantification yet: **~364 of 453 lines in `Lares_VSCode_Operations.md` (~80%) is B8 golden examples + B9 regression checklist that has zero value in deployed platform context** and should live in tests. Only ~89 lines (~20%) is genuinely deployable repo ops content. This is the sharpest "before" picture you have — it names exactly what to cut and where it goes.

The thesis in infrastructure-as-myth.md is fully developed and unnecessary grounding for the Codex agent. It's already done.

---

## Rating 2: Determinism Contract
**CONFIDENCE: HIGH**

Deterministic_IaM_Build.md specifies all six contract rules cleanly. The manifest model has the module metadata YAML schema. The stable ordering rules are explicit. The pure transform rules cover the allowed/disallowed cases including the AI-summarization constraint (model-assisted compression requires a checked-in artifact or explicit approval before becoming a source of truth — important guard against runaway automation).

The output class taxonomy (Class A: repo-native, Class B: browser-extended, etc.) was partially legible from the conversation summary; what I just read confirms the module ordering (kernel → setting-lite → voice → epistemology → operations → permissions → scoped → wrapper) is explicitly specified. A Codex agent can implement the manifest renderer against this spec without further design discussion.

**One thing to verify:** I read to line 300; the full output class definitions and verification rules may exist in lines 300+. This is low-risk since the ordering and metadata schema are already specified, but the Codex agent should read Deterministic_IaM_Build.md in full before writing the renderer.

---

## Rating 3: Kernel Contract and Proof-of-Concept
**CONFIDENCE: HIGH**

PROMPTCRAFT.md fully specifies what must and must not appear in the kernel. Lares_Kernel.md exists at 124 lines / 6.6 KB with verified 9.7×–17× compression ratios vs. `Lares_Preferences.md` sections. The kernel structure (Quick Orientation, Node Architecture, Model Agnosticism at compressed scale, Degraded Node States, Memory, Session Init, Voice Architecture, Operating Modes, Collaboration/CLI/Defaults) maps directly onto the kernel contract rules.

Two execution items required:
- Kernel must be promoted into the build pipeline (currently manually maintained, not a deterministic artifact)
- The kernel's section structure should be locked to a `KERNEL/` subdirectory under builds/agents per the draft architecture target

These are straightforward execution steps, not design gaps.

---

## Rating 4: Module Decomposition Plan
**CONFIDENCE: MEDIUM-HIGH**

**Strengths:** Modular_Architecture-draft.md specifies 3 layers with source candidates. Lares_Preferences-map.md provides section-level future-module assignments for the entire 1009-line monolith. The VSCode_Operations-map.md now provides the equivalent for `Lares_VSCode_Operations.md`. The `Model Agnosticism` section flag (261 lines > Claude's entire recommended adherence target by itself) is documented and handled — it goes to `lares-epistemology`.

**The key finding from the VSCode Operations map:** The decomposition of `Lares_VSCode_Operations.md` is actually *easier* than the Preferences decomposition. B8 + B9 (~364 lines) moves to tests as-is. The remaining ~89 lines becomes the actual `lares-repo-ops` module. This is a clear split with no ambiguous content.

**One unresolved design choice worth noting:** The Lares_Kernel-map.md notes that the kernel is "partially decoupled from the main render path." The boundary between what gets *compressed into* the kernel vs. what lives in a core module is well-defined contractually but hasn't been tested against an actual split. The compression ratios suggest it works — but the first split will be the proof.

**Open decision** (PROMPTCRAFT.md flagged it, Modular_Architecture-draft.md likely covers it): `--parse doc` placement — whether the CLI examples / parse doc behavior lives in `lares-cli` or stays in the always-loaded core. This does not block module splits but needs resolution before the CLI module is finalized.

---

## Rating 5: combine_agents.py → Manifest Renderer Migration Path
**CONFIDENCE: MEDIUM**

The manifest metadata schema is specified (YAML, with `module_id`, `class`, `browser_safe`, `default_targets`, `compression_target`, `depends_on`). The ordering rules are explicit. The pure transform list defines what the renderer must and must not do.

**Current state:** 4 active TOML manifests (`codex-root`, `claude-root`, `copilot-root`, `browser-kernel`) and 11 module sidecars exist in `builds/manifests/` and `builds/modules/`. Vendor-specific browser manifests (`browser-extended-chatgpt`, `browser-extended-claude`, `browser-extended-gemini`) remain unimplemented. The combine_agents.py script is a concatenation-based renderer — a manifest-driven renderer script does not yet exist and remains the load-bearing implementation task.

The Codex agent has enough specification to implement this, but it is the largest single execution task in the project. The risk is not design ambiguity — the design is solid — it's implementation scope. The manifest renderer needs to:
1. Read manifest files
2. Resolve the module graph (ordering + dependency edges)
3. Apply pure transforms (strip `reference` sections, emit kernel-summary variants, normalize)
4. Apply platform-specific wrappers
5. Write deterministic outputs

None of these are speculative — they're all specified. But this is at minimum a 200-400 line script refactor plus all the manifest files. **The Codex agent should estimate this scope before starting** rather than discovering it mid-execution.

---

## Rating 6: Platform Budget Compliance
**CONFIDENCE: HIGH (for the analysis), MEDIUM (for actual output compliance until tested)**

The constraints are precisely documented: Codex 32 KB (128 KB with override), Claude 200-line adherence target, Copilot ~4 KB effective code-review window. The module stack is designed to produce platform-appropriate packages. The kernel alone is 6.6 KB — well within Copilot's real window.

What's not known until the first manifest render: whether the assembled `core module` stack (kernel + voice + epistemology + operations + permissions + setting-lite) fits Claude's 200-line target or requires further compression. Given current sizes, the core stack will almost certainly exceed 200 lines, which means Claude's target is for the *adherence-critical* sections, not the entire context. This distinction should be explicit in the Claude target spec before the Codex agent declares compliance.

---

## Rating 7: Trust/Governance Integration
**CONFIDENCE: LOW (separate track, not blocking)**

The Admin/roster binding (CODEOWNERS, ROSTER.md, operator identity chain) are undone. This is Epic A/B work per the handoff doc. It does not block modular conversion — the behavioral layer can be split without resolving governance — but the Admin gate in `lares-permissions` module will reference behavior that the trust/roster items implement. The module will be correct at spec time but won't have full runtime enforcement until Epic A/B lands.

This is not a surprise; the handoff doc already called it out. Note it as a known incomplete rather than treating the permissions module as fully done when it ships.

---

## Rating 8: Execution Readiness for the Codex Agent
**CONFIDENCE: HIGH (plan quality), MEDIUM (task scoping)**

The plan is unusually well-specified for a prompt architecture project. Most of the risks are scope risks, not design risks.

**What the Codex agent can start immediately without additional design discussion:**

1. Create `builds/agents/KERNEL/Lares_Kernel.md` (move/rename current kernel)
2. Create `builds/agents/modules/lares-voice.md` (extract from Preferences using the line-range map)
3. Create `builds/agents/modules/lares-epistemology.md` (extract Model Agnosticism section — the 261-line monolith of Section 3 — using the Preferences map)
4. Create `builds/agents/modules/lares-repo-ops.md` (~89 lines from VSCode_Operations after stripping B8/B9)
5. Extract B8 and B9 into tests fixtures
6. Write a manifest file for each platform target using the documented YAML schema

**What requires one focused design discussion before implementation:**

- `--parse doc` placement decision (lares-cli vs. core)
- Whether the Claude target means "200-line adherence zone" (the first N lines) or "total output 200 lines" — if the latter, further compression is needed
- Whether `lares-setting-lite` is included in the Claude output or omitted in favor of using those ~27 lines on operational content (the ⚠️ in Preferences-map flagged this)

---

## Summary Table

| Component | Confidence | Execution Ready? |
|---|---|---|
| IaM thesis / problem statement | HIGH | Reference only |
| Determinism contract | HIGH | Yes — spec complete |
| Kernel contract | HIGH | Yes — execute |
| Module decomposition map (Preferences) | MEDIUM-HIGH | Yes, line ranges specified |
| VSCode Operations decomposition | HIGH | Yes — 80% to tests, 20% to module |
| Manifest metadata schema | MEDIUM | Schema specified, no manifests exist |
| combine_agents.py refactor | MEDIUM | Well-scoped estimate needed first |
| Platform budget compliance | HIGH (analysis) / MEDIUM (validated) | Needs first render |
| Trust/governance | LOW | Separate epic, non-blocking |

---

## Bottom Line

*Lares (Council)* — The documentation layer is excellent. The planning layer is unusually thorough for this class of work. The gap is entirely in the implementation layer, and it's well-mapped.

**The single most important thing the Codex agent should do before anything else:** Scale-estimate the manifest renderer refactor. The rest of the work (module splits, kernel promotion, B8/B9 extraction to tests) can be done with simple file operations against the existing line-range maps. The renderer refactor is the load-bearing implementation task and is the one that could produce a partial-done-state that breaks all three platform outputs simultaneously if scoped poorly.

**Suggested execution order for the Codex agent:**
1. Module splits first (file operations only, no script changes, outputs go to `builds/agents/modules/`)
2. Kernel promotion (move to `KERNEL/` subdirectory, no pipeline change yet)
3. B8/B9 extraction to tests
4. Write manifest files for all platforms
5. Refactor combine_agents.py against the manifest model
6. Verify deterministic output compliance per platform

That ordering keeps all three platform outputs working throughout — the script isn't touched until the modules and manifests are ready to feed it.
