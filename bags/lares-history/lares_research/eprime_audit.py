#!/usr/bin/env python3
"""E-Prime audit tool for Lares prompt source files.

Flags lines containing forms of the verb "to be" used as identity or
predication. Used to enforce the E-Prime discipline described in
builds/agents/AGENTS.md -> Operational Language & E-Prime Spec.

Usage:
    python3 builds/scripts/eprime_audit.py FILE [FILE ...]

Output:
    FILE:LINE [GROUP] [likely-aux?] -> line text

    Groups:
        BE_VERB     -- is, are, was, were, am, be, been, being
        CONTRACT    -- it's, that's, there's, he's, she's (as "is")

    [likely aux] annotation: the BE_VERB match is immediately followed
    by a token ending in -ing or -ed, suggesting auxiliary use (lower
    predication risk). Still flagged for human review; default
    disposition is non-violation unless context shows predication weight.

Exclusions (lines not flagged):
    - Lines inside triple-backtick fenced code blocks
    - Lines containing <!-- eprime-ok -->
    - Lines that are part of markdown tables containing quoted counter-
      examples (inline code spans within table cells)

Exit code: 0 always (audit tool; caller decides pass/fail threshold).
"""

import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

# BE_VERB: main verb forms of "to be" — word-boundary anchored.
BE_VERB_PATTERN = re.compile(
    r'\b(is|are|was|were|am|be|been|being)\b',
    re.IGNORECASE,
)

# CONTRACTION: 's = "is" forms. Only the forms where 's signals "is".
CONTRACT_PATTERN = re.compile(
    r"\b(it's|that's|there's|he's|she's)\b",
    re.IGNORECASE,
)

# Auxiliary-is heuristic: the token immediately after the match ends in
# -ing or -ed (present/past participle -> helper verb, not predication).
# We look ahead two whitespace-separated tokens to catch "is now running".
AUX_LOOKAHEAD = re.compile(r'\b(?:ing|ed)\b', re.IGNORECASE)


def likely_auxiliary(line: str, match: re.Match) -> bool:
    """Return True if the BE_VERB match appears to be an auxiliary."""
    after = line[match.end():].strip()
    # Grab the next 1-2 whitespace-separated tokens
    tokens = after.split(None, 2)[:2]
    for tok in tokens:
        # Strip punctuation from token end before testing
        clean = tok.rstrip('.,;:!?\'")')
        if clean.lower().endswith(('ing', 'ed')):
            return True
    return False


# ---------------------------------------------------------------------------
# Audit logic
# ---------------------------------------------------------------------------

EPRIME_OK_MARKER = '<!-- eprime-ok -->'
FENCE = '```'


def audit_file(path: Path) -> list[dict]:
    """Return a list of flag records for *path*."""
    flags = []
    in_code_block = False

    with path.open(encoding='utf-8') as fh:
        for lineno, raw_line in enumerate(fh, start=1):
            line = raw_line.rstrip('\n')

            # Toggle code-block state
            stripped = line.strip()
            if stripped.startswith(FENCE):
                in_code_block = not in_code_block
                continue

            # Skip lines inside fenced code blocks
            if in_code_block:
                continue

            # Skip lines with explicit ok marker
            if EPRIME_OK_MARKER in line:
                continue

            # --- BE_VERB ---
            for m in BE_VERB_PATTERN.finditer(line):
                aux = likely_auxiliary(line, m)
                flags.append({
                    'file': str(path),
                    'line': lineno,
                    'group': 'BE_VERB',
                    'likely_aux': aux,
                    'match': m.group(0),
                    'text': line,
                })

            # --- CONTRACTION ---
            for m in CONTRACT_PATTERN.finditer(line):
                flags.append({
                    'file': str(path),
                    'line': lineno,
                    'group': 'CONTRACT',
                    'likely_aux': False,
                    'match': m.group(0),
                    'text': line,
                })

    return flags


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------

def render_flags(flags: list[dict]) -> None:
    """Print flag records to stdout."""
    if not flags:
        return
    current_file = None
    for f in flags:
        if f['file'] != current_file:
            current_file = f['file']
            print(f"\n=== {current_file} ===")
        aux_tag = ' [likely aux]' if f['likely_aux'] else ''
        print(
            f"  {f['line']:4d}  [{f['group']}]{aux_tag}  {f['match']!r}"
            f"\n        → {f['text']}"
        )


def render_summary(all_flags: dict[str, list[dict]]) -> None:
    """Print per-file summary counts."""
    print("\n--- Summary ---")
    total_flagged = 0
    total_aux = 0
    for filepath, flags in all_flags.items():
        aux_count = sum(1 for f in flags if f['likely_aux'])
        hard_count = len(flags) - aux_count
        total_flagged += len(flags)
        total_aux += aux_count
        print(
            f"  {Path(filepath).name}: "
            f"{len(flags)} flags  "
            f"({hard_count} predication / {aux_count} likely-aux)"
        )
    print(
        f"\n  Total: {total_flagged} flags  "
        f"({total_flagged - total_aux} predication / {total_aux} likely-aux)"
    )
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} FILE [FILE ...]", file=sys.stderr)
        sys.exit(1)

    all_flags: dict[str, list[dict]] = {}
    for arg in sys.argv[1:]:
        path = Path(arg)
        if not path.exists():
            print(f"ERROR: {arg} not found", file=sys.stderr)
            continue
        flags = audit_file(path)
        all_flags[str(path)] = flags
        render_flags(flags)

    render_summary(all_flags)


if __name__ == '__main__':
    main()
