<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.verification.defines/skill/?confidence=CS~16&p=10 -->

name: lares-loci-verification
# SKILL: Lares LOCI Verification

This skill provides a deterministic, instrumented verification loop for any Lares LOCI file. It evaluates:

- OODA-HA phase testability (clear, testable procedures for each phase)
- E-Prime compliance (operational language avoids identity-predication)
- Kahea marker resolution (all summons resolve)
- Registry status (registered in grammar/LOCI.md)
- Pipeline reference (referenced in compiler/PIPELINE.md)

Each instrument returns a score in [0.0, 1.0], not just pass/fail. Operator options are presented for any failure or warning.

## Usage

Run the tool:

```bash
python lares/grammar/verification/lares_verification.py lares/grammar/transclusion/LOCI.md \
    --registry lares/grammar/LOCI.md \
    --pipeline lares/compiler/PIPELINE.md
```

## Operator Options
- If a score < threshold (default 0.95), concrete suggestions are printed for remediation.
- All results are visible for audit and tuning.

## Integration
- This skill can be called on any LOCI file in the Lares grammar tree.
- Designed for CLI, CI, or agent integration.

## Extensibility
- Add new instruments by extending the Python script.
- Tune thresholds per project or operator preference.

---

**Author:** Lares Agent / Operator
**Location:** lares/grammar/verification/SKILL.md

<!-- → ? -->
