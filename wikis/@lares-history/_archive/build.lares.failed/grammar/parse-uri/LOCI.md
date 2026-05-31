<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.parseuri.defines/parse-uri/?confidence=CS:16&p=10 -->

# Grammar: parse-uri Skill

This locus defines the deterministic parser and validator for canonical `lar:` URIs.

- Enforces all canonical and supplemental grammar rules
- Used by wrapper, registry, and batch verification tools
- See: parse_uri.py in this directory

## Purpose
- Provide a single source of truth for URI parsing and validation
- Ensure all wrappers, registry entries, and agent/CI flows use the same logic

## Canonical Spec
- [../uri/LOCI.md](../uri/LOCI.md)
- [../../modules/uri-schema/URI_SCHEMA.md](../../modules/uri-schema/URI_SCHEMA.md)
- [../../modules/uri-schema/URI_SCHEME_SPEC.md](../../modules/uri-schema/URI_SCHEME_SPEC.md)
- [../../modules/uri-schema/decide/CONVENTIONS.md](../../modules/uri-schema/decide/CONVENTIONS.md)
- [../../modules/uri-schema/assess/VERIFICATION.md](../../modules/uri-schema/assess/VERIFICATION.md)

---

> This skill is the reference for all URI parsing and validation in the Lares grammar tree.

---

<!-- → ? -->
