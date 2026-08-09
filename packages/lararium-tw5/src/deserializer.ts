/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/deserializer
type: application/javascript
module-type: tiddlerdeserializer
\*/
/**
 * deserializer — TW5 causal-island boundary module for text/x-memetic-wikitext.
 *
 * Heleuma ba: this TS source compiles to an CJS plugin tiddler at
 * lar:///ha.ka.ba/lararium/tw5/modules/deserializer
 * (module-type: tiddlerdeserializer, key: text/x-memetic-wikitext).
 *
 * Parsing MUST happen inside the TW5 VM on live clients (FFZ invariant).
 * This file is the causal-island boundary: text/x-memetic-wikitext enters,
 * TiddlerFields[] (parent + ahu-slot children) leave.
 * Non-TW5 adaptation stops at this shore; decomposition law begins here.
 *
 * Uses parseMemeText() from @lararium/tw5/meme-ast — isomorphic, no TW5 dep.
 *
 * Incoming (disk → wiki):
 *   memeticWikitextDeserializer — TW5 tiddlerdeserializer contract.
 *   Multi-meme: MemeStreamParser batches carrier-close events.
 *   Parent text model: ahu definition blocks → kahea references (children authoritative).
 *
 * Outgoing (wiki → disk):
 *   expandMemeRefs — registered on $tw.lares by the nalu-engine startup
 *   module (island law: if it CAN happen in the TW5 Wiki VM causal island,
 *   it MUST happen there). Inverts the incoming transform: reads child
 *   bodies, reconstructs the whole definition-form carrier.
 */

import { PARSE_WARNING_TAG, stableLarUri } from "@lararium/mesh/lar-uris";
import { MemeStreamParser } from "./meme-stream.js";
import type { MemeStreamEvent } from "./meme-stream.js";
import {
  CONTROL_SLOTS,
  findTopLevelAhuBlocks,
  composeSlotPath,
} from "./meme-ast/ahu-scan.js";
import { fencedSpans, inMask, maskedExec, maskedExecAll } from "./meme-ast/fence-mask.js";
// The fence-mask law surfaces through the shore: consumers (tests, the
// projector layer) read quoted-sigil semantics from HERE, never from
// meme-ast internals (vm-grammar-boundary law).
export { fencedSpans, inMask, maskedExec, maskedExecAll } from "./meme-ast/fence-mask.js";
import { parseTaploFields } from "./toml-ast.js";
import { shoreDiagnostic } from "./meme-ast/diagnostics.js";
import type { MemeDiagnostic } from "./meme-ast/diagnostics.js";
import { getGrammar, resetGrammar } from "./grammar-cache.js";
import { parseMemeText } from "./meme-ast/parse.js";
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
  // Carrier-bytes law (spec #carrier-bytes): carriers rest as UTF-8, LF, no
  // BOM. The boundary normalizes foreign line endings and a leading BOM at
  // ingest — once, here, so every stratum downstream sees one byte law.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.includes("\r")) text = text.replace(/\r\n?/g, "\n");
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
  // last carrier's parent. The recompose inverse (`expandMemeRefs` /
  // `exportMemeText`) re-emits both verbatim. Round-trip law: anything in
  // the operator's source survives.
  // (Multi-meme prologue/postamble distribution between intermediate
  // carriers lands when MemeStreamParser surfaces positional metadata on
  // carrier events.)
  // SOH carrier sentinels begin with `<<^` then optional namespace glyphs
  // (⊙, ॐ ँ, …) then the SOH control-char reference directly — the same
  // shape the namespace extractor below reads. Anchoring on the SOH/SOH2
  // codes avoids matching unrelated `<<~ !DOCTYPE … >>` comments,
  // `<<~ ? -> uri >>` pranala-headers, or later STX/ETX sentinels (the old
  // any-control-char form swallowed the whole header into `prologue` when
  // the SOH carried a namespace it could not see).
  const sohM = maskedExec(text, /<<\^[^&\n]*&#x(?:0001|0011);/);
  const sohIdx = sohM ? sohM.index : -1;
  const prologue = (closes.length > 0 && sohIdx > 0)
    ? text.slice(0, sohIdx)
    : "";
  // ETX/EOT closer end: walk to find the last close-sentinel and use the
  // position right after its `>>`. Rather than craft a finicky regex for
  // the closing `>>` (which needs to skip past the embedded `;` and any
  // whitespace), search for the SOH-shape match position then walk
  // forward to the next `>>`.
  const etxOpenRe = /<<\^(?:\s*⊙)?\s*&#x000[34];/g;
  let lastEtxEnd = -1;
  for (const etxMatch of maskedExecAll(text, etxOpenRe)) {
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
    const tiddlers = safeSplitMeme(uri, memeText, asStringFields(fields));
    if (prologue.length > 0 && tiddlers.length > 0 && ev === closes[0]) {
      // Copy prologue to ALL tiddlers so the template needs only `has[prologue]`.
      for (const t of tiddlers) t["prologue"] = prologue;
    }
    // Extract namespace prefix glyph(s) from SOH line (e.g. "ॐ ँ", "⊙").
    // Stored only when non-empty; template emits it before the control char.
    // The Kapu SOH variant (&#x0011; DC1) carries its own semantics — the
    // code survives on the parent as `carrier-soh`, never normalized away.
    const nsM = /^<<\^([^&\n]*)&#x(0001|0011)/.exec(ev.fullText);
    const namespace = nsM?.[1]?.trim() ?? "";
    if (namespace.length > 0 && tiddlers.length > 0) {
      for (const t of tiddlers) t["namespace"] = namespace;
    }
    if (nsM?.[2] === "0011" && tiddlers.length > 0) {
      tiddlers[0]!["carrier-soh"] = "0011";
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
    result.push(...safeSplitMeme(baseUri, text, asStringFields(fields)));
  }

  return result;
}

// ---------------------------------------------------------------------------
// safeSplitMeme — LOSS-LESS split (Goal B): the gradient guards the write path.
//
// A split failure NEVER truncates — it falls back to the verbatim whole, flagged (drop-honesty): one
// un-split tiddler holding every byte beats a silent truncation. parseMemeText (full grammar) records
// the parse grade as `lar_parse_failures` so a meme written via CLI/import surfaces its degradation
// instead of failing quietly. AI-session turns arrive bare (no carrier sigils) and ride this via the
// no-SOH fallback — they split clean (no ahu → verbatim parent) or, if malformed, degrade legibly.
// ---------------------------------------------------------------------------

function safeSplitMeme(uri: string, text: string, fields: TiddlerFields): TiddlerFields[] {
  let tiddlers: TiddlerFields[];
  try {
    tiddlers = splitMemeToTiddlers(uri, text, fields);
  } catch (err) {
    console.warn(`[memetic-deserializer] split failed for ${uri} — verbatim fallback (drop-honesty): ${err instanceof Error ? err.message : String(err)}`);
    tiddlers = [{ ...fields, title: uri, text, lar_parse_degraded: "1" } as TiddlerFields];
  }
  try {
    const failures = parseMemeText(uri, text, getGrammar() ?? undefined).failures.length;
    if (failures > 0 && tiddlers[0]) tiddlers[0]["lar_parse_failures"] = String(failures);
  } catch { /* gradient validation is best-effort (no wiki/grammar in scope) */ }
  return tiddlers;
}

// ---------------------------------------------------------------------------
// splitMemeToTiddlers — parse one meme (SOH→ETX span) into parent + children.
//
// `text` = ev.fullText from MemeStreamParser = SOH line → ETX inclusive.
// On exit: parent.text = body proper only (SOH/iam/STX/ETX stripped).
// Child tiddlers: one per non-control ahu slot; text = slot body proper.
// ---------------------------------------------------------------------------

// Structural marker patterns — strip these from parent text at ingest.
// Control sigils live on ONE line by law — `[^>\n]` keeps the scan from
// crossing lines (a greedy multi-line match once swallowed from a quoted
// `<<~` mention down to the real closer; found on loci.md).
const SOH_LINE_RE = /^<<\^(?:[^>\n]|->)*&#x(?:0001|0011);(?:[^>\n]|->)*>>\n?/;
const STX_LINE_RE = /<<\^(?:[^>\n]|->)*&#x0002;(?:[^>\n]|->)*>>\n?/;

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
  // Fence-mask law: a QUOTED control sigil (in a code fence or inline code)
  // never frames the carrier — before the mask, a fenced ETX mention
  // truncated everything after it (real corpus loss).
  const hadSoh = SOH_LINE_RE.test(text);
  const noSoh = text.replace(SOH_LINE_RE, "");   // anchored at 0 — never fenced
  const etxM = maskedExec(noSoh, /\n?<<\^(?:[^>\n]|->)*&#x0003;(?:[^>\n]|->)*>>/);
  const stripped = etxM ? noSoh.slice(0, etxM.index) : noSoh;
  // Degraded-carrier surfacing: a closer swallowed by an UNCLOSED fence
  // tail would ride into the body as CONTENT — and every render would
  // append a fresh closer pair, doubling without bound. This shows up
  // on fence-teaching docs CommonMark itself misread. A closer
  // inside a properly CLOSED fence reads as deliberate quotation — benign,
  // no warning (the render adds the structural close lawfully).
  if (!etxM && /&#x0003;/.test(noSoh)) {
    const spans = fencedSpans(noSoh);
    const openTail = spans.length > 0 && spans[spans.length - 1]!.end === noSoh.length
      ? spans[spans.length - 1]! : null;
    let swallowed = false;
    if (openTail) {
      const g = /&#x0003;/g; let m: RegExpExecArray | null;
      while ((m = g.exec(noSoh)) !== null) {
        if (m.index >= openTail.start) { swallowed = true; break; }
      }
    }
    if (swallowed) {
      warnings.push(
        `${uri}: carrier close (&#x0003;) sits inside an UNCLOSED code fence — ` +
        `closers will double on every round trip. Check fence balance ` +
        `(quote fences inside fences with a LONGER outer run).`,
      );
    }
  }

  const stxM = maskedExec(stripped, STX_LINE_RE);
  // A fully BARE doc (no SOH, no STX — the no-carrier fallback) reads as ALL BODY:
  // its content belongs between the minted &#x0002;/&#x0003; markers on recompose
  // (the header-routed wrap left the body slot empty
  // and stacked blank lines). A degraded SOH-carrier missing its STX keeps the
  // header reading (its iam still parses; the gradient grades the miss).
  const bare = !hadSoh && !stxM;
  const headerRegion = stxM ? stripped.slice(0, stxM.index) : (bare ? "" : stripped);
  // Trim body edges at ingest. The export template owns the visual padding:
  // one blank line after STX and one blank line before ETX. Keeping the stored
  // field edge-trimmed prevents authored leading/trailing newlines from stacking
  // with those template-emitted margins.
  const bodyRegion   = stripLeadingNewlines(stxM ? stripped.slice(stxM.index + stxM[0].length) : (bare ? stripped : ""));

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
    // a fragment record never owns a disk file; its carrier root does.

    allChildren.push({
      // Default dialect; a child slot's OWN declared iam `type` (e.g. text/markdown) rides in
      // childStructure.fields and OVERRIDES this default via the spread — a typed child keeps its
      // type instead of losing it to the memetic-wikitext hardcode. (The parent carrier stays
      // memetic by construction — this deserializer runs because the carrier IS memetic.)
      type:              "text/x-memetic-wikitext",
      ...childStructure.fields,
      title:             childUri,
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
  // The iam fence IS a fence — accept a match starting AT a span opener,
  // reject one buried inside another span (a ````-quoted teaching example).
  const m = maskedExec(text, IAM_FENCE_RE, undefined, true)
    ?? (allowPlain ? maskedExec(text, PLAIN_FENCE_RE, undefined, true) : null);
  if (!m) return null;
  return { content: m[1] ?? "", start: m.index, end: m.index + m[0].length };
}

function extractRootTomlWithPos(text: string) { return findIamFence(text); }

// ---------------------------------------------------------------------------
// extractSlotStructure — split a slot body into preamble + iam fields + text
// + postamble. Same shape as the disk-version full-meme split, applied to
// every ahu slot so each slot is itself a valid "full published meme MD
// file" projection.
//
// Convention:
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
  // whole.
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

  // Find LAST kahea ref — trailing prose becomes postamble. Quoted refs
  // (fenced/inline-code) stay content, never structure (fence-mask law).
  // The slot grammar mirrors AHU_OPEN_RE: a slash-path slot (`#a/b/c`)
  // addresses a nested fragment and MUST round-trip whole — a `#[\w-]+`-only
  // match clipped the path at the first `/`, orphaning the slot's body.
  const refRe = /<<~\s*kahea\s+ahu\s+#[\w-]+(?:\/[\w-]+)*\s*>>/g;
  let lastEnd = -1;
  for (const m of maskedExecAll(remainder, refRe)) {
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
// function inverts the incoming shore transform above: it reads the
// parent's normalized records, splices each `<<~ kahea ahu #slot >>` marker
// back into its child's full definition form (recursively), and reassembles
// the carrier envelope (prologue · SOH · preamble · iam · header · STX ·
// body · ETX · EOT · postamble).
//
// Canonical-form law (handoff #pattern-integrities §2) binds the output:
//   1. idempotent render — canonical input round-trips byte-identical
//      (sigil spacing `<<^ &#x0002; >>`, one-blank-line block margins);
//   2. framing normalizes once — the iam block re-emits sorted + aligned
//      from fields (authored key order and padding do not survive the
//      record stratum; retaining bytes for them was the H2 path, dead);
//   3. parse∘render ≡ records — proven by the round-trip harness, never
//      by assertion.
//
// Pure function over a fields reader: no I/O, no TW5 dependency — the same
// shore module owns both directions, so the harness proves the pair.
// ---------------------------------------------------------------------------

export type FieldsReader = (title: string) => TiddlerFields | undefined;

// The single deny-set: STRUCTURAL / ENVELOPE fields never re-emit into the iam
// fence — they rebuild from the envelope + record stratum on recompose, so
// emitting them into the TOML DOUBLES the body (title/text) or the framing.
//
// Telemetry-fence supersession (operator overrule 2026-07-20, supersedes ruling
// 16f4b271): sensorium/worldline telemetry routes through Py on capture, and a
// sensorium→wiki pull MUST carry ALL its metadata. So `lar_*` sensorium fields
// (`lar_agent_handle`, `lar_ffz`, `lar_root_handle`, …) round-trip WHOLE — the
// blanket `lar_` prefix-strip is gone. Only two `lar_*` markers stay denied by
// EXACT name: the transient parse-grade diagnostics `lar_parse_failures` /
// `lar_parse_degraded`, which `parseMemeText`/`safeSplitMeme` stamp on ingest to
// surface degradation — derived-on-read diagnostics, never authored metadata,
// so they stay off the operator's TOML (map never fuses to territory).
const IAM_DENY: ReadonlySet<string> = new Set([
  // envelope + record stratum — reconstructed on recompose, never authored TOML
  "title", "text", "modified", "revision", "bag",
  "slot", "fragment-parent", "preamble", "postamble", "prologue",
  "header-text", "ahu-parent", "ahu-slot", "carrier-soh",
  // transient parse-grade diagnostics — stamped on ingest, denied by exact name
  "lar_parse_failures", "lar_parse_degraded",
]);
// Authored-identity resurrections: the deny-set
// holds MACHINE stamps only. `type` re-emits verbatim — the carrier
// self-describes its dialect at rest (TW5's content-type field shares the
// name exactly; round trip = identity). `namespace` re-emits as explicit
// Unicode escapes — glyphs render on the SOH line, the TOML lists their
// codepoints. `created` re-emits because 11 corpus carriers author it as a
// human date and the LOAD→project path stamps it nowhere (a future
// wiki-edit stamping created would surface in the projection diff — the
// operator's signature surface — not silently). `source-file` re-emits
// for the same reason: 71 doc memes author it to name the TS source they
// document; the shore path stamps it nowhere.

// Children additionally drop ingest-stamped coordinates: `uri-path` is
// derived from the title, and `file-path` on a child is the burned
// fragment-file leak (carrier-whole at rest — a fragment never owns a file).
// Everything ELSE the author wrote re-emits verbatim (deny holds MACHINE
// stamps only): `type` self-describes the child's dialect, `namespace`,
// `created`, `source-file`, `tags` all round-trip = identity, exactly as on
// the parent — a child that authored them keeps them.
const CHILD_IAM_DENY: ReadonlySet<string> = new Set([
  ...IAM_DENY, "uri-path", "file-path",
]);

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

/**
 * The namespace's canonical iam form: every non-ASCII codepoint as an
 * HTML-entity hexcode — the same idiom the carrier's control sigils speak
 * (`&#x0950;` beside `&#x0004;`). The glyphs render on the SOH line; the
 * TOML lists their codes. The SOH extraction holds field authority at
 * parse (glyphs), so the entity string re-derives stably each render.
 */
function fmtNamespaceEntities(v: string): string {
  let out = '"';
  for (const ch of String(v)) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === '"') out += '\\"';
    else if (cp >= 0x20 && cp < 0x7f) out += ch;
    else out += "&#x" + cp.toString(16).toUpperCase().padStart(4, "0") + ";";
  }
  return out + '"';
}

/** Canonical iam TOML: sorted keys, equals-signs aligned to the longest key.
 *  `lar_*` sensorium/worldline metadata re-emits WHOLE (telemetry-fence
 *  supersession, 2026-07-20 — see IAM_DENY); the deny-set names the only
 *  denials by exact key (structural/envelope + the two parse-grade markers).
 *  TW5-internal `$…` fields stay off the operator's TOML. */
/** Field-value equality across the string | string[] carrier shapes (undefined never matches). */
function sameFieldValue(a: TiddlerFields[string] | undefined, b: TiddlerFields[string] | undefined): boolean {
  if (a === undefined || b === undefined) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    const aa = Array.isArray(a) ? a : [a];
    const bb = Array.isArray(b) ? b : [b];
    return aa.length === bb.length && aa.every((x, i) => x === bb[i]);
  }
  return a === b;
}

// `parentFields`, when present, drives child INHERITANCE: a child writes a field ONLY when it
// DIFFERS from the parent's (or the parent lacks it). A field that matches the parent floats down
// silently — the author sees it once, at the level that set it, never re-stamped on every fragment.
function emitIamToml(fields: TiddlerFields, deny: ReadonlySet<string>, parentFields?: TiddlerFields): string {
  const keys = Object.keys(fields).sort().filter((k) => {
    if (deny.has(k) || k.charAt(0) === "$") return false;
    const v = fields[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return false;
    // Inherited-and-matching → skip (write only what the child changes from its parent).
    if (parentFields && sameFieldValue(v, parentFields[k])) return false;
    return true;
  });
  if (keys.length === 0) return "";
  const pad = Math.max(...keys.map((k) => k.length));
  return keys.map((k) => {
    const v = fields[k] as string | string[];
    const rendered = k === "namespace" && typeof v === "string"
      ? fmtNamespaceEntities(v)
      : fmtTomlValue(v);
    return k.padEnd(pad) + " = " + rendered;
  }).join("\n") + "\n";
}

// The captured slot mirrors AHU_OPEN_RE's grammar, slash-path included — a
// `#a/b` slot addresses a nested fragment; a `#[\w-]+`-only capture stopped at
// the first `/`, so the ref never matched its child and the whole slot body
// dropped from the render (the ahu-drop). The path re-composes verbatim below.
const KAHEA_AHU_REF_RE = /<<~\s*kahea\s+ahu\s+(#[\w-]+(?:\/[\w-]+)*)\s*>>/g;

/**
 * Splice child definition blocks back over their kahea markers, full depth.
 * Quoted markers (fenced/inline-code) stay verbatim — the operator SHOWS
 * the grammar there, the recompose never expands inside the mask.
 */
function expandRefs(reader: FieldsReader, rootUri: string, fragmentPrefix: string, text: string, parentFields: TiddlerFields): string {
  const mask = fencedSpans(text);
  return text.replace(KAHEA_AHU_REF_RE, (marker, slot: string, offset: number) => {
    if (inMask(mask, offset)) return marker;
    const slotPath = composeSlotPath(fragmentPrefix, slot);
    const child = reader(rootUri + slotPath);
    if (!child) return marker;   // missing child: keep the marker — honest residue, never invented bytes
    // Diff the child against ITS parent; recurse with the child as the next level's parent.
    const iam   = emitIamToml(child, CHILD_IAM_DENY, parentFields);
    const inner = expandRefs(reader, rootUri, slotPath, String(child["text"] ?? ""), child);
    const pre   = typeof child["preamble"]  === "string" ? child["preamble"]  : "";
    const post  = typeof child["postamble"] === "string" ? child["postamble"] : "";
    // The iam block sits FLUSH against the ahu sigil line (mirroring the parent carrier's SOH+iam) —
    // a single newline, no blank between. A blank line then separates any content below. A preamble
    // (rare) keeps the older sigil-then-blank spacing since content precedes the iam there.
    const iamBlock = iam ? "```toml iam\n" + iam + "```" : "";
    const rest     = stripEdgeNewlines(inner + post);
    // A whitespace-only preamble (`"\n\n"`) carries no content — treat it as none so the iam
    // still hugs the sigil line. Only REAL preamble content routes to the sigil-then-blank form.
    const hasPre   = pre.trim() !== "";
    let opened: string;
    if (hasPre) {
      opened = `\n\n${stripEdgeNewlines(pre + (iamBlock ? "\n\n" + iamBlock : "") + (rest ? "\n\n" + rest : ""))}`;
    } else if (iamBlock) {
      opened = `\n${iamBlock}${rest ? "\n\n" + rest : ""}`;
    } else {
      // An empty child carries no body — leave `opened` bare so the fixed closer supplies
      // the single blank line; a filled one opens on the sigil-then-blank spacing.
      opened = rest ? `\n\n${rest}` : "";
    }
    return `<<~ ahu ${slot} >>${opened}\n\n<<~/ahu >>`;
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
  const sohCode = f["carrier-soh"] === "0011" ? "&#x0011;" : "&#x0001;";

  let out = str("prologue");
  out += `<<^ ${str("namespace")}${sohCode} ? -> ${memeUri} >>\n`;
  out += str("preamble");
  if (iam) out += "```toml iam\n" + iam + "```\n\n";
  out += expandRefs(reader, memeUri, "", str("header-text"), f);
  out += "<<^ &#x0002; >>\n\n";
  out += expandRefs(reader, memeUri, "", String(f.text ?? ""), f);
  out += "\n\n<<^ &#x0003; >>\n\n<<^ &#x0004; -> ? >>\n";
  // The EOT→postamble shore normalizes to a stable fixed point: the EOT line
  // already ends with one newline; a postamble's own leading newlines would
  // stack a fresh blank line every round trip (found on the Kapu &#x0014;
  // trailing closer).
  out += stripLeadingNewlines(str("postamble"));
  return out;
}

// ---------------------------------------------------------------------------
// The shore's receipt, on the shared channel
// ---------------------------------------------------------------------------

/**
 * The deserializer reports a fault on the same diagnostics contract the parser and the render plane
 * already speak, so the gate reads a grade rather than a title. It also synthesises a `parse-warning`
 * tiddler for the live wiki to surface, but nothing downstream recognises the fault by that title —
 * the diagnostics carry the grade, freeing every consumer from sniffing a string for carrier survival.
 */
export function deserializeCarrier(
  text:   string,
  fields: Record<string, unknown>,
): { records: TiddlerFields[]; diagnostics: MemeDiagnostic[] } {
  const records = memeticWikitextDeserializer(text, fields);
  const diagnostics: MemeDiagnostic[] = [];
  for (const record of records) {
    if (!String(record.title ?? "").includes("/parse-warning/")) continue;
    for (const line of String(record.text ?? "").split("\n")) {
      if (line.trim()) diagnostics.push(shoreDiagnostic(line.trim(), text.length));
    }
  }
  return { records, diagnostics };
}
