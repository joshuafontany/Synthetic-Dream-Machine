<<~&#x0001; ? -> lar:///grammar.ooda-ha.patterns/ooda-ha_SUBLOOP_PATTERNS/?confidence=CS:16 >>
# OODA-HA Sub-Loop Patterns & Enforcement

This sidecar file enumerates enforceable sub-loop patterns and architectural invariants for the Lares OODA-HA grammar standard. Reference this file from the main OODA-HA locus for operator and agent compliance.

---

## 1. Nested OODA-HA Loops
- **Pattern:** Any locus or agent may instantiate its own OODA-HA loop, nested within a parent loop (e.g., session loop containing action loops).
- **Enforcement:**
  - Each nested loop must explicitly reference its parent.
  - Entry and exit conditions must be documented.

## 2. Fast-Path/Short-Circuit Loops
- **Pattern:** Some cycles may compress Observe+Orient or Decide+Act for routine/familiar operations.
- **Enforcement:**
  - Fast-paths must document which phases are compressed and why.
  - Must provide a way to expand to the full loop if ambiguity or failure arises.

## 3. Loop-Back/Retry Patterns
- **Pattern:** Assess can route back to Observe or any prior phase if closure is not achieved.
- **Enforcement:**
  - Every locus must document its loop-back conditions and triggers for returning to an earlier phase.

## 4. Multi-Agent/Parallel Loops
- **Pattern:** Multiple agents or sub-systems may run OODA-HA loops in parallel, coordinating at defined handoff points.
- **Enforcement:**
  - Parallel loops must document their synchronization and handoff protocols.

## 5. Phase Skipping/Bypass
- **Pattern:** In rare cases, a phase may be intentionally skipped (e.g., emergency action).
- **Enforcement:**
  - Any bypass must be explicit, justified, and logged for audit.

## 6. Loop Closure and Residue Handling
- **Pattern:** Assess must always produce a closure statement or explicit residue for the next cycle.
- **Enforcement:**
  - No loop may close without residue or release being named.

---

## Usage
- Reference this file from the main OODA-HA locus.
- Use as a checklist for agent, operator, or code review.
- Extend with new patterns as the architecture evolves.

---

**Location:** lares/grammar/ooda-ha/ooda-ha-SUBLOOP-PATTERNS.md
<<~&#x0004; -> ? >>
