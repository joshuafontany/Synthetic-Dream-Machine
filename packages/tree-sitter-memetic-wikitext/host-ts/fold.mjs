/**
 * host-ts fold — the starved fold, TS-side: carrier CST → canonical MemeAst.
 *
 * MIRRORS host-py/memeast_fold.py exactly — same capture-name branching
 * (the starvation rule: grammar opinions live in grammar/query, never here),
 * same containment algorithm, same canonical JSON, same sha256 currency.
 * The parity manifest holds both hosts to one hash.
 *
 * THE CURRENCY CONVERSION, this host's first duty: web-tree-sitter indexes
 * count UTF-16 code units (JS strings); the canonical MemeAst speaks BYTE
 * offsets into the ground bytes. The fold builds a UTF-16→byte map once per
 * document and converts every span at capture time — positions can never
 * silently disagree with the py host because the hash covers them.
 *
 * Runs in Node from the committed grammar wasm; the same module shape serves
 * the TW5 plugin and the VSCode extension (isomorphic: no fs at fold time —
 * loaders live in loader.mjs).
 *
 * Meme: lar:///ha.ka.ba/lararium/sensorium/memeast-fold
 */
import { createHash } from "node:crypto";

/** captures that never nest anything (leaves of the MemeAst) — mirror of py */
const LEAF_KINDS = new Set([
  "meme.sigil.body", "meme.sigil.close.body", "meme.fence.info",
  "meme.heading", "meme.list", "meme.comment", "meme.text", "meme.blank",
]);
/** captures that ride as fields of their parent — mirror of py */
const FIELD_OF = new Map([
  ["meme.sigil.body", "body"], ["meme.sigil.close.body", "body"],
  ["meme.fence.info", "info"], ["meme.ahu.open", "open"], ["meme.ahu.close", "close"],
]);

/**
 * UTF-16 index → byte offset, precomputed once per document.
 * @param {string} text
 * @returns {(utf16Index: number) => number}
 */
function byteOffsetMap(text) {
  // byteAt[i] = byte offset of the char starting at UTF-16 unit i;
  // a low surrogate slot carries the same offset as its pair's start+? —
  // tree-sitter never points inside a surrogate pair, so slots between
  // codepoint starts stay unused; we fill them anyway to keep lookup O(1).
  const byteAt = new Uint32Array(text.length + 1);
  let bytes = 0;
  let i = 0;
  while (i < text.length) {
    byteAt[i] = bytes;
    const cp = text.codePointAt(i);
    const units = cp > 0xffff ? 2 : 1;
    if (units === 2) byteAt[i + 1] = bytes; // interior slot, never targeted
    bytes += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    i += units;
  }
  byteAt[text.length] = bytes;
  return (u) => byteAt[u];
}

/**
 * Ground bytes → canonical MemeAst. Deterministic: same bytes, same grammar
 * artifact → identical JSON, identical hash — on EVERY host.
 * @param {Uint8Array} data ground bytes (UTF-8)
 * @param {{language: any, query: any, Parser: any}} artifact a loaded artifact (see loader.mjs)
 * @returns {object} the MemeAst root
 */
export function fold(data, artifact) {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(data);
  const toByte = byteOffsetMap(text);
  const parser = new artifact.Parser();
  parser.setLanguage(artifact.language);
  const tree = parser.parse(text);

  // one flat span list, THEN containment — the fold never walks the CST
  const spans = [];
  for (const { name, node } of artifact.query.captures(tree.rootNode)) {
    spans.push({ kind: name, start: toByte(node.startIndex), end: toByte(node.endIndex) });
  }
  tree.delete();
  parser.delete();
  spans.sort((a, b) => a.start - b.start || b.end - a.end
    || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));

  const root = { kind: "meme.document", start: 0, end: data.length, children: [] };
  const stack = [root];
  for (const s of spans) {
    while (stack.length && !(stack[stack.length - 1].start <= s.start
        && s.end <= stack[stack.length - 1].end)) {
      stack.pop();
    }
    const parent = stack.length ? stack[stack.length - 1] : root;
    const field = FIELD_OF.get(s.kind);
    if (field !== undefined) {
      parent[field] = { kind: s.kind, start: s.start, end: s.end };
      continue;
    }
    const node = { kind: s.kind, start: s.start, end: s.end };
    if (!LEAF_KINDS.has(s.kind)) {
      node.children = [];
      (parent.children ??= []).push(node);
      stack.push(node);
    } else {
      (parent.children ??= []).push(node);
    }
  }
  return root;
}

/**
 * Canonical JSON: keys sorted, no spaces, raw unicode — byte-identical to
 * py's json.dumps(sort_keys=True, separators=(",",":"), ensure_ascii=False).
 * @param {any} value
 * @returns {string}
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** @param {object} ast @returns {string} sha256 hex of the canonical bytes */
export function structuralHash(ast) {
  return createHash("sha256").update(canonicalJson(ast), "utf8").digest("hex");
}
