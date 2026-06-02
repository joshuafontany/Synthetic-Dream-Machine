# registry/ — `lar:` URI Registry and Resolver

> Scope: `lar:` URI scheme registration, resolver spec, alias ledger, promotion ledger.
> Updated: 2026-04-08
> Status: Pre-draft — URI anatomy is in `../../_todo/core/Signal_HUD_Tagspace-draft.md`; resolver is unspecified
> URI: `[pending — lar://core/design/registry@draft]`

---

## What Belongs Here

- `lar:` URI scheme registration intent (RFC 7595 guidance — from `A_deep-research-report.md`)
- URI anatomy reference (authoritative cross-reference from `../signal/` — field-by-field)
- Resolver spec: how a `lar:` URI maps to a live machine, crystal, or design unit
- Alias ledger schema: operator aliases, machine aliases, subdir promotion records
- Promotion ledger: when a design unit reaches `~:confidence[C],[19]` and gets a canonical URI, that record lives here
- LARES.jsonl or equivalent registry file spec (if needed)

## Does Not Belong Here

- URI field anatomy and HUD rendering → `../signal/`
- Crystal STATE.jsonl ledger → `../crystal/`
- TOML module schemas → `../schemas/`

---

## Primary Sources

| File | Consumed? | Notes |
|---|---|---|
| `../../_todo/core/Signal_HUD_Tagspace-draft.md` | No | URI Schema section; dual rendering; Chronometer field |
| `../../_todo/core/A_deep-research-report.md` | No | RFC 7595 notes; `lar:` URI private-use registration guidance |

---

## Design Status

Pre-draft. URI anatomy is in the signal layer draft. Resolver and registry are entirely unspecified — this is a greenfield subdir.

**Note:** The `lar:` URI scheme is private/internal. RFC 3986 and 7595 provide structural guidance; no IANA registration is required or planned. The scheme's semantics are self-contained to this system.
