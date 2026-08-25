/**
 * carrier-shape — how far down the ingest gradient a carrier sits, named rather than counted.
 *
 * ── WHY A SHAPE AND NOT A BOOLEAN ───────────────────────────────────────────────────────────────
 * Graceful parsing says NO parse breaks badly: a carrier missing its frame still yields records, a
 * carrier missing its declaration still dispatches. That mercy is load-bearing and it hides things.
 * A file can lose its address and keep rendering, and every corpus gate that walks `uri-path` will
 * skip it forever at `if (!uri) continue` — the gate reporting 601 of 618 while calling itself
 * corpus-wide.
 *
 * So the reading is a GRADIENT, not a verdict. This names which marks a carrier carries, which KIND
 * that makes it, and which marks that kind requires and lacks.
 *
 * ── THE FOUR KINDS, AS THE CORPUS ACTUALLY HOLDS THEM ───────────────────────────────────────────
 * · `carrier`    — declares `uri-path`: a meme. Wants the whole frame and a block check.
 * · `descriptor` — declares `bag`: a bag's own declaration, not a meme. It names WHO may read the
 *                  bag and WHERE its bytes rest, so it carries a head and a declaration and stops.
 *                  A body frame here would claim it holds a meme's text, which it does not.
 * · `shelf`      — declares neither, but its head names an address: a library index. The head knows
 *                  where it stands and the declaration does not say so, which is exactly the fault
 *                  that makes it invisible.
 * · `unframed`   — no head at all. Bytes with a `.mem` extension.
 *
 * The kind reads from the DECLARATION, never from the path: a file's location says where it rests,
 * and what it IS is a thing it states.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext
 */

import { fencedSpans, maskedExec, maskedExecAll } from "./meme-ast/fence-mask.js";
import { verifyBcc } from "./carrier-check.js";

/** One mark's presence, read through the fence mask so a teaching example never counts as a frame. */
export interface CarrierMarks {
  readonly doctype: boolean;
  readonly head:    boolean;
  readonly meta:     boolean;
  readonly uriPath: string | null;
  readonly bag:     string | null;
  readonly headUri: string | null;
  readonly stx:     boolean;
  readonly etx:     boolean;
  readonly eot:     boolean;
  readonly check:   "ok" | "mismatch" | "unchecked" | "torn";
}

export type CarrierKind = "carrier" | "descriptor" | "shelf" | "unframed";

export interface CarrierShape {
  readonly kind:   CarrierKind;
  readonly marks:  CarrierMarks;
  /** What this kind requires and this file lacks. Empty means the file stands at its kind's floor. */
  readonly faults: readonly string[];
}

/** A frame mark, counted only outside a quote fence. */
function marked(text: string, re: RegExp): boolean {
  return maskedExec(text, re, fencedSpans(text)) !== null;
}

/** The first meta block's value for a key, or null. Read raw: a shape reading must not need a parser. */
function metaValue(text: string, key: string): string | null {
  const block = /```toml meta\n([\s\S]*?)\n```/.exec(text)?.[1];
  if (!block) return null;
  const m = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, "m").exec(block);
  return m ? m[1]! : null;
}

export function readCarrierShape(text: string): CarrierShape {
  const spans = fencedSpans(text);
  // THE ARROW CARRIES A `>`. A head sigil states its bearing as `? -> lar:///…`, so a tail scanned as
  // `[^>\n]*` stops at the arrow and the sigil never closes — the whole corpus then reads unframed.
  // `(?:[^>\n]|->)*` is the form every other scan in this grammar uses, for this reason.
  // The PREFIX still stops at `&`: a namespace written as entities would otherwise be read as the
  // control code, which is the quietest way this frame has broken.
  const headM = maskedExec(text, /<<\^[^&\n]*&#x(?:0001|0011);(?:[^>\n]|->)*>>/g, spans);
  const marks: CarrierMarks = {
    doctype: /^<<!DOCTYPE /m.test(text),
    head:    headM !== null,
    // THE DECLARATION OPENS A FENCE OF ITS OWN, so its opener sits exactly at a mask span's start and a
    // plain masked read rejects it. `allowSpanStart` admits the boundary and still refuses a fence
    // INTERIOR — which is what separates a carrier's real declaration from one quoted in a lesson.
    meta:     maskedExec(text, /```toml meta\n/g, spans, true) !== null,
    uriPath: metaValue(text, "uri-path"),
    bag:     metaValue(text, "bag"),
    headUri: headM ? (/-> (\S+) >>/.exec(headM[0])?.[1] ?? null) : null,
    stx:     marked(text, /<<\^(?:[^>\n]|->)*&#x0002;(?:[^>\n]|->)*>>/g),
    etx:     marked(text, /<<\^(?:[^>\n]|->)*&#x0003;(?:[^>\n]|->)*>>/g),
    eot:     marked(text, /<<\^(?:[^>\n]|->)*&#x(?:0004|0014);(?:[^>\n]|->)*>>/g),
    check:   verifyBcc(text),
  };

  // KIND READS THE DECLARATION FIRST. A descriptor that also carried a uri-path would name itself two
  // things at once, so `bag` wins and the collision surfaces as a fault rather than a silent pick.
  const kind: CarrierKind =
    !marks.head            ? "unframed"
    : marks.bag !== null   ? "descriptor"
    : marks.uriPath !== null ? "carrier"
    : "shelf";

  const faults: string[] = [];
  if (!marks.doctype) faults.push("no declaration — nothing names the grammar that reads it");
  if (!marks.head)    faults.push("no head sigil — the file states no bearing and no namespace");

  if (kind === "descriptor" && marks.uriPath !== null) {
    faults.push("declares both `bag` and `uri-path` — a bag and a meme are different things");
  }
  if (kind === "shelf") {
    faults.push(
      marks.headUri
        ? `the head names ${marks.headUri} and the declaration states no uri-path — every corpus gate skips it`
        : "no uri-path and no head address — the file names nowhere",
    );
  }
  if (kind === "carrier" || kind === "unframed") {
    if (!marks.meta) faults.push("no meta block — the carrier declares no identity");
    for (const [have, name] of [[marks.stx, "STX"], [marks.etx, "ETX"], [marks.eot, "EOT"]] as const) {
      if (!have) faults.push(`no ${name} — the body has no ${name === "EOT" ? "release" : "bound"}`);
    }
  }
  // A descriptor closes on EOT with no body between; only the release is required of it.
  if (kind === "descriptor" && !marks.eot) faults.push("no EOT — the declaration never releases");
  if (marks.check === "mismatch") faults.push("block check does not match the body it follows");
  // A torn frame reads as a truncated transmission, never as an unchecked one — the conflation would
  // let a file cut ahead of its closer pass as lawful absence-of-check.
  if (marks.check === "torn") faults.push("the frame opens and never closes — STX stands without ETX; torn reads as truncated, never unchecked");
  // ONE TEXT FRAME PER CARRIER. The check covers the first STX..ETX span and only that, so a second
  // frame would ride beneath a verdict computed over the first — the smuggling shape. The gradient
  // surfaces it rather than letting the first frame's `ok` speak for bytes it never covered.
  const stxCount = maskedExecAll(text, /<<\^(?:[^>\n]|->)*&#x0002;(?:[^>\n]|->)*>>/g, spans).length;
  if (stxCount > 1) faults.push(`${stxCount} text frames stand where the grammar admits one — only the first verifies`);

  return { kind, marks, faults };
}
