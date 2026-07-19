"""Put scripts/ (the parent of this testbeds/ dir) on sys.path so the bed suite
resolves the CORE spine by its flat name (`import content_io`, `import
capture_corpus`, `import kumulipo_sections`, `import ffz_continuous_pour`)
regardless of pytest's invocation directory. The bed modules themselves resolve
each other as siblings through pytest's own testbeds/-on-path insertion — this
shim only reaches back to the parent for the core modules the beds lean on.

Mirrors the sibling qa_anchor/tests/conftest.py idiom, one level shallower."""

from __future__ import annotations

import os
import sys

_SCRIPTS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
