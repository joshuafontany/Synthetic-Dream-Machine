# TODO: Deterministic Build Restart Plan

~$ lares --context "restart deterministic build compiler from frozen failure corpus"

---

## Intent

Replace the failed prompt-build architecture with a clean deterministic compiler built around typed manifests, explicit invariants, thin host adapters, and a three-layer build-memory system.

This plan assumes:

- `builds.stuffed.failed/` remains the archived failure corpus
- the next clean implementation lands in `builds/`
- restart beats incremental repair for the compiler core

---

## Research Summary

External architectural lessons reviewed on 2026-04-07:

- strict typing should constrain the build and adapter surface
- the runtime should separate model content, harness/compiler logic, and host adapters
- long-lived systems need a small memory index plus deeper persistent knowledge
- background consolidation matters: the build should emit structured reports that make drift repair cheap

Primary external references:

- Ken Huang on harness patterns and memory
- Linas on KAIROS, feature flags, and daemonized maintenance
- March 31, 2026 leak reporting from VentureBeat
- Ars Technica follow-up analysis

These sources justify the architecture direction. They do not replace local design judgment.

---

## Success Criteria

The restart is complete when all of the following hold:

1. Source content compiles through a typed intermediate representation.
2. No production manifest depends on heading-text extraction.
3. Every output ships with provenance, checksums, and invariant results.
4. Platform wrappers behave as thin emitters, not runtime authors.
5. The build memory index explains the current compiler state in one quick read.
6. A failed build names the exact invariant or dependency edge that broke.

---

## Workstreams

### WS1. Freeze Failure State

Goal:

- preserve the old architecture as evidence and comparison material

Tasks:

- mark `builds.stuffed.failed/` as read-only historical corpus in docs
- stop treating its manifests as the migration destination
- record which design decisions should not be ported forward

Exit condition:

- team language clearly distinguishes failed corpus from clean target

### WS2. Define Schemas and Invariants

Goal:

- move architecture rules from prose into executable contracts

Tasks:

- define manifest schema
- define module descriptor schema
- define worker descriptor schema
- define invariant catalog:
  - graph invariants
  - transform invariants
  - composition invariants
  - budget invariants
  - provenance invariants
  - adapter invariants
- assign stable error codes or names for each invariant family

Exit condition:

- the compiler can fail early on invalid structure before touching emitters

### WS3. Build Typed Compiler Core

Goal:

- replace string-oriented assembly with typed compilation passes

Tasks:

- add typed loader
- add validation layer
- add normalized intermediate representation
- add deterministic composer
- add emitter interface
- add verification stage

Exit condition:

- platform emitters receive normalized IR, not raw ad hoc text slices

### WS4. Rebuild Source Tree

Goal:

- separate authored meaning from packaging concerns

Tasks:

- classify existing source content into `kernel`, `core`, `scoped`, `platform`, `worker`, `reference`
- move reference-only material out of always-on runtime bundles
- replace heading-based extract regions with declared exports or typed slots
- normalize worker definitions into one host-agnostic source model

Exit condition:

- every authored source file has a clear content class and import contract

### WS5. Implement Thin Host Adapters

Goal:

- keep platform-specific logic confined to emitters and adapter modules

Tasks:

- codex emitter
- claude emitter
- copilot emitter
- browser/kernel emitter
- worker emitter set for all supported hosts

Exit condition:

- host syntax differences no longer affect core runtime authoring

### WS6. Add Build Memory and Self-Healing Reports

Goal:

- keep maintenance context small and repairable

Tasks:

- create `builds/MEMORY.md` as L1 index
- define L2 active migration notes location
- define L3 durable architecture docs and reports
- emit machine-readable failure reports
- include remediation hints per invariant class where possible

Exit condition:

- the next maintenance session can orient quickly without rereading the entire architecture corpus

### WS7. Verification and Cutover

Goal:

- move from archived failure corpus to clean live pipeline safely

Tasks:

- golden-output tests for each target
- byte-budget assertions
- checksum stability checks
- manifest graph integrity tests
- worker emission tests
- dry-run cutover against current live outputs
- final migration of active targets

Exit condition:

- clean `builds/` can replace the old generation path with reproducible outputs

---

## Phase Plan

### Phase 0: Archive and Orient

Status:

- ready now

Tasks:

- keep `builds.stuffed.failed/` as frozen evidence
- publish the new architecture draft
- publish this restart plan

Deliverables:

- architecture draft
- restart plan

### Phase 1: Contracts First

Tasks:

- write schemas
- write invariant catalog
- define compiler IR types

Gate:

- no implementation of new emitters before schemas and invariants land

### Phase 2: Compiler Skeleton

Tasks:

- implement loader, validator, IR, composer shell, verification shell
- stub emitters behind typed interfaces

Gate:

- compiler can parse and validate manifests without producing final outputs

### Phase 3: Source Reconstruction

Tasks:

- rebuild kernel/core/scoped/platform/reference split in clean tree
- replace extract markers with typed exports

Gate:

- one target can compile end-to-end without marker extraction

### Phase 4: Adapter Bring-Up

Tasks:

- implement codex, claude, copilot, browser emitters
- normalize worker generation

Gate:

- all supported targets compile from the same IR

### Phase 5: Memory and Verification Hardening

Tasks:

- ship L1/L2/L3 memory layout
- emit failure triage reports
- add golden tests and budget tests

Gate:

- a failing build identifies exact broken invariants and source edges

### Phase 6: Cutover

Tasks:

- compare live outputs to clean compiler outputs
- migrate active generation path
- leave archived failure corpus intact

Gate:

- cutover occurs only after green verification across all active targets

---

## Immediate Backlog

Priority order for the next implementation sprint:

1. Define manifest, module, and worker schemas.
2. Define the intermediate representation and invariant catalog.
3. Decide the clean directory layout under `builds/`.
4. Refactor `combine_agents.py` into compiler stages or replace it with a new entrypoint.
5. Reclassify existing source docs into runtime vs reference content.
6. Remove heading-based extraction from the target design.
7. Stand up one end-to-end target, preferably `codex-root`, as the proving path.

---

## Risks

### Risk 1: Restart Degrades Into Another Incremental Patch

Mitigation:

- do not treat the failed tree as the implementation target

### Risk 2: Typed Contracts Stay Superficial

Mitigation:

- refuse `dict[str, Any]` in the compiler core except at parse boundaries

### Risk 3: Platform Wrappers Regrow Runtime Logic

Mitigation:

- keep host-specific rules in adapter tests and emitter modules

### Risk 4: Memory Docs Turn Into More Prompt Bulk

Mitigation:

- keep L1 index small and link outward to deeper docs

### Risk 5: Verification Remains Post Hoc

Mitigation:

- run invariant checks against IR before emission, not only against emitted files

---

## Open Decisions

These decisions should be resolved before compiler implementation goes deep:

1. Should the clean compiler live inside `scripts/agents/` or under a new `builds/compiler/` package?
2. Should schemas use JSON Schema, Python dataclass validation, or both?
3. Should the intermediate representation stay markdown-centric or move to a richer section/object model?
4. Which target should act as the proving path for the first clean compile?
5. Should `builds/README.md` become the L1 memory index, or should `builds/MEMORY.md` be introduced?

---

## Definition of Done for the Restart

The restart does not finish when the files merely regenerate.

It finishes when:

- the compiler architecture matches the new draft
- the plan phases above are complete
- the live path no longer depends on the failed architecture

---

## Sources

- https://kenhuangus.substack.com/p/the-claude-code-leak-10-agentic-ai
- https://kenhuangus.substack.com/p/deconstructing-the-claude-code-leak
- https://linas.substack.com/p/claudecodesource
- https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know
- https://arstechnica.com/ai/2026/04/heres-what-that-claude-code-source-leak-reveals-about-anthropics-plans/
