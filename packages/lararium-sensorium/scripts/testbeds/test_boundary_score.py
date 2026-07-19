"""test_boundary_score — the coordinate-agnostic pre-registered scorer.

  · the pure math (one-to-one match, chance floor) holds its pre-registered form.
  · a truth carries its OWN coordinate; remap carries a line key into ticks/words through an offset map.
  · RECALL is coordinate-invariant (the instrument's real hits don't move); the chance floor TIGHTENS in a
    finer coordinate (a random detector is likelier to miss a fine grid) — so a native-grain score is harder
    to fool, never easier.
  · one canonical tolerance ladder scales into any coordinate by the truth's derived grain — no magic ladder.

    ~/.venv/bin/python -m pytest packages/lararium-sensorium/scripts/testbeds/test_boundary_score.py -q
"""
import boundary_score as bs


def _line_g():
    return {"bed": "t", "n_lines": 100, "boundaries": [10, 30, 50, 70, 90], "hinge": 50}


def test_one_to_one_match_claims_each_truth_once():
    # a burst of predictions around one truth must not harvest more than one match
    hits = bs.match_one_to_one([48, 49, 50, 51], [50], tol=5)
    assert len(hits) == 1 and hits[0][1] == 50


def test_chance_floor_is_the_schwarz_complement():
    # 1 - (1 - (2w+1)/N)^n — the pre-registered coin-flip recall, unchanged
    assert bs.chance_recall(0, 100, 5) == 0.0
    assert abs(bs.chance_recall(5, 100, 5) - (1 - (1 - 11 / 100) ** 5)) < 1e-12


def test_make_truth_and_remap_carry_a_coordinate():
    line_truth = bs.make_truth(_line_g())
    assert line_truth["coordinate"] == "line" and line_truth["n_total"] == 100
    # remap into a x10 tick coordinate via offsets[L] = 10*L
    tick_truth = bs.remap(line_truth, [10 * i for i in range(101)], "tick", 1000)
    assert tick_truth["coordinate"] == "tick"
    assert tick_truth["boundaries"] == [100, 300, 500, 700, 900]
    assert tick_truth["hinge"] == 500
    assert tick_truth["key_lines"] == 100                 # grain denominator rides UNCHANGED through remap


def test_tolerance_ladder_scales_by_grain_not_by_a_magic_table():
    line_truth = bs.make_truth(_line_g())
    tick_truth = bs.remap(line_truth, [10 * i for i in range(101)], "tick", 1000)
    assert bs.tolerances_for(line_truth) == [0, 2, 5, 10, 20, 50]      # canonical, native line units
    assert bs.tolerances_for(tick_truth) == [0, 20, 50, 100, 200, 500]  # same ladder x grain (10)


def test_recall_invariant_but_chance_floor_tightens_in_a_finer_coordinate():
    line_truth = bs.make_truth(_line_g())
    tick_truth = bs.remap(line_truth, [10 * i for i in range(101)], "tick", 1000)
    pred_line = [10, 30, 50, 72, 95]
    rl = bs.report(pred_line, line_truth)
    rt = bs.report([10 * p for p in pred_line], tick_truth)
    # the instrument's HITS do not change with the coordinate
    assert [r["recall"] for r in rl["tolerance_curve"]] == [r["recall"] for r in rt["tolerance_curve"]]
    # but the chance floor is never LOOSER in the finer coordinate (harder to fool)
    assert all(t["chance_recall"] <= l["chance_recall"] + 1e-9
               for l, t in zip(rl["tolerance_curve"], rt["tolerance_curve"]))


def test_hinge_and_branch_read_from_the_truth_not_a_bed_constant():
    truth = bs.make_truth(_line_g(), branch={"wa": 13, "parent": 12})
    # strongest-first ranking with the hinge (line 50) first → rank 1
    h = bs.hinge_test([50, 10, 90], truth)
    assert h["scored"] and h["strongest_is_hinge"]
    # a flat instrument (no parent map) declines the branch; a hierarchy that attaches 13→12 passes
    assert bs.branch_test(None, truth)["scored"] is False
    assert bs.branch_test({13: 12}, truth)["attaches_correctly"] is True
