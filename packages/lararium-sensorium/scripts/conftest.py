"""Pytest config for the sensorium scripts — the SHARED-GROUND FENCE, plus the slow-test gate.

THE GROUND EVERY TEST IN THIS TREE STANDS ON. These suites drive real holders: each one opens a
chroma PersistentClient, resolves an XDG path, and reads a HOME-rooted corpus. None of that is
per-test unless something makes it per-test, and the three leaks below all measured live:

  1. HANDLES NEVER CLOSED. `mempalace.palace.get_collection` caches ONE PersistentClient per palace
     dir on a long-lived backend singleton and never closes it. Measured over `test_content_io.py`
     alone: open fds 31 -> 312 across 28 tests (~10 per test), while `test_loci_io.py` — same run,
     no chroma — held flat at 312. Over a whole-suite run the curve ran 12 -> 1245 and a set of
     wall-clock-deadline guards (`serve_loop` idle-reap, 0.5s TTL under a 5s assert) lost their
     margin and reddened, each one green when its file ran alone.

  2. THE REAL HOME. `session_discovery` resolves `~/.claude/projects`, `~/.codex/sessions` and the
     copilot store AT IMPORT TIME, so no later monkeypatch can move them: a test that reaches the
     sweep path mines the operator's actual chat corpus (1912 + 146 sessions, 1.6 GB on the box this
     was written on) into a tmp palace, which reads as a hang. `meta_io` likewise reads the
     operator's real `~/.config/lares/meta.json` — plant one and two `test_meta_io` tests red on
     content they never wrote.

  3. ENV THAT OUTLIVES ITS TEST. A bare `os.environ[...] = ...` (or product code that stamps an env
     var and never restores it) leaks into every later test in the process. This exact shape is a
     live defect in the vendored mempalace: `service.run_mine` stamps `MEMPALACE_PALACE_PATH`,
     `MempalaceConfig.palace_path` reads that env var AHEAD of the file config, and a later suite
     resolves a palace that a previous test's teardown already deleted.

The sibling conftest at `mempalace/tests/conftest.py` fences (1) and (2) for the vendored suite.
That suite sits outside this repo's `testpaths`, so the fenced conftest guarded a suite the
canonical `pytest` never runs while the suite it DOES run stood open. This file closes that gap.

WHY A READER AND NOT A LIST. The env half FAILS LOUD naming any key a test left changed, rather
than enumerating the keys we happen to know about. An enumeration cannot notice the key it missed —
which is precisely how `MEMPALACE_PALACE_PATH` walked past a hand-written eight-global reset list.
"""
import inspect
import os
import shutil
import tempfile

import pytest

# ═══════════════════════════════════════════════════════════════════════════════════════════════
#  THE HOME FENCE — at import, before any test module imports a holder.
# ═══════════════════════════════════════════════════════════════════════════════════════════════
# This runs at conftest import, which precedes every test module import, which is the only moment
# that works: `session_discovery` computes `_CLAUDE_ROOT = os.path.expanduser("~/.claude/projects")`
# as a MODULE CONSTANT, so a fixture that moves HOME after that import moves nothing.

_REAL_HOME = os.environ.get("HOME") or os.path.expanduser("~")
_SESSION_HOME = tempfile.mkdtemp(prefix="lares_sensorium_session_")

_HOME_VARS = ("HOME", "USERPROFILE", "HOMEDRIVE", "HOMEPATH")
_ORIGINAL_HOME_ENV = {v: os.environ.get(v) for v in _HOME_VARS}

os.environ["HOME"] = _SESSION_HOME
os.environ["USERPROFILE"] = _SESSION_HOME
os.environ["HOMEDRIVE"] = os.path.splitdrive(_SESSION_HOME)[0] or "C:"
os.environ["HOMEPATH"] = os.path.splitdrive(_SESSION_HOME)[1] or _SESSION_HOME

# MODEL CACHES STAY POINTED AT THE REAL ONES. The fence exists to stop tests READING and WRITING the
# operator's data, never to make them re-download a 79 MB ONNX model (or the stanza constituency
# model, or an HF checkpoint) on every run. These are read-mostly caches outside the operator's
# working data, so they ride the real home deliberately — each named, none inherited by accident.
for _cache_var, _real_path in (
    ("XDG_CACHE_HOME", os.path.join(_REAL_HOME, ".cache")),
    ("NLTK_DATA", os.path.join(_REAL_HOME, "nltk_data")),
    ("STANZA_RESOURCES_DIR", os.path.join(_REAL_HOME, "stanza_resources")),
):
    if _cache_var not in os.environ and os.path.isdir(_real_path):
        os.environ[_cache_var] = _real_path

# chromadb resolves its ONNX download path at class-definition time off the then-current home, so it
# needs the same pointer set by hand (the shape `mempalace/tests/conftest.py` already carries).
try:  # pragma: no cover - absent chromadb simply means no embedder to point
    from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2

    _onnx_cache = os.path.join(_REAL_HOME, ".cache", "chroma", "onnx_models", "all-MiniLM-L6-v2")
    if os.path.isdir(_onnx_cache):
        ONNXMiniLM_L6_V2.DOWNLOAD_PATH = _onnx_cache
except Exception:  # noqa: BLE001 — a missing/renamed embedder must never sink collection
    pass


def pytest_sessionfinish(session, exitstatus):
    """Put the operator's home back and drop the session sandbox."""
    for var, original in _ORIGINAL_HOME_ENV.items():
        if original is None:
            os.environ.pop(var, None)
        else:
            os.environ[var] = original
    shutil.rmtree(_SESSION_HOME, ignore_errors=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════════
#  THE PER-TEST FENCE — handles closed, env restored, drift named.
# ═══════════════════════════════════════════════════════════════════════════════════════════════

#: Keys whose drift says nothing about the test, each with the reason it earns the pass — the shape
#: `heavy-roster-is-complete.test.ts::ALLOWED_LIGHT` already uses, so an exemption stays something a
#: reader can weigh rather than a silent omission. Add here only for a THIRD-PARTY one-shot; a var
#: our own code or a test sets belongs in the report, not on this list.
_ENV_EXEMPT = {
    "PYTEST_CURRENT_TEST": "the runner's own per-test marker",
    "PYTEST_XDIST_WORKER": "the runner's worker identity",
    "PYTEST_XDIST_WORKER_COUNT": "the runner's worker identity",
    # torch stamps this once, on first inductor use, to a stable path under the OS tmpdir. It is a
    # library cache pointer rather than test state: idempotent, identical for every later test, and
    # nothing in this tree reads it. Whichever test happens to import torch first would otherwise
    # carry the blame for the library's initialisation.
    "TORCHINDUCTOR_CACHE_DIR": "torch's one-shot inductor cache pointer, set on first use",
}


def _close_open_palaces() -> None:
    """Close every chroma client the test left open on the shared backend singleton.

    `get_collection` caches one PersistentClient per palace dir on a module-level backend that
    outlives the test, and chromadb frees the rust-side SQLite/HNSW handles only on `close()` — a
    bare dereference leaves them open. `close_palace` drops the handle without marking the backend
    closed, so it stays reusable for the next test.
    """
    try:
        from mempalace import palace as _palace

        backend = getattr(_palace, "_DEFAULT_BACKEND", None)
        clients = getattr(backend, "_clients", None)
        if clients:
            for path in list(clients):
                try:
                    backend.close_palace(path)
                except Exception:  # noqa: BLE001 — a client that will not close must not sink the test
                    pass
    except (ImportError, AttributeError):
        pass

    # Per-process verdict caches keyed by palace path: a later test that lands on a reused path
    # would otherwise inherit the previous test's quarantine verdict or capacity reading.
    try:
        from mempalace.backends.chroma import ChromaBackend, reset_hnsw_capacity_cache

        ChromaBackend._quarantined_paths.clear()
        reset_hnsw_capacity_cache()
    except (ImportError, AttributeError):
        pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_setup(item):
    """Snapshot the environment before the test's own fixtures run."""
    item.stash_env_before = dict(os.environ)
    yield


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_teardown(item, nextitem):
    """Run AFTER every finalizer (monkeypatch's undo included), then close and compare.

    The hookwrapper seam matters: code after the `yield` runs once the default teardown has driven
    all fixture finalizers, so a key `monkeypatch` legitimately restored never reads as a leak.
    """
    yield

    _close_open_palaces()

    before = getattr(item, "stash_env_before", None)
    if before is None:
        return
    after = dict(os.environ)
    drift = []
    for key in sorted(set(before) | set(after)):
        if key in _ENV_EXEMPT:
            continue
        was, now = before.get(key), after.get(key)
        if was != now:
            drift.append(f"  {key}: {was!r} -> {now!r}")
            # RESTORE FIRST, REPORT SECOND — one leaky test must not cascade into every later one.
            if was is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = was

    if drift:
        raise AssertionError(
            "This test left the process environment changed. An env var that outlives its test is "
            "read by every later test in the process, and the reader that finds it is never the "
            "test that set it — use `monkeypatch.setenv/delenv` (auto-restored) rather than a bare "
            "`os.environ[...] = ...`. If PRODUCT code stamped the var, that is the finding: the "
            "product writes process-global state with no restore.\n"
            "The environment has been put back; only this test fails.\n" + "\n".join(drift)
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════════
#  THE SLOW GATE — unchanged behaviour, one honest limit written down.
# ═══════════════════════════════════════════════════════════════════════════════════════════════


def pytest_addoption(parser):
    parser.addoption("--runslow", action="store_true", default=False,
                     help="run the slow structure-parse tests (deselected by default)")


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: builds a real structure-parse bed — deselected unless --runslow")


#: Source substrings that mark a test structure-parse-heavy — any capture/pour runs the stanza
#: constituency parse (model load + O(n³)); a real three-plane bed does too. The pure dispatch /
#: parity / routing / honest-null tests touch none of these and stay fast.
#:
#: LIMIT, NAMED: this reads only the test function's OWN source, so a `.pour(` reached through a
#: shared helper goes unmarked, and a function whose source will not load (`OSError`/`TypeError`
#: below) stays unmarked too. The gate therefore UNDER-marks; it never over-marks. Read a deselect
#: count as a floor, never as the full set of heavy tests.
_SLOW_SIGNS = ("_bed_coord", ".pour(", ".capture(", ".sweep(")


def pytest_collection_modifyitems(config, items):
    for item in items:
        try:
            src = inspect.getsource(item.function)
        except (OSError, TypeError):  # source unavailable — leave unmarked
            continue
        if any(sign in src for sign in _SLOW_SIGNS):
            item.add_marker(pytest.mark.slow)
    if config.getoption("--runslow"):
        return
    skip = pytest.mark.skip(reason="slow structure-parse test — pass --runslow to include")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip)
