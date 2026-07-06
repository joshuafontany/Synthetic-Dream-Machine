"""Witness — the PER-WORLDLINE FFZ gate recovers each braid's OWN clock + stamps lar_ffz positions.

Over two REAL braids (a worldline_io fork-DAG + real-chroma content stores):
  · LOCK       — a RHYTHMIC braid (content vectors whose drift oscillates) recovers a beat + bands.
  · HOLDOVER   — a SPARSE braid recovers NO beat (the static-corpus-null; no fabricated rhythm).
  · NON-RESONANT — the two braids draw mutually non-resonant desync phases (min_pairwise_gap > 0).
  · STAMP      — lar_ffz lands on a braid's drawers as a POSITION address (COARSE→FINE, prefix-
                 truncatable); a re-run is idempotent (same drift → same clock → same stamp).
  · CLOCK-PURITY — no host wall-time on the recover/stamp path (grep clean).

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-mempalace/scripts/test_worldline_ffz.py -q
"""
import math
import os

import content_io as cio
import worldline_io as wl
import worldline_ffz as wf


def _rhythmic_vec(i: int, period: int = 8, amp: float = 1.2) -> list:
    """A 2-D unit vector whose ANGLE oscillates with `period` — so its cosine-drift against the
    braid's running centroid carries a recoverable rhythm (the LOCK case)."""
    ang = amp * math.sin(2 * math.pi * i / period)
    return [math.cos(ang), math.sin(ang)]


def _build(tmp_path):
    """Two braids in one worldline store + two content drawers-per-turn stores:
      rA — a RHYTHMIC braid of 48 turns (locks); rB — a SPARSE braid of 2 turns (holds over)."""
    wstore = wl.WorldlineStore(str(tmp_path / ".worldline"))
    content = cio.ContentStore(str(tmp_path / ".content"))

    tick = 0

    def link(frm, to):
        nonlocal tick
        tick += 1
        wstore.linear(frm, to, tick)

    # rA: root -> A0 -> A1 -> ... -> A47, each turn carrying a rhythmic content drawer.
    prev = "rA"
    for i in range(48):
        tk = f"A{i}"
        link(prev, tk)
        content.put(f"cA{i}", f"turn {i}", _rhythmic_vec(i),
                    {"lar_turn_key": tk, "wing": "w"})
        prev = tk

    # rB: root -> B0 -> B1 — too sparse to lock (holdover). Flat vectors, no rhythm.
    link("rB", "B0")
    content.put("cB0", "b zero", [1.0, 0.0], {"lar_turn_key": "B0", "wing": "w"})
    link("B0", "B1")
    content.put("cB1", "b one", [1.0, 0.0], {"lar_turn_key": "B1", "wing": "w"})

    return wstore, content


def test_rhythmic_braid_locks_sparse_braid_holds_over(tmp_path):
    wstore, content = _build(tmp_path)
    report = wf.assign_worldline_ffz(wstore, [content])

    assert set(report) == {"rA", "rB"}

    a = report["rA"]
    assert a.locked is True, "a rhythmic braid must recover a beat"
    assert a.holdover is False
    assert a.beat > 0
    assert len(a.bands) > 0
    assert a.turns == 48

    b = report["rB"]
    assert b.locked is False, "a sparse braid must not fabricate a beat"
    assert b.holdover is True
    assert b.beat == 0
    assert b.bands == ()
    assert b.turns == 2


def test_two_braids_draw_non_resonant_phases(tmp_path):
    wstore, _ = _build(tmp_path)
    phases = wf.worldline_phases(wstore)
    assert set(phases) == {"rA", "rB"}
    # the two braids hold DISTINCT phases; the incommensurability witness reads a positive gap.
    assert phases["rA"] != phases["rB"]
    assert wf.phase_spread(wstore) > 0.0


def test_desync_phase_is_stable_under_a_new_earlier_sorting_root(tmp_path):
    # C5 idempotence: keying the phase off a STABLE per-root hash (not the sorted-enumeration index)
    # means adding a braid whose root SORTS EARLIER never shifts an existing braid's phase — so its
    # drawers never re-stamp under a new join (the idempotence break YANG's stress-lens named).
    store = wl.WorldlineStore(str(tmp_path / ".worldline"))
    store.linear("z-root", "z1", tick=1)                  # one braid, root "z-root"
    before = wf.worldline_phases(store)["z-root"]

    store.linear("a-root", "a1", tick=2)                  # a NEW root that sorts BEFORE "z-root"
    after = wf.worldline_phases(store)
    assert set(after) == {"a-root", "z-root"}
    assert after["z-root"] == before                       # STABLE — the new earlier root left z untouched
    assert after["a-root"] != after["z-root"]              # still mutually non-resonant


def test_lar_ffz_stamped_as_a_position_and_idempotent(tmp_path):
    wstore, content = _build(tmp_path)
    report = wf.assign_worldline_ffz(wstore, [content])

    # the rhythmic braid stamped every content drawer with a NUMERIC position address.
    assert report["rA"].stamped == 48
    locked_addr = content.get("cA20")["metadata"]["lar_ffz"]
    assert locked_addr.startswith(wf.FFZ_PROFILE + "/")
    assert wf.FFZ_HOLDOVER not in locked_addr
    # COARSE→FINE, prefix-truncatable: five dot-joined band digits after the profile.
    segs = locked_addr.split("/", 1)[1].split(".")
    assert len(segs) == 5 and all(s.lstrip("-").isdigit() for s in segs)

    # the held-over braid stamps the FREE-RUN position (no fabricated numeric grid).
    holdover_addr = content.get("cB0")["metadata"]["lar_ffz"]
    assert holdover_addr == f"{wf.FFZ_PROFILE}/{wf.FFZ_HOLDOVER}"

    # idempotent: a re-run recovers the same clock → the same address → an unchanged stamp.
    wf.assign_worldline_ffz(wstore, [content])
    assert content.get("cA20")["metadata"]["lar_ffz"] == locked_addr
    assert content.get("cB0")["metadata"]["lar_ffz"] == holdover_addr


def test_ffz_address_is_prefix_truncatable():
    # the ultrametric: a coarser read drops trailing fine digits (the nesting invariant).
    full = wf.ffz_address(37, beat=4, phase=0.0)
    assert full.startswith("worldline/")
    digits = full.split("/", 1)[1].split(".")
    # each finer digit nests mod the ratio (dyadic → {0, 1}); the coarsest may grow unbounded.
    for d in digits[1:]:
        assert d in ("0", "1")
    # holdover (beat 0) never fabricates a grid.
    assert wf.ffz_address(5, beat=0) == "worldline/holdover"


def test_no_host_wall_time_on_the_recover_or_stamp_path():
    # clock-purity (the sighting ward): the module imports no host clock; ordinals ride the path.
    src = open(os.path.join(os.path.dirname(__file__), "worldline_ffz.py"), encoding="utf-8").read()
    for banned in ("import time", "import datetime", "from datetime", "time.time", "datetime.now",
                   "utcnow", "time.monotonic", "perf_counter"):
        assert banned not in src, f"clock leak: {banned!r} on the worldline-ffz path"
