# Module-Map: `builds/agents/Lares_VSCode_Operations.md`

> Module-Map type: Source file structural analysis
> Source measured: 2026-04-06 | 453 lines | 27,677 bytes
> Register: [S~13] 🏛️ — current state, line counts measured directly
> Role in pipeline: **Section B source — appended to ALL platform builds after Lares_Preferences.md**

---

## Summary

`Lares_VSCode_Operations.md` contains Section B — the repo-specific operational context for VS Code / agentic tooling environments. The entire file content from the marker `## CLI Agent Context — VS Code / Repo Operations` onwards gets appended to every platform output after `Lares_Preferences.md`.

Unlike `Lares_Preferences.md`, this file is inherently repo-scoped. Its content (source map, citation style, golden examples, failure prevention) only makes sense in the context of *this repository* — it is not a generic behavioral layer.

This makes it a clear **buggy-state overdeployment case**. High-value repo-ops guidance and low-value always-on example/spec material are currently fused, and then exported to every platform regardless of host needs.

---

## Backlog Framing

**Current buggy state:** repo-scoped operational content, example suites, and regression/spec material all ride in the same deployed Section B payload.

**Ideal state:** only the deployable repo-ops core remains in host context; examples, regression material, and maintenance notes move into reference docs or tests while deterministic manifests decide which repo modules each host actually loads.

---

## Module-Map

---

### File Preamble (not included in output) · Lines 1–5
*Source file notice and generation comment.*
Not extracted by the combine script (the `_extract_section` function starts from the marker).

---

### `## CLI Agent Context — VS Code / Repo Operations` · Lines 6–13
*Section B header. Description of what this section covers. Source map context.*
**This is the extraction marker.** Everything from here to end-of-file is appended to platform outputs.

---

### `### B1. Precedence` · Lines 14–27 · ~14 lines
*Priority order: VS Code system prompt → explicit operator request → nearest AGENTS.md → root AGENTS.md → canon docs.*
Operationally critical. Defines conflict resolution. Short.
> **Future module:** Could inline into root `AGENTS.md` operational index. Alternatively `lares-repo-ops.md`.

---

### `### B2. Repository Source Map` · Lines 28–44 · ~17 lines
*Directory-to-domain mapping: elyncia/, ftls/, Synthetic_Dream_Machine_*.md, builds/agents/, _todo/, external URIs.*
Critical for grounding responses in local sources. Compact.
> **Future module:** Root `AGENTS.md` (operational index) — this is exactly the kind of content the root should lead with
> **⚠️ Note:** This section should be in the first 200 lines (ideally first 4K chars) of any platform output. Currently it appears at position ~1,100+ lines in the assembled file.

---

### `### B3. Request Types` · Lines 45–56 · ~12 lines
*Four types: Lore Lookup, Mechanics Lookup, Synthesis/Homebrew, Editing/Rewriting/Planning. One-paragraph each.*
Useful heuristic for response framing. Brief.
> **Future module:** `lares-repo-ops.md` (`paths: ["**"]`)

---

### `### B4. Canon Citation Style and Search Workflow` · Lines 57–94 · ~38 lines
*`Canon` / `Synthesis` / `Provisional` label definitions. Dry vs. immersive reference formats. Examples. Search-before-claiming rule.*
Operationally load-bearing for this repo — defines how every cited claim should be tagged. Includes inline examples.
> **Future module:** `lares-repo-ops.md` (`paths: ["**"]`)

---

### `### B5. DreamNet / Gaia Boundary` · Lines 95–100 · ~6 lines
*DreamNet framing is welcome; Gaia-side claims stay literal. Cross-reference to Capability Honesty.*
Brief pointer/reinforcement. Could merge with Capability Honesty in the modular layout.
> **Future module:** `lares-repo-ops.md` or consolidate into `lares-operations.md`

---

### `### B6. Memory System Mapping` · Lines 101–119 · ~19 lines
*Maps `/memories/` scopes to consolidation phases. `/memories/` → Phase 4. `/memories/session/` → Phases 1–3. `/memories/repo/` → stable repo facts. File operation discipline.*
Operationally important for this VS Code environment specifically. Defines how memory tools are used.
> **Future module:** `lares-repo-ops.md` or could merge into root `AGENTS.md` (compact form)

---

### `### B7. Multi-Document and Long-Context Work` · Lines 120–125 · ~6 lines
*Gather material before answering cross-document requests. Annotate each claim. Keep task explicit.*
Brief. Useful heuristic.
> **Future module:** `lares-repo-ops.md`

---

### `### B8. Golden Prompt/Response Examples` · Lines 126–440 · **~315 lines (~70% of file)**
*Behavioral anchors — 13 numbered prompt/response examples with detailed notes on expected behavior.*

This is the largest section by far, containing:

| Example | Lines (approx) | Content |
|---|---|---|
| 1) Lore Lookup | 130–135 | Grounded answer with Canon citation |
| 2) Mechanics Lookup | 136–141 | Playable reading, cite rule doc |
| 3) Synthesis Request | 142–147 | Labeled synthesis output |
| 4) Capability Boundary | 148–153 | Gaia-side honesty |
| 5) CLI Boot | 154–169 | Full `--query` response format |
| 6) Voice Routing | 170–175 | Triage voice for "what's on fire" |
| 7) Worker Spawn | 176–187 | Full spawn response with tag, thread, scope |
| 8) Operating Mode Switch | 188–193 | Plan Mode confirmation |
| 9) Debug Mode (silent) | 194–209 | `--debug p~6` — no vector commentary in body |
| 10) Parse Mode | 210–232 | Full parse output format |
| 10.5) Verbose Mode | 233–249 | `--verbose` commentary block |
| 10.7) Full Instrumentation | 250–277 | `--parse --debug --verbose p~4` combined |
| 11a) Dream Mode (Admin) | 278–296 | `--dream` — no dual-tag, attributes still present |
| 11b) Dream Mode (Operator) | 297–312 | Council-gated entry |
| 11c) Dream Mode (User denied) | 313–318 | Gatekeeper decline |
| 12) Identity Check | 319–343 | `--whoami` output format |
| 12a) Operator via GitHub CLI | 340–348 | `gh auth status` recognition |
| 13) Permission Tier Boundary | 349–353 | User-tier Operator-command denial |

**This section serves as the behavioral test suite specification** — it defines expected output format for every major CLI interaction. It is the closest thing the system has to a formal test spec.

> **Future module:** This content does not belong in any always-loaded rule file. It is reference documentation.
> **Options:**
> - Keep in `Lares_VSCode_Operations.md` as reference (not deployed to platforms)
> - Extract to `builds/agents/ADMIN/examples.md` for human reference only
> - Convert into actual test fixtures in `tests/`
> **⚠️ Size:** 315 lines for golden examples is 1.75× the entire Claude Code recommended file size. These examples are useful for human authors but add significant token overhead when loaded in every session.

---

### `### B9. Instruction Hygiene and Prompt Maintenance` · Lines 440–443 · ~49 lines (includes mini regression checklist)

*Layer discipline. Positive format instructions. Examples should match desired behavior. Mini Regression Checklist with 26 test cases. Pass criteria.*

| Subsection | Lines | Content |
|---|---|---|
| Layer discipline text | 440–442 | Change smallest layer; no contradictory stacking |
| Mini Regression Checklist | in B9 | 26 numbered test scenarios |
| Pass criteria | at end | ~20 bullet criteria |

**This is the system's formal regression spec** — 26 test cases with pass criteria. Should be the authoritative source for `tests/` fixtures.

> **Future module:** This should be in `tests/` as actual test spec, not embedded in a deployed instruction file. The tests/ infrastructure should reference this instead of this appearing in platform context.

---

### `### B10. Failure Prevention` · Lines 444–452 · ~9 lines

*Cross-reference to Degraded Node States. Workspace Trust Gate embodied operations.*

Brief — points back to main failure mode vocabulary and workspace gate.
> **Future module:** `lares-repo-ops.md` (condensed) or inline into root `AGENTS.md`

---

## Budget Summary

| Section | Lines | Value to platform context | Future placement |
|---|---|---|---|
| B header + B1 Precedence | ~21 | HIGH | Root `AGENTS.md` |
| B2 Source Map | ~17 | HIGH | Root `AGENTS.md` |
| B3 Request Types | ~12 | MEDIUM | `lares-repo-ops.md` |
| B4 Canon Citation | ~38 | HIGH | `lares-repo-ops.md` |
| B5 DreamNet/Gaia Boundary | ~6 | LOW (already in Preferences) | consolidate or drop |
| B6 Memory System | ~19 | HIGH | `lares-repo-ops.md` |
| B7 Long-Context | ~6 | LOW | consolidate |
| **B8 Golden Examples** | **~315** | **ZERO for platform context** | `tests/` or reference-only |
| B9 Instruction Hygiene + Checklist | ~49 | ZERO for platform context | `tests/` or reference-only |
| B10 Failure Prevention | ~9 | LOW (already in Preferences) | consolidate or drop |

**~364 of 453 lines (~80%)** is either test spec / golden examples (should live in `tests/`) or content already covered in `Lares_Preferences.md`.

**~89 lines (~20%)** is genuinely repo-specific operational content that belongs in a deployed instruction file.

---

## Critical Notes

1. **B8 (golden examples) and B9 (regression checklist) together = ~364 lines** that serve primarily as human-authored specification documents. Their value in deployed context is marginal — the model uses the examples to calibrate behavior but they do not need to re-appear in every session.

2. **B2 (source map) should be near the top of root `AGENTS.md`**, not 1,100+ lines into the assembled output. It's the single most practically useful section for grounding responses.

3. **The Section B extraction marker** (`## CLI Agent Context — VS Code / Repo Operations`) is robust — it appears exactly once in the source file and `_extract_section` stops at the marker if missing. The extraction is correct; the problem is the content ratio.

## Ideal-State Implications

This map points toward three distinct targets:

1. a compact `lares-repo-ops` deployable module
2. a reference/examples document for human calibration
3. a test/regression artifact set outside always-on prompt context

---

*Lares (Artificer) — Section map confirmed against live file headings extracted 2026-04-06.*
