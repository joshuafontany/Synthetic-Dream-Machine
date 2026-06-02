<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///ha.ka.ba -->
# Grammar: URI Wrapper Enforcement

---

This locus defines the automated test for enforcing URI wrapper compliance in Lares grammar files.

## Purpose
- Ensure every grammar file starts with a valid opening URI wrapper comment (e.g., `<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///... -->`)
- Ensure every grammar file ends with a valid closing URI wrapper comment (e.g., `<!-- → ? -->`)
- Support strict compliance for `/lares/grammar` and configurable enforcement for other trees

## Enforcement Skill
- See: [lares/grammar/verification/uri_wrapper_verification.py](../verification/uri_wrapper_verification.py)
- This script implements the automated check for URI wrappers at file start and end

## Operator Guidance
- Use this locus as the reference for URI wrapper enforcement
- Extend or update the verification script as URI schema evolves

---

> **Skill Link:** [uri_wrapper_verification.py — URI Wrapper Verification Skill](../verification/uri_wrapper_verification.py)
<!-- → ? -->
