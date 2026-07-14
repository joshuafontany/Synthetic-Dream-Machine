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


def test_golden_corpus_hashes_hold():
    """THE PARITY GATE: every meme's canonical MemeAst hash, pinned in the
    versioned manifest. A grammar or fold change that moves ANY hash fails
    loud — the divergence then rides the bump ritual (classify INTENDED with
    a NAMED skip or a re-bake in the same commit; or fix the REGRESSION).
    This same manifest gates the TS host when it lands."""
    import json
    import os

    here = os.path.dirname(os.path.abspath(__file__))
    manifest_path = os.path.join(here, "..", "fixtures", f"manifest-{CORPUS_MANIFEST}.json")
    with open(manifest_path) as fh:
        golden = json.load(fh)
    # repo-relative: the corpus rides the same checkout as the manifest,
    # so the gate runs anywhere the repo lands (local tree AND CI)
    bags = os.path.normpath(os.path.join(here, "..", "..", "..", "bags", "@lares"))
    if not os.path.isdir(bags):
        import pytest

        pytest.skip("bags corpus absent — the gate rides the operator's tree")

    skips = golden.get("skip", {})  # rel-path → reason; INTENDED divergence, named
    drifted, missing, skipped = [], [], []
    for rel, want in golden["corpus"].items():
        if rel in skips:
            skipped.append((rel, skips[rel]))
            continue
        path = os.path.join(bags, rel)
        if not os.path.isfile(path):
            missing.append(rel)  # a retired meme: the corpus wants a re-bake, not a failure
            continue
        data = open(path, "rb").read()
        got = mf.structural_hash(mf.fold(data))
        if got != want["hash"]:
            drifted.append(rel)
    assert not drifted, f"{len(drifted)} memes fold differently now: {drifted[:5]}"
    # every hashed meme still parses; absences are reported, never silently passed
    assert len(missing) < len(golden["corpus"]) // 2, f"corpus moved under the gate: {missing[:5]}"
    # a skip names its reason or it does not exist
    assert all(reason for _, reason in skipped), f"unnamed skips: {skipped}"
