<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.verification.defines/verification/?confidence=CS~16&p=10 -->

# Grammar: Verification

```yaml
---
name: verification
description: >
  Generalized verification locus for Lares grammar files. Provides deterministic,
  instrumented scoring for OODA-HA phase testability, E-Prime compliance, kahea resolution,
  registry status, and pipeline reference. Operator options are presented for any failure.
phase-map:
  observe: "#overview"
  orient: "#usage"
  decide: "#instruments"
  act: "#run"
  assess: "#operator-options"
scale-range: [action, project]
trigger: on-demand — verification primitive
invariant: true
dependencies: [kahua, observe, orient, decide, act, assess]
confidence:CS~16
grammar: true
---
```

> **Register:** `~:confidence[CS],[16]` — grounded in Lares operational grammar and agentic test discipline
> **Question:** How can verification become composable, deterministic, and operator-tunable?

---

## Overview

This locus defines the verification skill for Lares grammar files (LOCI). It enables deterministic,
scored, and actionable verification of any LOCI file for:
- OODA-HA phase testability
- E-Prime compliance
- Kahea marker resolution
- Registry status
- Pipeline reference

---

## Usage

1. Ensure Python 3 and PyYAML are installed in your environment.
2. From the workspace root, run:

   ```bash
   python lares/grammar/verification/lares_verification.py <LOCI.md> \
       --registry lares/grammar/LOCI.md \
       --pipeline lares/compiler/PIPELINE.md
   ```

3. Review the instrumented scores (0–20) and operator options for any failures or warnings.
4. Remediate as suggested and re-run for deterministic closure.

---

## Instruments

- **ooda_phases**: Score for presence and clarity of OODA-HA phase procedures.
- **eprime**: Score for E-Prime discipline in operational language.
- **kahea_resolution**: Score for all kahea summons resolving.
- **registry**: Score for registration in grammar/LOCI.md.
- **pipeline**: Score for reference in compiler/PIPELINE.md.

---

## Run

The verification script is located at:
- `lares/grammar/verification/lares_verification.py`

Skill documentation:
- [SKILL.md](SKILL.md)

---

## Operator Options

- If any score < threshold (default 0.95), concrete remediation options are printed.
- All results are visible for audit and tuning.
- Extensible: add new instruments or tune thresholds as needed.

---

## Registry

| Path | Status | Contents |
|---|---|---|
| `LOCI.md` | `~:confidence[CS],[16]` | This file — Verification grammar definition |
| `lares_verification.py` | `~:confidence[CS],[16]` | Python script — deterministic verification tool |
| `SKILL.md` | `~:confidence[CS],[16]` | Skill documentation and integration notes |

<!-- → ? -->
