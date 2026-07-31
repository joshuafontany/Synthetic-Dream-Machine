"""memeast_fold — the starved fold stays deterministic, contained, and grammar-blind."""

import memeast_fold as mf


def _kinds(node, acc=None):
    acc = acc if acc is not None else {}
    acc[node["kind"]] = acc.get(node["kind"], 0) + 1
    for c in node.get("children", []):
        _kinds(c, acc)
    return acc


def test_ahu_block_nests_its_body_by_containment():
    src = (
        "<<~ ahu #entry >>\n"
        "some prose line\n"
        "<<~ inner sigil >>\n"
        "<<~/ahu >>\n"
    ).encode("utf-8")
    ast = mf.fold(src)
    ahu = next(c for c in ast["children"] if c["kind"] == "meme.ahu")
    inner = _kinds(ahu)  # the inner sigil rides UNDER the ahu, never beside it
    assert inner.get("meme.sigil", 0) >= 1
    assert ahu.get("open", {}).get("kind") == "meme.ahu.open"
    assert ahu.get("close", {}).get("kind") == "meme.ahu.close"


def test_spans_are_byte_offsets_into_the_ground():
    # a multibyte char before a sigil: byte spans must exceed codepoint indices
    src = "ॐ pre\n<<~ mu >>\n".encode("utf-8")
    ast = mf.fold(src)
    sigil = next(c for c in ast["children"] if c["kind"] == "meme.sigil")
    assert src[sigil["start"]:sigil["start"] + 3] == b"<<~"  # the span indexes BYTES
    assert ast["end"] == len(src)


def test_fold_is_deterministic_hash_stable():
    src = ("<<~ a >>\ntext\n<<~ b >>\n<<~/a >>\n" * 3).encode("utf-8")
    a, b = mf.fold(src), mf.fold(src)
    assert mf.canonical_json(a) == mf.canonical_json(b)
    assert mf.structural_hash(a) == mf.structural_hash(b)


def test_unregistered_sigil_still_folds_cleanly():
    # a name no vocabulary knows parses at the CARRIER layer as a plain sigil —
    # never an error; the vocabulary attaches downstream from the live registry.
    kinds = _kinds(mf.fold(b"<<~ totally-novel-name with args >>\n"))
    assert kinds.get("meme.sigil") == 1
    assert "ERROR" not in kinds


def test_canonical_json_sorts_keys_and_leaks_no_host_fields():
    cj = mf.canonical_json(mf.fold(b"<<~ x >>\n"))
    assert cj.index('"children"') < cj.index('"end"') < cj.index('"kind"') < cj.index('"start"')
    assert '"_' not in cj  # no host/internal field ever enters the parity currency


def test_loader_refuses_loud_on_abi_mismatch(monkeypatch):
    # a host that cannot honor the quad names BOTH sides and stops
    import pytest

    class FakeLang:
        abi_version = 14

    monkeypatch.setattr(mf, "artifact_quad", lambda: {"grammarAbi": 15})
    with pytest.raises(SystemExit, match=r"ABI 14.*declares 15"):
        mf._refuse_loud_on_mismatch(FakeLang())


#: the manifest version THIS host tests — the toml-test discipline: a host
#: declares its corpus version and gets tested against that, never against
#: the newest published (skew = a declared state, never an accident).
CORPUS_MANIFEST = "0.1.0"


def test_declared_manifest_matches_artifact():
    """The host's declared manifest and the artifact's quad agree — a host
    testing a manifest the artifact no longer names has drifted."""
    assert mf.artifact_quad()["corpusManifest"] == CORPUS_MANIFEST


# The golden-corpus parity gate retired here. It hashed 250 memes out of `bags/@lares` — authored
# content under continuous revision — so it measured the fold against ground that moves: an edit and a
# grammar regression produced the same red. It fired on 60 memes in seventeen days, every one a content
# edit, and never once caught a grammar change.
#
# The four properties it bundled now sit on beds that suit them, in `test_fold_specimens.py`:
# hashes pinned over FROZEN specimens · coverage measured against the grammar's own node-types.json ·
# the living corpus gated on invariants (no ERROR node, spans inside their ground) · determinism over
# real specimens. `fixtures/manifest-0.1.0.json` stays as the record of what was pinned and when.
