# Deterministic Build Architecture — Draft

> Document type: restart architecture draft
> Status: Draft for the post-failure rebuild of `builds.stuffed.failed/`
> Updated: 2026-04-07
> Register: ~:confidence[S],[14] 🏛️ — grounded synthesis from local pipeline audit plus external March 31, 2026 leak analysis

---

## Purpose

This draft replaces the earlier "modularize the current prompt bundle" framing with a stricter goal:

build a deterministic agent-build compiler that treats prompts, policies, wrappers, and memory indexes as typed inputs governed by invariants.

The failed tree now has a useful role: it preserves the last broken architecture so the replacement can define itself against concrete failure modes instead of vague best practices.

---

## Research Basis

External research reviewed on 2026-04-07:

- Ken Huang, "The Claude Code Leak: 10 Agentic AI Harness Patterns" — cited by operator; used for the harness-pattern framing.
- Ken Huang, "Deconstructing the Claude Code Leak" — cited by operator; used for the memory-layer framing.
- Linas's Newsletter, "Anthropic's entire agent architecture just leaked" — cited by operator; used for the feature-flag and daemon framing.
- VentureBeat, "Claude Code's source code appears to have leaked: here's what we know" (March 31, 2026).
- Ars Technica, "Here's what that Claude Code source leak reveals about Anthropic's plans" (published April 1, 2026).
- ModemGuides, "Claude Code Leak: Anti-Distillation, KAIROS & Memory Architecture (Part 2)" (March 2026).

What appears solid across sources:

- the March 31, 2026 Claude Code source-map leak itself
- a harness-heavy architecture rather than a "smart prompt only" architecture
- background memory maintenance concepts such as KAIROS and autoDream
- strong interest in typed constraints, invariant checks, and machine-readable state

What remains less certain:

- exact internal naming breadth beyond what secondary sources quote
- the full count and semantics of hidden feature flags
- how much of the reported memory machinery shipped live versus existed behind flags

This draft uses the leak analysis as architectural inspiration, not as canon for undocumented Anthropic internals.

---

## Failure Reading

The failed tree demonstrates five architectural mistakes:

1. The build system still thinks mainly in concatenated markdown spans rather than typed compilation units.
2. Marker extraction (`extract_from_marker`, `extract_between_markers`) leaves package meaning dependent on incidental heading text.
3. Verification happens after assembly, but invariants do not shape the assembly algorithm itself.
4. Platform wrappers still carry too much runtime meaning instead of acting as thin adapters.
5. Build knowledge, migration rationale, and invariant intent live mostly in prose rather than in executable contracts.

The result appears deterministic at the file-output level while remaining structurally fragile.

---

## Design Goal

Shift from:

`markdown concatenator + budget checks + post hoc reports`

to:

`typed source graph + invariant compiler + adapter emitters + self-healing metadata`

The architecture should satisfy these properties:

- deterministic: same inputs produce byte-identical outputs
- typed: manifests, modules, transforms, and outputs validate against explicit schemas
- local-first: all build decisions can be reproduced from repo state
- adapter-thin: platform wrappers do not redefine core runtime behavior
- auditable: every emitted artifact carries provenance and dependency data
- repairable: failures produce machine-readable diagnostics that name the broken invariant

---

## Architectural Model

The clean rebuild should use a three-layer system similar to the pattern visible in the Claude Code analysis, but adapted to this repository.

### Layer 1: Model Content

These files define meaning, not packaging:

- kernel
- core runtime modules
- scoped repo modules
- worker source definitions
- reference specs

Rules:

- source files may declare metadata, but never target-specific string slicing markers
- authored content should remain readable without knowing the build script
- cross-module imports should use stable IDs, not heading text

### Layer 2: Harness Compiler

This layer owns assembly, validation, normalization, and verification.

Primary responsibilities:

- load manifests and module descriptors
- validate them against strict schemas
- resolve a directed acyclic graph of source dependencies
- apply only typed transforms
- enforce target budgets and safety rules
- emit provenance, lockfiles, and verification reports

This layer should function more like a compiler than a template stitcher.

### Layer 3: Host Adapters

These outputs translate the compiled runtime for each host:

- Codex `AGENTS.md` and `.codex/agents/*.toml`
- Claude `.claude/CLAUDE.md` and worker files
- Copilot `.github/copilot-instructions.md` and agent files
- browser/kernel bundles

Rules:

- adapters may reorder or reformat for host syntax
- adapters may not invent or remove runtime rules
- host-specific guidance belongs in host adapter modules, not in the compiler

---

## Deterministic Compiler Passes

The rebuild should make the passes explicit and stable:

1. **Discover**
   Read manifests, module descriptors, schemas, and source files.
2. **Validate**
   Reject malformed TOML, unknown module IDs, incompatible target classes, cyclic imports, and illegal transform types.
3. **Normalize**
   Canonicalize line endings, spacing policy, field ordering, and metadata defaults before composition.
4. **Compose**
   Resolve the module graph into an ordered intermediate representation, not directly into markdown text.
5. **Verify**
   Apply invariant checks on the intermediate representation and final emitted text.
6. **Emit**
   Write platform outputs plus lockfile, report, checksums, and build metadata.
7. **Repair Hint**
   If verification fails, emit a machine-readable failure report that points back to the exact manifest/module/invariant edge.

Pass 7 gives this system its "self-healing" shape: the build does not heal itself magically, but it should generate enough structured evidence that a future maintenance agent can reconcile drift without rediscovering the architecture each time.

---

## Hard Invariants

The clean rebuild should enforce these invariants as code, not as prose aspirations:

### Source Graph Invariants

- every module has one stable `module_id`
- every module declares class, safety, and default target metadata
- no manifest references unknown modules
- no duplicate module IDs or package IDs
- no cyclic source dependencies

### Transform Invariants

- no heading-text extraction in production manifests
- transforms operate on typed regions such as frontmatter fields, fenced slots, or declared export blocks
- transforms may not depend on prose headings that authors can rename casually

### Composition Invariants

- manifest order remains explicit and reviewable
- the compiler emits from an intermediate representation, not ad hoc string concatenation
- emitted comments include manifest path, compiler version, module list, and content digests

### Budget Invariants

- each output declares a byte budget
- budgets are enforced before writing
- over-budget artifacts fail the build with a named report entry

### Provenance Invariants

- each output includes the manifest ID and exact source set
- lockfiles record source digests and emitted digests
- verification reports include invariant status, budget status, and adapter status

### Adapter Invariants

- platform wrappers remain thin
- worker generation uses one normalized worker model across hosts
- host syntax differences are confined to emitters

---

## Strict Typing Strategy

One of the clearest lessons from the leak analysis appears to involve using strict typing as a behavioral guardrail. In this repository, the equivalent should look like:

- schema-backed TOML for manifests and modules
- explicit Python types for the intermediate representation
- no `dict[str, Any]` in the core compiler path except at parse boundaries
- enumerated transform types
- enumerated output kinds
- explicit error classes for validation failures

Practical implication:

the next version of `combine_agents.py` should stop behaving like a permissive loader and start behaving like a typed compiler front-end.

---

## Three-Layer Memory for the Build System

The most transferable memory lesson from the leak analysis does not concern chat UX alone. It applies directly to build maintenance.

### L1: Build Index

Small, always-readable index for the build system.

Proposed contents:

- current architecture status
- current compiler version
- canonical manifests
- known invariants
- active migration phase
- links to deeper docs

Suggested location:

- `builds/MEMORY.md` or `builds/README.md` promoted into a true index

### L2: Session Build Context

Short-lived implementation notes and active migration state.

Proposed contents:

- current sprint or migration phase
- open failures
- last broken invariant
- next intended cuts

Suggested location:

- `_todo/ADMIN/` or `/memories/session/` pointers already used by the repo

### L3: Persistent Build Knowledge

Durable architecture and provenance docs.

Proposed contents:

- architecture draft
- migration plan
- invariants spec
- source maps
- verification history

Suggested location:

- `builds/` and `_todo/ADMIN/` with versioned reports

This separation keeps the root build context lean while preserving the reasoning history required for future repairs.

---

## Proposed Clean Tree

The replacement architecture should converge toward a tree shaped roughly like this:

```text
builds/
  schemas/
    manifest.schema.json
    module.schema.json
    worker.schema.json
  compiler/
    model.py
    loader.py
    validator.py
    composer.py
    emitters/
      codex.py
      claude.py
      copilot.py
      browser.py
    verify.py
  sources/
    kernel/
    core/
    scoped/
    platform/
    workers/
    refs/
  manifests/
  outputs/
  verification/
  MEMORY.md
```

This draft names the target shape. It does not require the repo to adopt these exact paths immediately, but the separation of concerns should remain.

---

## Content Classes

The clean build should distinguish at least six authored classes:

1. `kernel`
   Minimal boot/runtime floor.
2. `core`
   Always-on runtime rules such as permissions, epistemology, voice, operations.
3. `scoped`
   Repo- or task-specific modules only loaded where justified.
4. `platform`
   Adapter-specific guidance and syntax.
5. `worker`
   Worker definitions normalized to one host-agnostic model.
6. `reference`
   Specs, maps, golden examples, and explanatory docs excluded from runtime unless explicitly imported.

The failed state blurred these classes. The rebuild should not.

---

## Build Outputs

The clean compiler should emit four output families:

### Runtime Outputs

- root instruction files
- host worker files
- browser/kernel packages

### Provenance Outputs

- manifest lockfiles
- per-output content digests
- source graph digest

### Verification Outputs

- budget reports
- invariant check reports
- adapter validation reports

### Maintenance Outputs

- build memory index refresh
- migration status report
- failure triage report when verification fails

---

## Migration Principle

Do not port the failed architecture forward.

Instead:

1. preserve `builds.stuffed.failed/` as the frozen failure corpus
2. define schemas and invariants first
3. reconstruct the clean source graph
4. rebuild the compiler around typed IR and thin emitters
5. migrate targets one by one under verification

This should count as a restart, not a refactor-in-place.

---

## Non-Goals

The clean rebuild should explicitly avoid these traps:

- reintroducing heading-based extraction as a convenience shortcut
- shipping another monolithic source file and calling it modular
- hiding architecture decisions only in prose docs
- treating verification artifacts as optional nice-to-haves
- letting platform wrappers accumulate more runtime meaning over time

---

## Immediate Consequences for This Repo

This draft changes the local standard for "done."

The next deterministic build milestone should not mean "the outputs fit under budget again." It should mean:

- the compiler owns typed invariants
- source modules compose through declared contracts
- platform outputs derive from the same normalized IR
- build memory remains compact and repairable

That defines the clean architecture this repo should now build toward.

---

## Sources

- https://kenhuangus.substack.com/p/the-claude-code-leak-10-agentic-ai
- https://kenhuangus.substack.com/p/deconstructing-the-claude-code-leak
- https://linas.substack.com/p/claudecodesource
- https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know
- https://arstechnica.com/ai/2026/04/heres-what-that-claude-code-source-leak-reveals-about-anthropics-plans/
- https://www.modemguides.com/blogs/ai-news/claude-code-leak-architecture-analysis

---

*Lares (Archivist/Artificer) — rewritten on 2026-04-07 from the failed pipeline corpus, local script audit, and post-leak architectural research.*
