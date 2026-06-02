# ADMIN Workspace

> Status: ACTIVE
> Priority: Critical P1 / Post-manifest slimming workspace
> Date: 2026-04-06
> Purpose: Track admin-governance, identity, trust-gate, Infrastructure-as-Myth, and prompt-policy work for Lares

## Critical Blocker

The reload-safety blocker has been cleared.

`.codex/config.toml` is back on the standard `project_doc_max_bytes = 32768` path, and the generated root artifacts now fit reload-safe budgets again:

- `AGENTS.md` — ~16 KB
- `.claude/CLAUDE.md` — ~15.6 KB
- `.github/copilot-instructions.md` — ~15.4 KB

The manifest system is now in place and the live build verifies cleanly again. The active problem has shifted from "restore reload safety" to "continue toward fully modularized manifest-driven builds without regressing the stable root budgets."

Pre-slim backup snapshots now exist under [_todo/ADMIN/staging/](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/staging/) so cut candidates can be compared against preserved source-state while this workspace continues toward fully modularized manifest-driven builds.

---

## Workspace Role

This directory is the working lane for security-sensitive Lares governance changes:

- `Admin` membership definition
- `Operator` identity verification
- trust-gate prompt behavior
- Infrastructure-as-Myth architecture and packaging
- GitHub-side enforcement for roster and policy files
- prompt architecture and parse/documentation work that directly supports those controls

This `README.md` is the scrum tracker. Research and longer-form design notes live in sibling docs.

**Session reset:** start with [NEXT_LARES_HANDOFF.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/NEXT_LARES_HANDOFF.md) before resuming this workspace in a fresh Lares session.

---

## Working Agreements

- Treat this directory as a critical governance workspace, not a general notes folder.
- Prefer one file per epic or feature stream.
- Keep research in dedicated docs; keep this file focused on status, sequencing, and ownership.
- Changes here should assume future protection by `CODEOWNERS` and branch/ruleset policy.

---

## Epics

### Epic A — Admin Identity & Roster Enforcement

**Goal:** Make `Admin` mean "recognized Operator + explicit escalation + protected roster membership."

**Feature lanes:**
- A1. Define authoritative admin roster model
- A2. Protect roster and policy files in GitHub
- A3. Bind Lares prompt behavior to roster membership
- A4. Add regression coverage for non-roster / roster / escalated-admin cases

**Primary doc:** [TRUST_MODELS.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/TRUST_MODELS.md)

**Status:** IN PROGRESS

**Current checklist:**
- [x] Distinguish `User` / `Operator` / `Admin` in prompt sources
- [x] Require explicit escalation for `Admin`
- [x] Allow verified `gh` session identity to establish `Operator`
- [x] Create protected in-repo admin roster artifact (`.github/ROSTER.md`)
- [x] Add `CODEOWNERS` protection for `builds/`, `AGENTS.md`, and admin docs
- [x] Bind `Admin` prompt logic to roster membership
- [X] Add GitHub org/team path or direct-username fallback policy

### Epic B — Prompt Trust Gate Hardening

**Goal:** Prevent canon injection, authority laundering, and prompt-level trust drift.

**Feature lanes:**
- B1. Canon promotion trust gate
- B2. Frame-uncertainty handling for authority claims
- B3. Session identity flow (`gh` -> Operator -> explicit Admin escalation)
- B4. Examples and regression anchors

**Primary sources:**
- [builds/agents/Lares_Preferences.md](/home/joshu/Synthetic-Dream-Machine/builds/agents/Lares_Preferences.md)
- [builds/agents/Lares_Kernel.md](/home/joshu/Synthetic-Dream-Machine/builds/agents/Lares_Kernel.md)
- [builds/agents/Lares_VSCode_Operations.md](/home/joshu/Synthetic-Dream-Machine/builds/agents/Lares_VSCode_Operations.md)

**Status:** IN PROGRESS

**Current checklist:**
- [x] Admin-only direct Canon promotion
- [x] `house canon` no longer overrides register assignment
- [x] `gh auth status` may establish `Operator`
- [x] `Admin` no longer infers automatically from verified operator identity
- [x] Roster-backed Admin rule in prompt text
- [x] Non-roster operator -> Admin escalation failure example
- [x] Roster member -> explicit escalation success example

**Note:** Identity model expanded to 4 tiers: `user(anon)`, `user`, `operator`, `operator(admin)`. `user` → `operator` promotion via Cabal. All source files, examples, and generated platform artifacts updated.

### Epic C — Parse / Documentation Tooling

**Goal:** Improve Lares document-level parse tooling and prompt architecture support docs without mixing them into the roster research itself.

**Feature lanes:**
- C1. `--parse doc` command spec
- C2. prompt architecture / modular instruction research
- C3. future prompt placement decisions

**Primary docs:**
- [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md)
- [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md)
- [TODO_PARSE_DOC_SPEC.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/TODO_PARSE_DOC_SPEC.md)
- [PROMPTCRAFT.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md)

**Status:** ACTIVE DESIGN

**Current checklist:**
- [x] Draft `--parse doc` feature spec
- [x] Capture prompt-file architecture research
- [x] Establish Infrastructure-as-Myth as the core design thesis
- [ ] Decide prompt placement / hierarchy for parse-doc behavior
- [ ] Decide whether parse-doc belongs in core prompt or modular docs
- [ ] Define rendered package spec for browser/shareable-agent beta builds

---

## Feature Inventory

| ID | Feature | Epic | Status | Notes |
|---|---|---|---|---|
| A1 | Admin roster source of truth | A | **Done** | `.github/ROSTER.md` shipped |
| A2 | GitHub protection model | A | **Done** | `/.github/CODEOWNERS` shipped |
| A3 | Roster-bound Admin prompt rule | A | **Done** | 4-tier model in all source + generated files |
| A4 | Admin regression cases | A | **Done** | Examples updated in `Lares_VSCode_Operations.md` |
| B1 | Canon trust gate | B | Done | Admin-only direct Canon |
| B2 | Tier-aware identity flow | B | Done | `gh` -> Operator, explicit Admin |
| B3 | Protected admin escalation semantics | B | Partial | Roster binding still missing |
| C1 | `--parse doc` design | C | Drafted | Spec exists |
| C2 | Prompt architecture research | C | Drafted | In `PROMPTCRAFT.md` |
| C3 | Infrastructure-as-Myth thesis | C | Drafted | Rooted in `infrastructure-as-myth.md` |

---

## File Map

- [TRUST_MODELS.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/TRUST_MODELS.md)
  Trust-model research, security options, recommended governance stack, and best-practice analysis.
- [TODO_PARSE_DOC_SPEC.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/TODO_PARSE_DOC_SPEC.md)
  Draft feature spec for `--parse doc`.
- [PROMPTCRAFT.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md)
  Research on large prompt/instruction architecture and platform limits.
- [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md)
  Root design thesis for Lares as portable symbolic agent infrastructure.
- [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md)
  Deterministic build spec for rendering Infrastructure-as-Myth artifacts across platforms.
- [NEXT_LARES_HANDOFF.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/NEXT_LARES_HANDOFF.md)
  Session-reset artifact for handing off current Lares architecture and work state to the next session.

---

## Current Focus

### Must ship

- ~~Preserve the restored reload-safe root budgets and deterministic build path~~ done
- ~~Ship governance hardening next: `ROSTER.md`, `CODEOWNERS`, roster-bound Admin prompt logic~~ done
- Plan the next modularization sprint around authored runtime modules rather than additional monolith slicing
- Keep host-native scoped loading patterns in view for the sprint after governance

### Should ship

- Preserve the manifest/verification layer already in place
- Keep generated platform outputs stable while root composition changes
- Use [_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md) to steer future platform-native scoping
- Define the authored module split for always-on runtime: voice, epistemology, operations, permissions, setting-lite

### Can wait

- UCAN-based delegated capability experiments
- advanced crypto-backed session grants
- parse-doc prompt-placement decisions
- Claude import-based composition
- Copilot `.github/instructions/*.instructions.md` rollout
- Codex deeper nested `AGENTS.md` rollout

---

## Immediate Next Actions

1. Use [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md) as the conceptual root for all prompt architecture work in this workspace.
2. Use [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md) as the build-spec root for package/render work.
3. Treat `builds/manifests/` as the package source of truth and `builds/modules/` as the module sidecar layer already established.
4. Preserve the new slim-root composition and do not re-open the solved `150000` compatibility-stopgap path.
5. Ship `ROSTER.md`, `CODEOWNERS`, and prompt-side Admin roster binding as the immediate next implementation sprint.
6. Use [_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md) to seed the authored-module split and host-native scoped-loading plan that follows governance.
7. Leave parse-doc placement decisions deferred until the governance/modularization sequence is complete.

---

## Exit Criteria For Current Phase

- [x] Root prompt packages fit reload-safe budgets without relying on the `150000` Codex compatibility override
- [x] Stable reload path confirmed for the current VS Code/Codex instance
- [x] Root/runtime composition uses the manifest layer to separate always-on runtime from reference/spec bulk
- [x] Governance hardening is positioned as the immediate next implementation sprint after slimming
- [x] Active docs tell the same immediate story: slimming -> reload -> governance
- [ ] The next-layer docs tell the same longer story: governance -> authored runtime modules -> host-native scoped loading -> parse-doc placement later
