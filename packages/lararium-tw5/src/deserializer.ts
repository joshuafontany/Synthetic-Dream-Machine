/*\
title: lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/deserializer
type: application/javascript
module-type: tiddlerdeserializer
\*/
/**
 * deserializer — TW5 causal-island boundary module for text/x-memetic-wikitext.
 *
 * Heleuma ba: this TS source compiles to an CJS plugin tiddler at
 * lar:///ha.ka.ba/@lares/v0.1/api/lararium/modules/deserializer
 * (module-type: tiddlerdeserializer, key: text/x-memetic-wikitext).
 *
 * Parsing MUST happen inside the TW5 VM on live clients (FFZ invariant).
 * This file is the causal-island boundary: text/x-memetic-wikitext enters,
 * TiddlerFields[] (parent + ahu-slot children) leave.
 * Non-TW5 adaptation stops at this membrane; decomposition law begins here.
 *
 * Uses parseMemeText() from @lararium/mesh/meme-ast — isomorphic, no TW5 dep.
 *
 * Incoming (disk → wiki):
 *   memeticWikitextDeserializer — TW5 tiddlerdeserializer contract.
 *   Multi-meme: MemeStreamParser batches carrier-close events.
 *   Parent text model: ahu definition blocks → kahea references (children authoritative).
 *
 * Outgoing (wiki → disk):
 *   expandMemeRefs — registered on $tw.lararium; called by sync-adaptor.
 *   Inverts the incoming transform: reads child bodies, reconstructs definition form.
 */

import { PARSE_WARNING_TAG, stableLarUri } from "@lararium/mesh/lar-uris";
import { MemeStreamParser } from "./meme-stream.js";
import type { MemeStreamEvent } from "./meme-stream.js";
import {
  CONTROL_SLOTS,
  findTopLevelAhuBlocks,
  composeSlotPath,
} from "./meme-ast/ahu-scan.js";
import { parseTaploFields } from "./toml-ast.js";
import { getGrammar, resetGrammar } from "./grammar-cache.js";
export type { GrammarRules } from "./meme-ast/types.js";
export { getGrammar, resetGrammar };

export interface TiddlerFields {
  title?: string;
  text?: string;
  tags?: string | string[];
  type?: string;
  created?: string;
  modified?: string;
  creator?: string;
  modifier?: string;
  revision?: string;
  list?: string | string[];
  [field: string]: string | string[] | undefined;
}

// ---------------------------------------------------------------------------
// memeticWikitextDeserializer — the TW5 module export
//
// TW5 registers tiddlerdeserializer modules keyed by content-type.
// The compiled CJS exports: exports["text/x-memetic-wikitext"] = this function.
// ---------------------------------------------------------------------------

export function memeticWikitextDeserializer(
  text:   string,
  fields: Record<string, unknown>,
): TiddlerFields[] {
  const baseUri = String(fields?.["title"] ?? "");
  const result: TiddlerFields[] = [];

  // ✶ Scan — stream parse: handles single-meme, multi-meme, and partials.
  const parser = new MemeStreamParser();
  const events: MemeStreamEvent[] = [...parser.push(text), ...parser.flush()];

  // ⏿ Hold — only carrier-close events produce tiddlers.
  const closes = events.filter((e): e is Extract<MemeStreamEvent, { kind: "carrier-close" }> =>
    e.kind === "carrier-close"
  );

  // ◇ Route — each carrier-close → parseMemeText → split ahu slots → batch.
  // Pre-SOH content (DOCTYPE comment + leading prose) sits OUTSIDE
  // ev.fullText because MemeStreamParser frames on SOH/ETX. Capture
  // everything before the first SOH as `prologue` on the first carrier's
  // parent and everything after the last ETX/EOT as `postamble` on the
  // last carrier's parent. The markdown-meme template re-emits both
  // verbatim. Round-trip law: anything in the operator's source survives.
  // (Multi-meme prologue/postamble distribution between intermediate
  // carriers lands when MemeStreamParser surfaces positional metadata on
  // carrier events.)
  // SOH carrier sentinels begin with `<<~` then optional namespace glyphs
  // (⊙, ॐ ँ, …) then the SOH control-char reference directly — the same
  // shape the namespace extractor below reads. Anchoring on the SOH/SOH2
  // codes avoids matching unrelated `<<~ !DOCTYPE … >>` comments,
  // `<<~ ? -> uri >>` pranala-headers, or later STX/ETX sentinels (the old
  // any-control-char form swallowed the whole header into `prologue` when
  // the SOH carried a namespace it could not see).
  const sohIdx = text.search(/<<~[^&\n]*&#x(?:0001|0011);/);
  const prologue = (closes.length > 0 && sohIdx > 0)
    ? text.slice(0, sohIdx)
    : "";
  // ETX/EOT closer end: walk to find the last close-sentinel and use the
  // position right after its `>>`. Rather than craft a finicky regex for
  // the closing `>>` (which needs to skip past the embedded `;` and any
  // whitespace), search for the SOH-shape match position then walk
  // forward to the next `>>`.
  const etxOpenRe = /<<~(?:\s*⊙)?\s*&#x000[34];/g;
  let lastEtxEnd = -1;
  let etxMatch: RegExpExecArray | null;
  while ((etxMatch = etxOpenRe.exec(text)) !== null) {
    const closeIdx = text.indexOf(">>", etxMatch.index + etxMatch[0].length);
    if (closeIdx >= 0) lastEtxEnd = closeIdx + 2;
  }
  const postamble = (closes.length > 0 && lastEtxEnd >= 0 && lastEtxEnd < text.length)
    ? text.slice(lastEtxEnd)
    : "";
  for (const ev of closes) {
    const uri      = ev.uri || baseUri;
    // MemeStreamParser's fullText extends past the ETX in single-meme
    // files; trim that trailing content so the parent meme's text field
    // doesn't duplicate the postamble already captured separately.
    let memeText = ev.fullText;
    if (postamble.length > 0 && ev === closes[closes.length - 1] && memeText.endsWith(postamble)) {
      memeText = memeText.slice(0, memeText.length - postamble.length);
    }
    const tiddlers = splitMemeToTiddlers(uri, memeText, asStringFields(fields));
    if (prologue.length > 0 && tiddlers.length > 0 && ev === closes[0]) {
      // Copy prologue to ALL tiddlers so the template needs only `has[prologue]`.
      for (const t of tiddlers) t["prologue"] = prologue;
    }
    // Extract namespace prefix glyph(s) from SOH line (e.g. "ॐ ँ", "⊙").
    // Stored only when non-empty; template emits it before the control char.
    const nsM = /^<<~([^&\n]*)&#x(?:0001|0011)/.exec(ev.fullText);
    const namespace = nsM?.[1]?.trim() ?? "";
    if (namespace.length > 0 && tiddlers.length > 0) {
      for (const t of tiddlers) t["namespace"] = namespace;
    }
    // Only store postamble when it has real content (not just trailing whitespace).
    // A whitespace-only postamble (e.g. a single trailing \n after EOT) would be
    // rendered before the ETX marker by the template, producing an extra blank line.
    if (postamble.trim().length > 0 && tiddlers.length > 0 && ev === closes[closes.length - 1]) {
      tiddlers[0]!["postamble"] = postamble;
    }
    result.push(...tiddlers);
  }

  // ⤴ Fallback — no SOH framing: treat entire text as bare meme body.
  if (result.length === 0 && text.trim()) {
    result.push(...splitMemeToTiddlers(baseUri, text, asStringFields(fields)));
  }

  return result;
}

// ---------------------------------------------------------------------------
// splitMemeToTiddlers — parse one meme (SOH→ETX span) into parent + children.
//
// `text` = ev.fullText from MemeStreamParser = SOH line → ETX inclusive.
// On exit: parent.text = body proper only (SOH/iam/STX/ETX stripped).
// Child tiddlers: one per non-control ahu slot; text = slot body proper.
// ---------------------------------------------------------------------------

// Structural marker patterns — strip these from parent text at ingest.
const SOH_LINE_RE = /^<<~(?:[^>]|->)*&#x(?:0001|0011);(?:[^>]|->)*>>\n?/;
const STX_LINE_RE = /<<~(?:[^>]|->)*&#x0002;(?:[^>]|->)*>>\n?/;
const ETX_TAIL_RE = /\n?<<~(?:[^>]|->)*&#x0003;(?:[^>]|->)*>>[\s\S]*$/;

function stripLeadingNewlines(text: string): string {
  return text.replace(/^\n+/, "");
}

function stripEdgeNewlines(text: string): string {
  return text.replace(/^\n+|\n+$/g, "");
}

function parseWarningTitle(uri: string): string {
  const safeSlug = uri.replace(/[^a-zA-Z0-9._-]/g, "_");
  return stableLarUri(`lararium/parse-warning/${safeSlug}`);
}

function splitMemeToTiddlers(
  uri:        string,
  text:       string,
  baseFields: TiddlerFields,
): TiddlerFields[] {
  const warnings: string[] = [];

  // Strip structural markers to isolate header (SOH→STX) and body (STX→ETX).
  const stripped = text
    .replace(SOH_LINE_RE, "")   // remove SOH line
    .replace(ETX_TAIL_RE, "");  // remove ETX and everything after

  const stxM = STX_LINE_RE.exec(stripped);
  const headerRegion = stxM ? stripped.slice(0, stxM.index) : stripped;
  // Trim body edges at ingest. The export template owns the visual padding:
  // one blank line after STX and one blank line before ETX. Keeping the stored
  // field edge-trimmed prevents authored leading/trailing newlines from stacking
  // with those template-emitted margins.
  const bodyRegion   = stripLeadingNewlines(stxM ? stripped.slice(stxM.index + stxM[0].length) : "");

  // Parse iam fields from header region (before STX).
  // Guard: only look for iam in the part of headerRegion before the first
  // top-level ahu block. If the iam fence sits inside a slot body it is a
  // slot-level iam, not a root-level one — extractSlotStructure picks it up
  // when splitRecursive descends into that slot.
  const _rootIamTopBlocks = findTopLevelAhuBlocks(headerRegion);
  const _rootIamCutoff = _rootIamTopBlocks.length > 0
    ? _rootIamTopBlocks[0]!.openStart
    : headerRegion.length;
  const iamPos     = extractRootTomlWithPos(headerRegion.slice(0, _rootIamCutoff));
  const rootToml   = iamPos?.content ?? null;
  const rootFieldsRaw = rootToml ? fieldifyToml(rootToml, warnings, uri) : {};
  const { __arrayKeys: _, ...rootFields } = rootFieldsRaw as TiddlerFields & { __arrayKeys?: string[] };

  // Split header into pre-iam prose and post-iam-pre-STX content.
  // pre-iam: operator prose between SOH and the iam block (e.g. a framing note).
  // post-iam: aka refs, header ahu slots — structure that belongs before STX on disk.
  // When a root iam exists: preIam = prose before iam; postIam = content after iam.
  // When no root iam but top-level ahu blocks exist: route full headerRegion through
  // postIamContent so splitRecursive can find the blocks; preIamContent stays empty.
  // When no root iam and no blocks: preIamContent holds the prose verbatim.
  const preIamContent  = iamPos
    ? headerRegion.slice(0, iamPos.start)
    : (_rootIamTopBlocks.length > 0 ? "" : headerRegion);
  // Strip one leading \n from post-iam content: extractRootTomlWithPos's regex
  // consumes the closing ``` and its \n, but the source's blank line between the
  // iam fence and the next header content (aka/ahu refs) lives here. The template
  // emits \n\n after the closing ```, so the stored field must not also start with \n.
  const postIamContent = iamPos
    ? stripLeadingNewlines(headerRegion.slice(iamPos.end))
    : (_rootIamTopBlocks.length > 0 ? headerRegion : "");

  // Recurse separately so the STX boundary is preserved in the parent's fields:
  //   header-text = post-iam pre-STX content (with ahu blocks → kahea refs)
  //   text        = post-STX body
  const { children: headerChildren, rewrittenText: headerRewritten } =
    splitRecursive(uri, "", postIamContent, warnings);
  const { children: bodyChildren, rewrittenText: bodyRewritten } =
    splitRecursive(uri, "", bodyRegion, warnings);

  const normalizedBodyRewritten = stripEdgeNewlines(bodyRewritten);

  const allChildren = [...headerChildren, ...bodyChildren];

  const parent: TiddlerFields = {
    ...baseFields,
    ...rootFields,
    title: uri,
    type:  "text/x-memetic-wikitext",
    text:  normalizedBodyRewritten,
    ...(preIamContent.trim()   ? { preamble:     preIamContent }   : {}),
    ...(headerRewritten.trim() ? { "header-text": headerRewritten } : {}),
  };

  const result: TiddlerFields[] = [parent, ...allChildren];

  if (warnings.length > 0) {
    result.push({
      title:         parseWarningTitle(uri),
      tags:          PARSE_WARNING_TAG,
      "meme-uri":    uri,
      "warning-count": String(warnings.length),
      text:          warnings.join("\n"),
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// splitRecursive — full-depth ahu walk producing a flat tiddler set.
//
// Each ahu sigil at every depth becomes its own tiddler. The bag stays flat;
// the URI fragment-path (`#parent/child/grandchild`) carries the hierarchy.
// The parent of each tiddler — `fragment-parent` field — points ONE LEVEL up
// (immediate enclosing ahu, not the meme-root), so disk-projector and
// templates can climb to the nearest tagged ancestor in a single hop chain.
// The text returned for each tiddler has its own ahu blocks rewritten to
// `<<~ kahea ahu #slot >>` references; child tiddlers hold the body bytes
// authoritatively.
// ---------------------------------------------------------------------------

function splitRecursive(
  rootUri:          string,
  fragmentPrefix:   string,  // "" at meme root; "#a" → "#a/b" → "#a/b/c"
  text:             string,
  warnings:         string[],
): { children: TiddlerFields[]; rewrittenText: string } {
  const allChildren: TiddlerFields[] = [];
  const enclosingUri = rootUri + fragmentPrefix;
  const blocks = findTopLevelAhuBlocks(text);
  let cursor = 0;
  let rewritten = "";
  for (const block of blocks) {
    rewritten += text.slice(cursor, block.openStart);
    if (CONTROL_SLOTS.has(block.slot)) {
      rewritten += text.slice(block.openStart, block.closeEnd);
      cursor = block.closeEnd;
      continue;
    }
    const childSlotPath = composeSlotPath(fragmentPrefix, block.slot);
    const childUri      = rootUri + childSlotPath;
    const bodyText      = text.slice(block.bodyStart, block.bodyEnd);
    const inner         = splitRecursive(rootUri, childSlotPath, bodyText, warnings);
    const childStructure = extractSlotStructure(inner.rewrittenText, warnings, childUri);

    const childUriPath  = childUri.startsWith("lar:///") ? childUri.slice(7) : childUri;
    // Record hygiene (carrier-whole at rest): children carry NO `file-path` —
    // a fragment record never owns a disk file; its carrier root does. The
    // old `parent/slot.md` stamp encoded the fragment-file law in the record
    // stratum; it burned with hole H1 (2026-06-11).

    allChildren.push({
      ...childStructure.fields,
      title:             childUri,
      type:              "text/x-memetic-wikitext",
      text:              childStructure.text,
      "uri-path":        childUriPath,
      "fragment-parent": enclosingUri,
      slot:              block.slot,
      ...(childStructure.preamble      ? { preamble:    childStructure.preamble }  : {}),
      ...(childStructure.postamble     ? { postamble:   childStructure.postamble } : {}),
    });
    allChildren.push(...inner.children);
    rewritten += `<<~ kahea ahu ${block.slot} >>`;
    cursor = block.closeEnd;
  }
  rewritten += text.slice(cursor);
  return { children: allChildren, rewrittenText: rewritten };
}

// ---------------------------------------------------------------------------
// findIamFence — locate a ```toml iam``` (or plain ```toml```) fence block.
// Used by both header-region and slot-body TOML extraction.
// ---------------------------------------------------------------------------

const IAM_FENCE_RE   = /```toml[ \t]+iam[ \t]*\n([\s\S]*?)```\n?/;
const PLAIN_FENCE_RE = /```toml[ \t]*\n([\s\S]*?)```\n?/;

function findIamFence(text: string, allowPlain = false): { content: string; start: number; end: number } | null {
  const m = IAM_FENCE_RE.exec(text) ?? (allowPlain ? PLAIN_FENCE_RE.exec(text) : null);
  if (!m) return null;
  return { content: m[1] ?? "", start: m.index, end: m.index + m[0].length };
}

function extractRootTomlWithPos(text: string) { return findIamFence(text); }

// ---------------------------------------------------------------------------
// extractSlotStructure — split a slot body into preamble + iam fields + text
// + postamble. Same shape as the disk-version full-meme split, applied to
// every ahu slot so each slot is itself a valid "full published meme MD
// file" projection (operator clarification 2026-05-09).
//
// Convention (operator-confirmed):
//   - preamble = operator prose flanking the iam toml, before the first
//     inner sigil. The iam toml's original position within the preamble
//     is preserved as a `<<~ iam >>` sentinel marker — operators may
//     write prose BEFORE iam, AFTER iam, or BOTH; the marker keeps the
//     bytes recoverable. On emission, the slot template substitutes the
//     marker with the regenerated iam toml block.
//   - fields    = parsed from the iam toml block (operator-authored keys).
//   - text      = body proper — from the first inner kahea ref to the last
//     inner kahea ref end (inclusive of refs for sub-slot reconstruction).
//   - postamble = text AFTER the last inner kahea ref (trailing prose).
//
// When no inner sigils exist:
//   - iam present: preamble holds pre-iam prose + iam marker + post-iam
//     prose; text = "".
//   - no iam:      text = whole body, preamble = "".
// ---------------------------------------------------------------------------

interface SlotStructure {
  readonly preamble:  string;
  readonly fields:    TiddlerFields;
  readonly text:      string;
  readonly postamble: string;
}

function extractSlotStructure(
  bodyText: string,
  warnings: string[],
  context:  string,
): SlotStructure {
  // Only a LABELED ```toml iam fence carries slot identity. A plain ```toml
  // fence is operator CONTENT (teaching matter, config examples) — swallowing
  // it into fields mutated content on round-trip (key reorder, re-alignment,
  // the fence relabeled `toml iam`). Carrier-whole law: content bytes survive
  // whole; allowPlain burned 2026-06-11.
  const iamM = findIamFence(bodyText, false);

  let preamble = "";
  let fields: TiddlerFields = {};
  let remainder = bodyText;

  if (iamM) {
    preamble  = bodyText.slice(0, iamM.start);
    const raw = fieldifyToml(iamM.content, warnings, context);
    const { __arrayKeys: _, ...parsed } = raw as TiddlerFields & { __arrayKeys?: string[] };
    fields    = parsed;
    remainder = bodyText.slice(iamM.end);
  }

  // Find LAST kahea ref — trailing prose becomes postamble.
  const refRe = /<<~\s*kahea\s+ahu\s+#[\w-]+\s*>>/g;
  let lastEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = refRe.exec(remainder)) !== null) {
    lastEnd = m.index + m[0].length;
  }

  let text      = remainder;
  let postamble = "";
  if (lastEnd >= 0 && lastEnd < remainder.length) {
    text      = remainder.slice(0, lastEnd);
    postamble = remainder.slice(lastEnd);
  }

  // No iam, no refs: the whole body is text.
  if (!iamM && lastEnd < 0) {
    text     = bodyText;
    preamble = "";
  }

  return {
    preamble,
    fields,
    text: stripEdgeNewlines(text),
    postamble,
  };
}

// ---------------------------------------------------------------------------
// fieldifyToml — convert raw TOML key=value text into TiddlerFields
// ---------------------------------------------------------------------------

function fieldifyToml(
  toml:     string,
  warnings: string[],
  context:  string,
): TiddlerFields & { __arrayKeys?: string[] } {
  const parsed = parseTaploFields(toml);
  const out: TiddlerFields & { __arrayKeys?: string[] } = {};
  const arrayKeys: string[] = [];
  for (const [k, v] of Object.entries(parsed)) {
    if (k === "title") { warnings.push(`${context}: "title" in TOML ignored (derived from URI)`); continue; }
    if (k === "text")  { warnings.push(`${context}: "text" in TOML ignored (derived from body)`); continue; }
    if (Array.isArray(v)) { out[k] = (v as unknown[]).map(String); arrayKeys.push(k); }
    else                  { out[k] = String(v); }
  }
  if (arrayKeys.length > 0) out.__arrayKeys = arrayKeys;
  return out;
}

// ---------------------------------------------------------------------------
// asStringFields — project unknown-typed baseFields to string values only
// ---------------------------------------------------------------------------

function asStringFields(fields: Record<string, unknown>): TiddlerFields {
  const out: TiddlerFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) out[k] = (v as unknown[]).map(String);
    else                  out[k] = String(v);
  }
  return out;
}

export { memeticWikitextDeserializer as "text/x-memetic-wikitext" };

// ---------------------------------------------------------------------------
// splitBodyTiddler — Path H save-side auto-split
//
// Splits a tiddler's body text at ahu block boundaries without the full
// SOH/STX/ETX envelope processing (which is for disk ingest only).
//
// Used by IslandAdaptor.saveTiddler's "direct" handler when a user saves
// a tiddler whose body contains `<<~ ahu` blocks — symmetric with the disk
// sync path (ONE parser, FOUR call sites law).
//
// Returns:
//   parent   — same tiddler with `text` rewritten (ahu blocks → kahea refs)
//   children — one TiddlerFields per ahu slot, deep-recursed
//
// If no ahu blocks exist in bodyText the function returns { parent: fields,
// children: [] } with no allocation — callers can skip the tombstone scan.
// ---------------------------------------------------------------------------

export function splitBodyTiddler(
  uri:       string,
  bodyText:  string,
  baseFields: TiddlerFields,
): { parent: TiddlerFields; children: TiddlerFields[] } {
  const hasAhu = bodyText.includes("<<~ ahu");
  if (!hasAhu) {
    return { parent: { ...baseFields, title: uri, text: bodyText }, children: [] };
  }

  const warnings: string[] = [];
  const { children, rewrittenText } = splitRecursive(uri, "", bodyText, warnings);

  const parent: TiddlerFields = { ...baseFields, title: uri, text: rewrittenText };

  if (warnings.length > 0) {
    children.push({
      title:          parseWarningTitle(uri),
      tags:           PARSE_WARNING_TAG,
      "meme-uri":     uri,
      "warning-count": String(warnings.length),
      text:           warnings.join("\n"),
    });
  }

  return { parent, children };
}

// ---------------------------------------------------------------------------
// expandMemeRefs — the recompose inverse (wiki → disk)
//
// Doctrine (disk-projection#granularity): every path back to disk MUST route
// through the recompose inverse (`expandMemeRefs` / `exportMemeText`). This
// function inverts the incoming membrane transform above: it reads the
// parent's normalized records, splices each `<<~ kahea ahu #slot >>` marker
// back into its child's full definition form (recursively), and reassembles
// the carrier envelope (prologue · SOH · preamble · iam · header · STX ·
// body · ETX · EOT · postamble).
//
// Canonical-form law (handoff #pattern-integrities §2) binds the output:
//   1. idempotent render — canonical input round-trips byte-identical
//      (sigil spacing `<<~ &#x0002; >>`, one-blank-line block margins);
//   2. framing normalizes once — the iam block re-emits sorted + aligned
//      from fields (authored key order and padding do not survive the
//      record stratum; retaining bytes for them was the H2 path, dead);
//   3. parse∘render ≡ records — proven by the round-trip harness, never
//      by assertion.
//
// Pure function over a fields reader: no I/O, no TW5 dependency — the same
// membrane module owns both directions, so the harness proves the pair.
// ---------------------------------------------------------------------------

export type FieldsReader = (title: string) => TiddlerFields | undefined;

// Mirrors macros/lar-iam-block DENY: runtime/structural fields never re-emit
// into the iam fence — they live in the envelope, the record stratum, or the
// VM, not in the operator's TOML.
const IAM_DENY: ReadonlySet<string> = new Set([
  "title", "text", "type", "tags", "created", "modified", "revision", "bag",
  "slot", "fragment-parent", "preamble", "postamble", "prologue",
  "header-text", "namespace",
  "source-file", "synced-at", "disk-projection", "lar-generated",
  "ahu-parent", "ahu-slot", "realm-origin", "origin-bag",
]);

// Children additionally drop ingest-stamped coordinates: `uri-path` is
// derived from the title, and `file-path` on a child is the burned
// fragment-file leak (carrier-whole at rest — a fragment never owns a file).
const CHILD_IAM_DENY: ReadonlySet<string> = new Set([...IAM_DENY, "uri-path", "file-path"]);

function fmtTomlValue(v: string | string[]): string {
  if (Array.isArray(v)) {
    return "[" + v.map((s) =>
      '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n") + '"'
    ).join(", ") + "]";
  }
  const s = String(v);
  if (/^-?\d+$/.test(s) || s === "true" || s === "false") return s;
  return '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r") + '"';
}

/** Canonical iam TOML: sorted keys, equals-signs aligned to the longest key. */
function emitIamToml(fields: TiddlerFields, deny: ReadonlySet<string>): string {
  const keys = Object.keys(fields).sort().filter((k) => {
    if (deny.has(k) || k.charAt(0) === "$") return false;
    const v = fields[k];
    return !(v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0));
  });
  if (keys.length === 0) return "";
  const pad = Math.max(...keys.map((k) => k.length));
  return keys.map((k) => k.padEnd(pad) + " = " + fmtTomlValue(fields[k] as string | string[])).join("\n") + "\n";
}

const KAHEA_AHU_REF_RE = /<<~\s*kahea\s+ahu\s+(#[\w-]+)\s*>>/g;

/** Splice child definition blocks back over their kahea markers, full depth. */
function expandRefs(reader: FieldsReader, rootUri: string, fragmentPrefix: string, text: string): string {
  return text.replace(KAHEA_AHU_REF_RE, (marker, slot: string) => {
    const slotPath = composeSlotPath(fragmentPrefix, slot);
    const child = reader(rootUri + slotPath);
    if (!child) return marker;   // missing child: keep the marker — honest residue, never invented bytes
    const iam   = emitIamToml(child, CHILD_IAM_DENY);
    const inner = expandRefs(reader, rootUri, slotPath, String(child["text"] ?? ""));
    const pre   = typeof child["preamble"]  === "string" ? child["preamble"]  : "";
    const post  = typeof child["postamble"] === "string" ? child["postamble"] : "";
    const body  = stripEdgeNewlines(
      pre + (iam ? "```toml iam\n" + iam + "```\n\n" : "") + inner + post
    );
    return `<<~ ahu ${slot} >>\n\n${body}\n\n<<~/ahu >>`;
  });
}

/**
 * Recompose one whole carrier from its record group.
 *
 * Returns null when the parent record is absent or not memetic-wikitext —
 * the caller falls back to its own law (exportMemeText returns raw text).
 */
export function expandMemeRefs(reader: FieldsReader, memeUri: string): string | null {
  const f = reader(memeUri);
  if (!f) return null;
  if (f.type !== "text/x-memetic-wikitext") return null;

  const str = (k: string): string => (typeof f[k] === "string" ? (f[k] as string) : "");
  const iam = emitIamToml(f, IAM_DENY);

  let out = str("prologue");
  out += `<<~ ${str("namespace")}&#x0001; ? -> ${memeUri} >>\n`;
  out += str("preamble");
  if (iam) out += "```toml iam\n" + iam + "```\n\n";
  out += expandRefs(reader, memeUri, "", str("header-text"));
  out += "<<~ &#x0002; >>\n\n";
  out += expandRefs(reader, memeUri, "", String(f.text ?? ""));
  out += "\n\n<<~ &#x0003; >>\n\n<<~ &#x0004; -> ? >>\n";
  out += str("postamble");
  return out;
}
