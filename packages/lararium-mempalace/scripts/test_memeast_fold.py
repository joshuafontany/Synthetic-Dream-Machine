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
