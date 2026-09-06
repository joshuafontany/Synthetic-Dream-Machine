/**
 * meme-normalize — the SOH-namespace canonicalization the `lares carrier normalize`
 * gesture applies. The class oracle.md tripped: an meta that declares a
 * namespace whose SOH opener does not carry it (round-trip drift + lost
 * idempotence). The transform homes the meta-declared namespace into the SOH
 * as literal glyphs; the meta field is authoritative.
 */

import { describe, test, expect } from "vitest";
import { normalizeMemeSource } from "../src/meme-normalize.js";

const HEAD = (soh: string, ns: string) =>
  `<!-- <<~ !DOCTYPE = lar:///x>> -->\n\n${soh}\n` +
  "```toml meta\n" +
  `cacheable = true\n` +
  (ns === "" ? "" : `namespace = "${ns}"\n`) +
  "```\n\n<<^ code=\"&#x0002;\">>\n\nbody\n\n<<^ code=\"&#x0003;\">>\n";

describe("normalizeMemeSource — SOH namespace embed", () => {
  test("homes the meta-declared namespace into a bare SOH (the oracle.md class)", () => {
    const src = HEAD("<<^ code=\"&#x0001;\" ? -> lar:///x>>", "&#x2299;");
    const { text, changed, notes } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<^ code=\"&#x0001;\" namespace=\"⊙\" from=? -> to=lar:///x>>");
    expect(notes.join()).toMatch(/namespace homed to "⊙"/);
  });

  test("decodes a multi-glyph entity namespace (noosphere ॐ ँ)", () => {
    const src = HEAD("<<^ code=\"&#x0001;\" ? -> lar:///x>>", "&#x0950; &#x0901;");
    const { text } = normalizeMemeSource(src);
    expect(text).toContain("<<^ code=\"&#x0001;\" namespace=\"ॐ ँ\" from=? -> to=lar:///x>>");
  });

  test("idempotent — a carrier already carrying its namespace is unchanged", () => {
    const src = HEAD("<<^ code=\"&#x0001;\" namespace=\"⊙\" from=? -> to=lar:///x>>", "&#x2299;");
    const r1 = normalizeMemeSource(src);
    expect(r1.changed).toBe(false);
    expect(r1.text).toBe(src);
    // double-apply on the bare form converges and stays put
    const r2 = normalizeMemeSource(normalizeMemeSource(HEAD("<<^ code=\"&#x0001;\" ? -> lar:///x>>", "&#x2299;")).text);
    expect(r2.changed).toBe(false);
  });

  test("re-homes a STALE SOH namespace to match meta", () => {
    const src = HEAD("<<^ code=\"&#x0001;\" namespace=\"ॐ ँ\" ? -> lar:///x>>", "&#x2299;");
    const { text, changed } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<^ code=\"&#x0001;\" namespace=\"⊙\" from=? -> to=lar:///x>>");
    expect(text).not.toContain("ॐ ँ&#x0001;");
  });

  test("clears the SOH namespace when meta declares none", () => {
    const src = HEAD("<<^ code=\"&#x0001;\" namespace=\"⊙\" ? -> lar:///x>>", "");
    const { text, changed } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<^ code=\"&#x0001;\" from=? -> to=lar:///x>>");
  });

  test("no SOH opener → no change (not a single-meme carrier)", () => {
    const src = "plain prose, no carrier framing\n";
    expect(normalizeMemeSource(src).changed).toBe(false);
  });
});

describe("normalizeMemeSource — SOH opener spacing", () => {
  test("homes a missing space in a no-namespace opener (the lifted-corpus form)", () => {
    // The INPUT must carry the drift this test names — a caret opener with no space after it.
    const src = HEAD("<<^&#x0001; ? -> lar:///x>>", "");
    const { text, changed, notes } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<^ code=\"&#x0001;\" from=? -> to=lar:///x>>");
    expect(notes.join()).toMatch(/spacing canonicalized/);
  });

  test("idempotent — a correctly-spaced bare opener is left untouched", () => {
    const src = HEAD("<<^ code=\"&#x0001;\" from=? -> to=lar:///x>>", "");
    expect(normalizeMemeSource(src).changed).toBe(false);
  });
});

// meta head with a register field, for the register-band class.
const CLOSE_HEAD = (close: string) =>
  `<!-- <<~ !DOCTYPE = lar:///x>> -->\n\n<<^ code="&#x0001;" from=? -> to=lar:///x>>\n` +
  "```toml meta\n" +
  `cacheable = true\n` +
  "```\n\n<<^ code=\"&#x0002;\">>\n\n" +
  `<<~ ahu #head${close}>>\n\nbody\n\n<<~/ahu${close}>>\n\n` +
  "<<^ code=\"&#x0003;\">>\n";

describe("normalizeMemeSource — sigil close spacing", () => {
  test("tightens a close carrying a space before the brackets", () => {
    const { text, changed, notes } = normalizeMemeSource(CLOSE_HEAD(" "));
    expect(changed).toBe(true);
    expect(text).toContain("<<~ ahu #head>>");
    expect(text).toContain("<<~/ahu>>");
    expect(notes.join()).toMatch(/sigil close spacing: 2 closes tightened/);
  });

  test("a tight close is already canonical — no change", () => {
    expect(normalizeMemeSource(CLOSE_HEAD("")).changed).toBe(false);
  });

  test("idempotent — tighten then re-run leaves it put", () => {
    const once = normalizeMemeSource(CLOSE_HEAD(" ")).text;
    expect(normalizeMemeSource(once).changed).toBe(false);
  });

  test("a sigil whose content ends in a nested close keeps its space", () => {
    // `params=<<params>> >>` tightened would read `>>>>` and the reader would take the wrong close
    const src = CLOSE_HEAD("").replace("body", "<<has mu name=<<name>> params=<<params>> >>");
    expect(normalizeMemeSource(src).text).toContain("params=<<params>> >>");
  });

  test("a close crossing a newline is left alone — a sigil closes on the line it opens", () => {
    const wrapped = ["<<~ ranks a ~ one", "-> b ~ two", ">>"].join("\n");
    const src = CLOSE_HEAD("").replace("body", wrapped);
    expect(normalizeMemeSource(src).text).toContain(wrapped);
  });
});
