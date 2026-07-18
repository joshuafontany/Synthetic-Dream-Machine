"""span_layer — the standoff keel: spans are offset-views over one content source, holding NO bytes.

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
      packages/lararium-sensorium/scripts/test_span_layer.py -q
"""

import pytest

from span_layer import Span, chunk_spans, rebuilds_from_content

CONTENT = {"cid-a": "the shrine holds the incense and the libation dish"}


def _get(cid):
    return CONTENT.get(cid)


def test_span_resolves_to_the_right_substring():
    s = Span(cid="cid-a", start=4, end=10, layer="chunk")
    assert s.resolve(_get) == "shrine"  # an offset-view, not a stored copy


def test_span_holds_no_bytes():
    # The kupono invariant made structural: a span carries offsets + cid, never the verbatim text.
    s = Span(cid="cid-a", start=0, end=3)
    assert not any(isinstance(v, str) and "shrine" in v for v in (s.cid, s.layer))
    assert s.resolve(_get) == "the"  # bytes come from content on read, not from the span


def test_chunk_spans_cover_with_overlap_and_clamp():
    text = CONTENT["cid-a"]
    spans = list(chunk_spans("cid-a", len(text), size=10, overlap=3))
    # every chunk resolves to its verbatim window
    assert spans[0].resolve(_get) == text[0:10]
    # step = size - overlap = 7
    assert spans[1].start == 7
    # the final span clamps to the block end, never past it
    assert spans[-1].end == len(text)
    # overlap means consecutive spans share text
    assert spans[0].resolve(_get)[7:] == spans[1].resolve(_get)[:3]


def test_chunk_spans_reconstruct_the_whole_atom():
    text = CONTENT["cid-a"]
    spans = list(chunk_spans("cid-a", len(text), size=8, overlap=0))
    assert "".join(s.resolve(_get) for s in spans) == text  # no-overlap chunks tile the source exactly


def test_one_bit_test_passes_when_content_present_fails_when_gone():
    spans = list(chunk_spans("cid-a", len(CONTENT["cid-a"]), size=12))
    assert rebuilds_from_content(spans, _get) is True  # derived + rebuildable → lawful
    orphan = [Span(cid="cid-missing", start=0, end=5)]
    assert rebuilds_from_content(orphan, _get) is False  # points where content no longer carries it


def test_bad_offsets_and_sizes_refuse():
    with pytest.raises(ValueError):
        Span(cid="c", start=5, end=2)
    with pytest.raises(ValueError):
        list(chunk_spans("c", 100, size=0))
    with pytest.raises(ValueError):
        list(chunk_spans("c", 100, size=5, overlap=5))
