"""Pytest config for the sensorium scripts — gate the SLOW tests behind an opt-in.

A handful of tests build a real three-plane bed whose STRUCTURE plane runs the stanza
constituency parse (model load + O(n³) parse). One is fine; a dozen under concurrent runs
crawls and starves the box — the wedge that hung every verification. So they auto-mark `slow`
(detected by their `_bed_coord` use) and DESELECT by default; a full check passes `--runslow`.
The fast tests — the CLI↔MCP parity/mirror/grid isomorphism, the routing, the honest-null
plane reads — carry no parse and always run, so a spirit's `pytest <file>` never wedges again.
"""
import inspect

import pytest


def pytest_addoption(parser):
    parser.addoption("--runslow", action="store_true", default=False,
                     help="run the slow structure-parse tests (deselected by default)")


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: builds a real structure-parse bed — deselected unless --runslow")


#: Source substrings that mark a test structure-parse-heavy — any capture/pour runs the stanza
#: constituency parse (model load + O(n³)); a real three-plane bed does too. The pure dispatch /
#: parity / routing / honest-null tests touch none of these and stay fast.
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
