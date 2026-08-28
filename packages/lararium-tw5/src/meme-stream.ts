/**
 * meme-stream — streaming parser for the memetic-wikitext carrier protocol.
 *
 * Carrier framing uses HTML-entity control sigils as stream boundaries:
 *
 *   <<^ code="&#x0001;" namespace="[prefix?]"  ? -> lar:///URI >>   SOH — opens a carrier, declares URI
 *   <<^ code:"&#x0002;" [^>]*>>               STX — header→body boundary
 *   <<^ code:"&#x0003;" [^>]*>>               ETX — closes body (carrier done)
 *   <<^ code:"&#x0004;" [^>]*>>               EOT — carrier exit sigil
 *   <<~ -> ? >>                                return-throat — EOT variant
 *   <<~ ahu #slot >>...<<~/ahu >>             ahu section — incremental child event
 *
 * Kapu extended range: &#x0011; = SOH variant, &#x0014; = EOT variant.
 *
 * MemeStreamParser uses an index-based scan (no buffer slicing mid-frame)
 * so fullText in carrier-close is always the complete SOH→ETX span.
 *
 * Designed for:
 *   - Single-carrier streaming: Automerge CRDT patches arriving incrementally
 *   - Multi-Realm ingestion: sequence of carriers from a remote Realm's meme stream
 *
 * This module is isomorphic (no fs/DOM/TW5 dependencies).
 */

import { fencedSpans, maskedExec } from "./meme-ast/fence-mask.js";
import type { MaskSpan } from "./meme-ast/fence-mask.js";

// ---------------------------------------------------------------------------
// Event types
// Schema: lar:///ha.ka.ba/lares/api/pono/memetic-wikitext-framing
// ---------------------------------------------------------------------------

export interface StreamEventCarrierOpen  { kind: "carrier-open";  uri: string }
export interface StreamEventAhuChild     { kind: "ahu-child";     uri: string; slot: string; bodyText: string }
export interface StreamEventCarrierClose { kind: "carrier-close"; uri: string; fullText: string }
export interface StreamEventRealmDone    { kind: "realm-done" }

export type MemeStreamEvent =
  | StreamEventCarrierOpen
  | StreamEventAhuChild
  | StreamEventCarrierClose
  | StreamEventRealmDone;

// ---------------------------------------------------------------------------
// Patterns — all use lastIndex-reset via exec, no /g flag
// ---------------------------------------------------------------------------

// SOH: both standard &#x0001; and Kapu DC1 &#x0011;
// All control sigils use (?:[^>\n]|->) — resonance markers (ॐ, ⊙) and ->
// sequences allowed, but a sigil NEVER crosses a line: the multi-line form
// once let a quoted `<<~` mention swallow text down to a distant real sigil
// (loci.md).
const SOH_RE  = /<<\^(?:[^>\n]|->)*&#x(?:0001|0011);(?:[^>\n]|->)*\?\s*->\s*([^\s>]+)\s*>>/;
const STX_RE  = /<<\^(?:[^>\n]|->)*&#x0002;(?:[^>\n]|->)*>>/;
const ETX_RE  = /<<\^(?:[^>\n]|->)*&#x0003;(?:[^>\n]|->)*>>/;
// ETB: the attestation block terminator — stands between ETX and EOT, never framing text.
const ETB_RE  = /<<\^(?:[^>\n]|->)*&#x0017;(?:[^>\n]|->)*>>/;
// EOT: entity form (&#x0004;/&#x0014;) OR return-throat (<<~ -> ? >>)
const EOT_RE  = /<<[~^](?:(?:[^>\n]|->)*&#x(?:0004|0014);(?:[^>\n]|->)*|\s*->\s*\?)\s*>>/;
const AHU_OPEN_RE  = /<<~(?:[^>\n]|->)*\bahu\s+(#\/?[\w-]+(?:\/[\w-]+)*)\s*>>/;
const AHU_CLOSE_RE = /<<~\s*\/\s*ahu\s*>>/;

type Hit = { index: number; end: number; cap: string | undefined };

/**
 * Fence-aware find (fence-mask law): quoted sigils never frame
 * a carrier — a fenced `<<^ code="&#x0003;" >>` in teaching text MUST NOT close
 * the body. The parse cursor always rests outside quoted spans (a sigil
 * inside a span never gets consumed), so masking `remaining` per call
 * stays sound across streaming chunks. An unclosed fence masks its open
 * tail — matches inside it wait for more data, the same posture as a
 * partial sigil.
 */
function find(text: string, re: RegExp, mask?: readonly MaskSpan[]): Hit | null {
  const m = maskedExec(text, re, mask);
  if (!m) return null;
  return { index: m.index, end: m.index + m[0].length, cap: m[1] };
}

function earliest(
  ...hits: Array<{ tag: string; h: Hit | null }>
): { tag: string; index: number; end: number; cap: string | undefined } | null {
  let best: { tag: string; index: number; end: number; cap: string | undefined } | null = null;
  for (const { tag, h } of hits) {
    if (!h) continue;
    if (!best || h.index < best.index) best = { tag, index: h.index, end: h.end, cap: h.cap };
  }
  return best;
}

// ---------------------------------------------------------------------------
// MemeStreamParser
// ---------------------------------------------------------------------------

type ParserState = "idle" | "header" | "body";

export class MemeStreamParser {
  private _buf   = "";
  private _pos   = 0;   // parse cursor (absolute index into _buf)
  private _state: ParserState = "idle";
  private _uri   = "";
  private _sohStart = 0; // absolute index of SOH match start — for fullText reconstruction

  // ahu accumulation (inside body)
  private _inAhu    = false;
  private _ahuSlot  = "";
  private _ahuStart = 0;  // absolute index just after <<~ ahu >> open sigil
  private _ahuDepth = 0;

  /** Push a text chunk. Returns all events emitted during this chunk. */
  push(chunk: string): MemeStreamEvent[] {
    this._buf += chunk;
    return this._drain();
  }

  /** Signal end of input — flushes any open carrier as a best-effort close. */
  flush(): MemeStreamEvent[] {
    const events: MemeStreamEvent[] = [];
    if (this._state !== "idle" && this._uri) {
      events.push({
        kind:     "carrier-close",
        uri:      this._uri,
        fullText: this._buf.slice(this._sohStart),
      });
    }
    this._buf   = "";
    this._pos   = 0;
    this._state = "idle";
    this._uri   = "";
    this._inAhu = false;
    return events;
  }

  private _drain(): MemeStreamEvent[] {
    const events: MemeStreamEvent[] = [];
    let safety = 0;

    while (safety++ < 10000) {
      const remaining = this._buf.slice(this._pos);
      const mask = fencedSpans(remaining);

      // ── IDLE ─────────────────────────────────────────────────────────────
      if (this._state === "idle") {
        const soh = find(remaining, SOH_RE, mask);
        const eot = find(remaining, EOT_RE, mask);

        if (!soh && !eot) break;

        // EOT before any SOH → realm stream done; discard and continue
        if (eot && (!soh || eot.index <= soh.index)) {
          this._pos += eot.end;
          const after = this._buf.slice(this._pos).trim();
          if (!after) {
            events.push({ kind: "realm-done" });
            this._gc();
          }
          continue;
        }

        if (soh) {
          this._uri      = soh.cap ?? "";
          this._sohStart = this._pos + soh.index;
          this._pos     += soh.end;
          this._state    = "header";
          events.push({ kind: "carrier-open", uri: this._uri });
        }
        continue;
      }

      // ── HEADER ───────────────────────────────────────────────────────────
      if (this._state === "header") {
        const stx = find(remaining, STX_RE, mask);
        const eot = find(remaining, EOT_RE, mask);
        if (!stx && !eot) break;

        if (eot && (!stx || eot.index < stx.index)) {
          // Degenerate carrier — close it on EOT
          const fullText = this._buf.slice(this._sohStart, this._pos + eot.end);
          events.push({ kind: "carrier-close", uri: this._uri, fullText });
          this._pos  += eot.end;
          this._state = "idle";
          this._uri   = "";
          this._gc();
          continue;
        }

        this._pos  += stx!.end;
        this._state = "body";
        continue;
      }

      // ── BODY ─────────────────────────────────────────────────────────────
      if (this._state === "body") {
        if (!this._inAhu) {
          const hit = earliest(
            { tag: "ahu",  h: find(remaining, AHU_OPEN_RE, mask) },
            { tag: "etx",  h: find(remaining, ETX_RE, mask)      },
            { tag: "eot",  h: find(remaining, EOT_RE, mask)      },
          );
          if (!hit) break;

          if (hit.tag === "ahu") {
            this._ahuSlot  = hit.cap ?? "";
            this._ahuStart = this._pos + hit.end;
            this._ahuDepth = 1;
            this._inAhu    = true;
            this._pos     += hit.end;
            continue;
          }

          // ETX or EOT → carrier done
          const fullText = this._buf.slice(this._sohStart, this._pos + hit.end);
          events.push({ kind: "carrier-close", uri: this._uri, fullText });
          this._pos  += hit.end;
          this._state = "idle";
          this._uri   = "";
          this._gc();
          continue;
        }

        // Inside an ahu section — track nesting depth
        const closeH = find(remaining, AHU_CLOSE_RE, mask);
        const openH  = find(remaining, AHU_OPEN_RE, mask);

        if (openH && (!closeH || openH.index < closeH.index)) {
          this._ahuDepth++;
          this._pos += openH.end;
          continue;
        }

        if (!closeH) break; // waiting for more data

        this._ahuDepth--;
        if (this._ahuDepth <= 0) {
          const bodyText = this._buf.slice(this._ahuStart, this._pos + closeH.index);
          events.push({ kind: "ahu-child", uri: this._uri, slot: this._ahuSlot, bodyText });
          this._inAhu = false;
          this._ahuSlot = "";
          this._pos += closeH.end;
          continue;
        }
        this._pos += closeH.end;
        continue;
      }

      break;
    }

    return events;
  }

  /** Trim fully-consumed prefix of _buf to keep memory bounded. */
  private _gc(): void {
    if (this._state === "idle" && this._pos > 4096) {
      this._buf = this._buf.slice(this._pos);
      this._pos = 0;
    }
  }
}
