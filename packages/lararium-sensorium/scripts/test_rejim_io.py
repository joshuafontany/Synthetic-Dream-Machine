"""test_rejim_io — the derived rejim/geology plane repours from content, rebuildable.

  · _content_stream drains + sorts by (source_file, chunk_index, cid) → the authored stream order.
  · repour_rejim reads content → detects nameless flows → lands geology.json; a re-repour rebuilds.

    PYTHONPATH=mempalace ./.venv/bin/python -m pytest packages/lararium-sensorium/scripts/test_rejim_io.py -q
"""
import numpy as np

from rejim_io import _content_stream, read_rejim, repour_rejim
from content_io import ContentStore


def _refrain_blocks(store: ContentStore, n_blocks: int = 150, seed: int = 11) -> None:
    """Land refrain-bearing blocks in (source_file, chunk_index) order — each block one refrain-cycle, so
    the concatenated stream carries a content refrain at ~one-block period over tens of thousands of ticks."""
    rng = np.random.default_rng(seed)
    refrain = "and the wave returns to the shore once more "
    for k in range(n_blocks):
        filler = ["".join("aeioukpnmhrstl"[int(c)] for c in rng.integers(0, 14, int(rng.integers(4, 9))))
                  for _ in range(int(rng.integers(22, 30)))]
        doc = refrain + " ".join(filler) + " "
        store.put(f"cid-{k:04d}", doc, [0.0, 0.0, 0.0, 0.0],
                  {"source_file": "bed:refrain", "chunk_index": k, "wing": "w", "room": "r"})


def test_content_stream_reads_authored_order(tmp_path):
    store = ContentStore(str(tmp_path / "content"))
    # land OUT of order; the stream must come back sorted by (source_file, chunk_index)
    store.put("cid-b", "BBB", [0.0] * 4, {"source_file": "s", "chunk_index": 1})
    store.put("cid-a", "AAA", [0.0] * 4, {"source_file": "s", "chunk_index": 0})
    store.put("cid-c", "CCC", [0.0] * 4, {"source_file": "s", "chunk_index": 2})
    assert _content_stream(store) == "AAABBBCCC"          # chunk_index order, not insertion/scan order


def test_repour_lands_nameless_rejim_and_rebuilds(tmp_path):
    content = str(tmp_path / "content")
    rejim = str(tmp_path / "rejim")
    _refrain_blocks(ContentStore(content))

    landed = repour_rejim(content, rejim, n_surrogates=3)
    assert landed["stream_chars"] > 20000                 # a real, lock-scale stream drained from content
    assert landed["rejim"], "the repour detected no flow over refrain-bearing content"
    assert all(a["name"] is None for a in landed["rejim"])           # NAMELESS — detect before name
    assert all("_series" not in a for a in landed["rejim"])          # no verbatim band arrays persisted

    on_disk = read_rejim(rejim)                          # it landed to geology.json, readable back
    assert on_disk["rejim"] == landed["rejim"]

    # rebuildable: a second repour fully re-derives from content (the one writable source) — same result
    again = repour_rejim(content, rejim, n_surrogates=3)
    assert [a["scale"] for a in again["rejim"]] == [a["scale"] for a in landed["rejim"]]
