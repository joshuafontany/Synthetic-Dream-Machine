"""Every store surface a caller can reach, derived — never a second list kept by hand.

WHY THIS EXISTS. A store here gets reached three different ways: a python module imports it, a TS cap
spawns `<store>.py serve` and talks over the pipe, or the capture pipeline drives it through the
fanout. No single place says which store uses which, so a question as plain as //does anything write
this plane// took three greps and got two wrong answers before it got one right. The persistence plane
sat fully built on both sides with no caller at all, and nothing surfaced that.

WHAT IT ASSERTS. Not that every surface has a caller — several stores answer in-process by design and
want no pipe. It asserts the INVENTORY reads honestly: the serve-declaring set and the TS-spawned set
both get derived from source, and a store offering a serve contract that no driver takes gets NAMED
rather than discovered later by a reader who assumed the surface was live.

A store may sit on the unspawned list forever with no harm. It may not sit there SILENTLY.
"""

from __future__ import annotations

import os
import re

_HERE = os.path.dirname(os.path.abspath(__file__))
_TS_SRC = os.path.abspath(os.path.join(_HERE, "..", "..", "lararium-node", "src"))

#: A store that answers in-process on purpose. Each entry names WHY it declares a serve mode no TS
#: driver spawns, so the list stays a set of rulings rather than a place failures go to be forgotten.
SERVE_DECLARED_UNSPAWNED = {
    "meta_io": "the meta sidecar reads in-process beside its content pour; the serve mode stands unexercised",
    "worldline_io": "the worldline answers its own module's callers directly; the serve mode stands unexercised",
}


def _store_files() -> "list[str]":
    return sorted(
        f
        for f in os.listdir(_HERE)
        if (f.endswith("_io.py") or f.endswith("_encoder.py")) and not f.startswith("test_")
    )


def declares_serve(filename: str) -> bool:
    """A store offers the pipe contract when its entry point knows the word `serve`."""
    with open(os.path.join(_HERE, filename), encoding="utf-8") as fh:
        src = fh.read()
    return bool(re.search(r'"serve"|\'serve\'|add_parser\(\s*["\']serve', src))


def _ts_spawned() -> "set[str]":
    """Every `<store>.py` a TS source names — the drivers that actually stand a holder."""
    found: "set[str]" = set()
    for root, _dirs, files in os.walk(_TS_SRC):
        for name in files:
            if not name.endswith(".ts"):
                continue
            with open(os.path.join(root, name), encoding="utf-8", errors="ignore") as fh:
                found.update(re.findall(r"([a-z_]+_(?:io|encoder))\.py", fh.read()))
    return found


def test_the_serve_contract_and_its_drivers_stay_reconciled():
    """A store offering a serve mode either has a driver, or says why it does not."""
    declared = {f[:-3] for f in _store_files() if declares_serve(f)}
    spawned = _ts_spawned()
    unspawned = declared - spawned

    unexplained = unspawned - set(SERVE_DECLARED_UNSPAWNED)
    assert not unexplained, (
        "these stores declare a serve contract that no TS driver spawns, and no ruling names why:\n  "
        + "\n  ".join(sorted(unexplained))
        + "\nEither wire a driver, or record the reason in SERVE_DECLARED_UNSPAWNED."
    )

    stale = set(SERVE_DECLARED_UNSPAWNED) - unspawned
    assert not stale, (
        "these carry a ruling for a gap that closed — a driver now spawns them, so the entry misleads:\n  "
        + "\n  ".join(sorted(stale))
    )


def test_a_driver_never_spawns_a_store_that_offers_no_serve_mode():
    """The other direction: a spawn whose target cannot answer the pipe fails at runtime, silently
    from the TS side (a holder that starts and never replies), so catch it in source."""
    stores = {f[:-3] for f in _store_files()}
    serving = {s for s in stores if declares_serve(s + ".py")}
    spawned_here = _ts_spawned() & stores
    assert spawned_here <= serving, (
        "a TS driver spawns a store with no serve mode: "
        + ", ".join(sorted(spawned_here - serving))
    )


def test_the_inventory_derives_rather_than_enumerating():
    """The guard reads both sides off source; a hand-kept roster would drift from the thing it names."""
    assert _store_files(), "no store modules found — the walk lost its directory"
    assert _ts_spawned(), "no TS spawn sites found — the walk lost the node src tree"
