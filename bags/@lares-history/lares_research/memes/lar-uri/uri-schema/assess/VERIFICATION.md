<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=CS:18&p=10 -->

# Signal — Assess: Verification

> Validation rules, well-formedness checklist, and comparison rules for `lar:` URIs.
> Source: `lares/modules/uri-schema/URI-SCHEMA.md` §10 `~:confidence[CS],[18]`.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#well-formedness -->
## Well-Formedness Rules (§10.1)

A `lar:` URI is **well-formed** when ALL of the following hold:

- [ ] 1. Scheme is exactly `lar:`
- [ ] 2. If authority is present: userinfo contains exactly two colon-delimited sub-fields — `alias:tier` form; no parenthetical phase sub-field
- [ ] 3. Host is a valid `machine_id` (alphanumeric + hyphens; no special characters)
- [ ] 4. Path contains exactly three HA.KA.BA slots after the leading `/`
- [ ] 5. Path slots contain no whitespace, path separators (`/`), or quotes (anti-collision rule)
- [ ] 6. Query parameters limited to: `stances` (once), `confidence` (once), `p` (once) — no others
- [ ] 7. `confidence` value matches pattern `[A-Z]{1,2}:[0-9]+\.[0-9]+` — e.g., `~:confidence[S],[13]`, `~:confidence[CS],[16]`, `~:confidence[C],[18]`
- [ ] 8. `p` value is a decimal in range `[0.0, 1.0]`
- [ ] 9. Fragment (if present) is five dot-separated positions, each: phase sigil (`O`/`Ø`/`D`/`A`/`Å`) followed by integer counter ≥ 0
- [ ] 10. All five chronometer positions present — no trailing-zero omission in canonical form
- [ ] 11. Exchange-closing URIs end with ` → ?`. System file URIs end with ` → ∞`.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#consistency -->
## SpanSpan Consistency Rules (§10.2)

All `lar:` URI fields in a spanSpan record (`start_uri`, `attractor_uri`, `end_uri`, `intent_header_snapshot`) must be canonical record form. A spanSpan record is **consistent** when:

- [ ] 1. All URI fields are RFC 3986-compliant canonical form (no emoji, no non-ASCII)
- [ ] 2. `current_phase` matches the phase keyword at the rightmost non-`O0` position in the fragment of `start_uri` (chronometer, not userinfo)
- [ ] 3. `chronometer_start` matches the fragment value (without `#`) of `start_uri`; `chronometer_end` matches `end_uri`
- [ ] 4. `lares_address` is the path-only strip of `start_uri` (no authority, no query, no fragment)

The rendering table (§5.1 of `lares/modules/uri-schema/URI-SCHEMA.md`) governs the canonical-to-render-target transform for HUD lines and post-headers. Render-target surfaces (glyph-rich) are not stored in spanSpan URI fields.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#stable-address-derivation -->
## Stable Address Derivation Rules (§10.3)

`lares_address` is correctly derived when:

- [ ] 1. Scheme is `lar:`
- [ ] 2. Authority is empty (double-slash `//`, no host)
- [ ] 3. Path is identical to the source `lar_uri` path (record form: `/` separators)
- [ ] 4. Query and fragment are absent

Example:
```
Source: lar://telarus:operator@enyalios/threshold.uncertain.opens/?stances=^.-.-.-.-&confidence=S:13&p=10#O0.O0.O1.O1.A11
Correct stable address: lar:///threshold.uncertain.opens/
```

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#canonical-form-comparison -->
## Canonical Form and Comparison Rules (§10.4)

When comparing two `lar:` URIs as stable addresses:

- [ ] 1. Convert both to record form (apply normalization — HUD → record — before comparison)
- [ ] 2. Compare path components **case-insensitively**
- [ ] 3. Canonical form uses **lowercase** path components — `lar:///threshold.uncertain.opens/` not `lar:///Threshold.Uncertain.Opens`
- [ ] 4. Two URIs designate the same stable address iff their lowercased machine-form paths are byte-identical
- [ ] 5. Query and fragment components are excluded from stable-address comparison

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#common-errors -->
## Common Error Patterns

Errors caught during the S0 URI alignment pass (2026-04-09):

| Error | Example | Fix |
|---|---|---|
| Query/fragment reversed | `?confidence=C:18` appearing after `#section` | Move query before fragment: `?confidence=C:18#section` |
| `stance=` (v1 field name) | `stance=🏛️` | Rename to `stances=`; use 5-position amplitude |
| `confidence=` (v1 field name) | `confidence=CS:16` | Rename to `confidence=` |
| Single-stance v1 compact | `+----` | Expand to 5-position: `^.-.-.-.-` |
| Emoji in canonical form | `stances=🏛️+🌊-...` | Use record amphitude chars: `stances=^.-.-.-.-` |
| Section URI with closing sigil | `<!-- lar:///... → ∞ -->` mid-file | Remove `→ ∞`; section URIs are waypoints only |
| Missing file-level footer | Footer URI absent | Add footer: identical to header, last line |
| Chronometer with fewer than 5 positions | `#O3.D2.A1` | Expand: `#O0.O0.O3.D2.A1` |

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#quick-scan-procedure -->
## Quick Scan Procedure

To verify URI alignment across all operational files:

```bash
# Find old-pattern field names (v1)
grep -r --include="*.md" "stance=" lares/ | grep -v "stances="
grep -r --include="*.md" "confidence=" lares/ | grep -v "#register"

# Find fragment-before-query ordering bug
grep -r --include="*.md" "#[a-zA-Z].*?confidence" lares/

# Find files missing file-level URI header/footer
grep -rL "lar:///" lares/ --include="*.md"
```

A clean scan returns zero matches on all three patterns.

---

<!-- → ? -->
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///uri.schema.holds/uri-schema/assess/?confidence=C:18#promotion-criteria -->
## Promotion Criteria

`lares/modules/uri-schema/URI-SCHEMA.md` is currently `~:confidence[CS],[19]`. For promotion to `~:confidence[C],[19]` (full Canon):

- Core anatomy (§§2–6, 10): can promote independently — design tension resolved
- Crystal integration layer (§§7–9): promotes when `lares/crystal/` settles STATE.jsonl schema
- Open questions (U1, U2, U4, U5, U8, U9): sit at Synthesis/Provisional; do not block core spec

This module (Signal) is `~:confidence[CS],[17]`. Promotion criteria:
- S0 scan verified clean ✅
- `lares/modules/uri-schema/URI-SCHEMA.md` promoted to ~:confidence[C],[19] □
- micro-trace.md exchange URIs migrated to full record form ○

<!-- → ? -->
