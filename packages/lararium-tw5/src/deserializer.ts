/*\
title: lar:///ha.ka.ba/lararium/tw5/modules/deserializer
type: application/javascript
module-type: tiddlerdeserializer
\*/
/**
 * deserializer — TW5 causal-island boundary module for text/memetic-wikitext+tiddlywiki.
 *
 * Heleuma ba: this TS source compiles to an CJS plugin tiddler at
 * lar:///ha.ka.ba/lararium/tw5/modules/deserializer
 * (module-type: tiddlerdeserializer, key: text/memetic-wikitext+tiddlywiki).
 *
 * Parsing MUST happen inside the TW5 VM on live clients (FFZ invariant).
 * This file is the causal-island boundary: text/memetic-wikitext+tiddlywiki enters,
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
import { frameMark, FRAME_MARKS } from "./frame-marks.js";

/** name -> code, so the emitter names a mark rather than spelling its entity. */
const FRAME_BY_NAME: Record<string, string> =
  Object.fromEntries(FRAME_MARKS.map((m) => [m.name, m.code]));
// The fence-mask law surfaces through the shore: consumers (tests, the
// projector layer) read quoted-sigil semantics from HERE, never from
// meme-ast internals (vm-grammar-boundary law).
export { fencedSpans, inMask, maskedExec, maskedExecAll } from "./meme-ast/fence-mask.js";
import { parseTaploFields } from "./toml-ast.js";
import { shoreDiagnostic } from "./meme-ast/diagnostics.js";
import { classifyPostamble } from "./block-check.js";
import { bccOfSpan } from "./carrier-check.js";
import { CARRIER_TYPE, CARRIER_TYPES, isCarrierType } from "@lararium/mesh/carrier-type";

/** The one declaration a carrier opens on: this grammar, at the address that specifies it. */
const DECLARATION =
  "<<!DOCTYPE memetic-wikitext+tiddlywiki lar:///ha.ka.ba/lares/api/pono/memetic-wikitext>>";
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
// The compiled CJS exports: exports["<type>"] = this function, once per spelling. TW5 keys deserializer
// modules by type string, so a carrier stored under the unsuffixed name needs its own export or the
// file reads as plain text and yields no records at all.
// ---------------------------------------------------------------------------

export function memeticWikitextDeserializer(
  text:   string,
  fields: Record<string, unknown>,
): TiddlerFields[] {
  // Carrier-bytes law (memetic-wikitext-framing #carrier-bytes): carriers rest as UTF-8, LF, no
  // BOM. The boundary normalizes foreign line endings and a leading BOM at
  // ingest — once, here, so every stratum downstream sees one byte law.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.includes("\r")) text = text.replace(/\r\n?/g, "\n");
  const baseUri = String(fields?.["title"] ?? "");
  const result: TiddlerFields[] = [];
  // The file-level carriage — the prologue above the head and the bytes past the frame — hangs on the
  // FIRST and LAST carrier respectively, so it is gathered here and joined once every close is read.
  const carriage: TiddlerFields[] = [];

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
  // codes avoids matching unrelated `<<~ !DOCTYPE …>>` comments,
  // a speaking-head sigil, or later STX/ETX sentinels — an
  // any-control-char form swallows the whole header into `prologue` whenever
  // the SOH carries a namespace it cannot see.
  const sohM = maskedExec(text, /<<\^[^&\n]*&#x(?:0001|0011);/);
  const sohIdx = sohM ? sohM.index : -1;
  // THE FRAME OWNS THE DECLARATION; the field keeps only what stands BEYOND it. `prologue` predates the
  // declaration existing as a register, so it stored a line the emitter now mints — 4,015 copies of it
  // across the corpus, because the field is copied onto every record of a carrier.
  //
  // Stripping it here retires the mint-suppression below with it: a check that existed only to avoid
  // doubling what this field stored.
  const prologueRaw = (closes.length > 0 && sohIdx > 0) ? text.slice(0, sohIdx) : "";
  const prologue = prologueRaw.replace(/^<<!DOCTYPE[^>\n]*>>\n?\n?/m, "");
  // ETX/EOT closer end: walk to find the last close-sentinel and use the
  // position right after its `>>`. Rather than craft a finicky regex for
  // the closing `>>` (which needs to skip past the embedded `;` and any
  // whitespace), search for the SOH-shape match position then walk
  // forward to the next `>>`.
  // ETX AND EOT ARE DIFFERENT GLYPHS AND MUST BE SCANNED APART. One pattern for `&#x000[34]` takes
  // the LAST match, which is the EOT — so `lastEtxEnd` landed past the end of transmission and the
  // slot between ETX and EOT was never looked at. Content stranded there stayed inside the meme text
  // and disappeared in the render, silently: that is how two `#edges` blocks were lost.
  const closeEnd = (m: { index: number; 0: string }): number => {
    const idx = text.indexOf(">>", m.index + m[0].length);
    return idx >= 0 ? idx + 2 : -1;
  };
  let lastEtxEnd = -1;
  for (const etxMatch of maskedExecAll(text, /<<\^(?:\s*\S+)?\s*&#x0003;/g)) {
    const end = closeEnd(etxMatch);
    if (end >= 0) lastEtxEnd = end;
  }
  let eotStart = -1;
  for (const eotMatch of maskedExecAll(text, /<<\^(?:\s*\S+)?\s*&#x0004;/g)) {
    if (lastEtxEnd >= 0 && eotMatch.index >= lastEtxEnd) { eotStart = eotMatch.index; break; }
  }
  // THE SLOT: what the carrier wrote between end-of-text and end-of-transmission.
  const slotText = (lastEtxEnd >= 0 && eotStart > lastEtxEnd) ? text.slice(lastEtxEnd, eotStart) : "";
  // Past EOT there stands only the frame's own trailing newline; that tail reads to end of text.
  if (eotStart >= 0) {
    const eotEnd = text.indexOf(">>", eotStart);
    if (eotEnd >= 0) lastEtxEnd = eotEnd + 2;
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
      // ONE RECORD, NOT A COPY PER TIDDLER. The prologue belongs to the carrier, and stamping it on
      // every record of that carrier put 4,015 copies of one string in the corpus.
      carriage.push(...carriageRecord(String(tiddlers[0]!["title"]), "prologue", prologue));
    }
    // Extract namespace prefix glyph(s) from SOH line (e.g. "ॐ ँ", "⊙").
    // Stored only when non-empty; template emits it before the control char.
    // The Kapu SOH variant (&#x0011; DC1) carries its own semantics — the
    // code survives on the parent as `carrier-soh`, never normalized away.
    // A NAMED PARAM WINS OVER THE BARE PREFIX, and the order matters more than it looks. The bare form
    // takes everything between the head and the control entity as the namespace, which reads correctly
    // only while nothing else stands there. Put one named param in front of the entity and an unfenced
    // prefix scan returns `code=` as a namespace: no throw, no diagnostic, a wrong glyph carried into
    // every render and every re-emission — the quietest way this frame has ever broken.
    //
    // SO THE BARE SCAN STOPS AT A BINDING MARK. Its class excludes them, and that exclusion is the
    // whole guard: a namespace is glyphs, and a glyph is never a mark that binds. This reader breaks
    // FIRST and SILENTLY under any change to the frame's spelling, so the class is the line to check
    // whenever the frame's binding changes.
    const nsParam = /^<<[~^][^>\n]*?\bnamespace=\s*"([^"]*)"/.exec(ev.fullText);
    const nsBare  = /^<<\^([^&:=\n]*)&#x(0001|0011)/.exec(ev.fullText);
    // The heading variant rides its own capture: a `code=` param names it, else the bare entity does.
    const sohCode = /^<<\^[^>\n]*?\bcode=\s*"&#x(0001|0011);"/.exec(ev.fullText)?.[1]
      ?? nsBare?.[2];
    const namespace = (nsParam?.[1] ?? nsBare?.[1] ?? "").trim();
    if (namespace.length > 0 && tiddlers.length > 0) {
      for (const t of tiddlers) t["namespace"] = namespace;
    }
    if (sohCode === "0011" && tiddlers.length > 0) {
      tiddlers[0]!["$carrier-soh"] = "0011";
    }
    // WHICH SPELLING OPENED THE SECTIONS — the carrier's own, kept so the render hands it back.
    // A plain-dialect carrier opens `<<fragment #slot>>`; the sharktooth house opens `<<~ ahu #slot>>`.
    // Both scan as structure (ahu-scan), and a projection that emitted one spelling for both would
    // rewrite a carrier into a namespace its reader never stepped into.
    if (tiddlers.length > 0 && /<<fragment\s+#/.test(text) && !/<<~[^>\n]*\bahu\s+#/.test(text)) {
      tiddlers[0]!["$carrier-dialect"] = "fragment";
    }
    // WHAT MAY STAND BETWEEN ETX AND EOT — the BCC, and nothing else.
    //
    // ETX ends the text; the slot after it carries the block check, never payload (block-check.ts
    // holds the why). A carrier that wrote prose there lost it: the render never reproduced it, and
    // nothing said so. Two `#edges` blocks vanished that way before anyone diffed a round-trip.
    //
    // So the slot gets classified rather than stored blind. A block check survives as the trailer it
    // is; foreign content raises an ERROR the gate refuses on, which is the NAK the original protocol
    // would have answered with.
    if ((postamble.trim().length > 0 || slotText.trim().length > 0)
        && tiddlers.length > 0 && ev === closes[closes.length - 1]) {
      // A block check needs no record: the emitter mints one over every framed body, so an arriving
      // check is a fact already true of the bytes and nothing has to remember that it stood.
      const slot = classifyPostamble(slotText);
      if (slot.kind === "foreign") {
        tiddlers[0]!["$postamble-foreign"] = String(slot.lines);
      }
      // The raw slot rides on regardless, so a refusal can still show the operator their own bytes.
      carriage.push(...carriageRecord(String(tiddlers[0]!["title"]), "postamble", postamble));
    }
    result.push(...tiddlers);
  }

  // ⤴ Fallback — no SOH framing: treat entire text as bare meme body.
  if (result.length === 0 && text.trim()) {
    result.push(...safeSplitMeme(baseUri, text, asStringFields(fields)));
  }

  result.push(...carriage);
  return result;
}

// ---------------------------------------------------------------------------
// safeSplitMeme — LOSS-LESS split (Goal B): the gradient guards the write path.
//
// A split failure NEVER truncates — it falls back to the verbatim whole, flagged (drop-honesty): one
// un-split tiddler holding every byte beats a silent truncation. The grammar's own recovery count
// joins the advisory envelope where one stands (below), so a degraded parse reaches a person at the
// address they already query. AI-session turns arrive bare (no carrier sigils) and ride this via the
// no-SOH fallback — they split clean (no ahu → verbatim parent) or, if malformed, degrade legibly.
// ---------------------------------------------------------------------------

function safeSplitMeme(uri: string, text: string, fields: TiddlerFields): TiddlerFields[] {
  let tiddlers: TiddlerFields[];
  try {
    tiddlers = splitMemeToTiddlers(uri, text, fields);
  } catch (err) {
    console.warn(`[memetic-deserializer] split failed for ${uri} — verbatim fallback (drop-honesty): ${err instanceof Error ? err.message : String(err)}`);
    tiddlers = [{ ...fields, title: uri, text } as TiddlerFields];
  }
  let failures = 0;
  try {
    failures = parseMemeText(uri, text, getGrammar() ?? undefined).failures.length;
  } catch { /* gradient validation is best-effort (no wiki/grammar in scope) */ }

  // ── SURFACE THE CHOICE; DO NOT COVER THE EDGE ───────────────────────────────────────────────────
  //
  // The carrier frame is the one place in this grammar where failing on a gradient has repeatedly
  // snarled, and the reason is always the same: an edge case invites code that DECIDES for the
  // operator. Deciding needs coverage, coverage needs maintenance, and every rule added to cover an
  // edge becomes a rule someone must later discover before they can trust the result.
  //
  // So the standing preference: where a carrier reads ambiguously, SURFACE THE CONFLICT to the human
  // who can settle it rather than resolve it quietly. It is the same law the house stands at the
  // talk-story layer — auto-arbitration is anti-pono — arriving one altitude down, at a parse.
  //
  // This function honours it by ADDING NOTHING. The splitter raises an envelope where it has something
  // to tell a person, and the grammar's count joins that envelope where one stands. Where the splitter
  // found nothing worth a person's attention, this reader mints no record to say so: a carrier that
  // parsed with recoveries and no advisories carries no grade, and that silence is honest. Minting one
  // anyway put a record in front of every reader who had not asked, and moved every downstream count
  // that the ingest merge model rests on — coverage, arriving as damage.
  const envelope = tiddlers.find((t) => String(t["tags"] ?? "").includes(PARSE_WARNING_TAG));
  if (envelope) envelope["failure-count"] = String(failures);
  return tiddlers;
}

// ---------------------------------------------------------------------------
// splitMemeToTiddlers — parse one meme (SOH→ETX span) into parent + children.
//
// `text` = ev.fullText from MemeStreamParser = SOH line → ETX inclusive.
// On exit: parent.text = body proper only (SOH/meta/STX/ETX stripped).
// Child tiddlers: one per non-control ahu slot; text = slot body proper.
// ---------------------------------------------------------------------------

// Structural marker patterns — strip these from parent text at ingest.
// Control sigils live on ONE line by law — `[^>\n]` keeps the scan from
// crossing lines (a greedy multi-line match once swallowed from a quoted
// `<<~` mention down to the real closer; found on loci.md).
const SOH_LINE_RE = /^<<\^(?:[^>\n]|>(?!>))*&#x(?:0001|0011);(?:[^>\n]|>(?!>))*>>\n?/;
const STX_LINE_RE = /<<\^(?:[^>\n]|>(?!>))*&#x0002;(?:[^>\n]|>(?!>))*>>\n?/;

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

/**
 * The advisory envelope — one tiddler, at one address, whether the carrier arrived framed or bare.
 *
 * Both entry doors raise the same finding in the same shape, and a second spelling of it would drift
 * the day one gained a field. The count of records this returns is load-bearing: the ingest merge model
 * rests on it, so this mints nothing where a carrier had nothing to tell a person.
 */
function parseAdvisories(uri: string, warnings: readonly string[]): TiddlerFields[] {
  if (warnings.length === 0) return [];
  return [{
    title:           parseWarningTitle(uri),
    tags:            PARSE_WARNING_TAG,
    "meme-uri":      uri,
    "warning-count": String(warnings.length),
    text:            warnings.join("\n"),
  }];
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
  // THE LAST CLOSE CLOSES; AN EARLIER ONE BELONGS TO AN EMBEDDED EXAMPLE. Documents that TEACH the
  // frame carry example marks in their prose — `meme/SKILL` holds two ETX and three EOT — and cutting
  // at the first truncated a body mid-document. `checkedSpan` already walks to the last ETX for the
  // same reason on the same corpus; this walk enacts the same rule inside splitMemeToTiddlers.
  //
  // A carrier that frames no body still closes its transmission, so where no ETX stands the body ends
  // at the last EOT — otherwise the author's own close rides inside the body and the projection mints
  // a second one below it.
  let etxM: { index: number } | null = null;
  for (const m of maskedExecAll(noSoh, /\n?<<\^(?:[^>\n]|>(?!>))*&#x0003;(?:[^>\n]|>(?!>))*>>/g)) etxM = m;
  let eotM: { index: number } | null = null;
  if (!etxM) {
    for (const m of maskedExecAll(noSoh, /\n?<<\^(?:[^>\n]|>(?!>))*&#x(?:0004|0014);(?:[^>\n]|>(?!>))*>>/g)) eotM = m;
  }
  const stripped = etxM ? noSoh.slice(0, etxM.index) : (eotM ? noSoh.slice(0, eotM.index) : noSoh);
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
  // header reading (its meta still parses; the gradient grades the miss).
  // ONE MODEL FOR EVERY CARRIER: the identity heading, then the body. NO STX MEANS ALL BODY, heading or
  // no heading — a carrier stating identity and nothing framed is a meme whose body the author left
  // short, not a second kind of document. The body stands OPTIONAL and may hold prose, ahu slots, both,
  // or nothing; a meme maps to several tiddlers and a tiddler's own text may stand empty.
  //
  // Reading a heading-only carrier as ALL HEADER routed its prose into `header-text` and left the body
  // slot empty, so the projection minted an empty STX/ETX pair beside the author's own EOT — a carrier
  // that never round-tripped, in a shape nothing measured, because both witnesses skip a carrier that
  // states no `uri-path` and these were exactly the carriers that stated none.
  const bare = !stxM;
  // AN AUTHORED META IS A HEADING, FRAME OR NO FRAME. The frame is the carrier's business; identity is
  // the AUTHOR'S, and an operator who opens a file with a labelled `toml meta` fence has stated one.
  // Reading a bare doc as ALL BODY buried that fence in the text and minted a near-empty heading beside
  // it, so the projection wrote TWO meta blocks and dropped every field the author declared — silently,
  // and stably, because the malformed result round-trips against itself.
  //
  // THE FENCE MUST OPEN THE FILE TO COUNT, because every OTHER meta block belongs to the ahu tiddler it
  // sits in. A slot's fence is that slot's own identity heading — its `register`, its `confidence`, its
  // own address — and `extractSlotStructure` lifts it onto the child record where it overrides whatever
  // the parent declared. One law, read by position: the opening fence heads the carrier, each later
  // fence heads its slot, and neither reaches into the other.
  const leadingMeta = bare ? findMetaFence(stripped, false) : null;
  const authoredHead = leadingMeta && stripped.slice(0, leadingMeta.start).trim() === ""
    ? leadingMeta
    : null;
  const headerRegion = stxM
    ? stripped.slice(0, stxM.index)
    : (authoredHead ? stripped.slice(0, authoredHead.end) : (bare ? "" : stripped));
  // Trim body edges at ingest. The export template owns the visual padding:
  // one blank line after STX and one blank line before ETX. Keeping the stored
  // field edge-trimmed prevents authored leading/trailing newlines from stacking
  // with those template-emitted margins.
  const bodyRegion   = stripLeadingNewlines(
    stxM
      ? stripped.slice(stxM.index + stxM[0].length)
      : (authoredHead ? stripped.slice(authoredHead.end) : (bare ? stripped : "")),
  );

  // Parse meta fields from header region (before STX).
  // Guard: only look for meta in the part of headerRegion before the first
  // top-level ahu block. If the meta fence sits inside a slot body it is a
  // slot-level meta, not a root-level one — extractSlotStructure picks it up
  // when splitRecursive descends into that slot.
  const _rootMetaTopBlocks = findTopLevelAhuBlocks(headerRegion);
  const _rootMetaCutoff = _rootMetaTopBlocks.length > 0
    ? _rootMetaTopBlocks[0]!.openStart
    : headerRegion.length;
  // THE FENCE MUST OPEN ITS HEAD, at the carrier level exactly as at the slot level. Content standing
  // between the heading sigil and a labelled fence means the fence heads nothing — it reads as body,
  // the way a teaching example does. Whitespace is spacing, never content.
  const _metaCandidate = extractRootTomlWithPos(headerRegion.slice(0, _rootMetaCutoff));
  const metaPos = _metaCandidate && headerRegion.slice(0, _metaCandidate.start).trim() === ""
    ? _metaCandidate
    : null;
  const rootToml   = metaPos?.content ?? null;
  const rootFieldsRaw = rootToml ? fieldifyToml(rootToml, warnings, uri) : {};
  const { __arrayKeys: _, ...rootFields } = rootFieldsRaw as TiddlerFields & { __arrayKeys?: string[] };

  // Split header into pre-meta prose and post-meta-pre-STX content.
  // pre-meta: operator prose between SOH and the meta block (e.g. a framing note).
  // post-meta: aka refs, header ahu slots — structure that belongs before STX on disk.
  // When a root meta exists: preMeta = prose before meta; postMeta = content after meta.
  // When no root meta but top-level ahu blocks exist: route full headerRegion through
  // postMetaContent so splitRecursive can find the blocks; preMetaContent stays empty.
  // When no root meta and no blocks: preMetaContent holds the prose verbatim.
  const preMetaContent  = metaPos
    ? headerRegion.slice(0, metaPos.start)
    : (_rootMetaTopBlocks.length > 0 ? "" : headerRegion);
  // Strip one leading \n from post-meta content: extractRootTomlWithPos's regex
  // consumes the closing ``` and its \n, but the source's blank line between the
  // meta fence and the next header content (aka/ahu refs) lives here. The template
  // emits \n\n after the closing ```, so the stored field must not also start with \n.
  const postMetaContent = metaPos
    ? stripLeadingNewlines(headerRegion.slice(metaPos.end))
    : (_rootMetaTopBlocks.length > 0 ? headerRegion : "");

  // Recurse separately so the STX boundary is preserved in the parent's fields:
  //   header-text = post-meta pre-STX content (with ahu blocks → kahea refs)
  //   text        = post-STX body
  const { children: headerChildren, rewrittenText: headerRewritten } =
    splitRecursive(uri, "", postMetaContent, warnings);
  const { children: bodyChildren, rewrittenText: bodyRewritten } =
    splitRecursive(uri, "", bodyRegion, warnings);

  const normalizedBodyRewritten = stripEdgeNewlines(bodyRewritten);

  const allChildren = [...headerChildren, ...bodyChildren];

  const parent: TiddlerFields = {
    ...baseFields,
    ...rootFields,
    title: uri,
    type:  CARRIER_TYPE,
    text:  normalizedBodyRewritten,
  };
  const parentCarriage = [
    ...carriageRecord(uri, "preamble",    preMetaContent.trim()   ? preMetaContent   : ""),
    ...carriageRecord(uri, "header-text", headerRewritten.trim() ? headerRewritten : ""),
  ];

  const result: TiddlerFields[] = [parent, ...parentCarriage, ...allChildren];

  // ── THE WARNING TIDDLER IS THE ENVELOPE, AND IT HOLDS MORE THAN THIS ────────────────────────────
  //
  // A parse grade is something the READER observed, never something the author wrote, so a field
  // carrying it on the record would be a fact an operator can see and edit and cannot round-trip —
  // the placement law's exact prohibition. This tiddler is where such facts belong.
  //
  // Two DIFFERENT readings exist and neither subsumes the other. These `warnings` are AUTHORING
  // advisories: a TOML key the URI already derives, a carrier close sitting inside an unclosed fence.
  // `parseMemeText` reports something else entirely — positional grammar recoveries, each naming what
  // the parser fell back to. Summing them into one count would blur a nudge to a person with a
  // recovery by a machine.
  //
  // They ride ONE tiddler under TWO counts, which is the host's own shape: TiddlyWiki stages many
  // findings from one operation in a single `$:/Import` tiddler rather than scattering them, keeping a
  // reader's query at one address. `warning-count` names the advisories raised here; `safeSplitMeme`
  // adds `failure-count` for the grammar's recoveries by ENRICHING this tiddler, never by pushing a
  // second one. An emitter added here would move every downstream record count.
  result.push(...parseAdvisories(uri, warnings));

  return result;
}

// ---------------------------------------------------------------------------
// splitRecursive — full-depth ahu walk producing a flat tiddler set.
//
// Each ahu sigil at every depth becomes its own tiddler. The bag stays flat;
// the URI fragment-path (`#/parent/child/grandchild`) carries the hierarchy.
// The parent of each tiddler — `fragment-parent` field — points ONE LEVEL up
// (immediate enclosing ahu, not the meme-root), so disk-projector and
// templates can climb to the nearest tagged ancestor in a single hop chain.
// The text returned for each tiddler has its own ahu blocks rewritten to
// `<<~ kahea ahu #slot>>` references; child tiddlers hold the body bytes
// authoritatively.
// ---------------------------------------------------------------------------

function splitRecursive(
  rootUri:          string,
  fragmentPrefix:   string,  // "" at meme root; "#/a" → "#/a/b" → "#/a/b/c"
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
      // Default dialect; a child slot's OWN declared meta `type` (e.g. text/markdown) rides in
      // childStructure.fields and OVERRIDES this default via the spread — a typed child keeps its
      // type instead of losing it to the memetic-wikitext hardcode. (The parent carrier stays
      // memetic by construction — this deserializer runs because the carrier IS memetic.)
      type:              CARRIER_TYPE,
      ...childStructure.fields,
      title:             childUri,
      text:              childStructure.text,
      "uri-path":        childUriPath,
      "$fragment-parent": enclosingUri,
      "$slot":            block.slot,
    });
    allChildren.push(
      ...carriageRecord(childUri, "preamble",  childStructure.preamble  ?? ""),
      ...carriageRecord(childUri, "postamble", childStructure.postamble ?? ""),
    );
    allChildren.push(...inner.children);
    rewritten += `<<~ kahea ahu ${block.slot}>>`;
    cursor = block.closeEnd;
  }
  rewritten += text.slice(cursor);
  return { children: allChildren, rewrittenText: rewritten };
}

// ---------------------------------------------------------------------------
// findMetaFence — locate a ```toml meta``` (or plain ```toml```) fence block.
// Used by both header-region and slot-body TOML extraction.
// ---------------------------------------------------------------------------

const META_FENCE_RE   = /```toml[ \t]+meta[ \t]*\n([\s\S]*?)```\n?/;
const PLAIN_FENCE_RE = /```toml[ \t]*\n([\s\S]*?)```\n?/;

function findMetaFence(text: string, allowPlain = false): { content: string; start: number; end: number } | null {
  // The meta fence IS a fence — accept a match starting AT a span opener,
  // reject one buried inside another span (a ````-quoted teaching example).
  const m = maskedExec(text, META_FENCE_RE, undefined, true)
    ?? (allowPlain ? maskedExec(text, PLAIN_FENCE_RE, undefined, true) : null);
  if (!m) return null;
  return { content: m[1] ?? "", start: m.index, end: m.index + m[0].length };
}

function extractRootTomlWithPos(text: string) { return findMetaFence(text); }

// ---------------------------------------------------------------------------
// extractSlotStructure — split a slot body into preamble + meta fields + text
// + postamble. Same shape as the disk-version full-meme split, applied to
// every ahu slot so each slot is itself a valid "full published meme MD
// file" projection.
//
// Convention:
//   - THE FENCE MUST OPEN ITS HEAD. A labelled meta fence heads the slot it opens; content standing
//     BEFORE it means the fence heads nothing — it is body, the way a teaching example is. The parent
//     law (memetic-wikitext-framing #authoring: the fence that OPENS a carrier heads it) reaches every slot the same way.
//
//     Post-meta content in the head STANDS — that is the bindings zone, authored, and it re-emits
//     between the meta and the body. Pre-meta content does not, and `preamble` retires with it: a zone
//     that names a shape the grammar forbids holds bytes nothing should have written.
//   - fields    = parsed from the meta toml block (operator-authored keys).
//   - text      = body proper — from the first inner kahea ref to the last
//     inner kahea ref end (inclusive of refs for sub-slot reconstruction).
//   - postamble = text AFTER the last inner kahea ref (trailing prose).
//
// When no inner sigils exist:
//   - meta present: preamble holds pre-meta prose + meta marker + post-meta
//     prose; text = "".
//   - no meta:      text = whole body, preamble = "".
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
  // Only a LABELED ```toml meta fence carries slot identity. A plain ```toml
  // fence is operator CONTENT (teaching matter, config examples) — swallowing
  // it into fields mutated content on round-trip (key reorder, re-alignment,
  // the fence relabeled `toml meta`). Carrier-whole law: content bytes survive
  // whole.
  // A fence preceded by content heads nothing. Whitespace does not count as content — a blank line
  // between the ahu sigil and the fence is spacing, not prose.
  const metaCandidate = findMetaFence(bodyText, false);
  const metaM = metaCandidate && bodyText.slice(0, metaCandidate.start).trim() === ""
    ? metaCandidate
    : null;

  let preamble = "";
  let fields: TiddlerFields = {};
  let remainder = bodyText;

  if (metaM) {
    // A fence that OPENS its head has only spacing above it, and spacing is not content — capturing it
    // gave `preamble` a whitespace value that re-emitted as an meta key and shrank on the next read.
    preamble  = "";
    const raw = fieldifyToml(metaM.content, warnings, context);
    const { __arrayKeys: _, ...parsed } = raw as TiddlerFields & { __arrayKeys?: string[] };
    fields    = parsed;
    remainder = bodyText.slice(metaM.end);
  }

  // Find LAST kahea ref — trailing prose becomes postamble. Quoted refs
  // (fenced/inline-code) stay content, never structure (fence-mask law).
  // The slot grammar mirrors AHU_OPEN_RE: a rooted slot path (`#/a/b/c`)
  // addresses a nested fragment and MUST round-trip whole — a `#[\w-]+`-only
  // match clipped the path at the first `/`, orphaning the slot's body.
  const refRe = /<<~\s*kahea\s+ahu\s+#\/?[\w-]+(?:\/[\w-]+)*\s*>>/g;
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

  // No meta, no refs: the whole body is text.
  if (!metaM && lastEnd < 0) {
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

export { memeticWikitextDeserializer as "text/memetic-wikitext+tiddlywiki" };

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

  children.push(...parseAdvisories(uri, warnings));

  return { parent, children };
}

// ---------------------------------------------------------------------------
// expandMemeRefs — the recompose inverse (wiki → disk)
//
// Doctrine (disk-projection#granularity): every path back to disk MUST route
// through the recompose inverse (`expandMemeRefs` / `exportMemeText`). This
// function inverts the incoming shore transform above: it reads the
// parent's normalized records, splices each `<<~ kahea ahu #slot>>` marker
// back into its child's full definition form (recursively), and reassembles
// the carrier envelope (prologue · SOH · preamble · meta · header · STX ·
// body · ETX · EOT · postamble).
//
// Canonical-form law (handoff #pattern-integrities §2) binds the output:
//   1. idempotent render — canonical input round-trips byte-identical
//      (sigil spacing `<<^ code="&#x0002;">>`, one-blank-line block margins);
//   2. framing normalizes once — the meta block re-emits sorted + aligned
//      from fields (authored key order and padding do not survive the
//      record stratum);
//   3. parse∘render ≡ records — proven by the round-trip harness, never
//      by assertion.
//
// Pure function over a fields reader: no I/O, no TW5 dependency — the same
// shore module owns both directions, so the harness proves the pair.
// ---------------------------------------------------------------------------

export type FieldsReader = (title: string) => TiddlerFields | undefined;

// The single deny-set: STRUCTURAL / ENVELOPE fields never re-emit into the meta
// fence — they rebuild from the envelope + record stratum on recompose, so
// emitting them into the TOML DOUBLES the body (title/text) or the framing.
//
// The telemetry fence (operator ruling 2026-07-20): sensorium/worldline telemetry
// routes through Py on capture, and a sensorium→wiki pull MUST carry ALL its
// metadata. So `lar_*` sensorium fields (`lar_agent_handle`, `lar_ffz`,
// `lar_root_handle`, …) round-trip WHOLE — no prefix carries a blanket denial.
//
// NO OPERATOR NAME SITS HERE. TiddlyWiki restricts no field name and MultiWikiServer restricts two,
// so this set holds those two and their record-stratum siblings and nothing else. The grammar's OWN
// carriage — the prologue, the preamble, the header text, the slot a fragment fills, the parent it
// hangs from, the bytes trailing the frame — rides the `$…` namespace TW5 keeps for a host, which
// `emitMetaToml` drops wholesale. An author who writes `postamble` or `slot` now gets an ordinary
// custom field that round-trips like any other, because the grammar stopped standing on those words.
//
// That move also closed a hole the name-list could not: `preamble` and `carrier-sila` were read as
// carriage and denied nowhere, so they emitted into the meta AND rebuilt as structure — an operator's
// value came back undefined and the projection stopped settling. A namespace covers what a list
// forgets.
const META_DENY: ReadonlySet<string> = new Set([
  // The host's two, and the record stratum they arrive with. TiddlyWiki restricts no field name;
  // MultiWikiServer overwrites `title` and `revision` on every read. Nothing else belongs here.
  "title", "text", "modified", "revision",
]);
// Authored identity re-emits: the deny-set
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
const CHILD_META_DENY: ReadonlySet<string> = new Set([
  ...META_DENY, "uri-path", "file-path",
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
 * The namespace's canonical meta form: every non-ASCII codepoint as an
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

/** Canonical meta TOML: sorted keys, equals-signs aligned to the longest key.
 *  `lar_*` sensorium/worldline metadata re-emits WHOLE (the telemetry fence —
 *  see META_DENY); the deny-set names the only
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
function emitMetaToml(fields: TiddlerFields, deny: ReadonlySet<string>, parentFields?: TiddlerFields): string {
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
// `#/a/b` slot addresses a nested fragment; a `#[\w-]+`-only capture stopped at
// the first `/`, so the ref never matched its child and the whole slot body
// dropped from the render (the ahu-drop). The path re-composes verbatim below.
/**
 * CARRIAGE RIDES ITS OWN RECORD, at an address derived from the carrier's.
 *
 * Four parts of a carrier hold CONTENT rather than a value: the prologue above the declaration, the
 * preamble beneath the head, the header text before STX, the bytes trailing the frame. A tiddler field
 * cannot hold any of them across a `.tid` projection — TW5 parses a field header line by line, so only
 * `text` may carry a newline (boot.js, `application/x-tiddler`). A field that can only survive inside
 * one file format is a field that cannot travel.
 *
 * So each becomes a record with a `text`, on the rails that already carry ahu fragments: a deterministic
 * address under the carrier's own, `$fragment-parent` set so the projector climbs to the root and never
 * writes it as its own file, and no kahea marker anywhere — the frame splices these by POSITION, which
 * is the only signal the bytes ever carried.
 *
 * The `$` marks the host's slot and keeps the address whole; a `$:/`-prefixed system title would break
 * the carriage away from the thing it belongs to.
 *
 * Scalars stay fields. `$slot`, `$fragment-parent`, `$carrier-soh`, `$postamble-foreign` hold single
 * values that never carry a newline, and a record for each would cost the native filter surface and buy
 * nothing. The split runs scalar-or-multiline, never reserved-or-free.
 */
export const CARRIAGE_PARTS = ["prologue", "preamble", "header-text", "postamble"] as const;
export type CarriagePart = (typeof CARRIAGE_PARTS)[number];

/**
 * A carriage record's address.
 *
 * A carriage rides a path like everything else the house addresses — `#/$postamble` at a carrier
 * root, `#/observe/$postamble` under a section. The bare space holds no house address at all
 * (composeSlotPath); it belongs to the page anchors a live wiki renders.
 */
export function carriageUri(carrierUri: string, part: CarriagePart): string {
  const cut = carrierUri.indexOf("#");
  if (cut < 0) return `${carrierUri}#/$${part}`;
  const base = carrierUri.slice(0, cut);
  const frag = carrierUri.slice(cut + 1);
  return `${base}#/${frag.replace(/^\//, "")}/$${part}`;
}

/** One carriage record, or nothing where the part holds no content. */
function carriageRecord(carrierUri: string, part: CarriagePart, text: string): TiddlerFields[] {
  if (text === "") return [];
  return [{
    title:              carriageUri(carrierUri, part),
    type:               CARRIER_TYPE,
    text,
    "$fragment-parent": carrierUri,
    "$slot":            `$${part}`,
  }];
}

/** What a carriage part holds for a carrier, read through the same reader the frame reads records by. */
function carriageText(reader: FieldsReader, carrierUri: string, part: CarriagePart): string {
  const r = reader(carriageUri(carrierUri, part));
  return r && typeof r["text"] === "string" ? (r["text"] as string) : "";
}

const KAHEA_AHU_REF_RE = /<<~\s*kahea\s+ahu\s+(#\/?[\w-]+(?:\/[\w-]+)*)\s*>>/g;

/**
 * Splice child definition blocks back over their kahea markers, full depth.
 * Quoted markers (fenced/inline-code) stay verbatim — the operator SHOWS
 * the grammar there, the recompose never expands inside the mask.
 */
function expandRefs(reader: FieldsReader, rootUri: string, fragmentPrefix: string, text: string, parentFields: TiddlerFields, dialect: string): string {
  const mask = fencedSpans(text);
  return text.replace(KAHEA_AHU_REF_RE, (marker, slot: string, offset: number) => {
    if (inMask(mask, offset)) return marker;
    const slotPath = composeSlotPath(fragmentPrefix, slot);
    const child = reader(rootUri + slotPath);
    if (!child) return marker;   // missing child: keep the marker — honest residue, never invented bytes
    // Diff the child against ITS parent; recurse with the child as the next level's parent.
    const meta   = emitMetaToml(child, CHILD_META_DENY, parentFields);
    const inner = expandRefs(reader, rootUri, slotPath, String(child["text"] ?? ""), child, dialect);
    const pre   = carriageText(reader, rootUri + slotPath, "preamble");
    const post  = carriageText(reader, rootUri + slotPath, "postamble");
    // The meta block sits FLUSH against the ahu sigil line (mirroring the parent carrier's SOH+meta) —
    // a single newline, no blank between. A blank line then separates any content below. A preamble
    // (rare) keeps the older sigil-then-blank spacing since content precedes the meta there.
    const metaBlock = meta ? "```toml meta\n" + meta + "```" : "";
    const rest     = stripEdgeNewlines(inner + post);
    // A whitespace-only preamble (`"\n\n"`) carries no content — treat it as none so the meta
    // still hugs the sigil line. Only REAL preamble content routes to the sigil-then-blank form.
    const hasPre   = pre.trim() !== "";
    let opened: string;
    if (hasPre) {
      opened = `\n\n${stripEdgeNewlines(pre + (metaBlock ? "\n\n" + metaBlock : "") + (rest ? "\n\n" + rest : ""))}`;
    } else if (metaBlock) {
      opened = `\n${metaBlock}${rest ? "\n\n" + rest : ""}`;
    } else {
      // An empty child carries no body — leave `opened` bare so the fixed closer supplies
      // the single blank line; a filled one opens on the sigil-then-blank spacing.
      opened = rest ? `\n\n${rest}` : "";
    }
    return dialect === "fragment"
      ? `<<fragment ${slot}>>${opened}\n\n<</fragment>>`
      : `<<~ ahu ${slot}>>${opened}\n\n<<~/ahu>>`;
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
  // A RECORD THAT IS NOT A CARRIER PROJECTS TO NOTHING, and until it said so this was the quietest
  // failure in the tree: a type the reader does not admit returns null, the projection writes no file,
  // and nothing anywhere reports which record went missing or why.
  if (!isCarrierType(f.type)) {
    if (typeof f["type"] === "string" && (f["type"] as string).includes("memetic-wikitext")) {
      console.warn(`[memetic-deserializer] ${memeUri} declares type "${f["type"] as string}" — not a spelling this reader admits (${CARRIER_TYPES.join(" · ")}); it will not project`);
    }
    return null;
  }

  const str = (k: string): string => (typeof f[k] === "string" ? (f[k] as string) : "");
  const meta = emitMetaToml(f, META_DENY);
  // The emitter reads the shared table rather than spelling the entities inline: a mark that leaves
  // the grammar leaves here too, instead of surviving as a literal no reader still scans for.
  const MARK = (name: string): string => frameMark(FRAME_BY_NAME[name]!)!.code;
  const sohCode = f["$carrier-soh"] === "0011" ? MARK("SOH2") : MARK("SOH");
  const dialect = typeof f["$carrier-dialect"] === "string" ? (f["$carrier-dialect"] as string) : "ahu";
  // THE ENDS TAKE NAMES; THE ARROW KEEPS ITS SHAPE. `from=? -> to=uri` reads "this carrier resolves
  // toward that address", the spelling `pranala` and `lares aim` already write. The arrow rides as an
  // unnamed positional, which TiddlyWiki parses as one — folding the bearing into a quoted attribute
  // would demote a relation to a field.
  const ns = str("namespace").trim();

  let out = carriageText(reader, memeUri, "prologue");
  // THE DECLARATION IS THE CARRIER'S BUSINESS, exactly as the frame is. An author writes content and
  // identity; which grammar reads the result is not a question they should have to answer, and a
  // carrier that never carried a declaration would otherwise never gain one — the projection would
  // mint SOH through EOT and leave the one line that selects the grammar to chance.
  //
  // MINTED UNCONDITIONALLY. The frame owns this line, so the parse no longer stores a copy of it and
  // nothing here has to check whether one stands — a suppression check and the field it guarded, gone
  // together. What the author wrote ABOVE the declaration still rides in `prologue` and emits first.
  out += `${DECLARATION}\n\n`;
  out += `<<^ code="${sohCode}"${ns ? ` namespace="${ns}"` : ""} from=? -> to=${memeUri}>>\n`;
  out += carriageText(reader, memeUri, "preamble");
  if (meta) out += "```toml meta\n" + meta + "```\n\n";
  out += expandRefs(reader, memeUri, "", carriageText(reader, memeUri, "header-text"), f, dialect);
  // THE SPAN OPENS HERE. The check covers STX-open through ETX-close inclusive, so the emitter marks
  // where the body begins and computes over the bytes it has actually assembled — never over a field.
  const spanStart = out.length;
  out += `<<^ code="${MARK("STX")}">>\n\n`;
  out += expandRefs(reader, memeUri, "", String(f.text ?? ""), f, dialect);
  // ETX takes its block check adjacent, per the received framing (STX -> text -> ETX -> BCC); the
  // attestation block follows and ETB terminates it.
  //
  // COMPUTED HERE, NEVER READ FROM A FIELD. A stored check goes stale the moment the bytes move, and
  // the span carries the frame sigils' OWN bytes — so a frame migration would turn every stored check
  // into a `mismatch` over a body nobody touched.
  //
  // MINTED UNCONDITIONALLY, on the DECLARATION's precedent. The frame owns this slot, so the parse
  // stores no copy and nothing here asks whether one stood — a presence flag and the field it guarded,
  // gone together. That flag was the last thing keeping a machine-derived fact on the operator's
  // record, and a carrier that arrived unchecked gains its check on the first projection rather than
  // staying unchecked because it always had been.
  const sila = str("$carrier-sila");
  out += `\n\n<<^ code="${MARK("ETX")}">>`;
  out += bccOfSpan(out.slice(spanStart));
  out += "\n";
  if (sila) out += `\n${sila}\n<<^ code="${MARK("ETB")}">>\n`;
  out += `\n<<^ code="${MARK("EOT")}" -> to=?>>\n`;
  // The EOT→postamble shore normalizes to a stable fixed point: the EOT line
  // already ends with one newline; a postamble's own leading newlines would
  // stack a fresh blank line every round trip (found on the Kapu &#x0014;
  // trailing closer).
  out += stripLeadingNewlines(carriageText(reader, memeUri, "postamble"));
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
    // CONTENT PAST ETX REFUSES — the NAK the block check was always for. The text ends at ETX and the
    // slot below it carries the check alone, so anything written there reaches no reader and no render
    // reproduces it. Absent this NAK the body simply vanishes: two `#edges` blocks went that way, and
    // nothing said a word.
    const stranded = record["$postamble-foreign"];
    if (stranded !== undefined) {
      diagnostics.push({
        from: 0, to: text.length, severity: "error",
        source: "memetic-wikitext", code: "postamble-content",
        message: `${stranded} line(s) stand between ETX and EOT. The text ends at ETX; that slot `
               + "carries the block check alone. Move the content above the `<<^ code=\"&#x0003;\">>` close.",
      });
    }
    if (!String(record.title ?? "").includes("/parse-warning/")) continue;
    for (const line of String(record.text ?? "").split("\n")) {
      if (line.trim()) diagnostics.push(shoreDiagnostic(line.trim(), text.length));
    }
  }
  return { records, diagnostics };
}
