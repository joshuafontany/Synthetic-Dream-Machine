# ∞ → lar:///grammar.detectalignment.defines/uri_wrappers/
"""
uri_wrappers.py

Batch compliance checker for URI wrapper alignment in Lares grammar files.
This file is now located in /lares/grammar/detect-alignment/ as part of the detect-alignment loci.
Checks all text files in a target directory for required start/end URI wrappers.
Prompts the operator with a summary of failures and options for next steps.
"""
import re
import sys
from pathlib import Path

def check_uri_wrappers(lines):
    start_pattern = re.compile(r'^<!--\s*∞\s*→\s*lar:///.+-->')
    end_pattern = re.compile(r'^<!--\s*→\s*\?\s*-->')
    start_ok = bool(lines and start_pattern.match(lines[0].strip()))
    end_ok = bool(lines and end_pattern.match(lines[-1].strip()))
    return start_ok, end_ok

def scan_directory(target_dir):
    failures = []
    for file_path in Path(target_dir).rglob('*.md'):
        with file_path.open('r', encoding='utf-8') as f:
            lines = f.readlines()
        start_ok, end_ok = check_uri_wrappers(lines)
        if not (start_ok and end_ok):
            failures.append((str(file_path), start_ok, end_ok))
    return failures

def prompt_operator(failures):
    print("\n[SCAN RESULT] URI Wrapper Compliance Failures:")
    for path, start_ok, end_ok in failures:
        print(f"- {path} | Start: {'OK' if start_ok else 'MISSING'} | End: {'OK' if end_ok else 'MISSING'}")
    print("\nOperator options:")
    print("1. Auto-fix all missing wrappers (insert standard tags)")
    print("2. Review and fix manually")
    print("3. Ignore for now")
    print("\nWhat would you like to do? (1/2/3)")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python scan_uri_wrappers.py <target_dir>')
        sys.exit(1)
    failures = scan_directory(sys.argv[1])
    if failures:
        prompt_operator(failures)
        sys.exit(2)
    else:
        print('[PASS] All files have valid URI wrappers.')
        sys.exit(0)
# → ?
