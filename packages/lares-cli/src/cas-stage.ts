/**
 * cas-stage — the operator gesture's CAS staging shore.
 *
 * A verb NEVER inlines a body. The disk/fetch-holding gesture stages each carrier body
 * to the corpus CAS (content-addressed, hex sha256) and rides the verb with a skinny
 * `textCid` handle. The daemon worker resolves it back via `resolveByCid` from the SAME
 * corpus CAS dir (process-shared filesystem, no IPC) and re-verifies cid==hash(bytes).
 *
 * This keeps an oversized carrier body (a whole book) out of the @daemon command doc, whose
 * automerge scalar-string value overflows past ~2^24 chars — the wall that fells the seed
 * when a giant body inlines into a summons. Bag-agnostic: any carrier whose body would
 * overflow rides a reference, regardless of which bag holds it.
 *
 * The gesture holds the body, so it also DECIDES skinny-ness (content-resolution.mem
 * Scenario B): an oversized RAW shard (no memetic-wikitext wrapper) rides `skinny: true`, and
 * the daemon writes a handle instead of materializing the body as a CRDT text field. A meme
 * (SOH heading) stays whole — its intra-ahu extraction is a later leg (Scenario A). Small
 * bodies inline unchanged.
 *
 * The body round-trips byte-exact: the carrier `text` string (utf8 for a text filetype,
 * base64 for a binary one) stages as `utf8Bytes(text)`; the worker utf8-decodes the resolved
 * bytes back to the same string. So the CID keys the STRING form, and the decode reproduces
 * it verbatim regardless of the underlying filetype.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/cas-stage
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { sha256HexBytesSync, utf8Bytes, isOversizedBody, casBackstopFires, mediaTypeFromExt } from "@lararium/mesh";
import { larCasDir } from "./env.js";

/** The opt-in-CAD flag. CAS-ing a body goes OPT-IN: the operator marks `_lar_cas = "yes"`
 *  in a `.meta` sidecar (`_lar_cas: yes`, TW5 field form) OR a per-ahu `toml iam`
 *  (`_lar_cas = "yes"`). The flag reads off text the gesture already holds — never a CAS
 *  resolve. Matches either `:` or `=`, with or without quotes. */
const CAS_FLAG_RE = /(?:^|\n)\s*_lar_cas\s*[:=]\s*"?yes"?/i;

/** Does a carrier opt IN to CAS externalization? Reads the `.meta` sidecar and the body iam
 *  (both in hand at scan time — a flag read is never a body resolve). */
export function carrierCasFlagged(text: string, meta?: string): boolean {
  return CAS_FLAG_RE.test(meta ?? "") || CAS_FLAG_RE.test(text);
}

export interface StageCarrierOpts {
  /** The file extension (".png"/".mem"/…) — feeds the backstop's media-type family. */
  readonly ext?:     string;
  /** The operator opted in via `_lar_cas` (a skinny handle, whatever the size). */
  readonly flagged?: boolean;
  /** The body failed the utf8 round-trip (a raw binary shard) — always leaves the CRDT. */
  readonly binary?:  boolean;
}

export interface StagedCarrier {
  /** Content-address (hex sha256) — the CAS key + the verb handle. Valid only when `staged`. */
  readonly cid:    string;
  /** The body's byte length. */
  readonly size:   number;
  /** The daemon writes a skinny HANDLE (opt-in CAD): the flag fired or the backstop caught it. */
  readonly skinny: boolean;
  /** A CAS blob was written — the verb rides `textCid`, not the inline body. `skinny` implies
   *  `staged`; an OVERSIZED un-flagged body also stages (transport stays skinny) but lands
   *  inline-then-faults island-side rather than as a handle. */
  readonly staged: boolean;
}

/**
 * Decide a carrier body's disposition, opt-in-CAD (content-resolution.mem). FLAG-PRIMARY: the
 * operator's `_lar_cas` OR the un-flagged backstop (an inherently-external media family, or
 * oversized-and-not-text) elects a skinny HANDLE; the body then stages to the corpus CAS and the
 * verb rides a `textCid`, never the body. A small un-flagged body stays INLINE — no CAS blob, a
 * meme is an inline-by-nature tiddler bundle. A body past the hard OOM wall stages for transport
 * even un-flagged (never a giant inline arg), but rides `skinny = false` so the island faults it
 * (a verb rides a reference, never a body) rather than materializing it. Idempotent when it
 * stages (content-addressed, immutable → skip an existing blob).
 */
export function stageBodyToCas(text: string, opts: StageCarrierOpts = {}): StagedCarrier {
  const bytes = utf8Bytes(text);
  const size = bytes.length;
  const mediaType = mediaTypeFromExt(opts.ext ?? "", opts.binary ?? false);
  const skinny = (opts.flagged ?? false) || casBackstopFires(size, mediaType);
  // Un-flagged small → inline (no CAS blob). Only a skinny handle or the OOM-wall transport stages.
  if (!skinny && !isOversizedBody(size)) return { cid: "", size, skinny: false, staged: false };
  const cid = sha256HexBytesSync(bytes);
  const dir = larCasDir();
  mkdirSync(dir, { recursive: true });
  const path = join(dir, cid);
  if (!existsSync(path)) writeFileSync(path, bytes);
  return { cid, size, skinny, staged: true };
}
