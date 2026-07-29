"""Put scripts/ (the parent of the qa_anchor package) on sys.path so the suite
imports `from qa_anchor import ...` regardless of pytest's invocation directory —
mirroring the flat-import idiom of the sibling holder suites."""

from __future__ import annotations

import os
import sys

_SCRIPTS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)
