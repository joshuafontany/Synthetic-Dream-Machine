"""Tests — the Kumulipo wa-sectioner + Kalakaua extractor + the sectioned corpus cap.

Synthetic mini-memes carry the shores (envelope · #source-text · wa markers · appendix);
two gated tests witness the REAL triple's section counts when the library stands local.
"""
from __future__ import annotations

import os

import pytest

from capture_sources import corpus_sectioned_source, derive_cid
from kumulipo_sections import (
    extract_source_text,
    section_corpus_file,
    source_text_span,
)

_ENVELOPE_HEAD = """<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/lares/api/pono/memetic-wikitext >> -->

<<^ &#x0001; ? -> lar:///ha.ka.ba/lares/library/hawaii/kumulipo/test >>
```toml iam
register = "Canon"
type     = "text/x-memetic-wikitext"
```

<<^ &#x0002; >>

<<~ ahu #meme-header >>

# A Test Meme

<<~/ahu >>

<<~ ahu #source-text >>
"""

_ENVELOPE_TAIL = """<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/lares/library/hawaii/kumulipo/other >>

<<~/ahu >>

<<^ &#x0003; >>

<<^ &#x0004; -> ? >>
"""


def _mini_liliuokalani() -> str:
    body = """## Title Page

FRONT MATTER

## The First Era

chant line one

## Second Era

chant line two

## Kalakaua and Liliuokalani's Genealogy

the genealogy table
"""
    return _ENVELOPE_HEAD + body + _ENVELOPE_TAIL


def _mini_beckwith() -> str:
    body = """## Title Page

front matter prose

CHANT ONE

first chant lines

CHANT TWO

second chant lines, PART the only

CHANT TWO

the second part of chant two

## The Kalakaua Text (Hawaiian)

APPENDIX I

KA WA AKAHI

1. O ke au i kahuli wela ka honua

KA WA ELUA

2. more hawaiian lines

## Textual Notes

CHANT ONE (CHANT TWO IN MS)

notes prose mentioning CHANT ONE forms
"""
    return _ENVELOPE_HEAD + body + _ENVELOPE_TAIL


# ── the extraction shore ──────────────────────────────────────────────────────────────────


def test_source_text_span_balances_nested_ahu():
    text = _mini_liliuokalani()
    lines = text.split("\n")
    span = source_text_span(lines)
    assert span is not None
    a, b = span
    interior = "\n".join(lines[a:b])
    assert "## The First Era" in interior
    assert "<<~" not in interior           # the interior rides bare
    assert "## Edges" not in interior      # the tail envelope stays outside


def test_extract_source_text_falls_back_whole_on_bare_file():
    bare = "# plain markdown\n\nno wrapping here\n"
    assert extract_source_text(bare) == bare


# ── the sectioners over the synthetic minis ──────────────────────────────────────────────


def test_extract_sheds_leading_slot_iam_fence():
    """The interior's dialect declaration (slot-level `toml iam`) reads as envelope:
    extraction hands back SOURCE alone — metadata never pollutes the beds."""
    doc = (
        "<<~ ahu #source-text >>\n"
        "```toml iam\n"
        'type = "text/markdown"\n'
        "```\n\n"
        "## Title Page\nTHE KUMULIPO\n"
        "<<~/ahu >>\n"
    )
    out = extract_source_text(doc)
    assert "toml iam" not in out and "text/markdown" not in out
    assert "## Title Page" in out and "THE KUMULIPO" in out


def test_liliuokalani_sections_wrapped_vs_extracted_align():
    text = _mini_liliuokalani()
    wrapped = section_corpus_file("kumulipo-liliuokalani.md", text, extract=False)
    extracted = section_corpus_file("kumulipo-liliuokalani.md", text, extract=True)
    (w,), (e,) = wrapped, extracted
    assert w["source"] == e["source"] == "kumulipo/liliuokalani"
    assert [label for label, _ in w["sections"]] == [label for label, _ in e["sections"]] == [
        "preamble", "the-first-era", "second-era", "postscript"]
    # The wa units carry IDENTICAL text both modes — only the envelope-bearing ends move.
    assert dict(w["sections"])["the-first-era"] == dict(e["sections"])["the-first-era"]
    assert dict(w["sections"])["second-era"] == dict(e["sections"])["second-era"]
    # Wrapped keeps the red channel at the ends; extracted sheds every sigil.
    assert "<<~" in dict(w["sections"])["preamble"]
    assert "<<~" in dict(w["sections"])["postscript"]
    assert all("<<~" not in t for _, t in e["sections"])


def test_beckwith_yields_two_sources_and_notes_never_mint_sections():
    text = _mini_beckwith()
    (b, k) = section_corpus_file("kumulipo-beckwith.md", text, extract=True)
    assert b["source"] == "kumulipo/beckwith"
    assert k["source"] == "kumulipo/kalakaua-appendix"
    labels = [label for label, _ in b["sections"]]
    # Duplicate markers take occurrence ordinals; the Textual Notes' CHANT lines
    # (parenthetical style / inside the postscript span) mint nothing.
    assert labels == ["preamble", "chant-one", "chant-two", "chant-two-2", "postscript"]
    assert [label for label, _ in k["sections"]] == ["preamble", "ka-wa-akahi", "ka-wa-elua"]
    # The appendix reads as the SAME bytes in both modes — the ablation's control.
    (_, k_wrapped) = section_corpus_file("kumulipo-beckwith.md", text, extract=False)
    assert k_wrapped["sections"] == k["sections"]


def test_beckwith_missing_shore_fails_loud():
    text = _ENVELOPE_HEAD + "no appendix shores here\n" + _ENVELOPE_TAIL
    with pytest.raises(ValueError, match="appendix shores"):
        section_corpus_file("kumulipo-beckwith.md", text, extract=False)


def test_unknown_basename_returns_none():
    assert section_corpus_file("notes.md", "# whatever\n", extract=False) is None


# ── the sectioned source-cap ─────────────────────────────────────────────────────────────


def _write_minis(root) -> str:
    d = root / "kumulipo"
    d.mkdir()
    (d / "kumulipo-liliuokalani.md").write_text(_mini_liliuokalani(), encoding="utf-8")
    (d / "kumulipo-beckwith.md").write_text(_mini_beckwith(), encoding="utf-8")
    return str(d)


def test_sectioned_cap_chunk_ordinal_cids_and_metadata(tmp_path):
    pointer = _write_minis(tmp_path)
    recs = list(corpus_sectioned_source(wing="wing_testbed", extract=False)(pointer))
    by_source: dict = {}
    for r in recs:
        m = r["metadata"]
        by_source.setdefault(m["source_file"], []).append(r)
        assert m["wing"] == "wing_testbed" and m["room"] == "corpus"
        assert m["lar_surface"] == "corpus"
        assert m["lar_section_mode"] == "wrapped"
        assert m["lar_mtime_sighting"]        # sighting register, provenance only
        assert m["lar_chain"] and m["lar_turn_key"]
        assert r["cid"] == derive_cid(m["source_file"], m["chunk_index"])
    assert set(by_source) == {"corpus:kumulipo/liliuokalani", "corpus:kumulipo/beckwith",
                              "corpus:kumulipo/kalakaua-appendix"}
    # The dense pass seq spans every source; chunk ordinals run 0..n per source.
    assert [r["seq"] for r in recs] == list(range(1, len(recs) + 1))
    for rows in by_source.values():
        assert [r["metadata"]["chunk_index"] for r in rows] == list(range(len(rows)))


def test_sectioned_cap_wrapped_extracted_share_cids_but_diverge_kind(tmp_path):
    pointer = _write_minis(tmp_path)
    wrapped = list(corpus_sectioned_source(wing="w", extract=False)(pointer))
    extracted = list(corpus_sectioned_source(wing="w", extract=True)(pointer))
    # Aligned units: the SAME cid names the same wa unit in both beds.
    assert [r["cid"] for r in wrapped] == [r["cid"] for r in extracted]
    assert ([r["metadata"]["lar_section"] for r in wrapped]
            == [r["metadata"]["lar_section"] for r in extracted])
    # The red channel picks the grammar: the wrapped carrier routes every section
    # memetic; the extracted bare sections route by their own text.
    w_kinds = {r["metadata"]["lar_kind"] for r in wrapped}
    e_kinds = {r["metadata"]["lar_kind"] for r in extracted}
    assert w_kinds == {"memetic-wikitext"}
    assert "memetic-wikitext" not in e_kinds


def test_sectioned_cap_two_carriers_one_source_fails_loud(tmp_path):
    d1 = tmp_path / "a" / "kumulipo"
    d2 = tmp_path / "b" / "kumulipo2"
    d1.mkdir(parents=True)
    d2.mkdir(parents=True)
    (d1 / "kumulipo-liliuokalani.md").write_text(_mini_liliuokalani(), encoding="utf-8")
    (d2 / "kumulipo-liliuokalani.md").write_text(
        _mini_liliuokalani().replace("chant line one", "a divergent line"), encoding="utf-8")
    pointer = os.pathsep.join([str(d1), str(d2)])
    with pytest.raises(ValueError, match="one rendering keeps one carrier"):
        list(corpus_sectioned_source(wing="w", extract=False)(pointer))


def test_sectioned_cap_falls_back_whole_for_unnamed_files(tmp_path):
    d = tmp_path / "misc"
    d.mkdir()
    (d / "notes.md").write_text("# just notes\n\nplain prose\n", encoding="utf-8")
    recs = list(corpus_sectioned_source(wing="w", extract=False)(str(d)))
    assert len(recs) == 1
    assert recs[0]["metadata"]["lar_section"] == "whole"
    assert recs[0]["metadata"]["chunk_index"] == 0


# ── the real triple (gated on the library standing local) ───────────────────────────────

_LIBRARY = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))))),
    "bags", "@lares", "ha.ka.ba", "@lares", "library", "hawaii", "kumulipo")


@pytest.mark.skipif(not os.path.isdir(_LIBRARY), reason="the kumulipo library rides elsewhere")
def test_real_triple_section_counts():
    lili = open(os.path.join(_LIBRARY, "kumulipo-liliuokalani.md"), encoding="utf-8").read()
    beck = open(os.path.join(_LIBRARY, "kumulipo-beckwith.md"), encoding="utf-8").read()
    (lil,) = section_corpus_file("kumulipo-liliuokalani.md", lili, extract=True)
    b, k = section_corpus_file("kumulipo-beckwith.md", beck, extract=True)
    # 16 wa + preamble + postscript · 17 chant markers (no CHANT TWELVE; THIRTEEN and
    # FIFTEEN in two PARTs) + preamble + postscript · 16 KA WA + preamble.
    assert len(lil["sections"]) == 18
    assert len(b["sections"]) == 19
    assert len(k["sections"]) == 17
    labels = [lab for lab, _ in b["sections"]]
    assert "chant-twelve" not in labels
    assert "chant-thirteen-2" in labels and "chant-fifteen-2" in labels
    # The extracted units ride bare — no sigil survives extraction anywhere.
    for src in (lil, b, k):
        assert all("<<~" not in t for _, t in src["sections"])


@pytest.mark.skipif(not os.path.isdir(_LIBRARY), reason="the kumulipo library rides elsewhere")
def test_real_triple_wa_units_identical_across_modes():
    beck = open(os.path.join(_LIBRARY, "kumulipo-beckwith.md"), encoding="utf-8").read()
    _, k_w = section_corpus_file("kumulipo-beckwith.md", beck, extract=False)
    _, k_e = section_corpus_file("kumulipo-beckwith.md", beck, extract=True)
    assert k_w["sections"] == k_e["sections"]   # the appendix = the built-in control


def test_dispatch_keys_on_the_stem_not_the_extension():
    """The carrier rename (.md -> .mem) silently landed the chant whole at chunk 0 —
    the rule now reads the stem, so the next extension flip cannot re-silence it."""
    from kumulipo_sections import section_corpus_file

    text = "\n".join([
        "<<~ ahu #source-text >>",
        "## The First Era", "line one", "## The Second Era", "line two",
        "<<~/ahu >>",
    ])
    for name in ("kumulipo-liliuokalani.md", "kumulipo-liliuokalani.mem"):
        got = section_corpus_file(name, text, extract=False)
        assert got is not None, name
        assert got[0]["source"] == "kumulipo/liliuokalani"
    assert section_corpus_file("unrelated.mem", text, extract=False) is None
