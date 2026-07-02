"""Tests for structure_router — the corpus STRUCTURE-plane parse router.

Two faces proven here:
  1. the ROUTER — each corpus kind parses to a nested-dict tree the structurepalace encoder
     accepts (a fixture per kind → a tree → a cosine-meaningful structure vector), and
  2. the SIGIL grammar — a `<<~ … >>` block parses to the expected AST (the read-side
     twin of the lar-sigil TW5 wikirules; node types match grammar.js).

Parse-level tests need NO chroma; the encoder + ingest tests import structurepalace_io (chroma)
and SKIP cleanly when it / the venv stack is absent. Run under the mempalace venv:

    PYTHONPATH=<repo>/mempalace ~/.venv/bin/python -m pytest \
        packages/lararium-mempalace/scripts/test_structure_router.py -q
"""
import math
import os
import sys

import pytest

import structure_router as sr

HERE = os.path.dirname(os.path.abspath(__file__))


def _count(tree) -> int:
    n = 1
    for c in tree.get("children", []):
        n += _count(c)
    return n


# ── kind detection ─────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "name,expected",
    [
        ("a.js", "javascript"), ("a.tsx", "javascript"), ("a.mjs", "javascript"),
        ("a.json", "json"), ("a.md", "markdown"), ("a.toml", "toml"),
        ("a.tid", "wikitext"), ("a.txt", "prose"), ("a.bin", None),
    ],
)
def test_detect_kind_by_extension(name, expected):
    assert sr.detect_kind(name) == expected


def test_detect_kind_promotes_memetic_by_doctype():
    meme = b"<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->\n# x\n"
    assert sr.detect_kind("corpus.md", meme) == "memetic-wikitext"


def test_detect_kind_promotes_memetic_by_sigil_density():
    dense = b"text <<~ a >> more <<~ b >> end <<~ c >>"
    assert sr.detect_kind("note.md", dense) == "memetic-wikitext"


def test_detect_kind_plain_markdown_stays_markdown():
    assert sr.detect_kind("plain.md", b"# Title\n\njust prose, no sigils\n") == "markdown"


# ── the tree-sitter router (one fixture per kind) ────────────────────────────────────────

_TS_FIXTURES = {
    "javascript": (b"function f(x){ if(x>0){return x*2;} return 0; }\nconst y=[1,2,3].map(n=>n+1);", "program"),
    "json": (b'{"a":[1,2,{"b":true}],"c":null}', "document"),
    "markdown": (b"# Title\n\nA paragraph.\n\n- item 1\n- item 2\n", "document"),
    "toml": (b"[server]\nhost='x'\nport=8080\n[server.tls]\non=true\n", "document"),
    "wikitext": (b"== Heading ==\n'''bold''' and ''italic''\n* a list item\n", "source_file"),
}


@pytest.mark.parametrize("kind", list(_TS_FIXTURES))
def test_treesitter_kinds_parse_to_a_tree(kind):
    src, root_type = _TS_FIXTURES[kind]
    parser = sr._ts_parser(kind)
    if parser is None:
        pytest.skip(f"tree-sitter {kind} grammar not installed")
    tree = sr.parse_to_tree(kind, src)
    assert tree is not None
    assert tree["type"] == root_type
    assert _count(tree) > 3  # a real nested tree, not a stub
    assert "children" in tree


def test_unknown_kind_returns_none():
    assert sr.parse_to_tree(None, b"whatever") is None


# ── the SIGIL grammar (read-side twin of lar-sigil) ──────────────────────────────────────


def test_sigil_row_parses_each_sharktooth():
    src = (
        "<<~ lares aim a -> b >>\n"
        "<<~ hud Aperture(11) OODA-HA(9) >>\n"
        "<<~ ward * L-Prime >>\n"
    )
    tree = sr.parse_sigils(src)
    assert tree["type"] == "source_file"
    sharks = [c for c in tree["children"] if c["type"] == "sharktooth_sigil"]
    assert len(sharks) == 3
    # each carries a sigil_name leaf + counted arg leaves (fan-out = SHAPE signal)
    for s in sharks:
        assert s["children"][0]["type"] == "sigil_name"
        assert any(c["type"] == "arg" for c in s["children"])


def test_ahu_block_nests_inner_sigils():
    src = (
        "<<~ ahu #entry >>\n"
        "prose under the section\n"
        "<<~ confidence Canon 18/20 >>\n"
        "<<~ pranala a -> b >>\n"
        "<<~/ahu >>\n"
    )
    tree = sr.parse_sigils(src)
    ahu = [c for c in tree["children"] if c["type"] == "ahu_block"]
    assert len(ahu) == 1
    inner_types = {c["type"] for c in ahu[0]["children"]}
    assert "sharktooth_sigil" in inner_types  # the confidence sigil nested INSIDE the block
    assert "pranala" in inner_types


def test_doctype_and_pranala_header():
    src = (
        "<!-- <<~ !DOCTYPE = lar:///x/memetic-wikitext >> -->\n"
        "<<~ ? -> lar:///ha.ka.ba/@lares/api/lares/corpus >>\n"
    )
    tree = sr.parse_sigils(src)
    types = [c["type"] for c in tree["children"]]
    assert "doctype_comment" in types
    assert "pranala_header" in types


def test_memetic_routes_through_sigil_parser():
    meme = b"<<~ ahu #x >>\n<<~ confidence Canon 18/20 >>\n<<~/ahu >>"
    tree = sr.parse_to_tree("memetic-wikitext", meme)
    assert tree["type"] == "source_file"
    assert tree["children"][0]["type"] == "ahu_block"


def test_grammar_and_corpus_files_exist():
    base = os.path.join(HERE, "..", "grammars", "tree-sitter-lar-sigil")
    assert os.path.isfile(os.path.join(base, "grammar.js"))
    assert os.path.isfile(os.path.join(base, "test", "corpus", "sigils.txt"))


# ── the prose tier (graceful: stanza constituency → spaCy dependency → segment) ───────────


def test_prose_yields_a_tree():
    tree = sr.parse_prose("The quick brown fox jumps. The lazy dog then sleeps all day long here.")
    assert tree["type"] == "source_file"
    assert _count(tree) > 3  # SOME tier produced a real tree (segment floor never fails)


def test_prose_stanza_tier_yields_constituency_spans():
    """When stanza is installed, tier-1 produces real constituency phrase spans (ROOT/S/NP/VP)
    — the form-induction template candidates. Skips cleanly if stanza / its model is absent."""
    tree = sr._prose_stanza("The quick brown fox jumps over the lazy dog.")
    if tree is None:
        pytest.skip("stanza (or its en constituency model) not available")
    labels = set()

    def walk(n):
        labels.add(n["type"])
        for c in n["children"]:
            walk(c)

    walk(tree)
    assert {"ROOT", "S", "NP", "VP"} & labels  # constituency labels, not dependency/segment


# ── the compute-device cap — composed when present, never required (both scales) ──────────


def test_device_cap_is_composed_not_required():
    """The compute device is a CAP the entity #has, never a dependency: `cuda` on a card,
    `cpu` on the QA-lab box. An env override forces the hand; absent one it resolves from
    torch. Either resolution is a valid standing — the SAME router runs at both scales."""
    assert sr._device_cap() in ("cpu", "cuda")
    prev = os.environ.get("STRUCTURE_ROUTER_DEVICE")
    try:
        os.environ["STRUCTURE_ROUTER_DEVICE"] = "cpu"  # simulate the card-less QA box
        assert sr._device_cap() == "cpu"
    finally:
        if prev is None:
            os.environ.pop("STRUCTURE_ROUTER_DEVICE", None)
        else:
            os.environ["STRUCTURE_ROUTER_DEVICE"] = prev


def test_prose_stands_with_the_gpu_cap_ABSENT(monkeypatch):
    """Force the device-cap OFF (the QA-lab scale) and confirm prose STILL yields a tree —
    stanza-on-cpu, or the spaCy/segment tiers below it. Cap-absent never means parse-absent."""
    monkeypatch.setenv("STRUCTURE_ROUTER_DEVICE", "cpu")
    tree = sr.parse_prose("The fox runs. The dog sleeps soundly through the long afternoon.")
    assert tree["type"] == "source_file"
    assert _count(tree) > 3


# ── encoder fidelity: the router's trees are COSINE-MEANINGFUL ────────────────────────────


def _encoder():
    try:
        import structurepalace_io
        return structurepalace_io
    except Exception:  # noqa: BLE001 — chroma/venv stack absent
        return None


def test_structure_vectors_are_cosine_meaningful():
    ap = _encoder()
    if ap is None:
        pytest.skip("structurepalace_io (chroma stack) not importable")

    def vec(kind, src):
        return ap._structural_embed(sr.parse_to_tree(kind, src))

    def cos(a, b):
        return sum(x * y for x, y in zip(a, b))

    js1 = vec("javascript", b"function f(x){if(x>0){return x*2;}return 0;}")
    js2 = vec("javascript", b"function g(y){if(y<5){return y+1;}return 9;}")
    prose = vec("prose", b"The cat sat on the mat. The dog ran fast across the wide field today.")

    assert len(js1) == 32
    assert abs(math.sqrt(sum(x * x for x in js1)) - 1.0) < 1e-6  # L2-normalized
    # ORDERING: two structurally-near functions read NEARER than code-vs-prose.
    assert cos(js1, js2) > cos(js1, prose)


def test_ingest_populates_a_structure_palace(tmp_path):
    ap = _encoder()
    if ap is None:
        pytest.skip("structurepalace_io (chroma stack) not importable")
    src = tmp_path / "src"
    src.mkdir()
    (src / "a.js").write_text("function f(x){ return x*2; }\nconst y=[1,2,3];\n")
    (src / "b.json").write_text('{"a":1,"b":[2,3]}\n')
    palace = str(tmp_path / "structure")
    args = type("A", (), {"path": str(src), "palace": palace})()
    import io
    import contextlib

    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        sr.cmd_ingest(args)
    import json

    summary = json.loads(buf.getvalue().strip().splitlines()[-1])
    assert summary["structures"] == 2
    assert summary["by_kind"].get("javascript") == 1
    assert summary["by_kind"].get("json") == 1
