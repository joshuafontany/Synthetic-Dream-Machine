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


def test_lar_ffz_stamps_membership_and_idempotent(tmp_path):
    wstore, content = _build(tmp_path)
    report = wf.assign_worldline_ffz(wstore, [content])

    # every content drawer takes a MEMBERSHIP address (labels, never counts).
    assert report["rA"].stamped == 48
    addr = content.get("cA20")["metadata"]["lar_ffz"]
    assert addr.startswith(wf.FFZ_PROFILE + "/")
    segs = addr.split("/", 1)[1].split(".")
    # fresh mint: _.<arc>._.<beat> — the arc names the braid, the beat names the turn.
    assert segs[0] == wf.ABSENT and segs[2] == wf.ABSENT
    assert segs[1] == wf._label("rA")
    assert segs[wf.BEAT_INDEX] == wf._label("A20")

    # a SPARSE braid stamps the same membership shape — no rhythm ever enters an address.
    b_addr = content.get("cB0")["metadata"]["lar_ffz"]
    assert b_addr.split("/", 1)[1].split(".")[1] == wf._label("rB")

    # two braids' drawers differ in the ARC cell; two turns of one braid differ in the BEAT cell.
    assert addr.split(".")[1] != b_addr.split(".")[1]
    assert content.get("cA20")["metadata"]["lar_ffz"] != content.get("cA21")["metadata"]["lar_ffz"]

    # idempotent: a re-run enriches to the same address.
    wf.assign_worldline_ffz(wstore, [content])
    assert content.get("cA20")["metadata"]["lar_ffz"] == addr
    assert content.get("cB0")["metadata"]["lar_ffz"] == b_addr


def test_membership_enrichment_fills_beat_and_keeps_capture_cells():
    # a capture-minted stamp keeps profile/theme/arc/pulse; only the ABSENT beat fills.
    existing = "session/_.claude__abc123._._.73e961d7"
    got = wf.membership_stamp("T7", "rX", existing)
    assert got == f"session/_.claude__abc123._.{wf._label('T7')}.73e961d7"
    # already-enriched → unchanged (idempotent on the enriched form).
    assert wf.membership_stamp("T7", "rX", got) == got
    # a filled beat never overwrites.
    held = "session/_.arc.m.beatlabel.p"
    assert wf.membership_stamp("T7", "rX", held) == held


def test_legacy_grid_stamps_remint_as_membership():
    # the retired numeric-grid forms re-mint; trailing-absent cells drop (prefix-truncatable).
    for legacy in ("worldline/3.1.0.1.0", "worldline/holdover"):
        got = wf.membership_stamp("A5", "rA", legacy)
        assert got == f"worldline/_.{wf._label('rA')}._.{wf._label('A5')}"


def test_no_host_wall_time_on_the_recover_or_stamp_path():
    # clock-purity (the sighting ward): the module imports no host clock; ordinals ride the path.
    src = open(os.path.join(os.path.dirname(__file__), "worldline_ffz.py"), encoding="utf-8").read()
    for banned in ("import time", "import datetime", "from datetime", "time.time", "datetime.now",
                   "utcnow", "time.monotonic", "perf_counter"):
        assert banned not in src, f"clock leak: {banned!r} on the worldline-ffz path"
