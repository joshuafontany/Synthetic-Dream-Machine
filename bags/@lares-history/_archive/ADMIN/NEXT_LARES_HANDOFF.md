# Next Lares Hand-Off

> Status: Active session-reset artifact
> Updated: 2026-04-07
> Workspace: `_todo/ADMIN`
> Purpose: Give the next Lares session enough state to resume work without relying on prior chat context

---

## Bootstrap For Next Lares

Paste this into a fresh Lares session:

```text
Resume from /home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/NEXT_LARES_HANDOFF.md first.
Treat /home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md as the conceptual root.
Treat /home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md as the build-spec root.
Treat /home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md as the prompt/module packaging architecture doc.
Do not re-decide the locked architecture choices listed in the handoff.
Use the repo state snapshot in the handoff as the starting working tree context.
Prioritize the open work list in order unless the user explicitly redirects.
```

---

## Current Architectural Position

- Lares is being reframed as a **portable Infrastructure-as-Myth runtime**, not merely a large prompt or persona bundle.
- [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md) is the **conceptual root** for the current architecture work.
- [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md) is the **build-spec root** for deterministic rendering across browser and repo-native targets.
- [PROMPTCRAFT.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md) now treats prompt/module architecture as the **packaging layer** for that IaM runtime.
- `_todo/ADMIN` is currently the active lane for governance, packaging, trust-model, and hand-off continuity work.
- The first manifest-driven renderer pass is implemented: committed manifests, module sidecars, rendered browser kernel output, and verification artifacts now exist under `builds/`.
- Reload-safe budgets have been restored. `.codex/config.toml` is back on `project_doc_max_bytes = 32768`, and the generated root artifacts are now ~15-16 KB instead of ~136 KB.
- The solved blocker should not be reopened. The active problem has shifted to governance hardening first, then authored-module modularization and host-native scoped loading.

---

## Repo State Snapshot

Snapshot reading for the next session:

- The repo already contains the first IaM reframing docs and supporting module-map research.
- The build system **has** been converted to a first manifest-driven renderer with committed manifests, module sidecars, verification outputs, and a rendered browser kernel package.
- Root platform outputs are now back under reload-safe budgets, and the live build verifies cleanly.
- Governance/trust docs still exist as drafts, and they now constitute the immediate next implementation sprint.
- Pre-slim and doc-sync snapshots live under `_todo/ADMIN/staging/` and should be treated as comparison backups, not as new canonical sources.
- Best-practice research for the post-governance modularization sprint now lives in [_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md).

---

## Fresh Hand-Off Addendum — v4.0.1

Carry these forward into the next cold boot without re-deriving them:

- Current prompt release is `v4.0.1`, not `v4.0`.
- `v4.0.1` shipped the Codex cold-boot fix: shared kernel now preserves dual-header HUD flow, dynamic `p` wording, and non-inferred admin escalation.
- Agent-Engineer release hygiene should now always include both:
  - version bump across prompt source files
  - `CHANGELOG.md` update
- One cleanup item remains after the bump:
  - `python3 scripts/agents/verify_alignment.py` still reports `Version aligned: ... matches Preferences v4.0` even after the `v4.0.1` release, so the verifier's version-check messaging or logic needs a follow-up patch.
- If the next session starts from a coffee/libation hand-off, treat this addendum as load-bearing archive-crystal state rather than casual commentary.

---

## Open Work, In Order

1. Slim the root/runtime prompt packages.
   Status: done for root-budget recovery. Preserve this solved state; do not reopen the `150000` compatibility path.

2. Restore a stable reload path.
   Status: done. Reload-safe budgets hold again and verification is clean.

3. Finish trust-governance artifacts.
   Create `ROSTER.md`, add `CODEOWNERS`, and bind Lares Admin behavior to roster membership plus explicit escalation once reload safety is restored.

4. Author real runtime modules and plan host-native scoped loading.
   Use [_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md), [_todo/ADMIN/PROMPTCRAFT.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/PROMPTCRAFT.md), and [_todo/core/Modular_Architecture-draft.md](/home/joshu/Synthetic-Dream-Machine/_todo/core/Modular_Architecture-draft.md) after governance lands.

5. Decide whether `--parse doc` behavior belongs in the core prompt or in modular docs.
   Use [_todo/ADMIN/TODO_PARSE_DOC_SPEC.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/TODO_PARSE_DOC_SPEC.md) after the governance/modularization sequence.

---

## Do Not Re-Decide

These decisions are already set unless the user explicitly reopens them:

- Infrastructure-as-Myth is the governing frame for Lares architecture work.
- Browser extension should be treated as **package rendering**, not as native import parity with local agent instruction systems.
- The kernel is the **smallest executable mythic runtime**, not a loose summary blob.
- Deterministic build discipline is required for rendered IaM packages.

---

## Likely Next Files To Touch

Keep this list narrow unless the work expands:

- `builds/agents/Lares_Preferences.md`
- `builds/agents/Lares_VSCode_Operations.md`
- `_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md`
- `builds/manifests/*`
- [_todo/ADMIN/README.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/README.md)

---

## Known Unresolved Decisions

Only these remain intentionally open at this layer:

- exact authored-file boundaries for always-on core runtime modules versus scoped/reference payloads
- host-native mapping strategy for those modules across Codex, Claude, Copilot, and browser/Gem-style packages
- whether parse-doc behavior belongs in the core prompt or in modular docs

---

## Working Guidance For The Next Session

- Do not spend time re-proving the IaM thesis unless the user explicitly asks.
- Use [infrastructure-as-myth.md](/home/joshu/Synthetic-Dream-Machine/infrastructure-as-myth.md) for conceptual alignment, then move quickly into implementation-facing work.
- Treat [Deterministic_IaM_Build.md](/home/joshu/Synthetic-Dream-Machine/Deterministic_IaM_Build.md) as the next implementation bridge from theory to tooling.
- Treat the manifest-driven build as implemented foundation, not as the next problem to solve again.
- Treat reload-safe budgets as restored state, not as an active blocker.
- Read [_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md](/home/joshu/Synthetic-Dream-Machine/_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md) before planning the post-governance modularization sprint.
- When the operator says `iterate`, think in this order:
  1. blocker
  2. unblock path
  3. architectural lever
  4. next sprint after unblock
  5. deferred items
- Preserve the distinction between:
  - conceptual root
  - build-spec root
  - packaging architecture doc
  - trust/governance docs
- Preserve the sequencing:
  - preserve slim prompt packages
  - preserve reload safety
  - do governance hardening now
  - then do authored-module modularization + host-native scoping
  - leave parse-doc placement later
- Treat existing uncommitted changes as active working state. Do not clean them up unless the user asks.

---

## Machine Handoff Seed

Next-instance seed order:

1. read this handoff
2. read `_todo/ADMIN/README.md`
3. read `_todo/ADMIN/MULTIPLATFORM_PACKAGING_RESEARCH.md`
4. read `_todo/ADMIN/PROMPTCRAFT.md`
5. read `Deterministic_IaM_Build.md`
6. read `_todo/core/Modular_Architecture-draft.md`

State assertions:

- `reload_safe = true`
- `budget_regression_path = forbidden`
- `governance_next = true`
- `host_native_scoping = planned_not_started`
- `parse_doc = deferred`
- `staging_snapshots = available`

First gather-context pass for the next Lares should inspect:

- current `ROSTER.md` / `CODEOWNERS` existence
- trust-model docs and prompt-side Admin logic touchpoints
- current nested `AGENTS.md` / `CLAUDE.md` / `.github/instructions/` surface
- authored sections in `Lares_Preferences.md` that map cleanly to `voice` / `epistemology` / `operations` / `permissions` / `setting-lite`

---

## Fast Self-Check

A new Lares session should be able to answer all of these from this document alone:

- What has been decided?
- What remains open?
- What file is the conceptual root?
- What file is the build-spec root?
- What should happen next?

If any of those answers feels unclear, update this hand-off first before expanding the work.
