# AGENTS.md — Sprint 0: `lar:` URI Schema Settlement

> Scope: Agent instructions for Workers executing Sprint 0 tasks
> Parent: `lares/signal/AGENTS.md`
> Sprint: S0 — URI Schema Settlement
> Updated: 2026-04-08

---

## Role

Workers in this sprint validate, stress-test, and refine the `lar:` URI schema specification (`URI_SCHEMA.md`) to design-canon readiness (`[C~19]`).

Workers here are **validators and analysts**, not authors. The spec content has been extracted from the architecture draft. The sprint's job is to confirm it holds under pressure, flag what doesn't, and produce the evidence the operator needs to promote.

---

## Source Priority

Read these in this order before starting any task:

1. `URI_SCHEMA.md` — the spec being validated (primary working document)
2. `SPRINT_0_TASKS.md` — task definitions and acceptance criteria
3. `REGISTRY_CONTRACT.md` — the registry stub (for S0-07 only)
4. `../../_todo/core/Signal_HUD_Tagspace-draft.md` — the full architecture draft (reference; do not modify)
5. `../../_todo/core/TODO_Signal_HUD_Crystal_Plan.md` — the implementation plan (reference; do not modify)

---

## Worker Behavior Rules

1. **Label all outputs** with register tags. Findings are `[S~13]` minimum. Validation results that pass cleanly are `[CS~17]`. Only the operator promotes to `[C~19]`.

2. **Every finding escalates through a Coordinator.** Workers do not address the operator directly. Escalation format:
   ```
   WorkerTag [task[Role]] → Lares (Coordinator):
   → [Register:x] 🏛️ //domain.quality.dynamic
   Thread: [task ID + description]
   Finding: [the actual finding]
   ```

3. **Do not resolve open questions (U1–U6) unilaterally.** You may assess them (S0-06), argue for a position, and recommend — but resolution requires operator ruling.

4. **Do not modify source files.** `Signal_HUD_Tagspace-draft.md` and `TODO_Signal_HUD_Crystal_Plan.md` are read-only references. Findings produce new deliverable files, not edits to sources.

5. **Flag contradictions explicitly.** If a validation test reveals a contradiction between URI_SCHEMA.md and the draft, flag it with both file locations and the specific conflict. Do not silently resolve.

6. **Produce test vectors, not prose.** Where acceptance criteria call for validation, produce structured test data (tables, example URIs, expected/actual pairs). Prose rationale accompanies but does not substitute for the test evidence.

---

## Deliverable Format

Each task (S0-01 through S0-07) produces a single deliverable file:

```
S0-{NN}_deliverable.md
```

Each deliverable opens with:

```markdown
# S0-{NN} — [Task Title]

> Worker: [Tag [task[Role]]]
> Register: [current register of this deliverable]
> Status: PASS / FAIL / PARTIAL
> Date: [ISO-8601]
```

Followed by the validation evidence, structured per the task's acceptance criteria. Each acceptance criterion gets its own subsection with explicit PASS/FAIL status.

---

## Escalation Path

| Finding type | Escalate to |
|---|---|
| Structural issue (rule contradiction, gap in spec) | Lares (Scryer) |
| Cross-subdir scope conflict (crystal/ vs signal/) | Lares (Council) |
| Promotion readiness assessment | Lares (Gatekeeper) |
| RFC compliance question | Lares (Lorekeeper) |
| Contested design call | Lares (Council) → Operator |

---

## What Not To Do

- Do not write code. This sprint produces design validation, not implementation.
- Do not create TOML manifests, Python scripts, or build pipeline artifacts.
- Do not touch `builds/agents/` — publication happens only after S0-08 (operator gate).
- Do not treat the architecture draft's examples as test fixtures — they are illustrations, not exhaustive coverage. Generate your own edge cases.
- Do not collapse open questions to simplify your task. If a question makes your validation harder, that information escalates as a finding.

---

## Completion Signal

When all S0-01 through S0-07 deliverables are filed, Lares (Gatekeeper) assembles a sprint summary for the operator and triggers S0-08 (Operator Review Gate). The sprint is not complete until S0-08 resolves.
