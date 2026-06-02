# ∞ → lar:///grammar.detectalignment.defines/detect_alignment/
"""
detect_alignment.py

Batch scanner for lar URI wrapper and consecration alignment in Lares grammar and code files.
Scans all Markdown, code, and text files in a target directory for required start/end lar URI wrappers.
Prompts the operator with a summary of failures and options for next steps.
"""
import re
import sys
import json
from pathlib import Path

# --- Marker grammar ---
# Four kahua markers, each with distinct syntax rules:
#
#   locus   <!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///ha.ka.ba[/path][?params] -->   opens a content span (file-level)
#   ahu     <!-- ahu lar:///ha.ka.ba[/path][?params][#section] -->   bookmark/waypoint
#   kahea   <!-- kahea lar:///ha.ka.ba[/path][?params][#section] --> transclusion pull
#   lares   lar:///ha.ka.ba[/path][?params][#chrono]               bare daemon pointer
#
# Only bare lar:/// live pointers (daemon surface) require stances= + chronometer.
# ahu and kahea markers require valid ha.ka.ba URI structure but NOT stances/chrono.

# Canonical ha.ka.ba URI — three dot-separated SINGLE WORDS, optional subpath/query/fragment.
# Each segment must be one unbroken alphanumeric word (no hyphens, no underscores).
# "grammar.parse.defines" is valid; "grammar.parse-uri.defines" is not.
# TODO(future-me): enforce memetic associations — ha=territory, ka=kind, ba=stance —
# via a live registry lookup. Deferred until the grammar registry is queryable.
_HAKABA_URI = re.compile(
    r'^lar:///[a-zA-Z0-9]+\.[a-zA-Z0-9]+\.[a-zA-Z0-9][^?#\s]*'
    r'(?:\?[^#\s]*)?(?:#[a-zA-Z0-9_\-]+)?$'
)
AHU_MARKER_PATTERN   = re.compile(r'<!--\s*ahu\s+(lar:///[^\s>]+?)\s*-->')
KAHEA_MARKER_PATTERN = re.compile(r'<!--\s*kahea\s+(lar:///[^\s>]+?)\s*-->')

# Ahu skip pattern — ahu lines excluded from bare-pointer scanning
AHU_SKIP_PATTERN   = re.compile(r'<!--\s*ahu\s+lar:///')

# Known URI templates and placeholder patterns — skipped in marker syntax checks
# These appear in documentation, grammar specs, and code comments as illustrative examples.
KNOWN_URI_TEMPLATES: frozenset[str] = frozenset({
    'lar:///ha.ka.ba',
    'lar:///...',
    'lar:///PLACEHOLDER',
    'lar:///TERRITORY/',
    'lar:///foo/bar',
    'lar:///foo/bar/',
})
# Bracket-notation doc examples: lar:///ha.ka.ba[/path][?params][#section]
_TEMPLATE_BRACKET_RE = re.compile(r'^lar:///[^\s]*\[')


_NO_DOT_SEGMENT_RE = re.compile(r'^lar:///[a-zA-Z0-9_\-]+[/?#]')


def _is_template_uri(uri: str) -> bool:
    """Return True if the URI looks like a placeholder/template, not a real pointer."""
    if uri.rstrip('/') in KNOWN_URI_TEMPLATES or uri in KNOWN_URI_TEMPLATES:
        return True
    if _TEMPLATE_BRACKET_RE.match(uri):
        return True
    if '...' in uri:
        return True
    # Single-segment path with no dots — doc shorthand like lar:///path/ or lar:///path/#section
    if _NO_DOT_SEGMENT_RE.match(uri):
        return True
    return False

# Bare pointer detection — valid ha.ka.ba structure required (excludes regex/template fragments)
_VALID_URI = r'(lar:///[a-zA-Z0-9][a-zA-Z0-9]*\.[a-zA-Z0-9][a-zA-Z0-9]*\.[a-zA-Z0-9][^\s\'"<>`\])\}]*)'
# Bare in Markdown: not inside backtick spans, not on ahu lines
BARE_MD_PATTERN    = re.compile(r'(?<!`)' + _VALID_URI + r'(?!`)')
# Bare in code: only on comment lines (not string literals), not ahu lines
BARE_HASH_PATTERN  = re.compile(r'^\s*#\s+' + _VALID_URI)
BARE_SLASH_PATTERN = re.compile(r'^\s*//\s+' + _VALID_URI)
CHRONOMETER_REGEX  = re.compile(r'^(O|Ø|D|A|Å)\d+(\.(O|Ø|D|A|Å)\d+){4}$')

# Per-extension bare-pointer pattern
_BARE_PATTERNS: dict[str, re.Pattern] = {
    '.md':   BARE_MD_PATTERN,
    '.py':   BARE_HASH_PATTERN,
    '.sh':   BARE_HASH_PATTERN,
    '.js':   BARE_SLASH_PATTERN,
    '.ts':   BARE_SLASH_PATTERN,
    '.c':    BARE_SLASH_PATTERN,
    '.cpp':  BARE_SLASH_PATTERN,
    '.java': BARE_SLASH_PATTERN,
}


def _uri_stream_issues(uri: str) -> list[str]:
    """Return list of missing stream fields for an operator-stream URI."""
    issues = []
    has_stances = bool(re.search(r'[?&]stances=', uri))
    frag_m = re.search(r'#([^#\s]+)\s*$', uri)
    has_chrono = bool(frag_m and CHRONOMETER_REGEX.match(frag_m.group(1)))
    if not has_stances:
        issues.append('missing stances=')
    if not has_chrono:
        issues.append('missing chronometer fragment')
    return issues


def scan_marker_syntax(lines: list[str]) -> list[dict]:
    """
    Scan file body for ahu and kahea markers with malformed URIs.
    Valid form requires a canonical ha.ka.ba path structure.
    Fragment must be a plain section name (not chronometer — bookmarks use section anchors).
    Returns list of violations with line, marker type, uri, and issues.
    """
    violations = []
    body = lines[1:-1] if len(lines) > 2 else []
    for offset, line in enumerate(body, start=2):
        raw = line.rstrip('\n')
        for pat, surface in ((AHU_MARKER_PATTERN, 'ahu'), (KAHEA_MARKER_PATTERN, 'kahea')):
            for m in pat.finditer(raw):
                uri = m.group(1)
                if _is_template_uri(uri):
                    continue
                issues = []
                if not _HAKABA_URI.match(uri):
                    issues.append('URI does not match canonical ha.ka.ba form')
                # Check for context-insensitive or generic fragment (unless marked as template/ok)
                frag_m = re.search(r'#([a-zA-Z0-9_\-]+)$', uri)
                if frag_m and 'uri ok' not in raw:
                    frag = frag_m.group(1)
                    # List of generic or discouraged fragments (expand as needed)
                    generic_frags = {'procedures', 'conventions', 'members', 'identity', 'loop-position', 'handoff', 'reading-test', 'cross-references'}
                    if frag in generic_frags:
                        issues.append(f'Fragment "{frag}" is not context-sensitive; use a specific section or mark as template with <!-- uri ok -->')
                if issues:
                    violations.append({
                        'line': offset, 'surface': surface,
                        'uri': uri, 'issues': issues,
                    })
    return violations


_SKILL_NAME_RE  = re.compile(r'^#+\s*[Ss][Kk][Ii][Ll][Ll]\s*:?\s*(.+)')
_YAML_NAME_RE   = re.compile(r'^name:\s*(\S+)', re.MULTILINE)


def _derive_skill_name(lines: list[str], file-path: 'Path | None' = None) -> str | None:
    """Derive a skill name from a heading line or from the parent directory name."""
    for line in lines:
        m = _SKILL_NAME_RE.match(line.strip())
        if m:
            return m.group(1).strip().lower().replace(' ', '-')
    if file-path is not None:
        return file-path.parent.name
    return None


def scan_skill_name(lines: list[str], file-path: 'Path | None' = None) -> list[dict]:
    """
    Check that a SKILL.md file declares a name: field in a YAML block.
    Returns a violation dict if name: is absent, with a suggested fix.
    """
    text = ''.join(lines)
    # Accept name: inside a ```yaml block or as a bare line
    if _YAML_NAME_RE.search(text):
        return []
    derived = _derive_skill_name(lines, file-path)
    suggested = f'name: {derived}' if derived else 'name: <skill-name>'
    return [{
        'issue': 'SKILL_NAME',
        'issues': ['SKILL.md missing name: field'],
        'suggested_fix': suggested,
    }]


def fix_skill_name(file-path: 'Path', lines: list[str]) -> bool:
    """
    Insert a name: field after the locus wrapper line (line 0) in a SKILL.md.
    Returns True if the file was modified.
    """
    derived = _derive_skill_name(lines, file-path)
    name_line = f'name: {derived}\n' if derived else 'name: skill\n'
    # Insert after wrapper (line 0), before the blank line or first heading
    insert_at = 1
    if len(lines) > 1 and lines[1].strip() == '':
        insert_at = 2  # after the blank line following the wrapper
    lines.insert(insert_at, name_line)
    with file-path.open('w', encoding='utf-8') as f:
        f.writelines(lines)
    return True


def scan_stream_uris(lines: list[str], ext: str = '.md') -> list[dict]:
    """
    Scan file body for bare lar:/// operator-stream pointers missing stances= or chronometer.
    ahu markers are bookmarks — excluded. Lines 1 and last (wrappers) are skipped.
    """
    bare_pat = _BARE_PATTERNS.get(ext, BARE_MD_PATTERN)
    violations = []
    body = lines[1:-1] if len(lines) > 2 else []
    for offset, line in enumerate(body, start=2):
        raw = line.rstrip('\n')
        if AHU_SKIP_PATTERN.search(raw):
            continue
        for m in bare_pat.finditer(raw):
            uri = m.group(1).rstrip('.,;)')
            issues = _uri_stream_issues(uri)
            if issues:
                violations.append({'line': offset, 'surface': 'bare', 'uri': uri, 'issues': issues})
    return violations


COMMENT_PATTERNS = {
    '.md':   (r'^<!--\s*∞\s*→\s*lar:///.+-->$',    r'^<!--\s*→\s*\?\s*-->$'),
    '.py':   (r'^#\s*∞\s*→\s*lar:///.+',            r'^#\s*→\s*\?\s*$'),
    '.sh':   (r'^#\s*∞\s*→\s*lar:///.+',            r'^#\s*→\s*\?\s*$'),
    '.js':   (r'^//\s*∞\s*→\s*lar:///.+',           r'^//\s*→\s*\?\s*$'),
    '.ts':   (r'^//\s*∞\s*→\s*lar:///.+',           r'^//\s*→\s*\?\s*$'),
    '.c':    (r'^/\*\s*∞\s*→\s*lar:///.+\*/$',      r'^/\*\s*→\s*\?\s*\*/$'),
    '.cpp':  (r'^/\*\s*∞\s*→\s*lar:///.+\*/$',      r'^/\*\s*→\s*\?\s*\*/$'),
    '.java': (r'^/\*\s*∞\s*→\s*lar:///.+\*/$',      r'^/\*\s*→\s*\?\s*\*/$'),
}

# Canonical wrapper templates — start uses PLACEHOLDER for the URI path
CANONICAL_WRAPPERS = {
    '.md':   ('<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<!-- ∞ → lar:///PLACEHOLDER -->\n', '<!-- → ? -->'),
    '.py':   ('# ∞ → lar:///PLACEHOLDER\n',         '# → ?'),
    '.sh':   ('# ∞ → lar:///PLACEHOLDER\n',         '# → ?'),
    '.js':   ('// ∞ → lar:///PLACEHOLDER\n',        '// → ?'),
    '.ts':   ('// ∞ → lar:///PLACEHOLDER\n',        '// → ?'),
    '.c':    ('/* ∞ → lar:///PLACEHOLDER */\n',     '/* → ? */'),
    '.cpp':  ('/* ∞ → lar:///PLACEHOLDER */\n',     '/* → ? */'),
    '.java': ('/* ∞ → lar:///PLACEHOLDER */\n',     '/* → ? */'),
}

URI_PLACEHOLDER = 'ha.ka.ba'


def _extract_existing_uri(line: str) -> str | None:
    """Return the lar:/// path from an existing start wrapper, or None."""
    m = re.search(r'lar:///([^ >*]+)', line)
    return m.group(1).rstrip() if m else None


def _canonical_start(ext: str, uri_path: str | None = None) -> str:
    tmpl, _ = CANONICAL_WRAPPERS[ext]
    path = uri_path if uri_path else URI_PLACEHOLDER
    return tmpl.replace('PLACEHOLDER', path)


def _canonical_end(ext: str) -> str:
    _, end = CANONICAL_WRAPPERS[ext]
    return end


def check_uri_wrappers(lines, ext):
    start_pat, end_pat = COMMENT_PATTERNS.get(ext, (None, None))
    if not start_pat or not end_pat:
        return True, True  # Ignore unknown types
    start_ok = bool(lines and re.match(start_pat, lines[0].strip()))
    end_ok = bool(lines and re.match(end_pat, lines[-1].strip()))
    return start_ok, end_ok


def suggested_fix(lines, ext) -> dict:
    """Return suggested start/end wrapper strings for a file."""
    start_ok, end_ok = check_uri_wrappers(lines, ext)
    existing_uri = _extract_existing_uri(lines[0].strip()) if lines else None
    return {
        'start': _canonical_start(ext, existing_uri) if not start_ok else None,
        'end': _canonical_end(ext) if not end_ok else None,
    }


def fix_file(file-path: Path, lines: list[str], ext: str) -> bool:
    """Insert missing wrappers in-place. Returns True if the file was modified."""
    start_ok, end_ok = check_uri_wrappers(lines, ext)
    if start_ok and end_ok:
        return False

    existing_uri = _extract_existing_uri(lines[0].strip()) if lines else None

    if not start_ok:
        lines.insert(0, _canonical_start(ext, existing_uri))

    if not end_ok:
        # Ensure file ends with a newline before appending the end wrapper
        if lines and not lines[-1].endswith('\n'):
            lines[-1] += '\n'
        lines.append(_canonical_end(ext) + '\n')

    with file-path.open('w', encoding='utf-8') as f:
        f.writelines(lines)
    return True


def scan_directory(target_dir, check_stream=False, check_markers=False, check_skill_names=True):
    failures = []
    SKIP_DIRS = {'__pycache__', '.git', 'node_modules'}

    # Check for missing LOCI.md in each nested directory
    for dir_path in Path(target_dir).rglob('*'):
        if dir_path.is_dir() and dir_path.name not in SKIP_DIRS:
            loci_file = dir_path / 'LOCI.md'
            if not loci_file.exists():
                failures.append({
                    'path': str(loci_file),
                    'type': 'dir',
                    'issue': 'MISSING_LOCI',
                    'start_ok': None,
                    'end_ok': None,
                    'lines': None,
                })
    # Check file wrappers (and optionally stream URI fields)
    for file-path in Path(target_dir).rglob('*'):
        if not file-path.is_file():
            continue
        if any(p in SKIP_DIRS for p in file-path.parts):
            continue
        ext = file-path.suffix.lower()
        if ext not in COMMENT_PATTERNS:
            continue
        with file-path.open('r', encoding='utf-8') as f:
            lines = f.readlines()
        start_ok, end_ok = check_uri_wrappers(lines, ext)
        if not (start_ok and end_ok):
            failures.append({
                'path': str(file-path),
                'type': ext,
                'issue': 'WRAPPER',
                'start_ok': start_ok,
                'end_ok': end_ok,
                'lines': lines,
            })
        if check_stream:
            for v in scan_stream_uris(lines, ext):
                failures.append({
                    'path': str(file-path), 'type': ext,
                    'issue': 'STREAM_FIELDS',
                    'line': v['line'], 'surface': v['surface'],
                    'uri': v['uri'], 'issues': v['issues'], 'lines': None,
                })
        if check_markers:
            for v in scan_marker_syntax(lines):
                failures.append({
                    'path': str(file-path), 'type': ext,
                    'issue': 'MARKER_SYNTAX',
                    'line': v['line'], 'surface': v['surface'],
                    'uri': v['uri'], 'issues': v['issues'], 'lines': None,
                })
        if check_skill_names and file-path.name == 'SKILL.md':
            for v in scan_skill_name(lines, file-path):
                failures.append({
                    'path': str(file-path), 'type': ext,
                    'issue': 'SKILL_NAME',
                    'issues': v['issues'],
                    'suggested_fix': v['suggested_fix'],
                    'lines': lines,
                })
    return failures


def prompt_operator(failures, as_json=False, do_fix=False):
    result = {
        'failures': [],
        'operator_options': [
            'Auto-fix all missing wrappers (insert standard tags)',
            'Review and fix manually',
            'Ignore for now',
        ],
    }
    for fail in failures:
        if fail['issue'] == 'MISSING_LOCI':
            entry = {
                'path': fail['path'],
                'type': 'dir',
                'issue': 'MISSING_LOCI',
                'message': f"[DIR] MISSING LOCI.md file: {fail['path']}",
            }
            result['failures'].append(entry)
        elif fail['issue'] == 'SKILL_NAME':
            entry = {
                'path': fail['path'],
                'type': fail['type'],
                'issue': 'SKILL_NAME',
                'issues': fail['issues'],
                'message': f"{fail['path']} — {', '.join(fail['issues'])}",
                'suggested_fix': {'name_line': fail['suggested_fix']},
            }
            if do_fix:
                fixed = fix_skill_name(Path(fail['path']), fail['lines'])
                entry['fixed'] = fixed
            result['failures'].append(entry)
        elif fail['issue'] in ('STREAM_FIELDS', 'MARKER_SYNTAX'):
            entry = {
                'path': fail['path'],
                'type': fail['type'],
                'issue': fail['issue'],
                'line': fail['line'],
                'surface': fail['surface'],
                'uri': fail['uri'],
                'issues': fail['issues'],
                'message': (
                    f"{fail['path']}:{fail['line']} [{fail['surface']}] "
                    f"{fail['uri']} — {', '.join(fail['issues'])}"
                ),
            }
            result['failures'].append(entry)
        else:
            fix = suggested_fix(fail['lines'], fail['type'])
            entry = {
                'path': fail['path'],
                'type': fail['type'],
                'issue': 'WRAPPER',
                'start_ok': fail['start_ok'],
                'end_ok': fail['end_ok'],
                'message': (
                    f"{fail['path']} ({fail['type']}) | "
                    f"Start: {'OK' if fail['start_ok'] else 'MISSING'} | "
                    f"End: {'OK' if fail['end_ok'] else 'MISSING'}"
                ),
                'suggested_fix': {k: v for k, v in fix.items() if v is not None},
            }

            if do_fix:
                fixed = fix_file(Path(fail['path']), fail['lines'], fail['type'])
                entry['fixed'] = fixed

            result['failures'].append(entry)

    if as_json:
        print(json.dumps(result, indent=2))
    else:
        print("\n[SCAN RESULT] Alignment/Consecration Failures:")
        for f in result['failures']:
            print(f"- {f['message']}")
            fix_hints = f.get('suggested_fix', {})
            if fix_hints.get('start'):
                print(f"  Suggested start: {fix_hints['start'].rstrip()}")
            if fix_hints.get('end'):
                print(f"  Suggested end:   {fix_hints['end']}")
            if do_fix:
                status = 'FIXED' if f.get('fixed') else 'unchanged'
                print(f"  [{status}]")
        if not do_fix:
            print("\nOperator options:")
            for i, opt in enumerate(result['operator_options'], 1):
                print(f"{i}. {opt}")
            print("\nWhat would you like to do? (1/2/3)")
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(
        description='Detect alignment and LOCI.md compliance in Lares grammar/code files.'
    )
    parser.add_argument('target_dir', help='Target directory to check')
    parser.add_argument('--json',   action='store_true', help='Output results as JSON for AI/agent consumption')
    parser.add_argument('--report', type=str, default=None, help='Write full JSON batch report to file')
    parser.add_argument('--fix',    action='store_true', help='Auto-insert missing wrappers in-place')
    parser.add_argument('--stream', action='store_true',
                        help='Check bare lar:/// live pointers for required stances= and chronometer fragment')
    parser.add_argument('--markers', action='store_true',
                        help='Check ahu and kahea marker URIs for canonical ha.ka.ba structure')
    parser.add_argument('--no-skill-names', action='store_true',
                        help='Disable SKILL.md name: field check (on by default)')
    args = parser.parse_args()

    failures = scan_directory(
        args.target_dir,
        check_stream=args.stream,
        check_markers=args.markers,
        check_skill_names=not args.no_skill_names,
    )
    if failures:
        result = prompt_operator(failures, as_json=args.json, do_fix=args.fix)
        if args.report:
            with open(args.report, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2)
        sys.exit(2)
    else:
        pass_result = {'status': 'PASS', 'message': 'All files have valid lar URI wrappers and LOCI.md files.'}
        if args.report:
            with open(args.report, 'w', encoding='utf-8') as f:
                json.dump(pass_result, f, indent=2)
        if args.json:
            print(json.dumps(pass_result, indent=2))
        else:
            print('[PASS] All files have valid lar URI wrappers and LOCI.md files.')
        sys.exit(0)


if __name__ == '__main__':
    main()
# → ?
