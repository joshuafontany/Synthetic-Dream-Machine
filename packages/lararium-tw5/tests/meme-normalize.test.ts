/**
 * meme-normalize — the SOH-namespace canonicalization the `lares normalize`
 * gesture applies. The class oracle.md tripped: an iam that declares a
 * namespace whose SOH opener does not carry it (round-trip drift + lost
 * idempotence). The transform homes the iam-declared namespace into the SOH
 * as literal glyphs; the iam field is authoritative.
 */

import { describe, test, expect } from "vitest";
import { normalizeMemeSource } from "../src/meme-normalize.js";

const HEAD = (soh: string, ns: string) =>
  `<!-- <<~ !DOCTYPE = lar:///x >> -->\n\n${soh}\n` +
  "```toml iam\n" +
  `cacheable = true\n` +
  (ns === "" ? "" : `namespace = "${ns}"\n`) +
  "```\n\n<<~ &#x0002; >>\n\nbody\n\n<<~ &#x0003; >>\n";

describe("normalizeMemeSource — SOH namespace embed", () => {
  test("homes the iam-declared namespace into a bare SOH (the oracle.md class)", () => {
    const src = HEAD("<<~ &#x0001; ? -> lar:///x >>", "&#x2299;");
    const { text, changed, notes } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<~ ⊙&#x0001; ? -> lar:///x >>");
    expect(notes.join()).toMatch(/namespace homed to "⊙"/);
  });

  test("decodes a multi-glyph entity namespace (noosphere ॐ ँ)", () => {
    const src = HEAD("<<~ &#x0001; ? -> lar:///x >>", "&#x0950; &#x0901;");
    const { text } = normalizeMemeSource(src);
    expect(text).toContain("<<~ ॐ ँ&#x0001; ? -> lar:///x >>");
  });

  test("idempotent — a carrier already carrying its namespace is unchanged", () => {
    const src = HEAD("<<~ ⊙&#x0001; ? -> lar:///x >>", "&#x2299;");
    const r1 = normalizeMemeSource(src);
    expect(r1.changed).toBe(false);
    expect(r1.text).toBe(src);
    // double-apply on the bare form converges and stays put
    const r2 = normalizeMemeSource(normalizeMemeSource(HEAD("<<~ &#x0001; ? -> lar:///x >>", "&#x2299;")).text);
    expect(r2.changed).toBe(false);
  });

  test("re-homes a STALE SOH namespace to match iam", () => {
    const src = HEAD("<<~ ॐ ँ&#x0001; ? -> lar:///x >>", "&#x2299;");
    const { text, changed } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<~ ⊙&#x0001; ? -> lar:///x >>");
    expect(text).not.toContain("ॐ ँ&#x0001;");
  });

  test("clears the SOH namespace when iam declares none", () => {
    const src = HEAD("<<~ ⊙&#x0001; ? -> lar:///x >>", "");
    const { text, changed } = normalizeMemeSource(src);
    expect(changed).toBe(true);
    expect(text).toContain("<<~ &#x0001; ? -> lar:///x >>");
  });

  test("no SOH opener → no change (not a single-meme carrier)", () => {
    const src = "plain prose, no carrier framing\n";
    expect(normalizeMemeSource(src).changed).toBe(false);
  });
});
