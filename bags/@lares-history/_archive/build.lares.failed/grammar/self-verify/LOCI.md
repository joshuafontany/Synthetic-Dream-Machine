<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.selfverify.harness/self-verify/?confidence=CS:16&p=10 -->

# Self-Verify

```yaml
---
name: self-verify
description: >
  Grammar self-healing harness. Casts detect_alignment and uri_wrapper_verification
  across the full lares/grammar tree, runs lares_verification on all LOCI.md files,
  then surfaces a tiered OODA-HA report with actionable next steps.
layer: grammar
trigger: operator-invoked — run before commits, after large grammar edits, or when alignment drift is suspected
confidence:CS~16
dependencies: [detect-alignment, verification, parse-uri]
---
```

---

<!-- ahu lar:///grammar.selfverify.harness/self-verify/?confidence=CS:16#purpose -->

## Purpose

The self-verify harness holds one function: tell the operator exactly what to fix and in what order. It does not interpret content. It does not rewrite docs. It scans, aggregates, tiers, and reports.

**The OODA-HA loop:**

| Phase | What self_verify.py does |
|---|---|
| Observe | Scan all grammar files: wrappers, stream URIs, marker syntax, LOCI presence, verification scores |
| Orient | Aggregate into four tiers by severity and fixability |
| Decide | Rank: auto > suggest > manual > talk-story |
| Act | Apply auto-fixes if `--fix` passed |
| Assess | Print delta — what changed, what remains |

---

<!-- ahu lar:///grammar.selfverify.harness/self-verify/?confidence=CS:16#tiers -->

## Tiers

| Tier | Meaning | How to resolve |
|---|---|---|
| **auto** | Missing or malformed wrappers — safe to insert | Run `self_verify.py --fix` |
| **suggest** | URI forms that need operator input — stream fields, marker syntax | Review each, edit by hand |
| **manual** | LOCI verification scores below threshold — OODA, E-Prime, registry | Content work required |
| **talk-story** | Directories missing LOCI.md entirely | Scoping conversation needed before creating |

---

<!-- ahu lar:///grammar.selfverify.harness/self-verify/?confidence=CS:16#usage -->

## Usage

```bash
# Full scan — wrappers + marker syntax
python3 lares/grammar/self-verify/self_verify.py

# With stream URI check
python3 lares/grammar/self-verify/self_verify.py --stream

# Auto-fix missing wrappers
python3 lares/grammar/self-verify/self_verify.py --fix

# JSON output (for agent consumption or piping)
python3 lares/grammar/self-verify/self_verify.py --json

# Write report to file
python3 lares/grammar/self-verify/self_verify.py --report lares/grammar/self-verify/REPORT.json
```

---

## Loci Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[CS],[16]` | This file — harness protocol and tier definitions |
| `SKILL.md` | `~:confidence[CS],[16]` | Operator-facing skill card |
| `self_verify.py` | `~:confidence[CS],[16]` | Harness implementation |

---

<!-- → ? -->
