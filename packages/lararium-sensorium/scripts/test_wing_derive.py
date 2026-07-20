"""test_wing_derive — the cross-language wing-slug agreement, the python side of the pin.

`wing-law.ts::wingFromDir` and `wing_derive.py::wing_from_dir` must produce the SAME slug, so the
python bulk sweep files a transcript under the SAME wing the live TS ingest hook does. These fixture
cases mirror `tests/ingest-hook-wing.test.ts` byte-for-byte; if the slug law moves on either side,
one of these fails loud and the port has drifted.
"""
import json
import os

from wing_derive import (read_codex_cwd, read_cwd_from_transcript,
                         resolve_transcript_wing, scrape_wing, wing_from_dir)

# The exact fixtures from tests/ingest-hook-wing.test.ts, each a basename → its wing.
WING_FIXTURES = {
    "Synthetic-Dream-Machine": "wing_synthetic_dream_machine",  # hyphen + case
    "My Project": "wing_my_project",                            # space → underscore
    "weird@Name!.v2": "wing_weirdnamev2",                       # punctuation stripped
    "already_snake_09": "wing_already_snake_09",                # fixpoint
    "": "wing_unsorted",                                         # empty → unsorted
}


def test_wing_slug_law_matches_the_ts_fixtures():
    for base, want in WING_FIXTURES.items():
        assert wing_from_dir(base) == want, f"{base!r} → {wing_from_dir(base)!r}, want {want!r}"


def test_wing_from_full_path_takes_the_basename():
    assert wing_from_dir("/home/joshu/Synthetic-Dream-Machine") == "wing_synthetic_dream_machine"
    assert wing_from_dir("/home/joshu/Synthetic-Dream-Machine/") == "wing_synthetic_dream_machine"


def test_read_cwd_reads_the_first_recorded_cwd(tmp_path):
    t = tmp_path / "s.jsonl"
    t.write_text(
        "\n".join([
            json.dumps({"type": "summary"}),                      # no cwd — skip
            json.dumps({"cwd": "/home/joshu/Proj-One", "x": 1}),  # first cwd wins
            json.dumps({"cwd": "/somewhere/else"}),
        ]),
        encoding="utf-8",
    )
    assert read_cwd_from_transcript(str(t)) == "/home/joshu/Proj-One"


def test_resolve_reads_the_first_sibling_then_slugs(tmp_path):
    proj = tmp_path / "-home-joshu-Proj-One"
    proj.mkdir()
    # The sibling sorted first carries the cwd; the target itself carries none.
    (proj / "aaa.jsonl").write_text(json.dumps({"cwd": "/home/joshu/Proj-One"}) + "\n", encoding="utf-8")
    target = proj / "zzz.jsonl"
    target.write_text(json.dumps({"type": "summary"}) + "\n", encoding="utf-8")
    assert resolve_transcript_wing(str(target)) == "wing_proj_one"


def test_resolve_returns_none_without_a_cwd(tmp_path):
    proj = tmp_path / "p"
    proj.mkdir()
    t = proj / "s.jsonl"
    t.write_text(json.dumps({"type": "summary"}) + "\n", encoding="utf-8")
    assert resolve_transcript_wing(str(t)) is None


def test_codex_cwd_reads_session_meta(tmp_path):
    t = tmp_path / "rollout-x.jsonl"
    t.write_text(
        json.dumps({"type": "session_meta", "payload": {"cwd": "/home/joshu/Codex-Proj"}}) + "\n",
        encoding="utf-8",
    )
    assert read_codex_cwd(str(t)) == "/home/joshu/Codex-Proj"


def test_scrape_wing_takes_the_most_frequent_home_segment(tmp_path):
    home = os.path.expanduser("~")
    t = tmp_path / "copilot.jsonl"
    body = f"read {home}/MyRepo/a.ts and {home}/MyRepo/b.ts but once {home}/Other/c.ts"
    t.write_text(body, encoding="utf-8")
    assert scrape_wing(str(t)) == "wing_myrepo"
