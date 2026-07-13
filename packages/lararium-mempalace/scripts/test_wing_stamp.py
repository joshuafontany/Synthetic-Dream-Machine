"""wing_stamp — the three routing laws, mirrored from the TS twin's own witnesses."""

import wing_stamp as ws


def test_a_decodable_prefix_routes_and_annotations_survive():
    recs = [
        {
            "source_file": "wing_synthetic_dream_machine__spirits/claude__x__agent-a1.jsonl",
            "metadata": {"lar_agent": "Mapper"},
        }
    ]
    out = ws.stamp_wing(recs)
    assert out[0]["metadata"]["wing"] == "wing_synthetic_dream_machine__spirits"
    assert out[0]["metadata"]["lar_agent"] == "Mapper"  # existing annotation preserved
    assert "wing" not in (recs[0]["metadata"])  # inputs stay unmutated


def test_undecodable_records_quarantine_with_one_warn_per_source():
    warns = []
    recs = [
        {"source_file": "agent-only.jsonl", "metadata": {}},
        {"source_file": "agent-only.jsonl", "metadata": {}},
    ]
    out = ws.stamp_wing(recs, warn=warns.append)
    assert out[0]["metadata"]["wing"] == ws.QUARANTINE_WING
    assert out[1]["metadata"]["wing"] == ws.QUARANTINE_WING
    assert len(warns) == 1  # one loud line per offending source, not per record
    assert "agent-only.jsonl" in warns[0]


def test_the_records_own_wing_wins():
    recs = [{"source_file": "wing_other/x.jsonl", "metadata": {"wing": "wing_explicit"}}]
    assert ws.stamp_wing(recs)[0]["metadata"]["wing"] == "wing_explicit"


def test_the_warned_memory_rides_across_batches():
    warns = []
    warned = set()
    ws.stamp_wing([{"source_file": "orphan.jsonl"}], warned=warned, warn=warns.append)
    ws.stamp_wing([{"source_file": "orphan.jsonl"}], warned=warned, warn=warns.append)
    assert len(warns) == 1  # the caller's memory keeps a long drain to one warn per source


def test_prefix_decode_edges():
    assert ws.wing_from_source_file("wing_a/x") == "wing_a"
    assert ws.wing_from_source_file("wing_a\\x") == "wing_a"  # windows separators normalize
    assert ws.wing_from_source_file("notwing/x") is None
    assert ws.wing_from_source_file("/rooted") is None
    assert ws.wing_from_source_file("bare.jsonl") is None
