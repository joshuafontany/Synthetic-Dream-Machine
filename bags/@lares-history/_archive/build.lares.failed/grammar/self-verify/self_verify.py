# ∞ → lar:///grammar.selfverify.harness/self_verify/
"""
self_verify.py

Grammar self-healing harness for the Lares grammar tree.

Casts detect_alignment and uri_wrapper_verification across the full lares/grammar/ tree,
runs lares_verification on all LOCI.md files, then surfaces a tiered OODA-HA report
with actionable next steps.

OODA-HA framing:
  Observe  — scan all files: wrappers, stream URIs, marker syntax, LOCI presence
  Orient   — aggregate failures into tiers by severity and fixability
  Decide   — prioritize: auto > suggest > manual > talk-story
  Act      — optionally apply auto-fixes (--fix)
  Assess   — print delta (what changed, what remains)

Tiers:
  auto        — missing/malformed wrappers; safe to insert automatically
  suggest     — URI forms that need operator input to resolve
  manual      — low verification scores (OODA, E-Prime, registry)
  talk-story  — directories missing LOCI.md; require scoping conversation
"""
import sys
import json
import argparse
import importlib.util
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Module loading — sibling packages
# ---------------------------------------------------------------------------

_HERE         = Path(__file__).parent
_GRAMMAR_ROOT = _HERE.parent


def _load_module(name: str, path: str):
    if os.path.exists(path):
        spec = importlib.util.spec_from_file_location(name, path)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod
    return None


_detect    = _load_module('detect_alignment',
                 str(_GRAMMAR_ROOT / 'detect-alignment' / 'detect_alignment.py'))
_wrap_ver  = _load_module('uri_wrapper_verification',
                 str(_GRAMMAR_ROOT / 'verification' / 'uri_wrapper_verification.py'))
_lares_ver = _load_module('lares_verification',
                 str(_GRAMMAR_ROOT / 'verification' / 'lares_verification.py'))


# ---------------------------------------------------------------------------
# Observe — scan
# ---------------------------------------------------------------------------

def observe(grammar_root: Path, stream: bool = False, markers: bool = True) -> dict:
    """Scan grammar tree. Returns raw observations dict."""
    obs: dict = {
        'wrapper_failures':  [],
        'stream_violations': [],
        'marker_violations': [],
        'missing_loci':      [],
        'loci_scores':       [],
    }

    # --- Wrapper + stream + marker scan (detect_alignment) ---
    if _detect:
        failures = _detect.scan_directory(
            grammar_root,
            check_stream=stream,
            check_markers=markers,
        )
        for f in failures:
            if f['issue'] == 'MISSING_LOCI':
                obs['missing_loci'].append(f['path'])
            elif f['issue'] == 'STREAM_FIELDS':
                obs['stream_violations'].append(f)
            elif f['issue'] == 'MARKER_SYNTAX':
                obs['marker_violations'].append(f)
            else:
                obs['wrapper_failures'].append(f)

    # --- LOCI verification scores ---
    if _lares_ver:
        import io, contextlib
        registry_path = grammar_root / 'LOCI.md'
        for loci_path in sorted(grammar_root.rglob('LOCI.md')):
            try:
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    results, detail = _lares_ver.verify_loci(str(loci_path), str(registry_path))
                obs['loci_scores'].append({
                    'path':    str(loci_path),
                    'results': results,
                    'detail':  detail,
                })
            except Exception as e:
                obs['loci_scores'].append({
                    'path':   str(loci_path),
                    'error':  str(e),
                    'results': {},
                    'detail':  {},
                })

    return obs


# ---------------------------------------------------------------------------
# Orient — aggregate into tiers
# ---------------------------------------------------------------------------

THRESHOLD = 0.95

def orient(obs: dict) -> dict:
    """Aggregate observations into action tiers."""
    tiers: dict = {
        'auto':       [],   # safe to fix automatically
        'suggest':    [],   # show canonical form; operator decides
        'manual':     [],   # needs content work
        'talk_story': [],   # missing LOCI.md; needs scoping
    }

    for f in obs['wrapper_failures']:
        tiers['auto'].append({
            'path': f['path'],
            'issue': 'WRAPPER',
            'start_ok': f['start_ok'],
            'end_ok': f['end_ok'],
        })

    for v in obs['stream_violations']:
        tiers['suggest'].append({
            'path': v['path'], 'line': v['line'],
            'surface': v['surface'], 'uri': v['uri'],
            'issue': 'STREAM_FIELDS', 'issues': v['issues'],
        })

    for v in obs['marker_violations']:
        tiers['suggest'].append({
            'path': v['path'], 'line': v['line'],
            'surface': v['surface'], 'uri': v['uri'],
            'issue': 'MARKER_SYNTAX', 'issues': v['issues'],
        })

    for entry in obs['loci_scores']:
        if 'error' in entry:
            tiers['suggest'].append({'path': entry['path'], 'issue': 'VERIFY_ERROR', 'error': entry['error']})
            continue
        for k, v in entry['results'].items():
            if v < THRESHOLD:
                tier = 'manual' if v >= 0.5 else 'manual'
                tiers['manual'].append({
                    'path': entry['path'], 'instrument': k, 'score': v,
                    'detail': entry['detail'].get(k, ''),
                })

    for path in obs['missing_loci']:
        tiers['talk_story'].append({'path': path, 'issue': 'MISSING_LOCI'})

    return tiers


# ---------------------------------------------------------------------------
# Decide — summarize priorities
# ---------------------------------------------------------------------------

def decide(tiers: dict) -> list[str]:
    """Return ordered list of recommended actions."""
    actions = []
    if tiers['auto']:
        actions.append(
            f"Run with --fix to auto-insert {len(tiers['auto'])} missing wrapper(s)."
        )
    if tiers['suggest']:
        actions.append(
            f"Review {len(tiers['suggest'])} URI form issue(s) — stream fields or marker syntax."
        )
    if tiers['manual']:
        actions.append(
            f"Manual work needed on {len(tiers['manual'])} LOCI instrument(s) below threshold."
        )
    if tiers['talk_story']:
        actions.append(
            f"Talk-story needed for {len(tiers['talk_story'])} director(s) missing LOCI.md."
        )
    if not actions:
        actions.append("All checks pass. Grammar tree is aligned.")
    return actions


# ---------------------------------------------------------------------------
# Act — apply auto-fixes
# ---------------------------------------------------------------------------

def act(grammar_root: Path, tiers: dict) -> list[str]:
    """Apply auto-fixable items. Returns list of fixed paths."""
    fixed = []
    if not _detect:
        return fixed
    for item in tiers['auto']:
        p = Path(item['path'])
        if not p.exists():
            continue
        ext = p.suffix.lower()
        with p.open('r', encoding='utf-8') as f:
            lines = f.readlines()
        if _detect.fix_file(p, lines, ext):
            fixed.append(str(p))
    return fixed


# ---------------------------------------------------------------------------
# Assess — print delta
# ---------------------------------------------------------------------------

def assess(tiers: dict, fixed: list[str], actions: list[str], as_json: bool = False) -> None:
    if as_json:
        print(json.dumps({
            'tiers': tiers,
            'fixed': fixed,
            'actions': actions,
            'summary': {
                'auto':       len(tiers['auto']),
                'suggest':    len(tiers['suggest']),
                'manual':     len(tiers['manual']),
                'talk_story': len(tiers['talk_story']),
                'fixed':      len(fixed),
            },
        }, indent=2))
        return

    total_issues = sum(len(v) for v in tiers.values())
    print(f"\n{'='*60}")
    print(f"  LARES GRAMMAR SELF-VERIFY  |  {total_issues} issue(s) found")
    print(f"{'='*60}")

    if tiers['auto']:
        print(f"\n[AUTO]  {len(tiers['auto'])} wrapper(s) missing:")
        for item in tiers['auto']:
            start = 'OK' if item['start_ok'] else 'MISS'
            end   = 'OK' if item['end_ok']   else 'MISS'
            print(f"  {item['path']}  start={start}  end={end}")

    if tiers['suggest']:
        print(f"\n[SUGGEST]  {len(tiers['suggest'])} URI form issue(s):")
        for item in tiers['suggest']:
            loc = f":{item['line']}" if 'line' in item else ''
            issues = ', '.join(item.get('issues', [item.get('error', item.get('issue', ''))]))
            print(f"  {item['path']}{loc}  [{item.get('surface', item.get('issue', ''))}]  {item.get('uri', '')}  — {issues}")

    if tiers['manual']:
        print(f"\n[MANUAL]  {len(tiers['manual'])} LOCI instrument(s) below threshold:")
        grouped: dict[str, list] = {}
        for item in tiers['manual']:
            grouped.setdefault(item['path'], []).append(item)
        for path, items in grouped.items():
            print(f"  {path}")
            for item in items:
                detail = f"  {item['detail']}" if item['detail'] else ''
                print(f"    {item['instrument']:20} {item['score']:.2f}{detail}")

    if tiers['talk_story']:
        print(f"\n[TALK-STORY]  {len(tiers['talk_story'])} director(s) missing LOCI.md:")
        for item in tiers['talk_story']:
            print(f"  {item['path']}")

    if fixed:
        print(f"\n[FIXED]  {len(fixed)} file(s) auto-corrected:")
        for p in fixed:
            print(f"  {p}")

    print(f"\n{'='*60}")
    print("  NEXT ACTIONS")
    print(f"{'='*60}")
    for i, action in enumerate(actions, 1):
        print(f"  {i}. {action}")
    print()

    overall = total_issues - len(fixed)
    if overall == 0:
        print("[PASS] Grammar tree fully aligned.\n")
    else:
        print(f"[PARTIAL]  {overall} issue(s) remain after this run.\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():

    parser = argparse.ArgumentParser(
        description='Lares grammar self-healing harness — OODA-HA scan, triage, and fix.'
    )
    parser.add_argument('target', nargs='?', default=None,
                        help='Target grammar subdirectory (e.g., ooda-ha, observe, etc.)')
    parser.add_argument('--root', default=str(_GRAMMAR_ROOT),
                        help='Grammar root directory (default: ../)')
    parser.add_argument('--fix', action='store_true', help='Auto-insert missing wrappers')
    parser.add_argument('--stream', action='store_true', help='Check bare lar:/// stream URIs')
    parser.add_argument('--markers', action='store_true', default=True,
                        help='Check ahu/kahea marker URI structure (default: on)')
    parser.add_argument('--json', action='store_true', help='Output structured JSON')
    parser.add_argument('--report', type=str, default=None, help='Write JSON report to file')
    args = parser.parse_args()

    # Determine grammar root
    if args.target:
        grammar_root = Path(args.root) / args.target
    else:
        grammar_root = Path(args.root)
    if not grammar_root.is_dir():
        print(f'Directory not found: {grammar_root}', file=sys.stderr)
        sys.exit(1)

    # Observe
    obs   = observe(grammar_root, stream=args.stream, markers=args.markers)
    # Orient
    tiers = orient(obs)
    # Decide
    actions = decide(tiers)
    # Act
    fixed: list[str] = []
    if args.fix:
        fixed = act(grammar_root, tiers)
        if fixed:
            # Re-orient after fixes
            obs   = observe(grammar_root, stream=args.stream, markers=args.markers)
            tiers = orient(obs)
            actions = decide(tiers)
    # Assess
    assess(tiers, fixed, actions, as_json=args.json)

    if args.report:
        with open(args.report, 'w', encoding='utf-8') as f:
            json.dump({'tiers': tiers, 'fixed': fixed, 'actions': actions}, f, indent=2)

    total_remaining = sum(len(v) for v in tiers.values())
    sys.exit(0 if total_remaining == 0 else 2)


if __name__ == '__main__':
    main()
# → ?
