# Sprint 4 — Deployment Authoring

> Goal: Write actual deployment content for all seven target paths. Create SKILL.md workers. Establish verify/alignment contract.
> Status: `[S~13]` — pre-brief; not yet open
> Entry: All design subdomains at `[C~19]` / `[CS~17]`+; deployment model defined (Sprints 0–3 complete)
> Exit: All deployment paths populated; verify contract operational; design tree fully deployable
> Subdomain: `lares/platform/` (conceptually: deployment layer)
> Epics: [DEPLOY](../../epics/DEPLOY/README.md)
> Roadmap: [ROADMAP.md](../../ROADMAP.md)
> Narrative beat: "The Lar Speaks on the DreamNet"

---

## Why This Sprint Exists

Every prior sprint produces design artifacts in `lares/`. This sprint takes those artifacts and writes the actual files that agents consume at runtime. It's the integration test for the entire architecture: if the design tree is correct, the deployment content should flow naturally from it. If it doesn't, the gaps surface here.

**New in Rev 4 (Consecration):** MemPalace MCP extension (Lares-specific tools), Kowloon feed format (story/archive rendering), TiddlyWiki tiddler format (knowledge export).

---

## Deployment Target Map

| Target | Path | Status |
|---|---|---|
| Copilot always-on | `.github/copilot-instructions.md` | **Missing** |
| AGENTS.md root | `AGENTS.md` | Exists (orphaned header) |
| AGENTS.md subfolder | `lares/AGENTS.md` | Exists — audit for staleness |
| Path-scoped instructions | `.github/instructions/*.instructions.md` | Exists (2 files) — audit + update |
| Worker skills | `.github/skills/*/SKILL.md` | **Partial** — talk-story exists; more needed |
| Claude Code always-on | `.claude/CLAUDE.md` | **Missing** |
| Custom agents | `.github/agents/*.agent.md` | **Missing** |

---

## Deliverables

### 1. Root AGENTS.md `[C~19]`

- Strip orphaned `<!-- Generated file -->` header (PA-01)
- Replace with accurate provenance note
- Ensure content reflects current design-canon, not stale pipeline references
- **Caution:** This touches a deployed system artifact. Git history preserves rollback.

### 2. `.github/copilot-instructions.md` `[C~19]`

- Derived from Kernel invariants + trust model + HUD behavior
- Budget-constrained (~4KB estimated for always-on load)
- Content: hard invariants first, then HUD protocol, then voice architecture summary

### 3. `.claude/CLAUDE.md` `[C~19]`

- Same source material as copilot-instructions; tailored to Claude Code context
- Different budget constraints and loading semantics than Copilot

### 4. `.github/skills/*/SKILL.md` workers `[CS~17]`

- talk-story SKILL.md already created (S0-09 deliverable) — review for alignment with final invariant spec
- Identify highest-value additional workers from coordinator roster (Artificer? Ink-Clerk?)
- Follows agentskills.io spec — portable across VS Code + Copilot CLI + coding agent
- See `SKILL_PLATFORMS.md` (in this epic folder or `lares/scrum/research/`) for cross-platform deployment notes

### 5. Path-scoped instructions audit `[CS~17]`

- Review `lares-operations.instructions.md` and `lares-voice.instructions.md`
- Update `applyTo:` globs if needed
- Align content with design-canon invariants and HUD grammar from S2

### 6. Platform README `[C~19]`

- Deployment target map (7 paths)
- Simplified pipeline model
- What goes where and why
- Explicit note: Kowloon is a downstream feed/archive target, NOT the canonical TickSpan store

### 7. VERIFY_CONTRACT.md `[CS~17]`

- What the verify/alignment check asserts
- Budget assertions per deployment path
- Pass/fail criteria
- Replaces `verify_alignment.py` contract (script is implementation; this is the design)

### 8. EXPORT_TARGETS.md `[CS~17]`

- **MemPalace sidecar mirror:** Minimal metadata subset contract (from CRY-14)
- **Kowloon `Create → Post` / `Create → Page` mapping** for transcript publication and story archive rendering
- **TiddlyWiki tiddler format:** Knowledge export from registry (from SCH-01 TW constraint)
- Sink-local IDs vs canonical `tick_id` / `trace_id` — make the distinction explicit

### 9. MemPalace MCP Extension `[CS~16]`

(DEP-11) Lares-specific tools for the MemPalace MCP server. Interface contract defined in CRY-15; implementation here. Tools: state query, register history, canon lookup, crystal navigation.

### 10. PROMPTCRAFT_GUIDE.md `[S~14]`

- Prompt engineering patterns for deployed instruction content
- Hard-invariants-first ordering rationale
- Budget discipline guidance

### 11. Custom agent template `[S~13]`

(DEP-09) `.github/agents/*.agent.md` — assess after SKILL.md pattern is proven. Lower priority than SKILL.md workers.

### 12. AGENTS.md + SPRINT_5_TASKS.md (hand-off)

Update this folder's AGENTS.md. Draft SPRINT_5_TASKS.md pre-brief for DreamDeck sprint.

---

## Key Risks

| Risk | Description | Mitigation |
|---|---|---|
| Integration risk | First sprint where design meets real deployment paths. Gaps between spec and actual agent behavior surface here — not in design sprints. | Treat every deployment failure as a design signal; update upstream specs. |
| Budget risk | Always-on files (copilot-instructions, CLAUDE.md) have hard size limits not anticipated during design. Content may need compression. | Verify budget constraints first; design content within limits. |
| Orphan risk | Root AGENTS.md cleanup touches deployed system. | Git history for rollback; edit carefully. |
| SKILL.md curve | talk-story is the first use of agentskills.io pattern at S0. Spec may have constraints not yet known. | Audit talk-story SKILL.md against final pattern before creating more workers. |
| MemPalace MCP scope | Implementation of MCP tools (CRY-15 → DEP-11) may reveal interface gaps in the CRY-15 contract. | Flag back to crystal/ if interface requires revision. |

---

## Backlog Items (this sprint)

DEP-01 through DEP-11, plus REFINEMENT_LOG.md pending actions PA-01 through PA-05. See [ROADMAP.md §deployment backlog](../../ROADMAP.md).

---

## Definition of Done

- All 7 deployment paths populated with content at target register
- VERIFY_CONTRACT.md at `[CS~17]`+; contract exercised against all paths
- EXPORT_TARGETS.md at `[CS~17]`+; MemPalace/Kowloon/TW mappings documented
- Root AGENTS.md cleaned; provenance note accurate
- No unresolved blockers on S5 entry (DreamDeck sprint)
- Narrative beat drafted for "The Lar Speaks on the DreamNet"

---

*Pre-brief status: content migrated from SPRINT_ROADMAP_1_4.md Rev 3 + updated for Consecration (SESSION_CRYSTAL_20260408 Payload 2). Sprint opens when S3 exits at `[C~19]` / `[CS~17]`+.*
