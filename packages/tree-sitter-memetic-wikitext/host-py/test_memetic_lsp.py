"""memetic_lsp — the readings stay pure, byte-grounded, and UTF-16-honest at the wire."""

import memetic_lsp as ml

_DOC = (
    "<<~ ahu #entry >>\n"
    "! The Hearth\n"
    "prose rides beneath the carrier\n"
    "```toml iam\n"
    "mana = 16\n"
    "```\n"
    "<<~/ahu >>\n"
).encode("utf-8")


def _decode_tokens(data, encoded):
    """Delta stream → absolute (line, col, length, type) rows."""
    rows, line, col = [], 0, 0
    for i in range(0, len(encoded), 5):
        dl, dc, length, typ, _mods = encoded[i:i + 5]
        line += dl
        col = col + dc if dl == 0 else dc
        rows.append((line, col, length, ml.TOKEN_TYPES[typ]))
    return rows


def test_semantic_tokens_encode_in_fives_with_sane_deltas():
    encoded = ml.semantic_tokens(_DOC)
    assert encoded and len(encoded) % 5 == 0
    rows = _decode_tokens(_DOC, encoded)
    assert rows == sorted(rows, key=lambda r: (r[0], r[1]))  # the stream rides in order
    assert all(r[2] > 0 for r in rows)


def test_narrowest_capture_wins_inside_the_sigil():
    # the body span colors "string" OVER its sigil's "macro"; the teeth stay macro
    rows = _decode_tokens(_DOC, ml.semantic_tokens(_DOC))
    line0 = [r for r in rows if r[0] == 0]
    assert ("string" in {r[3] for r in line0}) and ("macro" in {r[3] for r in line0})
    body = next(r for r in line0 if r[3] == "string")
    assert _DOC.decode()[body[1]:body[1] + body[2]].strip() == "ahu #entry"


def test_positions_speak_utf16_at_the_wire():
    # 𝕏 rides outside the BMP: 4 bytes, ONE codepoint, TWO UTF-16 units —
    # the body token's LENGTH must speak UTF-16 units at the wire
    doc = "<<~ 𝕏 >>\n".encode("utf-8")
    rows = _decode_tokens(doc, ml.semantic_tokens(doc))
    body = next(r for r in rows if r[3] == "string")
    # the body token spans " 𝕏 " (the carrier keeps no extras): 1+2+1 UTF-16
    # units — never 3 (codepoints) and never 6 (bytes)
    assert body[2] == 4


def test_document_symbols_nest_by_containment():
    syms = ml.document_symbols(_DOC)
    assert [s["name"] for s in syms] == ["ahu #entry"]
    inner = [c["name"] for c in syms[0]["children"]]
    assert "The Hearth" in inner and "toml iam" in inner


def test_tw5_forms_parse_as_structure():
    # the realignment's target forms: ! headings fold as headings (both marks
    # stripped in the symbol name); * list lines fold as meme.list, and a
    # line OPENING with bold stays prose (the stricter-than-TW5 list rule)
    doc = ("<<~ ahu #tw5 >>\n"
           "!! Kilo\n"
           "* one\n"
           "** two nested\n"
           "''bold'' opener stays prose\n"
           "<<~/ahu >>\n").encode("utf-8")
    import memeast_fold as mf
    kinds = {}
    def _walk(n):
        kinds[n["kind"]] = kinds.get(n["kind"], 0) + 1
        for c in n.get("children", []):
            _walk(c)
    _walk(mf.fold(doc))
    assert kinds.get("meme.list") == 2
    assert kinds.get("meme.heading") == 1
    syms = ml.document_symbols(doc)
    assert [c["name"] for c in syms[0]["children"]] == ["Kilo"]


def test_diagnostics_stay_silent_on_clean_ground():
    found, coverage = ml.diagnostics(_DOC)
    assert found == [] and coverage == 0.0


def test_diagnostics_name_a_broken_span():
    # a fence that never closes surfaces as a MISSING mark — zero-width, so
    # it names the spot without inflating the coverage gauge
    found, coverage = ml.diagnostics(b"```toml\nkey = 1\n")
    assert found and coverage == 0.0
    assert any("expected a token" in d["message"] for d in found)
    assert all(d["source"] == ml.SERVER_NAME for d in found)


def test_empty_ground_reports_nothing():
    assert ml.semantic_tokens(b"") == []
    assert ml.document_symbols(b"") == []
    assert ml.diagnostics(b"") == ([], 0.0)


def test_the_pygls_skin_registers_its_features():
    server = ml.build_server()
    server_features = set(server.protocol.fm.features.keys())
    assert {"textDocument/didOpen", "textDocument/didChange",
            "textDocument/semanticTokens/full",
            "textDocument/documentSymbol"} <= server_features
