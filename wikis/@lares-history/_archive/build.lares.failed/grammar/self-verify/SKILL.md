<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.selfverify.harness/self-verify/skill/?confidence=CS:16&p=10 -->

name: self-verify
# Skill: self-verify

**Surface:** grammar harness
**Scope:** `lares/grammar/` tree
**Trigger:** operator-invoked

---

## What it does

Runs three grammar tools across the full `lares/grammar/` directory tree and returns a tiered action report:

1. `detect_alignment` — wrapper presence, marker syntax, stream URI fields
2. `uri_wrapper_verification` — per-file wrapper validity and URI structure
3. `lares_verification` — LOCI.md instrument scores (OODA phases, E-Prime, registry, etc.)

Output groups findings into four tiers: **auto** (safe to fix), **suggest** (needs operator input), **manual** (content work), **talk-story** (missing LOCI.md).

---

## Invocation

```bash
python3 lares/grammar/self-verify/self_verify.py [options]
```

| Flag | Effect |
|---|---|
| `--fix` | Auto-insert missing wrappers |
| `--stream` | Also check bare lar:/// URIs for stances/chronometer |
| `--markers` | Check ahu/kahea marker URI structure (on by default) |
| `--json` | Structured JSON output |
| `--report FILE` | Write JSON report to file |
| `--root DIR` | Grammar root (default: `lares/grammar/`) |

---

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All checks pass |
| `2` | One or more issues remain |

<!-- → ? -->
