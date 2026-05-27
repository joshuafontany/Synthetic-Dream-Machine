<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///grammar.detectalignment.defines/skill/?confidence=CS~16&p=10 -->

name: detect-alignment
## Files
- `detect_alignment.py`: Main compliance checker for all supported file types
- `uri_wrappers.py`: Legacy Markdown-only compliance checker (retained for reference)
<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///lares/grammar/detect-alignment/SKILL.md -->
# detect-alignment Skill

## Purpose
Batch compliance checker for lar URI wrapper and consecration alignment in Lares grammar and code files. Ensures all Markdown and supported code files have required start/end lar URI wrappers.

## Supported File Types

## Usage
```sh
python detect_alignment.py <target_dir>
```

## What it does
- Checks all files in <target_dir> for required start/end lar URI wrappers

## Wrapper Patterns

## Compliance
All files in /lares/grammar must have valid wrappers. See /lares/README.md and /lares/grammar/verify/URI_WRAPPER_LOCI.md for rules.

**This directory replaces all previous /lares/grammar/scan/ loci.**
All references to /lares/grammar/scan/ have been retired. Use /lares/grammar/detect-alignment/ exclusively.
Update all references and usage to /lares/grammar/detect-alignment/.

<!-- → ? -->
