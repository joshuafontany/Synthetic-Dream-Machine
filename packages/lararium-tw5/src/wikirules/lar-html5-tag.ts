/*\
title: lar:///ha.ka.ba/@lararium/tw5/wikirules/lar-html5-tag
type: application/javascript
module-type: library
\*/
/**
 * lar-html5-tag — the GROUND-STATE HTML5 open-tag tokenizer + sanitizer.
 *
 * Lifts TW5's hand-rolled open-tag scanner (core html.js `parseTag` — a thin
 * `reTagName`/`parseAttribute` regex pass, "TW5-era HTML") onto **parse5**, the
 * pure-JS WHATWG-reference tokenizer. Gives full HTML5 attribute grammar +
 * error-recovery (unquoted/duplicate/malformed attrs, modern names) WITHOUT
 * touching interleaving: this parses ONLY the open tag's name + attributes and
 * returns the open-tag END offset; the caller (the `html` wikirule shadow)
 * keeps TW5's `$`-widget dispatch and wikitext child-recursion verbatim.
 *
 * Isomorphic: parse5 is a pure parser (string→AST), no DOM/window — runs in
 * node worker_threads / browser worker / CLI / edge. Canon:
 * lar:///ha.ka.ba/@lararium/v0.1/api/graceful-parsing#the-tower
 *
 * SECURITY (the audit, enacted): a spec parser tokenizes everything faithfully,
 * so this neuters at PARSE time — the AST is safe-by-construction (the verbatim
 * layer stays lossless; the AST is the safe structured view). Defense-in-depth
 * over TW5's render gates (element.js script-neuter + widget.js on*-strip), and
 * it closes TW5's open holes: `javascript:`/`vbscript:`/non-image `data:` URLs,
 * and the dangerous elements TW5 never neutered (iframe/object/embed/base/form…).
 */

import { parseFragment } from "parse5";

/** A TW5 parse-tree attribute (the shape core `parseAttribute` produces). */
export interface Tw5Attribute {
  name:  string;
  type:  "string";
  value: string;
  start?: number;
  end?:   number;
}

export interface Html5TagResult {
  type:       "element";
  tag:        string;
  attributes: Record<string, Tw5Attribute>;
  orderedAttributes: Tw5Attribute[];
  isSelfClosing: boolean;
  start:      number;
  end:        number;          // absolute offset in `source` past the open tag's `>`
}

/** Elements TW5 leaves un-neutered but that carry script/navigation vectors. */
const UNSAFE_ELEMENTS = new Set([
  "script", "iframe", "object", "embed", "base", "form", "frame", "frameset",
  "noscript", "noembed", "portal",
]);

/** Attributes whose value is a URL and may carry a script: scheme. */
const URL_ATTRS = new Set([
  "href", "src", "xlink:href", "action", "formaction", "data", "poster",
  "background", "ping", "srcdoc", "srcset",
]);

const DANGEROUS_SCHEME = /^\s*(?:javascript|vbscript)\s*:/i;
// data: only allowed for images (data:image/...); everything else dropped.
const NONIMAGE_DATA = /^\s*data\s*:(?!image\/)/i;

/** Strip the C0 control chars + whitespace HTML5 ignores when matching schemes. */
function schemeUnsafe(value: string): boolean {
  const v = value.replace(/[\u0000-\u0020]+/g, "");
  return DANGEROUS_SCHEME.test(v) || NONIMAGE_DATA.test(v);
}

/**
 * Sanitize a parsed element IN PLACE (allowlist-by-neuter, never throw):
 *  - unsafe element → renamed `safe-<tag>` (mirrors TW5's script-neuter, generalized)
 *  - `on*` event attribute → dropped (defense-in-depth; TW5 also strips at render)
 *  - URL attr with a javascript:/vbscript:/non-image-data: scheme → value emptied
 * Returns the (mutated) node so it composes in a transform walk.
 */
export function sanitizeHtml5Tag(node: Html5TagResult): Html5TagResult {
  if (UNSAFE_ELEMENTS.has(node.tag.toLowerCase())) {
    node.tag = "safe-" + node.tag;
  }
  for (const attr of node.orderedAttributes.slice()) {
    const lname = attr.name.toLowerCase();
    if (lname.startsWith("on")) {
      delete node.attributes[attr.name];
      node.orderedAttributes = node.orderedAttributes.filter((a) => a !== attr);
      continue;
    }
    if (URL_ATTRS.has(lname) && schemeUnsafe(attr.value)) {
      attr.value = "";
    }
  }
  return node;
}

/**
 * Tokenize the HTML5 open tag at `source[pos]` (`pos` AT or before the `<`).
 * Returns null if no element parses there (caller falls back / treats as text).
 * parse5 never throws — malformed tags recover to a best-effort element.
 */
export function parseHtml5OpenTag(source: string, pos: number): Html5TagResult | null {
  const lt = source.indexOf("<", pos);
  if (lt === -1) return null;
  // A bounded slice that surely contains the whole open tag (attrs may hold `>`
  // inside quotes — parse5's tokenizer handles that). 64k is far past any real tag.
  const slice = source.slice(lt, lt + 65536);
  let frag;
  try {
    frag = parseFragment(slice, { sourceCodeLocationInfo: true }) as unknown as {
      childNodes: Array<{
        tagName?: string;
        attrs?: Array<{ name: string; value: string; prefix?: string }>;
        sourceCodeLocation?: { startTag?: { endOffset: number } } | null;
      }>;
    };
  } catch {
    return null; // parse5 shouldn't throw; if it does, defer to the caller
  }
  const el = frag.childNodes.find((n) => typeof n.tagName === "string");
  if (!el || !el.tagName) return null;
  const startTag = el.sourceCodeLocation?.startTag;
  if (!startTag) return null;
  const openTagEnd = lt + startTag.endOffset;
  const isSelfClosing = source[openTagEnd - 2] === "/";

  const attributes: Record<string, Tw5Attribute> = {};
  const orderedAttributes: Tw5Attribute[] = [];
  for (const a of el.attrs ?? []) {
    // parse5 lowercases HTML attr names + resolves namespaced ones (xlink:href).
    const name = a.prefix ? `${a.prefix}:${a.name}` : a.name;
    const attr: Tw5Attribute = { name, type: "string", value: a.value };
    // last-wins on duplicates, matching TW5's map semantics
    attributes[name] = attr;
    if (!orderedAttributes.some((x) => x.name === name)) orderedAttributes.push(attr);
  }

  const node: Html5TagResult = {
    type: "element",
    tag: el.tagName,
    attributes,
    orderedAttributes,
    isSelfClosing,
    start: lt,
    end: openTagEnd,
  };
  return sanitizeHtml5Tag(node);
}
