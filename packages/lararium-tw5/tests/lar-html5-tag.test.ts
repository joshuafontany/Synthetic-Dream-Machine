/**
 * lar-html5-tag — the ground-state HTML5 open-tag tokenizer + sanitizer.
 * Verifies: modern HTML5 attributes, error-recovery on malformed tags, the
 * open-tag end offset (so the caller can recurse the body), and the security
 * neutering (script/iframe → safe-*, javascript:/data: URL drop, on* drop).
 */

import { describe, expect, test } from "vitest";

import { parseHtml5OpenTag, sanitizeHtml5Tag } from "../src/wikirules/lar-html5-tag.js";

describe("parseHtml5OpenTag — HTML5 grammar", () => {
  test("modern attributes: custom element, data-*, aria-*", () => {
    const src = `<my-widget data-foo="bar" aria-label='hi' hidden>body</my-widget>`;
    const n = parseHtml5OpenTag(src, 0)!;
    expect(n.tag).toBe("my-widget");
    expect(n.attributes["data-foo"]?.value).toBe("bar");
    expect(n.attributes["aria-label"]?.value).toBe("hi");
    expect(n.attributes["hidden"]?.value).toBe(""); // boolean attr
    // end offset lands just past the open tag's `>`, so the body recurses cleanly
    expect(src.slice(n.end)).toBe("body</my-widget>");
    expect(n.isSelfClosing).toBe(false);
  });

  test("error-recovery: unquoted + spaced-equals + duplicate attrs never throw", () => {
    const src = `<div class=foo id = bar class="dup">x</div>`;
    const n = parseHtml5OpenTag(src, 0)!;
    expect(n.tag).toBe("div");
    expect(n.attributes["id"]?.value).toBe("bar");
    // HTML5: first duplicate wins at the token level; we keep a defined value
    expect(n.attributes["class"]).toBeDefined();
    expect(src.slice(n.end)).toBe("x</div>");
  });

  test("self-closing / void", () => {
    expect(parseHtml5OpenTag(`<br/>`, 0)!.isSelfClosing).toBe(true);
    const img = parseHtml5OpenTag(`<img src="data:image/png;base64,AAAA">`, 0)!;
    expect(img.tag).toBe("img");
    expect(img.attributes["src"]?.value).toBe("data:image/png;base64,AAAA"); // image data: kept
  });

  test("leading offset (pos before the `<`)", () => {
    const src = `   <p class="a">hi</p>`;
    const n = parseHtml5OpenTag(src, 0)!;
    expect(n.tag).toBe("p");
    expect(n.start).toBe(3);
    expect(src.slice(n.end)).toBe("hi</p>");
  });
});

describe("sanitizeHtml5Tag — the security gate (the audit, enacted)", () => {
  test("unsafe elements neuter to safe-* (closes TW5's iframe/object holes)", () => {
    expect(parseHtml5OpenTag(`<script>`, 0)!.tag).toBe("safe-script");
    expect(parseHtml5OpenTag(`<iframe src="x">`, 0)!.tag).toBe("safe-iframe");
    expect(parseHtml5OpenTag(`<object data="x">`, 0)!.tag).toBe("safe-object");
    expect(parseHtml5OpenTag(`<embed src="x">`, 0)!.tag).toBe("safe-embed");
  });

  test("javascript:/vbscript: URLs emptied; on* attrs dropped", () => {
    const a = parseHtml5OpenTag(`<a href="javascript:alert(1)" onclick="x">`, 0)!;
    expect(a.attributes["href"]?.value).toBe("");      // scheme neutered
    expect(a.attributes["onclick"]).toBeUndefined();   // event attr dropped
  });

  test("scheme detection sees through control-char obfuscation", () => {
    const a = parseHtml5OpenTag(`<a href="java\tscript:alert(1)">`, 0)!;
    expect(a.attributes["href"]?.value).toBe("");
  });

  test("non-image data: URL dropped; image data: kept", () => {
    const bad = parseHtml5OpenTag(`<a href="data:text/html,<script>x">`, 0)!;
    expect(bad.attributes["href"]?.value).toBe("");
    const ok = sanitizeHtml5Tag({
      type: "element", tag: "img", isSelfClosing: true, start: 0, end: 0,
      orderedAttributes: [{ name: "src", type: "string", value: "data:image/gif;base64,R0lGOD" }],
      attributes: { src: { name: "src", type: "string", value: "data:image/gif;base64,R0lGOD" } },
    });
    expect(ok.attributes["src"]?.value).toBe("data:image/gif;base64,R0lGOD");
  });

  test("safe content is untouched", () => {
    const n = parseHtml5OpenTag(`<a href="https://example.com" class="link">`, 0)!;
    expect(n.tag).toBe("a");
    expect(n.attributes["href"]?.value).toBe("https://example.com");
    expect(n.attributes["class"]?.value).toBe("link");
  });
});
