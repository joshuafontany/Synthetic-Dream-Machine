"""The guest install at ~/.mempalace stands apart from every sensorium.

An upstream mempalace install belongs to the operator and to upstream's own tooling. The House may
read it as a comparator; no sensorium may take it as a root. A store that opened it would write
`lar_*` marks into a palace whose owner never asked for them, and the guest's own hooks would then
mine around our vocabulary.

The second test below guards the failure that produced this file: four modules PROMISED the ward in
prose while one enforced it. A promise a reader trusts and the code does not keep reads worse than
silence, because it stops the reader looking.
"""

from __future__ import annotations

import os
import re

import pytest

from holder_caps import guest_root, inside_guest, refuse_guest, refuse_guest_env

_HERE = os.path.dirname(os.path.abspath(__file__))


def test_the_guest_root_and_anything_under_it_read_as_the_guest():
    root = guest_root()
    assert inside_guest(root)
    assert inside_guest(os.path.join(root, "palace"))
    assert not inside_guest("/tmp/some-sensorium")


def test_a_root_reaching_the_guest_gets_refused_by_name():
    with pytest.raises(SystemExit, match="reaches the guest install"):
        refuse_guest(guest_root(), who="a_caller")
    with pytest.raises(SystemExit, match="a_caller"):
        refuse_guest(os.path.join(guest_root(), "palace"), who="a_caller")


def test_a_sensorium_root_passes_untouched():
    refuse_guest("/tmp/sensoriums/memory", who="a_caller")  # raises nothing


def test_the_env_var_cannot_aim_a_holder_at_the_guest(monkeypatch):
    """`config.py` reads MEMPALACE_PALACE_PATH with priority OVER the config file, so a stray
    export redirects a holder without touching any argument its caller passed."""
    monkeypatch.setenv("MEMPALACE_PALACE_PATH", guest_root())
    with pytest.raises(SystemExit, match="aims at the guest install"):
        refuse_guest_env(who="a_caller")

    monkeypatch.setenv("MEMPALACE_PALACE_PATH", "/tmp/sensoriums/memory")
    refuse_guest_env(who="a_caller")  # raises nothing

    monkeypatch.delenv("MEMPALACE_PALACE_PATH", raising=False)
    refuse_guest_env(who="a_caller")  # raises nothing


#: Modules whose prose names the ward but which take no root of their own — each says WHY, so the
#: list reads as rulings rather than a place unenforced promises go to be forgotten.
PROSE_ONLY = {
    "channel_dial.py": "dials an already-opened store; its caller holds the root",
    "run_projector.py": "projects from a root its caller already warded",
    "capture_session.py": "takes --sensorium and routes through capture_corpus, which wards",
    "session_discovery.py": "names the guest's own skip policy; crosses to no store",
    "structurepalace_io.py": "names the guest as the verbatim twin; its root arrives already warded",
    "structure_router.py": "carries the guest in its traversal SKIP set, which is the ward in another form",
    "kg_io.py": "documents the package default path; the operator may aim it at the guest deliberately",
    "sensorium.py": "states the sidecar ontology ruling; computes paths from a root its caller wards",
}


def test_a_module_naming_the_ward_either_enforces_it_or_says_why():
    """The failure this catches: a promise in prose with no check behind it.

    Absence of enforcement and absence of need read identically from outside, so a module naming the
    guest must either call the ward or carry a ruling for why it never holds a root.
    """
    promising, enforcing = set(), set()
    for name in sorted(os.listdir(_HERE)):
        if not name.endswith(".py") or name.startswith("test_"):
            continue
        with open(os.path.join(_HERE, name), encoding="utf-8") as fh:
            src = fh.read()
        if name == "holder_caps.py":
            continue  # the ward's own home
        # A PATH spelling only. `a.mempalace` / `paths.mempalace` read as attribute access on a
        # caller's own object and name nothing on disk, so matching a bare `.mempalace` would
        # convict modules that never touch the guest.
        if re.search(r"~/\.mempalace|[\"']\.mempalace[/\"']", src):
            promising.add(name)
        if "refuse_guest" in src:
            enforcing.add(name)

    unenforced = promising - enforcing - set(PROSE_ONLY) - {"guest_harvest.py"}
    assert not unenforced, (
        "these name the guest install in prose, enforce no ward, and carry no ruling:\n  "
        + "\n  ".join(sorted(unenforced))
        + "\nEither call refuse_guest, or record why the module holds no root in PROSE_ONLY."
    )

    stale = set(PROSE_ONLY) - promising
    assert not stale, (
        "these carry a ruling for a module that no longer names the guest:\n  "
        + "\n  ".join(sorted(stale))
    )
